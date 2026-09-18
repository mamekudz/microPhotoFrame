# ink-encoder

Node.js module for encoding/decoding .ink image files for E-Ink displays.

This tree is the **2.0.0** workspace package inside [microPhotoFrame](https://github.com/mamekudz/microPhotoFrame). It is **not** drop-in compatible with npm `ink-encoder@1.0.0`. Unpublished drafts `1.2.0` / `1.2.1` must not be published. See [CHANGELOG.md](CHANGELOG.md).

**Die Kompatibilität mit früher erzeugten .ink-Dateien ist nicht garantiert. Beim Upgrade Encoder und Firmware gemeinsam auf zueinander passende Stände aktualisieren und bestehende Shows aus den Originalbildern neu erzeugen.**

## Installation

**microPhotoFrame (workspace):** one repository checkout, then from the PhotoFrame root:

```bash
npm install
```

The workspace package `ink-encoder/` is linked automatically. A sibling checkout of `C:\Projects\ink-encoder` is not required.

**Standalone (after this version is published to npm):**

```bash
npm install ink-encoder
```

The module uses `sharp` for image processing; npm installs it as a runtime dependency. The published tarball contains `src/`, this README, LICENSE and CHANGELOG — no `node_modules`, extensions or build artifacts.

## Verwendung

### PNG zu .ink konvertieren (mit Display-ID)

Die einfachste Methode ist die Verwendung einer Display-ID:

```javascript
import { EncodeInkFromDisplayId, GetDisplayByShortId } from 'ink-encoder';
import { writeFileSync } from 'fs';

// Einfachste Methode: Nur Display-ID angeben
const inkData = await EncodeInkFromDisplayId('./input.png', 'I', {
  dither: 'floyd',
  orientation: 0,
  colorAdjust: {
    saturation: 1.8,
    contrast: 1.4
  }
}, './output.ink');

// Oder ohne outputPath, dann wird Buffer zurückgegeben
const inkBuffer = await EncodeInkFromDisplayId('./input.png', 'I');
writeFileSync('./output.ink', inkBuffer);
```

### PNG zu .ink konvertieren (manuelle Optionen)

```javascript
import { EncodeInk } from 'ink-encoder';
import { writeFileSync } from 'fs';

const options = {
  colors: ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"], // Spectra 6 Farben
  width: 800,
  height: 480,
  displayId: "I", // Spectra 6 7.3" / reTerminal E1002
  isRound: false, // Quadratisches Display
  dither: "floyd", // Dithering: "floyd", "bayer" oder "none"
  orientation: 0, // 0=Landscape, 1=Portrait
  colorAdjust: {
    saturation: 1.8,
    contrast: 1.4,
    blackPoint: 1.0,
    whitePoint: 1.1
  }
};

const inkData = await EncodeInk('./input.png', options);
writeFileSync('./output.ink', inkData);
```

### Display-Definitionen abrufen

```javascript
import { GetDisplayByShortId, GetAllDisplays, GetOptionsFromDisplayId } from 'ink-encoder';

// Einzelnes Display abrufen
const display = GetDisplayByShortId('I');
console.log(display.name); // 'Spectra 6 · 7.3" · 800×480 · reTerminal E1002'
console.log(display.colors); // ["#000000", "#FFFFFF", ...]
console.log(display.width); // 800
console.log(display.height); // 480

// Alle Displays abrufen
const allDisplays = GetAllDisplays();
console.log(Object.keys(allDisplays));

// Encoding-Optionen aus Display-ID generieren
const options = GetOptionsFromDisplayId('I', {
  dither: 'bayer',
  orientation: 1
});
```

### .ink zu PNG konvertieren

```javascript
import { DecodeInk } from 'ink-encoder';

const options = {
  colors: ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"],
  width: 800,
  height: 480,
  isRound: false,
  outputPath: './decoded.png' // Optional: Speichert direkt als PNG
};

const pngBuffer = await DecodeInk('./input.ink', options);
// Oder ohne outputPath: pngBuffer enthält die PNG-Daten
```

## Optionen

### EncodeInk(inputPath, options)

- **inputPath** (string|Buffer): Pfad zur PNG-Datei oder Buffer
- **options** (Object):
  - **colors** (Array<string>): Array von Hex-Farben (z.B. `["#FFFFFF", "#000000"]`)
  - **width** (number): Zielbreite in Pixeln
  - **height** (number): Zielhöhe in Pixeln
  - **displayId** (string): Display-ID Zeichen (z.B. `"I"` für Spectra 6 7,3" / reTerminal E1002)
  - **isRound** (boolean): Ob das Display rund ist (Standard: `false`)
  - **dither** (string): Dithering-Typ: `"floyd"`, `"bayer"` oder `"none"` (Standard: `"floyd"`)
  - **orientation** (number): Orientierung: `0`=Landscape, `1`=Portrait (Standard: `0`)
  - **compression** (string): `"lzw"` (v1), `"deflate"` (v2), `"deflatePaeth"` (v3, Standard)
  - **inkFormat** (number, optional): `1` | `2` | `3` überschreibt `compression`
  - **colorAdjust** (Object): Farbanpassungen
    - **saturation** (number): Sättigung (Standard: `1.0`)
    - **contrast** (number): Kontrast (Standard: `1.0`)
    - **blackPoint** (number): Schwarzwert (Standard: `1.0`)
    - **whitePoint** (number): Weißwert (Standard: `1.0`)

### DecodeInk(inputPath, options)

- **inputPath** (string|Buffer|Uint8Array): Pfad zur .ink-Datei, `Buffer`, oder `Uint8Array` von `EncodeInk`
- **options** (Object):
  - **colors** (Array<string>): Array von Hex-Farben (muss mit den Encoding-Farben übereinstimmen)
  - **width** (number): Display-Breite in Pixeln
  - **height** (number): Display-Höhe in Pixeln
  - **isRound** (boolean): Ob das Display rund ist (Standard: `false`)
  - **outputPath** (string, optional): Ausgabepfad für PNG-Datei

## Verfügbare Display-Definitionen

Das Modul enthält alle Display-Definitionen. Verwenden Sie einfach die Display-ID:

IDs follow `src/inkEncoder.mjs` (not the npm 1.0.0 README):

### Monochrome (B&W)
- **"0"**–**"7"**: 1.54" … 13.3"

### Grayscale (4-level)
- **"A"**–**"E"**: including **"D"** Gray4 7.5" · reTerminal E1001

### Spectra 6 (E6)
- **"G"** round 1.69" … **"P"** 43"
- **"I"**: Spectra 6 · 7.3" · 800×480 · reTerminal E1002

### Spectra BWR / BWY / BWRY
- **"Q"**–**"Y"** and **"a"**–**"e"** as in `DISPLAY_LONG_ID_BY_SHORT_ID`

### Beispiel: Display-Informationen abrufen

```javascript
import { GetDisplayByShortId } from 'ink-encoder';

const display = GetDisplayByShortId('I');
// {
//   id: "I",
//   name: 'Spectra 6 · 7.3" · 800×480 · reTerminal E1002',
//   width: 800,
//   height: 480,
//   colors: ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"],
//   geometry: 0, // 0 = square, 1 = round
//   size: 7.3
// }
```

## JSON-Konfiguration

Das Modul unterstützt die Verwendung von JSON-Konfigurationsdateien für einfache Batch-Verarbeitung:

```javascript
import { EncodeInkFromConfig, LoadConfigFromJSON } from 'ink-encoder';

// Option 1: Direkt mit Config-Datei
const inkData = await EncodeInkFromConfig('./input.png', './config/display-config.json', './output.ink');

// Option 2: Config laden und dann verwenden
const options = await LoadConfigFromJSON('./config/display-config.json');
const inkData2 = await EncodeInk('./input.png', options);
```

### Beispiel JSON-Konfiguration

```json
{
  "displayId": "I",
  "dither": "floyd",
  "orientation": 0,
  "colorAdjust": {
    "saturation": 1.8,
    "contrast": 1.4,
    "blackPoint": 1.0,
    "whitePoint": 1.1
  }
}
```

## Gulp-Tasks

Das Modul kann in Gulp-Tasks verwendet werden:

```javascript
import gulp from 'gulp';
import { EncodeInk, LoadConfigFromJSON } from 'ink-encoder';
import { writeFileSync } from 'fs';

gulp.task('convert-firmware-images', async () => {
  const options = await LoadConfigFromJSON('./config/ink-encode-config.json');
  
  const images = [
    './firmware/imgs/startup.png',
    './firmware/imgs/error.png'
  ];
  
  for (const imgPath of images) {
    const inkData = await EncodeInk(imgPath, options);
    const outputPath = imgPath.replace(/\.png$/i, '.ink');
    writeFileSync(outputPath, inkData);
    console.log(`✓ Converted ${imgPath} to ${outputPath}`);
  }
});
```

## .ink-Dateiformat (microPhotoFrame-Firmware)

Header **immer 4 Byte**, Payload ab Offset 4 (kein zusätzliches Kompressions-Byte mehr):

| Byte | Inhalt |
|------|--------|
| 0 | Format: **1** = LZW (minCodeSize 3), **2** = zlib-Deflate Rohpixel, **3** = zlib-Deflate + Paeth (Deltas mod `numColors`) |
| 1 | `displayId` (ASCII, z. B. `I` für Spectra 6 7,3" / reTerminal E1002) |
| 2 | Dither: 0 = none, 1 = Bayer, 2 = Floyd-Steinberg |
| 3 | Orientierung: 0 = Quer (Breite×Höhe), 1 = Hochkant (getauschte Abmessungen) |

**Optionen (Encode):** `compression` bzw. `inkFormat`: `lzw` / `deflate` / `deflatePaeth` (Standard). Für **runde** Displays wird v3 automatisch auf **v2** reduziert (Paeth braucht ein volles Rechteck-Raster).

**Decode:** Liest das aktuelle 4-Byte-Format (v1–v3), das dieser Encoder schreibt. Die Kompatibilität mit früher erzeugten `.ink`-Dateien ist nicht garantiert.

## Migration von npm 1.0.0

Kein Drop-in. Typische 1.0.0-README-Aufrufe unverändert:

```javascript
import { encodeInkFromDisplayId, getDisplay } from 'ink-encoder';
await encodeInkFromDisplayId('./input.png', '9', { dither: 'floyd' }, './output.ink');
getDisplay('9');
```

2.0.0:

```javascript
import { EncodeInkFromDisplayId, GetDisplayByShortId } from 'ink-encoder';
await EncodeInkFromDisplayId('./input.png', 'I', { dither: 'floyd' }, './output.ink');
GetDisplayByShortId('I');
```

| Thema | npm 1.0.0 | 2.0.0 |
|--------|-----------|--------|
| Named exports | camelCase (`encodeInk`, `getDisplay`, …) | PascalCase (`EncodeInk`, `GetDisplayByShortId`, …), keine Aliase |
| Spectra 6 7,3" | Short-ID **`"9"`** | Short-ID **`"I"`** (`"9"` existiert nicht) |
| `"I"` | Spectra BWR 2,13" | Spectra 6 7,3" / reTerminal E1002 |
| `DISPLAYS` | Keys `"0"`…`"U"` | Lange Keys `EINK_…` |
| Standard-Encode | immer `.ink` v1 LZW, Default-`displayId` `"9"` | `.ink` **v3** (Paeth+Deflate), Default-`displayId` `"0"` |
| Firmware (microPhotoFrame) | Dateien mit Header-ID `"9"` passen nicht zu `DEVICE_DISPLAY_ID "I"` | aktuelles 4-Byte-Format v1–v3, Header-ID `"I"` |

**Die Kompatibilität mit früher erzeugten .ink-Dateien ist nicht garantiert. Beim Upgrade Encoder und Firmware gemeinsam auf zueinander passende Stände aktualisieren und bestehende Shows aus den Originalbildern neu erzeugen.** Es gibt keine Zusage, dass der neue Decoder sämtliche alten Dateien korrekt liest oder dass alte Software neue Dateien liest. Details: [CHANGELOG.md](CHANGELOG.md).

## Hinweise

- Die Farbpalette muss bei Encoding und Decoding identisch sein
- Für runde Displays werden nur Pixel innerhalb des Kreises komprimiert
- zlib-Deflate entspricht der Dekompression mit `tinfl`/miniz auf dem ESP32

## Lizenz

MIT
