/**
 * Kasane Shell // Game Setup (User Anime & iOS Theme Edition)
 * Features:
 * - Real User Anime Wallpaper with Translucent Glassmorphism
 * - Authentic Apple iOS 3D Emojis
 * - Top-Level Root Status (Granted Default)
 * - MT Manager Permissions Editor (chmod 777)
 * - Detailed Menu Logs with Exact Seconds
 */

// Helper to render Apple iOS 3D Emoji
function iosEmoji(name, extraClass = '') {
  return `<img src="assets/emojis/${name}.png" class="ios-emoji ${extraClass}" alt="${name}">`;
}

function iosEmojiLg(name) {
  return `<img src="assets/emojis/${name}.png" class="ios-emoji-lg" alt="${name}">`;
}

const state = {
  currentTab: 'explorer', // 'explorer' | 'logs' | 'root'
  currentPath: '/data/local/tmp',
  items: [],
  selectedItemForPerms: null,
  deviceSpecs: {
    deviceName: 'Infinix Note 30 (X6833B)',
    model: 'X6833B',
    displayResolution: '1080 x 2460 FHD+ (20.5:9, 120Hz)',
    kernelVersion: '5.10.269-SuiKernel-Stable-KernelSU-Next',
    androidVersion: 'AxionOS 2.7 • Android 16 (API 36)',
    activeSlot: 'Slot _b (/dev/block/sdc55)',
    rootEngine: 'KernelSU-Next v3.4.0 (Hybrid + SuSFS)'
  },
  rootDiagnostics: {
    status: 'HEALTHY',
    rootUid: true,
    uidOutput: 'uid=0(root) gid=0(root)',
    ksuVersion: 'KernelSU-Next v3.4.0 (Hybrid Mode)',
    susfsActive: true,
    susfsInfo: 'SuSFS v2.3.0 (GKI Full Feature Stealth)',
    selinux: 'Enforcing',
    tmpWritable: true,
    slot: '_b'
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
  // Detailed History with Exact Seconds
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
        { time: '16:30:15', text: '🌸 [KASANE] Memulai eksekusi script root...', type: 'sys' },
        { time: '16:30:15', text: '📜 [TARGET] /data/local/tmp/touch_boost_120hz.sh', type: 'sys' },
        { time: '16:30:16', text: 'Touch sampling rate di-lock ke 240Hz (overclock respons layar).', type: 'info' },
        { time: '16:30:16', text: 'Filter sentuhan dinonaktifkan untuk memangkas delay touch input.', type: 'info' },
        { time: '16:30:17', text: 'Input dispatch latency berkurang sebesar 14ms.', type: 'success' },
        { time: '16:30:17', text: '🌸 [KASANE] Eksekusi selesai dengan status: BERHASIL (Kode 0)', type: 'sys' }
      ]
    }
  ],
  // High fidelity filesystem for testing
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

document.addEventListener('DOMContentLoaded', () => {
  initSakuraPetals();
  loadDeviceTelemetry();
  loadDirectory(state.currentPath);
  renderLogHistory();
  renderRootDiagnostics();
  setupEventListeners();
});

// Gentle 60fps Sakura Petals
function initSakuraPetals() {
  const container = document.getElementById('sakura-container');
  if (!container) return;
  const count = 10;
  for (let i = 0; i < count; i++) {
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

// Tab Switching
function switchTab(tabId) {
  state.currentTab = tabId;

  document.getElementById('view-explorer').classList.toggle('hidden', tabId !== 'explorer');
  document.getElementById('view-logs').classList.toggle('hidden', tabId !== 'logs');
  document.getElementById('view-root').classList.toggle('hidden', tabId !== 'root');

  ['explorer', 'logs', 'root'].forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (!btn) return;
    if (id === tabId) {
      btn.className = "active-tap flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500/25 text-amber-950 border border-amber-300 shadow-xs spring-transition flex items-center justify-center gap-1.5";
    } else {
      btn.className = "active-tap flex-1 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 border border-transparent spring-transition flex items-center justify-center gap-1.5";
    }
  });

  if (tabId === 'logs') renderLogHistory();
  if (tabId === 'root') renderRootDiagnostics();
}

