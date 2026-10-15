package com.kasane.shell

import android.app.Activity
import android.os.Build
import android.webkit.JavascriptInterface
import com.scottyab.rootbeer.RootBeer
import com.topjohnwu.superuser.Shell
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.concurrent.ConcurrentHashMap

/**
 * Read-only telemetry bridge for Kasane Shell v3.
 *
 * Design rules:
 *  - CPU frequency, CPU load and battery temperature live in world-readable
 *    sysfs/procfs nodes, so they are read straight from Java with no process
 *    spawn and no root. That keeps a fast poll cheap.
 *  - GPU frequency differs between MediaTek generations: older kernels expose
 *    /proc/gpufreq, newer ones /proc/gpufreqv2. Both are probed, never assumed.
 *    Those nodes need root, and are read through one persistent libsu session —
 *    a single live root shell instead of a new `su` process per tick.
 *  - Nothing here writes to the kernel. Every metric degrades to null and says
 *    why, so the UI can always render and the diagnostics always explain
 *    themselves instead of guessing.
 */
class RootBridge(private val activity: Activity) {

    companion object {
        private const val CPU_BASE = "/sys/devices/system/cpu"
        private const val MAX_CORES = 16
        private const val SAMPLE_CHARS = 180

        /** Battery temperature candidates, most common first. MediaTek reports tenths of °C. */
        private val BATTERY_TEMP_NODES = listOf(
            "/sys/class/power_supply/battery/temp",
            "/sys/class/power_supply/battery/batt_temp",
            "/sys/class/power_supply/battery/temperature",
            "/sys/devices/platform/battery/battery_temp"
        )

        /** GPU interfaces. Probed in order; the first that answers wins. */
        private const val GPU_FREQ_V1 = "/proc/gpufreq/gpufreq_opp_freq"
        private const val GPU_FIXED_V1 = "/proc/gpufreq/gpufreq_fixed_freq_volt"
        private const val GPU_TABLE_V1 = "/proc/gpufreq/gpufreq_opp_dump"
        private const val GPU_INDEX_V2 = "/proc/gpufreqv2/fix_target_opp_index"
        private const val GPU_FIXED_V2 = "/proc/gpufreqv2/fix_custom_freq_volt"
        private const val GPU_TABLE_V2 = "/proc/gpufreqv2/stack_signed_opp_table"

        private val GPU_LOAD_NODES = listOf(
            "/proc/mali/utilization",
            "/sys/module/ged/parameters/gpu_loading",
            "/sys/kernel/ged/hal/gpu_utilization"
        )

        /** Every node the diagnostics page reports on. */
        private val PROBE_TARGETS = listOf(
            "/proc/version",
            "$CPU_BASE/cpu0/cpufreq/scaling_cur_freq",
            "$CPU_BASE/cpu0/cpufreq/cpuinfo_max_freq",
            "$CPU_BASE/cpu0/cpufreq/scaling_governor",
            "/proc/stat",
            GPU_FREQ_V1,
            GPU_FIXED_V1,
            GPU_TABLE_V1,
            GPU_INDEX_V2,
            GPU_FIXED_V2,
            GPU_TABLE_V2,
            "/sys/kernel/ged/hal/custom_upbound_gpu_freq",
            "/proc/mali/dvfs_enable",
            "/proc/ppm/enabled",
            "/proc/ppm/policy_status",
            "/data/adb/ksu",
            "/data/adb/modules"
        ) + BATTERY_TEMP_NODES + GPU_LOAD_NODES
    }

    private val rootBeer = RootBeer(activity)

    /** Previous /proc/stat totals per core, so load is a delta rather than a lifetime average. */
    private val lastTotals = ConcurrentHashMap<Int, Long>()
    private val lastIdles = ConcurrentHashMap<Int, Long>()

    /** Cached once: the GPU OPP table is static, re-reading it every tick buys nothing. */
    @Volatile
    private var gpuTableCache: LongArray? = null

    // ------------------------------------------------------------------
    // Root
    // ------------------------------------------------------------------

    @JavascriptInterface
    fun checkRoot(): Boolean {
        return try {
            if (Shell.isAppGrantedRoot() == true) return true
            val process = ProcessBuilder("su", "-c", "id").redirectErrorStream(true).start()
            val output = process.inputStream.bufferedReader().readText()
            process.waitFor()
            output.contains("uid=0")
        } catch (e: Exception) {
            false
        }
    }

    // ------------------------------------------------------------------
    // Device identity — every value read from the device, none hardcoded
    // ------------------------------------------------------------------

