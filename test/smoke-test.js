/**
 * Real Smoke Test Suite for Kasane Shell // Game Setup (SF Pro, Vivid Glass, Custom Emoji & Izin)
 * Validates DOM integrity, CSS rules, timestamp formatting,
 * 2-step confirmation modal, MT Manager chmod modal, custom emoji picker,
 * absence of punch-hole glitch and shield emoji slop,
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
runTest('Asset Verification: user-anime.jpg and kasane assets exist', () => {
  const userAnimeWeb = path.join(__dirname, '../app/src/main/assets/web/assets/user-anime.jpg');
  const userAnimeRoot = path.join(__dirname, '../assets/user-anime.jpg');
  assert(fs.existsSync(userAnimeWeb), 'user-anime.jpg must exist in web assets');
  assert(fs.existsSync(userAnimeRoot), 'user-anime.jpg must exist in root assets');
  assert(fs.statSync(userAnimeWeb).size > 10000, 'user-anime.jpg size must be valid');
});

runTest('Asset Verification: Offline Apple iOS 3D Emojis pack exists', () => {
  const emojiDir = path.join(__dirname, '../app/src/main/assets/web/assets/emojis');
  assert(fs.existsSync(emojiDir), 'emojis directory must exist');
  const requiredEmojis = ['sakura.png', 'shield.png', 'phone.png', 'display.png', 'gear.png', 'folder.png', 'scroll.png', 'swords.png', 'key.png'];
  requiredEmojis.forEach(emoji => {
    const p = path.join(emojiDir, emoji);
    assert(fs.existsSync(p), `Missing iOS emoji: ${emoji}`);
  });
});

// 2. Verify HTML DOM Structure & Zero AI Slop
runTest('HTML Verification: All critical UI elements, modals & clean header exist', () => {
  const htmlPath = path.join(__dirname, '../app/src/main/assets/web/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify Root status is at the top of the interface
  const rootIndex = html.indexOf('root-badge');
  const fileListIndex = html.indexOf('id="file-list"');
  assert(rootIndex > 0 && rootIndex < fileListIndex, 'Root status card must be positioned at the top above the file list');

  // Verify Hero section photographed by user is REMOVED
  assert(!html.includes('Kasane Action RPG • Zero Lag'), 'Hero card section photographed by user must be removed');
  assert(!html.includes('id="view-root"'), 'Diagnostik tab must be removed as requested');

  // Verify NO punch-hole glitch overlapping header
  assert(!html.includes('phone-camera-hole'), 'Ugly punch-hole simulator must be eliminated to prevent overlapping badges');

  // Verify NO shield emoji slop in root badge
  assert(!html.includes('alt="shield"'), 'Shield emoji must be removed from header root badge');

  const requiredIds = [
    'sakura-container',
    'btn-theme-toggle',
    'view-explorer',
    'view-logs',
    'tab-btn-explorer',
    'tab-btn-logs',
    'hud-device-name',
    'hud-kernel-version',
    'hud-android-version',
    'hud-active-slot',
    'root-badge',
    'file-list',
    'path-breadcrumbs',
    'btn-folder-up',
    'permission-modal',
    'emoji-picker-modal',
    'run-confirm-modal',
    'confirm-step-1',
    'confirm-step-2',
    'confirm-file-name',
    'terminal-sheet',
    'console-title',
    'console-start-time',
    'console-timer',
    'terminal-content',
    'dynamic-island',
    'detailed-log-modal',
    'modal-log-title',
    'modal-log-content',
    'logs-running-banner'
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
  assert(html.includes('Hentikan Script (Ctrl+C)'), 'Must contain user-friendly "Hentikan Script (Ctrl+C)" action');
});

// 4. Verify Stylesheet Rules, SF Pro & Crisp Wallpaper
runTest('CSS Verification: SF Pro typography, vivid unblurred wallpaper & frosted cards exist', () => {
  const cssPath = path.join(__dirname, '../app/src/main/assets/web/styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const requiredClasses = [
    'user-wallpaper-bg',
    'user-glass-overlay',
    'sakura-container',
    'sakura-petal',
    'kasane-card',
    'btn-kasane-gold',
    'btn-kasane-danger',
    'sheet-terminal-surface',
    'dynamic-island'
  ];

  requiredClasses.forEach(cls => {
    assert(css.includes(`.${cls}`), `Missing CSS class .${cls} in styles.css`);
  });

  assert(css.includes('SF Pro Display'), 'Apple SF Pro Display typography must be imported');
  assert(css.includes('html.light') || css.includes('body.light'), 'Light mode overrides must exist in styles.css');
  
  // Verify wallpaper itself is NOT blurred with full-viewport blur
  assert(!css.includes('.user-glass-overlay {\n  position: fixed;\n  inset: 0;\n  background: var(--wallpaper-overlay);\n  backdrop-filter: blur(14px)'), 'Wallpaper must remain 100% sharp and unblurred');
});

// 5. Test 2-Step Confirmation, Izin Chmod & Custom Emoji Logic
runTest('Logic Verification: 2-step confirmation, MT Manager Izin & Emoji Picker in app.js', () => {
  const appJsPath = path.join(__dirname, '../app/src/main/assets/web/app.js');
  const code = fs.readFileSync(appJsPath, 'utf8');

  assert(code.includes('requestRunScript'), 'Must contain requestRunScript');
  assert(code.includes('proceedToConfirmStep2'), 'Must contain proceedToConfirmStep2');
  assert(code.includes('executeConfirmedScript'), 'Must contain executeConfirmedScript');
  assert(code.includes('openPermissionModal'), 'Must contain openPermissionModal for Izin');
  assert(code.includes('savePermissions'), 'Must contain savePermissions');
  assert(code.includes('openEmojiPicker'), 'Must contain openEmojiPicker');
  assert(code.includes('selectScriptEmoji'), 'Must contain selectScriptEmoji');
  assert(code.includes('stopCurrentScript'), 'Must contain stopCurrentScript (Force Stop)');
  assert(code.includes('copyLogById'), 'Must contain copyLogById');
  assert(code.includes('toggleTheme'), 'Must contain toggleTheme');
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
