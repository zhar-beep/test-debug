package com.kasane.shell

import android.app.Activity
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
     * Lists files and subfolders in target directory using root shell (handles /data/local/tmp permissions)
     * Returns JSON array string
     */
    @JavascriptInterface
    fun listDirectory(dirPath: String): String {
        val safePath = if (dirPath.isBlank()) "/data/local/tmp" else dirPath
        val itemsArray = JSONArray()

        try {
            // Use root shell to execute ls -la with full stats
            val cmd = "ls -la \"$safePath\""
            val process = Runtime.getRuntime().exec(arrayOf("su", "-c", cmd))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            var line: String?

            while (reader.readLine().also { line = it } != null) {
                val raw = line?.trim() ?: continue
                if (raw.startsWith("total") || raw.isEmpty()) continue

                // Format: -rwxr-xr-x 1 root root 1024 Oct 14 15:30 script.sh
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
     * MT Manager style chmod tool (e.g. chmod 777 /data/local/tmp/script.sh)
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
                sendLogLine("[SYS] Initializing Game Setup root execution daemon...", "sys")
                sendLogLine("[SYS] Target: $scriptPath", "sys")

                // Auto grant execute permission before running
                Runtime.getRuntime().exec(arrayOf("su", "-c", "chmod +x \"$scriptPath\"")).waitFor()

                // Spawn root process executing shell script
                val process = ProcessBuilder("su", "-c", "sh \"$scriptPath\"")
                    .redirectErrorStream(false)
                    .start()

                currentProcess = process

                // Stream stdout
                val stdoutJob = launch {
                    val stdoutReader = BufferedReader(InputStreamReader(process.inputStream))
                    var line: String?
                    while (stdoutReader.readLine().also { line = it } != null) {
                        line?.let { sendLogLine(it, categorizeLine(it)) }
                    }
                }

                // Stream stderr
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
            sendLogLine("[WARN] Root process killed forcibly via SIGKILL.", "warn")
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