    @JavascriptInterface
    fun getDeviceSpecs(): String {
        val specs = JSONObject()
        try {
            val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
            specs.put("manufacturer", manufacturer)
            specs.put("model", Build.MODEL)
            specs.put("device", Build.DEVICE)
            specs.put("deviceName", "$manufacturer ${Build.MODEL} (${Build.DEVICE})")

            specs.put("androidVersion", Build.VERSION.RELEASE)
            specs.put("apiLevel", Build.VERSION.SDK_INT)
            specs.put("osLabel", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            // Build.DISPLAY is ro.build.display.id — the ROM build string, no shell needed.
            specs.put("rom", Build.DISPLAY ?: "unknown")

            specs.put("kernelVersion", readKernelVersion())
            specs.put("hardware", Build.HARDWARE ?: "unknown")
            specs.put("board", Build.BOARD ?: "unknown")
            specs.put("abi", Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown")

            val metrics = activity.resources.displayMetrics
            val width = minOf(metrics.widthPixels, metrics.heightPixels)
            val height = maxOf(metrics.widthPixels, metrics.heightPixels)
            val refresh = refreshRate()
            specs.put("widthPixels", width)
            specs.put("heightPixels", height)
            specs.put("refreshRate", refresh)
            specs.put("displayLabel", "$width x $height @ ${refresh.toInt()}Hz")
            specs.put("densityDpi", metrics.densityDpi)

            val slot = readProp("ro.boot.slot_suffix").trim().trimStart('_')
            specs.put("slot", if (slot.isEmpty()) "unknown" else slot)

            specs.put("rootGranted", checkRoot())
        } catch (e: Exception) {
            specs.put("error", e.message ?: "unknown error")
        }
        return specs.toString()
    }

    private fun readKernelVersion(): String {
        return try {
            val procFile = File("/proc/version")
            if (procFile.exists()) {
                // The file reads "Linux version <release> (…)". The release is the useful part.
                procFile.readText().trim().split(" ").getOrNull(2) ?: "unknown"
            } else {
                System.getProperty("os.version") ?: "unknown"
            }
        } catch (e: Exception) {
            System.getProperty("os.version") ?: "unknown"
        }
    }

    private fun refreshRate(): Float {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                activity.display?.refreshRate ?: 0f
            } else {
                @Suppress("DEPRECATION")
                activity.windowManager.defaultDisplay.refreshRate
            }
        } catch (e: Exception) {
            0f
        }
    }

    private fun readProp(name: String): String = runCommand("getprop", name)

    // ------------------------------------------------------------------
    // One telemetry tick
    // ------------------------------------------------------------------

    @JavascriptInterface
    fun getTelemetry(): String {
        val out = JSONObject()
        out.put("ts", System.currentTimeMillis())
        out.put("rootGranted", checkRoot())

        val cores = readCpuCores()
        out.put("cores", cores)
        out.put("clusters", groupClusters(cores))

        val loads = coreIndexes().mapNotNull { coreLoad(it) }
        out.put("cpuLoad", if (loads.isEmpty()) JSONObject.NULL else loads.average().toInt())

        val temperature = readBatteryTemperature()
        out.put("batteryTempC", temperature.first)
        out.put("batteryTempNode", temperature.second)

        out.put("gpu", readGpu())
        return out.toString()
    }

    private fun coreIndexes(): List<Int> {
        val found = mutableListOf<Int>()
        for (i in 0 until MAX_CORES) {
            if (File("$CPU_BASE/cpu$i").exists()) found.add(i)
        }
        return found.ifEmpty { listOf(0) }
    }

    private fun readCpuCores(): JSONArray {
        val array = JSONArray()
        for (index in coreIndexes()) {
            val base = "$CPU_BASE/cpu$index/cpufreq"
            val cur = readLong("$base/scaling_cur_freq")
            val load = coreLoad(index)

            val core = JSONObject()
            core.put("index", index)
            core.put("curKhz", cur ?: JSONObject.NULL)
            core.put("maxKhz", readLong("$base/cpuinfo_max_freq") ?: JSONObject.NULL)
            core.put("minKhz", readLong("$base/cpuinfo_min_freq") ?: JSONObject.NULL)
            core.put("governor", readString("$base/scaling_governor") ?: JSONObject.NULL)
            core.put("online", cur != null)
            core.put("load", load ?: JSONObject.NULL)
            array.put(core)
        }
        return array
    }

