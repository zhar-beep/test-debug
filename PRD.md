# Product Requirements Document (PRD)
## Project: Kasane Shell (KuroScript) — Android Root Game Script Orchestrator

**Version:** 1.0.0  
**Target Device Environment:** Android 16 (API 36, arm64)  
**Root Framework:** KernelSU-Next (v3.4.0+) / SuSFS  
**Build Target Architecture:** Hybrid Native WebView + KernelSU Root Bridge  
**Compilation Strategy:** GitHub Actions Cloud CI/CD (Zero Local Toolchain / Potato-PC Friendly)

---

## 1. Executive Summary & Goals
Kasane Shell is a modern, high-performance Android utility application designed for power users and mobile gamers who run custom shell scripts (`.sh`) located in `/data/local/tmp`. 

### Key Objectives:
1. **Root-Level Script Execution:** Secure, asynchronous execution of shell scripts via `su` under KernelSU-Next with real-time streaming logs (`stdout` & `stderr`).
2. **Design Language Synergy:** Seamlessly fusion of:
   * **21st.dev (Qronos):** Jet black AMOLED foundation (`#08080a`), micro-borders, glowing pill badges, and clean technical aesthetics.
   * **Kasane (Aura):** Anime & nature RPG ambiance with bioluminescent ambient glows, character hero integration, and status HUD telemetry.
   * **iOS UX:** SF Pro typography, frosted glass bottom sheets (`backdrop-blur-2xl`), smooth haptic-like animations, and floating dynamic island status indicators.
3. **No-Heavy-IDE Requirement:** Zero local compilation required. The entire pipeline builds on GitHub Actions cloud runners and outputs a ready-to-install `.apk` directly to the user's phone.

---

## 2. Target User Persona & Hardware
* **Primary User:** Albert (Infinix Note 30 / X6833B).
* **System Environment:** AxionOS 2.7 (Android 16, API 36, Kernel 5.10.269-SuiKernel, Slot `_b`).
* **Root Subsystem:** KernelSU-Next in Hybrid mode with SuSFS stealth.
* **Constraints:** Development workstation is a resource-constrained laptop ("laptop kentang"); local Android Studio or heavy Gradle daemons are strictly avoided.

---

## 3. System Architecture & Technical Stack

