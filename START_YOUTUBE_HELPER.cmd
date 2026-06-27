@echo off
setlocal
cd /d "%~dp0"
echo Starting Jasper's Music YouTube Helper...
echo Keep this window open while using YouTube link analysis.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_youtube_helper.ps1"
pause
