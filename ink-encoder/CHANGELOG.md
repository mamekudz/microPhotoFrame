# Changelog

## 2.0.0

Breaking release versus the **published** npm package `ink-encoder@1.0.0`. Unpublished local `1.2.0` / workspace `1.2.1` were never on the registry; **do not publish `1.2.1`**.

**Die Kompatibilität mit früher erzeugten .ink-Dateien ist nicht garantiert. Beim Upgrade Encoder und Firmware gemeinsam auf zueinander passende Stände aktualisieren und bestehende Shows aus den Originalbildern neu erzeugen.**

This package does not guarantee that the new decoder correctly reads every older `.ink` file, or that older software reads files written by 2.0.0. There is no compatibility layer for experimental or npm-1.0.0 variants. Regenerating shows from original images on upgrade is expected.

### Breaking: JavaScript API names

Published 1.0.0 README (named imports **do not exist** on 2.0.0):

```javascript
import { encodeInkFromDisplayId, getDisplay } from 'ink-encoder';
const inkData = await encodeInkFromDisplayId('./input.png', '9', {
  dither: 'floyd',
  orientation: 0
}, './output.ink');
const display = getDisplay('9');
```

2.0.0:

```javascript
import { EncodeInkFromDisplayId, GetDisplayByShortId } from 'ink-encoder';
const inkData = await EncodeInkFromDisplayId('./input.png', 'I', {
  dither: 'floyd',
  orientation: 0
}, './output.ink');
const display = GetDisplayByShortId('I');
```

| npm 1.0.0 | 2.0.0 |
|-----------|-------|
| `encodeInk` | `EncodeInk` |
| `decodeInk` | `DecodeInk` |
| `getDisplay` | `GetDisplayByShortId` (plus `GetDisplayByLongId`) |
| `getAllDisplays` | `GetAllDisplays` |
| `getOptionsFromDisplayId` | `GetOptionsFromDisplayId` |
| `loadConfigFromJSON` | `LoadConfigFromJSON` |
| `encodeInkFromConfig` | `EncodeInkFromConfig` |
| `encodeInkFromDisplayId` | `EncodeInkFromDisplayId` |

There are **no** camelCase aliases. `DISPLAYS` is keyed by long ids (`EINK_SPECTRA6_730_SQ_800x480`, …), not by `"0"` / `"9"`. `GetAllDisplays()` therefore returns a different object shape. `DISPLAY_LONG_ID_BY_SHORT_ID` is new.

`EncodeInk` default `displayId` is `"0"` (B&W 1.54"). npm 1.0.0 defaulted to `"9"`.

### Breaking: display short ids

The 1.0.0 short-id table is remapped:

- **`"9"`** in 1.0.0 = Spectra 6 7.3" · 800×480 · 6 colors. **Gone** in 2.0.0 (`GetDisplayByShortId('9')` is `null`; `GetOptionsFromDisplayId('9')` throws).
- **`"I"`** in 1.0.0 = Spectra BWR 2.13" · 250×122 · 3 colors. In 2.0.0 = Spectra 6 7.3" · 800×480 · reTerminal E1002.
- `"0"`–`"3"` remain B&W panels of the same pixel sizes (name punctuation only).
- From **`"4"`** onward the meaning changes (example: 1.0.0 `"4"` = B&W 7.5" 800×480; 2.0.0 `"4"` = B&W 5.83" 648×480). 1.0.0 `"7"` = Spectra 6 1.69" round; 2.0.0 `"7"` = B&W 13.3".

microPhotoFrame firmware uses `DEVICE_DISPLAY_ID "I"`. Files whose header id is `"9"` do not match that device.

### Breaking: default `.ink` format

npm 1.0.0 `encodeInk` always wrote **format byte 1** (LZW). No `compression` option.

2.0.0 `EncodeInk` default `compression` is `deflatePaeth` → **format byte 3** (zlib-Deflate + Paeth). `compression: 'deflate'` → v2; `compression: 'lzw'` / `inkFormat: 1` → v1 LZW.

Current writes use a **4-byte** header `[format, displayId, dither, orientation]`.

2.0.0 `DecodeInk` reads the current 4-byte v1–v3 layout produced by this encoder. Older files, older decoders, and older firmware are not a supported combination.

### Migration

1. Rename imports and calls to PascalCase.
2. For Spectra 6 7.3" / reTerminal E1002 use short id **`"I"`**, not `"9"`.
3. Do not reuse other 1.0.0 short ids without checking `GetDisplayByShortId`.
4. Expect **v3** output unless you set `compression: 'lzw'` or `inkFormat: 1`.
5. Update encoder and firmware together; recreate existing shows from the original images.

## 1.2.1 (unpublished, superseded)

Workspace packaging draft inside microPhotoFrame. **Obsolete — do not npm publish.** Replaced by 2.0.0.

## 1.2.0 (unpublished local tree)

Local tree that introduced v3 defaults, PascalCase exports and the remapped catalogue. Never published to npm.

## 1.0.0

First npm release. camelCase API, LZW-only encode (format byte 1), display catalogue keyed by short id (`"9"` = Spectra 6 7.3").
