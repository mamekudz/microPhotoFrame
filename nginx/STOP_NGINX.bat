@echo off
REM =========================================
REM Stop Nginx for µPhotoFrame™
REM =========================================

echo Stopping Nginx...

REM Change to Nginx directory
cd /d C:\nginx

REM Stop Nginx gracefully
nginx.exe -s quit

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Force stop if still running
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if not errorlevel 1 (
    echo Force stopping Nginx...
    taskkill /F /IM nginx.exe
)

echo Nginx stopped.
pause

