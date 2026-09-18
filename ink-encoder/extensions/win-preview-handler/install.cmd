@echo off
setlocal EnableExtensions
echo Registriere INK-Vorschau ^(benoetigt Administrator^)...
set "HERE=%~dp0"

if exist "%HERE%InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%"
) else if exist "%HERE%bin\Release\net48\InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%bin\Release\net48\"
) else if exist "%HERE%bin\Debug\net48\InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%bin\Debug\net48\"
) else (
  echo.
  echo InkPreviewHandler.dll nicht gefunden.
  echo Zuerst: npm run build:win-preview
  echo Dann: install.cmd erneut als Administrator.
  echo.
  pause
  exit /b 1
)

cd /d "%DLLDIR%"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\regasm.exe" "InkPreviewHandler.dll" /codebase
if errorlevel 1 (
  echo.
  echo FEHLER: regasm fehlgeschlagen. Rechtsklick -^> Als Administrator ausfuehren.
  echo Aktueller Ordner: %CD%
  pause
  exit /b 1
)

echo Freigabe Shell Extensions ^(Approved^)...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved" /v "{B1C2D3E4-F5A6-4789-A012-3456789ABCDE}" /t REG_SZ /d "INK E-Paper Miniaturansicht" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved" /v "{8C4E2F91-0B3A-4D7E-9F12-6A5E8C3D1B07}" /t REG_SZ /d "INK E-Paper Vorschau" /f >nul 2>&1

echo Shellex unter .ink und ProgID ink.1...
reg add "HKCR\.ink\shellex\{E357FCCD-A995-4576-B01F-234630154E9D}" /ve /t REG_SZ /d "{B1C2D3E4-F5A6-4789-A012-3456789ABCDE}" /f >nul 2>&1
reg add "HKCR\.ink\shellex\{8895b1c6-b41f-4c1c-a562-0d564250836f}" /ve /t REG_SZ /d "{8C4E2F91-0B3A-4D7E-9F12-6A5E8C3D1B07}" /f >nul 2>&1
reg add "HKCR\ink.1\shellex\{E357FCCD-A995-4576-B01F-234630154E9D}" /ve /t REG_SZ /d "{B1C2D3E4-F5A6-4789-A012-3456789ABCDE}" /f >nul 2>&1
reg add "HKCR\ink.1\shellex\{8895b1c6-b41f-4c1c-a562-0d564250836f}" /ve /t REG_SZ /d "{8C4E2F91-0B3A-4D7E-9F12-6A5E8C3D1B07}" /f >nul 2>&1

REM --- COM-Surrogate beenden, Thumbnail-Cache leeren, Explorer neu starten ---
echo.
echo COM-Surrogate beenden...
taskkill /f /im prevhost.exe >nul 2>&1
taskkill /f /im dllhost.exe >nul 2>&1
timeout /t 1 /nobreak >nul

set "TC=%LocalAppData%\Microsoft\Windows\Explorer"
if exist "%TC%" (
  echo Thumbnail-Cache leeren...
  del /f /q "%TC%\thumbcache*.db" 2>nul
  del /f /q "%TC%\iconcache*.db" 2>nul
)

echo Explorer neu starten...
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
start "" "%SystemRoot%\explorer.exe"

echo.
echo Fertig ^(DLL aus: %DLLDIR%^).
echo Miniaturen werden bei Bedarf neu erzeugt.
echo Diagnose: diagnose-ink-shell.cmd
pause
