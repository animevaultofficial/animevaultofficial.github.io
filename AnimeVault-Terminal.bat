@echo off
setlocal
title AnimeVault Developer World
cd /d "%~dp0"
if not exist "package.json" (
  echo [ERROR] This launcher must be inside the AnimeVault repository folder.
  echo Clone: https://github.com/animevaultofficial/animevaultofficial.github.io
  pause
  exit /b 1
)
if not exist "scripts\animevault-console.mjs" (
  echo [ERROR] Console file is missing. Pull the latest main branch first.
  pause
  exit /b 1
)
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not on PATH.
  echo Install Node.js 22.12 or newer, then reopen Windows Terminal.
  pause
  exit /b 1
)
node scripts\animevault-console.mjs
if errorlevel 1 (
  echo.
  echo AnimeVault console exited with an error.
  pause
)
