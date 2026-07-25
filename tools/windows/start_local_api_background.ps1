$ErrorActionPreference = "Stop"

$toolPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sitePath = (Resolve-Path (Join-Path $toolPath "..\..")).Path
$apiPath = Join-Path $sitePath "api-server"
$defaultPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"
$pythonExe = if (Test-Path $defaultPython) { $defaultPython } else { "python" }
$logDirectory = Join-Path $env:LOCALAPPDATA "JamTracksHub"
$outputLog = Join-Path $logDirectory "api-output.log"
$errorLog = Join-Path $logDirectory "api-error.log"
$healthUrl = "http://127.0.0.1:8000/api/health"

function Test-KeyFinderApi {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 2
        return $response.status -eq "ok"
    }
    catch {
        return $false
    }
}

if (Test-KeyFinderApi) {
    exit 0
}

if (-not (Test-Path $apiPath)) {
    throw "API folder not found: $apiPath"
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

$env:OMP_NUM_THREADS = "1"
$env:OPENBLAS_NUM_THREADS = "1"
$env:MKL_NUM_THREADS = "1"
$env:NUMEXPR_NUM_THREADS = "1"
$env:PYTHONUNBUFFERED = "1"

Start-Process -FilePath $pythonExe `
    -ArgumentList "-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000", "--workers", "1" `
    -WorkingDirectory $apiPath `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outputLog `
    -RedirectStandardError $errorLog

for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1

    if (Test-KeyFinderApi) {
        exit 0
    }
}

exit 1
