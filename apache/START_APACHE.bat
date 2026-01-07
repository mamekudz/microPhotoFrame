@echo off
REM =========================================
REM Apache Start Script für microPhotoFrame
REM =========================================
REM 
REM Dieses Script startet Apache als Administrator
REM

echo Pruefe Apache-Konfiguration...
C:\Apache24\bin\httpd.exe -t

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: Apache-Konfiguration ist fehlerhaft!
    echo Bitte pruefen Sie die Fehlermeldungen oben.
    pause
    exit /b 1
)

echo.
echo Konfiguration OK. Starte Apache...
echo.

REM Versuche Apache zu starten
C:\Apache24\bin\httpd.exe -k start

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: Apache konnte nicht gestartet werden!
    echo Moegliche Ursachen:
    echo - Port 889 ist bereits belegt
    echo - Apache laeuft bereits
    echo - Keine Administrator-Rechte
    echo.
    echo Versuchen Sie:
    echo 1. Als Administrator ausfuehren (Rechtsklick -^> Als Administrator ausfuehren)
    echo 2. Pruefen ob Apache bereits laeuft: netstat -an ^| findstr :889
    echo 3. Apache stoppen: C:\Apache24\bin\httpd.exe -k stop
    pause
    exit /b 1
)

echo.
echo Apache wurde erfolgreich gestartet!
echo Server laeuft auf: http://localhost:889
echo.
pause

