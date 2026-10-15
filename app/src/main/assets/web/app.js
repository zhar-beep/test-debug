/**
 * Kasane Shell v3 — read-only device monitor.
 *
 * Front-end contract
 * ------------------
 * - Reads telemetry through window.AndroidRoot when running inside the Android
 *   WebView, and falls back to a synthetic generator in a plain browser so the
 *   interface can be developed and previewed without a phone.
 * - Polls only while the Monitor tab is on screen and the app is foregrounded.
 *   A realtime dashboard that keeps polling in the background is a battery bug.
 * - Every value degrades to an explicit "n/a" with a reason. Nothing is faked:
 *   if a sysfs node is missing on this device, the UI says so and the Logs App
 *   records exactly which node was probed.
 * - No native alert()/confirm(): feedback goes through showToast()/showDialog().
 */

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const POLL_MS = 1000;
const MONITOR_LOG_EVERY_TICKS = 15;
const LOG_LIMIT = 200;
const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

const ICONS = {
  refresh: '<path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
};

function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ==========================================================================
   STATE
   ========================================================================== */

const state = {
  theme: 'dark',
  currentTab: 'monitor',
  specs: null,
  telemetry: null,
  pollTimer: null,
  tick: 0,
  paused: false,
  logFilter: 'all',
  logs: [],
  lastMonitorLogAt: 0,
  lastCoreCount: 0
};

const isAndroidNative = typeof window.AndroidRoot !== 'undefined';

/* ==========================================================================
   BOOT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSakuraPetals();
  setupEventListeners();
  addLog('audit', 'Aplikasi dijalankan', isAndroidNative
    ? 'Jembatan native ditemukan. Telemetri dibaca dari perangkat.'
    : 'Pratinjau browser: jembatan native tidak ada, memakai data sintetis.');

  if (!isAndroidNative) {
    addLog('audit', 'Mode pratinjau', 'Nilai di bawah ini dihasilkan secara lokal dan bukan pembacaan perangkat.');
  }

  loadDeviceSpecs();
  startPolling();
});

/* ==========================================================================
   FEEDBACK
   ========================================================================== */

