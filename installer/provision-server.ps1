[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('Prepare','Configure','Remove','Test')][string]$Action,
    [Parameter(Mandatory)][string]$InstallDir,
    [ValidateSet('node','iis','apache','nginx','none')][string]$Server = 'node'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$InstallDir = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\')
if ($InstallDir.Length -lt 5 -or $InstallDir -match '["\r\n%$]' -or $InstallDir -eq $env:WINDIR -or $InstallDir -eq $env:ProgramFiles) { throw 'Unsupported installation directory' }
if (![Environment]::Is64BitOperatingSystem -or ![Environment]::Is64BitProcess) { throw '64-bit Windows PowerShell is required' }
$ports = @{node=891; iis=888; apache=889; nginx=890; none=0}
$port = $ports[$Server]
$runtime = Join-Path $InstallDir 'runtime'
$setup = Join-Path $InstallDir '.installer'
$logDir = Join-Path $InstallDir 'logs'
$services = @('microPhotoFrameNode','microPhotoFrameApache','microPhotoFrameNginx','microPhotoFramePHP')
$taskName = 'microPhotoFrame-CompleteSetup'
$script:reboot = $false
function Run-Exe([string]$File, [string[]]$Arguments, [int[]]$Success = @(0)) {
    & $File @Arguments | ForEach-Object { Write-Host $_ }
    $result = $LASTEXITCODE
    if ($result -notin $Success) { throw "$File failed with exit code $result" }
    if ($result -in @(3010,1641)) { $script:reboot = $true }
}
function Run-Installer([string]$File, [string]$Arguments) {
    $p = Start-Process -FilePath $File -ArgumentList $Arguments -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -notin @(0,3010,1641,1638)) { throw "Prerequisite failed: $File, exit $($p.ExitCode)" }
    if ($p.ExitCode -in @(3010,1641)) { $script:reboot = $true }
}
function Write-Utf8([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText($Path, $Text, (New-Object Text.UTF8Encoding($false)))
}
function Assert-OwnedService($svc) {
    if ($svc.PathName.IndexOf($InstallDir + '\', [StringComparison]::OrdinalIgnoreCase) -lt 0) {
        throw "Service name already belongs to another installation: $($svc.Name)"
    }
}
function Stop-OwnedServices([switch]$Delete) {
    foreach ($name in $services) {
        $svc = Get-CimInstance Win32_Service -Filter "Name='$name'"
        if (!$svc) { continue }
        Assert-OwnedService $svc
        if ($svc.State -ne 'Stopped') {
            Stop-Service -Name $name -Force
            (Get-Service $name).WaitForStatus('Stopped', [TimeSpan]::FromSeconds(45))
        }
        if ($Delete) {
            Run-Exe "$env:WINDIR/System32/sc.exe" @('delete',$name)
            for ($i=0; $i -lt 30 -and (Get-Service $name -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 500 }
            if (Get-Service $name -ErrorAction SilentlyContinue) { throw "Service deletion is pending: $name" }
        }
    }
    if (Test-Path "$env:WINDIR/System32/inetsrv/Microsoft.Web.Administration.dll") {
        Add-Type -Path "$env:WINDIR/System32/inetsrv/Microsoft.Web.Administration.dll"
        $manager = New-Object Microsoft.Web.Administration.ServerManager
        try {
            $site = $manager.Sites['microPhotoFrame']
            if ($site) {
                $physical = [Environment]::ExpandEnvironmentVariables($site.Applications['/'].VirtualDirectories['/'].PhysicalPath)
                if ($physical.TrimEnd('\') -ne $InstallDir) { throw 'IIS site microPhotoFrame belongs to another directory' }
                if ($site.State -eq 'Started') { $null = $site.Stop() }
                if ($Delete) { $manager.Sites.Remove($site); $manager.CommitChanges() }
            }
            # Keep the app pool: it can be shared by existing IIS applications.
        } finally { $manager.Dispose() }
    }
}
function Grant-Access([string]$Path, [string]$Identity, [string]$Rights) {
    Run-Exe "$env:WINDIR/System32/icacls.exe" @($Path, '/grant:r', "${Identity}:(OI)(CI)$Rights")
}
function Expand-Template([string]$Name, [string]$Destination, [string]$Php = '') {
    $text = Get-Content "$setup/templates/$Name" -Raw
    $text = $text.Replace('@ROOT@', $InstallDir.Replace('\','/')).Replace('@RUNTIME@', $runtime.Replace('\','/')).Replace('@PORT@', [string]$port).Replace('@PHP@',$Php.Replace('\','/'))
    if (Test-Path $Destination) { Copy-Item -LiteralPath $Destination -Destination "$Destination.before-setup" -Force }
    Write-Utf8 $Destination $text
}
function Install-ServiceWrapper([string]$Name, [string]$Executable, [string]$Arguments, [string]$WorkingDirectory, [string]$Extra = '') {
    $wrapper = "$setup/$Name.exe"
    Copy-Item "$runtime/winsw.exe" $wrapper -Force
    $escape = { param($s) [Security.SecurityElement]::Escape($s) }
    $xml = @"
<service>
  <id>$Name</id><name>$Name</name><description>microPhotoFrame managed server</description>
  <executable>$(& $escape $Executable)</executable>
  <arguments>$(& $escape $Arguments)</arguments>
  <workingdirectory>$(& $escape $WorkingDirectory)</workingdirectory>
  <startmode>Automatic</startmode><delayedAutoStart>true</delayedAutoStart>
  <serviceaccount><domain>NT AUTHORITY</domain><user>LocalService</user></serviceaccount>
  <onfailure action="restart" delay="10 sec"/>
  <stoptimeout>30 sec</stoptimeout>
  <logpath>$(& $escape $logDir)</logpath><log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>3</keepFiles></log>
  $Extra
</service>
"@
    Write-Utf8 "$setup/$Name.xml" $xml
    Run-Exe $wrapper @('install')
    $svc = Get-CimInstance Win32_Service -Filter "Name='$Name'"
    if ($svc.StartName -notin @('NT AUTHORITY\LocalService','NT AUTHORITY\Local Service')) { throw "Unexpected service identity: $($svc.StartName)" }
    Start-Service $Name
}
function Test-Server {
    $base = "http://127.0.0.1:$port"
    for ($i=0; $i -lt 30; $i++) {
        try {
            $html = Invoke-WebRequest "$base/" -UseBasicParsing -TimeoutSec 5
            if ($html.StatusCode -ne 200 -or $html.Content -notmatch 'microPhotoFrame|PhotoFrame') { throw 'Unexpected home page' }
            $response = Invoke-RestMethod "$base/?action=getShows" -Method Post -ContentType 'application/json' -Body '{"action":"getShows","input":{}}' -TimeoutSec 10
            if (!$response.ok) { throw 'Server API failed' }
            Write-Host "READY: $base"
            return
        } catch { if ($i -eq 29) { throw }; Start-Sleep -Seconds 2 }
    }
}
function Enable-IIS {
    $os = Get-CimInstance Win32_OperatingSystem
    if ($os.ProductType -eq 1) {
        $result = Enable-WindowsOptionalFeature -Online -All -NoRestart -FeatureName IIS-WebServerRole,IIS-WebServer,IIS-CommonHttpFeatures,IIS-StaticContent,IIS-DefaultDocument,IIS-HttpErrors,IIS-ASPNET45,IIS-NetFxExtensibility45,IIS-ISAPIExtensions,IIS-ISAPIFilter,IIS-ManagementConsole
        if ($result.RestartNeeded) { $script:reboot = $true }
    } else {
        Import-Module ServerManager
        $result = Install-WindowsFeature Web-Server,Web-Static-Content,Web-Default-Doc,Web-Http-Errors,Web-Asp-Net45,Web-Mgmt-Console
        if (!$result.Success) { throw 'IIS feature installation failed' }
        if ($result.RestartNeeded -eq 'Yes') { $script:reboot = $true }
    }
}
function Schedule-Resume {
    $cmd = New-ScheduledTaskAction -Execute "$env:WINDIR/System32/WindowsPowerShell/v1.0/powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$setup/provision-server.ps1`" -Action Configure -Server $Server -InstallDir `"$InstallDir`""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    Register-ScheduledTask -TaskName $taskName -Action $cmd -Trigger $trigger -Principal $principal -Force | Out-Null
    Write-Host 'REBOOT REQUIRED: setup will complete automatically after restart.'
}

try {
    if ($Action -eq 'Test') { Test-Server; exit 0 }
    if ($Action -eq 'Prepare') {
        if ([Environment]::OSVersion.Version.Build -lt 17763) { throw 'Windows 10 1809 / Server 2019 or later required' }
        $existing = Get-ItemProperty 'HKLM:/Software/microPhotoFrame' -ErrorAction SilentlyContinue
        if ($existing -and $existing.InstallDir -ne $InstallDir) { throw "Existing installation is in $($existing.InstallDir). Select that directory." }
        # Verify ownership before stopping any product service.
        foreach ($name in $services) { $svc = Get-CimInstance Win32_Service -Filter "Name='$name'"; if ($svc) { Assert-OwnedService $svc } }
        Stop-OwnedServices
        if ($port -and (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) { throw "Port $port is already in use by another application" }
        if ($Server -eq 'nginx' -and (Get-NetTCPConnection -State Listen -LocalPort 9089 -ErrorAction SilentlyContinue)) { throw 'PHP port 9089 is already in use' }
        exit 0
    }
    if ($Action -eq 'Remove') {
        Stop-OwnedServices -Delete
        Get-NetFirewallRule -Name 'microPhotoFrame-*' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        exit 0
    }
    if ($Server -eq 'none') { exit 0 }
    New-Item -ItemType Directory -Force $logDir,"$InstallDir/shows","$InstallDir/temp","$InstallDir/temp/nginx-client","$InstallDir/temp/nginx-fastcgi" | Out-Null
    Start-Transcript -Path "$logDir/setup.log" -Append | Out-Null
    # Service executables and reboot continuation must never be writable by ordinary users.
    Run-Exe "$env:WINDIR/System32/icacls.exe" @($InstallDir,'/inheritance:r','/grant:r','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F','*S-1-5-32-545:(OI)(CI)RX')
    Grant-Access $InstallDir '*S-1-5-19' 'RX'
    foreach ($dir in @('shows','logs','temp')) { Grant-Access "$InstallDir/$dir" '*S-1-5-19' 'M' }
    Stop-OwnedServices -Delete
    if ($Server -in @('apache','nginx')) {
        Run-Installer "$runtime/vc_redist.x64.exe" '/install /quiet /norestart'
        $php = if ($Server -eq 'apache') { "$runtime/php-ts" } else { "$runtime/php-nts" }
        Expand-Template 'php.ini' "$php/php.ini" $php
        Run-Exe "$php/php.exe" @('-c',"$php/php.ini",'-r','exit(class_exists("ZipArchive") ? 0 : 1);')
    }
    if ($Server -eq 'iis') {
        $framework = Get-ItemProperty 'HKLM:/SOFTWARE/Microsoft/NET Framework Setup/NDP/v4/Full' -ErrorAction SilentlyContinue
        if (!$framework -or $framework.Release -lt 528040) { Run-Installer "$runtime/net48.exe" '/q /norestart' }
        Enable-IIS
    }
    if ($script:reboot) { Schedule-Resume; Stop-Transcript | Out-Null; exit 3010 }
    switch ($Server) {
        node {
            Install-ServiceWrapper 'microPhotoFrameNode' "$runtime/node/node.exe" "`"$InstallDir/node/server.js`"" "$InstallDir/node"
        }
        apache {
            Expand-Template 'apache.conf' "$runtime/apache/conf/photoframe.conf"
            Run-Exe "$runtime/apache/bin/httpd.exe" @('-t','-f',"$runtime/apache/conf/photoframe.conf")
            Install-ServiceWrapper 'microPhotoFrameApache' "$runtime/apache/bin/httpd.exe" "-f `"$runtime/apache/conf/photoframe.conf`"" "$runtime/apache"
        }
        nginx {
            Expand-Template 'nginx.conf' "$runtime/nginx/conf/photoframe.conf"
            Run-Exe "$runtime/nginx/nginx.exe" @('-t','-p',"$runtime/nginx/",'-c','conf/photoframe.conf')
            Install-ServiceWrapper 'microPhotoFramePHP' "$runtime/php-nts/php-cgi.exe" "-c `"$runtime/php-nts/php.ini`" -b 127.0.0.1:9089" "$runtime/php-nts" '<env name="PHP_FCGI_MAX_REQUESTS" value="0"/>'
            Install-ServiceWrapper 'microPhotoFrameNginx' "$runtime/nginx/nginx.exe" "-p `"$runtime/nginx/`" -c conf/photoframe.conf" "$runtime/nginx" '<depend>microPhotoFramePHP</depend>'
        }
        iis {
            if (!(Test-Path "$env:WINDIR/System32/inetsrv/rewrite.dll")) {
                Run-Installer "$env:WINDIR/System32/msiexec.exe" "/i `"$runtime/rewrite.msi`" /qn /norestart /L*v `"$logDir/rewrite-install.log`""
            }
            if ($script:reboot) { Schedule-Resume; Stop-Transcript | Out-Null; exit 3010 }
            Add-Type -Path "$env:WINDIR/System32/inetsrv/Microsoft.Web.Administration.dll"
            $manager = New-Object Microsoft.Web.Administration.ServerManager
            try {
                $pool = $manager.ApplicationPools['microPhotoFrame']
                if (!$pool) { $pool = $manager.ApplicationPools.Add('microPhotoFrame') }
                $pool.ManagedRuntimeVersion = 'v4.0'
                $pool.ManagedPipelineMode = 'Integrated'
                $pool.ProcessModel.IdentityType = 'ApplicationPoolIdentity'
                $site = $manager.Sites.Add('microPhotoFrame','http',"*:${port}:",$InstallDir)
                $site.Applications['/'].ApplicationPoolName = 'microPhotoFrame'
                $site.ServerAutoStart = $true
                $manager.CommitChanges()
            } finally { $manager.Dispose() }
            Grant-Access $InstallDir 'IIS AppPool\microPhotoFrame' 'RX'
            foreach ($dir in @('shows','logs','temp')) { Grant-Access "$InstallDir/$dir" 'IIS AppPool\microPhotoFrame' 'M' }
            Expand-Template 'iis.config' "$InstallDir/web.config"
            Set-Service W3SVC -StartupType Automatic
            Start-Service W3SVC
        }
    }
    Get-NetFirewallRule -Name 'microPhotoFrame-*' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -Name "microPhotoFrame-$Server" -DisplayName "microPhotoFrame $Server" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Private,Domain -RemoteAddress LocalSubnet | Out-Null
    Test-Server
    Write-Utf8 "$InstallDir/Open microPhotoFrame.url" "[InternetShortcut]`r`nURL=http://localhost:$port/`r`n"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Stop-Transcript | Out-Null
    exit 0
} catch {
    Write-Host "SETUP FAILED: $($_.Exception.Message)"
    Write-Host $_.ScriptStackTrace
    try { Stop-Transcript | Out-Null } catch {}
    exit 1
}
