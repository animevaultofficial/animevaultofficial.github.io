$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$consolePath = Join-Path $repoRoot 'scripts\animevault-console.mjs'
$packagePath = Join-Path $repoRoot 'package.json'

if (-not (Test-Path -LiteralPath $consolePath)) {
    Write-Host '[ERROR] AnimeVault console was not found.' -ForegroundColor Red
    Write-Host "Expected: $consolePath"
    exit 1
}
if (-not (Test-Path -LiteralPath $packagePath)) {
    Write-Host '[ERROR] Run this installer from the AnimeVault repository folder.' -ForegroundColor Red
    exit 1
}

$binDir = Join-Path $env:USERPROFILE 'bin'
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

$commandPath = Join-Path $binDir 'animevault.cmd'
$escapedRoot = $repoRoot.Replace('"', '""')
$command = @"
@echo off
setlocal
cd /d "$escapedRoot"
if errorlevel 1 (
  echo [ERROR] Could not open the AnimeVault project folder.
  echo If you moved the repository, rerun install-animevault-command.ps1.
  exit /b 1
)
node scripts\animevault-console.mjs %*
"@
Set-Content -LiteralPath $commandPath -Value $command -Encoding ASCII

$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$pathEntries = @()
if (-not [string]::IsNullOrWhiteSpace($userPath)) {
    $pathEntries = @($userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}
$alreadyOnPath = $pathEntries | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }
if (-not $alreadyOnPath) {
    $newPath = (@($pathEntries) + $binDir) -join ';'
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}
if (($env:Path -split ';' | Where-Object { $_.TrimEnd('\') -ieq $binDir.TrimEnd('\') }).Count -eq 0) {
    $env:Path = "$binDir;$env:Path"
}

Write-Host ''
Write-Host 'AnimeVault command installed!' -ForegroundColor Green
Write-Host "Command: $commandPath"
Write-Host ''
Write-Host 'Open a NEW Windows Terminal / PowerShell window, then type:' -ForegroundColor Cyan
Write-Host '  animevault' -ForegroundColor White
Write-Host ''
Write-Host 'This command launches the AnimeVault Developer World console.'
Write-Host 'It does not install secrets or change your .env.local file.'
