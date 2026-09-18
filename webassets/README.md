Hier liegen Icons, Logos und Web-Grafiken (wie in `index.html`: `Logo.png`, `LogoText.png`).

## Node: `ink-encoder` (Workspace)

Das Projekt bindet **`ink-encoder` als npm-Workspace** ein (`ink-encoder/` im PhotoFrame-Root, Abhängigkeit `file:ink-encoder`, Paket **2.0.0**). Ein Nachbar-Checkout ist nicht nötig. `packages/` bleibt den Firmware-/Serverpaketen vorbehalten.

Im **microPhotoFrame-Root**:

```bash
npm install
```

So landet das Workspace-Paket in `node_modules/ink-encoder` (Symlink/Junction auf `ink-encoder/`).

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
