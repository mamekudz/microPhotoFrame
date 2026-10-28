[CmdletBinding()]
param([ValidateSet('node','iis','apache','nginx','all')][string]$Server = 'all')
$env:PSModulePath = "$PSHOME\Modules;${env:ProgramFiles}\WindowsPowerShell\Modules;$env:WINDIR\System32\WindowsPowerShell\v1.0\Modules"
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$manifest = Get-Content "$root/installer/assets/server-runtimes.json" -Raw | ConvertFrom-Json
$cache = Join-Path $root 'installer/assets/runtime-cache'
$stage = Join-Path $root 'tmp/runtime'
New-Item -ItemType Directory -Force $cache,$stage | Out-Null
foreach ($item in $manifest.items) {
    if ($Server -ne 'all' -and $Server -notin $item.servers) { continue }
    $file = Join-Path $cache $item.file
    if (!(Test-Path $file) -or (Get-FileHash $file -Algorithm SHA256).Hash -ne $item.sha256) {
        $part = "$file.part"
        $ok = $false
        for ($attempt = 1; $attempt -le 5; $attempt++) {
            # Resume a partial file; curl --retry alone skips error 18 (truncated body).
            & curl.exe --fail --location --proto '=https' --proto-redir '=https' `
                --retry 5 --retry-all-errors --retry-delay 3 --retry-max-time 180 `
                --continue-at - --silent --show-error -o $part $item.url
            if ($LASTEXITCODE -eq 0 -and (Test-Path $part) -and (Get-FileHash $part -Algorithm SHA256).Hash -eq $item.sha256) {
                $ok = $true
                break
            }
            Write-Host "Download attempt $attempt failed for $($item.file) (exit $LASTEXITCODE)"
            if (Test-Path $part) { Remove-Item -LiteralPath $part -Force }
            Start-Sleep -Seconds (3 * $attempt)
        }
        if (-not $ok) { throw "Download failed: $($item.file)" }
        Move-Item -LiteralPath $part -Destination $file -Force
    }
    Write-Host "Verified $($item.file)"
    if ($item.kind -eq 'zip') {
        $dest = Join-Path $stage $item.folder
        if (!(Test-Path "$dest/.source-$($item.sha256)")) {
            # Only replace the named staging directory inside this project's tmp/runtime.
            if (([IO.Path]::GetFullPath($dest)).StartsWith(([IO.Path]::GetFullPath($stage) + [IO.Path]::DirectorySeparatorChar)) -eq $false) { throw 'Unsafe staging path' }
            if (Test-Path $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
            New-Item -ItemType Directory -Force $dest | Out-Null
            Expand-Archive -LiteralPath $file -DestinationPath $dest
            if ($item.strip) {
                $nested = Join-Path $dest $item.strip
                Get-ChildItem -LiteralPath $nested -Force | Move-Item -Destination $dest
                Remove-Item -LiteralPath $nested
            }
            New-Item -ItemType File "$dest/.source-$($item.sha256)" | Out-Null
        }
    } else { Copy-Item -LiteralPath $file -Destination (Join-Path $stage $item.file) -Force }
}
if ($Server -in @('all','node')) {
    $deps = Join-Path $stage 'node-deps'
    New-Item -ItemType Directory -Force $deps | Out-Null
    Copy-Item "$root/node/package*.json" $deps -Force
    & npm.cmd ci --omit=dev --prefix $deps
    if ($LASTEXITCODE -ne 0) { throw 'Node dependency staging failed' }
}
Copy-Item "$root/installer/assets/server-runtimes.json" "$stage/server-runtimes.json" -Force
