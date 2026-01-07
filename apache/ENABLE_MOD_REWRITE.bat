@echo off
REM =========================================
REM Aktiviert mod_rewrite in Apache
REM =========================================

set HTTPD_CONF=C:\Apache24\conf\httpd.conf

echo Pruefe Apache-Konfiguration...
echo.

REM Pruefe ob mod_rewrite bereits aktiviert ist
findstr /C:"LoadModule rewrite_module" "%HTTPD_CONF%" | findstr /V "^#" >nul
if %ERRORLEVEL% EQU 0 (
    echo mod_rewrite ist bereits aktiviert!
    pause
    exit /b 0
)

echo mod_rewrite ist nicht aktiviert.
echo.
echo Suche nach der mod_rewrite Zeile...
findstr /N "rewrite_module" "%HTTPD_CONF%" | findstr "^[0-9]*:#LoadModule"

echo.
echo Bitte oeffnen Sie die Datei:
echo %HTTPD_CONF%
echo.
echo Suchen Sie nach der Zeile:
echo #LoadModule rewrite_module modules/mod_rewrite.so
echo.
echo Entfernen Sie das # am Anfang, so dass es wird:
echo LoadModule rewrite_module modules/mod_rewrite.so
echo.
echo Dann starten Sie Apache neu mit:
echo C:\Apache24\bin\httpd.exe -k restart
echo.
pause

