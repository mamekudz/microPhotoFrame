@echo off
setlocal EnableExtensions
:: Schreibt die globale UXP-Entwicklereinstellung (Adobe). Erfordert Administrator.
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Dieses Skript muss als Administrator ausgefuehrt werden:
  echo  Rechtsklick -^> Als Administrator ausfuehren
  echo.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d = Join-Path $env:CommonProgramFiles 'Adobe\\UXP\\Developer';" ^
  "New-Item -ItemType Directory -Force -Path $d | Out-Null;" ^
  "$p = Join-Path $d 'settings.json';" ^
  "$o = (@{ developer = $true } | ConvertTo-Json -Compress);" ^
  "[System.IO.File]::WriteAllText($p, $o, (New-Object System.Text.UTF8Encoding $false))"

set "CFG=%CommonProgramFiles%\Adobe\UXP\Developer\settings.json"
if not exist "%CFG%" (
  echo FEHLER: Konnte nicht schreiben: %CFG%
  pause
  exit /b 1
)

echo.
echo  UXP-Entwicklermodus aktiviert:
echo  %CFG%
echo.
echo  Photoshop komplett beenden und neu starten.
echo  Danach sollte INK E-Paper unter Plugins erscheinen (nach install.cmd).
echo.
pause
