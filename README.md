# Game Setup — Android Root Script & Permissions Orchestrator

Modern, dark-elegant Android Root utility app for power users and gamers. Built specifically for devices running **KernelSU-Next** (e.g., Infinix Note 30 / AxionOS 2.7 / Android 16).

---

## 🌟 Key Features

1. **Dedicated `/data/local/tmp` File & Folder Explorer**:
   - Browse subfolders and organize gaming scripts cleanly.
   - Breadcrumb navigation (`/tmp / subfolder ...`).
2. **MT Manager Style Permission Editor**:
   - Inspect octal permissions (`0777`, `0755`, `0644`).
   - 9-box matrix for Owner, Group, Other (Read, Write, Execute).
   - 1-tap presets: **Set 777 (Full Permissions)**, **Set 755 (Executable)**, **Set 644 (Read Only)**.
3. **Execution Console (Terminal Engine)**:
   - iOS-style frosted glass bottom sheet.
   - Real-time `stdout` / `stderr` streaming with color syntax.
   - Process ID (PID) and millisecond timer.
   - Actions: **Kill SIGKILL**, **Clear Logs**, **Copy Logs**, **Auto-Scroll Toggle**.
   - **Dynamic Island Mode**: Minimize terminal to a floating pill while browsing other folders.
4. **Zero-Load Cloud Build**:
   - Compiles automatically using GitHub Actions. No Android Studio or heavy tools needed on your laptop!

---

## 🚀 Cara Menghubungkan ke GitHub & Download APK

### Langkah 1: Buat Repository Baru di GitHub
1. Buka [github.com/new](https://github.com/new) di browser laptop atau HP kamu.
2. Isi **Repository name**: `game-setup` (atau nama lain yang kamu suka).
3. Pilih **Public** (agar GitHub Actions berjalan gratis tanpa limit).
4. **JANGAN centang** *"Add a README file"*, biarkan kosong, lalu klik **Create repository**.
5. Salin link repository kamu (misal: `https://github.com/USERNAME/game-setup.git`).

---

### Langkah 2: Push Kode dari Antigravity
Ketik atau beri tahu saya link repository GitHub kamu, lalu kita cukup jalankan perintah ini di terminal AG:

```bash
git add .
git commit -m "feat: initial Game Setup app with MT Manager perms and KernelSU execution"
git branch -M main
git remote add origin https://github.com/USERNAME/game-setup.git
git push -u origin main
```

*(Jika Windows meminta login GitHub, jendela browser akan otomatis muncul untuk klik **Authorize** sekali saja).*

---

### Langkah 3: Download APK dari HP Kamu!
1. Begitu kode ter-push, buka repository kamu di GitHub dari HP Infinix Note 30 kamu.
2. Buka tab **Actions** atau tab **Releases** di halaman GitHub repo tersebut.
3. Tunggu ~2 menit sampai icon centang hijau ✅ muncul.
4. Klik **Download `GameSetup-Debug-APK`** (file `.apk`).
5. Install di HP kamu dan buka aplikasinya.
6. Saat pertama kali dijalankan, **KernelSU-Next** akan menampilkan pop-up permintaan Superuser $\rightarrow$ pilih **Grant** (Izinkan).
7. Selesai! Kamu sekarang punya Game Setup dengan UI modern, MT Manager permissions, dan terminal streaming di HP kamu!
