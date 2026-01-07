# ink-encoder

Node.js module for encoding/decoding .ink image files for E-Ink displays.

## Installation

```bash
npm install ink-encoder
```

Das Modul verwendet `sharp` für die Bildverarbeitung, das automatisch als Abhängigkeit installiert wird.

## Verwendung

### PNG zu .ink konvertieren (mit Display-ID)

Die einfachste Methode ist die Verwendung einer Display-ID:

```javascript
import { encodeInkFromDisplayId, getDisplay } from 'ink-encoder';
import { writeFileSync } from 'fs';

// Einfachste Methode: Nur Display-ID angeben
const inkData = await encodeInkFromDisplayId('./input.png', '9', {
  dither: 'floyd',
  orientation: 0,
  colorAdjust: {
    saturation: 1.8,
    contrast: 1.4
  }
}, './output.ink');

// Oder ohne outputPath, dann wird Buffer zurückgegeben
const inkBuffer = await encodeInkFromDisplayId('./input.png', '9');
writeFileSync('./output.ink', inkBuffer);
```

### PNG zu .ink konvertieren (manuelle Optionen)

```javascript
import { encodeInk } from 'ink-encoder';
import { writeFileSync } from 'fs';

const options = {
  colors: ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"], // Spectra 6 Farben
  width: 800,
  height: 480,
  displayId: "9", // Display ID für Spectra 6 7,3"
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

const inkData = await encodeInk('./input.png', options);
writeFileSync('./output.ink', inkData);
```

### Display-Definitionen abrufen

```javascript
import { getDisplay, getAllDisplays, getOptionsFromDisplayId } from '@microPhotoFrame/ink-encoder';

// Einzelnes Display abrufen
const display = getDisplay('9');
console.log(display.name); // "Spectra 6 7,3" · 800x480"
console.log(display.colors); // ["#000000", "#FFFFFF", ...]
console.log(display.width); // 800
console.log(display.height); // 480

// Alle Displays abrufen
const allDisplays = getAllDisplays();
console.log(Object.keys(allDisplays)); // ["0", "1", "2", ..., "9", "A", ...]

// Encoding-Optionen aus Display-ID generieren
const options = getOptionsFromDisplayId('9', {
  dither: 'bayer',
  orientation: 1
});
```

### .ink zu PNG konvertieren

```javascript
import { decodeInk } from 'ink-encoder';

const options = {
  colors: ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"],
  width: 800,
  height: 480,
  isRound: false,
  outputPath: './decoded.png' // Optional: Speichert direkt als PNG
};

const pngBuffer = await decodeInk('./input.ink', options);
// Oder ohne outputPath: pngBuffer enthält die PNG-Daten
```

## Optionen

### encodeInk(inputPath, options)

- **inputPath** (string|Buffer): Pfad zur PNG-Datei oder Buffer
- **options** (Object):
  - **colors** (Array<string>): Array von Hex-Farben (z.B. `["#FFFFFF", "#000000"]`)
  - **width** (number): Zielbreite in Pixeln
  - **height** (number): Zielhöhe in Pixeln
  - **displayId** (string): Display-ID Zeichen (z.B. `"9"` für Spectra 6 7,3")
  - **isRound** (boolean): Ob das Display rund ist (Standard: `false`)
  - **dither** (string): Dithering-Typ: `"floyd"`, `"bayer"` oder `"none"` (Standard: `"floyd"`)
  - **orientation** (number): Orientierung: `0`=Landscape, `1`=Portrait (Standard: `0`)
  - **colorAdjust** (Object): Farbanpassungen
    - **saturation** (number): Sättigung (Standard: `1.0`)
    - **contrast** (number): Kontrast (Standard: `1.0`)
    - **blackPoint** (number): Schwarzwert (Standard: `1.0`)
    - **whitePoint** (number): Weißwert (Standard: `1.0`)

### decodeInk(inputPath, options)

- **inputPath** (string|Buffer): Pfad zur .ink-Datei oder Buffer
- **options** (Object):
  - **colors** (Array<string>): Array von Hex-Farben (muss mit den Encoding-Farben übereinstimmen)
  - **width** (number): Display-Breite in Pixeln
  - **height** (number): Display-Höhe in Pixeln
  - **isRound** (boolean): Ob das Display rund ist (Standard: `false`)
  - **outputPath** (string, optional): Ausgabepfad für PNG-Datei

## Verfügbare Display-Definitionen

Das Modul enthält alle Display-Definitionen. Verwenden Sie einfach die Display-ID:

### Monochrome (B&W) Modelle
- **"0"**: B&W 1,54" · 200x200
- **"1"**: B&W 2,13" · 250x122
- **"2"**: B&W 2,9" · 296x128
- **"3"**: B&W 4,2" · 400x300
- **"4"**: B&W 7,5" · 800x480
- **"5"**: B&W 10,3" · 1872x1404 · Carta/Mobius
- **"6"**: B&W 13,3" · 2200x1650 · Carta/Fina

### Spectra 6 (E6) - Full Color Modelle
- **"7"**: Spectra 6 1,69" Round · 400x400 (rund)
- **"8"**: Spectra 6 4,0" · 600x400
- **"9"**: Spectra 6 7,3" · 800x480
- **"A"**: Spectra 6 8,14" · 1024x576
- **"B"**: Spectra 6 13,3" · 1600x1200
- **"C"**: Spectra 6 25,3" · 3200x1800 · Signage
- **"D"**: Spectra 6 28,5" · 2160x3060 · Poster
- **"E"**: Spectra 6 31,5" · 2560x1440
- **"F"**: Spectra 6 32,0" · 2560x1440
- **"G"**: Spectra 6 43,0" · 3840x2160 · UHD

### Spectra BWR (Black/White/Red) Modelle
- **"H"** bis **"P"**: Verschiedene BWR-Displays

### Spectra 3100 (BWRY) Modelle
- **"Q"** bis **"U"**: Verschiedene BWRY-Displays

### Beispiel: Display-Informationen abrufen

```javascript
import { getDisplay } from 'ink-encoder';

const display = getDisplay('9');
// {
//   id: "9",
//   name: 'Spectra 6 7,3" · 800x480',
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
import { encodeInkFromConfig, loadConfigFromJSON } from 'ink-encoder';

// Option 1: Direkt mit Config-Datei
const inkData = await encodeInkFromConfig('./input.png', './config/display-config.json', './output.ink');

// Option 2: Config laden und dann verwenden
const options = await loadConfigFromJSON('./config/display-config.json');
const inkData2 = await encodeInk('./input.png', options);
```

### Beispiel JSON-Konfiguration

```json
{
  "displayId": "9",
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
import { encodeInk, loadConfigFromJSON } from 'ink-encoder';
import { writeFileSync } from 'fs';

gulp.task('convert-firmware-images', async () => {
  const options = await loadConfigFromJSON('./config/ink-encode-config.json');
  
  const images = [
    './firmware/imgs/startup.png',
    './firmware/imgs/error.png'
  ];
  
  for (const imgPath of images) {
    const inkData = await encodeInk(imgPath, options);
    const outputPath = imgPath.replace(/\.png$/i, '.ink');
    writeFileSync(outputPath, inkData);
    console.log(`✓ Converted ${imgPath} to ${outputPath}`);
  }
});
```

## Hinweise

- Die Farbpalette muss bei Encoding und Decoding identisch sein
- Für runde Displays werden nur Pixel innerhalb des Kreises komprimiert
- Das Modul unterstützt das neue .ink-Format (Version 1) mit 4-Byte-Header
- Alte .ink-Dateien (Version 0) werden ebenfalls unterstützt

## Lizenz

MIT
