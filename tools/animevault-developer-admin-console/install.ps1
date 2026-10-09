$ErrorActionPreference = 'Stop'

# Standalone installer: intentionally does not require a cloned repository.
# Use the GitHub Contents API rather than raw.githubusercontent.com, which may
# serve a stale cached copy of this installer or the console.
$repo = 'animevaultofficial/animevaultofficial.github.io'
$consoleRepoPath = 'tools/animevault-developer-admin-console/animevault-console.mjs'
$apiUrl = "https://api.github.com/repos/$repo/contents/$consoleRepoPath?ref=main"

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
$response = Invoke-RestMethod -Uri $apiUrl -Headers @{ 'User-Agent' = 'AnimeVault-Developer-Admin-Console-Installer'; 'Accept' = 'application/vnd.github+json' }
if ($response.encoding -ne 'base64' -or [string]::IsNullOrWhiteSpace($response.content)) {
    throw "GitHub did not return the console source in the expected format: $apiUrl"
}
$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(($response.content -replace '\s', '')))
if ($source.Length -lt 1000 -or $source -notmatch 'AnimeVault') {
    throw 'The downloaded console source looks incomplete. No command was installed.'
}
[IO.File]::WriteAllText($consolePath, $source, [Text.UTF8Encoding]::new($false))

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
