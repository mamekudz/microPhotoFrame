# Sysinfo.nsh
# Copyright 2023 Typomedia Foundation. All rights reserved.
# Released under MIT License.
#
# This script provides macros to retrieve system information.
# It uses the wmic command to retrieve the information.

!include LogicLib.nsh
!include StrFunc.nsh

!define Sysinfo.GetCpuCores    "!insertmacro GetCpuCores"
!define Sysinfo.GetTotalMemory "!insertmacro GetTotalMemory"

!macro GetCpuCores CpuCores
    Call GetCpuCores
    Pop "${CpuCores}"
!macroend

!macro GetTotalMemory TotalMemory
    Call GetTotalMemory
    Pop "${TotalMemory}"
!macroend

${StrLoc} # Supportable for NSIS 3.0b1 or later

Function GetCpuCores
    ; Push the command to the stack
    nsExec::ExecToStack 'wmic cpu get NumberOfCores /format:list'

    ; Pop the result from the stack
    Pop $0

    ; Check if the command was successful
    ${If} $0 == 0
        Pop $0
        ; trim empty lines
        ;${Trim} $0 $0

        ; count characters from left to the first "="
        ${StrLoc} $1 $0 "=" ">"
        ; add 1 to the length to skip the "="
        IntOp $1 $1 + 1

        ; Extract the part of the string after "="
        StrCpy $0 $0 "" $1

        ; Convert the string to an integer
        IntOp $0 $0 + 0

        ; Display the result or use it as needed
        ;DetailPrint "Cores: $0"

        ; Push the result to the stack
        Push $0
    ${Else}
        MessageBox MB_ICONEXCLAMATION "Failed to retrieve CPU information."
    ${EndIf}
FunctionEnd

Function GetTotalMemory
    ; Push the command to the stack
    nsExec::ExecToStack 'wmic ComputerSystem get TotalPhysicalMemory /format:list'

    ; Pop the result from the stack
    Pop $0

    ; Check if the command was successful
    ${If} $0 == 0
        Pop $0
        ; trim empty lines
        ;${Trim} $0 $0

        ; count characters to the first "="
        ${StrLoc} $1 $0 "=" ">"
        ; add 1 to the length to skip the "="
        IntOp $1 $1 + 1

        ; Extract the part of the string after "="
        StrCpy $0 $0 "" $1

        ; Convert the string to an integer
        System::Int64Op $0 / 1048576
        Pop $0

        ; Push the result to the stack
        Push $0
    ${Else}
        MessageBox MB_ICONEXCLAMATION "Failed to retrieve Memory information."
    ${EndIf}
FunctionEnd
