/**
 * Kasane Shell // Game Setup
 * Root script orchestrator for Infinix Note 30 (KernelSU-Next + SuSFS).
 *
 * Front-end contract
 * ------------------
 * - Talks to the native bridge (window.AndroidRoot) when running inside the
 *   Android WebView, and falls back to an in-memory mock filesystem otherwise
 *   so the interface can be developed and previewed in a plain browser.
 * - Every user-visible string is Indonesian, matching the rest of the product.
 * - No native browser dialogs: feedback goes through showToast() and
 *   showDialog(), which are styled, focus-managed, and dismissible with Escape.
 */

/* ==========================================================================
   ICON HELPERS
   ========================================================================== */

function iosEmoji(name, extraClass = '') {
  return `<img src="assets/emojis/${name}.png" class="ios-emoji ${extraClass}" alt="" aria-hidden="true">`;
}

function iosEmojiLg(name) {
  return `<img src="assets/emojis/${name}.png" class="ios-emoji-lg" alt="" aria-hidden="true">`;
}

const ICONS = {
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  chevronUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  refresh: '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>',
  lightning: '<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  cross: '<path d="M18 6 6 18M6 6l12 12"/>',
  scroll: '<path d="M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h6"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
};

function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ==========================================================================
   STATE
   ========================================================================== */

