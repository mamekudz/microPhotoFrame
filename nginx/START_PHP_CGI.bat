@echo off
REM =========================================
REM Start PHP-CGI for µPhotoFrame (Nginx)
REM =========================================

echo Starting PHP-CGI on port 9000...

REM Check if PHP-CGI is already running
netstat -an | findstr ":9000" >nul
if %errorlevel% == 0 (
    echo PHP-CGI is already running on port 9000.
    pause
    exit /b 0
)

REM Start PHP-CGI in background
start /B "PHP-CGI" C:\php7\php-cgi.exe -b 127.0.0.1:9000 -c C:\php7\php.ini

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Check if PHP-CGI is running
netstat -an | findstr ":9000" >nul
if %errorlevel% == 0 (
    echo PHP-CGI started successfully on port 9000!
) else (
    echo ERROR: PHP-CGI failed to start!
    pause
    exit /b 1
)

pause

