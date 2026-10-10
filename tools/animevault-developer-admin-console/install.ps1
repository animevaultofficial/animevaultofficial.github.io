$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Standalone installer: does not clone or download the AnimeVault website repository.
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js is required. Install Node.js 22.12 or newer, open a new terminal, and run this installer again.'
}

$profileDir = [Environment]::GetFolderPath('UserProfile')
if ([string]::IsNullOrWhiteSpace($profileDir)) { $profileDir = $HOME }
if ([string]::IsNullOrWhiteSpace($profileDir)) { throw 'Could not determine your Windows user profile folder.' }

$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
if ([string]::IsNullOrWhiteSpace($localAppData)) { $localAppData = Join-Path $profileDir 'AppData\Local' }

$appDir = Join-Path $localAppData 'Programs\AnimeVaultDeveloperAdminConsole'
$binDir = Join-Path $profileDir 'bin'
$consolePath = Join-Path $appDir 'animevault-console.mjs'
$tempPath = Join-Path $appDir ('animevault-console.mjs.download-' + [guid]::NewGuid().ToString('N'))
$commandPath = Join-Path $binDir 'animevault.cmd'
$rawUrl = 'https://raw.githubusercontent.com/animevaultofficial/animevaultofficial.github.io/main/tools/animevault-developer-admin-console/animevault-console.mjs'
$downloadUrl = $rawUrl + '?cachebust=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

New-Item -ItemType Directory -Path $appDir -Force | Out-Null
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

try {
    Write-Host 'Downloading AnimeVault Terminal...' -ForegroundColor Cyan
    Invoke-WebRequest -UseBasicParsing -Uri $downloadUrl -OutFile $tempPath -Headers @{ 'User-Agent' = 'AnimeVault-Terminal-Installer' }

    $source = [IO.File]::ReadAllText($tempPath, [Text.Encoding]::UTF8)
    if ($source.Length -lt 5000 -or $source -notmatch 'ANIMEVAULT TERMINAL' -or $source -notmatch 'function execute') {
        throw 'The downloaded console source failed validation. No command was installed.'
    }

    # Replace the installed console only after the download has passed validation.
    Move-Item -LiteralPath $tempPath -Destination $consolePath -Force

    $command = @"
@echo off
setlocal
title AnimeVault Terminal
node "$consolePath" %*
"@
    Set-Content -LiteralPath $commandPath -Value $command -Encoding ASCII

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @()
    if (-not [string]::IsNullOrWhiteSpace($userPath)) {
        $entries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    $already = @($entries | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }).Count -gt 0
    if (-not $already) {
        $newUserPath = (@($entries) + $binDir) -join ';'
        [Environment]::SetEnvironmentVariable('Path', $newUserPath, 'User')
    }

    $processEntries = @()
    if (-not [string]::IsNullOrWhiteSpace($env:Path)) {
        $processEntries = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    if (@($processEntries | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }).Count -eq 0) {
        $env:Path = (@($binDir) + $processEntries) -join ';'
    }

    Write-Host ''
    Write-Host 'AnimeVault Terminal installed successfully.' -ForegroundColor Green
    Write-Host "Program: $consolePath"
    Write-Host "Command: $commandPath"
    Write-Host ''
    Write-Host 'Open a NEW terminal window and type: animevault'
    Write-Host 'Then use /help to see slash commands.'
}
finally {
    Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
}
