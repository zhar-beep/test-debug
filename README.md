# Kasane Shell

> **Pemantau perangkat Android read-only** — frekuensi CPU/GPU realtime, suhu baterai, dan permukaan log diagnostik.
> Dikembangkan pada perangkat MediaTek Helio G99 yang di-root dengan **KernelSU-Next + SuSFS**.

---

## ⚠️ Batas yang disengaja

Versi ini **tidak menulis apa pun** ke sistem. Tidak mengubah frekuensi, tidak mengubah izin file, tidak menjalankan script sebagai root, tidak memasang modul. Ia hanya membaca dan menampilkan.

Batasan itu bukan sekadar niat — ia ditegakkan oleh test suite. Kalau suatu saat kemampuan menulis dikembalikan, test-nya akan gagal lebih dulu.

Kalau kamu mencari versi yang bisa menjalankan script dan mengatur izin file, kode itu masih ada dan utuh di [`backup/`](./backup/README.md).

---

## 🌟 Fitur

1. **Telemetri CPU realtime**
   - Frekuensi per-core dan per-cluster, dibaca dari `cpufreq` sysfs.
   - Beban dihitung dari **delta `/proc/stat` antar sampel**, bukan rata-rata sejak boot.
   - Cluster dideteksi dari kesamaan frekuensi maksimum antar core, jadi tetap benar di SoC dengan jumlah cluster berbeda.
   - Donut beban, daftar cluster, dan bar proporsi untuk setiap core.

2. **Telemetri GPU realtime**
   - Dua generasi antarmuka MediaTek diperiksa berurutan, bukan diasumsikan: `gpufreq` (lama) dan `gpufreqv2` (baru).
   - Frekuensi, batas atas, beban, dan path node yang benar-benar dipakai ikut ditampilkan.

3. **Suhu baterai**
   - Empat kandidat node diperiksa; yang pertama terbaca dipakai.
   - Nilai MediaTek dalam persepuluh derajat dikonversi otomatis.

4. **Identitas perangkat dinamis**
   - Nama perangkat, model, kernel, ROM, resolusi, refresh rate, dan slot boot semuanya dibaca saat runtime.
   - Nol nilai hardcode di seluruh antarmuka — ada test yang menjaganya.

5. **Logs App: audit, diagnostik, monitoring**
   - **Diagnostik** melaporkan setiap node yang dicoba, ada atau tidak ada, **beserta sampel mentahnya**. Ini yang membuat kita tahu apa yang benar-benar diekspos perangkat, bukan menebak.
   - **Salin Semua** menghasilkan teks polos yang siap dibaca manusia maupun model bahasa.

6. **Root read-only dan jujur**
   - Deteksi nyata lewat libsu, `su -c id`, dan RootBeer sebagai pendapat kedua.
   - Kalau root tidak ada, metrik GPU turun jadi `n/a` beserta alasannya. Tidak ada chip, tidak ada titik berdenyut, tidak ada angka palsu.

7. **Desain kulit & kayu**
   - Material coklat kulit, judul menu bernuansa kayu, satu aksen emas `#f59e0b` per layar.
   - Inter Variable + JetBrains Mono, keduanya **di-host lokal** di `assets/fonts/`. Nol CDN — tampilan tetap utuh tanpa internet.
   - Mode terang kontras tinggi dan mode gelap.

8. **Hemat baterai**
   - Polling berhenti total saat tab Monitor tidak aktif, saat app di-background, atau saat halaman disembunyikan.

---

## 📁 Struktur

