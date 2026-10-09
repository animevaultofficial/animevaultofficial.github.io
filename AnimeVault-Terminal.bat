@echo off
setlocal
title AnimeVault Developer Admin Console
cd /d "%~dp0"
if not exist "package.json" (
  echo [ERROR] This launcher must be inside the AnimeVault repository folder.
  pause
  exit /b 1
)
if not exist "tools\animevault-developer-admin-console\animevault-console.mjs" (
  echo [ERROR] Console files missing. Run git pull origin main.
  pause
  exit /b 1
)
node "tools\animevault-developer-admin-console\animevault-console.mjs"
if errorlevel 1 (
  echo.
  echo AnimeVault Developer Admin Console exited with an error.
  pause
)
