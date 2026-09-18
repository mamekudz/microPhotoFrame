@echo off
setlocal EnableExtensions
set "PLUGIN_ID=com.inkencoder.photoshop"
set "DEST=%APPDATA%\Adobe\UXP\Plugins\External\%PLUGIN_ID%"

echo.
if not exist "%DEST%" (
  echo Keine Installation gefunden unter:
  echo %DEST%
  pause
  exit /b 0
)

echo Entferne: %DEST%
echo.
set /p "OK=Fortfahren? [j/N] "
if /i not "%OK%"=="j" if /i not "%OK%"=="ja" (
  echo Abgebrochen.
  pause
  exit /b 0
)

rd /s /q "%DEST%" 2>nul
if exist "%DEST%" (
  echo FEHLER: Ordner konnte nicht geloescht werden (Photoshop schliessen?).
  pause
  exit /b 1
)

echo Fertig. Photoshop neu starten.
pause
