$ErrorActionPreference = "Stop"

$toolPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sitePath = (Resolve-Path (Join-Path $toolPath "..\..")).Path
$launcherPath = Join-Path $toolPath "start_local_api_background.ps1"
$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "Jam Tracks Hub API.lnk"
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
$shortcut.Description = "Start Jam Tracks Hub Key Finder API after Windows login"
$shortcut.Save()

Write-Host "Autostart installed:" -ForegroundColor Green
Write-Host $shortcutPath

& $launcherPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "Key Finder API is online at http://127.0.0.1:8000" -ForegroundColor Green
}
else {
    Write-Warning "The API did not become ready within 30 seconds. Check:"
    Write-Warning (Join-Path $env:LOCALAPPDATA "JamTracksHub\api-error.log")
}
