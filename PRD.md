# Product Requirements Document (PRD v3.0)
## Project: Kasane Shell — Read-Only Android Device Monitor
**Package:** `com.kasane.shell`
**Environment:** MediaTek Helio G99 class device, rooted with KernelSU-Next + SuSFS, Android 13+
**Build & CI/CD:** GitHub Actions cloud build (`.github/workflows/build-apk.yml`)

---

## 1. Executive Summary & Core Mission

Kasane Shell v3 adalah **aplikasi pemantau perangkat read-only**. Ia membaca frekuensi CPU/GPU secara realtime, menampilkan suhu baterai, membaca identitas perangkat, dan menyediakan permukaan log diagnostik yang bisa disalin utuh.

**Aplikasi ini tidak menulis apa pun ke sistem.** Tidak mengubah frekuensi, tidak mengubah izin file, tidak menjalankan script sebagai root, tidak memasang modul. Batasan ini disengaja dan ditegakkan oleh test suite, bukan sekadar niat.

### Perubahan dari v2 — ini pergantian arah, bukan tambahan fitur

| Kemampuan v2 | Status di v3 |
|---|---|
| Menjalankan script `.sh` sebagai root | **Dipindah ke `backup/`** |
| Konsol terminal bottom sheet + dynamic island | **Dipindah ke `backup/`** |
| Riwayat eksekusi script | **Dipindah ke `backup/`** |
| File explorer `/data/local/tmp` | **Dipindah ke `backup/`** |
| Izin / chmod ala MT Manager | **Dipindah ke `backup/`** |
| Emoji picker untuk ikon script | **Dipindah ke `backup/`** |
| HUD telemetri statis | Diganti telemetri realtime |

Kode v2 disimpan utuh di `backup/kasane-v2-executor/` beserta suite test-nya, lengkap dengan panduan pemulihan. Lihat `backup/README.md`.

### Core Objectives

1. **Read-Only Telemetri Realtime:** Frekuensi per-core dan per-cluster, beban CPU, frekuensi dan beban GPU, suhu baterai — semua dibaca, tidak ada yang ditulis.
2. **Probe, Jangan Berasumsi:** Antarmuka GPU berbeda antar generasi MediaTek. Aplikasi memeriksa keduanya dan melaporkan mana yang ada di perangkat, bukan menebak.
3. **Identitas Dinamis:** Nama perangkat, model, kernel, ROM, resolusi, dan slot boot semuanya dibaca dari perangkat. Nol nilai hardcode.
4. **Permukaan Diagnostik:** Logs App menampung audit, diagnostik, dan monitoring dalam teks polos yang bisa disalin penuh dengan satu tombol.
5. **Degradasi Jujur:** Setiap metrik yang tidak tersedia tampil sebagai `n/a` beserta alasannya. Tidak ada angka palsu.
6. **Zero-Config Cloud Build:** Kompilasi penuh di GitHub Actions, tanpa Android Studio lokal.

---

## 2. Target Device

Aplikasi tidak terikat pada satu perangkat. Semua nilai dibaca saat runtime. Referensi pengembangan:

- **SoC:** MediaTek Helio G99 (MT6789) — 2x Cortex-A76 + 6x Cortex-A55, Mali-G57 MC2.
- **Display:** 1080 x 2460, 120Hz.
- **OS:** Android 16 (AxionOS 2.7, arm64-v8a) untuk pengujian; `minSdk 26`.
- **Root:** KernelSU-Next v3.4.0 + SuSFS v2.3.0.
- **Catatan stealth:** `/proc/version` adalah string compile-time milik kernel, sementara `uname()` diintersepsi SuSFS. Aplikasi ini menampilkan **kernel yang sebenarnya** dan memang begitu tujuannya — ini alat monitoring, bukan alat penyamaran.

---

## 3. Arsitektur

```
+---------------------------------------------------------------+
|  WebView Frontend (index.html, styles.css, app.js)            |
|  - Tab Monitor: spec, donut CPU/GPU, bar per-core             |
|  - Tab Logs App: audit / diagnostik / monitoring              |
|  - Polling 1s, berhenti saat tab tersembunyi atau app di-pause|
+---------------------------------------------------------------+
|                    @JavascriptInterface                       |
|                            v                                  |
|  RootBridge.kt                                                |
|  - CPU    : File() langsung, tanpa root, tanpa proses         |
|  - Load   : delta /proc/stat per core                         |
|  - GPU    : satu sesi libsu persisten (Shell.cmd)             |
|  - Probe  : melaporkan node mana yang ada + sampel mentah     |
+---------------------------------------------------------------+
|              KernelSU su (hanya untuk baca)                    |
+---------------------------------------------------------------+
```

**Prinsip arsitektur yang menentukan performa:**

