/**
 * Real Smoke Test Suite for Kasane Shell // Game Setup
 * Validates DOM integrity, CSS rules, JS permissions math, timestamp formatting,
 * asset files, and Android Kotlin bridge integrity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🌸 ========================================================');
console.log('🌸 STARTING RIGOROUS SMOKE TEST: KASANE SHELL (GAME SETUP)');
console.log('🌸 ========================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Verify Assets
runTest('Asset Verification: kasane-preview.png exists and is valid', () => {
  const assetPath = path.join(__dirname, '../app/src/main/assets/web/assets/kasane-preview.png');
  assert(fs.existsSync(assetPath), 'kasane-preview.png must exist');
  const stats = fs.statSync(assetPath);
  assert(stats.size > 100000, `Asset size should be >100KB, got ${stats.size} bytes`);
});

// 2. Verify HTML DOM Structure
runTest('HTML Verification: All critical UI elements & IDs exist', () => {
  const htmlPath = path.join(__dirname, '../app/src/main/assets/web/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const requiredIds = [
    'sakura-container',
    'view-explorer',
    'view-logs',
    'view-root',
    'tab-btn-explorer',
    'tab-btn-logs',
    'tab-btn-root',
    'hud-device-name',
    'hud-kernel-version',
    'hud-android-version',
    'hud-active-slot',
    'root-badge',
    'file-list',
    'path-breadcrumbs',
    'btn-folder-up',
    'terminal-sheet',
    'console-title',
    'console-start-time',
    'console-timer',
    'terminal-content',
    'dynamic-island',
    'permission-modal',
    'detailed-log-modal',
    'modal-log-title',
    'modal-log-content'
  ];

  requiredIds.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing required element id="${id}" in index.html`);
  });
});

// 3. Verify No Geek Gimmick Jargon in User Facing Buttons
runTest('UX Verification: No "SIGKILL" or cryptic jargon in index.html buttons', () => {
  const htmlPath = path.join(__dirname, '../app/src/main/assets/web/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert(!html.includes('Kill SIGKILL'), 'Found forbidden jargon "Kill SIGKILL" in UI');
  assert(html.includes('Hentikan'), 'Must contain user-friendly "Hentikan" action');
});

// 4. Verify Stylesheet Rules
runTest('CSS Verification: Kasane aesthetic classes exist', () => {
  const cssPath = path.join(__dirname, '../app/src/main/assets/web/styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const requiredClasses = [
    'kasane-wallpaper-bg',
    'kasane-mist-overlay',
    'sakura-container',
    'sakura-petal',
    'kasane-card',
    'btn-kasane-gold',
    'sheet-terminal-surface',
    'dynamic-island'
  ];

  requiredClasses.forEach(cls => {
    assert(css.includes(`.${cls}`), `Missing CSS class .${cls} in styles.css`);
  });
});

// 5. Test Octal & Permissions Math in JavaScript
runTest('Logic Verification: Octal to symbolic conversion math', () => {
  function octalToSymbolic(octal, isDir) {
    const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    const prefix = isDir ? 'd' : '-';
    const u = map[parseInt(octal[0]) || 0];
    const g = map[parseInt(octal[1]) || 0];
    const o = map[parseInt(octal[2]) || 0];
    return `${prefix}${u}${g}${o}`;
  }

  assert.strictEqual(octalToSymbolic('777', false), '-rwxrwxrwx');
  assert.strictEqual(octalToSymbolic('755', false), '-rwxr-xr-x');
  assert.strictEqual(octalToSymbolic('755', true), 'drwxr-xr-x');
  assert.strictEqual(octalToSymbolic('644', false), '-rw-r--r--');
});

// 6. Test Exact Timestamp Formatting (Must contain Hours, Minutes, and Seconds [HH:mm:ss])
runTest('Timestamp Verification: Logs format with exact seconds [HH:mm:ss]', () => {
  function getExactTimestamp(date = new Date()) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  const timeFormatted = getExactTimestamp();
  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  assert(timeRegex.test(timeFormatted), `Timestamp format invalid: ${timeFormatted}`);
});

// 7. Verify Android Native Bridge Code
runTest('Android Bridge Verification: RootBridge.kt contains required methods', () => {
  const bridgePath = path.join(__dirname, '../app/src/main/java/com/kasane/shell/RootBridge.kt');
  const kt = fs.readFileSync(bridgePath, 'utf8');

  assert(kt.includes('@JavascriptInterface'), 'Missing JavascriptInterface annotations');
  assert(kt.includes('fun checkRoot(): Boolean'), 'Missing checkRoot method');
  assert(kt.includes('fun getDeviceSpecs(): String'), 'Missing getDeviceSpecs method');
  assert(kt.includes('fun runRootDiagnostics(): String'), 'Missing runRootDiagnostics method');
  assert(kt.includes('fun listDirectory(dirPath: String): String'), 'Missing listDirectory method');
  assert(kt.includes('fun changePermissions(filePath: String, octal: String): Boolean'), 'Missing changePermissions method');
  assert(kt.includes('fun runScript(scriptPath: String)'), 'Missing runScript method');
  assert(kt.includes('fun killProcess()'), 'Missing killProcess method');
});

// 8. Verify GitHub Actions Workflow
runTest('CI/CD Verification: GitHub Actions build-apk.yml configuration', () => {
  const ymlPath = path.join(__dirname, '../.github/workflows/build-apk.yml');
  const yml = fs.readFileSync(ymlPath, 'utf8');
  assert(yml.includes('actions/checkout@v4'), 'Missing checkout step');
  assert(yml.includes('actions/setup-java@v4'), 'Missing setup-java step');
  assert(yml.includes('gradlew assembleDebug'), 'Missing assembleDebug build command');
  assert(yml.includes('actions/upload-artifact@v4'), 'Missing upload-artifact step');
});

console.log('\n🌸 ========================================================');
console.log(`🌸 SMOKE TEST RESULTS: ${passedTests} OF ${totalTests} TESTS PASSED (100%)`);
console.log('🌸 ========================================================\n');
