# Runs only on a disposable Windows CI runner, never on a developer workstation.
[CmdletBinding()]
param([Parameter(Mandatory)][ValidateSet('node','iis','apache','nginx')][string]$Server)
$env:PSModulePath = "$PSHOME\Modules;${env:ProgramFiles}\WindowsPowerShell\Modules;$env:WINDIR\System32\WindowsPowerShell\v1.0\Modules"
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'This integration test requires a disposable GitHub Actions runner' }
$root = Split-Path $PSScriptRoot
$version = (Get-Content "$root/package.json" -Raw | ConvertFrom-Json).version
$installer = "$root/installers/microPhotoFrame_${Server}_Setup_v$version.exe"
$target = "C:\microPhotoFrame CI $Server"
$ports = @{node=891; iis=888; apache=889; nginx=890}
$baselineSites = if (Test-Path "$env:WINDIR/System32/inetsrv/config/applicationHost.config") { [xml](Get-Content "$env:WINDIR/System32/inetsrv/config/applicationHost.config" -Raw) } else { $null }
function Install {
    $p = Start-Process -FilePath $installer -ArgumentList "/S /D=$target" -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -ne 0) { throw "Installer exit code $($p.ExitCode)" }
    & "$env:WINDIR/System32/WindowsPowerShell/v1.0/powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$target/.installer/provision-server.ps1" -Action Test -Server $Server -InstallDir $target
    if ($LASTEXITCODE -ne 0) { throw 'Post-install health check failed' }
}
try {
    Install
    $url = "http://127.0.0.1:$($ports[$Server])/"
    $created = Invoke-RestMethod "$url`?action=createShow" -Method Post -ContentType 'application/json' -Body '{"action":"createShow","input":{"showName":"InstallerTest","displayId":"I"}}'
    if (!$created.ok) { throw ('Cannot create a show: ' + ($created | ConvertTo-Json -Depth 8)) }
    'preserve-me' | Set-Content "$target/shows/installer-test.txt"
    $configHash = (Get-FileHash "$target/config.json").Hash
    foreach ($private in @('runtime/server-runtimes.json','%72untime/server-runtimes.json','.installer/provision-server.ps1','logs/setup.log')) {
        try { $r = Invoke-WebRequest ($url + $private) -UseBasicParsing; throw "Private file exposed: $private ($($r.StatusCode))" }
        catch { if (!$_.Exception.Response -or [int]$_.Exception.Response.StatusCode -notin @(403,404)) { throw } }
    }
    Install # upgrade the same installation with existing user data
    if ((Get-Content "$target/shows/installer-test.txt") -ne 'preserve-me' -or (Get-FileHash "$target/config.json").Hash -ne $configHash) { throw 'Update modified user data' }
    $owned = @(Get-Service 'microPhotoFrame*' -ErrorAction SilentlyContinue)
    foreach ($svc in $owned) { if ($svc.StartType -ne 'Automatic') { throw 'Service is not automatic' }; Stop-Service $svc.Name -Force }
    foreach ($svc in $owned) { Start-Service $svc.Name }
    & "$target/.installer/provision-server.ps1" -Action Test -Server $Server -InstallDir $target
    if ($LASTEXITCODE -ne 0) { throw 'Restart health check failed' }
    $p = Start-Process -FilePath "$target/uninstall.exe" -ArgumentList '/S' -Wait -PassThru -WindowStyle Hidden
    # NSIS copies its uninstaller before launching; wait for that child to finish cleanup.
    for ($i=0; $i -lt 60 -and (Test-Path "$target/.installer"); $i++) { Start-Sleep -Seconds 1 }
    if (Get-Service 'microPhotoFrame*' -ErrorAction SilentlyContinue) { throw 'Uninstall left services behind' }
    if (Get-NetFirewallRule -Name 'microPhotoFrame-*' -ErrorAction SilentlyContinue) { throw 'Uninstall left firewall rules behind' }
    if (!(Test-Path "$target/shows/installer-test.txt") -or (Get-FileHash "$target/config.json").Hash -ne $configHash) { throw 'Uninstall removed user data' }
    if (Test-Path "$target/.installer") { throw 'Uninstall did not complete' }
    if ($baselineSites) {
        [xml]$after = Get-Content "$env:WINDIR/System32/inetsrv/config/applicationHost.config" -Raw
        foreach ($site in $baselineSites.configuration.'system.applicationHost'.sites.site) {
            if ($site.name -notin @($after.configuration.'system.applicationHost'.sites.site | ForEach-Object name)) { throw "Existing IIS site was removed: $($site.name)" }
        }
    }
    Write-Host "PASS: $Server fresh install, API write, upgrade, restart, private paths, uninstall, data preservation"
} finally {
    if (Test-Path "$target/logs") {
        New-Item -ItemType Directory -Force "$root/tmp/test-logs/$Server" | Out-Null
        Copy-Item "$target/logs/*" "$root/tmp/test-logs/$Server" -Recurse -Force
    }
}

