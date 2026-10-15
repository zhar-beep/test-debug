# Kasane Shell // Game Setup

> **Modern, High-Performance Android Root Script Runner & Permissions Manager**  
> Tailored for **Infinix Note 30 (X6833B)** running **KernelSU-Next v3.4.0 (Hybrid)** and **SuSFS v2.3.0** on **AxionOS 2.7 (Android 16, API 36)**.

---

## 🌟 Fitur Utama (Key Features)

1. **Workspace Terkunci & Aman di `/data/local/tmp`**:
   - Direktori default permanen untuk script gaming, optimizer sentuhan, dan bypass thermal.
   - Otomatis inisialisasi folder dengan `su -c "mkdir -p /data/local/tmp && chmod 777 /data/local/tmp"` pada saat aplikasi dijalankan.
   - Navigasi breadcrumbs yang mencegah pengguna tersasar keluar sandbox.

2. **Tampilan Kartu Sejajar & Simetris (Single-Row Clean Alignment)**:
   - Ikon kotak 40×40px di tengah secara vertikal.
   - Nama script rapi satu baris dengan `truncate` anti-patah baris.
   - Baris metadata padat menampilkan badge octal (`chmod 777` / `755` / `644`), ukuran file, dan string permission.
   - Tombol **`Izin`** dan **`Run`** berdampingan sejajar secara horizontal dengan tinggi seragam 32px (`h-8`).
   - Kartu folder dan kartu script memiliki ukuran, padding, dan tinggi yang presisi identik.

3. **Editor Izin Visual MT Manager (`Izin` Modal)**:
   - Matriks 9-checkbox untuk Owner (`u`), Group (`g`), dan Other (`o`) (Read `4`, Write `2`, Execute `1`).
   - Perhitungan kode octal real-time.
   - Preset 1-klik instan:
     - `Set 777 (Full)`: `rwxrwxrwx`
     - `Set 755 (Exe)`: `rwxr-xr-x`
     - `Set 644 (Read)`: `rw-r--r--`

4. **Konfirmasi Keamanan 2 Tahap (2-Step Run)**:
   - Tahap 1: Verifikasi nama script dan target path.
   - Tahap 2: Peringatan keamanan Superuser UID 0 KernelSU.
   - Otomatis menjalankan `chmod +x` sebelum eksekusi untuk mencegah error `Permission Denied`.

5. **Konsol Terminal Real-Time (iOS Bottom Sheet)**:
   - Sliding sheet dengan animasi spring dan backdrop blur.
   - Stream live `stdout` & `stderr` dengan penanda waktu detik presisi `[HH:mm:ss]`.
   - Tombol kontrol: Auto-Scroll, Salin Log ke Clipboard, Bersihkan Layar, dan **Hentikan Script (Ctrl+C)** via `destroyForcibly()`.
   - **Dynamic Island Mini-HUD**: Floating pill di bagian bawah layar saat sheet ditutup ketika script masih berjalan.

6. **Status Root Tegas & Desain Kasane RPG**:
   - Status root teks biner murni: `Root: YES` (hijau) atau `Root: NO` (merah). Zero icon, zero emoji perisai.
   - Desain terinspirasi `https://kasane.aura.build/` dengan font Apple SF Pro Display.
   - Wallpaper anime dibatasi di dalam chassis layar HP (tidak melebar di monitor PC).
   - Mode Terang Kontras Tinggi (Anti Silau, teks hitam pekat `#090d16`) dan Mode Gelap Kaca Smoky.
   - Tanpa aksen biru (menggunakan vector SVG Kasane Gold `#f59e0b`).

7. **Integrasi Open Source Root Tools (GitHub)**:
   - `com.github.topjohnwu.libsu:core:5.2.2` (libsu resmi by John Wu).
   - `com.scottyab:rootbeer-lib:0.1.0` (RootBeer verification).
   - Deteksi `ksud -V`, driver SuSFS v2.3.0, dan status SELinux.

---

## 📁 Struktur Folder Project

```
splendid-pascal/
├── .github/workflows/build-apk.yml  # Cloud CI/CD build APK otomatis
├── app/                             # Modul Android Gradle utama
│   ├── build.gradle.kts             # Dependensi libsu, rootbeer, coroutines
│   └── src/main/
│       ├── AndroidManifest.xml      # Hardware acceleration & fullscreen flags
│       ├── java/com/kasane/shell/
│       │   ├── MainActivity.kt      # WebView host & lifecycle
│       │   └── RootBridge.kt        # @JavascriptInterface root backend
│       └── assets/web/              # Web assets untuk APK offline
│           ├── index.html
│           ├── styles.css
│           ├── app.js
│           └── assets/ (user-anime.jpg & 21 offline iOS 3D emojis)
├── assets/                          # Mirror web assets root
├── scripts/
│   └── sync-assets.js               # Smart 2-way sync antar root & Android assets
├── test/
│   ├── smoke-test.js                # Uji integritas DOM, CSS, dan assets (9/9 PASS)
│   ├── real-functional-test.js      # Uji build gradle & Kotlin bridge (8/8 PASS)
│   └── root-detector-verification.js# Uji vektor deteksi root open-source (7/7 PASS)
├── debug.txt                        # Dokumen lengkap untuk DeepSeek v4.1 Flash
├── PRD.md                           # Product Requirements Document v2.0
├── package.json                     # NPM scripts untuk test dan sync
├── build.gradle.kts                 # Root Gradle build script
└── settings.gradle.kts              # Gradle project settings
```

---

## 🧪 Menjalankan Test Suite (24/24 PASS)

Kamu bisa memverifikasi seluruh komponen aplikasi menggunakan perintah:

```bash
# Menjalankan seluruh test suite sekaligus
npm test

# Atau jalankan satu per satu via Node.js
node test/smoke-test.js
node test/real-functional-test.js
node test/root-detector-verification.js
```

---

## 🔄 Sinkronisasi Web Assets

Jika kamu mengedit `index.html`, `styles.css`, atau `app.js` di root, jalankan:
```bash
npm run sync
```
Script ini akan otomatis menyinkronkan perubahan ke folder `app/src/main/assets/web/`.

---

## 🚀 Build APK via GitHub Actions (Zero Local Tools)

Kamu tidak perlu menginstall Android Studio di laptop:
1. Push project ini ke repository GitHub kamu:
   ```bash
   git add .
   git commit -m "feat: complete Kasane Shell v2.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO-NAME.git
   git push -u origin main
   ```
2. Buka tab **Actions** di repository GitHub kamu.
3. GitHub Actions akan otomatis meng-compile APK menggunakan Ubuntu runner + JDK 17.
4. Download file `GameSetup-Debug-APK` dari tab **Releases** atau **Artifacts**, install di Infinix Note 30 kamu, dan berikan izin Superuser KernelSU-Next.
