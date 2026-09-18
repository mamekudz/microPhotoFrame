@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
set "PLUGIN_ID=com.inkencoder.photoshop"
set "DEST=%APPDATA%\Adobe\UXP\Plugins\External\%PLUGIN_ID%"

echo.
echo  INK E-Paper (Photoshop UXP) - Installation
echo  -------------------------------------------
echo  Zielordner:
echo  %DEST%
echo.

if not exist "%APPDATA%\Adobe\UXP\Plugins\External\" (
  mkdir "%APPDATA%\Adobe\UXP\Plugins\External\" 2>nul
  if errorlevel 1 (
    echo FEHLER: Konnte Zielverzeichnis nicht anlegen.
    pause
    exit /b 1
  )
)

robocopy "%~dp0." "%DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP
if errorlevel 8 (
  echo.
  echo FEHLER beim Kopieren (Robocopy).
  pause
  exit /b 1
)

echo.
echo  Fertig.
echo.
echo  WICHTIG: Ohne UXP-Entwicklermodus erscheint das Panel oft NICHT unter Plugins.
echo  Als Naechstes: enable-uxp-developer-mode.cmd per Rechtsklick
echo  "Als Administrator ausfuehren", dann Photoshop neu starten.
echo.
echo  Danach: Menue "Plugins" -^> "INK E-Paper" oeffnen.
echo.
pause
