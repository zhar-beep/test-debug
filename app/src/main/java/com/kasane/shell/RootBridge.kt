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
     * Reads real hardware, kernel version, phone model, and OS specifications
     */
    @JavascriptInterface
    fun getDeviceSpecs(): String {
        val specs = JSONObject()
        try {
            // Read phone manufacturer and model
            val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
            val model = Build.MODEL
            val device = Build.DEVICE
            specs.put("deviceName", "$manufacturer $model ($device)")
            specs.put("model", model)

            // Read Android OS Version & SDK
            val androidVer = Build.VERSION.RELEASE
            val sdkInt = Build.VERSION.SDK_INT
            specs.put("androidVersion", "Android $androidVer (API $sdkInt)")

            // Read Kernel Version directly from /proc/version
            var kernelStr = System.getProperty("os.version") ?: "5.10.269"
            try {
                val procFile = File("/proc/version")
                if (procFile.exists()) {
                    kernelStr = procFile.readText().trim()
                }
            } catch (e: Exception) {
                // fallback to uname
                try {
                    val p = Runtime.getRuntime().exec("uname -r")
                    kernelStr = BufferedReader(InputStreamReader(p.inputStream)).readLine() ?: kernelStr
                } catch (ignored: Exception) {}
            }
            specs.put("kernelVersion", kernelStr)

            // Read active slot via getprop ro.boot.slot_suffix
            var slot = "_b"
            try {
                val p = Runtime.getRuntime().exec("getprop ro.boot.slot_suffix")
                val slotRead = BufferedReader(InputStreamReader(p.inputStream)).readLine()?.trim()
                if (!slotRead.isNullOrEmpty()) {
                    slot = slotRead
                }
            } catch (ignored: Exception) {}
            specs.put("activeSlot", slot)

            // Check KernelSU version
            var ksuVer = "KernelSU-Next Active"
            try {
                val p = Runtime.getRuntime().exec(arrayOf("su", "-c", "ksud -V 2>/dev/null || echo 'KernelSU Active'"))
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
                sendLogLine("🌸 [KASANE] Initializing Root Execution Daemon...", "sys")
                sendLogLine("📜 [TARGET] $scriptPath", "sys")

                // Auto grant execute permission before running
                Runtime.getRuntime().exec(arrayOf("su", "-c", "chmod +x \"$scriptPath\"")).waitFor()

                // Spawn root process executing shell script
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
                sendLogLine("[ERROR] " + (e.message ?: "Failed to execute root command"), "error")
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
            sendLogLine("⚠️ [WARN] Process forcibly terminated via SIGKILL.", "warn")
        } catch (e: Exception) {
            sendLogLine("[ERROR] Failed to kill process: ${e.message}", "error")
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
