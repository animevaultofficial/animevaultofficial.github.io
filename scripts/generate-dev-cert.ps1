# PowerShell helper to generate a self-signed code-signing certificate
# for local AnimeVault Windows builds.
#
# IMPORTANT:
# - Never commit the generated .pfx file.
# - Never hard-code the PFX password in source control.
# - For CI, store the certificate and password in GitHub Actions secrets.

$ErrorActionPreference = "Stop"

$defaultOutPath = Join-Path (Get-Location) "animevault-code-signing.pfx"
$outPath = Read-Host "PFX output path [$defaultOutPath]"
if ([string]::IsNullOrWhiteSpace($outPath)) { $outPath = $defaultOutPath }

$pwd = Read-Host "Enter a strong PFX password" -AsSecureString

Write-Host "Generating self-signed code-signing certificate..."
Write-Host "  Subject    : CN=AnimeVault"
Write-Host "  Key Length : 2048"
Write-Host "  Output PFX : $outPath"

$cert = New-SelfSignedCertificate `
    -Subject "CN=AnimeVault" `
    -KeyExportPolicy Exportable `
    -KeyLength 2048 `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyUsage DigitalSignature `
    -Type CodeSigningCert

Export-PfxCertificate `
    -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
    -FilePath $outPath `
    -Password $pwd `
    -ChainOption BuildChain

try {
    Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Could not remove the certificate from the personal store: $_"
}

Write-Host ""
Write-Host "Certificate generated successfully."
Write-Host "Keep the PFX and password private. Do not commit the PFX to Git."
