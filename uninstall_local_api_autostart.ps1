$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupFolder "Jasper's Music API.lnk"

if (Test-Path $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
    Write-Host "Autostart removed." -ForegroundColor Green
}
else {
    Write-Host "Autostart was not installed." -ForegroundColor Yellow
}
