@echo off
title Majestic - Push to GitHub
cd /d "%~dp0"
echo =====================================================================
echo  Majestic Custom Jewellery Designer -- GitHub Automatic Connect
echo =====================================================================
echo.

set "PATH=%~dp0.tools\git\cmd;%~dp0.tools\git\mingw64\bin;%PATH%"

echo Verifying Git and Credential Manager...
git config --global credential.helper manager
git config --global credential.useHttpPath true

echo Remote repository:
git remote -v

echo.
echo Pushing branch 'main' to GitHub:
echo https://github.com/majesticsince1970-svg/Majestic-Custom-Jewellery-Designer.git
echo.
echo [INFO] If prompted, click "Sign in with your browser" to authorize.
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo =====================================================================
    echo  [SUCCESS] All files and commits successfully pushed to GitHub!
    echo =====================================================================
) else (
    echo =====================================================================
    echo  [NOTICE] If you prefer using a Personal Access Token:
    echo  1. Create a token with 'repo' scope at: https://github.com/settings/tokens
    echo  2. Enter your GitHub username and the token as password.
    echo =====================================================================
)
echo.
pause