- Node CPU dan suhu baterai world-readable, jadi dibaca langsung dari Java. Tidak ada proses yang di-spawn, tidak butuh root. Polling cepat jadi murah.
- Node GPU butuh root. Alih-alih `ProcessBuilder` per pembacaan, satu sesi root libsu dibagi pakai. Satu shell hidup terus, bukan proses baru tiap detik.
- Aplikasi berhenti polling total saat tab bukan Monitor, saat app di-background, atau saat halaman disembunyikan. Dashboard realtime yang tetap jalan di latar belakang adalah bug baterai.

---

## 4. Spesifikasi Fitur

### 4.1. Header
- Wordmark `KASANE` saja. Tidak ada badge, tidak ada slogan.
- Baris kedua: nama perangkat dibaca dari `Build.MANUFACTURER` + `Build.MODEL`.
- Toggle tema terang/gelap (SVG, berganti murni lewat CSS).
- **Tidak ada chip status root. Tidak ada titik berdenyut.** Keduanya dihapus sebagai slop.

### 4.2. Blok Spesifikasi — tepat 7 baris
Setiap baris label + nilai, lebar penuh, membungkus tanpa terpotong:

| Baris | Sumber |
|---|---|
| Perangkat | `Build.MANUFACTURER` + `MODEL` + `DEVICE` + ABI |
| Layar | `DisplayMetrics` + refresh rate dari `Display` |
| Kernel | `/proc/version` (release yang sebenarnya) |
| OS / ROM | `Build.VERSION.RELEASE` + `SDK_INT` + `Build.DISPLAY` |
| Slot | `ro.boot.slot_suffix`, ditampilkan sebagai `a` atau `b` saja |
| CPU / GPU | ringkasan realtime, mis. `little 1.80 GHz · big 2.20 GHz · GPU 850 MHz` |
| Suhu baterai | node suhu baterai, satu desimal °C |

Di bawah daftar ada satu baris tenang bernama **Root** yang menampilkan hasil probe nyata: `terverifikasi UID 0` atau `tidak diberikan` beserta konsekuensinya. Tanpa chip, tanpa ikon, tanpa animasi.

### 4.3. CPU Realtime
- **Donut** menampilkan beban CPU total; nilai di tengah.
- **Daftar cluster** menampilkan nama cluster (`little`/`mid`/`big`), jumlah core, frekuensi saat ini, dan beban rata-rata.
- **Bar per-core** untuk setiap core: nama, cluster, frekuensi, dan bar proporsi terhadap frekuensi maksimum.
- Cluster dideteksi dari kesamaan `cpuinfo_max_freq` antar core — tidak di-hardcode, jadi tetap benar di SoC dengan jumlah cluster berbeda.
- Beban dihitung dari **delta `/proc/stat` antar sampel**, bukan rata-rata sejak boot.

### 4.4. GPU Realtime
- **Donut** menampilkan beban GPU; nilai tengah menampilkan frekuensi.
- Baris meta: frekuensi, maksimum, beban, generasi antarmuka, dan path node yang dipakai.
- Dua generasi antarmuka diperiksa berurutan, yang pertama menjawab dipakai:

| Metrik | gpufreq (lama) | gpufreqv2 (baru) |
|---|---|---|
| Frekuensi terpaku | `gpufreq_fixed_freq_volt` | `fix_custom_freq_volt` |
| Frekuensi aktif | `gpufreq_opp_freq` | `fix_target_opp_index` |
| Tabel OPP | `gpufreq_opp_dump` | `stack_signed_opp_table` |
| Batas atas | `/sys/kernel/ged/hal/custom_upbound_gpu_freq` | idem |
| Beban | `/proc/mali/utilization`, `/sys/module/ged/parameters/gpu_loading`, `/sys/kernel/ged/hal/gpu_utilization` | idem |

### 4.5. Suhu Baterai
Empat kandidat node diperiksa; yang pertama terbaca dipakai. Nilai MediaTek dilaporkan dalam persepuluh derajat, sehingga dikonversi bila > 200. Node yang menang dicatat di log agar bisa diverifikasi.

### 4.6. Logs App
Tiga kategori, satu daftar, bisa disaring:

- **Audit** — apa yang aplikasi lakukan: memuat spesifikasi, menjalankan diagnostik, mengubah saringan log.
- **Diagnostik** — hasil `runRootDiagnostics()` dan `probeNodes()`. Ini bagian terpenting: ia melaporkan **setiap node yang dicoba, ada atau tidak ada, dan sampel mentahnya**. Dari sini kita tahu persis apa yang diekspos perangkat tanpa menebak.
- **Monitoring** — sampel telemetri berkala (setiap 15 detik), berisi frekuensi cluster, beban, GPU, dan suhu.

