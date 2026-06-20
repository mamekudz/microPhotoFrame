@echo off
REM =========================================
REM Reload Nginx configuration for µPhotoFrame™
REM =========================================

echo Reloading Nginx configuration...

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

REM Reload Nginx
echo Reloading Nginx...
nginx.exe -s reload

echo Nginx configuration reloaded.
pause