```
cmc/
├── .github/workflows/build-apk.yml   # Cloud CI/CD build APK
├── app/
│   ├── build.gradle.kts              # libsu, rootbeer, coroutines
│   └── src/main/
│       ├── AndroidManifest.xml       # Offline-only, adaptive icon, hardware acceleration
│       ├── res/                      # Ikon peluncur & tema jendela
│       │   ├── drawable/ic_launcher_foreground.xml
│       │   ├── mipmap-anydpi-v26/ic_launcher.xml
│       │   └── values/{colors,themes,strings}.xml
│       ├── java/com/kasane/shell/
│       │   ├── MainActivity.kt       # WebView host, pause/resume polling
│       │   └── RootBridge.kt         # getTelemetry, probeNodes, checkRoot
│       └── assets/web/               # Web assets yang dikemas ke APK
│           ├── index.html
│           ├── styles.css
│           ├── app.js
│           └── assets/ (wallpaper, 21 emoji iOS 3D, fonts/)
├── assets/                           # Mirror root dari web assets
│   ├── emojis/
│   └── fonts/                        # Inter Variable + JetBrains Mono
├── backup/                           # Arsip Kasane Shell v2 (executor) — lihat README-nya
│   └── kasane-v2-executor/
│       ├── web/                      # Termasuk logic eksekusi, explorer, chmod, emoji
│       ├── android/                  # RootBridge.kt v2
│       └── tests/                    # Suite v2 sebagai daftar periksa pemulihan
├── scripts/
│   ├── serve.js                      # Preview lokal + live reload
│   └── sync-assets.js                # Sinkronisasi root <-> Android assets
├── test/
│   ├── smoke-test.js                 # Struktur, aset, invarian offline (9/9)
│   ├── real-functional-test.js       # Build, manifest, kontrak native (8/8)
│   └── root-detector-verification.js # Kontrak probe & read-only (7/7)
├── PRD.md                            # Product Requirements Document v3.0
├── package.json
├── build.gradle.kts
└── settings.gradle.kts
```

---

## 🧪 Test Suite (24/24 PASS)

```bash
npm test

# atau satu per satu
node test/smoke-test.js
node test/real-functional-test.js
node test/root-detector-verification.js
```

Yang paling penting di dalamnya: suite terakhir memverifikasi bahwa `RootBridge.kt` **tidak memuat satu pun jalur penulisan** — tidak ada `chmod`, tidak ada `destroyForcibly`, tidak ada redirect ke `/proc` atau `/sys`.

---

## 👀 Preview Lokal dengan Live Reload

```bash
npm run dev
# → http://localhost:5500
```

Server menyalurkan berkas dari root project — berkas yang sama persis yang ikut ke APK — jadi yang kamu lihat di browser identik dengan isi aplikasi. Setiap perubahan pada `index.html`, `styles.css`, atau `app.js` memicu reload otomatis.

Tanpa jembatan native, aplikasi berjalan dengan **data sintetis** supaya UI tetap bisa dikembangkan tanpa HP. Data itu ditandai jelas di log sebagai pratinjau, bukan pembacaan perangkat.

Ganti port bila perlu: `PORT=8080 npm run dev`.

---

## 🔄 Sinkronisasi Web Assets

Root dan `app/src/main/assets/web/` harus selalu identik. Setelah mengedit `index.html`, `styles.css`, atau `app.js`:

```bash
npm run sync
```

---

## 🚀 Build APK via GitHub Actions

Tidak perlu Android Studio:

1. Push ke repository GitHub kamu.
2. Buka tab **Actions** — workflow berjalan otomatis (Ubuntu runner + JDK 17).
3. Unduh artefak **`GameSetup-Debug-APK`** dari tab **Artifacts** atau **Releases**, install, lalu berikan izin Superuser KernelSU-Next.
4. Buka **Logs App** → **Diagnostik** → **Salin Semua**, dan simpan hasilnya.

---

## ✅ Yang Perlu Diverifikasi di HP

Pengembangan tidak bisa memastikan ini, dan sengaja tidak menebak:

- Apakah MT6789 memakai `gpufreq` atau `gpufreqv2`.
- Apakah `/proc/mali/utilization` tersedia untuk Mali-G57 pada kernel ini. Kalau tidak, donut GPU hanya menampilkan frekuensi tanpa beban.
- Node suhu baterai mana yang valid.
- Format keluaran `ksud -V` pada KernelSU-Next v3.4.0.

Langkah di atas (Logs App → Diagnostik → Salin Semua) menjawab keempatnya sekaligus: kategori Diagnostik memuat tabel node beserta sampel mentahnya.
