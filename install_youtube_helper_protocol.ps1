$ErrorActionPreference = "Stop"

$sitePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperScript = Join-Path $sitePath "start_youtube_helper.ps1"
$protocolRoot = "HKCU:\Software\Classes\jasper-helper"
$commandKey = Join-Path $protocolRoot "shell\open\command"
$powershellExe = Join-Path $PSHOME "powershell.exe"

if (-not (Test-Path $helperScript)) {
    throw "Helper script not found: $helperScript"
}

New-Item -Path $protocolRoot -Force | Out-Null
Set-Item -Path $protocolRoot -Value "URL:Jasper Music YouTube Helper"
New-ItemProperty -Path $protocolRoot -Name "URL Protocol" -Value "" -PropertyType String -Force | Out-Null

New-Item -Path $commandKey -Force | Out-Null
$command = "`"$powershellExe`" -NoProfile -ExecutionPolicy Bypass -File `"$helperScript`" `"%1`""
Set-Item -Path $commandKey -Value $command

Write-Host "Jasper YouTube Helper protocol installed." -ForegroundColor Green
Write-Host "Protocol: jasper-helper://start" -ForegroundColor Cyan
Write-Host "Helper script: $helperScript" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now click Start Helper on the Key Finder page." -ForegroundColor Yellow
