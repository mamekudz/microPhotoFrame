#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dllDir = Join-Path $here "bin\Release\net48"
$dll = Join-Path $dllDir "InkPreviewHandler.dll"
$regasm = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\regasm.exe"
if (-not (Test-Path $regasm)) { Write-Error "regasm nicht gefunden" }
if (-not (Test-Path $dll)) { Write-Error "DLL nicht gefunden: $dll" }
Write-Host "Abmelden in $dllDir…" -ForegroundColor Cyan
Push-Location $dllDir
try {
    & $regasm /unregister "InkPreviewHandler.dll"
}
finally {
    Pop-Location
}
Write-Host "Fertig." -ForegroundColor Green
