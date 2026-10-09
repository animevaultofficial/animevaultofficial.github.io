$ErrorActionPreference = 'Stop'

# Standalone installer: does not require a cloned repository.
# Download the console from its raw file URL with a cache-busting query.
$rawUrl = 'https://raw.githubusercontent.com/animevaultofficial/animevaultofficial.github.io/main/tools/animevault-developer-admin-console/animevault-console.mjs'

$profileDir = [Environment]::GetFolderPath('UserProfile')
if ([string]::IsNullOrWhiteSpace($profileDir)) { $profileDir = $HOME }
if ([string]::IsNullOrWhiteSpace($profileDir)) { throw 'Could not determine your Windows user profile folder.' }

$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
if ([string]::IsNullOrWhiteSpace($localAppData)) {
    $localAppData = Join-Path $profileDir 'AppData\Local'
}
$appDir = Join-Path $localAppData 'Programs\AnimeVaultDeveloperAdminConsole'
$binDir = Join-Path $profileDir 'bin'
$consolePath = Join-Path $appDir 'animevault-console.mjs'
$commandPath = Join-Path $binDir 'animevault.cmd'

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

Write-Host 'Downloading AnimeVault Developer Admin Console from GitHub...' -ForegroundColor Cyan
$downloadUrl = $rawUrl + '?cachebust=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
Invoke-WebRequest -Uri $downloadUrl -OutFile $consolePath -Headers @{ 'User-Agent' = 'AnimeVault-Developer-Admin-Console-Installer' }

$source = [IO.File]::ReadAllText($consolePath, [Text.Encoding]::UTF8)
if ($source.Length -lt 1000 -or $source -notmatch 'AnimeVault') {
    Remove-Item -LiteralPath $consolePath -Force -ErrorAction SilentlyContinue
    throw 'The downloaded console source looks incomplete. No command was installed.'
}

$escapedConsole = $consolePath.Replace('"', '""')
$command = @"
@echo off
setlocal
title AnimeVault Developer Admin Console
node "$escapedConsole" %*
"@
Set-Content -LiteralPath $commandPath -Value $command -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @()
if (-not [string]::IsNullOrWhiteSpace($userPath)) {
    $entries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}
$already = @($entries | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }).Count -gt 0
if (-not $already) {
    [Environment]::SetEnvironmentVariable('Path', (@($entries) + $binDir) -join ';', 'User')
}
if (@($env:Path -split ';' | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }).Count -eq 0) {
    $env:Path = "$binDir;$env:Path"
}

Write-Host ''
Write-Host 'AnimeVault Developer Admin Console installed successfully.' -ForegroundColor Green
Write-Host "App files: $appDir"
Write-Host "Command:   $commandPath"
Write-Host ''
Write-Host 'Open a NEW PowerShell or Windows Terminal window and type: animevault'
Write-Host 'Inside the console, choose [P] to link a local AnimeVault repository.'