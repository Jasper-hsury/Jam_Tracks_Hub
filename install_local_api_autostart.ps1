$ErrorActionPreference = "Stop"

$sitePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $sitePath "start_local_api_background.ps1"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "Jasper's Music API.lnk"
$powershellPath = Join-Path $PSHOME "powershell.exe"

if (-not (Test-Path $launcherPath)) {
    throw "Background API launcher not found: $launcherPath"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`""
$shortcut.WorkingDirectory = $sitePath
$shortcut.WindowStyle = 7
$shortcut.Description = "Start Jasper's Music Key Finder API after Windows login"
$shortcut.Save()

Write-Host "Autostart installed:" -ForegroundColor Green
Write-Host $shortcutPath

& $launcherPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Key Finder API is online at http://127.0.0.1:8000" -ForegroundColor Green
}
else {
    Write-Warning "The API did not become ready within 30 seconds. Check:"
    Write-Warning (Join-Path $env:LOCALAPPDATA "JaspersMusic\api-error.log")
}
