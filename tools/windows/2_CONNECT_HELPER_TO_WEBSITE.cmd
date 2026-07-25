@echo off
setlocal
cd /d "%~dp0"
echo Jam Tracks Hub - Helper setup step 2
echo.
echo This lets the website open the local YouTube Helper from your browser.
echo If Windows asks for permission, choose Yes.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_youtube_helper_protocol.ps1"
echo.
echo Finished step 2. Go back to the Key Finder page and click Start Helper.
echo.
pause
