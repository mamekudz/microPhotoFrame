# GitHub Releases bauen

`.github/workflows/release.yml` baut bei einem Tag `vX.Y.Z` alle Downloads und verÃ¶ffentlicht sie nach erfolgreichem Abschluss aller Builds. `workflow_dispatch` baut nur Actions-Artefakte zum PrÃ¼fen. Ein vorhandenes Release wird nicht stillschweigend Ã¼berschrieben.

Die Versionsnummern in `package.json`, im ersten Eintrag von `RELEASES.json`, in `FIRMWARE_VERSION` und im Tag mÃ¼ssen Ã¼bereinstimmen. Vor einem Tag alle Ã„nderungen committen und pushen. Erst nach erfolgreichen Test-Builds taggen. Der Workflow benÃ¶tigt Actions und `contents: write` nur im VerÃ¶ffentlichungsjob.

## Downloads

- Server: je ein ZIP fÃ¼r Node, IIS, Apache und Nginx.
- Windows: je eine NSIS-EXE fÃ¼r denselben Server. Die Laufzeiten mÃ¼ssen installiert sein; IIS, Apache und Nginx werden anhand der mitgelieferten Konfigurationen eingerichtet. Node-AbhÃ¤ngigkeiten werden mit `npm ci --omit=dev` installiert. Kein MSI und keine automatische Dienstinstallation.
- Firmware: je ein ZIP fÃ¼r reTerminal E1002 und NeoFrame mit Boot-Dateien, Firmware, Manifest, Python-Installer, Windows-Starter und lokalem Web-Flasher. E1001 ist kein eigenes Build-Ziel.
- Handbuch: versionierte DOCX und PDF; zusÃ¤tzlich SHA256SUMS.txt Ã¼ber alle Downloads.

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

NSIS Ã¼ber PATH/MAKENSIS, PlatformIO und LibreOffice werden benÃ¶tigt. Release-Builds immer in einem sauberen Checkout ausfÃ¼hren: die bestehenden Paket-Globs kÃ¶nnen zusÃ¤tzliche lokale Dateien einschlieÃŸen.

Der Firmware-Export Ã¼bernimmt `FLASH_EXTRA_IMAGES` und `ESP32_APP_OFFSET` aus dem tatsÃ¤chlichen PlatformIO-Build, einschlieÃŸlich Boot-App-Datei. Keine manuell geratenen Adressen. Installieren lÃ¶scht nicht automatisch den kompletten Flash; ein LÃ¶schen im Web-Dialog kann gespeicherte Einstellungen entfernen. Physische GerÃ¤tetests bleiben zusÃ¤tzlich erforderlich.

## Handbuch bearbeiten

Quelle: `docs/manual/microPhotoFrame_Handbuch_DE.src.docx`. In Word oder LibreOffice bearbeiten. `{{VERSION}}` als zusammenhÃ¤ngenden Text erhalten; der Builder ersetzt ihn in einer Ausgabekopie. Die Quelle wird nie Ã¼berschrieben. `python tools/build-manual.py` erzeugt die versionierte DOCX und PDF unter `release-assets/`; benÃ¶tigt Python 3 und LibreOffice, aber keine Python-Zusatzpakete. `SOFFICE` kann den Konverterpfad vorgeben. Ein separates temporÃ¤res LibreOffice-Profil vermeidet Konflikte mit geÃ¶ffneten Dokumenten.

Grundlagen: [PlatformIO extra scripts](https://docs.platformio.org/en/latest/projectconf/sections/env/options/advanced/extra_scripts.html) und [ESP Web Tools](https://esphome.github.io/esp-web-tools/).

## Vollständige Windows-Installer

`installer/assets/server-runtimes.json` pinnt Hersteller-Downloads mit SHA256. `tools/build-server-runtimes.ps1` lädt sie beim Build, prüft die Hashes und paketiert produktive Node-Abhängigkeiten. Endanwender benötigen keinen npm-Download. Für Windows-Komponenten kann Windows Update oder ein konfigurierter Features-on-Demand-Quellpfad erforderlich sein.

`installer/provision-server.ps1` verwaltet ausschließlich die eigenen Dienste und die Website microPhotoFrame. Alle Serverprozesse laufen als LocalService bzw. IIS-AppPool-Identität. Ein nötiger Neustart führt über eine temporäre Startaufgabe zur automatischen Fortsetzung. Update und Deinstallation erhalten shows und config.json.

`Full Windows installers` testet auf isolierten Windows-Runnern Erstinstallation, API-Schreibzugriff, Update, Dienstneustart, Schutz interner Dateien sowie Deinstallation mit Datenerhalt. Die Release-Pipeline führt dieselben Tests vor Veröffentlichung aus.
