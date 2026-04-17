# Windows-Installer bauen

Große Drittanbieter-Artefakte liegen **nicht** im Git-Repository. Vor `npm run build:installer`:

## 1. NSIS (makensis)

- [NSIS](https://nsis.sourceforge.io/Download) installieren (z. B. nach `C:\Program Files (x86)\NSIS\`).
- Entweder `makensis` im **PATH**, oder Umgebungsvariable **`MAKENSIS`** auf die volle Pfadangabe zu `makensis.exe` setzen, optional **`NSISDIR`** auf das NSIS-Installationsverzeichnis.

Gulp ruft `makensis /V3` mit `installer/microPhotoFrame_Installer.nsi` vom **Projektroot** auf.

## 2. Redistributables (Microsoft & Co.)

```bash
npm run fetch:installer-assets
```

Lädt fehlende Dateien laut `installer/assets/redistributables.json` nach `installer/assets/` (lokal, nicht versioniert außer Manifest + Icon).

Optional: `SKIP_FETCH_INSTALLER_ASSETS=1` überspringt den Download.

## 3. Installer bauen

```bash
npm run build:installer
```

Ausgabe: `installers/microPhotoFrame_Setup_v*.exe`

## Web-UI: TensorFlow / COCO-SSD

Die Skripte werden in `index.html` per **CDN (jsDelivr)** eingebunden. Die Funktion **AI Auto-Center** benötigt damit **Internetzugriff** im Browser. Ohne Netzwerk siehe [TensorFlow.js](https://www.tensorflow.org/js) zur Selbst-Hosting-Variante.
