/**
 * Functional test — Kasane Shell v3.
 *
 * Verifies the build contract and the native bridge: what the app is allowed to
 * do to the device, and what it must no longer be able to do.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🌸 ================================================================');
console.log('🌸 FUNCTIONAL TEST: KASANE SHELL v3 (BUILD + NATIVE CONTRACT)');
console.log('🌸 ================================================================\n');

const ROOT = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const exists = (...parts) => fs.existsSync(path.join(ROOT, ...parts));

let total = 0;
let passed = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------ 1
it('Manifest: offline-only, hardware accelerated, ships its own launcher icon', () => {
  const manifest = read('app/src/main/AndroidManifest.xml');

  assert(manifest.includes('package="com.kasane.shell"'), 'package must be com.kasane.shell');
  assert(manifest.includes('android:hardwareAccelerated="true"'), 'hardware acceleration must stay on');
  assert(!manifest.includes('android.permission.INTERNET'), 'the app is offline: INTERNET must not be declared');
  assert(!manifest.includes('usesCleartextTraffic'), 'cleartext traffic must not be enabled');
  assert(manifest.includes('@mipmap/ic_launcher'), 'must use the app-owned adaptive icon');
  assert(!manifest.includes('sym_def_app_icon'), 'must not fall back to the platform default icon');
  assert(manifest.includes('@style/Theme.KasaneShell'), 'must use the app theme');
});

// ------------------------------------------------------------------ 2
it('Gradle: namespace, coroutines, libsu and rootbeer are all wired', () => {
  const gradle = read('app/build.gradle.kts');

  assert(gradle.includes('namespace = "com.kasane.shell"'), 'namespace must be set');
  assert(gradle.includes('com.github.topjohnwu.libsu:core:5.2.2'), 'libsu must be declared');
  assert(gradle.includes('com.scottyab:rootbeer-lib:0.1.0'), 'rootbeer must be declared');
  assert(gradle.includes('kotlinx-coroutines-android'), 'coroutines must be available');
});

// ------------------------------------------------------------------ 3
it('Resources: adaptive icon, colours and theme are present', () => {
  assert(exists('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'), 'adaptive icon must exist');
  assert(exists('app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml'), 'round icon must exist');
  assert(exists('app/src/main/res/drawable/ic_launcher_foreground.xml'), 'icon foreground must exist');
  assert(exists('app/src/main/res/values/themes.xml'), 'theme must exist');
  assert(exists('app/src/main/res/values/colors.xml'), 'colours must exist');

  const icon = read('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
  assert(icon.includes('@drawable/ic_launcher_foreground'), 'adaptive icon must reference the foreground');
  assert(icon.includes('@color/ic_launcher_background'), 'adaptive icon must reference a background colour');
});

// ------------------------------------------------------------------ 4
it('RootBridge: exposes the read-only telemetry API', () => {
  const kt = read('app/src/main/java/com/kasane/shell/RootBridge.kt');

  ['fun checkRoot(): Boolean',
    'fun getDeviceSpecs(): String',
    'fun getTelemetry(): String',
    'fun probeNodes(): String',
    'fun runRootDiagnostics(): String'].forEach(signature => {
    assert(kt.includes(signature), `missing ${signature}`);
  });

  assert((kt.match(/@JavascriptInterface/g) || []).length >= 5,
    'every exposed method needs @JavascriptInterface');
});

// ------------------------------------------------------------------ 5
it('RootBridge: the executor and file-manager API is gone', () => {
  const kt = read('app/src/main/java/com/kasane/shell/RootBridge.kt');

  ['fun runScript', 'fun listDirectory', 'fun changePermissions', 'fun killProcess',
    'destroyForcibly', 'ProcessBuilder("su", "-c", "sh', 'sendLogLine'].forEach(gone => {
    assert(!kt.includes(gone), `retired capability still present: ${gone}`);
  });
});

// ------------------------------------------------------------------ 6
it('RootBridge: CPU read without root, GPU through one shared libsu session', () => {
  const kt = read('app/src/main/java/com/kasane/shell/RootBridge.kt');

  assert(kt.includes('/sys/devices/system/cpu'), 'CPU must be read from cpufreq sysfs');
  assert(kt.includes('/proc/stat'), 'CPU load must come from /proc/stat');
  assert(kt.includes('Shell.cmd('), 'privileged reads must go through the shared libsu session');
  assert(kt.includes('Shell.isAppGrantedRoot()'), 'must gate privileged reads on a real grant');
  assert(kt.includes('ConcurrentHashMap'), 'load must be a per-core delta, not a lifetime average');
});

// ------------------------------------------------------------------ 7
it('MainActivity: wires the new bridge and stops polling in the background', () => {
  const kt = read('app/src/main/java/com/kasane/shell/MainActivity.kt');

  assert(kt.includes('RootBridge(this)'), 'bridge must be constructed without a WebView reference');
  assert(!kt.includes('terminal-sheet'), 'the terminal sheet reference must be gone');
  assert(kt.includes('onNativePause'), 'the page must be told when the app pauses');
  assert(kt.includes('onNativeResume'), 'the page must be told when the app resumes');
  assert(kt.includes('blockNetworkLoads = true'), 'network loads must be blocked outright');
  assert(kt.includes('onNativeBackPressed'), 'back handling must be delegated to the page');
});

// ------------------------------------------------------------------ 8
it('Archive: the retired v2 code is preserved and stays out of the APK', () => {
  assert(exists('backup/README.md'), 'backup/README.md must explain the archive');

  const snapshot = 'backup/kasane-v2-executor';
  assert(exists(snapshot, 'web/app.js'), 'the v2 front-end must be archived');
  assert(exists(snapshot, 'web/styles.css'), 'the v2 stylesheet must be archived');
  assert(exists(snapshot, 'android/RootBridge.kt'), 'the v2 bridge must be archived');
  assert(exists(snapshot, 'tests/smoke-test.js'), 'the v2 test suite must be archived');

  const archivedApp = read(snapshot, 'web/app.js');
  assert(archivedApp.includes('runScriptFile'), 'the archive must still contain the executor logic');
  assert(archivedApp.includes('openPermissionModal'), 'the archive must still contain the chmod logic');

  const liveApp = read('app/src/main/assets/web/app.js');
  assert(!liveApp.includes('runScriptFile'), 'the shipped app must not contain the executor logic');

  assert(!exists('app/src/main/assets/web/backup'), 'the archive must never be packaged into the APK');
});

console.log('\n🌸 ================================================================');
console.log(`🌸 FUNCTIONAL TEST: ${passed} OF ${total} TESTS PASSED`);
console.log('🌸 ================================================================\n');
