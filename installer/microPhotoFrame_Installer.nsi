; ===============================================================
; µPhotoFrame™ Installer
; © 2026 Meinolf Amekudzi (MIT License)
; ===============================================================
;
; Creates a Windows installer with server type selection.
; Built via: gulp BUILD_INSTALLER  (Ausgabe: ../installers/*.exe). NSIS systemweit (makensis im PATH oder MAKENSIS). Siehe ../docs/BUILD_INSTALLER.md
; ===============================================================

Unicode True
RequestExecutionLevel admin

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"
!include "FileFunc.nsh"
!include "WinMessages.nsh"

; Version info from gulp build
!include "..\tmp\version.nsh"

; ---- General ----
!define PRODUCT_NAME "microPhotoFrame"
!define PRODUCT_PUBLISHER "Meinolf Amekudzi"
!define PRODUCT_WEB_SITE "https://github.com/mamekudz/microPhotoFrame"

Name "${PRODUCT_NAME} ${VERSION}"
OutFile "${INSTALLER_OUTDIR}\${PRODUCT_NAME}_Setup_v${VERSION}.exe"
InstallDir "C:\${PRODUCT_NAME}"
InstallDirRegKey HKLM "Software\${PRODUCT_NAME}" "InstallDir"
ShowInstDetails show

; ---- Version Info ----
VIProductVersion "${VERSION_WIN}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Installer"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "MIT License"

; ---- Icons ----
!define MUI_ICON "..\installer\assets\microPhotoFrame.ico"
!define MUI_UNICON "..\installer\assets\microPhotoFrame.ico"

; ---- MUI Configuration ----
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${PRODUCT_NAME} Setup ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "This wizard will install ${PRODUCT_NAME} on your computer.$\r$\n$\r$\n\
${PRODUCT_NAME} is a WiFi-based E-Ink photo frame system with server, web UI, and firmware.$\r$\n$\r$\n\
You can choose which server type to install or skip the server setup for manual configuration.$\r$\n$\r$\n\
Click Next to continue."

!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} has been installed to:$\r$\n$\r$\n$INSTDIR$\r$\n$\r$\n\
See the README.md and INSTALLATION.md for further setup instructions."
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.md"
!define MUI_FINISHPAGE_LINK "Visit ${PRODUCT_NAME} on GitHub"
!define MUI_FINISHPAGE_LINK_LOCATION "${PRODUCT_WEB_SITE}"

; ---- Pages ----
!insertmacro MUI_PAGE_WELCOME
Page custom ServerTypePage ServerTypePageLeave
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ---- Languages ----
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "German"

; ---- Variables ----
Var ServerTypeDialog
Var RadioNode
Var RadioIIS
Var RadioApache
Var RadioNginx
Var RadioNone
Var SelectedServer ; "node", "iis", "apache", "nginx", "none"
Var LabelInfo

; ===============================================================
; Custom Page: Server Type Selection
; ===============================================================

Function ServerTypePage
	!insertmacro MUI_HEADER_TEXT "Server Type" "Select which server backend to install."

	nsDialogs::Create 1018
	Pop $ServerTypeDialog
	${If} $ServerTypeDialog == error
		Abort
	${EndIf}

	${NSD_CreateLabel} 0 0 100% 28u "Choose which server type to install with ${PRODUCT_NAME}.$\r$\nThe web UI (SPA) is always included. The server handles API requests and photo storage."
	Pop $LabelInfo

	${NSD_CreateRadioButton} 20u 36u 280u 12u "Node.js Express (Port 891) - recommended"
	Pop $RadioNode
	${NSD_AddStyle} $RadioNode ${WS_GROUP}
	${NSD_Check} $RadioNode

	${NSD_CreateRadioButton} 20u 52u 280u 12u "IIS / ASP.NET (Port 888) - requires IIS with URL Rewrite"
	Pop $RadioIIS

	${NSD_CreateRadioButton} 20u 68u 280u 12u "Apache + PHP (Port 889) - requires Apache with mod_rewrite and PHP"
	Pop $RadioApache

	${NSD_CreateRadioButton} 20u 84u 280u 12u "Nginx + PHP (Port 890) - requires Nginx and PHP-CGI"
	Pop $RadioNginx

	${NSD_CreateRadioButton} 20u 104u 280u 12u "None - copy files only, I will configure the server manually"
	Pop $RadioNone

	${NSD_CreateLabel} 20u 124u 280u 28u "Tip: Node.js Express is the easiest to set up. It requires Node.js (https://nodejs.org) to be installed."
	Pop $0

	nsDialogs::Show
FunctionEnd

Function ServerTypePageLeave
	${NSD_GetState} $RadioNode $0
	${If} $0 == ${BST_CHECKED}
		StrCpy $SelectedServer "node"
		Return
	${EndIf}

	${NSD_GetState} $RadioIIS $0
	${If} $0 == ${BST_CHECKED}
		StrCpy $SelectedServer "iis"
		Return
	${EndIf}

	${NSD_GetState} $RadioApache $0
	${If} $0 == ${BST_CHECKED}
		StrCpy $SelectedServer "apache"
		Return
	${EndIf}

	${NSD_GetState} $RadioNginx $0
	${If} $0 == ${BST_CHECKED}
		StrCpy $SelectedServer "nginx"
		Return
	${EndIf}

	${NSD_GetState} $RadioNone $0
	${If} $0 == ${BST_CHECKED}
		StrCpy $SelectedServer "none"
		Return
	${EndIf}

	StrCpy $SelectedServer "node"
FunctionEnd

; ===============================================================
; Installer Section
; ===============================================================

Section "Install" SecInstall
	SetOutPath $INSTDIR
	SetOverwrite on

	; ---- Common files (always installed) ----
	DetailPrint "Installing common files..."

	File "..\index.html"
	File "..\favicon.ico"
	File "..\welcome2microPhotoFrame.html"
	File "..\welcome2microPhotoFrame_config.js"
	File "..\config.json"
	File "..\LICENSE"
	File "..\README.md"
	File "..\INSTALLATION.md"

	SetOutPath "$INSTDIR\src"
	File /r "..\src\*.*"

	SetOutPath "$INSTDIR\assets"
	File /r /x ".gitignore" "..\assets\*.*"

	; Create shows directory
	CreateDirectory "$INSTDIR\shows"

	; Ready-to-go shows (sample content)
	IfFileExists "..\readyToGoShows\*.*" 0 +3
		SetOutPath "$INSTDIR\readyToGoShows"
		File /nonfatal /r "..\readyToGoShows\*.*"

	; ---- Server-specific files ----

	; -- Node.js Express --
	${If} $SelectedServer == "node"
		DetailPrint "Installing Node.js Express server..."
		SetOutPath "$INSTDIR\node"
		File "..\node\server.js"
		File "..\node\package.json"
	${EndIf}

	; -- IIS / ASP.NET --
	${If} $SelectedServer == "iis"
		DetailPrint "Installing IIS / ASP.NET server files..."
		SetOutPath "$INSTDIR"
		File "..\web.config"
		SetOutPath "$INSTDIR\aspx"
		File "..\aspx\microPhotoFrame.aspx"
		File "..\aspx\microPhotoFrame.cs"
	${EndIf}

	; -- Apache + PHP --
	${If} $SelectedServer == "apache"
		DetailPrint "Installing Apache + PHP server files..."
		SetOutPath "$INSTDIR"
		File "..\\.htaccess"
		SetOutPath "$INSTDIR\php"
		File /r "..\php\*.*"
		SetOutPath "$INSTDIR\apache"
		File "..\apache\httpd-microPhotoFrame.conf"
		File "..\apache\START_APACHE.bat"
		File "..\apache\STOP_APACHE.bat"
		File /nonfatal "..\apache\ENABLE_MOD_REWRITE.bat"
		File /nonfatal "..\apache\ENABLE_MOD_REWRITE.md"
	${EndIf}

	; -- Nginx + PHP --
	${If} $SelectedServer == "nginx"
		DetailPrint "Installing Nginx + PHP server files..."
		SetOutPath "$INSTDIR\php"
		File /r "..\php\*.*"
		SetOutPath "$INSTDIR\nginx"
		File "..\nginx\microPhotoFrame.conf"
		File "..\nginx\START_NGINX.bat"
		File "..\nginx\STOP_NGINX.bat"
		File "..\nginx\START_PHP_CGI.bat"
		File "..\nginx\STOP_PHP_CGI.bat"
		File /nonfatal "..\nginx\RELOAD_NGINX.bat"
		File /nonfatal "..\nginx\CHECK_NGINX.bat"
	${EndIf}

	; -- None: install ALL server files so user can configure manually --
	${If} $SelectedServer == "none"
		DetailPrint "Installing all server files (manual configuration)..."
		SetOutPath "$INSTDIR"
		File "..\web.config"
		File "..\\.htaccess"
		SetOutPath "$INSTDIR\node"
		File "..\node\server.js"
		File "..\node\package.json"
		SetOutPath "$INSTDIR\aspx"
		File "..\aspx\microPhotoFrame.aspx"
		File "..\aspx\microPhotoFrame.cs"
		SetOutPath "$INSTDIR\php"
		File /r "..\php\*.*"
		SetOutPath "$INSTDIR\apache"
		File /r /x "*.md" "..\apache\*.*"
		File /nonfatal "..\apache\ENABLE_MOD_REWRITE.md"
		SetOutPath "$INSTDIR\nginx"
		File /r "..\nginx\*.*"
	${EndIf}

	; ---- Post-install: config paths ----
	; Nginx/Apache: Pfade in den mitgelieferten *.conf ggf. an $INSTDIR anpassen (siehe INSTALLATION.md).

	; ---- Node.js: run npm install ----
	${If} $SelectedServer == "node"
		IfFileExists "$INSTDIR\node\package.json" 0 +4
			DetailPrint "Running npm install for Node.js server..."
			SetOutPath "$INSTDIR\node"
			nsExec::ExecToLog 'cmd /c "cd /d "$INSTDIR\node" && npm install --production 2>&1"'
	${EndIf}

	; ---- Registry & Uninstaller ----
	SetOutPath $INSTDIR
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "InstallDir" "$INSTDIR"
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "Version" "${VERSION}"
	WriteRegStr HKLM "Software\${PRODUCT_NAME}" "ServerType" "$SelectedServer"

	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\favicon.ico"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${VERSION}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "NoRepair" 1

	WriteUninstaller "$INSTDIR\uninstall.exe"

	DetailPrint ""
	DetailPrint "======================================"
	DetailPrint "${PRODUCT_NAME} ${VERSION} installed."
	DetailPrint "Server type: $SelectedServer"
	DetailPrint "Install dir: $INSTDIR"
	DetailPrint "======================================"
SectionEnd

; ===============================================================
; Uninstaller Section
; ===============================================================

Section "Uninstall"
	; Remove registry keys
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
	DeleteRegKey HKLM "Software\${PRODUCT_NAME}"

	; Remove files and directories
	RMDir /r "$INSTDIR\src"
	RMDir /r "$INSTDIR\assets"
	RMDir /r "$INSTDIR\node"
	RMDir /r "$INSTDIR\aspx"
	RMDir /r "$INSTDIR\php"
	RMDir /r "$INSTDIR\apache"
	RMDir /r "$INSTDIR\nginx"

	Delete "$INSTDIR\index.html"
	Delete "$INSTDIR\favicon.ico"
	Delete "$INSTDIR\welcome2microPhotoFrame.html"
	Delete "$INSTDIR\welcome2microPhotoFrame_config.js"
	Delete "$INSTDIR\config.json"
	Delete "$INSTDIR\web.config"
	Delete "$INSTDIR\.htaccess"
	Delete "$INSTDIR\LICENSE"
	Delete "$INSTDIR\README.md"
	Delete "$INSTDIR\INSTALLATION.md"
	Delete "$INSTDIR\uninstall.exe"

	; Do NOT delete shows directory (user data!)
	; RMDir /r "$INSTDIR\shows"

	RMDir "$INSTDIR"
SectionEnd