    /** Cores sharing a maximum frequency belong to the same cluster. */
    private fun groupClusters(cores: JSONArray): JSONArray {
        val buckets = sortedMapOf<Long, MutableList<Int>>()
        for (i in 0 until cores.length()) {
            val core = cores.getJSONObject(i)
            val max = if (core.isNull("maxKhz")) 0L else core.getLong("maxKhz")
            buckets.getOrPut(max) { mutableListOf() }.add(core.getInt("index"))
        }

        val names = when (buckets.size) {
            1 -> listOf("cpu")
            2 -> listOf("little", "big")
            3 -> listOf("little", "mid", "big")
            else -> buckets.keys.mapIndexed { i, _ -> "cluster$i" }
        }

        val result = JSONArray()
        buckets.entries.forEachIndexed { position, entry ->
            val indexes = entry.value
            val loads = indexes.mapNotNull { coreLoad(it) }
            val currents = indexes.mapNotNull { readLong("$CPU_BASE/cpu$it/cpufreq/scaling_cur_freq") }

            val cluster = JSONObject()
            cluster.put("name", names.getOrElse(position) { "cluster$position" })
            cluster.put("cores", JSONArray(indexes))
            cluster.put("coreCount", indexes.size)
            cluster.put("maxKhz", entry.key)
            cluster.put("curKhz", currents.minOrNull() ?: JSONObject.NULL)
            cluster.put("load", if (loads.isEmpty()) JSONObject.NULL else loads.average().toInt())
            result.put(cluster)
        }
        return result
    }

    /** Busy percentage since the previous call, derived from the /proc/stat delta. */
    private fun coreLoad(index: Int): Int? {
        val stat = readStatLine(index) ?: return null
        val total = stat.first
        val idle = stat.second

        val prevTotal = lastTotals.put(index, total)
        val prevIdle = lastIdles.put(index, idle)
        if (prevTotal == null || prevIdle == null) return null

        val deltaTotal = total - prevTotal
        if (deltaTotal <= 0L) return null
        val deltaIdle = idle - prevIdle
        return (100L - (deltaIdle * 100L / deltaTotal)).coerceIn(0L, 100L).toInt()
    }

    private fun readStatLine(index: Int): Pair<Long, Long>? {
        return try {
            var found: Pair<Long, Long>? = null
            File("/proc/stat").forEachLine { line ->
                if (found == null && line.startsWith("cpu$index ")) {
                    val fields = line.trim().split(Regex("\\s+")).drop(1).mapNotNull { it.toLongOrNull() }
                    if (fields.size >= 4) {
                        val idle = fields[3] + (fields.getOrNull(4) ?: 0L)
                        found = fields.sum() to idle
                    }
                }
            }
            found
        } catch (e: Exception) {
            null
        }
    }

    private fun readBatteryTemperature(): Pair<Any, Any> {
        for (node in BATTERY_TEMP_NODES) {
            val raw = readLong(node) ?: continue
            // MediaTek reports tenths of a degree; a value above 200 cannot be °C.
            val celsius = if (raw > 200) raw / 10.0 else raw.toDouble()
            return celsius to node
        }
        return JSONObject.NULL to JSONObject.NULL
    }

    // ------------------------------------------------------------------
    // GPU — probe both generations, never assume
    // ------------------------------------------------------------------

