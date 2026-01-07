# µPhotoFrame Firmware Upload Script
# UTF-8 encoding fix for Windows
$env:PYTHONIOENCODING="utf-8"
chcp 65001 | Out-Null

Write-Host "🔌 Closing any open monitors..." -ForegroundColor Cyan
taskkill /F /IM python.exe /T 2>$null | Out-Null
Start-Sleep -Seconds 1

Write-Host "📤 Uploading firmware..." -ForegroundColor Cyan
gulp firmware_upload

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host ""
    $response = Read-Host "Start monitor? (y/n)"
    if ($response -eq "y") {
        Write-Host "📺 Starting monitor..." -ForegroundColor Cyan
        Start-Sleep -Seconds 2
        pio device monitor --raw
    }
} else {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
}

