!macro Runtime_node
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw-license.txt"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw.exe"
SetOutPath "$INSTDIR\runtime\node"
File /r /x ".source-*" "..\tmp\runtime\node\*.*"
SetOutPath "$INSTDIR\node\node_modules"
File /r "..\tmp\runtime\node-deps\node_modules\*.*"
!macroend
!macro Runtime_iis
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\rewrite.msi"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\net48.exe"
!macroend
!macro Runtime_apache
SetOutPath "$INSTDIR\runtime\apache"
File /r /x ".source-*" "..\tmp\runtime\apache\*.*"
SetOutPath "$INSTDIR\runtime\php-ts"
File /r /x ".source-*" "..\tmp\runtime\php-ts\*.*"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\vc_redist.x64.exe"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw-license.txt"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw.exe"
!macroend
!macro Runtime_nginx
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\vc_redist.x64.exe"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw-license.txt"
SetOutPath "$INSTDIR\runtime"
File "..\tmp\runtime\winsw.exe"
SetOutPath "$INSTDIR\runtime\nginx"
File /r /x ".source-*" "..\tmp\runtime\nginx\*.*"
SetOutPath "$INSTDIR\runtime\php-nts"
File /r /x ".source-*" "..\tmp\runtime\php-nts\*.*"
!macroend
!ifdef FIXED_SERVER
!insertmacro Runtime_${FIXED_SERVER}
!else
${If} $SelectedServer == "node"
!insertmacro Runtime_node
${EndIf}
${If} $SelectedServer == "iis"
!insertmacro Runtime_iis
${EndIf}
${If} $SelectedServer == "apache"
!insertmacro Runtime_apache
${EndIf}
${If} $SelectedServer == "nginx"
!insertmacro Runtime_nginx
${EndIf}
!endif
