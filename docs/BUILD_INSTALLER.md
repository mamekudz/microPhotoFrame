# Vollständige Windows-Installer bauen

NSIS installieren und `MAKENSIS` auf makensis.exe setzen. Dann:

```powershell
npm ci
$env:PHOTOFRAME_INSTALLER_SERVER = 'node' # iis, apache, nginx; leer fuer Auswahl-Installer
npm run build:installer
```

Der Build lädt die benötigten Laufzeiten anhand von `installer/assets/server-runtimes.json`, prüft ihre SHA256-Hashes und integriert sie in die EXE. Node-Abhängigkeiten werden beim Build installiert und mitgeliefert. Download-Cache: `installer/assets/runtime-cache`; vorbereitete Dateien: `tmp/runtime`. Beide sind nicht versioniert. Die früheren SQL-Server- und Desktop-.NET-Downloads werden nicht mehr verwendet.

Die EXE installiert und konfiguriert den Server einschließlich Autostart, Rechten und lokaler Firewall-Freigabe. Ein Neustart für Windows-Komponenten wird erkannt; die Einrichtung wird danach automatisch fortgesetzt. Details und Tests: [RELEASES.md](RELEASES.md).

Ausgabe: `installers/microPhotoFrame_<server>_Setup_v<version>.exe`.