    private fun readGpu(): JSONObject {
        val gpu = JSONObject()
        gpu.put("usesV1", File(GPU_FREQ_V1).exists())
        gpu.put("usesV2", File(GPU_TABLE_V2).exists())

        if (!checkRoot()) {
            gpu.put("supported", false)
            gpu.put("reason", "butuh akses root")
            gpu.put("curKhz", JSONObject.NULL)
            gpu.put("maxKhz", JSONObject.NULL)
            gpu.put("load", JSONObject.NULL)
            gpu.put("node", JSONObject.NULL)
            gpu.put("loadNode", JSONObject.NULL)
            return gpu
        }

        val script = buildString {
            append("cat $GPU_FREQ_V1 2>/dev/null | grep -v disabled; echo '@@';")
            append("cat $GPU_FIXED_V1 2>/dev/null; echo '@@';")
            append("cat $GPU_INDEX_V2 2>/dev/null; echo '@@';")
            append("cat $GPU_FIXED_V2 2>/dev/null; echo '@@';")
            GPU_LOAD_NODES.forEach { append("cat $it 2>/dev/null; echo '@@';") }
        }

        val sections = runRoot(script).split("@@").map { it.trim() }
        val loadSections = sections.drop(4)

        var current: Long? = null
        var node: String? = null

        when {
            sections.getOrNull(0).orEmpty().isNotEmpty() -> {
                current = firstNumber(sections[0])
                node = GPU_FREQ_V1
            }
            sections.getOrNull(1).orEmpty().isNotEmpty() -> {
                current = firstNumber(sections[1])
                node = GPU_FIXED_V1
            }
            sections.getOrNull(3).orEmpty().isNotEmpty() -> {
                current = firstNumber(sections[3])
                node = GPU_FIXED_V2
            }
            sections.getOrNull(2).orEmpty().isNotEmpty() -> {
                val index = firstNumber(sections[2])
                if (index != null) {
                    current = gpuFreqTable()?.getOrNull(index.toInt())
                    node = "$GPU_INDEX_V2 → $GPU_TABLE_V2"
                }
            }
        }

        val loadPosition = loadSections.indexOfFirst { it.isNotEmpty() }
        val loadRaw = if (loadPosition >= 0) loadSections[loadPosition] else ""
        val loadNode = if (loadPosition >= 0) GPU_LOAD_NODES.getOrNull(loadPosition) else null

        gpu.put("supported", current != null)
        gpu.put("curKhz", current ?: JSONObject.NULL)
        gpu.put("maxKhz", gpuFreqTable()?.maxOrNull() ?: JSONObject.NULL)
        gpu.put("load", if (loadRaw.isEmpty()) JSONObject.NULL else firstNumber(loadRaw) ?: JSONObject.NULL)
        gpu.put("node", node ?: JSONObject.NULL)
        gpu.put("loadNode", loadNode ?: JSONObject.NULL)
        if (current == null) gpu.put("reason", "node frekuensi GPU tidak ditemukan")
        return gpu
    }

    /** Reads the OPP table once and caches it. Array index is the OPP slot number. */
    private fun gpuFreqTable(): LongArray? {
        gpuTableCache?.let { return it }

        val raw = runRoot("cat $GPU_TABLE_V2 2>/dev/null")
        val source = if (raw.isNotBlank()) raw else runRoot("cat $GPU_TABLE_V1 2>/dev/null")
        if (source.isBlank()) return null

        // Each OPP row carries a frequency in KHz; anything smaller is an index or a voltage.
        val freqs = source.lines()
            .filter { it.contains("[") }
            .mapNotNull { firstNumber(it) }
            .filter { it in 1_000..5_000_000 }
            .sorted()
            .toLongArray()

        if (freqs.isEmpty()) return null
        gpuTableCache = freqs
        return freqs
    }

    // ------------------------------------------------------------------
    // Diagnostics — reports what actually exists on this device
    // ------------------------------------------------------------------

    @JavascriptInterface
    fun probeNodes(): String {
        val report = JSONObject()
        val nodes = JSONArray()
        val hasRoot = checkRoot()

        report.put("checkedAt", System.currentTimeMillis())
        report.put("rootGranted", hasRoot)

        val rootOnly = mutableListOf<String>()

        for (path in PROBE_TARGETS) {
            val file = File(path)
            if (file.exists()) {
                nodes.put(nodeJson(path, true, sampleOf(file), false))
            } else {
                rootOnly.add(path)
            }
        }

        // Everything else needs root: one batched pass, each node followed by a raw
        // sample so the real on-device format is visible instead of guessed at.
        if (hasRoot && rootOnly.isNotEmpty()) {
            val script = rootOnly.joinToString("\n") { path ->
                "if [ -e '$path' ]; then echo \"OK|$path\"; head -c $SAMPLE_CHARS '$path' 2>/dev/null | tr '\\n' '~'; echo ''; " +
                    "else echo \"NO|$path\"; fi"
            }

            val lines = runRoot(script).lines()
            var index = 0
            while (index < lines.size) {
                val line = lines[index]
                when {
                    line.startsWith("OK|") -> {
                        val path = line.removePrefix("OK|").trim()
                        val sample = lines.getOrNull(index + 1)?.trim().orEmpty()
                        nodes.put(nodeJson(path, true, sample, true))
                        index += 2
                    }
                    line.startsWith("NO|") -> {
                        nodes.put(nodeJson(line.removePrefix("NO|").trim(), false, "", true))
                        index++
                    }
                    else -> index++
                }
            }
        }

        report.put("nodes", nodes)
        report.put("unprobed", JSONArray(if (hasRoot) emptyList<String>() else rootOnly))
        return report.toString()
    }

