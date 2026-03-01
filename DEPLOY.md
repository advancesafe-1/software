# AdvanceSafe — Deployment and build

## Where data is stored

**The database and all app data are stored only on the PC where the software is installed.**

- **Install location:** `C:\Program Files\AdvanceSafe\` (the .exe and app files).
- **Data location (on that same PC):**  
  `C:\Users\<username>\AppData\Roaming\AdvanceSafe\`
  - `data\advancesafe.db` — SQLite database (incidents, sensors, workers, settings, etc.)
  - `reports\` — Generated PDF reports
  - `logs\` — Log files
  - Encrypted credentials (Twilio, Firebase) are also stored under this folder.

So: wherever you install and run the .exe, that machine’s local drive holds the database. There is no central server database; each installation has its own local DB. Firebase (if configured) is only an optional copy for remote viewing.

---

## Building the .exe installer

The app is ready to build. Follow these steps.

### 1. One-time: Windows icon

The installer needs `build/icon.ico`. If you don’t have it yet:

1. Use the logo: `assets/advancesafe-logo.png`.
2. Convert it to a Windows .ico (sizes 256, 128, 64, 32, 16) at [convertio.co/png-ico](https://convertio.co/png-ico/) or [icoconvert.com](https://icoconvert.com/).
3. Save as **`build/icon.ico`** in the project root.

Without this file, the installer build can fail.

### 2. Install dependencies (if not already done)

```bash
npm install
```

### 3. Build the installer

```bash
npm run build:installer
```

Or use the PowerShell script:

```powershell
.\scripts\build-installer.ps1
```

### 4. Output

The installer is created at:

**`dist-installer\AdvanceSafe-Setup-1.0.0.exe`**

Use this .exe on any Windows 10/11 64-bit PC. Run it as Administrator so it can install to Program Files, add firewall rules, and (if present) install the MQTT service.

---

## Optional before release

- **Code signing:** Run `.\scripts\generate-cert.ps1` (as Administrator) to create a self-signed cert, then set `CSC_LINK` and `CSC_KEY_PASSWORD` when running the build. For production, use a proper EV code-signing certificate.
- **Installer art:** Add `build/installer-header.bmp` (150×57) and `build/installer-sidebar.bmp` (164×314) for custom NSIS branding. Not required for a working installer.

---

## Summary

| Question | Answer |
|----------|--------|
| Where is the database? | On the same PC where the .exe is installed, under `AppData\Roaming\AdvanceSafe\data\`. |
| Is the software complete for building the .exe? | Yes. You only need to add `build/icon.ico` (from the logo PNG), then run `npm run build:installer`. |
