/**
 * Smoke test — Kasane Shell v3 (read-only device monitor).
 *
 * Verifies the shipped interface: structure, assets, the offline invariant, and
 * that none of the retired executor surface is still hanging around.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🌸 ========================================================');
console.log('🌸 SMOKE TEST: KASANE SHELL v3 (READ-ONLY MONITOR)');
console.log('🌸 ========================================================\n');

const WEB = path.join(__dirname, '../app/src/main/assets/web');
const ROOT = path.join(__dirname, '..');

const webHtml = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const webCss = fs.readFileSync(path.join(WEB, 'styles.css'), 'utf8');
const webJs = fs.readFileSync(path.join(WEB, 'app.js'), 'utf8');

let total = 0;
let passed = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------- 1
runTest('Assets: wallpaper, 21 iOS emojis and 3 self-hosted fonts are present', () => {
  const wallpaper = path.join(WEB, 'assets/user-anime.jpg');
  assert(fs.existsSync(wallpaper), 'user-anime.jpg must exist');
  assert(fs.statSync(wallpaper).size > 10000, 'wallpaper must be a real image');

  const emojis = [
    'broom.png', 'check.png', 'clipboard.png', 'clock.png', 'cross.png',
    'display.png', 'folder.png', 'gear.png', 'key.png', 'label.png',
    'lightning.png', 'phone.png', 'refresh.png', 'sakura.png', 'scroll.png',
    'shield.png', 'slot.png', 'snowflake.png', 'stop.png', 'stopwatch.png', 'swords.png'
  ];
  emojis.forEach(name => {
    assert(fs.existsSync(path.join(WEB, 'assets/emojis', name)), `missing emoji ${name}`);
  });

  ['inter-var-latin.woff2', 'jetbrains-mono-400-latin.woff2', 'jetbrains-mono-600-latin.woff2']
    .forEach(font => {
      const inWeb = path.join(WEB, 'assets/fonts', font);
      const inRoot = path.join(ROOT, 'assets/fonts', font);
      assert(fs.existsSync(inWeb), `${font} must ship inside the APK assets`);
      assert(fs.existsSync(inRoot), `${font} must exist in the root assets mirror`);
      assert(fs.statSync(inWeb).size > 5000, `${font} looks truncated`);
    });
});

// ---------------------------------------------------------------- 2
runTest('Structure: two tabs exist and the retired executor ids are gone', () => {
  ['tab-btn-monitor', 'tab-btn-logs', 'view-monitor', 'view-logs'].forEach(id => {
    assert(webHtml.includes(`id="${id}"`), `missing id="${id}"`);
  });

  const retired = [
    'view-explorer', 'file-list', 'path-breadcrumbs', 'btn-folder-up', 'items-count',
    'permission-modal', 'emoji-picker-modal', 'run-confirm-modal', 'terminal-sheet',
    'dynamic-island', 'detailed-log-modal', 'logs-history-list', 'sheet-backdrop'
  ];
  retired.forEach(id => {
    assert(!webHtml.includes(`id="${id}"`), `retired element id="${id}" is still in the markup`);
  });
});

// ---------------------------------------------------------------- 3
runTest('Spec block: exactly seven full-width rows plus a quiet root readout', () => {
  const rows = (webHtml.match(/class="spec-row"/g) || []).length;
  assert.strictEqual(rows, 7, `expected 7 spec rows, found ${rows}`);

  ['spec-device', 'spec-display', 'spec-kernel', 'spec-os', 'spec-slot', 'spec-cpugpu', 'spec-battery']
    .forEach(id => assert(webHtml.includes(`id="${id}"`), `missing spec row id="${id}"`));

  assert(webHtml.includes('id="spec-root"'), 'root must still be reported, just not as a chip');
  assert(webHtml.includes('class="spec-note"'), 'root readout must use the quiet note style');
});

// ---------------------------------------------------------------- 4
runTest('Root status: no chip, no pulsing dot, no shield — real probe only', () => {
  assert(!webHtml.includes('root-badge'), 'the Root: YES chip must be gone from the header');
  assert(!webHtml.includes('live-dot'), 'the pulsing dot must be gone');
  assert(!webHtml.includes('alt="shield"'), 'shield emoji must not appear');
  assert(!webCss.includes('.live-dot'), 'the pulsing dot style must be gone from the stylesheet');
  assert(!webCss.includes('.chip'), 'the chip component must be gone from the stylesheet');
  assert(webJs.includes('telemetry.rootGranted'), 'root state must come from the live device read');
  assert(webJs.includes('getTelemetry'), 'root state must be part of the telemetry tick, not a stub');
});

// ---------------------------------------------------------------- 5
runTest('Design: leather material, wood titles, gold kept as the single accent', () => {
  ['--leather', '--wood', '--gold', '--hairline', '--ink-strong'].forEach(token => {
    assert(webCss.includes(token), `missing design token ${token}`);
  });

  assert(/blur\((?:4|1[0-9])px\)/.test(webCss), 'glass must be dialled back below 20px of blur');
  assert(!/blur\((?:2[6-9]|3[0-9])px\)/.test(webCss), 'the old 26px+ crystal blur must be gone');

  ['SF Pro Display', 'Inter var', 'JetBrains Mono'].forEach(font => {
    assert(webCss.includes(font), `font stack must still mention ${font}`);
  });

  assert(webCss.includes('html.light') || webCss.includes('body.light'), 'light theme overrides must exist');
});

// ---------------------------------------------------------------- 6
runTest('Components: every view the app renders has a style rule', () => {
  const required = [
    '.user-wallpaper-bg', '.user-glass-overlay', '.sakura-container', '.sakura-petal',
    '.kasane-card', '.kasane-nav', '.segmented', '.btn', '.btn-kasane-gold',
    '.spec-list', '.spec-row', '.spec-note', '.donut', '.donut-arc',
    '.core-bars', '.core-bar-fill', '.cluster-item', '.meta-row',
    '.log-entry', '.log-filter-btn', '.log-pre', '.toast', '.modal'
  ];

  required.forEach(cls => {
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert(new RegExp(`${escaped}(?![\\w-])`).test(webCss), `missing style rule for ${cls}`);
  });
});

// ---------------------------------------------------------------- 7
runTest('Behaviour: no native dialogs, real polling lifecycle, no fake root', () => {
  // Scan code only: the file's own documentation mentions alert()/confirm() by name.
  const code = webJs
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

  assert(!/[^.\w]alert\(/.test(code), 'app.js must not call alert()');
  assert(!/[^.\w]confirm\(/.test(code), 'app.js must not call confirm()');
  assert(webJs.includes('showToast('), 'must provide showToast()');
  assert(webJs.includes('showDialog('), 'must provide showDialog()');

  assert(webJs.includes('document.visibilityState'), 'polling must respect page visibility');
  assert(webJs.includes('window.onNativePause'), 'must handle the native pause hook');
  assert(webJs.includes('window.onNativeResume'), 'must handle the native resume hook');
  assert(webJs.includes('clearInterval'), 'polling must be stoppable');

  assert(!/rootGranted\s*=\s*true/.test(code), 'root state must never be hardcoded');
});

// ---------------------------------------------------------------- 8
runTest('Offline invariant: the shipped web layer references no remote URL', () => {
  ['index.html', 'styles.css', 'app.js'].forEach(file => {
    const source = fs.readFileSync(path.join(WEB, file), 'utf8');
    assert(!/https?:\/\//.test(source), `${file} must not reference a remote URL`);
  });
  assert(!/cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.cdnfonts\.com/.test(webHtml + webCss),
    'the retired CDNs must not come back');
});

// ---------------------------------------------------------------- 9
runTest('Identity: no device is hardcoded anywhere in the interface', () => {
  const forbidden = ['Infinix', 'X6833B', 'SuiKernel', 'AxionOS', 'sdc55', 'MT6789'];
  [['index.html', webHtml], ['styles.css', webCss], ['app.js', webJs]].forEach(([file, source]) => {
    forbidden.forEach(term => {
      assert(!source.includes(term), `${file} still hardcodes "${term}"`);
    });
  });
  assert(webJs.includes('getDeviceSpecs'), 'device identity must be read from the bridge');
});

console.log('\n🌸 ========================================================');
console.log(`🌸 SMOKE TEST: ${passed} OF ${total} TESTS PASSED`);
console.log('🌸 ========================================================\n');