```
+-------------------------------------------------------------+
|                     Android Device                          |
|                                                             |
|  +-------------------------------------------------------+  |
|  |           WebView Frontend (HTML5 / Tailwind)         |  |
|  |  - Dashboard: Script Catalog & System HUD             |  |
|  |  - Execution Console: iOS Bottom Sheet & Mini-HUD     |  |
|  |  - Script Editor: Built-in Code Editor                |  |
|  +-------------------------------------------------------+  |
|                            |                                |
|                 @JavascriptInterface Bridge                 |
|                            v                                |
|  +-------------------------------------------------------+  |
|  |         Native Android Host (MainActivity.kt)         |  |
|  |  - Process Management (Coroutine Dispatchers.IO)     |  |
|  |  - Root Shell Worker: `su -c sh /data/local/tmp/...`   |  |
|  |  - Real-time Output Streaming Buffer                  |  |
|  +-------------------------------------------------------+  |
|                            |                                |
|                      KernelSU su                            |
|                            v                                |
|  +-------------------------------------------------------+  |
|  |           Filesystem: /data/local/tmp/                |  |
|  |  - touch_optimizer.sh                                 |  |
|  |  - game_governor.sh                                   |  |
|  |  - thermal_drop.sh                                    |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### Components:
* **Frontend Layer:** Single-page application packaged inside `app/src/main/assets/web/`. Runs offline with zero external network dependencies for core functions.
* **Bridge Layer (`RootBridge.kt`):** Exposes two-way asynchronous communication between JavaScript and Android root shell via `@JavascriptInterface`.
* **Execution Engine:** Uses Kotlin Coroutines with buffered `BufferedReader` to stream lines directly to the web view without freezing UI threads.

---

## 4. Feature Specifications

### 4.1. System HUD & Telemetry
Displays real-time hardware and kernel status at the top of the interface:
* **Root Engine:** `KernelSU-Next Active`
* **Default Directory:** `/data/local/tmp`
* **Device / OS:** `Infinix Note 30 | Android 16`
* **Kernel:** `5.10.269 SuiKernel`

### 4.2. Script Catalog Management
* **Auto-Discovery:** Scans `/data/local/tmp` for `*.sh` files.
* **Categorization Tags:**
  * `Performance` (Touch boost, GPU clock lock, CPU governor)
  * `Thermal` (Bypass throttling, battery thermal throttle adjust)
  * `Game-Specific` (MLBB, Genshin, PUBG, emulator setups)
  * `Custom` (User-written scripts)
* **Script Action Controls:**
  * **Execute Button:** One-tap trigger with immediate log opening.
  * **Edit / View:** In-app inspection and editing.
  * **Delete:** Safe removal with confirmation modal.
  * **Add New Script:** Built-in template creator.

### 4.3. Execution Console (The Terminal Engine)
* **Presentation Form:** iOS-style sliding bottom sheet with smooth gestures.
* **Telemetry Banner:**
  * Script Name (`filename.sh`)
  * Process Status Badge (`IDLE`, `RUNNING` with pulse animation, `SUCCESS 0`, `ERROR [code]`)
  * Execution Elapsed Time counter (`00:00.00`)
  * Process ID (`PID`)
* **Terminal Stream Area:**
  * Monospace font formatting with dark OLED black contrast.
  * ANSI color parsing:
    * White/Slate: Standard stdout
    * Rose/Red: Stderr and errors
    * Amber/Gold: Warnings
    * Emerald: Success completion tokens
* **Console Controls:**
  * **Kill Process:** Sends `SIGTERM` / `SIGKILL` to running process.
  * **Clear Logs:** Resets console buffer.
  * **Copy Output:** Copies full session logs to clipboard.
  * **Auto-Scroll Lock:** Allows scrolling up without being forced to bottom upon new output.
  * **Dynamic Island / Minimize:** Shrinks console into an iOS-style floating pill at screen bottom, allowing background navigation while observing progress.

### 4.4. Security & Permissions
* Standard Android permissions: `INTERNET` (for Web assets/fonts), `RECEIVE_BOOT_COMPLETED` (optional auto-run on boot).
* Root privilege: Explicitly granted via KernelSU superuser prompt on first run.
* Whitelist safety: All executions are strictly scoped to user confirmation; no hidden background telemetry.

---

## 5. UI/UX Design System Specification

### 5.1. Color Palette
| Token | Hex Value | Application |
|---|---|---|
| Background Canvas | `#08080a` | Ultra-deep AMOLED base |
| Surface Card | `rgba(18, 17, 24, 0.72)` | Translucent glass card background |
| Surface Border | `rgba(255, 255, 255, 0.08)` | Subtle 1px crisp micro-border |
| Accent Violet (Kasane) | `#a855f7` / `#9333ea` | Primary glowing accents, running indicators |
| Accent Emerald (Nature) | `#10b981` / `#059669` | Success states, active root status |
| Accent Rose (Flame) | `#f43f5e` | Kill actions, error badges |
| Text Primary | `#f8fafc` | Headings, active states |
| Text Muted | `#94a3b8` / `#64748b` | Descriptions, timestamps, metadata |

### 5.2. Glassmorphism & Micro-Interactions
* `backdrop-filter: blur(24px) saturate(180%)`
* Card hover/tap scale transform (`scale(0.98)` on active tap for haptic sensation)
* Delicate radial gradient auras behind character illustration and active script cards.

---

## 6. Cloud CI/CD Pipeline (GitHub Actions)
* **Trigger:** Push to branch `main` or manual `workflow_dispatch`.
* **Runner:** `ubuntu-latest` (free cloud runner).
* **Toolchain:** Java 17 + Android SDK 34/36.
* **Artifact Output:** `app-debug.apk` and `app-release-unsigned.apk` uploaded to GitHub Run Artifacts & Releases.
* **User Workflow:**
  1. Push code from local workspace.
  2. Cloud builder finishes in 2 minutes.
  3. User downloads `.apk` directly to phone via mobile browser.
