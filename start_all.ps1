$ErrorActionPreference = "Stop"

$oneDrivePath = Join-Path $env:USERPROFILE "OneDrive"
$desktopFolder = [string]([char]0x684C) + [string]([char]0x9762)
$documentsFolder = [string]([char]0x6587) + [string]([char]0x4EF6)
$sitePath = Join-Path (Join-Path $oneDrivePath $desktopFolder) "Jasper's_Music_v1_with_find_key"
$apiPath = Join-Path $sitePath "api-server"
$defaultPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
$pythonExe = if (Test-Path $defaultPython) { $defaultPython } else { "python" }

if (-not (Test-Path $sitePath)) {
    throw "Website folder not found: $sitePath"
}

if (-not (Test-Path $apiPath)) {
    throw "API folder not found: $apiPath"
}

Write-Host "Starting Jam Tracks Hub website..." -ForegroundColor Cyan
Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "http.server", "8088", "--bind", "127.0.0.1" `
    -WorkingDirectory $sitePath `
    -WindowStyle Hidden

Write-Host "Starting Key Finder API..." -ForegroundColor Cyan
Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $apiPath `
    -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Website:        http://127.0.0.1:8088/index.html" -ForegroundColor Green
Write-Host "Tracks:         http://127.0.0.1:8088/tracks.html" -ForegroundColor Green
Write-Host "Chord tools:    http://127.0.0.1:8088/chords.html" -ForegroundColor Green
Write-Host "API health:     http://127.0.0.1:8000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "If a port is already in use, close the old python process or restart VS Code." -ForegroundColor Yellow
