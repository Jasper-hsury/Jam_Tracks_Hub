$ErrorActionPreference = "Stop"

$toolPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sitePath = (Resolve-Path (Join-Path $toolPath "..\..")).Path
$apiPath = Join-Path $sitePath "api-server"
$defaultPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
$pythonExe = if (Test-Path $defaultPython) { $defaultPython } else { "python" }

if (-not (Test-Path $apiPath)) {
    throw "API folder not found: $apiPath"
}

Write-Host "Starting Render-style local server..." -ForegroundColor Cyan
Write-Host "Website and API will both run from http://127.0.0.1:8000" -ForegroundColor Green

& $pythonExe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload --app-dir $apiPath
