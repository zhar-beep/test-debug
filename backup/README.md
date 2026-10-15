# backup/ — Arsip Kasane Shell v2 (Executor)

## Kenapa folder ini ada

Sampai v2, Kasane Shell adalah **root script orchestrator**: menjelajah `/data/local/tmp`, mengubah izin file (chmod), dan menjalankan script `.sh` lewat KernelSU dengan konsol terminal realtime.

Mulai v3 app berpindah arah menjadi **device monitor read-only** — hanya membaca dan menampilkan, tidak menulis apa pun ke sistem. Semua kemampuan tulis dan eksekusi dipindah ke sini supaya tidak hilang kalau suatu hari mau dipakai lagi.

## Isi

`kasane-v2-executor/` adalah **salinan utuh dan identik** dari berkas v2 saat dipensiunkan. Tidak ada yang ditulis ulang, jadi kode di sini berjalan apa adanya.

```
kasane-v2-executor/
├── web/
│   ├── index.html    # termasuk tab Explorer, modal Izin, modal konfirmasi run,
│   │                 # terminal bottom sheet, dynamic island, modal detail log
│   ├── styles.css    # termasuk .row-card, .perm-*, .emoji-*, .bottom-sheet,
│   │                 # .terminal, .term-*, .dynamic-island
│   └── app.js        # seluruh logic eksekusi, explorer, chmod, dan emoji picker
├── android/
│   ├── RootBridge.kt   # termasuk listDirectory, changePermissions, runScript, killProcess
│   └── MainActivity.kt
└── tests/
    ├── smoke-test.js                 # suite v2 (9 tes) — menguji struktur v2
    ├── real-functional-test.js       # suite v2 (8 tes)
    └── root-detector-verification.js # suite v2 (7 tes)
```

Test v2 disimpan karena ia mengunci kontrak v2: nama ID, nama fungsi, dan string yang harus ada. Kalau kamu memulihkan salah satu fitur, suite itu jadi daftar periksa gratis.

## Peta fitur → lokasi di arsip

### 1. Eksekusi script
**`web/app.js`:** `runScriptFile`, `simulateExecution`, `finishExecution`, `appendLogLine`, `clearTerminal`, `requestRunScript`, `proceedToConfirmStep2`, `backToConfirmStep1`, `executeConfirmedScript`, `closeRunConfirmModal`, `stopCurrentScript`, `openTerminalSheet`, `closeTerminalSheet`, `showDynamicIsland`, `hideDynamicIsland`, `copyTerminalLogs`, `updateLogsRunningBanner`, `window.onNativeLogReceived`, `window.onNativeExecutionFinished`

**`android/RootBridge.kt`:** `runScript`, `killProcess`, `categorizeLine`, `sendLogLine`, `currentProcess`, `scope`

**Butuh DOM:** `#run-confirm-modal`, `#confirm-step-1`, `#confirm-step-2`, `#confirm-file-name`, `#confirm-file-name-2`, `#confirm-file-path`, `#terminal-sheet`, `#sheet-backdrop`, `#terminal-content`, `#console-title`, `#console-status-badge`, `#console-start-time`, `#console-timer`, `#dynamic-island`, `#island-name`, `#island-status`, `#island-timer`, `#btn-autoscroll`

### 2. File explorer `/data/local/tmp`
**`web/app.js`:** `loadDirectory`, `renderExplorer`, `renderFolderRow`, `renderScriptRow`, `renderBreadcrumbs`, `navigateUp`, `joinPath`, `state.mockFS`

**`android/RootBridge.kt`:** `listDirectory`, `permissionsToOctal`

**Butuh DOM:** `#view-explorer`, `#file-list`, `#path-breadcrumbs`, `#btn-folder-up`, `#items-count`

Catatan: `state.mockFS` adalah filesystem tiruan yang membuat explorer bisa dicoba di browser tanpa root. Ini yang membuat pengembangan UI tidak perlu HP.

### 3. Izin / chmod ala MT Manager
**`web/app.js`:** `openPermissionModal`, `closePermissionModal`, `setCheckboxesFromOctal`, `updateOctalDisplay`, `applyOctalPreset`, `savePermissions`, `octalToSymbolic`

**`android/RootBridge.kt`:** `changePermissions`

**Butuh DOM:** `#permission-modal`, `#perm-filename`, `#perm-filepath`, `#perm-octal-input`, sembilan checkbox `#perm-{u,g,o}-{r,w,x}`

### 4. Emoji picker script
**`web/app.js`:** `getScriptEmoji`, `openEmojiPicker`, `closeEmojiPickerModal`, `selectScriptEmoji`

**Butuh DOM:** `#emoji-picker-modal`, `#picker-script-name`

Menyimpan pilihan di `localStorage` dengan kunci `script_emoji_<nama file>`.

### 5. Riwayat eksekusi
**`web/app.js`:** `renderLogHistory`, `viewDetailedLog`, `closeDetailedLogModal`, `clearLogHistory`, `copyLogById`, `copyCurrentModalLog`

**Butuh DOM:** `#view-logs`, `#logs-history-list`, `#logs-total-count`, `#logs-running-banner`, `#logs-banner-script-name`, `#logs-banner-timer`, `#detailed-log-modal`, `#modal-log-title`, `#modal-log-meta`, `#modal-log-content`, `#modal-copy-btn`

## Cara memulihkan satu fitur

1. Ambil potongan HTML-nya dari `kasane-v2-executor/web/index.html` dan potongan CSS-nya dari `styles.css`.
2. Ambil fungsinya dari `app.js`, lalu sambungkan ulang ke `state` v3.
3. Ambil method native-nya dari `RootBridge.kt`, dan catat bahwa v3 sudah memakai **sesi libsu persisten** (`Shell.getShell()` / `Shell.cmd`). Untuk pemulihan, pakai sesi itu, jangan kembali ke `ProcessBuilder` per panggilan — itu justru sumber kebocoran proses di v2.
4. Jalankan suite v2 di `tests/` sebagai daftar periksa.

## Yang sengaja TIDAK diarsipkan

Beberapa hal dari v2 diperbaiki dan tetap hidup di v3, jadi tidak diduplikasi ke sini:

- `checkRoot`, `getDeviceSpecs`, `runRootDiagnostics` — masih dipakai, dan sekarang benar-benar dipanggil (di v2 badge root justru di-hardcode `true`).
- Sistem toast/dialog (`showToast`, `showDialog`) dan penanganan modal (`showModal`, `hideModal`) — tetap dipakai, cuma tanpa fitur eksekusi.
- Token warna, material, tipografi, dan font self-hosted di `assets/fonts/`.
- `scripts/serve.js` dan `scripts/sync-assets.js`.

## Peringatan

Kode di folder ini **menulis ke sistem**: `chmod`, menjalankan `sh` sebagai UID 0, dan `destroyForcibly()` pada proses root. Jangan aktifkan kembali tanpa membaca ulang, dan ingat `destroyForcibly()` hanya membunuh shell `su`, bukan anak prosesnya.

Folder ini **tidak ikut masuk APK** karena berada di luar `app/src/main/assets/`, dan **tidak ikut dipanggil** oleh `npm test` di v3.
