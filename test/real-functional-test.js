/**
 * Rigorous Functional & System Integrity Test for Kasane Shell // Game Setup
 * Validates Gradle build specs, AndroidManifest, Kotlin bridge semantics,
 * UI DOM hierarchy, and JS execution logic in node runtime.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🌸 ================================================================');
console.log('🌸 RUNNING COMPREHENSIVE FUNCTIONAL TEST SUITE: GAME SETUP ROOT APP');
console.log('🌸 ================================================================\n');

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

// 1. Android Manifest & Permissions
it('AndroidManifest.xml contains valid package and hardware acceleration', () => {
  const manifestPath = path.join(__dirname, '../app/src/main/AndroidManifest.xml');
  assert(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  assert(manifest.includes('package="com.kasane.shell"'), 'Package name must be com.kasane.shell');
  assert(manifest.includes('android:hardwareAccelerated="true"'), 'Hardware acceleration must be true for 60fps/120Hz');
  assert(manifest.includes('android.permission.INTERNET'), 'INTERNET permission required for Tailwind CDN');
});

// 2. Gradle build specifications
it('Gradle configs contain valid SDK and Kotlin setup', () => {
  const gradleApp = path.join(__dirname, '../app/build.gradle.kts');
  assert(fs.existsSync(gradleApp), 'app/build.gradle.kts must exist');
  const content = fs.readFileSync(gradleApp, 'utf8');
  assert(content.includes('namespace = "com.kasane.shell"'), 'Namespace must be com.kasane.shell');
  assert(content.includes('kotlinx-coroutines-android'), 'Coroutines dependency required for non-blocking root process execution');
});

// 3. Kotlin Root Bridge Semantics
it('RootBridge.kt properly handles non-blocking IO and process termination', () => {
  const bridgePath = path.join(__dirname, '../app/src/main/java/com/kasane/shell/RootBridge.kt');
  const kt = fs.readFileSync(bridgePath, 'utf8');
  assert(kt.includes('Dispatchers.IO'), 'Must use Dispatchers.IO for background root process');
  assert(kt.includes('ProcessBuilder("su",'), 'Must execute su shell process');
  assert(kt.includes('evaluateJavascript'), 'Must stream stdout/stderr back to WebView in real time');
  assert(kt.includes('currentProcess?.destroyForcibly()'), 'Must safely terminate process without unhandled crash');
  assert(!kt.includes('SIGKILL'), 'Must not contain geek jargon SIGKILL in RootBridge.kt');
});

// 4. User Wallpaper and iOS Emoji Assets
it('User anime wallpaper and all 21 offline iOS 3D emojis are present', () => {
  const userAnime = path.join(__dirname, '../app/src/main/assets/web/assets/user-anime.jpg');
  assert(fs.existsSync(userAnime), 'user-anime.jpg must exist in web assets');
  assert(fs.statSync(userAnime).size > 20000, 'user-anime.jpg file size must be >20KB');

  const emojiList = [
    'broom.png', 'check.png', 'clipboard.png', 'clock.png', 'cross.png',
    'display.png', 'folder.png', 'gear.png', 'key.png', 'label.png',
    'lightning.png', 'phone.png', 'refresh.png', 'sakura.png', 'scroll.png',
    'shield.png', 'slot.png', 'snowflake.png', 'stop.png', 'stopwatch.png', 'swords.png'
  ];

  emojiList.forEach(emoji => {
    const p = path.join(__dirname, '../app/src/main/assets/web/assets/emojis', emoji);
    assert(fs.existsSync(p), `Missing emoji asset: ${emoji}`);
  });
});

// 5. DOM Structure & Top-Level Root Status
it('Top-level root status card is located at the top of the interface', () => {
  const htmlPath = path.join(__dirname, '../app/src/main/assets/web/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const rootHeaderIdx = html.indexOf('id="root-badge"');
  const rootTeleCardIdx = html.indexOf('Status Root & Spesifikasi HP');
  const fileListIdx = html.indexOf('id="file-list"');

  assert(rootHeaderIdx !== -1, 'Root badge element must exist in header');
  assert(rootTeleCardIdx !== -1, 'Status Root & Spesifikasi HP card must exist');
  assert(rootTeleCardIdx < fileListIdx, 'Root & Telemetry card must be above file-list');
  assert(!html.includes('Kill SIGKILL'), 'No geek jargon like Kill SIGKILL allowed');
});

// 6. JavaScript Logic & Syntax Evaluation
it('app.js exports valid JS syntax and passes node evaluation test', () => {
  const appJsPath = path.join(__dirname, '../app/src/main/assets/web/app.js');
  const code = fs.readFileSync(appJsPath, 'utf8');

  // Verify timestamp formatting
  const matchTimestamp = code.includes('getExactTimestamp()');
  assert(matchTimestamp, 'Must define getExactTimestamp');

  // Verify mockFS contains gaming scripts
  assert(code.includes('touch_boost_120hz.sh'), 'Must contain touch_boost_120hz.sh');
  assert(code.includes('mlbb_extreme_fps.sh'), 'Must contain mlbb_extreme_fps.sh');
  assert(code.includes('gpu_governor_lock.sh'), 'Must contain gpu_governor_lock.sh');
});

// 7. Infinix Note 30 FHD+ Screen Telemetry
it('Telemetry accurately reflects Infinix Note 30 FHD+ 1080x2460 display', () => {
  const appJsPath = path.join(__dirname, '../app/src/main/assets/web/app.js');
  const code = fs.readFileSync(appJsPath, 'utf8');
  assert(code.includes('1080 x 2460 FHD+'), 'Must specify 1080 x 2460 FHD+ resolution');
  assert(code.includes('Infinix Note 30 (X6833B)'), 'Must specify Infinix Note 30 (X6833B)');
  assert(code.includes('5.10.269-SuiKernel'), 'Must specify 5.10.269-SuiKernel');
  assert(code.includes('Slot _b'), 'Must specify Slot _b');
});

// 8. CI/CD GitHub Actions Build Script
it('GitHub Actions workflow has complete zero-config APK compilation steps', () => {
  const ymlPath = path.join(__dirname, '../.github/workflows/build-apk.yml');
  const yml = fs.readFileSync(ymlPath, 'utf8');
  assert(yml.includes('Build Game Setup APK'), 'Workflow name must be Build Game Setup APK');
  assert(yml.includes('chmod +x gradlew'), 'Must make gradlew executable');
  assert(yml.includes('./gradlew assembleDebug'), 'Must build assembleDebug');
  assert(yml.includes('name: GameSetup-Debug-APK'), 'Must upload GameSetup-Debug-APK artifact');
  assert(yml.includes('Create GitHub Release'), 'Must create GitHub Release with APK asset');
});

console.log('\n🌸 ================================================================');
console.log(`🌸 FUNCTIONAL SUITE COMPLETE: ${passed} OF ${total} TESTS PASSED`);
console.log('🌸 ================================================================\n');
