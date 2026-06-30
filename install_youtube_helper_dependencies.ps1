$ErrorActionPreference = "Stop"

$sitePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$requirementsPath = Join-Path $sitePath "api-server\requirements_api.txt"
$venvPath = Join-Path $sitePath ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

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

function Get-BasePython {
    $candidatePaths = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python310\python.exe"),
        "python"
    )

    foreach ($candidate in $candidatePaths) {
        if ($candidate -ne "python" -and -not (Test-Path $candidate)) {
            continue
        }

        if (Test-PythonVersion $candidate) {
            return $candidate
        }
    }

    throw "Python 3.10 or newer is required. Install Python from https://www.python.org/downloads/windows/ and run this setup again."
}

if (-not (Test-Path $requirementsPath)) {
    throw "Requirements file not found: $requirementsPath"
}

Write-Host "Checking Python..." -ForegroundColor Cyan
$pythonExe = Get-BasePython
& $pythonExe --version

if ((Test-Path $venvPython) -and -not (Test-PythonVersion $venvPython)) {
    $backupPath = "$venvPath-python39-backup-$(Get-Date -Format yyyyMMddHHmmss)"
    Move-Item $venvPath $backupPath
    Write-Host "Backed up old Python environment to $backupPath" -ForegroundColor Yellow
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating local Python environment..." -ForegroundColor Cyan
    & $pythonExe -m venv $venvPath
}

Write-Host "Installing Jasper YouTube Helper dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r $requirementsPath

Write-Host "Checking yt-dlp..." -ForegroundColor Cyan
& $venvPython -m yt_dlp --version
Write-Host "ffmpeg is provided by imageio-ffmpeg inside this helper." -ForegroundColor Green

Write-Host ""
Write-Host "Dependency setup finished." -ForegroundColor Green
Write-Host "Next, run install_youtube_helper_protocol.ps1 once." -ForegroundColor Yellow
