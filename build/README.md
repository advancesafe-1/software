# AdvanceSafe build assets

## Logo and icon

- **assets/advancesafe-logo.png** — Project logo (use for icon and installer art).
- **icon.ico** — Windows app icon (required for build). Convert the logo to ICO with sizes 256, 128, 64, 32, 16:
  - Use [convertio.co/png-ico](https://convertio.co/png-ico/) or [icoconvert.com](https://icoconvert.com/), or
  - Run the build script: it copies `assets/advancesafe-logo.png` to `build/logo.png`. Then convert `build/logo.png` to `build/icon.ico` and re-run the installer build.
- **installer-header.bmp** — NSIS header, 150×57 px. Use the logo on a dark background.
- **installer-sidebar.bmp** — NSIS sidebar, 164×314 px. Use the logo/branding on a dark background.

If the BMPs are missing, the installer still builds with default NSIS branding.

## Optional: Mosquitto MQTT

Place Mosquitto Windows binaries in **resources/mosquitto/** at project root:

- mosquitto.exe
- mosquitto.conf
- mosquitto_passwd.exe
- libssl-3-x64.dll, libcrypto-3-x64.dll (and any other DLLs from the Mosquitto package)

Download from https://mosquitto.org/download/ (Windows 64-bit). The custom NSIS script will install Mosquitto as a Windows service if this folder exists.
