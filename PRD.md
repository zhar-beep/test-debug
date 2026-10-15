# Product Requirements Document (PRD v2.0)
## Project: Kasane Shell — Android Root Game Script Orchestrator
**Package:** `com.kasane.shell`  
**Target Device Environment:** Infinix Note 30 (`X6833B`), Android 16 (AxionOS 2.7, API 36, arm64-v8a)  
**Kernel Subsystem:** SuiKernel 5.10.269-SuiKernel-Stable-KernelSU-Next (HSKY14 by KanagawaYamada)  
**Root Framework:** KernelSU-Next v3.4.0 (Hybrid Hook) + SuSFS v2.3.0 (GKI Full Feature Stealth)  
**Build & CI/CD Strategy:** GitHub Actions Cloud Automation (`.github/workflows/build-apk.yml`)  

---

## 1. Executive Summary & Core Mission
Kasane Shell is a modern, high-performance Android root utility application engineered specifically to orchestrate, inspect, set chmod permissions on, and execute custom shell scripts (`.sh`) located in `/data/local/tmp`. It provides mobile gamers and power users with an intuitive, aesthetic interface to run touch latency overclocks, Helio G99 gaming profiles, and thermal bypass scripts without touching a desktop terminal or MT Manager.

### Core Objectives:
1. **Root-Level Execution & Sandbox Enforcement:** Secure, non-blocking execution of shell scripts via KernelSU-Next `su` on `Dispatchers.IO` with real-time streaming stdout/stderr.
2. **Dedicated `/data/local/tmp` Workspace:** Automatically ensures directory existence and `chmod 777` permissions on startup, locking the explorer to this safe root sandbox.
3. **Kasane Glassmorphism UI:** Aesthetic inspired by `https://kasane.aura.build/` using Apple SF Pro typography, authentic Apple iOS 3D emojis, translucent frosted glass cards, and zero horizontal wallpaper stretching on desktop view.
4. **MT Manager Visual Permissions:** 9-checkbox chmod matrix (Owner, Group, Other) with instant presets (`777 Full`, `755 Exe`, `644 Read`).
5. **Two-Step Safety Run:** Strict 2-step verification modal before any root script execution, auto-applying `chmod +x` before launch.
6. **Zero-Config Cloud Build:** Full compilation on GitHub Actions Ubuntu runners outputting signed/installable APKs with zero local SDK setup.

---

## 2. Target Device Hardware & Kernel Environment
- **Device Model:** Infinix Note 30 (`X6833B`), Sunset Gold Vegan Leather Edition.
- **SoC:** MediaTek Helio G99 (`MT6789`, 6nm TSMC) — 2x Cortex-A76 @ 2.2 GHz, 6x Cortex-A55 @ 2.0 GHz, Mali-G57 MC2.
- **Display:** FHD+ 1080 x 2460 pixels (20.5:9 aspect ratio, 120Hz refresh rate, 240Hz touch sampling rate).
- **RAM & Storage:** 8GB LPDDR4X (+ 8GB MemFusion virtual RAM) / 256GB UFS 2.2.
- **Operating System:** AxionOS 2.7 (Android 16 Vanilla Ice Cream, API 36, arm64-v8a).
- **Active Boot Slot:** Slot `_b` (`/dev/block/sdc55`).
- **Kernel:** SuiKernel 5.10.269-SuiKernel-Stable-KernelSU-Next (HSKY14).
- **Root & Stealth Subsystem:**
  * KernelSU-Next v3.4.0 (Hybrid hook mode, GKI2).
  * SuSFS v2.3.0 (GKI full-feature syscall interception).
  * Modules: BRENE v0.0.69 (SuSFS manager & uname spoofer), HMA-OSS, Tricky Store, Vector, Zygisk Next.
  * Syscall vs Procfs Divergence: `/proc/version` reads `5.10.269-SuiKernel-Stable-KernelSU-Next`, while `uname()` is intercepted by SuSFS to return `5.10.269-android12-9-g40451463` to bypass Native Detector and Momo detection.

---

## 3. System Architecture & Technical Stack

