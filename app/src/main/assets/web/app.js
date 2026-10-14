/**
 * Kasane Shell // Game Setup - Luminous Anime Nature & Root Orchestrator
 * Fully synchronized with https://kasane.aura.build/
 */

const state = {
  currentPath: '/data/local/tmp',
  items: [],
  selectedItemForPerms: null,
  deviceSpecs: {
    deviceName: 'Infinix Note 30 (X6833B)',
    model: 'X6833B',
    kernelVersion: '5.10.269-SuiKernel-Stable-KernelSU-Next',
    androidVersion: 'AxionOS 2.7 • Android 16 (API 36)',
    activeSlot: '_b (/dev/block/sdc55)',
    rootEngine: 'KernelSU-Next v3.4.0 (Hybrid + SuSFS)'
  },
  currentExecution: {
    scriptPath: null,
    scriptName: null,
    status: 'idle',
    startTime: 0,
    timerInterval: null,
    pid: null,
    logs: [],
    autoScroll: true
  },
  // High fidelity mock filesystem for testing inside browser
  mockFS: {
    '/data/local/tmp': [
      { name: 'game_boosters', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_tuning', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_boost_120hz.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.4K', isScript: true, tag: 'touch' },
      { name: 'mlbb_extreme_fps.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '2.1K', isScript: true, tag: 'game' },
      { name: 'thermal_bypass_drop.sh', isDirectory: false, permissions: '-rw-r--r--', octal: '644', size: '940B', isScript: true, tag: 'thermal' },
      { name: 'gpu_governor_lock.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.8K', isScript: true, tag: 'perf' }
    ],
    '/data/local/tmp/game_boosters': [
      { name: 'genshin_60fps_stable.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '1.6K', isScript: true, tag: 'game' },
      { name: 'pubg_smooth_90fps.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '3.2K', isScript: true, tag: 'game' }
    ],
    '/data/local/tmp/touch_tuning': [
      { name: 'poll_rate_240hz.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '890B', isScript: true, tag: 'touch' }
    ]
  }
};

const isAndroidNative = typeof window.AndroidRoot !== 'undefined';

document.addEventListener('DOMContentLoaded', () => {
  loadDeviceTelemetry();
  loadDirectory(state.currentPath);
  setupEventListeners();
});

// Load real device specs (Phone model, kernel version, slot, root)
function loadDeviceTelemetry() {
  if (isAndroidNative) {
    try {
      const rawSpecs = window.AndroidRoot.getDeviceSpecs();
      if (rawSpecs) {
        state.deviceSpecs = JSON.parse(rawSpecs);
      }
    } catch (e) {
      console.error('Failed to load device specs from native bridge:', e);
    }
  }

  // Populate UI Telemetry
  document.getElementById('hud-device-name').innerText = state.deviceSpecs.deviceName || 'Infinix Note 30';
  document.getElementById('hud-kernel-version').innerText = state.deviceSpecs.kernelVersion || '5.10.269-SuiKernel';
  document.getElementById('hud-android-version').innerText = state.deviceSpecs.androidVersion || 'Android 16';
  document.getElementById('hud-active-slot').innerText = state.deviceSpecs.activeSlot || '_b';
  document.getElementById('hud-root-engine').innerText = state.deviceSpecs.rootEngine || 'KernelSU-Next Active';

  const rootBadge = document.getElementById('root-badge');
  if (isAndroidNative) {
    try {
      const isRooted = window.AndroidRoot.checkRoot();
      if (isRooted) {
        rootBadge.innerHTML = `<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span> 🛡️ KernelSU Active`;
        rootBadge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm";
      } else {
        rootBadge.innerHTML = `<span class="size-2 rounded-full bg-rose-500"></span> ⚠️ Root Denied`;
        rootBadge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm";
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    rootBadge.innerHTML = `<span class="size-2 rounded-full bg-amber-500 animate-pulse"></span> 🌸 Kasane Preview (Sim)`;
    rootBadge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm";
  }
}

// Load Directory Items
function loadDirectory(path) {
  state.currentPath = path;
  renderBreadcrumbs();

  if (isAndroidNative) {
    try {
      const rawJson = window.AndroidRoot.listDirectory(path);
      state.items = JSON.parse(rawJson || '[]');
    } catch (e) {
      console.error('Failed to list directory via root bridge:', e);
      state.items = [];
    }
  } else {
    // Simulator Mode fallback
    state.items = state.mockFS[path] || [];
  }

  renderExplorer();
}

function renderBreadcrumbs() {
  const container = document.getElementById('path-breadcrumbs');
  
  let html = `<button onclick="loadDirectory('/data/local/tmp')" class="text-amber-700 hover:text-amber-900 font-mono text-xs font-bold flex items-center gap-1">📁 /data/local/tmp</button>`;
  
  if (state.currentPath !== '/data/local/tmp') {
    const subPath = state.currentPath.replace('/data/local/tmp', '');
    const subParts = subPath.split('/').filter(p => p.length > 0);
    
    let accumulated = '/data/local/tmp';
    subParts.forEach(part => {
      accumulated += '/' + part;
      const target = accumulated;
      html += ` <span class="text-slate-400">/</span> <button onclick="loadDirectory('${target}')" class="text-slate-700 hover:text-amber-700 font-mono text-xs font-semibold">${escapeHtml(part)}</button>`;
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

// Render File & Folder Explorer
function renderExplorer() {
  const container = document.getElementById('file-list');
  const countBadge = document.getElementById('items-count');
  countBadge.innerText = `${state.items.length} items`;

  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-slate-500 kasane-card rounded-2xl">
        <span class="text-3xl block mb-2">🍃</span>
        <p class="text-sm font-medium text-slate-700">No scripts or folders found here.</p>
        <p class="text-xs text-slate-500 mt-1">Place your .sh files into <code class="font-mono text-amber-700 font-semibold">/data/local/tmp</code> using MT Manager.</p>
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
    const isExecutable = item.octal && (item.octal.endsWith('7') || item.octal.endsWith('5') || item.permissions?.includes('x'));
    const isFull777 = item.octal === '777';

    if (isDir) {
      const targetPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
      return `
        <div onclick="loadDirectory('${targetPath}')" 
             class="kasane-card rounded-2xl p-4 flex items-center justify-between hover:border-amber-300 cursor-pointer active-tap group">
          <div class="flex items-center gap-3.5">
            <div class="size-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-xl group-hover:scale-105 spring-transition shadow-sm">
              📁
            </div>
            <div>
              <span class="font-mono text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors">${escapeHtml(item.name)}</span>
              <p class="text-xs font-mono text-slate-500">Folder • ${item.permissions || 'drwxr-xr-x'}</p>
            </div>
          </div>
          <span class="text-slate-400 group-hover:text-amber-600 font-bold text-lg group-hover:translate-x-1 spring-transition">›</span>
        </div>
      `;
    }

    const itemPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
    const isRunning = state.currentExecution.scriptPath === itemPath && state.currentExecution.status === 'running';

    // Anime Game Setup thematic emoji badge
    let scriptEmoji = '📜';
    if (item.name.includes('touch')) scriptEmoji = '⚡';
    if (item.name.includes('game') || item.name.includes('mlbb') || item.name.includes('fps')) scriptEmoji = '⚔️';
    if (item.name.includes('thermal')) scriptEmoji = '❄️';
    if (item.name.includes('gpu') || item.name.includes('cpu')) scriptEmoji = '🚀';

    return `
      <div class="kasane-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group">
        <div class="flex items-start gap-3.5">
          <div class="size-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-sm">
            ${scriptEmoji}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono text-sm font-bold text-slate-800 truncate">${escapeHtml(item.name)}</span>
              ${isFull777 
                ? '<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">chmod 777</span>' 
                : `<span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${isExecutable ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-600'}">${item.octal || '644'}</span>`}
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-slate-500 mt-0.5">
              <span>${item.size || '1.0K'}</span>
              <span>•</span>
              <span>${item.permissions || '-rwxrwxrwx'}</span>
            </div>
          </div>
        </div>

        <!-- MT Manager Actions: Chmod Permission & Run -->
        <div class="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <!-- Chmod Permission Button -->
          <button onclick="openPermissionModal('${escapeHtml(item.name)}', '${itemPath}', '${item.octal || '755'}', '${item.permissions || '-rwxr-xr-x'}')" 
                  title="MT Manager Permission Editor"
                  class="active-tap flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm spring-transition">
            <span>🗝️</span>
            <span>Perms</span>
          </button>

          <!-- Run Script Button -->
          ${isScript ? `
            <button onclick="runScriptFile('${itemPath}', '${escapeHtml(item.name)}')" 
                    class="active-tap flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl btn-kasane-gold font-semibold text-xs spring-transition shadow-sm">
              <span>▶</span>
              <span>${isRunning ? 'Viewing Logs' : 'Run Script'}</span>
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
        alert(`Permissions updated: chmod ${octal} ${state.selectedItemForPerms.name}`);
      } else {
        alert('Failed to update permissions via KernelSU.');
      }
    } catch (e) {
      alert('Error updating permissions: ' + e.message);
    }
  } else {
    // Simulator Mode update
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

// ============================================================================
// EXECUTION CONSOLE (Real-time logs)
// ============================================================================
function runScriptFile(filePath, scriptName) {
  state.currentExecution.scriptPath = filePath;
  state.currentExecution.scriptName = scriptName;
  state.currentExecution.status = 'running';
  state.currentExecution.startTime = Date.now();
  state.currentExecution.logs = [];
  state.currentExecution.pid = Math.floor(1000 + Math.random() * 9000);

  document.getElementById('console-title').innerText = scriptName;
  document.getElementById('console-pid').innerText = `PID: ${state.currentExecution.pid}`;
  updateConsoleStatus('RUNNING', 'amber');

  clearTerminal();
  openTerminalSheet();
  hideDynamicIsland();

  if (state.currentExecution.timerInterval) clearInterval(state.currentExecution.timerInterval);
  state.currentExecution.timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - state.currentExecution.startTime) / 1000).toFixed(2);
    document.getElementById('console-timer').innerText = `${elapsed}s`;
    document.getElementById('island-timer').innerText = `${elapsed}s`;
  }, 100);

  if (isAndroidNative) {
    try {
      window.AndroidRoot.runScript(filePath);
    } catch(err) {
      appendLogLine(`[ERROR] Failed to invoke native bridge: ${err.message}`, 'error');
      finishExecution(1);
    }
  } else {
    // Simulator Execution
    simulateExecution(filePath, scriptName);
  }

  renderExplorer();
}

function simulateExecution(path, name) {
  appendLogLine(`🌸 [KASANE] Engine: KernelSU-Next v3.4.0 (SuSFS Active)`, 'sys');
  appendLogLine(`📱 [DEVICE] ${state.deviceSpecs.deviceName}`, 'sys');
  appendLogLine(`⚙️ [KERNEL] ${state.deviceSpecs.kernelVersion}`, 'sys');
  appendLogLine(`📜 [EXEC] chmod +x "${path}" && sh "${path}"`, 'sys');
  appendLogLine(`------------------------------------------------------------`, 'dim');

  const simulatedLogs = [
    { text: `[INFO] Initializing high performance game profile...`, type: 'info', delay: 300 },
    { text: `[INFO] Locking CPU Big cores to maximum frequency step...`, type: 'info', delay: 700 },
    { text: `[INFO] Overriding touch panel sampling to 240Hz...`, type: 'info', delay: 1100 },
    { text: `[WARN] Relaxing thermal governor ceiling to prevent frame drops...`, type: 'warn', delay: 1500 },
    { text: `[SUCCESS] Profile locked. Input latency dropped by 14ms.`, type: 'success', delay: 2000 },
    { text: `🌸 [KASANE] Execution completed with exit code 0.`, type: 'sys', delay: 2300 }
  ];

  simulatedLogs.forEach(entry => {
    setTimeout(() => {
      appendLogLine(entry.text, entry.type);
      if (entry.text.includes('exit code 0')) {
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
    appendLogLine(`🌸 [SUCCESS] Process finished with exit code 0.`, 'success');
    finishExecution(0);
  } else {
    appendLogLine(`❌ [ERROR] Process terminated with exit code ${exitCode}.`, 'error');
    finishExecution(exitCode);
  }
};

function finishExecution(exitCode) {
  state.currentExecution.status = exitCode === 0 ? 'success' : 'error';
  if (state.currentExecution.timerInterval) {
    clearInterval(state.currentExecution.timerInterval);
  }

  if (exitCode === 0) {
    updateConsoleStatus('EXIT 0', 'emerald');
  } else {
    updateConsoleStatus(`FAILED (${exitCode})`, 'rose');
  }

  document.getElementById('island-status').innerText = exitCode === 0 ? 'Done 0' : 'Failed';
  renderExplorer();
}

function updateConsoleStatus(text, color) {
  const el = document.getElementById('console-status-badge');
  const dotColor = color === 'amber' ? 'bg-amber-400 animate-pulse' : color === 'emerald' ? 'bg-emerald-400' : 'bg-rose-400';
  const textColor = color === 'amber' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : color === 'emerald' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  el.className = `flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${textColor}`;
  el.innerHTML = `<span class="size-1.5 rounded-full ${dotColor}"></span> ${text}`;
}

function appendLogLine(text, level = 'stdout') {
  const container = document.getElementById('terminal-content');
  const lineEl = document.createElement('div');
  lineEl.className = 'py-0.5 leading-relaxed break-all';

  let colorClass = 'text-slate-200';
  if (level === 'sys') colorClass = 'text-amber-300 font-medium';
  if (level === 'dim') colorClass = 'text-slate-500';
  if (level === 'info') colorClass = 'text-sky-300';
  if (level === 'warn') colorClass = 'text-amber-300';
  if (level === 'success') colorClass = 'text-emerald-300 font-semibold';
  if (level === 'error') colorClass = 'text-rose-400 font-semibold';

  const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  lineEl.innerHTML = `<span class="text-slate-500 mr-2 select-none text-[10px]">[${time}]</span><span class="${colorClass}">${escapeHtml(text)}</span>`;
  container.appendChild(lineEl);

  state.currentExecution.logs.push(`[${time}] ${text}`);
  if (state.currentExecution.autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function clearTerminal() {
  document.getElementById('terminal-content').innerHTML = '';
  state.currentExecution.logs = [];
}

function copyTerminalLogs() {
  navigator.clipboard.writeText(state.currentExecution.logs.join('\n')).then(() => {
    alert('Logs copied to clipboard!');
  });
}

function killCurrentProcess() {
  if (state.currentExecution.status !== 'running') return;
  if (isAndroidNative) {
    try { window.AndroidRoot.killProcess(); } catch(e) {}
  }
  appendLogLine(`⚠️ [SIGKILL] Process killed by user.`, 'warn');
  finishExecution(137);
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
  document.getElementById('island-name').innerText = state.currentExecution.scriptName || 'Running Script';
  island.classList.add('visible');
}

function hideDynamicIsland() {
  document.getElementById('dynamic-island').classList.remove('visible');
}

function setupEventListeners() {
  document.getElementById('btn-autoscroll')?.addEventListener('click', () => {
    state.currentExecution.autoScroll = !state.currentExecution.autoScroll;
    const btn = document.getElementById('btn-autoscroll');
    if (state.currentExecution.autoScroll) {
      btn.classList.add('text-amber-400', 'border-amber-400/40');
    } else {
      btn.classList.remove('text-amber-400', 'border-amber-400/40');
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
