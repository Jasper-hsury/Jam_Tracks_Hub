@echo off
setlocal
cd /d "%~dp0"
echo Jam Tracks Hub - Helper setup step 1
echo.
echo This installs the Python packages needed by the YouTube Helper.
echo If Windows asks for permission, choose Yes.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_youtube_helper_dependencies.ps1"
echo.
echo Finished step 1. If there were no red error messages, run:
echo 2_CONNECT_HELPER_TO_WEBSITE.cmd
echo.
pause
