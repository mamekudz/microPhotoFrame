@echo off
REM =========================================
REM Start Nginx for µPhotoFrame™
REM =========================================

echo Starting Nginx...

REM Change to Nginx directory
cd /d C:\nginx

REM Test configuration
echo Testing Nginx configuration...
nginx.exe -t
if errorlevel 1 (
    echo ERROR: Nginx configuration test failed!
    pause
    exit /b 1
)

REM Start Nginx in background
echo Starting Nginx server...
cd /d C:\nginx
start /B nginx.exe

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Check if Nginx is running
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe">NUL
if errorlevel 1 (
    echo ERROR: Nginx failed to start!
    echo.
    echo Checking error log...
    if exist "C:\nginx\logs\error.log" (
        echo Last 10 lines of error log:
        type "C:\nginx\logs\error.log" | more +0
    )
    pause
    exit /b 1
) else (
    echo Nginx started successfully!
    echo Server running on http://localhost:890
    echo.
    echo Nginx is running in the background.
    echo To stop Nginx, run: nginx\STOP_NGINX.bat
    echo To view logs, check: C:\nginx\logs\
)

timeout /t 3 /nobreak >nul

