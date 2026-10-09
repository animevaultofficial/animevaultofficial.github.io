@echo off
setlocal
title AnimeVault Terminal
cd /d "%~dp0"
:menu
cls
echo ==========================================================
echo                    ANIMEVAULT TERMINAL
echo ==========================================================
echo Repository: animevaultofficial/animevaultofficial.github.io
echo.
echo  [1] Run full diagnostics (unit tests + production build + live site)
echo  [2] Run unit tests
echo  [3] Build production website
echo  [4] Check live AnimeVault website
echo  [5] Start local development server
echo  [6] Install project dependencies
echo  [7] Show recent Git commits
echo  [8] Pull latest changes from GitHub
echo  [9] Open repository in browser
echo  [0] Exit
echo.
set /p choice=Select an option: 

if "%choice%"=="1" goto full
if "%choice%"=="2" goto unit
if "%choice%"=="3" goto build
if "%choice%"=="4" goto live
if "%choice%"=="5" goto dev
if "%choice%"=="6" goto install
if "%choice%"=="7" goto gitlog
if "%choice%"=="8" goto pull
if "%choice%"=="9" goto browser
if "%choice%"=="0" exit /b 0
echo Invalid option.
pause
goto menu

:full
cls
echo Running all diagnostics...
node scripts\animevault-doctor.mjs
pause
goto menu

:unit
cls
echo Running unit tests...
npm test
pause
goto menu

:build
cls
echo Building production website...
npm run build
pause
goto menu

:live
cls
echo Checking production website...
node scripts\animevault-doctor.mjs --live
pause
goto menu

:dev
cls
echo Starting Vite development server. Press Ctrl+C to stop it.
npm run dev
pause
goto menu

:install
cls
echo Installing project dependencies...
npm install
pause
goto menu

:gitlog
cls
git log -8 --oneline
pause
goto menu

:pull
cls
echo Pulling latest changes from origin/main...
git pull origin main
pause
goto menu

:browser
start "" "https://github.com/animevaultofficial/animevaultofficial.github.io"
goto menu
