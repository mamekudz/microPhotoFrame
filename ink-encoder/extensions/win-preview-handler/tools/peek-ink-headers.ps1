param([string]$Dir = "C:\Projects\microPhotoFrame\shows\show_test")
Get-ChildItem -Path $Dir -Filter *.ink -ErrorAction Stop | Select-Object -First 12 | ForEach-Object {
    $b = [IO.File]::ReadAllBytes($_.FullName)
    $o = $b[3] -band 1
    Write-Host ("{0,-42} v={1} id={2} orient={3}  ({4} bytes)" -f $_.Name, $b[0], [char]$b[1], $o, $b.Length)
}
