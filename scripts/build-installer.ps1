# AdvanceSafe Windows installer build script
# Run from project root

$ErrorActionPreference = "Stop"
Write-Host "=== AdvanceSafe Build Script ===" -ForegroundColor Cyan
Write-Host "Building AdvanceSafe Windows Installer"
Write-Host ""

$nodeVersion = node --version
Write-Host "Node.js: $nodeVersion"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci 2>$null; if ($LASTEXITCODE -ne 0) { npm install }

Write-Host "Compiling Electron TypeScript..." -ForegroundColor Yellow
npx tsc -p tsconfig.electron.json
if ($LASTEXITCODE -ne 0) {
  Write-Host "TypeScript errors found!" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "build\icon.ico")) {
  if (Test-Path "assets\icon.ico") {
    Copy-Item "assets\icon.ico" "build\icon.ico"
    Write-Host "Copied assets/icon.ico to build/icon.ico"
  } elseif (Test-Path "assets\advancesafe-logo.png") {
    Copy-Item "assets\advancesafe-logo.png" "build\logo.png"
    Write-Host "Copied assets/advancesafe-logo.png to build/logo.png — convert build/logo.png to build/icon.ico (e.g. convertio.co/png-ico) then re-run this script."
  }
}
Write-Host "Building React frontend..." -ForegroundColor Yellow
npx vite build
if ($LASTEXITCODE -ne 0) {
  Write-Host "Vite build failed!" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "resources\mosquitto")) {
  Write-Host "WARNING: resources\mosquitto not found. MQTT service will not be installed. Download from mosquitto.org and place in resources/mosquitto/" -ForegroundColor Yellow
}

Write-Host "Building Windows installer..." -ForegroundColor Yellow
npx electron-builder --win --x64 --config electron-builder.yml
if ($LASTEXITCODE -ne 0) {
  Write-Host "Installer build failed!" -ForegroundColor Red
  exit 1
}

$outDir = "dist-installer"
$installer = Get-ChildItem -Path $outDir -Filter "*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($installer) {
  $sizeMB = [math]::Round($installer.Length / 1MB, 1)
  Write-Host ""
  Write-Host "=== BUILD COMPLETE ===" -ForegroundColor Green
  Write-Host "Installer: $($installer.FullName)"
  Write-Host "Size: $sizeMB MB"
  Write-Host ""
  Write-Host "Ready for deployment!"
} else {
  Write-Host "Installer not found in $outDir" -ForegroundColor Red
  exit 1
}
