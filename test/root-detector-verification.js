/**
 * Telemetry contract test — Kasane Shell v3.
 *
 * The CPU/GPU readout is the whole product now, so this suite pins the contract
 * it depends on: both MediaTek GPU generations must be probed rather than
 * assumed, every metric must have a fallback, and the bridge must stay strictly
 * read-only.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🌸 ===================================================================');
console.log('🌸 TELEMETRY CONTRACT SUITE (MEDIATEK CPU / GPU READ-ONLY)');
console.log('🌸 ===================================================================\n');

const ROOT = path.join(__dirname, '..');
const bridge = fs.readFileSync(
  path.join(ROOT, 'app/src/main/java/com/kasane/shell/RootBridge.kt'), 'utf8');
const webApp = fs.readFileSync(path.join(ROOT, 'app/src/main/assets/web/app.js'), 'utf8');

let total = 0;
let passed = 0;

function verify(vector, fn) {
  total++;
  try {
    fn();
    console.log(`  🛡️ [VERIFIED] ${vector}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAILED] ${vector}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------ 1
verify('GPU generation 1 (gpufreq) nodes are probed', () => {
  ['/proc/gpufreq/gpufreq_opp_freq',
    '/proc/gpufreq/gpufreq_fixed_freq_volt',
    '/proc/gpufreq/gpufreq_opp_dump'].forEach(node => {
    assert(bridge.includes(node), `missing legacy node ${node}`);
  });
});

// ------------------------------------------------------------------ 2
verify('GPU generation 2 (gpufreqv2) nodes are probed', () => {
  ['/proc/gpufreqv2/fix_target_opp_index',
    '/proc/gpufreqv2/fix_custom_freq_volt',
    '/proc/gpufreqv2/stack_signed_opp_table'].forEach(node => {
    assert(bridge.includes(node), `missing current node ${node}`);
  });

  assert(bridge.includes('usesV1') && bridge.includes('usesV2'),
    'the report must state which GPU generation answered');
});

// ------------------------------------------------------------------ 3
verify('GPU load and DVFS are probed with several candidates', () => {
  ['/proc/mali/utilization',
    '/sys/module/ged/parameters/gpu_loading',
    '/sys/kernel/ged/hal/gpu_utilization',
    '/sys/kernel/ged/hal/custom_upbound_gpu_freq'].forEach(node => {
    assert(bridge.includes(node), `missing GPU node ${node}`);
  });

  const loadBlock = bridge.slice(bridge.indexOf('GPU_LOAD_NODES'));
  assert(loadBlock.includes('listOf('), 'GPU load candidates must be a probe list');
  assert(loadBlock.includes('indexOfFirst'), 'the first node that answers must win');
});

// ------------------------------------------------------------------ 4
verify('Battery temperature has four candidate nodes and a unit guard', () => {
  const start = bridge.indexOf('BATTERY_TEMP_NODES');
  const block = bridge.slice(start, start + 600);

  assert((block.match(/"\/sys/g) || []).length >= 4,
    'at least four battery temperature nodes must be probed');
  assert(bridge.includes('raw > 200'), 'tenths-of-a-degree values must be rescaled');
  assert(bridge.includes('batteryTempNode'), 'the winning node must be reported, not hidden');
});

// ------------------------------------------------------------------ 5
verify('Every metric degrades to an explicit null plus a reason', () => {
  assert(bridge.includes('JSONObject.NULL'), 'missing metrics must serialise as null, not as a fake zero');
  assert(bridge.includes('"reason"'), 'the GPU must say why it has no data');
  assert(bridge.includes('butuh akses root'), 'the UI needs a human-readable reason');
  assert(webApp.includes('n/a'), 'the interface must render n/a rather than inventing a value');
});

// ------------------------------------------------------------------ 6
verify('probeNodes reports existence and a raw on-device sample', () => {
  assert(bridge.includes('fun probeNodes()'), 'probeNodes must be exposed');
  assert(bridge.includes('"exists"'), 'each probed node must report existence');
  assert(bridge.includes('"sample"'), 'each probed node must report a raw sample');
  assert(bridge.includes('SAMPLE_CHARS'), 'samples must be length-capped');
  assert(bridge.includes('"unprobed"'), 'nodes that could not be tested without root must be listed');
  assert(webApp.includes('formatProbe') || webApp.includes('probeText'),
    'the report must be rendered into the Logs App');
});

// ------------------------------------------------------------------ 7
verify('The bridge is strictly read-only', () => {
  ['chmod', 'destroyForcibly', 'fun runScript', 'fun killProcess',
    'echo 1 >', '> /proc/', '> /sys/'].forEach(banned => {
    assert(!bridge.includes(banned), `write or exec path found: ${banned}`);
  });

  assert(!bridge.includes('chmod +x'), 'no execute permission may be granted');
  assert(bridge.includes('/proc/version'), 'kernel version must be read, never spoofed');
});

console.log('\n🌸 ===================================================================');
console.log(`🌸 TELEMETRY CONTRACT: ${passed} OF ${total} VECTORS VERIFIED`);
console.log('🌸 ===================================================================\n');
