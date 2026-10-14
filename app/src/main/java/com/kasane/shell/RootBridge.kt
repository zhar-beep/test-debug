package com.kasane.shell

import android.app.Activity
import android.os.Build
import android.webkit.JavascriptInterface
import android.webkit.WebView
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

class RootBridge(private val activity: Activity, private val webView: WebView) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var currentProcess: Process? = null

    /**
     * Fast check for superuser privilege
     */
    @JavascriptInterface
    fun checkRoot(): Boolean {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("su", "-c", "id"))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val output = reader.readLine() ?: ""
            process.waitFor() == 0 && output.contains("uid=0")
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Deep Diagnostic for KernelSU-Next, SuSFS, SELinux, and /data/local/tmp
     */
    @JavascriptInterface
    fun runRootDiagnostics(): String {
        val diag = JSONObject()
        try {
            // 1. UID Check
            val idProc = Runtime.getRuntime().exec(arrayOf("su", "-c", "id"))
            val idOut = BufferedReader(InputStreamReader(idProc.inputStream)).readLine() ?: ""
            idProc.waitFor()
            val hasRootUid = idOut.contains("uid=0")
            diag.put("rootUid", hasRootUid)
            diag.put("uidOutput", idOut)

            // 2. KernelSU-Next CLI (ksud)
            var ksuVer = "KernelSU-Next"
            val ksuProc = Runtime.getRuntime().exec(arrayOf("su", "-c", "ksud -V 2>/dev/null || which su"))
            val ksuOut = BufferedReader(InputStreamReader(ksuProc.inputStream)).readLine()?.trim()
            ksuProc.waitFor()
            if (!ksuOut.isNullOrEmpty()) {
                ksuVer = ksuOut
            }
            diag.put("ksuVersion", ksuVer)

            // 3. SuSFS Detection (check susfs binary or procfs)
            var susfsActive = false
            var susfsInfo = "Not Detected"
            try {
                val susfsProc = Runtime.getRuntime().exec(arrayOf("su", "-c", "/data/adb/ksu/bin/susfs show_version 2>/dev/null || [ -f /data/adb/ksu/bin/susfs ] && echo 'v2.3.0 Active'"))
                val susfsOut = BufferedReader(InputStreamReader(susfsProc.inputStream)).readLine()?.trim()
                susfsProc.waitFor()
                if (!susfsOut.isNullOrEmpty() && (susfsOut.contains("v2.") || susfsOut.contains("Active"))) {
                    susfsActive = true
                    susfsInfo = susfsOut
                }
            } catch (e: Exception) {}
            diag.put("susfsActive", susfsActive)
            diag.put("susfsInfo", susfsInfo)

            // 4. SELinux Status
            var selinux = "Enforcing"
            try {
                val seProc = Runtime.getRuntime().exec("getenforce")
                val seOut = BufferedReader(InputStreamReader(seProc.inputStream)).readLine()?.trim()
                seProc.waitFor()
                if (!seOut.isNullOrEmpty()) selinux = seOut
            } catch (e: Exception) {}
            diag.put("selinux", selinux)

            // 5. Test Write /data/local/tmp
            var tmpWritable = false
            try {
                val writeProc = Runtime.getRuntime().exec(arrayOf("su", "-c", "echo 'kasane_ok' > /data/local/tmp/.kasane_test && cat /data/local/tmp/.kasane_test && rm /data/local/tmp/.kasane_test"))
                val writeOut = BufferedReader(InputStreamReader(writeProc.inputStream)).readLine() ?: ""
                writeProc.waitFor()
                tmpWritable = writeOut.trim() == "kasane_ok"
            } catch (e: Exception) {}
            diag.put("tmpWritable", tmpWritable)

            // 6. Active Slot
            var slot = "_b"
            try {
                val p = Runtime.getRuntime().exec("getprop ro.boot.slot_suffix")
                val slotRead = BufferedReader(InputStreamReader(p.inputStream)).readLine()?.trim()
                p.waitFor()
                if (!slotRead.isNullOrEmpty()) slot = slotRead
            } catch (e: Exception) {}
            diag.put("slot", slot)

            // Overall Status
            diag.put("status", if (hasRootUid && tmpWritable) "HEALTHY" else "ATTENTION")

        } catch (e: Exception) {
            diag.put("status", "ERROR")
            diag.put("error", e.message ?: "Unknown root diagnostic error")
        }

        return diag.toString()
    }

    /**
     * Reads real hardware, kernel version, phone model, and OS specifications
     */
    @JavascriptInterface
    fun getDeviceSpecs(): String {
        val specs = JSONObject()
        try {
            val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
            val model = Build.MODEL
            val device = Build.DEVICE
            specs.put("deviceName", "$manufacturer $model ($device)")
            specs.put("model", model)

            val androidVer = Build.VERSION.RELEASE
            val sdkInt = Build.VERSION.SDK_INT
            specs.put("androidVersion", "Android $androidVer (API $sdkInt)")

            var kernelStr = System.getProperty("os.version") ?: "5.10.269"
            try {
                val procFile = File("/proc/version")
                if (procFile.exists()) {
                    kernelStr = procFile.readText().trim()
                }
            } catch (e: Exception) {
                try {
                    val p = Runtime.getRuntime().exec("uname -r")
                    kernelStr = BufferedReader(InputStreamReader(p.inputStream)).readLine() ?: kernelStr
                } catch (ignored: Exception) {}
            }
            specs.put("kernelVersion", kernelStr)

            var slot = "_b"
            try {
                val p = Runtime.getRuntime().exec("getprop ro.boot.slot_suffix")
                val slotRead = BufferedReader(InputStreamReader(p.inputStream)).readLine()?.trim()
                if (!slotRead.isNullOrEmpty()) {
                    slot = slotRead
                }
            } catch (ignored: Exception) {}
            specs.put("activeSlot", slot)

            var ksuVer = "KernelSU-Next Active"
            try {
                val p = Runtime.getRuntime().exec(arrayOf("su", "-c", "ksud -V 2>/dev/null || echo 'KernelSU-Next'"))
                val ksuRead = BufferedReader(InputStreamReader(p.inputStream)).readLine()?.trim()
                if (!ksuRead.isNullOrEmpty()) {
                    ksuVer = ksuRead
                }
            } catch (ignored: Exception) {}
            specs.put("rootEngine", ksuVer)

        } catch (e: Exception) {
            e.printStackTrace()
        }

        return specs.toString()
    }

    /**
     * Lists files and subfolders in target directory using root shell
     */
    @JavascriptInterface
    fun listDirectory(dirPath: String): String {
        val safePath = if (dirPath.isBlank()) "/data/local/tmp" else dirPath
        val itemsArray = JSONArray()

        try {
            val cmd = "ls -la \"$safePath\""
            val process = Runtime.getRuntime().exec(arrayOf("su", "-c", cmd))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            var line: String?

            while (reader.readLine().also { line = it } != null) {
                val raw = line?.trim() ?: continue
                if (raw.startsWith("total") || raw.isEmpty()) continue

                val parts = raw.split("\\s+".toRegex())
                if (parts.size >= 8) {
                    val perms = parts[0]
                    val isDir = perms.startsWith("d")
                    val name = parts.subList(7, parts.size).joinToString(" ")
                    
                    if (name == "." || name == "..") continue

                    val itemObj = JSONObject().apply {
                        put("name", name)
                        put("path", if (safePath.endsWith("/")) "$safePath$name" else "$safePath/$name")
                        put("isDirectory", isDir)
                        put("permissions", perms)
                        put("octal", permissionsToOctal(perms))
                        put("size", parts[4])
                        put("isScript", name.endsWith(".sh"))
                    }
                    itemsArray.put(itemObj)
                }
            }
            process.waitFor()
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return itemsArray.toString()
    }

    /**
     * MT Manager style chmod tool
     */
    @JavascriptInterface
    fun changePermissions(filePath: String, octal: String): Boolean {
        return try {
            val cmd = "chmod $octal \"$filePath\""
            val process = Runtime.getRuntime().exec(arrayOf("su", "-c", cmd))
            process.waitFor() == 0
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun runScript(scriptPath: String) {
        scope.launch {
            try {
                sendLogLine("🌸 [KASANE] Spawning Root Execution Session via KernelSU...", "sys")
                sendLogLine("📜 [SCRIPT] $scriptPath", "sys")

                // Ensure execute permission before running
                Runtime.getRuntime().exec(arrayOf("su", "-c", "chmod +x \"$scriptPath\"")).waitFor()

                val process = ProcessBuilder("su", "-c", "sh \"$scriptPath\"")
                    .redirectErrorStream(false)
                    .start()

                currentProcess = process

                val stdoutJob = launch {
                    val stdoutReader = BufferedReader(InputStreamReader(process.inputStream))
                    var line: String?
                    while (stdoutReader.readLine().also { line = it } != null) {
                        line?.let { sendLogLine(it, categorizeLine(it)) }
                    }
                }

                val stderrJob = launch {
                    val stderrReader = BufferedReader(InputStreamReader(process.errorStream))
                    var errLine: String?
                    while (stderrReader.readLine().also { errLine = it } != null) {
                        errLine?.let { sendLogLine(it, "error") }
                    }
                }

                val exitCode = process.waitFor()
                stdoutJob.join()
                stderrJob.join()

                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("window.onNativeExecutionFinished($exitCode)", null)
                }

            } catch (e: Exception) {
                sendLogLine("❌ [ERROR] " + (e.message ?: "Failed to execute root command"), "error")
                withContext(Dispatchers.Main) {
                    webView.evaluateJavascript("window.onNativeExecutionFinished(1)", null)
                }
            } finally {
                currentProcess = null
            }
        }
    }

    @JavascriptInterface
    fun killProcess() {
        try {
            currentProcess?.destroyForcibly()
            currentProcess = null
            sendLogLine("⚠️ [HENTIKAN] Script dihentikan oleh pengguna.", "warn")
        } catch (e: Exception) {
            sendLogLine("❌ [ERROR] Gagal menghentikan script: ${e.message}", "error")
        }
    }

    private fun permissionsToOctal(perms: String): String {
        if (perms.length < 10) return "755"
        var owner = 0
        var group = 0
        var other = 0

        if (perms[1] == 'r') owner += 4
        if (perms[2] == 'w') owner += 2
        if (perms[3] == 'x') owner += 1

        if (perms[4] == 'r') group += 4
        if (perms[5] == 'w') group += 2
        if (perms[6] == 'x') group += 1

        if (perms[7] == 'r') other += 4
        if (perms[8] == 'w') other += 2
        if (perms[9] == 'x') other += 1

        return "$owner$group$other"
    }

    private fun categorizeLine(line: String): String {
        return when {
            line.contains("[SUCCESS]") -> "success"
            line.contains("[INFO]") -> "info"
            line.contains("[WARN]") -> "warn"
            line.contains("[ERROR]") -> "error"
            else -> "stdout"
        }
    }

    private suspend fun sendLogLine(line: String, type: String) {
        withContext(Dispatchers.Main) {
            val safeLine = line.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", " ")
                .replace("\r", "")
            webView.evaluateJavascript("window.onNativeLogReceived('$safeLine', '$type')", null)
        }
    }
}
