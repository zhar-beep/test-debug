/**
 * Game Setup — Android Root Script & Permissions Manager (KernelSU)
 * Features MT Manager-style File Explorer & Permission Editor + iOS Execution Console
 */

const state = {
  currentPath: '/data/local/tmp',
  items: [],
  selectedItemForPerms: null,
  currentExecution: {
    scriptPath: null,
    scriptName: null,
    status: 'idle', // 'idle' | 'running' | 'success' | 'error'
    startTime: 0,
    timerInterval: null,
    pid: null,
    logs: [],
    autoScroll: true
  },
  // Rich mock filesystem for PC browser preview
  mockFS: {
    '/data/local/tmp': [
      { name: 'game_boosters', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_driver', isDirectory: true, permissions: 'drwxr-xr-x', octal: '755', size: '4.0K', isScript: false },
      { name: 'touch_boost_120hz.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.2K', isScript: true },
      { name: 'mlbb_vulkan_render.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '2.4K', isScript: true },
      { name: 'thermal_bypass_45fps.sh', isDirectory: false, permissions: '-rw-r--r--', octal: '644', size: '840B', isScript: true },
      { name: 'gpu_governor_lock.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '1.8K', isScript: true }
    ],
    '/data/local/tmp/game_boosters': [
      { name: 'genshin_fps_unlock.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '1.5K', isScript: true },
      { name: 'pubg_smooth_extreme.sh', isDirectory: false, permissions: '-rwxrwxrwx', octal: '777', size: '3.1K', isScript: true }
    ],
    '/data/local/tmp/touch_driver': [
      { name: 'poll_rate_overclock.sh', isDirectory: false, permissions: '-rwxr-xr-x', octal: '755', size: '920B', isScript: true }
    ]
  }
};

const isAndroidNative = typeof window.AndroidRoot !== 'undefined';

document.addEventListener('DOMContentLoaded', () => {
  checkRootEnvironment();
  loadDirectory(state.currentPath);
  setupEventListeners();
});

function checkRootEnvironment() {
  const rootBadge = document.getElementById('root-badge');
  if (isAndroidNative) {
    try {
      const isRooted = window.AndroidRoot.checkRoot();
      if (isRooted) {
        rootBadge.innerHTML = `<span class="size-2 rounded-full bg-emerald-400 animate-pulse"></span> KernelSU Active`;
        rootBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      } else {
        rootBadge.innerHTML = `<span class="size-2 rounded-full bg-rose-400"></span> Root Denied`;
        rootBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-400";
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    rootBadge.innerHTML = `<span class="size-2 rounded-full bg-purple-400 animate-pulse"></span> Preview Simulator`;
    rootBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-purple-500/30 bg-purple-500/10 text-purple-300";
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

// Render Breadcrumb Path Bar
function renderBreadcrumbs() {
  const container = document.getElementById('path-breadcrumbs');
  const parts = state.currentPath.split('/').filter(p => p.length > 0);
  
  let html = `<button onclick="loadDirectory('/data/local/tmp')" class="text-purple-300 hover:text-white font-mono text-xs font-semibold">/tmp</button>`;
  
  // If navigated into a subfolder
  if (state.currentPath !== '/data/local/tmp') {
    const subPath = state.currentPath.replace('/data/local/tmp', '');
    const subParts = subPath.split('/').filter(p => p.length > 0);
    
    let accumulated = '/data/local/tmp';
    subParts.forEach(part => {
      accumulated += '/' + part;
      const target = accumulated;
      html += ` <span class="text-zinc-600">/</span> <button onclick="loadDirectory('${target}')" class="text-zinc-200 hover:text-purple-300 font-mono text-xs">${escapeHtml(part)}</button>`;
    });
  }

  container.innerHTML = html;
  
  // Show / Hide "Go Up" Button
  const btnUp = document.getElementById('btn-folder-up');
  if (state.currentPath === '/data/local/tmp') {
    btnUp.classList.add('opacity-40', 'pointer-events-none');
  } else {
    btnUp.classList.remove('opacity-40', 'pointer-events-none');
  }
}

// Navigate up one directory level
function navigateUp() {
  if (state.currentPath === '/data/local/tmp') return;
  const parts = state.currentPath.split('/').filter(p => p.length > 0);
  parts.pop();
  const parent = '/' + parts.join('/');
  loadDirectory(parent);
}

// Render Files and Folders List
function renderExplorer() {
  const container = document.getElementById('file-list');
  const countBadge = document.getElementById('items-count');
  countBadge.innerText = `${state.items.length} items`;

  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mx-auto mb-2 opacity-50"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        <p class="text-xs">No files or shell scripts found in this directory.</p>
        <p class="text-[11px] text-zinc-600 mt-1">Place .sh scripts inside /data/local/tmp using MT Manager or root explorer.</p>
      </div>
    `;
    return;
  }

  // Sort folders first, then scripts, then other files
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
      // Folder Item
      const targetPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
      return `
        <div onclick="loadDirectory('${targetPath}')" 
             class="glass-panel rounded-2xl p-3.5 flex items-center justify-between hover:border-purple-500/30 cursor-pointer active-tap spring-transition group">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 spring-transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            </div>
            <div>
              <span class="font-mono text-sm font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">${escapeHtml(item.name)}</span>
              <p class="text-[11px] font-mono text-zinc-500">Subfolder • ${item.permissions || 'drwxr-xr-x'}</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-zinc-600 group-hover:text-purple-300 group-hover:translate-x-1 spring-transition"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `;
    }

    // File / Script Item
    const itemPath = state.currentPath.endsWith('/') ? state.currentPath + item.name : state.currentPath + '/' + item.name;
    const isRunning = state.currentExecution.scriptPath === itemPath && state.currentExecution.status === 'running';

    return `
      <div class="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/30 spring-transition group">
        <div class="flex items-start gap-3">
          <div class="size-10 rounded-xl ${isScript ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-semibold text-zinc-100 truncate">${escapeHtml(item.name)}</span>
              ${isFull777 
                ? '<span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">777</span>' 
                : `<span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${isExecutable ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400'}">${item.octal || '644'}</span>`}
            </div>
            <div class="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-0.5">
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
                  title="MT Manager style Permission Editor"
                  class="active-tap flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono spring-transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Perms</span>
          </button>

          <!-- Run Script Button (if .sh) -->
          ${isScript ? `
            <button onclick="runScriptFile('${itemPath}', '${escapeHtml(item.name)}')" 
                    class="active-tap flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-purple-600/20 hover:brightness-110 spring-transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>${isRunning ? 'View Logs' : 'Run Script'}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// MT MANAGER STYLE PERMISSIONS MODAL (chmod 777 / 755 / octal calculation)
// ============================================================================
function openPermissionModal(name, path, octal, perms) {
  state.selectedItemForPerms = { name, path, octal, perms };
  
  document.getElementById('perm-filename').innerText = name;
  document.getElementById('perm-filepath').innerText = path;
  
  // Parse octal or perms to set checkboxes
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
  appendLogLine(`[SYS] Game Setup (KernelSU-Next v3.4.0 Engine)`, 'sys');
  appendLogLine(`[SYS] Target: ${path}`, 'sys');
  appendLogLine(`[SYS] Executing: chmod +x "${path}" && sh "${path}"`, 'sys');
  appendLogLine(`------------------------------------------------------------`, 'dim');

  const simulatedLogs = [
    { text: `[INFO] Initializing high performance game profile...`, type: 'info', delay: 300 },
    { text: `[INFO] Locking CPU Big cores to maximum frequency step...`, type: 'info', delay: 700 },
    { text: `[INFO] Adjusting touch sampling buffer to 240Hz...`, type: 'info', delay: 1100 },
    { text: `[WARN] Overriding thermal limits for display engine...`, type: 'warn', delay: 1500 },
    { text: `[SUCCESS] Profile locked. Latency reduced by 14ms.`, type: 'success', delay: 2000 },
    { text: `[SYS] Process completed with exit code 0.`, type: 'sys', delay: 2300 }
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
    appendLogLine(`[SUCCESS] Process completed with exit code 0.`, 'success');
    finishExecution(0);
  } else {
    appendLogLine(`[ERROR] Process terminated with exit code ${exitCode}.`, 'error');
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

  document.getElementById('island-status').innerText = exitCode === 0 ? 'Completed' : 'Failed';
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

  let colorClass = 'text-zinc-200';
  if (level === 'sys') colorClass = 'text-purple-400 font-medium';
  if (level === 'dim') colorClass = 'text-zinc-600';
  if (level === 'info') colorClass = 'text-cyan-300';
  if (level === 'warn') colorClass = 'text-amber-300';
  if (level === 'success') colorClass = 'text-emerald-300 font-semibold';
  if (level === 'error') colorClass = 'text-rose-400 font-semibold';

  const time = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  lineEl.innerHTML = `<span class="text-zinc-600 mr-2 select-none text-[10px]">[${time}]</span><span class="${colorClass}">${escapeHtml(text)}</span>`;
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
  appendLogLine(`[WARN] SIGKILL signal sent by user. Process terminated.`, 'warn');
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
      btn.classList.add('text-purple-300', 'border-purple-500/40');
    } else {
      btn.classList.remove('text-purple-300', 'border-purple-500/40');
    }
  });

  // Checkbox listeners in permission modal
  const checkboxes = document.querySelectorAll('.perm-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateOctalDisplay);
  });
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
