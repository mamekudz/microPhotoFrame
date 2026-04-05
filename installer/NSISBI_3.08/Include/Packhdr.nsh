!ifndef __Packhdr_NSH__
!define __Packhdr_NSH__

!ifndef Packhdr
  !define Packhdr upx
!endif

!if `${Packhdr}` != noicon
  !if `${Packhdr}` != noicon+upx
    !if `${Packhdr}` != upx
      !error `Packhdr must be defined as: noicon, noicon+upx, upx`
    !endif
  !endif
!endif


!ifdef RequestExecutionLevelManifest
  !packhdr $%TEMP%\exehead.tmp `"${NSISDIR}\Packhdr\Packhdr.bat" "$%TEMP%\exehead.tmp" ${Packhdr} "${RequestExecutionLevelManifest}"`
!else
  !packhdr $%TEMP%\exehead.tmp `"${NSISDIR}\Packhdr\Packhdr.bat" "$%TEMP%\exehead.tmp" ${Packhdr}`
!endif

!undef Packhdr

!endif