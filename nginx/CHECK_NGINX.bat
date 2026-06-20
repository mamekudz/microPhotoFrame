@echo off
REM =========================================
REM Check Nginx status for µPhotoFrame™
REM =========================================

echo Checking Nginx status...

REM Check if Nginx process is running
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if errorlevel 1 (
    echo Nginx is NOT running.
) else (
    echo Nginx IS running.
    echo.
    echo Process details:
    tasklist /FI "IMAGENAME eq nginx.exe" /FO LIST
    echo.
    echo Port status:
    netstat -an | findstr ":889"
)

echo.
echo Checking error log...
if exist "C:\nginx\logs\error.log" (
    echo Last 5 lines of error log:
    powershell -Command "Get-Content 'C:\nginx\logs\error.log' -Tail 5"
) else (
    echo Error log not found.
)

echo.
pause

