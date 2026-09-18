@echo off
setlocal EnableExtensions
echo Melde INK-Vorschau ab...
set "HERE=%~dp0"

if exist "%HERE%InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%"
) else if exist "%HERE%bin\Release\net48\InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%bin\Release\net48\"
) else if exist "%HERE%bin\Debug\net48\InkPreviewHandler.dll" (
  set "DLLDIR=%HERE%bin\Debug\net48\"
) else (
  echo InkPreviewHandler.dll nicht gefunden.
  pause
  exit /b 1
)

reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved" /v "{B1C2D3E4-F5A6-4789-A012-3456789ABCDE}" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved" /v "{8C4E2F91-0B3A-4D7E-9F12-6A5E8C3D1B07}" /f >nul 2>&1

reg delete "HKCR\.ink\shellex\{E357FCCD-A995-4576-B01F-234630154E9D}" /f >nul 2>&1
reg delete "HKCR\.ink\shellex\{8895b1c6-b41f-4c1c-a562-0d564250836f}" /f >nul 2>&1
reg delete "HKCR\ink.1\shellex\{E357FCCD-A995-4576-B01F-234630154E9D}" /f >nul 2>&1
reg delete "HKCR\ink.1\shellex\{8895b1c6-b41f-4c1c-a562-0d564250836f}" /f >nul 2>&1

cd /d "%DLLDIR%"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\regasm.exe" /unregister "InkPreviewHandler.dll"
if errorlevel 1 (
  echo FEHLER: Als Administrator ausfuehren.
  pause
  exit /b 1
)
echo Fertig.
pause