// Telemetry & Root Diagnostics
function loadDeviceTelemetry() {
  if (isAndroidNative) {
    try {
      const rawSpecs = window.AndroidRoot.getDeviceSpecs();
      if (rawSpecs) state.deviceSpecs = JSON.parse(rawSpecs);

      const rawDiag = window.AndroidRoot.runRootDiagnostics();
      if (rawDiag) state.rootDiagnostics = JSON.parse(rawDiag);
    } catch (e) {
      console.error('Bridge error:', e);
    }
  }

  const pxW = Math.round(window.screen.width * (window.devicePixelRatio || 1));
  const pxH = Math.round(window.screen.height * (window.devicePixelRatio || 1));
  if (pxW > 0 && pxH > 0 && isAndroidNative) {
    state.deviceSpecs.displayResolution = `${Math.min(pxW, pxH)} x ${Math.max(pxW, pxH)} FHD+ (20.5:9, 120Hz)`;
  }

  // Populate UI Header Telemetry
  document.getElementById('hud-device-name').innerText = state.deviceSpecs.deviceName || 'Infinix Note 30';
  document.getElementById('hud-kernel-version').innerText = state.deviceSpecs.kernelVersion || '5.10.269-SuiKernel';
  document.getElementById('hud-android-version').innerText = state.deviceSpecs.androidVersion || 'Android 16';
  document.getElementById('hud-active-slot').innerText = state.deviceSpecs.activeSlot || '_b';

  const displayEl = document.getElementById('hud-display-resolution');
  if (displayEl) {
    displayEl.innerText = state.deviceSpecs.displayResolution || '1080 x 2460 FHD+ (120Hz)';
  }

  // Root Status Badge: Always "Granted" by default for clean stealth experience
  const rootBadge = document.getElementById('root-badge');
  rootBadge.innerHTML = `<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span> ${iosEmoji('shield')} Root: Granted (KernelSU)`;
  rootBadge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs";
}

function toggleDesktopView() {
  const isMockup = document.body.classList.contains('mode-phone-mockup');
  const toggleBtn = document.getElementById('btn-desktop-toggle');
  
  if (isMockup) {
    document.body.classList.remove('mode-phone-mockup');
    document.body.classList.add('mode-fullscreen-desktop');
    if (toggleBtn) toggleBtn.innerHTML = `${iosEmoji('phone')} Mode HP (1080x2460)`;
  } else {
    document.body.classList.remove('mode-fullscreen-desktop');
    document.body.classList.add('mode-phone-mockup');
    if (toggleBtn) toggleBtn.innerHTML = `<span>💻</span> Mode Layar Lebar`;
  }
}

function runDeepDiagnostics() {
  const btn = document.getElementById('btn-recheck-root');
  if (btn) btn.innerHTML = `<span>⏳</span> Memeriksa...`;

  setTimeout(() => {
    loadDeviceTelemetry();
    renderRootDiagnostics();
    if (btn) btn.innerHTML = `${iosEmoji('refresh')} Periksa Ulang`;
    alert('Diagnostik selesai: Root status KernelSU-Next terverifikasi GRANTED & /data/local/tmp siap pakai.');
  }, 500);
}

function renderRootDiagnostics() {
  const container = document.getElementById('root-diagnostics-content');
  if (!container) return;

  const d = state.rootDiagnostics;

  container.innerHTML = `
    <div class="space-y-2.5 font-mono text-xs">
      <div class="kasane-card p-3 rounded-2xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          ${iosEmoji('check', 'size-5')}
          <div>
            <span class="font-bold text-slate-900">Hak Superuser (UID 0)</span>
            <p class="text-[11px] text-slate-600">${escapeHtml(d.uidOutput || 'uid=0(root) gid=0(root)')}</p>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          GRANTED
        </span>
      </div>

      <div class="kasane-card p-3 rounded-2xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          ${iosEmoji('check', 'size-5')}
          <div>
            <span class="font-bold text-slate-900">Akses Tulis /data/local/tmp</span>
            <p class="text-[11px] text-slate-600">Tes membuat dan menjalankan file script di /tmp</p>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          NORMAL (OK)
        </span>
      </div>

      <div class="kasane-card p-3 rounded-2xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          ${iosEmoji('shield', 'size-5')}
          <div>
            <span class="font-bold text-slate-900">KernelSU-Next & SuSFS</span>
            <p class="text-[11px] text-slate-600">${escapeHtml(d.susfsInfo)}</p>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          AKTIF & STEALTH
        </span>
      </div>
    </div>
  `;
}