Tombol **Salin Semua** menghasilkan teks polos berheader: perangkat, kernel, OS, slot, waktu, jumlah entri, lalu seluruh isi log. Formatnya dirancang agar bisa dibaca manusia maupun model bahasa tanpa perlakuan khusus.

### 4.7. Sistem Desain
- **Material:** kulit coklat hangat. `--leather` untuk kartu, `--leather-hi` untuk permukaan yang lebih pekat.
- **Judul menu:** `--wood` (`#c8a06a` gelap / `#8a6234` terang).
- **Aksen:** emas `#f59e0b`, dipakai **satu kali per layar** — hanya untuk tombol aksi utama.
- **Kaca dikurangi:** `backdrop-filter` turun dari 26px ke 10px sehingga permukaannya terbaca solid seperti kulit, bukan kristal.
- **Tipografi:** Inter Variable untuk UI, JetBrains Mono untuk setiap angka dan baris log. Keduanya self-hosted di `assets/fonts/`. Nol CDN.
- **Motion:** easing iOS `cubic-bezier(0.32, 0.72, 0, 1)` dengan fallback `prefers-reduced-motion` penuh.
- **Aksesibilitas:** `<button>` asli, `:focus-visible` yang terlihat, target sentuh 44px, dialog dengan focus trap dan Escape, status tidak pernah dikodekan lewat warna saja.

### 4.8. Chassis
Wrapper aplikasi adalah viewport **tinggi tetap** (`100dvh` di HP, `860px` di mode mockup) dengan `<main>` yang menggulir di dalamnya.

Ini bukan detail kosmetik: sebelumnya tinggi wrapper mengikuti panjang konten, sehingga `background-size: cover` menghitung ulang skala setiap kali pengguna berpindah tab dan wallpaper terlihat zoom in/out. Dengan tinggi tetap, wallpaper tidak bisa bergerak lagi. Efek sampingnya header ikut terkunci seperti aplikasi native.

---

## 5. Fase Selanjutnya (belum dikerjakan)

### 5.1. Kontrol Frekuensi
Menyetel batas atas CPU (`scaling_max_freq`) dan GPU (`custom_upbound_gpu_freq`), serta memilih OPP tertentu. Ini mulai menulis ke sysfs, jadi butuh konfirmasi tersendiri dan tombol pemulihan ke nilai bawaan.

### 5.2. Thermal Bypass — BERBAHAYA
Diminta secara terpisah dan sengaja ditahan. Isi `assets/kr-script/other/thermal/set.sh` pada Scene, yang sudah diperiksa, adalah: memasang modul KernelSU bernama `scene_thermal_remover`, menunggu 15 detik dengan peringatan, lalu **menimpa biner thermal-engine dengan file kosong**.

Itu bukan pembacaan dan bukan tweak sysfs — itu mengganti biner sistem. Konsekuensinya bisa kerusakan permanen akibat panas berlebih. Syarat minimum bila ini dikerjakan: konfirmasi eksplisit terpisah, hitungan mundur yang bisa dibatalkan, peringatan yang bisa dibaca, dan modul yang bisa dilepas.

### 5.3. Kalibrasi Voltase
Pengguna menyatakan tidak memahami ini; dilewati. Perlu dicatat bahwa Scene sendiri menggerbangi fitur ini ke mt6891/mt6893/mt6885/mt6875, sehingga kemungkinan besar tidak berlaku pada MT6789.

---

## 6. Test Suite (24/24 PASS)

- `test/smoke-test.js` — 9 tes: aset, struktur dua tab, tujuh baris spec, ketiadaan chip root, token desain, aturan gaya komponen, ketiadaan dialog native, invarian offline, ketiadaan identitas hardcode.
- `test/real-functional-test.js` — 8 tes: manifest offline, Gradle, sumber daya adaptive icon, API bridge read-only, hilangnya API penulis, sesi libsu, siklus hidup MainActivity, keberadaan arsip.
- `test/root-detector-verification.js` — 7 vektor: kedua generasi gpufreq, kandidat beban GPU, kandidat suhu baterai, degradasi ke `null`, laporan probe, invarian read-only.

---

## 7. Yang Perlu Diverifikasi di Perangkat

Tidak bisa dipastikan dari sisi pengembangan, dan sengaja tidak ditebak:

1. Apakah MT6789 memakai `gpufreq` atau `gpufreqv2` — `probeNodes()` akan menjawabnya.
2. Apakah `/proc/mali/utilization` tersedia untuk Mali-G57 pada kernel ini; bila tidak, donut GPU hanya menampilkan frekuensi.
3. Node suhu baterai mana yang valid.
4. Format keluaran `ksud -V` pada KernelSU-Next v3.4.0.

Cara mendapatkannya: pasang APK, buka **Logs App**, tekan **Diagnostik**, lalu **Salin Semua**. Kategori Diagnostik memuat tabel node beserta sampelnya.
