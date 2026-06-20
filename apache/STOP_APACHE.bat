@echo off
REM =========================================
REM Apache Stop Script für µPhotoFrame™
REM =========================================

echo Stoppe Apache...
C:\Apache24\bin\httpd.exe -k stop

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FEHLER: Apache konnte nicht gestoppt werden!
    echo Versuchen Sie als Administrator auszufuehren.
    pause
    exit /b 1
)

echo.
echo Apache wurde erfolgreich gestoppt!
pause

