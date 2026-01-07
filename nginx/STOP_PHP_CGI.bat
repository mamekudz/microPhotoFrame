@echo off
REM =========================================
REM Stop PHP-CGI for µPhotoFrame (Nginx)
REM =========================================

echo Stopping PHP-CGI...

REM Find and kill PHP-CGI processes
tasklist /FI "IMAGENAME eq php-cgi.exe" 2>NUL | find /I /N "php-cgi.exe">NUL
if %errorlevel% == 0 (
    echo Stopping PHP-CGI processes...
    taskkill /F /IM php-cgi.exe
    timeout /t 1 /nobreak >nul
    echo PHP-CGI stopped.
) else (
    echo PHP-CGI is not running.
)

pause

