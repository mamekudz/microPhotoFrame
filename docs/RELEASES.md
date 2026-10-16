# GitHub Releases bauen

`.github/workflows/release.yml` baut bei einem Tag `vX.Y.Z` alle Downloads und veröffentlicht sie nach erfolgreichem Abschluss aller Builds. `workflow_dispatch` baut nur Actions-Artefakte zum Prüfen. Ein vorhandenes Release wird nicht stillschweigend überschrieben.

Die Versionsnummern in `package.json`, im ersten Eintrag von `RELEASES.json`, in `FIRMWARE_VERSION` und im Tag müssen übereinstimmen. Vor einem Tag alle Änderungen committen und pushen. Erst nach erfolgreichen Test-Builds taggen. Der Workflow benötigt Actions und `contents: write` nur im Veröffentlichungsjob.

## Downloads

- Server: je ein ZIP für Node, IIS, Apache und Nginx.
- Windows: je eine vollständige NSIS-EXE für Node.js, IIS, Apache und Nginx. Laufzeiten und produktive Abhängigkeiten werden mitgeliefert; Setup richtet Dienste bzw. IIS-Website, Schreibrechte und Firewall automatisch ein und prüft die Erreichbarkeit. Ein erforderlicher Windows-Neustart setzt die Einrichtung automatisch fort.
- Firmware: je ein ZIP für reTerminal E1002 und NeoFrame mit Boot-Dateien, Firmware, Manifest, Python-Installer, Windows-Starter und lokalem Web-Flasher. E1001 ist kein eigenes Build-Ziel.
- Handbuch: versionierte DOCX und PDF; zusätzlich SHA256SUMS.txt über alle Downloads.

## Lokal bauen

```powershell
npm ci
npm run release:check
npm run test:release
npm run build:packages
$env:PHOTOFRAME_INSTALLER_SERVER = 'node' # auch iis, apache, nginx
npm run build:installer
$env:PHOTOFRAME_PLATFORM = 'reterminal-e1002' # oder neoframe
$env:PLATFORMIO_EXTRA_SCRIPTS = 'post:../tools/release-firmware.py'
npm run firmware:build
node tools/release.mjs firmware reterminal-e1002
python tools/build-manual.py
```

NSIS über PATH/MAKENSIS, PlatformIO und LibreOffice werden benötigt. Release-Builds immer in einem sauberen Checkout ausführen: die bestehenden Paket-Globs können zusätzliche lokale Dateien einschließen.

Der Firmware-Export übernimmt `FLASH_EXTRA_IMAGES` und `ESP32_APP_OFFSET` aus dem tatsächlichen PlatformIO-Build, einschließlich Boot-App-Datei. Keine manuell geratenen Adressen. Installieren löscht nicht automatisch den kompletten Flash; ein Löschen im Web-Dialog kann gespeicherte Einstellungen entfernen. Die Geräte wurden laut Bestätigung des Projektverantwortlichen getestet; die CI prüft zusätzlich Paketaufbau und Serverinstallation.

## Handbuch bearbeiten

Quelle: `docs/manual/microPhotoFrame_Handbuch_DE.src.docx`. In Word oder LibreOffice bearbeiten. `{{VERSION}}` als zusammenhängenden Text erhalten; der Builder ersetzt ihn in einer Ausgabekopie. Die Quelle wird nie überschrieben. `python tools/build-manual.py` erzeugt die versionierte DOCX und PDF unter `release-assets/`; benötigt Python 3 und LibreOffice, aber keine Python-Zusatzpakete. `SOFFICE` kann den Konverterpfad vorgeben. Ein separates temporäres LibreOffice-Profil vermeidet Konflikte mit geöffneten Dokumenten.

Grundlagen: [PlatformIO extra scripts](https://docs.platformio.org/en/latest/projectconf/sections/env/options/advanced/extra_scripts.html) und [ESP Web Tools](https://esphome.github.io/esp-web-tools/).

## Vollständige Windows-Installer

`installer/assets/server-runtimes.json` pinnt Hersteller-Downloads mit SHA256. `tools/build-server-runtimes.ps1` lädt sie beim Build, prüft die Hashes und paketiert produktive Node-Abhängigkeiten. Endanwender benötigen keinen npm-Download. Für Windows-Komponenten kann Windows Update oder ein konfigurierter Features-on-Demand-Quellpfad erforderlich sein.

`installer/provision-server.ps1` verwaltet ausschließlich die eigenen Dienste und die Website microPhotoFrame. Alle Serverprozesse laufen als LocalService bzw. IIS-AppPool-Identität. Ein nötiger Neustart führt über eine temporäre Startaufgabe zur automatischen Fortsetzung. Update und Deinstallation erhalten shows und config.json.

`Full Windows installers` testet auf isolierten Windows-Runnern Erstinstallation, API-Schreibzugriff, Update, Dienstneustart, Schutz interner Dateien sowie Deinstallation mit Datenerhalt. Die Release-Pipeline führt dieselben Tests vor Veröffentlichung aus.
