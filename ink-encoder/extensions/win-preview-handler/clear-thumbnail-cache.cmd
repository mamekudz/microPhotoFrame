@echo off
setlocal EnableExtensions
set "TC=%LocalAppData%\Microsoft\Windows\Explorer"

echo.
echo  Miniatur-Cache leeren (Windows Explorer)
echo  ==========================================
echo  Vorschaufenster schliessen, keine .ink-Vorschau offen halten.
echo.
pause

REM --- COM Surrogate / prevhost beenden, die die Handler-DLL halten ---
taskkill /f /im prevhost.exe >nul 2>&1
taskkill /f /im dllhost.exe /fi "WINDOWTITLE eq COM Surrogate" >nul 2>&1
timeout /t 1 /nobreak >nul

REM --- Cache-Dateien loeschen (Explorer laeuft noch) ---
if not exist "%TC%" (
  echo Ordner fehlt: %TC%
  pause
  exit /b 1
)

echo Loesche thumbcache*.db unter:
echo %TC%
echo.

del /f /q "%TC%\thumbcache*.db" 2>nul
del /f /q "%TC%\iconcache*.db" 2>nul

REM --- Explorer sauber neu starten (Shell-Restart statt taskkill) ---
echo Explorer wird kurz neu gestartet...
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Sicherstellen, dass er wirklich wieder kommt:
start "" "%SystemRoot%\explorer.exe"

echo.
echo  Fertig. Miniaturen werden bei Bedarf neu erzeugt.
echo.
pause
