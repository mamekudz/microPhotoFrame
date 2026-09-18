#Requires -Version 5.1
<#
  Kernlogik: .ink-Shell-Erweiterungen in der Registry (Vorschau vs. Miniatur).

  Nicht direkt mit .\diagnose-ink-core.ps1 starten, wenn die Richtlinie nur signierte
  Skripte erlaubt — dann schlägt das Laden fehl.

  Start: diagnose-ink-shell.cmd / .bat (Doppelklick oder .\diagnose-ink-shell.cmd)
  Oder: powershell -NoProfile -ExecutionPolicy Bypass -File diagnose-ink-core.ps1
#>
param(
    [switch]$NoPause
)
$ErrorActionPreference = "Continue"
$thumbGuid = "{E357FCCD-A995-4576-B01F-234630154E9D}"
$previewGuid = "{8895b1c6-b41f-4c1c-a562-0d564250836f}"

function Get-RegValue($path, $name = "(default)") {
    try {
        if ($name -eq "(default)") { (Get-ItemProperty -LiteralPath $path -ErrorAction Stop).'(default)' }
        else { (Get-ItemProperty -LiteralPath $path -Name $name -ErrorAction Stop).$name }
    } catch { $null }
}

Write-Host "=== .ink Dateizuordnung (HKCR / HKCU\Software\Classes) ===" -ForegroundColor Cyan
$classesRoots = @(
    "Registry::HKEY_CURRENT_USER\Software\Classes",
    "Registry::HKEY_CLASSES_ROOT"
)

foreach ($root in $classesRoots) {
    $ink = Join-Path $root ".ink"
    if (-not (Test-Path -LiteralPath $ink)) { continue }
    Write-Host "`nPfad: $ink"
    $def = Get-RegValue $ink
    if ($def) { Write-Host "  (Standard) / ProgID-Verweis: $def" }
    $thumbPath = Join-Path $ink "shellex\$thumbGuid"
    if (Test-Path -LiteralPath $thumbPath) {
        $t = Get-RegValue $thumbPath
        Write-Host "  Miniatur ($thumbGuid): $t" -ForegroundColor Yellow
        if ($t -and $t -notmatch "b1c2d3e4-f5a6-4789-a012-3456789abcde") {
            Write-Host "    -> ANDERER Handler als InkShell (erwartet: ...b1c2d3e4...)" -ForegroundColor Red
        }
    } else {
        Write-Host "  Miniatur: (kein Eintrag unter shellex)" -ForegroundColor Red
    }
    $pvPath = Join-Path $ink "shellex\$previewGuid"
    if (Test-Path -LiteralPath $pvPath) {
        $p = Get-RegValue $pvPath
        Write-Host "  Vorschau ($previewGuid): $p"
    }
}

# ProgID-Kette: Explorer/Miniatur nutzen oft HKCR\<ProgID>\shellex\… (z. B. ink.1)
Write-Host "`n=== ProgID-Zweig (Miniatur braucht Eintrag hier, wenn .ink -> ProgID zeigt) ===" -ForegroundColor Cyan
foreach ($root in $classesRoots) {
    $ink = Join-Path $root ".ink"
    if (-not (Test-Path -LiteralPath $ink)) { continue }
    $progId = Get-RegValue $ink
    if (-not $progId -or $progId -match '^\.') { continue }
    $pPath = Join-Path $root $progId
    if (-not (Test-Path -LiteralPath $pPath)) { continue }
    Write-Host "`n$root\$progId"
    $tp = Join-Path $pPath "shellex\$thumbGuid"
    if (Test-Path -LiteralPath $tp) {
        $tv = Get-RegValue $tp
        Write-Host "  Miniatur: $tv" -ForegroundColor Yellow
        if ($tv -and $tv -notmatch "b1c2d3e4-f5a6-4789-a012-3456789abcde") {
            Write-Host "    -> Fremde CLSID" -ForegroundColor Red
        }
    } else {
        Write-Host "  Miniatur: FEHLT unter shellex -> Symbole bleiben leer" -ForegroundColor Red
    }
    $pp = Join-Path $pPath "shellex\$previewGuid"
    if (Test-Path -LiteralPath $pp) {
        Write-Host "  Vorschau: $(Get-RegValue $pp)"
    } else {
        Write-Host "  Vorschau: (kein shellex-Eintrag unter ProgID)"
    }
}

Write-Host "`n=== Shell Extensions Approved (HKLM, Miniatur oft Pflicht) ===" -ForegroundColor Cyan
$ap = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Shell Extensions\Approved"
if (Test-Path $ap) {
    $ourThumb = (Get-ItemProperty $ap -ErrorAction SilentlyContinue).'{B1C2D3E4-F5A6-4789-A012-3456789ABCDE}'
    $ourPrev = (Get-ItemProperty $ap -ErrorAction SilentlyContinue).'{8C4E2F91-0B3A-4D7E-9F12-6A5E8C3D1B07}'
    if ($ourThumb) { Write-Host "  Thumbnail Approved: $ourThumb" } else { Write-Host "  Thumbnail Approved: FEHLT (install.cmd als Admin ausführen)" -ForegroundColor Red }
    if ($ourPrev) { Write-Host "  Preview Approved:   $ourPrev" } else { Write-Host "  Preview Approved:   (optional)" }
} else {
    Write-Host "  Schlüssel nicht gefunden."
}

Write-Host "`nHinweis: Wenn unter Miniatur eine fremde CLSID steht, blockiert diese unseren Handler." -ForegroundColor Gray
Write-Host "Deinstallieren Sie die andere Software oder entfernen Sie deren shellex-Eintrag (Backup!)." -ForegroundColor Gray

if (-not $NoPause -and -not [Console]::IsInputRedirected) {
    Write-Host ""
    Read-Host "Enter druecken zum Schliessen"
}
