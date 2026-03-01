# Generate self-signed code signing certificate for AdvanceSafe (development/demo)
# Run as Administrator in PowerShell

$cert = New-SelfSignedCertificate `
  -Type CodeSigningCert `
  -Subject "CN=AdvanceSafe, O=Advanced SOS Max, L=Ahmedabad, S=Gujarat, C=IN" `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(3)

$password = ConvertTo-SecureString -String "YourPasswordHere" -Force -AsPlainText
$buildDir = Join-Path $PSScriptRoot "..\build"
if (-not (Test-Path $buildDir)) { New-Item -ItemType Directory -Path $buildDir -Force | Out-Null }
$pfxPath = Join-Path $buildDir "advancesafe-cert.pfx"

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password

Write-Host "Certificate created:" -ForegroundColor Green
Write-Host "Thumbprint: $($cert.Thumbprint)"
Write-Host "Saved to: $pfxPath"
Write-Host ""
Write-Host "For build signing set:" -ForegroundColor Yellow
Write-Host "  `$env:CSC_LINK = '$pfxPath'"
Write-Host "  `$env:CSC_KEY_PASSWORD = 'YourPasswordHere'"
Write-Host ""
Write-Host "For production: use a real EV Code Signing Certificate from DigiCert, Sectigo, or GlobalSign (~$300-500 USD/year) to pass Windows SmartScreen."
