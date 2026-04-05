Hier liegen Icons, Logos und Web-Grafiken (wie in `index.html`: `Logo.png`, `LogoText.png`).

## Node: `ink-encoder` (lokal, nicht auf npm)

Das Projekt bindet **`ink-encoder` per `file:../ink-encoder`** ein (Quelle z. B. `C:\Projects\ink-encoder`).  
Beide Repositories sollten **nebeneinander** unter demselben übergeordneten Ordner liegen (`microPhotoFrame` und `ink-encoder`). Danach im **microPhotoFrame-Root**:

```bash
npm install
```

So landet das aktuelle Modul in `node_modules/ink-encoder` (Symlink/Junction), inkl. Format-Änderungen — **kein manuelles Kopieren** nötig.  
Liegt `ink-encoder` woanders, in `package.json` den Pfad in `"file:…"` anpassen.

Eingebettetes Rahmen-Branding (optional): `npm run gen:branding` erzeugt `firmware/include/embedded_branding_ink.h` mit derselben Codec-Logik.

## Aus `rawmedia` synchronisieren

PNG-Quellen können unter `rawmedia/Logo.png` und `rawmedia/LogoText.png` liegen. Dann aus dem Projektroot:

```bash
npx gulp COPY_RAWMEDIA_WEBASSETS
```

## SD-Karte im Rahmen (optional)

Der Rahmen funktioniert **ohne SD** (Bilder nur vom Server). Die SD dient nur für Cache, Logos im Web-UI, Startup-.ink und Offline-Letztes-Bild.

Damit der ESP32 dieselben Assets wie die Website nutzt, **optional** auf die SD kopieren:

| Auf der SD-Karte        | Quelle (Repo)        |
|-------------------------|----------------------|
| `/webassets/Logo.png`   | `webassets/Logo.png` |
| `/webassets/LogoText.png` | `webassets/LogoText.png` |
| `/favicon.ico` (optional) | Projektroot `favicon.ico` (z. B. `npx gulp BUILD_ICO` aus `rawmedia/ico/`) |

Fallback ohne `webassets/`: `/Logo.png`, `/LogoText.png`. Älteres Display-Logo: `/EINK_SPECTRA6_730_sq_800x480_logo.png`.