const state = {
  theme: 'dark',
  currentTab: 'explorer',
  currentPath: '/data/local/tmp',
  items: [],
  pendingRun: null,
  selectedItemForPerms: null,
  selectedScriptForEmoji: null,
  selectedModalLog: null,
  deviceSpecs: {
    deviceName: 'Infinix Note 30 (X6833B)',
    model: 'X6833B',
    displayResolution: '1080 x 2460 FHD+ (20.5:9, 120Hz)',
    kernelVersion: '5.10.269-SuiKernel-Stable-KernelSU-Next',
    androidVersion: 'AxionOS 2.7 • Android 16 (API 36)',
    activeSlot: 'Slot _b (/dev/block/sdc55)',
    rootEngine: 'KernelSU-Next v3.4.0 (Hybrid + SuSFS)',
    susfsVersion: 'SuSFS v2.3.0 (GKI Full Feature Stealth)'
  },
  currentExecution: {
    scriptPath: null,
    scriptName: null,
    status: 'idle',
    startTime: 0,
    startTimeFormatted: '',
    timerInterval: null,
    logs: [],
    autoScroll: true
  },
  logHistory: [
    {
      id: 'log_init_1',
      scriptName: 'touch_boost_120hz.sh',
      path: '/data/local/tmp/touch_boost_120hz.sh',
      timestamp: '14/10/2026, 16:30:15',
      duration: '2.14s',
      status: 'success',
      exitCode: 0,
      lines: [
        { time: '16:30:15', text: '🌸 [KASANE] Memulai Sesi Eksekusi Root via KernelSU...', type: 'sys' },
        { time: '16:30:15', text: '📜 [SCRIPT] /data/local/tmp/touch_boost_120hz.sh', type: 'sys' },
        { time: '16:30:16', text: 'Touch sampling rate di-lock ke 240Hz (overclock respons layar).', type: 'info' },
        { time: '16:30:16', text: 'Filter sentuhan dinonaktifkan untuk memangkas delay touch input.', type: 'info' },
        { time: '16:30:17', text: 'Input dispatch latency berkurang sebesar 14ms.', type: 'success' },
        { time: '16:30:17', text: '🌸 [KASANE] Eksekusi selesai dengan status: BERHASIL (Kode 0)', type: 'sys' }
      ]
    }
  ],
  /* Mock filesystem so the explorer is fully exercisable in a browser. */
  mockFS: {
    '/data/local/tmp': [
      { name: 'game_boosters', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_tuning', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_boost_120hz.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.4K', isScript: true },
      { name: 'mlbb_extreme_fps.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '2.1K', isScript: true },
      { name: 'thermal_bypass_drop.sh', isDirectory: false, permissions: '-rw-r--r--', octal: '644', size: '940B', isScript: true },
      { name: 'gpu_governor_lock.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.8K', isScript: true }
    ],
    '/data/local/tmp/game_boosters': [
      { name: 'genshin_60fps_stable.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '1.6K', isScript: true },
      { name: 'pubg_smooth_90fps.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '3.2K', isScript: true }
    ],
    '/data/local/tmp/touch_tuning': [
      { name: 'poll_rate_240hz.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '890B', isScript: true }
    ]
  }
};

const isAndroidNative = typeof window.AndroidRoot !== 'undefined';

/* ==========================================================================
   BOOT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSakuraPetals();
  loadDeviceTelemetry();
  loadDirectory(state.currentPath);
  renderLogHistory();
  setupEventListeners();
});

/* ==========================================================================
   FEEDBACK — toasts and dialogs replace alert() / confirm()
   ========================================================================== */

function showToast(message, tone = 'info', duration = 3200) {
  const host = document.getElementById('toast-wrap');
  if (!host) return;

  const el = document.createElement('div');
  el.className = `toast is-${tone}`;
  el.innerHTML = `<span class="toast-dot" aria-hidden="true"></span><span class="toast-msg"></span>`;
  el.querySelector('.toast-msg').textContent = message;
  host.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

/**
 * Modal confirmation with focus management. Resolves true when confirmed,
 * false when dismissed (Escape, backdrop, Cancel).
 */
function showDialog({ title, message, confirmLabel = 'Lanjutkan', cancelLabel = 'Batal', danger = false }) {
  return new Promise(resolve => {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.dataset.dynamic = 'true';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-card is-narrow">
        <div class="modal-head">
          <h3 class="modal-title ${danger ? 'is-danger' : ''}">
            ${danger ? icon('alert') : ''}
            <span></span>
          </h3>
        </div>
        <p class="modal-body-text"></p>
        <div class="modal-foot">
          <button type="button" class="btn btn-lg btn-plain" data-role="cancel"></button>
          <button type="button" class="btn btn-lg ${danger ? 'btn-kasane-danger' : 'btn-kasane-gold'}" data-role="confirm"></button>
        </div>
      </div>`;

    overlay.querySelector('.modal-title span').textContent = title;
    overlay.querySelector('.modal-body-text').textContent = message;
    overlay.querySelector('[data-role="cancel"]').textContent = cancelLabel;
    overlay.querySelector('[data-role="confirm"]').textContent = confirmLabel;

    const finish = value => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(value);
    };

    const onKey = event => {
      if (event.key === 'Escape') finish(false);
    };

    overlay.querySelector('[data-role="cancel"]').addEventListener('click', () => finish(false));
    overlay.querySelector('[data-role="confirm"]').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    overlay.querySelector('[data-role="confirm"]').focus();
  });
}

/* ==========================================================================
   THEME
   ========================================================================== */

function readStorage(key, fallback = null) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    /* Storage unavailable (private mode / restricted WebView): theme simply
       does not persist, the session still works. */
  }
}

function initTheme() {
  setTheme(readStorage('kasane-theme', 'dark'));
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function setTheme(theme) {
  state.theme = theme;
  writeStorage('kasane-theme', theme);

  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.body.classList.toggle('dark', isDark);
  document.body.classList.toggle('light', !isDark);

  const toggle = document.getElementById('btn-theme-toggle');
  if (toggle) {
    toggle.setAttribute('aria-label', isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
  }
}

/* Gentle 60fps sakura drift. Transform + opacity only — never layout. */
function initSakuraPetals() {
  const container = document.getElementById('sakura-container');
  if (!container) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  for (let i = 0; i < 10; i++) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal';
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.width = `${10 + Math.random() * 10}px`;
    petal.style.height = `${12 + Math.random() * 12}px`;
    petal.style.animationDuration = `${8 + Math.random() * 7}s, ${3.5 + Math.random() * 2.5}s`;
    petal.style.animationDelay = `${Math.random() * 4}s, ${Math.random() * 2}s`;
    container.appendChild(petal);
  }
}

/* ==========================================================================
   TABS
   ========================================================================== */

function switchTab(tabId) {
  state.currentTab = tabId;

  document.getElementById('view-explorer').classList.toggle('hidden', tabId !== 'explorer');
  document.getElementById('view-logs').classList.toggle('hidden', tabId !== 'logs');

  ['explorer', 'logs'].forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (!btn) return;
    const active = id === tabId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  const segmented = document.querySelector('.segmented');
  if (segmented) segmented.style.setProperty('--seg', tabId === 'logs' ? '100%' : '0%');

  if (tabId === 'logs') {
    renderLogHistory();
    updateLogsRunningBanner();
  }
}

/* ==========================================================================
   TELEMETRY
   ========================================================================== */

function loadDeviceTelemetry() {
  if (isAndroidNative) {
    try {
      const rawSpecs = window.AndroidRoot.getDeviceSpecs();
      if (rawSpecs) state.deviceSpecs = Object.assign({}, state.deviceSpecs, JSON.parse(rawSpecs));
    } catch (e) {
      showToast('Telemetri perangkat tidak terbaca, memakai nilai bawaan.', 'warn');
    }
  }

  const pxW = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const pxH = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  if (isAndroidNative && pxW > 0 && pxH > 0) {
    state.deviceSpecs.displayResolution = `${Math.min(pxW, pxH)} x ${Math.max(pxW, pxH)} FHD+ (20.5:9, 120Hz)`;
  }

  setText('hud-device-name', state.deviceSpecs.deviceName || 'Infinix Note 30');
  setText('hud-kernel-version', state.deviceSpecs.kernelVersion || '5.10.269-SuiKernel');
  setText('hud-android-version', state.deviceSpecs.androidVersion || 'Android 16');
  setText('hud-active-slot', state.deviceSpecs.activeSlot || 'Slot _b');
  setText('hud-display-resolution', state.deviceSpecs.displayResolution || '1080 x 2460 FHD+ (120Hz)');

  updateRootBadge();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateRootBadge() {
  const badge = document.getElementById('root-badge');
  if (!badge) return;

  let granted = true;
  if (isAndroidNative) {
    try {
      granted = window.AndroidRoot.checkRoot() === true;
    } catch (e) {
      granted = false;
    }
  }

  badge.className = `chip chip-mono ${granted ? 'chip-jade' : 'chip-rose'}`;
  badge.textContent = granted ? 'Root: YES' : 'Root: NO';
  badge.setAttribute('role', 'status');
}

function toggleDesktopView() {
  const isMockup = document.body.classList.contains('mode-phone-mockup');
  const btn = document.getElementById('btn-desktop-toggle');

  if (isMockup) {
    document.body.classList.remove('mode-phone-mockup');
    document.body.classList.add('mode-fullscreen-desktop');
    if (btn) btn.innerHTML = `${iosEmoji('phone')}<span>Mode HP</span>`;
  } else {
    document.body.classList.remove('mode-fullscreen-desktop');
    document.body.classList.add('mode-phone-mockup');
    if (btn) btn.innerHTML = `${iosEmoji('display')}<span>Mode Layar Lebar</span>`;
  }
}

async function runDeepDiagnostics() {
  const btn = document.getElementById('btn-recheck-root');
  const original = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh')}<span>Memeriksa...</span>`;
  }

  await new Promise(r => window.setTimeout(r, 320));

  loadDeviceTelemetry();

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = original || `${icon('refresh')}<span>Periksa Ulang</span>`;
  }

  if (!isAndroidNative) {
    showToast('Pratinjau browser: diagnostik native tidak tersedia.', 'info');
    return;
  }

  try {
    const report = JSON.parse(window.AndroidRoot.runRootDiagnostics() || '{}');
    const lines = [
      `Status: ${report.status || 'UNKNOWN'}`,
      `UID 0: ${report.rootUid ? 'terverifikasi' : 'tidak terverifikasi'}`,
      `libsu: ${report.libsuGranted ? 'granted' : 'denied'}`,
      `RootBeer: ${report.rootBeerDetected ? 'mendeteksi root' : 'bersih'}`,
      `SuSFS: ${report.susfsActive ? 'aktif' : 'tidak aktif'}`,
      `SELinux: ${report.selinux || 'tidak diketahui'}`,
      `Workspace: ${report.tmpWritable ? 'dapat ditulis' : 'tidak dapat ditulis'}`
    ];

    await showDialog({
      title: 'Hasil Diagnostik Root',
      message: lines.join('\n'),
      confirmLabel: 'Salin Laporan',
      cancelLabel: 'Tutup'
    }).then(confirmed => {
      if (confirmed) copyText(lines.join('\n'), 'Laporan diagnostik disalin.');
    });
  } catch (e) {
    showToast('Diagnostik gagal dijalankan.', 'error');
  }
}

/* ==========================================================================
   SCRIPT ICONS
   ========================================================================== */

function getScriptEmoji(scriptName) {
  const custom = readStorage('script_emoji_' + scriptName);
  if (custom) return custom;

  if (scriptName.includes('touch')) return 'phone';
  if (scriptName.includes('game') || scriptName.includes('fps')) return 'swords';
  if (scriptName.includes('thermal') || scriptName.includes('bypass')) return 'snowflake';
  if (scriptName.includes('gpu') || scriptName.includes('cpu') || scriptName.includes('boost')) return 'lightning';

  return 'lightning';
}

function openEmojiPicker(scriptName) {
  state.selectedScriptForEmoji = scriptName;
  setText('picker-script-name', scriptName);
  showModal('emoji-picker-modal');
}

function closeEmojiPickerModal() {
  hideModal('emoji-picker-modal');
  state.selectedScriptForEmoji = null;
}

function selectScriptEmoji(emojiName) {
  if (!state.selectedScriptForEmoji) return;
  writeStorage('script_emoji_' + state.selectedScriptForEmoji, emojiName);
  closeEmojiPickerModal();
  renderExplorer();
}

/* ==========================================================================
   MODAL PLUMBING
   ========================================================================== */

let lastFocusedElement = null;

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;

  lastFocusedElement = document.activeElement;
  el.classList.remove('hidden');

  const focusTarget = el.querySelector('input:not([readonly]), button');
  if (focusTarget) focusTarget.focus();
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');

  if (lastFocusedElement && lastFocusedElement.focus) lastFocusedElement.focus();
  lastFocusedElement = null;
}

/* ==========================================================================
   EXPLORER
   ========================================================================== */

function loadDirectory(path) {
  state.currentPath = path;
  renderBreadcrumbs();

  if (isAndroidNative) {
    try {
      state.items = JSON.parse(window.AndroidRoot.listDirectory(path) || '[]');
    } catch (e) {
      state.items = [];
      showToast('Gagal membaca isi folder.', 'error');
    }
  } else {
    state.items = state.mockFS[path] || [];
  }

  renderExplorer();
}

function renderBreadcrumbs() {
  const container = document.getElementById('path-breadcrumbs');
  if (!container) return;

  let html = `<button type="button" class="crumb is-root" onclick="loadDirectory('/data/local/tmp')">
      ${iosEmoji('folder')}<span>/data/local/tmp</span>
    </button>`;

  if (state.currentPath !== '/data/local/tmp') {
    const subParts = state.currentPath.replace('/data/local/tmp', '').split('/').filter(Boolean);
    let accumulated = '/data/local/tmp';
    subParts.forEach(part => {
      accumulated += '/' + part;
      html += `<span class="crumb-sep" aria-hidden="true">/</span>
        <button type="button" class="crumb" onclick="loadDirectory('${escapeJs(accumulated)}')">${escapeHtml(part)}</button>`;
    });
  }

  container.innerHTML = html;

  const btnUp = document.getElementById('btn-folder-up');
  if (btnUp) {
    const atRoot = state.currentPath === '/data/local/tmp';
    btnUp.disabled = atRoot;
    btnUp.style.opacity = atRoot ? '0.35' : '1';
    btnUp.style.pointerEvents = atRoot ? 'none' : 'auto';
  }
}

function navigateUp() {
  if (state.currentPath === '/data/local/tmp') return;
  const parts = state.currentPath.split('/').filter(Boolean);
  parts.pop();
  loadDirectory('/' + parts.join('/'));
}

function renderExplorer() {
  const container = document.getElementById('file-list');
  const countBadge = document.getElementById('items-count');
  if (countBadge) countBadge.textContent = `${state.items.length} item`;
  if (!container) return;

  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${iosEmojiLg('snowflake')}
        <p class="empty-title">Folder ini masih kosong</p>
        <p class="empty-hint">
          Salin script game kamu ke <code class="inline-code">/data/local/tmp</code> lalu muat ulang daftar.
        </p>
      </div>`;
    return;
  }

  const sorted = [...state.items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  container.innerHTML = sorted.map(item => item.isDirectory ? renderFolderRow(item) : renderScriptRow(item)).join('');
}

function renderFolderRow(item) {
  const targetPath = joinPath(state.currentPath, item.name);
  return `
    <div class="row-card is-tappable" role="button" tabindex="0"
         onclick="loadDirectory('${escapeJs(targetPath)}')"
         onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); loadDirectory('${escapeJs(targetPath)}'); }">
      <div class="row-main">
        <div class="row-icon">${iosEmoji('folder')}</div>
        <div class="row-text">
          <span class="row-name ellipsis">${escapeHtml(item.name)}</span>
          <div class="row-meta">
            <span class="chip chip-neutral chip-mono chip-xs">folder</span>
            <span class="sep" aria-hidden="true">·</span>
            <span class="ellipsis">${item.permissions || 'drwxr-xr-x'}</span>
          </div>
        </div>
      </div>
      <span class="row-chevron" aria-hidden="true">${icon('chevronRight')}</span>
    </div>`;
}

function renderScriptRow(item) {
  const itemPath = joinPath(state.currentPath, item.name);
  const isRunning = state.currentExecution.scriptPath === itemPath && state.currentExecution.status === 'running';
  const emoji = getScriptEmoji(item.name);
  const octal = item.octal || '644';
  const octalTone = octal === '777' ? 'chip-jade' : 'chip-gold';

  return `
    <div class="row-card">
      <div class="row-main">
        <button type="button" class="row-icon is-actionable"
                onclick="openEmojiPicker('${escapeJs(item.name)}')"
                aria-label="Ganti ikon untuk ${escapeHtml(item.name)}" title="Ganti ikon script">
          ${iosEmoji(emoji)}
        </button>

        <div class="row-text">
          <span class="row-name ellipsis">${escapeHtml(item.name)}</span>
          <div class="row-meta">
            <span class="chip ${octalTone} chip-mono chip-xs">${octal}</span>
            <span class="sep" aria-hidden="true">·</span>
            <span>${item.size || '1.0K'}</span>
            <span class="sep" aria-hidden="true">·</span>
            <span class="ellipsis">${item.permissions || '-rwxr-xr-x'}</span>
          </div>
        </div>
      </div>

      <div class="row-actions">
        <button type="button" class="btn"
                onclick="openPermissionModal('${escapeJs(item.name)}', '${escapeJs(itemPath)}', '${octal}', '${escapeJs(item.permissions || '-rwxr-xr-x')}')">
          ${icon('sliders')}<span>Izin</span>
        </button>
        <button type="button" class="btn btn-kasane-gold"
                onclick="requestRunScript('${escapeJs(itemPath)}', '${escapeJs(item.name)}')">
          ${icon('lightning')}<span>${isRunning ? 'Lihat' : 'Run'}</span>
        </button>
      </div>
    </div>`;
}

function joinPath(dir, name) {
  return dir.endsWith('/') ? dir + name : `${dir}/${name}`;
}

/* ==========================================================================
   PERMISSIONS (chmod)
   ========================================================================== */

function openPermissionModal(name, path, octal, perms) {
  state.selectedItemForPerms = { name, path, octal, perms };
  setText('perm-filename', name);
  setText('perm-filepath', path);
  setCheckboxesFromOctal(octal || '755');
  showModal('permission-modal');
}

function closePermissionModal() {
  hideModal('permission-modal');
  state.selectedItemForPerms = null;
}

function setCheckboxesFromOctal(octalStr) {
  const o = String(octalStr).padStart(3, '0');
  const roles = [
    ['u', parseInt(o[0], 10) || 0],
    ['g', parseInt(o[1], 10) || 0],
    ['o', parseInt(o[2], 10) || 0]
  ];

  roles.forEach(([role, value]) => {
    document.getElementById(`perm-${role}-r`).checked = (value & 4) !== 0;
    document.getElementById(`perm-${role}-w`).checked = (value & 2) !== 0;
    document.getElementById(`perm-${role}-x`).checked = (value & 1) !== 0;
  });

  updateOctalDisplay();
}

function updateOctalDisplay() {
  const valueOf = role => {
    let v = 0;
    if (document.getElementById(`perm-${role}-r`).checked) v += 4;
    if (document.getElementById(`perm-${role}-w`).checked) v += 2;
    if (document.getElementById(`perm-${role}-x`).checked) v += 1;
    return v;
  };

  document.getElementById('perm-octal-input').value = `${valueOf('u')}${valueOf('g')}${valueOf('o')}`;
}

function applyOctalPreset(preset) {
  setCheckboxesFromOctal(preset);
}

async function savePermissions() {
  if (!state.selectedItemForPerms) return;

  const octal = document.getElementById('perm-octal-input').value.trim();
  const { path, name } = state.selectedItemForPerms;

  if (isAndroidNative) {
    let success = false;
    try {
      success = window.AndroidRoot.changePermissions(path, octal) === true;
    } catch (e) {
      success = false;
    }

    if (!success) {
      showToast('Gagal mengubah izin file lewat KernelSU.', 'error');
      return;
    }

    showToast(`Izin ${name} diubah ke ${octal}.`, 'success');
  } else {
    const item = state.items.find(i => i.name === name);
    if (item) {
      item.octal = octal;
      item.permissions = octalToSymbolic(octal, item.isDirectory);
    }
    showToast(`Izin ${name} diubah ke ${octal} (pratinjau).`, 'info');
  }

  closePermissionModal();
  loadDirectory(state.currentPath);
}

function octalToSymbolic(octal, isDir) {
  const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const prefix = isDir ? 'd' : '-';
  const digits = String(octal).padStart(3, '0');
  return `${prefix}${map[parseInt(digits[0], 10) || 0]}${map[parseInt(digits[1], 10) || 0]}${map[parseInt(digits[2], 10) || 0]}`;
}

/* ==========================================================================
   RUN CONFIRMATION (two steps)
   ========================================================================== */

function requestRunScript(filePath, scriptName) {
  if (state.currentExecution.scriptPath === filePath && state.currentExecution.status === 'running') {
    openTerminalSheet();
    return;
  }

  state.pendingRun = { filePath, scriptName };

  setText('confirm-file-name', scriptName);
  setText('confirm-file-path', filePath);
  setText('confirm-file-name-2', scriptName);

  document.getElementById('confirm-step-1').classList.remove('hidden');
  document.getElementById('confirm-step-2').classList.add('hidden');

  showModal('run-confirm-modal');
}

function proceedToConfirmStep2() {
  document.getElementById('confirm-step-1').classList.add('hidden');
  document.getElementById('confirm-step-2').classList.remove('hidden');
}

function backToConfirmStep1() {
  document.getElementById('confirm-step-2').classList.add('hidden');
  document.getElementById('confirm-step-1').classList.remove('hidden');
}

function closeRunConfirmModal() {
  hideModal('run-confirm-modal');
  state.pendingRun = null;
}

function executeConfirmedScript() {
  if (!state.pendingRun) return;
  const { filePath, scriptName } = state.pendingRun;
  closeRunConfirmModal();
  runScriptFile(filePath, scriptName);
}

/* ==========================================================================
   TIMESTAMP
   ========================================================================== */

function getExactTimestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/* ==========================================================================
   EXECUTION CONSOLE
   ========================================================================== */

function runScriptFile(filePath, scriptName) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = getExactTimestamp();

  state.currentExecution.scriptPath = filePath;
  state.currentExecution.scriptName = scriptName;
  state.currentExecution.status = 'running';
  state.currentExecution.startTime = Date.now();
  state.currentExecution.startTimeFormatted = `${dateStr}, ${timeStr}`;
  state.currentExecution.logs = [];

  setText('console-title', scriptName);
  setText('console-start-time', `Mulai: ${timeStr}`);
  updateConsoleStatus('Berjalan', 'gold');

  clearTerminal();
  openTerminalSheet();
  hideDynamicIsland();
  updateLogsRunningBanner();

  if (state.currentExecution.timerInterval) clearInterval(state.currentExecution.timerInterval);
  state.currentExecution.timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - state.currentExecution.startTime) / 1000).toFixed(1);
    setText('console-timer', `Durasi: ${elapsed}s`);
    setText('island-timer', `${elapsed}s`);
    setText('logs-banner-timer', `${elapsed}s`);
  }, 100);

  if (isAndroidNative) {
    try {
      window.AndroidRoot.runScript(filePath);
    } catch (err) {
      appendLogLine(`[ERROR] Gagal memanggil root: ${err.message}`, 'error');
      finishExecution(1);
    }
  } else {
    simulateExecution(filePath, scriptName);
  }

  renderExplorer();
}

/* Browser preview: mirrors the shape and pacing of a real run. */
function simulateExecution(path, name) {
  appendLogLine('🌸 [KASANE] Engine: KernelSU-Next v3.4.0 (SuSFS Stealth)', 'sys');
  appendLogLine(`📱 [DEVICE] ${state.deviceSpecs.deviceName}`, 'sys');
  appendLogLine(`⚙️ [KERNEL] ${state.deviceSpecs.kernelVersion}`, 'sys');
  appendLogLine(`📜 [SCRIPT] chmod +x "${path}" && sh "${path}"`, 'sys');
  appendLogLine('----------------------------------------------------------------------', 'dim');

  const steps = [
    { text: 'Memeriksa core MediaTek Helio G99...', type: 'info', delay: 300 },
    { text: 'Locking core performa ke frekuensi gaming maksimum...', type: 'info', delay: 700 },
    { text: 'Menyetel touch panel sampling rate ke 240Hz (Infinix Note 30)...', type: 'info', delay: 1100 },
    { text: 'Membatasi thermal throttling agresif agar fps tidak drop...', type: 'warn', delay: 1500 },
    { text: 'Profil gaming aktif lancar. Latensi berkurang 14ms.', type: 'success', delay: 2000 },
    { text: '🌸 [KASANE] Selesai dengan sukses (Kode: 0).', type: 'sys', delay: 2400 }
  ];

  steps.forEach(step => {
    window.setTimeout(() => {
      if (state.currentExecution.status !== 'running') return;
      appendLogLine(step.text, step.type);
      if (step.text.includes('Kode: 0')) finishExecution(0);
    }, step.delay);
  });
}

/* Native bridge callbacks */
window.onNativeLogReceived = function (line, type) {
  appendLogLine(line, type || 'stdout');
};

window.onNativeExecutionFinished = function (exitCode) {
  if (exitCode === 0) {
    appendLogLine('🌸 [KASANE] Selesai dengan sukses (Kode: 0).', 'success');
    finishExecution(0);
  } else {
    appendLogLine(`❌ [KASANE] Script berhenti dengan kode: ${exitCode}.`, 'error');
    finishExecution(exitCode);
  }
};

function finishExecution(exitCode) {
  state.currentExecution.status = exitCode === 0 ? 'success' : 'error';
  if (state.currentExecution.timerInterval) clearInterval(state.currentExecution.timerInterval);

  const durationStr = `${((Date.now() - state.currentExecution.startTime) / 1000).toFixed(2)}s`;
  const succeeded = exitCode === 0;

  updateConsoleStatus(succeeded ? 'Selesai' : `Gagal (${exitCode})`, succeeded ? 'jade' : 'rose');

  state.logHistory.unshift({
    id: 'log_' + Date.now(),
    scriptName: state.currentExecution.scriptName || 'script.sh',
    path: state.currentExecution.scriptPath || '/data/local/tmp',
    timestamp: state.currentExecution.startTimeFormatted || new Date().toLocaleString('id-ID'),
    duration: durationStr,
    status: succeeded ? 'success' : 'failed',
    exitCode: exitCode,
    lines: [...state.currentExecution.logs]
  });

  setText('island-status', succeeded ? 'Selesai' : 'Gagal');
  updateLogsRunningBanner();
  renderExplorer();
  renderLogHistory();

  showToast(
    succeeded
      ? `${state.currentExecution.scriptName} selesai dalam ${durationStr}.`
      : `${state.currentExecution.scriptName} berhenti dengan kode ${exitCode}.`,
    succeeded ? 'success' : 'error'
  );
}

function updateConsoleStatus(text, tone) {
  const el = document.getElementById('console-status-badge');
  if (!el) return;

  const toneClass = tone === 'jade' ? 'chip-jade' : tone === 'rose' ? 'chip-rose' : 'chip-gold';
  const dotClass = tone === 'gold' ? 'live-dot is-gold' : 'live-dot';

  el.className = `chip ${toneClass} chip-mono`;
  el.innerHTML = `<span class="${dotClass}" aria-hidden="true"></span>${escapeHtml(text)}`;
}

function appendLogLine(text, level = 'stdout') {
  const container = document.getElementById('terminal-content');
  if (!container) return;

  const timeFormatted = getExactTimestamp();
  const allowed = ['sys', 'dim', 'info', 'warn', 'success', 'error', 'stdout'];
  const tone = allowed.includes(level) ? level : 'stdout';

  const lineEl = document.createElement('div');
  lineEl.className = 'term-line';

  const ts = document.createElement('span');
  ts.className = 'term-ts';
  ts.textContent = `[${timeFormatted}]`;

  const msg = document.createElement('span');
  msg.className = `term-msg term-${tone}`;
  msg.textContent = text;

  lineEl.append(ts, msg);
  container.appendChild(lineEl);

  state.currentExecution.logs.push({ time: timeFormatted, text, type: tone });

  if (state.currentExecution.autoScroll) container.scrollTop = container.scrollHeight;
}

function clearTerminal() {
  const container = document.getElementById('terminal-content');
  if (container) container.innerHTML = '';
  state.currentExecution.logs = [];
}

/* ==========================================================================
   CLIPBOARD
   ========================================================================== */

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } catch (e2) {
      showToast('Clipboard tidak tersedia di perangkat ini.', 'error');
      document.body.removeChild(area);
      return;
    }
    document.body.removeChild(area);
  }

  showToast(successMessage, 'success');
}

function copyTerminalLogs() {
  if (state.currentExecution.logs.length === 0) {
    showToast('Belum ada output untuk disalin.', 'warn');
    return;
  }
  const fullText = state.currentExecution.logs.map(l => `[${l.time}] ${l.text}`).join('\n');
  copyText(fullText, 'Log eksekusi disalin ke clipboard.');
}

function copyLogById(logId) {
  const item = state.logHistory.find(l => l.id === logId);
  if (!item) return;
  const fullText = item.lines.map(l => `[${l.time}] ${l.text}`).join('\n');
  copyText(fullText, `Log ${item.scriptName} disalin ke clipboard.`);
}

function copyCurrentModalLog() {
  if (!state.selectedModalLog) return;
  copyLogById(state.selectedModalLog.id);
}

/* ==========================================================================
   FORCE STOP
   ========================================================================== */

function stopCurrentScript() {
  if (state.currentExecution.status !== 'running') return;

  if (isAndroidNative) {
    try {
      window.AndroidRoot.killProcess();
    } catch (e) {
      /* The bridge may already have reaped the process; the UI still resolves. */
    }
  }

  appendLogLine('⚠️ [FORCE STOP] Script dihentikan paksa oleh pengguna.', 'warn');
  finishExecution(130);
}

/* ==========================================================================
   TERMINAL SHEET + DYNAMIC ISLAND
   ========================================================================== */

function openTerminalSheet() {
  document.getElementById('terminal-sheet').classList.add('open');
  document.getElementById('sheet-backdrop').classList.remove('is-closed');
}

function closeTerminalSheet() {
  document.getElementById('terminal-sheet').classList.remove('open');
  document.getElementById('sheet-backdrop').classList.add('is-closed');
  if (state.currentExecution.status === 'running') showDynamicIsland();
}

function showDynamicIsland() {
  const island = document.getElementById('dynamic-island');
  setText('island-name', state.currentExecution.scriptName || 'Script Berjalan');
  island.classList.add('visible');
}

function hideDynamicIsland() {
  document.getElementById('dynamic-island').classList.remove('visible');
}

/* ==========================================================================
   LOG HISTORY
   ========================================================================== */

function updateLogsRunningBanner() {
  const banner = document.getElementById('logs-running-banner');
  if (!banner) return;

  if (state.currentExecution.status === 'running') {
    banner.classList.remove('hidden');
    setText('logs-banner-script-name', state.currentExecution.scriptName || 'script.sh');
  } else {
    banner.classList.add('hidden');
  }
}

function renderLogHistory() {
  const container = document.getElementById('logs-history-list');
  const countBadge = document.getElementById('logs-total-count');
  if (countBadge) countBadge.textContent = `${state.logHistory.length} Riwayat`;

  updateLogsRunningBanner();
  if (!container) return;

  if (state.logHistory.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${iosEmojiLg('scroll')}
        <p class="empty-title">Belum ada riwayat</p>
        <p class="empty-hint">Jalankan satu script, hasilnya akan tercatat di sini lengkap dengan detik.</p>
      </div>`;
    return;
  }

  container.innerHTML = state.logHistory.map(item => {
    const succeeded = item.status === 'success';
    return `
      <div class="row-card">
        <div class="row-main">
          <div class="row-icon ${succeeded ? 'is-ok' : 'is-fail'}">${icon(succeeded ? 'check' : 'cross')}</div>
          <div class="row-text">
            <div class="inline-2 min-0">
              <span class="row-name ellipsis">${escapeHtml(item.scriptName)}</span>
              <span class="chip ${succeeded ? 'chip-jade' : 'chip-rose'} chip-mono chip-xs">exit ${succeeded ? 0 : item.exitCode}</span>
            </div>
            <div class="row-meta">
              <span>${escapeHtml(item.timestamp.split(', ')[1] || item.timestamp)}</span>
              <span class="sep" aria-hidden="true">·</span>
              <span>${item.duration}</span>
              <span class="sep" aria-hidden="true">·</span>
              <span>${item.lines.length} baris</span>
            </div>
          </div>
        </div>

        <div class="row-actions">
          <button type="button" class="btn" onclick="copyLogById('${item.id}')" title="Salin log ini">
            ${icon('copy')}<span>Salin</span>
          </button>
          <button type="button" class="btn btn-kasane-gold" onclick="viewDetailedLog('${item.id}')">
            ${icon('scroll')}<span>Detail</span>
          </button>
        </div>
      </div>`;
  }).join('');
}

function viewDetailedLog(logId) {
  const item = state.logHistory.find(l => l.id === logId);
  if (!item) return;

  state.selectedModalLog = item;
  setText('modal-log-title', item.scriptName);
  setText('modal-log-meta',
    `Dijalankan ${item.timestamp} · durasi ${item.duration} · ${item.status === 'success' ? 'berhasil' : 'gagal'}`);

  const contentEl = document.getElementById('modal-log-content');
  contentEl.innerHTML = item.lines.map(line => {
    const tone = ['sys', 'info', 'warn', 'success', 'error', 'dim', 'stdout'].includes(line.type) ? line.type : 'stdout';
    return `
      <div class="term-line">
        <span class="term-ts">[${escapeHtml(line.time)}]</span>
        <span class="term-msg term-${tone}">${escapeHtml(line.text)}</span>
      </div>`;
  }).join('');

  showModal('detailed-log-modal');
}

function closeDetailedLogModal() {
  hideModal('detailed-log-modal');
  state.selectedModalLog = null;
}

async function clearLogHistory() {
  if (state.logHistory.length === 0) {
    showToast('Riwayat masih kosong.', 'info');
    return;
  }

  const confirmed = await showDialog({
    title: 'Hapus seluruh riwayat',
    message: 'Semua catatan eksekusi akan dihapus dari perangkat. Tindakan ini tidak bisa dibatalkan.',
    confirmLabel: 'Hapus Semua',
    cancelLabel: 'Batal',
    danger: true
  });

  if (!confirmed) return;

  state.logHistory = [];
  renderLogHistory();
  showToast('Riwayat eksekusi dihapus.', 'success');
}

/* ==========================================================================
   EVENT WIRING
   ========================================================================== */

function setupEventListeners() {
  const autoScrollBtn = document.getElementById('btn-autoscroll');
  if (autoScrollBtn) {
    autoScrollBtn.addEventListener('click', () => {
      state.currentExecution.autoScroll = !state.currentExecution.autoScroll;
      autoScrollBtn.classList.toggle('is-on', state.currentExecution.autoScroll);
      autoScrollBtn.setAttribute('aria-pressed', String(state.currentExecution.autoScroll));
    });
  }

  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.addEventListener('change', updateOctalDisplay);
  });

  /* Keyboard users can dismiss either sheet-like surface. */
  ['terminal-sheet', 'dynamic-island'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if (id === 'terminal-sheet') closeTerminalSheet();
      else openTerminalSheet();
    });
  });

  document.addEventListener('keydown', event => {
    const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden'));
    const topModal = openModals[openModals.length - 1] || null;

    /* Keep Tab inside the topmost dialog. */
    if (event.key === 'Tab' && topModal) {
      const focusables = Array.from(
        topModal.querySelectorAll('button:not([disabled]), input:not([readonly]), [tabindex]:not([tabindex="-1"])')
      ).filter(el => el.offsetParent !== null);

      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (event.key !== 'Escape') return;

    /* Dialogs created by showDialog() own their own Escape handling. */
    if (topModal && topModal.dataset.dynamic === 'true') return;

    if (topModal) {
      hideModal(topModal.id);
      return;
    }

    if (document.getElementById('terminal-sheet').classList.contains('open')) {
      closeTerminalSheet();
    }
  });
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/* Escapes a value for use inside a single-quoted inline handler argument. */
function escapeJs(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\u003C');
}