```
+-------------------------------------------------------------+
|                     Android Device                          |
|                                                             |
|  +-------------------------------------------------------+  |
|  |           WebView Frontend (HTML5 / Tailwind)         |  |
|  |  - Dashboard: Script Catalog & System HUD             |  |
|  |  - Single-Row Cards: Icon | File Info | Izin | Run    |  |
|  |  - Modals: MT Manager Chmod, 2-Step Run, Emoji Picker |  |
|  |  - Console: iOS Sliding Bottom Sheet & Dynamic Island |  |
|  +-------------------------------------------------------+  |
|                            |                                |
|                 @JavascriptInterface Bridge                 |
|                            v                                |
|  +-------------------------------------------------------+  |
|  |         Native Android Host (MainActivity.kt)         |  |
|  |  - RootBridge.kt on CoroutineScope(Dispatchers.IO)    |  |
|  |  - topjohnwu libsu (v5.2.2) + scottyab RootBeer       |  |
|  |  - Process Streaming Buffer & destroyForcibly()       |  |
|  +-------------------------------------------------------+  |
|                            |                                |
|                      KernelSU su                            |
|                            v                                |
|  +-------------------------------------------------------+  |
|  |           Filesystem: /data/local/tmp/                |  |
|  |  - touch_boost_120hz.sh                               |  |
|  |  - gpu_governor_lock.sh                               |  |
|  |  - thermal_bypass_drop.sh                             |  |
|  |  - mlbb_extreme_fps.sh                                |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

---

## 4. Feature Specifications

### 4.1. Header & Live Telemetry
- Clean `KASANE` branding (yellow `GAME SETUP` badge removed).
- Root Status: Binary text-only `Root: YES` (emerald green) or `Root: NO` (rose red). Zero shield emojis, zero icons.
- System HUD: 6 telemetry tiles displaying Device Name, FHD+ 1080x2460 (120Hz) resolution, 5.10.269-SuiKernel, AxionOS 2.7, Slot _b, and Workspace `/data/local/tmp`.
- Diagnostics Trigger: "Periksa Ulang" button with vector SVG animation.

### 4.2. File Explorer & Management
- Locked Workspace: Defaults permanently to `/data/local/tmp`.
- Directory Auto-Init: Executes `su -c "mkdir -p /data/local/tmp && chmod 777 /data/local/tmp"` on startup.
- Single-Row Aligned Card Layout:
  * Icon (40x40px rounded box, vertically centered).
  * Middle Info (truncated file name + sub-line with permissions badge, file size, and permissions string).
  * Action Buttons (`Izin` and `Run` side-by-side with uniform 32px height `h-8` and matching corner radius).
- Folder vs Script visual parity: Both card types share identical padding, font sizing, and row height.

### 4.3. MT Manager Permissions Modal ("Izin")
- 9-Checkbox chmod matrix (Owner, Group, Other for r, w, x).
- Live octal calculation input.
- Instant 1-tap presets: `Set 777 (Full)`, `Set 755 (Exe)`, `Set 644 (Read)`.
- Backend invocation: `su -c "chmod <octal> <path>"`.

### 4.4. Two-Step Run Confirmation
- Step 1: Script target confirmation.
- Step 2: Superuser security warning emphasizing UID 0 execution in `/data/local/tmp`.
- Auto-prep: Executes `su -c "chmod +x <path>"` before running.

### 4.5. Custom Script Emoji Manager
- Modal allowing users to assign Apple iOS 3D emoji icons (`lightning`, `swords`, `snowflake`, `gear`, `phone`, `key`, `scroll`, `sakura`) to each individual script. Persisted via `localStorage`.

### 4.6. Live Execution Console (Bottom Sheet Terminal)
- Sliding bottom sheet with drag handle and backdrop blur.
- Exact-second timestamps `[HH:mm:ss]` on all output lines.
- Controls: Toggle Auto-Scroll, Copy Full Logs to Clipboard, Clear Screen, and Force Stop (Ctrl+C).
- Force Stop (Ctrl+C): Calls `currentProcess?.destroyForcibly()` to safely terminate running root processes.
- Dynamic Island Mini-HUD: If user dismisses sheet while script runs, a floating pill appears at bottom screen with script name and timer.

### 4.7. Menu Logs (History & Audit)
- Persistent execution history with start timestamp, execution duration, exit code, and line count.
- Copy log to clipboard and detail inspection modal.

### 4.8. UI/UX Design System
- Apple SF Pro Display typography and JetBrains Mono code font.
- Mobile chassis bounding: Wallpaper contained inside 420px container on desktop, 100vw on mobile.
- High-contrast Light Mode (`rgba(255, 255, 255, 0.94)` cards, `#090d16` text) and Smoky Glass Dark Mode.
- Zero AI Slop: No blue accents (amber/gold SVG icons used), no generic purple gradients, no punch-hole camera glitch, no "SIGKILL" geek jargon.

---

## 5. Automated Verification Test Suite (24/24 PASS)
- `test/smoke-test.js`: 9 of 9 tests passed (100%).
- `test/real-functional-test.js`: 8 of 8 tests passed (100%).
- `test/root-detector-verification.js`: 7 of 7 vectors verified (100%).
- Total: 24/24 Test Assertions PASSED.
