@echo off
title Connect GitHub and Deploy - Majestic
cd /d "%~dp0"
echo =====================================================================
echo  Majestic Custom Jewellery Designer -- 1-Click GitHub Connect
echo =====================================================================
echo.
echo Step 1: Authorizing GitHub via Browser...
echo (A one-time code will appear below and your browser will open)
echo.

".tools\gh\gh.exe" auth login --hostname github.com -p https -w

echo.
echo Step 2: Configuring Git credentials...
".tools\gh\gh.exe" auth setup-git

echo.
echo Step 3: Pushing main branch to GitHub...
set "PATH=%~dp0.tools\git\cmd;%PATH%"
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo =====================================================================
    echo  [SUCCESS] All code has been pushed to GitHub!
    echo  Vercel is now automatically building your live website.
    echo =====================================================================
) else (
    echo [ERROR] Push failed. Please verify GitHub permissions.
)
echo.
pause

