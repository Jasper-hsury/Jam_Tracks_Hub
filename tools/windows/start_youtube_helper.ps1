$ErrorActionPreference = "Stop"

$toolPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sitePath = (Resolve-Path (Join-Path $toolPath "..\..")).Path
$apiPath = Join-Path $sitePath "api-server"
$setupScript = Join-Path $toolPath "install_youtube_helper_dependencies.ps1"
$venvPython = Join-Path $sitePath ".venv\Scripts\python.exe"
$helperUrl = "http://127.0.0.1:8765"

function Test-PythonVersion {
    param([string]$PythonExe)

    try {
        & $PythonExe -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" | Out-Null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

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

if ((-not (Test-Path $venvPython)) -or (-not (Test-PythonVersion $venvPython))) {
    Write-Host "Preparing the local YouTube Helper dependencies..." -ForegroundColor Cyan
    & powershell -NoProfile -ExecutionPolicy Bypass -File $setupScript
}

if (Test-YoutubeHelper) {
    Write-Host "the local YouTube Helper is already running at $helperUrl" -ForegroundColor Green
    exit 0
}

Write-Host "Starting the local YouTube Helper..." -ForegroundColor Cyan
Write-Host "Keep this window open while using YouTube link analysis." -ForegroundColor Yellow
Write-Host "Helper URL: $helperUrl" -ForegroundColor Green
Write-Host ""

$env:OMP_NUM_THREADS = "1"
$env:OPENBLAS_NUM_THREADS = "1"
$env:MKL_NUM_THREADS = "1"
$env:NUMEXPR_NUM_THREADS = "1"
$env:PYTHONUNBUFFERED = "1"

& $venvPython -m uvicorn app:app --host 127.0.0.1 --port 8765 --workers 1 --app-dir $apiPath