    private fun nodeJson(path: String, exists: Boolean, sample: String, needsRoot: Boolean): JSONObject {
        return JSONObject().apply {
            put("path", path)
            put("exists", exists)
            put("needsRoot", needsRoot)
            put("sample", if (sample.isEmpty()) JSONObject.NULL else sample.take(SAMPLE_CHARS))
        }
    }

    @JavascriptInterface
    fun runRootDiagnostics(): String {
        val diag = JSONObject()
        try {
            val hasRoot = checkRoot()
            val uidOutput = if (hasRoot) runRoot("id") else ""

            diag.put("rootGranted", hasRoot)
            diag.put("rootUid", uidOutput.contains("uid=0"))
            diag.put("uidOutput", uidOutput.trim().ifEmpty { "n/a" })
            diag.put("libsuGranted", Shell.isAppGrantedRoot() == true)

            // RootBeer answers a different question than checkRoot(): "is this device
            // rooted at all" rather than "did this app receive superuser". Report both.
            var deviceRooted = false
            var deviceRootedBusybox = false
            try {
                deviceRooted = rootBeer.isRooted
                deviceRootedBusybox = rootBeer.isRootedWithBusyBoxCheck
            } catch (e: Exception) {
                // RootBeer can throw on hardened ROMs; the report still stands without it.
            }
            diag.put("deviceRootedHeuristic", deviceRooted)
            diag.put("deviceRootedBusybox", deviceRootedBusybox)

            val ksuVersion = if (hasRoot) runRoot("ksud -V 2>/dev/null").trim() else ""
            diag.put("ksuVersion", ksuVersion.ifEmpty { "tidak terdeteksi" })

            val susfs = if (hasRoot) {
                runRoot("ls /data/adb/ksu 2>/dev/null").lines().firstOrNull { it.contains("susfs", true) } ?: ""
            } else ""
            diag.put("susfs", susfs.ifEmpty { "tidak terdeteksi" })

            diag.put("selinux", runCommand("getenforce").trim().ifEmpty { "unknown" })
            diag.put("slot", readProp("ro.boot.slot_suffix").trim().ifEmpty { "unknown" })
            diag.put("kernelVersion", readKernelVersion())

            val temperature = readBatteryTemperature()
            diag.put("batteryTempC", temperature.first)
            diag.put("batteryTempNode", temperature.second)

            val gpu = readGpu()
            diag.put("gpuSupported", gpu.optBoolean("supported", false))
            diag.put("gpuNode", gpu.opt("node"))
            diag.put(
                "gpuGen",
                when {
                    gpu.optBoolean("usesV2") -> "gpufreqv2"
                    gpu.optBoolean("usesV1") -> "gpufreq"
                    else -> "tidak diketahui"
                }
            )

            diag.put("status", if (hasRoot && temperature.first != JSONObject.NULL) "OK" else "TERBATAS")
        } catch (e: Exception) {
            diag.put("status", "ERROR")
            diag.put("error", e.message ?: "unknown error")
        }
        return diag.toString()
    }

    // ------------------------------------------------------------------
    // Shell plumbing
    // ------------------------------------------------------------------

    /** Runs a command through the shared libsu session, so no `su` process spawns per call. */
    private fun runRoot(command: String): String {
        return try {
            if (Shell.isAppGrantedRoot() != true) return ""
            Shell.cmd(command).exec().out.joinToString("\n")
        } catch (e: Exception) {
            ""
        }
    }

    private fun runCommand(vararg args: String): String {
        return try {
            val process = ProcessBuilder(*args).redirectErrorStream(true).start()
            val output = process.inputStream.bufferedReader().readText()
            process.waitFor()
            output
        } catch (e: Exception) {
            ""
        }
    }

    private fun readString(path: String): String? {
        return try {
            val file = File(path)
            if (!file.exists() || !file.canRead()) null else file.readText().trim()
        } catch (e: Exception) {
            null
        }
    }

    private fun readLong(path: String): Long? = readString(path)?.toLongOrNull()

    private fun sampleOf(file: File): String {
        return try {
            when {
                !file.canRead() -> ""
                file.isDirectory -> file.list()?.take(8)?.joinToString(" ") ?: ""
                else -> file.readText().take(SAMPLE_CHARS).replace("\n", "~")
            }
        } catch (e: Exception) {
            ""
        }
    }

    /** First number in a blob — pulls a frequency out of unstructured procfs output. */
    private fun firstNumber(text: String): Long? {
        return Regex("\\d{3,9}").find(text)?.value?.toLongOrNull()
    }
}
