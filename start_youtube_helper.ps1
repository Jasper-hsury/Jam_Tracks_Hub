$ErrorActionPreference = "Stop"

$sitePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiPath = Join-Path $sitePath "api-server"
$defaultPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
$pythonExe = if (Test-Path $defaultPython) { $defaultPython } else { "python" }
$helperUrl = "http://127.0.0.1:8765"

function Test-YoutubeHelper {
    try {
        $response = Invoke-RestMethod -Uri "$helperUrl/api/health" -Method Get -TimeoutSec 2
        return $response.status -eq "ok"
    }
    catch {
        return $false
    }
}

if (-not (Test-Path $apiPath)) {
    throw "API folder not found: $apiPath"
}

if (Test-YoutubeHelper) {
    Write-Host "Jasper YouTube Helper is already running at $helperUrl" -ForegroundColor Green
    exit 0
}

Write-Host "Starting Jasper YouTube Helper..." -ForegroundColor Cyan
Write-Host "Keep this window open while using YouTube link analysis." -ForegroundColor Yellow
Write-Host "Helper URL: $helperUrl" -ForegroundColor Green
Write-Host ""

$env:OMP_NUM_THREADS = "1"
$env:OPENBLAS_NUM_THREADS = "1"
$env:MKL_NUM_THREADS = "1"
$env:NUMEXPR_NUM_THREADS = "1"
$env:PYTHONUNBUFFERED = "1"

& $pythonExe -m uvicorn app:app --host 127.0.0.1 --port 8765 --workers 1 --app-dir $apiPath
