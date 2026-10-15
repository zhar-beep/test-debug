> **USANG SEBAGIAN.** Dokumen ini ditulis untuk Kasane Shell v2 (app eksekutor script).
> Sejak v3 aplikasi ini adalah **pemantau perangkat read-only**: tidak menjalankan script,
> tidak mengubah izin file, dan tidak menulis ke kernel. Arah terkini ada di
> [`PRD.md`](./PRD.md) v3.0 dan [`README.md`](./README.md). Kode v2 — termasuk eksekusi
> script, explorer, chmod, dan emoji picker — tersimpan utuh di
> [`backup/`](./backup/README.md) beserta suite test-nya.

# PANDUAN MIGRASI KE IDE / AI CODE DENGAN DEEPSEEK v4.1 FLASH

Dokumen ini adalah instruksi instan untuk kamu gunakan saat membuka project ini di IDE baru (seperti VS Code, Cursor, Cline, Claude Code, atau AI Terminal CLI) yang ditenagai oleh **DeepSeek v4.1 Flash**.

---

## 📂 1. Apakah Semua File Harus Di-copy?

**YA, COPY SELURUH FOLDER `splendid-pascal` SEBAGAI SATU KESATUAN!**

Project ini adalah Android + Web Hybrid project yang sudah terstruktur utuh:
- Kamu tidak perlu copy-paste file satu per satu.
- Cukup copy folder `splendid-pascal` ke folder kerja baru kamu (atau clone git repo-nya).
- Atau **langsung buka folder ini di IDE kamu**:
  ```bash
  code "C:\Users\Administrator\Documents\antigravity\splendid-pascal"
  ```

---

## 🤖 2. Prompt Instan untuk DeepSeek v4.1 Flash di IDE Baru

Saat kamu membuka project di IDE baru dan memulai chat dengan DeepSeek v4.1 Flash, salin dan kirimkan prompt ini:

```text
Halo DeepSeek v4.1 Flash!
Saya sedang mengembangkan proyek "Kasane Shell // Game Setup" yang ada di repositori ini.

Silakan baca file @debug.txt dan @PRD.md untuk memahami seluruh arsitektur proyek, spesifikasi hardware Infinix Note 30 (Helio G99 / AxionOS 2.7 / Android 16 API 36 / KernelSU-Next v3.4.0 + SuSFS v2.3.0).

Tugas Anda:
1. Analisis arsitektur native Kotlin di app/src/main/java/com/kasane/shell/RootBridge.kt dan pastikan eksekusi script root di /data/local/tmp bebas dari zombie process, memory leak, dan SELinux denial pada Android 16.
2. Analisis antarmuka Web di app/src/main/assets/web/ (index.html, styles.css, app.js). Pastikan UI card tetap lurus, responsive di 120Hz/240Hz touch sampling rate, dan mempertahankan tema glassmorphism Kasane RPG.
3. Jalankan "npm test" untuk memverifikasi 24/24 unit test yang ada.
4. Jangan berikan respons AI slop, basa-basi generik, atau kode placeholder. Berikan kode nyata yang siap pakai dan aman untuk kernel.
```

---

## ⚡ 3. Perintah Berguna di IDE Baru

| Perintah | Deskripsi |
| :--- | :--- |
| `npm test` | Menjalankan seluruh test suite (Smoke + Functional + Root Detection = 24/24 PASS). |
| `npm run sync` | Menyelaraskan otomatis perubahan antara file web root dan file web Android assets. |
| `git status` | Memeriksa status git repository. |
| `./gradlew assembleDebug` | Build APK lokal (opsional jika memiliki JDK 17 dan Android SDK di laptop). |

---

## 🛡️ 4. Aturan Penting Kernel & Stealth yang Wajib Diingat AI
- **Syscall vs Procfs**: `/proc/version` adalah teks compile-time kernel binary, sedangkan `uname()` di-hook oleh driver SuSFS v2.3.0. Spoofing `uname()` wajib dipertahankan agar tidak terdeteksi Momo / Native Detector.
- **Android 16 Safety**: Jangan ubah fingerprint atau properti OS secara agresif di modul BRENE ke sembarang nilai Pixel, karena akan merusak Play Services dan Keystore Android 16.
- **Zero Blue Accents**: Pertahankan aksen Kasane Gold (`#f59e0b`) dan hindari warna biru pada icon atau cursor terminal.
- **Single-Row Alignment**: Pertahankan format satu baris rata pada list script/folder agar UI tidak patah atau miring.
