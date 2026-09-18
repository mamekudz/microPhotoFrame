#Requires -RunAsAdministrator
<#
  Registriert die COM-Vorschau-DLL für .ink (SharpShell / Explorer).
  Läuft in bin\Release\net48, damit regasm Abhängigkeiten findet.
#>
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dllDir = Join-Path $here "bin\Release\net48"
$dll = Join-Path $dllDir "InkPreviewHandler.dll"
if (-not (Test-Path $dll)) {
    Write-Error "DLL nicht gefunden: $dll — zuerst: dotnet build -c Release (oder npm run build:win-preview)"
}
$regasm = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\regasm.exe"
if (-not (Test-Path $regasm)) {
    Write-Error "regasm nicht gefunden: $regasm"
}
Write-Host "Registriere in $dllDir (64-Bit, /codebase)…" -ForegroundColor Cyan
Push-Location $dllDir
try {
    & $regasm "InkPreviewHandler.dll" /codebase
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}
Write-Host "Fertig. Oder install.cmd aus win-preview-handler (findet net48 automatisch)." -ForegroundColor Green
