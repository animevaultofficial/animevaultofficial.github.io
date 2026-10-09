$ErrorActionPreference = 'Stop'
$installer = Join-Path $PSScriptRoot 'tools\animevault-developer-admin-console\install.ps1'
if (-not (Test-Path -LiteralPath $installer)) {
    throw "Installer not found: $installer. Run git pull origin main first."
}
& $installer