function showToast(message, tone = 'info', duration = 3000) {
  const host = document.getElementById('toast-wrap');
  if (!host) return;

  const el = document.createElement('div');
  el.className = `toast is-${tone}`;
  el.innerHTML = '<span class="toast-dot" aria-hidden="true"></span><span class="toast-msg"></span>';
  el.querySelector('.toast-msg').textContent = message;
  host.appendChild(el);

  window.setTimeout(() => {
    el.classList.add('is-leaving');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

function showDialog({ title, message, confirmLabel = 'Lanjutkan', cancelLabel = 'Batal', danger = false }) {
  return new Promise(resolve => {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.dataset.dynamic = 'true';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3 class="modal-title ${danger ? 'is-danger' : ''}">
            ${danger ? icon('alert') : ''}
            <span></span>
          </h3>
        </div>
        <p class="modal-body-text"></p>
        <div class="modal-foot">
          <button type="button" class="btn btn-plain" data-role="cancel"></button>
          <button type="button" class="btn ${danger ? 'btn-kasane-danger' : 'btn-kasane-gold'}" data-role="confirm"></button>
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
      if (event.key === 'Escape') {
        event.stopPropagation();
        finish(false);
      }
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
    /* Storage can be unavailable in a restricted WebView. The session still works. */
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
  if (toggle) toggle.setAttribute('aria-label', isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
}

function initSakuraPetals() {
  const container = document.getElementById('sakura-container');
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

function toggleDesktopView() {
  const isMockup = document.body.classList.contains('mode-phone-mockup');
  const btn = document.getElementById('btn-desktop-toggle');

  if (isMockup) {
    document.body.classList.remove('mode-phone-mockup');
    document.body.classList.add('mode-fullscreen-desktop');
    if (btn) btn.querySelector('span').textContent = 'Mode HP';
  } else {
    document.body.classList.remove('mode-fullscreen-desktop');
    document.body.classList.add('mode-phone-mockup');
    if (btn) btn.querySelector('span').textContent = 'Mode Layar Lebar';
  }
}

/* ==========================================================================
   TABS
   ========================================================================== */

function switchTab(tabId) {
  state.currentTab = tabId;

  document.getElementById('view-monitor').classList.toggle('hidden', tabId !== 'monitor');
  document.getElementById('view-logs').classList.toggle('hidden', tabId !== 'logs');

  ['monitor', 'logs'].forEach(id => {
    const btn = document.getElementById(`tab-btn-${id}`);
    if (!btn) return;
    const active = id === tabId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  const segmented = document.querySelector('.segmented');
  if (segmented) segmented.style.setProperty('--seg', tabId === 'logs' ? '100%' : '0%');

  if (tabId === 'logs') renderLogs();

  // Polling belongs to the Monitor tab only.
  syncPolling();
}

/* ==========================================================================
   POLLING — starts and stops with visibility, never runs blind
   ========================================================================== */

function shouldPoll() {
  return state.currentTab === 'monitor'
    && !state.paused
    && document.visibilityState === 'visible';
}

function syncPolling() {
  if (shouldPoll()) startPolling();
  else stopPolling();
}

function startPolling() {
  if (state.pollTimer !== null) return;
  if (!shouldPoll()) return;
  state.pollTimer = window.setInterval(pollOnce, POLL_MS);
  pollOnce();
}

function stopPolling() {
  if (state.pollTimer === null) return;
  window.clearInterval(state.pollTimer);
  state.pollTimer = null;
}

function pollOnce() {
  state.tick += 1;
  const telemetry = readTelemetry();
  if (!telemetry) return;

  state.telemetry = telemetry;
  renderTelemetry(telemetry);
  maybeLogMonitorSample(telemetry);
}

function readTelemetry() {
  if (!isAndroidNative) return mockTelemetry(state.tick);
  try {
    return JSON.parse(window.AndroidRoot.getTelemetry() || 'null');
  } catch (e) {
    stopPolling();
    addLog('diagnostic', 'Pembacaan telemetri gagal', describeError(e));
    showToast('Pembacaan telemetri gagal, polling dihentikan.', 'error');
    return null;
  }
}

/* ==========================================================================
   DEVICE SPECS
   ========================================================================== */

function loadDeviceSpecs() {
  const specs = isAndroidNative ? readNativeSpecs() : mockSpecs();
  state.specs = specs;

  setText('header-device', `${specs.manufacturer} ${specs.model}`);
  setText('spec-device', `${specs.deviceName} · ${specs.abi}`);
  setText('spec-display', `${specs.displayLabel} · ${specs.densityDpi} dpi`);
  setText('spec-kernel', specs.kernelVersion);
  setText('spec-os', `${specs.osLabel} · ${specs.rom}`);
  setText('spec-slot', specs.slot);

  addLog('audit', 'Spesifikasi perangkat dimuat',
    `${specs.deviceName}\nKernel ${specs.kernelVersion}\nOS ${specs.osLabel}\nSlot ${specs.slot}`);
}

function readNativeSpecs() {
  try {
    const parsed = JSON.parse(window.AndroidRoot.getDeviceSpecs() || 'null');
    if (parsed && !parsed.error) return parsed;
    addLog('diagnostic', 'getDeviceSpecs mengembalikan error', (parsed && parsed.error) || 'tidak diketahui');
  } catch (e) {
    addLog('diagnostic', 'getDeviceSpecs gagal di-parse', describeError(e));
  }
  return mockSpecs();
}

function mockSpecs() {
  return {
    manufacturer: 'Pratinjau',
    model: 'Browser',
    device: 'desktop',
    deviceName: 'Pratinjau Browser (desktop)',
    abi: 'x86_64',
    kernelVersion: 'tidak tersedia di browser',
    osLabel: 'Pratinjau · bukan perangkat Android',
    rom: 'n/a',
    slot: 'n/a',
    displayLabel: `${window.screen.width} x ${window.screen.height} @ 60Hz`,
    densityDpi: window.devicePixelRatio * 160
  };
}

/* ==========================================================================
   TELEMETRY RENDERING
   ========================================================================== */

function renderTelemetry(telemetry) {
  renderSpecLiveRows(telemetry);
  renderCpu(telemetry);
  renderGpu(telemetry);
}

function renderSpecLiveRows(telemetry) {
  const clusters = deriveClusters(telemetry);
  const cpuText = clusters.length
    ? clusters.map(c => `${c.name} ${freqText(c.curKhz)}`).join(' · ')
    : 'n/a';

  const gpuText = telemetry.gpu && telemetry.gpu.curKhz
    ? `GPU ${freqText(telemetry.gpu.curKhz)}`
    : 'GPU n/a';

  setText('spec-cpugpu', `${cpuText} · ${gpuText}`);

  const temp = telemetry.batteryTempC;
  if (typeof temp === 'number') {
    setText('spec-battery', `${temp.toFixed(1)} °C`);
    setClass('spec-battery', 'is-warn', temp >= 42);
  } else {
    setText('spec-battery', 'n/a · node suhu tidak ditemukan');
    setClass('spec-battery', 'is-muted', true);
  }

  const root = telemetry.rootGranted;
  setText('spec-root', root
    ? 'terverifikasi UID 0 · telemetri GPU aktif'
    : 'tidak diberikan · metrik GPU tidak tersedia');
  setClass('spec-root', 'is-warn', !root);
}

function renderCpu(telemetry) {
  const cores = telemetry.cores || [];
  const clusters = deriveClusters(telemetry);
  const load = typeof telemetry.cpuLoad === 'number' ? telemetry.cpuLoad : null;

  buildDonut('cpu-donut', 'cpu', 'beban');
  updateDonut('cpu-donut', load, load === null ? '—' : String(load), '%');

  setText('cpu-summary', `${cores.length} core · ${clusters.length} cluster`);

  renderClusterList(clusters);
  renderCoreBars(cores, clusters);
}

function renderClusterList(clusters) {
  const host = document.getElementById('cluster-chips');
  if (!host) return;

  if (!clusters.length) {
    host.innerHTML = '<p class="log-empty">Data cluster belum tersedia.</p>';
    return;
  }

  host.innerHTML = clusters.map(cluster => `
    <div class="cluster-item">
      <span class="cluster-name">${escapeHtml(cluster.name)} · ${cluster.coreCount}c</span>
      <span class="cluster-freq">${freqText(cluster.curKhz)}</span>
      <span class="cluster-load">${cluster.load === null || cluster.load === undefined ? '—' : cluster.load + '%'}</span>
    </div>`).join('');
}

function renderCoreBars(cores, clusters) {
  const host = document.getElementById('core-bars');
  if (!host) return;

  if (!cores.length) {
    host.innerHTML = '<p class="log-empty">Tidak ada core terbaca. Node cpufreq tidak dapat diakses.</p>';
    return;
  }

  const clusterOf = index => {
    const found = clusters.find(c => (c.cores || []).includes(index));
    return found ? found.name : 'cpu';
  };

  // Rebuild only when the core count changes; otherwise just move the numbers.
  if (state.lastCoreCount !== cores.length) {
    host.innerHTML = cores.map(core => `
      <div class="core-bar" data-core="${core.index}">
        <div class="core-bar-head">
          <span class="core-bar-name">core ${core.index}</span>
          <span class="core-bar-freq">—</span>
        </div>
        <div class="core-bar-track"><div class="core-bar-fill" style="width:0%"></div></div>
      </div>`).join('');
    state.lastCoreCount = cores.length;
  }

  cores.forEach(core => {
    const el = host.querySelector(`[data-core="${core.index}"]`);
    if (!el) return;

    const name = el.querySelector('.core-bar-name');
    const freq = el.querySelector('.core-bar-freq');
    const fill = el.querySelector('.core-bar-fill');
    const online = core.curKhz !== null && core.curKhz !== undefined;

    name.textContent = `core ${core.index} · ${clusterOf(core.index)}`;
    freq.textContent = online ? freqText(core.curKhz) : 'offline';

    const ratio = online && core.maxKhz ? core.curKhz / core.maxKhz : 0;
    fill.style.width = `${Math.max(2, Math.round(ratio * 100))}%`;

    el.classList.toggle('is-big', clusterOf(core.index) === 'big');
    el.classList.toggle('is-offline', !online);
  });
}

function renderGpu(telemetry) {
  const gpu = telemetry.gpu || {};
  const supported = gpu.supported === true;
  const load = typeof gpu.load === 'number' ? gpu.load : null;

  buildDonut('gpu-donut', supported ? 'gpu' : 'idle', 'beban');
  updateDonut('gpu-donut', load, supported ? freqShort(gpu.curKhz) : '—', supported ? 'MHz' : '');

  setText('gpu-summary', supported
    ? `${freqText(gpu.curKhz)} / ${freqText(gpu.maxKhz)}`
    : (gpu.reason || 'tidak tersedia'));

  const host = document.getElementById('gpu-meta');
  if (!host) return;

  host.innerHTML = [
    metaRow('Frekuensi', supported ? freqText(gpu.curKhz) : 'n/a'),
    metaRow('Maksimum', gpu.maxKhz ? freqText(gpu.maxKhz) : 'n/a'),
    metaRow('Beban', load === null ? 'n/a' : `${load}%`),
    metaRow('Generasi', gpu.usesV2 ? 'gpufreqv2' : gpu.usesV1 ? 'gpufreq' : 'tidak diketahui'),
    metaRow('Node', gpu.node || 'tidak ada', true)
  ].join('');
}

function metaRow(key, value, muted = false) {
  return `<div class="meta-row"><span class="meta-key">${escapeHtml(key)}</span>` +
    `<span class="meta-value ${muted ? 'is-muted' : ''}">${escapeHtml(String(value))}</span></div>`;
}

/* ==========================================================================
   DONUT
   ========================================================================== */

function buildDonut(hostId, tone, label) {
  const host = document.getElementById(hostId);
  if (!host || host.dataset.built === tone) return;

  host.dataset.built = tone;
  host.className = `donut is-${tone}`;
  host.innerHTML = `
    <svg class="donut-svg" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="donut-track" cx="60" cy="60" r="${DONUT_RADIUS}"></circle>
      <circle class="donut-arc" cx="60" cy="60" r="${DONUT_RADIUS}"
              stroke-dasharray="${DONUT_CIRCUMFERENCE.toFixed(2)} ${DONUT_CIRCUMFERENCE.toFixed(2)}"
              stroke-dashoffset="${DONUT_CIRCUMFERENCE.toFixed(2)}"></circle>
    </svg>
    <div class="donut-center">
      <span class="donut-value">—</span><span class="donut-unit"></span>
      <span class="donut-label">${escapeHtml(label)}</span>
    </div>`;
}

function updateDonut(hostId, percent, value, unit) {
  const host = document.getElementById(hostId);
  if (!host) return;

  const arc = host.querySelector('.donut-arc');
  const valueEl = host.querySelector('.donut-value');
  const unitEl = host.querySelector('.donut-unit');

  const safe = typeof percent === 'number' ? Math.min(100, Math.max(0, percent)) : null;
  if (arc) {
    const offset = safe === null ? DONUT_CIRCUMFERENCE : DONUT_CIRCUMFERENCE * (1 - safe / 100);
    arc.setAttribute('stroke-dashoffset', offset.toFixed(2));
  }
  if (valueEl) valueEl.textContent = value;
  if (unitEl) unitEl.textContent = unit;
}

/* ==========================================================================
   LOGS APP
   ========================================================================== */

function timestamp() {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

function addLog(category, title, body = '', pre = null) {
  state.logs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category,
    time: timestamp(),
    title,
    body,
    pre
  });

  if (state.logs.length > LOG_LIMIT) state.logs.length = LOG_LIMIT;
  if (state.currentTab === 'logs') renderLogs();
}

function maybeLogMonitorSample(telemetry) {
  const now = Date.now();
  if (now - state.lastMonitorLogAt < MONITOR_LOG_EVERY_TICKS * POLL_MS) return;
  state.lastMonitorLogAt = now;

  const clusters = deriveClusters(telemetry);
  const summary = clusters.map(c => `${c.name} ${freqText(c.curKhz)} (${c.load ?? '—'}%)`).join(', ');
  const gpu = telemetry.gpu || {};
  const temp = typeof telemetry.batteryTempC === 'number' ? `${telemetry.batteryTempC.toFixed(1)} °C` : 'n/a';

  addLog('monitor', 'Sampel telemetri',
    `CPU ${summary || 'n/a'}\nBeban total ${telemetry.cpuLoad ?? '—'}%\n` +
    `GPU ${gpu.curKhz ? freqText(gpu.curKhz) : 'n/a'}\nSuhu baterai ${temp}`);
}

function renderLogs() {
  const host = document.getElementById('logs-list');
  if (!host) return;

  setText('logs-count', `${state.logs.length} entri`);

  const filtered = state.logFilter === 'all'
    ? state.logs
    : state.logs.filter(entry => entry.category === state.logFilter);

  if (filtered.length === 0) {
    host.innerHTML = '<p class="log-empty">Belum ada entri pada kategori ini.</p>';
    return;
  }

  host.innerHTML = filtered.map(entry => `
    <article class="log-entry is-${entry.category}">
      <header class="log-entry-head">
        <span class="log-tag">${escapeHtml(categoryLabel(entry.category))}</span>
        <span class="log-time">${escapeHtml(entry.time)}</span>
      </header>
      <p class="log-body">${escapeHtml(entry.title)}</p>
      ${entry.body ? `<p class="log-body">${escapeHtml(entry.body)}</p>` : ''}
      ${entry.pre ? `<pre class="log-pre">${escapeHtml(entry.pre)}</pre>` : ''}
    </article>`).join('');
}

function categoryLabel(category) {
  return { audit: 'Audit', diagnostic: 'Diagnostik', monitor: 'Monitoring' }[category] || category;
}

function setLogFilter(category) {
  state.logFilter = category;
  document.querySelectorAll('.log-filter-btn').forEach(btn => {
    const active = btn.dataset.category === category;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  renderLogs();
}

function buildLogText() {
  const specs = state.specs || {};
  const header = [
    'KASANE SHELL — LOGS APP',
    `Perangkat : ${specs.deviceName || 'unknown'}`,
    `Kernel    : ${specs.kernelVersion || 'unknown'}`,
    `OS        : ${specs.osLabel || 'unknown'}`,
    `Slot      : ${specs.slot || 'unknown'}`,
    `Dibuat    : ${new Date().toLocaleString('id-ID')}`,
    `Entri     : ${state.logs.length}`,
    '-'.repeat(58)
  ].join('\n');

  const body = state.logs.map(entry => {
    const parts = [`[${entry.time}] ${categoryLabel(entry.category).toUpperCase()} — ${entry.title}`];
    if (entry.body) parts.push(entry.body);
    if (entry.pre) parts.push(entry.pre);
    return parts.join('\n');
  }).join('\n\n');

  return `${header}\n\n${body}\n`;
}

async function copyAllLogs() {
  if (state.logs.length === 0) {
    showToast('Belum ada log untuk disalin.', 'warn');
    return;
  }
  await copyText(buildLogText(), 'Seluruh log disalin ke clipboard.');
}

async function clearLogs() {
  if (state.logs.length === 0) {
    showToast('Log masih kosong.', 'info');
    return;
  }

  const confirmed = await showDialog({
    title: 'Bersihkan log',
    message: `${state.logs.length} entri akan dihapus dari sesi ini. Tindakan ini tidak bisa dibatalkan.`,
    confirmLabel: 'Bersihkan',
    cancelLabel: 'Batal',
    danger: true
  });
  if (!confirmed) return;

  state.logs = [];
  state.lastMonitorLogAt = Date.now();
  renderLogs();
  showToast('Log dibersihkan.', 'success');
}

/* ==========================================================================
   DIAGNOSTICS
   ========================================================================== */

async function runFullRefresh() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.disabled = true;

  loadDeviceSpecs();
  pollOnce();

  if (isAndroidNative) {
    try {
      const report = JSON.parse(window.AndroidRoot.runRootDiagnostics() || '{}');
      addLog('diagnostic', 'Diagnostik root', formatDiagnostics(report));
      showToast(report.status === 'OK' ? 'Diagnostik selesai.' : `Diagnostik: ${report.status || 'terbatas'}`,
        report.status === 'OK' ? 'success' : 'warn');
    } catch (e) {
      addLog('diagnostic', 'Diagnostik root gagal', describeError(e));
      showToast('Diagnostik gagal dijalankan.', 'error');
    }
  } else {
    addLog('diagnostic', 'Diagnostik dilewati', 'Pratinjau browser tidak punya jembatan native.');
    showToast('Pratinjau browser: diagnostik native tidak tersedia.', 'info');
  }

  if (btn) btn.disabled = false;
}

async function refreshDiagnostics() {
  let probe = null;
  let report = null;

  if (isAndroidNative) {
    try {
      probe = JSON.parse(window.AndroidRoot.probeNodes() || 'null');
    } catch (e) {
      addLog('diagnostic', 'probeNodes gagal di-parse', describeError(e));
    }
    try {
      report = JSON.parse(window.AndroidRoot.runRootDiagnostics() || '{}');
    } catch (e) {
      addLog('diagnostic', 'runRootDiagnostics gagal di-parse', describeError(e));
    }
  } else {
    probe = mockProbeReport();
    report = mockDiagnostics();
    addLog('diagnostic', 'Catatan pratinjau',
      'Laporan di bawah ini dihasilkan di browser, bukan dari perangkat.');
  }

  if (report) addLog('diagnostic', 'Diagnostik root', formatDiagnostics(report));
  if (probe) addLog('diagnostic', 'Peta node sistem', formatProbe(probe), probeText(probe));

  renderLogs();
  showToast(probe ? 'Diagnostik diperbarui.' : 'Diagnostik tidak tersedia.', probe ? 'success' : 'warn');
}

function formatDiagnostics(report) {
  const lines = [
    `Status          : ${report.status || 'unknown'}`,
    `Root granted    : ${report.rootGranted ? 'ya' : 'tidak'}`,
    `UID 0           : ${report.rootUid ? 'terverifikasi' : 'tidak'}`,
    `libsu           : ${report.libsuGranted ? 'granted' : 'denied'}`,
    `RootBeer        : ${report.deviceRootedHeuristic ? 'mendeteksi root' : 'bersih'}`,
    `ksud            : ${report.ksuVersion || 'n/a'}`,
    `SuSFS           : ${report.susfs || 'n/a'}`,
    `SELinux         : ${report.selinux || 'n/a'}`,
    `Slot            : ${report.slot || 'n/a'}`,
    `Kernel          : ${report.kernelVersion || 'n/a'}`,
    `Suhu baterai    : ${typeof report.batteryTempC === 'number' ? report.batteryTempC.toFixed(1) + ' °C' : 'n/a'}`,
    `Node suhu       : ${report.batteryTempNode || 'n/a'}`,
    `GPU didukung    : ${report.gpuSupported ? 'ya' : 'tidak'}`,
    `Generasi GPU    : ${report.gpuGen || 'n/a'}`,
    `Node GPU        : ${report.gpuNode || 'n/a'}`
  ];
  return lines.join('\n');
}

function formatProbe(probe) {
  const nodes = probe.nodes || [];
  const present = nodes.filter(n => n.exists).length;
  return `${present} dari ${nodes.length} node tersedia` +
    (probe.rootGranted ? ' (root tersedia, semua node diuji)' : ' (tanpa root, sebagian tidak dapat diuji)');
}

/** Plain-text node table. This is the part that tells us what this device really exposes. */
function probeText(probe) {
  const nodes = probe.nodes || [];
  if (nodes.length === 0) return 'Tidak ada node yang dilaporkan.';

  const width = Math.max(...nodes.map(n => n.path.length));
  return nodes.map(n => {
    const mark = n.exists ? 'ADA   ' : 'TIDAK ';
    const flag = n.needsRoot ? 'root' : '    ';
    const sample = n.sample ? `  ${String(n.sample).slice(0, 90)}` : '';
    return `${mark}${flag} ${n.path.padEnd(width)}${sample}`;
  }).join('\n');
}

/* ==========================================================================
   NATIVE HOOKS
   ========================================================================== */

window.onNativePause = function () {
  state.paused = true;
  syncPolling();
};

window.onNativeResume = function () {
  state.paused = false;
  syncPolling();
};

/** Returns true when the page consumed the back press. */
window.onNativeBackPressed = function () {
  const dialogs = document.querySelectorAll('.modal');
  if (dialogs.length > 0) {
    const last = dialogs[dialogs.length - 1];
    const cancel = last.querySelector('[data-role="cancel"]');
    if (cancel) cancel.click();
    return true;
  }

  if (state.currentTab === 'logs') {
    switchTab('monitor');
    return true;
  }
  return false;
};

/* ==========================================================================
   EVENT WIRING
   ========================================================================== */

function setupEventListeners() {
  document.querySelectorAll('.log-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setLogFilter(btn.dataset.category));
  });

  document.addEventListener('visibilitychange', syncPolling);
  window.addEventListener('pagehide', stopPolling);
  window.addEventListener('pageshow', syncPolling);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelectorAll('.modal').length === 0) return;

    if (event.key === 'Tab') {
      const dialogs = document.querySelectorAll('.modal');
      const top = dialogs[dialogs.length - 1];
      if (!top) return;

      const focusables = Array.from(top.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null);
      if (focusables.length === 0) return;

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
  });
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setClass(id, className, enabled) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(className, enabled);
}

/** kHz to a readable figure. Below 1 GHz stays in MHz, above it reads in GHz. */
function freqText(khz) {
  if (typeof khz !== 'number' || !isFinite(khz) || khz <= 0) return 'n/a';
  if (khz >= 1_000_000) return `${(khz / 1_000_000).toFixed(2)} GHz`;
  return `${Math.round(khz / 1000)} MHz`;
}

function freqShort(khz) {
  if (typeof khz !== 'number' || !isFinite(khz) || khz <= 0) return '—';
  return String(Math.round(khz / 1000));
}

/** Uses the native cluster split when present, otherwise derives it the same way. */
function deriveClusters(telemetry) {
  if (telemetry.clusters && telemetry.clusters.length) return telemetry.clusters;

  const buckets = new Map();
  (telemetry.cores || []).forEach(core => {
    const key = core.maxKhz || 0;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(core);
  });

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const names = keys.length === 1 ? ['cpu']
    : keys.length === 2 ? ['little', 'big']
      : keys.length === 3 ? ['little', 'mid', 'big']
        : keys.map((_, i) => `cluster${i}`);

  return keys.map((key, position) => {
    const cores = buckets.get(key);
    const loads = cores.map(c => c.load).filter(v => typeof v === 'number');
    const currents = cores.map(c => c.curKhz).filter(v => typeof v === 'number');
    return {
      name: names[position],
      cores: cores.map(c => c.index),
      coreCount: cores.length,
      maxKhz: key,
      curKhz: currents.length ? Math.min(...currents) : null,
      load: loads.length ? Math.round(loads.reduce((a, b) => a + b, 0) / loads.length) : null
    };
  });
}

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
      document.body.removeChild(area);
      showToast('Clipboard tidak tersedia di perangkat ini.', 'error');
      return;
    }
    document.body.removeChild(area);
  }
  showToast(successMessage, 'success');
}

function describeError(error) {
  if (!error) return 'error tidak diketahui';
  return `${error.name || 'Error'}: ${error.message || String(error)}`;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/* ==========================================================================
   BROWSER PREVIEW — synthetic values so the UI can be built without a phone
   ========================================================================== */

function mockTelemetry(tick) {
  const cores = [];
  const bigCount = 2;
  const total = 8;

  for (let i = 0; i < total; i++) {
    const isBig = i >= total - bigCount;
    const max = isBig ? 2_200_000 : 2_000_000;
    const phase = (tick / 5) + i * 0.7;
    const ratio = 0.25 + 0.7 * Math.abs(Math.sin(phase));
    cores.push({
      index: i,
      curKhz: Math.round((max * ratio) / 1000) * 1000,
      maxKhz: max,
      minKhz: 400_000,
      governor: 'schedutil',
      online: true,
      load: Math.round(15 + 70 * Math.abs(Math.sin(phase / 1.3)))
    });
  }

  const loads = cores.map(c => c.load);
  const gpuLoad = Math.round(20 + 60 * Math.abs(Math.sin(tick / 7)));

  return {
    ts: Date.now(),
    rootGranted: false,
    cores,
    clusters: deriveClusters({ cores }),
    cpuLoad: Math.round(loads.reduce((a, b) => a + b, 0) / loads.length),
    batteryTempC: 33 + Math.abs(Math.sin(tick / 20)) * 6,
    batteryTempNode: '/sys/class/power_supply/battery/temp (sintetis)',
    gpu: {
      supported: true,
      curKhz: 700_000 + Math.round(Math.abs(Math.sin(tick / 6)) * 200) * 1000,
      maxKhz: 950_000,
      load: gpuLoad,
      node: '/proc/gpufreq/gpufreq_opp_freq (sintetis)',
      loadNode: '/proc/mali/utilization (sintetis)',
      usesV1: true,
      usesV2: false
    }
  };
}

function mockProbeReport() {
  const paths = [
    ['/proc/version', true, false],
    ['/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', true, false],
    ['/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', true, false],
    ['/proc/stat', true, false],
    ['/sys/class/power_supply/battery/temp', true, false],
    ['/proc/gpufreq/gpufreq_opp_freq', false, true],
    ['/proc/gpufreqv2/stack_signed_opp_table', false, true],
    ['/proc/mali/utilization', false, true],
    ['/data/adb/ksu', false, true]
  ];

  return {
    checkedAt: Date.now(),
    rootGranted: false,
    nodes: paths.map(([path, exists, needsRoot]) => ({
      path,
      exists,
      needsRoot,
      sample: exists ? 'Linux version 5.10.269 …' : null
    })),
    unprobed: paths.filter(p => p[2]).map(p => p[0])
  };
}

function mockDiagnostics() {
  return {
    status: 'PRATINJAU',
    rootGranted: false,
    rootUid: false,
    libsuGranted: false,
    deviceRootedHeuristic: false,
    ksuVersion: 'tidak tersedia di browser',
    susfs: 'tidak tersedia di browser',
    selinux: 'tidak tersedia di browser',
    slot: 'n/a',
    kernelVersion: 'tidak tersedia di browser',
    batteryTempC: null,
    batteryTempNode: null,
    gpuSupported: false,
    gpuGen: 'tidak diketahui',
    gpuNode: null
  };
}