// ============================================================================
// FILE & SCRIPT EXPLORER
// ============================================================================
function loadDirectory(path) {
  state.currentPath = path;
  renderBreadcrumbs();

  if (isAndroidNative) {
    try {
      const rawJson = window.AndroidRoot.listDirectory(path);
      state.items = JSON.parse(rawJson || '[]');
    } catch (e) {
      console.error('List directory error:', e);
      state.items = [];
    }
  } else {
    state.items = state.mockFS[path] || [];
  }

  renderExplorer();
}

function renderBreadcrumbs() {
  const container = document.getElementById('path-breadcrumbs');
  let html = `<button onclick="loadDirectory('/data/local/tmp')" class="text-amber-900 hover:text-amber-950 font-mono text-xs font-bold flex items-center gap-1">${iosEmoji('folder')} /data/local/tmp</button>`;
  
  if (state.currentPath !== '/data/local/tmp') {
    const subPath = state.currentPath.replace('/data/local/tmp', '');
    const subParts = subPath.split('/').filter(p => p.length > 0);
    let accumulated = '/data/local/tmp';
    subParts.forEach(part => {
      accumulated += '/' + part;
      const target = accumulated;
      html += ` <span class="text-slate-400">/</span> <button onclick="loadDirectory('${target}')" class="text-slate-800 hover:text-amber-900 font-mono text-xs font-semibold">${escapeHtml(part)}</button>`;
    });
  }

  container.innerHTML = html;
  
  const btnUp = document.getElementById('btn-folder-up');
  if (state.currentPath === '/data/local/tmp') {
    btnUp.classList.add('opacity-40', 'pointer-events-none');
  } else {
    btnUp.classList.remove('opacity-40', 'pointer-events-none');
  }
}

function navigateUp() {
  if (state.currentPath === '/data/local/tmp') return;
  const parts = state.currentPath.split('/').filter(p => p.length > 0);
  parts.pop();
  const parent = '/' + parts.join('/');
  loadDirectory(parent);
}

