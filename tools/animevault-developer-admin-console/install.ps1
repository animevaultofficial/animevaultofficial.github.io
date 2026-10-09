$ErrorActionPreference = 'Stop'

# This script lives in tools\animevault-developer-admin-console.
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$consolePath = Join-Path $PSScriptRoot 'animevault-console.mjs'
$packagePath = Join-Path $repoRoot 'package.json'

if (-not (Test-Path -LiteralPath $consolePath)) {
    throw "Console file not found: $consolePath"
}
if (-not (Test-Path -LiteralPath $packagePath)) {
    throw "AnimeVault package.json not found at $repoRoot"
}

$binDir = Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Path $binDir -Force | Out-Null
$commandPath = Join-Path $binDir 'animevault.cmd'
$escapedRoot = $repoRoot.Replace('"', '""')
$escapedConsole = $consolePath.Replace('"', '""')

$command = @"
@echo off
setlocal
title AnimeVault Developer Admin Console
cd /d "$escapedRoot"
if errorlevel 1 (
  echo [ERROR] Cannot open the AnimeVault repository.
  exit /b 1
)
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
Write-Host 'AnimeVault Developer Admin Console installed.' -ForegroundColor Green
Write-Host "Repository: $repoRoot"
Write-Host "Command:    $commandPath"
Write-Host ''
Write-Host 'Open a NEW Windows Terminal window and type: animevault'
Write-Host 'To reinstall after moving the repository, rerun this installer.'
