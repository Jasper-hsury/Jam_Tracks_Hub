$ErrorActionPreference = "Stop"

$sitePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$requirementsPath = Join-Path $sitePath "api-server\requirements_api.txt"
$defaultPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
$pythonExe = if (Test-Path $defaultPython) { $defaultPython } else { "python" }

if (-not (Test-Path $requirementsPath)) {
    throw "Requirements file not found: $requirementsPath"
}

Write-Host "Checking Python..." -ForegroundColor Cyan
& $pythonExe --version

Write-Host "Upgrading pip..." -ForegroundColor Cyan
& $pythonExe -m pip install --upgrade pip

Write-Host "Installing Jasper YouTube Helper dependencies..." -ForegroundColor Cyan
& $pythonExe -m pip install -r $requirementsPath

try {
    & ffmpeg -version | Out-Null
    Write-Host "ffmpeg found." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ffmpeg was not found." -ForegroundColor Yellow
    Write-Host "Install it with one of these commands, then run this setup again if needed:" -ForegroundColor Yellow
    Write-Host "  winget install Gyan.FFmpeg" -ForegroundColor Cyan
    Write-Host "  winget install --id Gyan.FFmpeg -e" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Dependency setup finished." -ForegroundColor Green
Write-Host "Next, run install_youtube_helper_protocol.ps1 once." -ForegroundColor Yellow