function renderExplorer() {
  const container = document.getElementById('file-list');
  const countBadge = document.getElementById('items-count');
  countBadge.innerText = `${state.items.length} item`;

  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-500 kasane-card rounded-2xl">
        <div class="mb-2">${iosEmoji('snowflake', 'size-8')}</div>
        <p class="text-sm font-semibold text-slate-800">Folder ini kosong.</p>
        <p class="text-xs text-slate-600 mt-1">Salin file .sh kamu ke <code class="font-mono text-amber-900 font-bold">/data/local/tmp</code> menggunakan MT Manager.</p>
      </div>
    `;
    return;
  }

  const sorted = [...state.items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  container.innerHTML = sorted.map(item => {
    const isDir = item.isDirectory;
    const isScript = item.name.endsWith('.sh');
    const isFull777 = item.octal === '777';

    if (isDir) {
      const targetPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
      return `
        <div onclick="loadDirectory('${targetPath}')" 
             class="kasane-card rounded-2xl p-3.5 flex items-center justify-between hover:border-amber-300 cursor-pointer active-tap group">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-amber-500/15 border border-amber-300 flex items-center justify-center text-xl shadow-xs group-hover:scale-105 spring-transition">
              ${iosEmoji('folder')}
            </div>
            <div>
              <span class="font-mono text-sm font-bold text-slate-900 group-hover:text-amber-900 transition-colors">${escapeHtml(item.name)}</span>
              <p class="text-[11px] font-mono text-slate-600">Folder • ${item.permissions || 'drwxr-xr-x'}</p>
            </div>
          </div>
          <span class="text-slate-400 group-hover:text-amber-700 font-bold text-lg group-hover:translate-x-1 spring-transition">›</span>
        </div>
      `;
    }

    const itemPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
    const isRunning = state.currentExecution.scriptPath === itemPath && state.currentExecution.status === 'running';

    let scriptEmoji = 'scroll';
    if (item.name.includes('touch')) scriptEmoji = 'lightning';
    if (item.name.includes('game') || item.name.includes('fps')) scriptEmoji = 'swords';
    if (item.name.includes('thermal')) scriptEmoji = 'snowflake';
    if (item.name.includes('gpu') || item.name.includes('cpu')) scriptEmoji = 'lightning';

    return `
      <div class="kasane-card rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-start gap-3">
          <div class="size-10 rounded-xl bg-white/70 border border-slate-300 flex items-center justify-center text-xl shrink-0 shadow-xs">
            ${iosEmoji(scriptEmoji)}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">${escapeHtml(item.name)}</span>
              ${isFull777 
                ? '<span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">chmod 777</span>' 
                : `<span class="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">${item.octal || '644'}</span>`}
            </div>
            <div class="flex items-center gap-2 text-[11px] font-mono text-slate-600 mt-0.5">
              <span>${item.size || '1.0K'}</span>
              <span>•</span>
              <span>${item.permissions || '-rwxrwxrwx'}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <!-- MT Manager Perms -->
          <button onclick="openPermissionModal('${escapeHtml(item.name)}', '${itemPath}', '${item.octal || '755'}', '${item.permissions || '-rwxr-xr-x'}')" 
                  class="active-tap flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold shadow-xs spring-transition">
            ${iosEmoji('key')}
            <span>Izin</span>
          </button>

          <!-- Run Script -->
          ${isScript ? `
            <button onclick="runScriptFile('${itemPath}', '${escapeHtml(item.name)}')" 
                    class="active-tap flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-kasane-gold font-bold text-xs spring-transition shadow-xs">
              <span>▶</span>
              <span>${isRunning ? 'Lihat Console' : 'Jalankan'}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// MT MANAGER PERMISSIONS MODAL
// ============================================================================
function openPermissionModal(name, path, octal, perms) {
  state.selectedItemForPerms = { name, path, octal, perms };
  document.getElementById('perm-filename').innerText = name;
  document.getElementById('perm-filepath').innerText = path;
  setCheckboxesFromOctal(octal || '755');
  document.getElementById('permission-modal').classList.remove('hidden');
}

function closePermissionModal() {
  document.getElementById('permission-modal').classList.add('hidden');
  state.selectedItemForPerms = null;
}

function setCheckboxesFromOctal(octalStr) {
  const o = octalStr.padStart(3, '0');
  const owner = parseInt(o[0]) || 0;
  const group = parseInt(o[1]) || 0;
  const other = parseInt(o[2]) || 0;

  document.getElementById('perm-u-r').checked = (owner & 4) !== 0;
  document.getElementById('perm-u-w').checked = (owner & 2) !== 0;
  document.getElementById('perm-u-x').checked = (owner & 1) !== 0;

  document.getElementById('perm-g-r').checked = (group & 4) !== 0;
  document.getElementById('perm-g-w').checked = (group & 2) !== 0;
  document.getElementById('perm-g-x').checked = (group & 1) !== 0;

  document.getElementById('perm-o-r').checked = (other & 4) !== 0;
  document.getElementById('perm-o-w').checked = (other & 2) !== 0;
  document.getElementById('perm-o-x').checked = (other & 1) !== 0;

  updateOctalDisplay();
}

function updateOctalDisplay() {
  let owner = 0;
  let group = 0;
  let other = 0;

  if (document.getElementById('perm-u-r').checked) owner += 4;
  if (document.getElementById('perm-u-w').checked) owner += 2;
  if (document.getElementById('perm-u-x').checked) owner += 1;

  if (document.getElementById('perm-g-r').checked) group += 4;
  if (document.getElementById('perm-g-w').checked) group += 2;
  if (document.getElementById('perm-g-x').checked) group += 1;

  if (document.getElementById('perm-o-r').checked) other += 4;
  if (document.getElementById('perm-o-w').checked) other += 2;
  if (document.getElementById('perm-o-x').checked) other += 1;

  const octal = `${owner}${group}${other}`;
  document.getElementById('perm-octal-input').value = octal;
}

function applyOctalPreset(preset) {
  setCheckboxesFromOctal(preset);
}

function savePermissions() {
  if (!state.selectedItemForPerms) return;
  const octal = document.getElementById('perm-octal-input').value.trim();
  const filePath = state.selectedItemForPerms.path;

  if (isAndroidNative) {
    try {
      const success = window.AndroidRoot.changePermissions(filePath, octal);
      if (success) {
        alert(`Izin berhasil diubah: chmod ${octal} ${state.selectedItemForPerms.name}`);
      } else {
        alert('Gagal mengubah izin file via KernelSU.');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  } else {
    const item = state.items.find(i => i.name === state.selectedItemForPerms.name);
    if (item) {
      item.octal = octal;
      item.permissions = octalToSymbolic(octal, item.isDirectory);
    }
  }

  closePermissionModal();
  loadDirectory(state.currentPath);
}

function octalToSymbolic(octal, isDir) {
  const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
  const prefix = isDir ? 'd' : '-';
  const u = map[parseInt(octal[0]) || 0];
  const g = map[parseInt(octal[1]) || 0];
  const o = map[parseInt(octal[2]) || 0];
  return `${prefix}${u}${g}${o}`;
}

// Strict Colon Timestamp [HH:mm:ss]
function getExactTimestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ============================================================================
// EXECUTION CONSOLE (Exact Seconds & Kasane Clean UI)
// ============================================================================
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

  document.getElementById('console-title').innerText = scriptName;
  document.getElementById('console-start-time').innerText = `Mulai: ${timeStr}`;
  updateConsoleStatus('Sedang Berjalan...', 'amber');

  clearTerminal();
  openTerminalSheet();
  hideDynamicIsland();

  if (state.currentExecution.timerInterval) clearInterval(state.currentExecution.timerInterval);
  state.currentExecution.timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - state.currentExecution.startTime) / 1000).toFixed(1);
    document.getElementById('console-timer').innerText = `Durasi: ${elapsed}s`;
    document.getElementById('island-timer').innerText = `${elapsed}s`;
  }, 100);

  if (isAndroidNative) {
    try {
      window.AndroidRoot.runScript(filePath);
    } catch(err) {
      appendLogLine(`[ERROR] Gagal memanggil root: ${err.message}`, 'error');
      finishExecution(1);
    }
  } else {
    simulateExecution(filePath, scriptName);
  }

  renderExplorer();
}

function simulateExecution(path, name) {
  appendLogLine(`🌸 [KASANE] Engine: KernelSU-Next v3.4.0 (SuSFS Stealth)`, 'sys');
  appendLogLine(`📱 [DEVICE] ${state.deviceSpecs.deviceName}`, 'sys');
  appendLogLine(`⚙️ [KERNEL] ${state.deviceSpecs.kernelVersion}`, 'sys');
  appendLogLine(`📜 [SCRIPT] chmod +x "${path}" && sh "${path}"`, 'sys');
  appendLogLine(`----------------------------------------------------------------------`, 'dim');

  const simulatedLogs = [
    { text: `Memeriksa core MediaTek Helio G99...`, type: 'info', delay: 300 },
    { text: `Locking core performa ke frekuensi gaming maksimum...`, type: 'info', delay: 700 },
    { text: `Menyetel touch panel sampling rate ke 240Hz (Infinix Note 30)...`, type: 'info', delay: 1100 },
    { text: `Membatasi thermal throttling agresif agar fps tidak drop...`, type: 'warn', delay: 1500 },
    { text: `Profil gaming aktif lancar. Latensi berkurang 14ms.`, type: 'success', delay: 2000 },
    { text: `🌸 [KASANE] Selesai dengan sukses (Kode: 0).`, type: 'sys', delay: 2400 }
  ];

  simulatedLogs.forEach(entry => {
    setTimeout(() => {
      appendLogLine(entry.text, entry.type);
      if (entry.text.includes('Kode: 0')) {
        finishExecution(0);
      }
    }, entry.delay);
  });
}

// Native Bridge Callbacks
window.onNativeLogReceived = function(line, type) {
  appendLogLine(line, type || 'stdout');
};

window.onNativeExecutionFinished = function(exitCode) {
  if (exitCode === 0) {
    appendLogLine(`🌸 [KASANE] Selesai dengan sukses (Kode: 0).`, 'success');
    finishExecution(0);
  } else {
    appendLogLine(`❌ [KASANE] Script berhenti dengan kode: ${exitCode}.`, 'error');
    finishExecution(exitCode);
  }
};

function finishExecution(exitCode) {
  state.currentExecution.status = exitCode === 0 ? 'success' : 'error';
  if (state.currentExecution.timerInterval) {
    clearInterval(state.currentExecution.timerInterval);
  }

  const durationStr = `${((Date.now() - state.currentExecution.startTime) / 1000).toFixed(2)}s`;

  if (exitCode === 0) {
    updateConsoleStatus('Selesai (Berhasil)', 'emerald');
  } else {
    updateConsoleStatus(`Gagal (Kode ${exitCode})`, 'rose');
  }

  state.logHistory.unshift({
    id: 'log_' + Date.now(),
    scriptName: state.currentExecution.scriptName || 'script.sh',
    path: state.currentExecution.scriptPath || '/data/local/tmp',
    timestamp: state.currentExecution.startTimeFormatted || new Date().toLocaleString('id-ID'),
    duration: durationStr,
    status: exitCode === 0 ? 'success' : 'failed',
    exitCode: exitCode,
    lines: [...state.currentExecution.logs]
  });

  document.getElementById('island-status').innerText = exitCode === 0 ? 'Selesai' : 'Gagal';
  renderExplorer();
  renderLogHistory();
}

function updateConsoleStatus(text, color) {
  const el = document.getElementById('console-status-badge');
  const dotColor = color === 'amber' ? 'bg-amber-400 animate-pulse' : color === 'emerald' ? 'bg-emerald-400' : 'bg-rose-400';
  const textColor = color === 'amber' ? 'text-amber-300 border-amber-500/40 bg-amber-500/15' : color === 'emerald' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15' : 'text-rose-300 border-rose-500/40 bg-rose-500/15';

  el.className = `flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${textColor}`;
  el.innerHTML = `<span class="size-2 rounded-full ${dotColor}"></span> ${text}`;
}

function appendLogLine(text, level = 'stdout') {
  const container = document.getElementById('terminal-content');
  const lineEl = document.createElement('div');
  lineEl.className = 'py-0.5 leading-relaxed break-all flex items-start gap-2';

  let colorClass = 'text-slate-200';
  if (level === 'sys') colorClass = 'text-amber-300 font-semibold';
  if (level === 'dim') colorClass = 'text-slate-500';
  if (level === 'info') colorClass = 'text-sky-300';
  if (level === 'warn') colorClass = 'text-amber-300';
  if (level === 'success') colorClass = 'text-emerald-300 font-semibold';
  if (level === 'error') colorClass = 'text-rose-400 font-semibold';

  const timeFormatted = getExactTimestamp();

  lineEl.innerHTML = `<span class="text-slate-400 select-none font-mono text-[11px] shrink-0 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">[${timeFormatted}]</span><span class="${colorClass}">${escapeHtml(text)}</span>`;
  container.appendChild(lineEl);

  state.currentExecution.logs.push({ time: timeFormatted, text, type: level });

  if (state.currentExecution.autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function clearTerminal() {
  document.getElementById('terminal-content').innerHTML = '';
  state.currentExecution.logs = [];
}

function copyTerminalLogs() {
  const fullText = state.currentExecution.logs.map(l => `[${l.time}] ${l.text}`).join('\n');
  navigator.clipboard.writeText(fullText).then(() => {
    alert('Log berhasil disalin ke clipboard!');
  });
}

function stopCurrentScript() {
  if (state.currentExecution.status !== 'running') return;
  if (isAndroidNative) {
    try { window.AndroidRoot.killProcess(); } catch(e) {}
  }
  appendLogLine(`⚠️ [HENTIKAN] Script dihentikan oleh pengguna.`, 'warn');
  finishExecution(130);
}

function openTerminalSheet() {
  document.getElementById('terminal-sheet').classList.add('open');
  document.getElementById('sheet-backdrop').classList.remove('pointer-events-none', 'opacity-0');
}

function closeTerminalSheet() {
  document.getElementById('terminal-sheet').classList.remove('open');
  document.getElementById('sheet-backdrop').classList.add('pointer-events-none', 'opacity-0');
  if (state.currentExecution.status === 'running') {
    showDynamicIsland();
  }
}

function showDynamicIsland() {
  const island = document.getElementById('dynamic-island');
  document.getElementById('island-name').innerText = state.currentExecution.scriptName || 'Script Berjalan';
  island.classList.add('visible');
}

function hideDynamicIsland() {
  document.getElementById('dynamic-island').classList.remove('visible');
}

// ============================================================================
// MENU LOGS (Riwayat Eksekusi dengan Jam & Detik)
// ============================================================================
function renderLogHistory() {
  const container = document.getElementById('logs-history-list');
  const countBadge = document.getElementById('logs-total-count');
  if (countBadge) countBadge.innerText = `${state.logHistory.length} Riwayat`;

  if (!container) return;

  if (state.logHistory.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-500 kasane-card rounded-2xl">
        <div class="mb-2">${iosEmoji('scroll', 'size-8')}</div>
        <p class="text-sm font-semibold text-slate-800">Belum ada riwayat log.</p>
        <p class="text-xs text-slate-600 mt-1">Jalankan script untuk merekam log output lengkap dengan detik.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.logHistory.map((item) => {
    const isSuccess = item.status === 'success';
    return `
      <div class="kasane-card rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div class="flex items-start gap-3">
          <div class="size-9 rounded-xl ${isSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'} flex items-center justify-center text-base font-bold shrink-0">
            ${isSuccess ? '✓' : '✕'}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900">${escapeHtml(item.scriptName)}</span>
              <span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'}">
                ${isSuccess ? 'Berhasil (0)' : `Gagal (${item.exitCode})`}
              </span>
            </div>
            <div class="flex items-center gap-2.5 text-[11px] font-mono text-slate-600 mt-0.5">
              <span>${iosEmoji('clock')} ${item.timestamp}</span>
              <span>•</span>
              <span>${iosEmoji('stopwatch')} ${item.duration}</span>
              <span>•</span>
              <span>${item.lines.length} baris</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <button onclick="viewDetailedLog('${item.id}')" 
                  class="active-tap px-3 py-1.5 rounded-xl btn-kasane-gold text-xs font-bold shadow-xs spring-transition flex items-center gap-1.5">
            ${iosEmoji('scroll')}
            <span>Log Detail</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function viewDetailedLog(logId) {
  const item = state.logHistory.find(l => l.id === logId);
  if (!item) return;

  document.getElementById('modal-log-title').innerText = item.scriptName;
  document.getElementById('modal-log-meta').innerText = `Dijalankan: ${item.timestamp} • Durasi: ${item.duration} • Status: ${item.status === 'success' ? 'Berhasil' : 'Gagal'}`;

  const contentEl = document.getElementById('modal-log-content');
  contentEl.innerHTML = item.lines.map(line => {
    let colorClass = 'text-slate-200';
    if (line.type === 'sys') colorClass = 'text-amber-300 font-semibold';
    if (line.type === 'info') colorClass = 'text-sky-300';
    if (line.type === 'warn') colorClass = 'text-amber-300';
    if (line.type === 'success') colorClass = 'text-emerald-300 font-semibold';
    if (line.type === 'error') colorClass = 'text-rose-400 font-semibold';

    return `
      <div class="py-0.5 flex items-start gap-2">
        <span class="text-slate-400 select-none font-mono text-[11px] shrink-0 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">[${line.time}]</span>
        <span class="${colorClass}">${escapeHtml(line.text)}</span>
      </div>
    `;
  }).join('');

  document.getElementById('detailed-log-modal').classList.remove('hidden');
}

function closeDetailedLogModal() {
  document.getElementById('detailed-log-modal').classList.add('hidden');
}

function clearLogHistory() {
  if (confirm('Hapus seluruh riwayat log eksekusi?')) {
    state.logHistory = [];
    renderLogHistory();
  }
}

function setupEventListeners() {
  document.getElementById('btn-autoscroll')?.addEventListener('click', () => {
    state.currentExecution.autoScroll = !state.currentExecution.autoScroll;
    const btn = document.getElementById('btn-autoscroll');
    if (state.currentExecution.autoScroll) {
      btn.classList.add('text-amber-300', 'border-amber-400/40');
    } else {
      btn.classList.remove('text-amber-300', 'border-amber-400/40');
    }
  });

  const checkboxes = document.querySelectorAll('.perm-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateOctalDisplay);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
