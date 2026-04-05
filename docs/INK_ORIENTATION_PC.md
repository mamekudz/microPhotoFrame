# .ink Hochkant: Firmware vs. PC (ohne Spiegelung)

## Warum kein „Spiegeln“ (GDI+ `Rotate90FlipY`)?

`Rotate90FlipY` bedeutet in GDI+: **zuerst 90° drehen, dann vertikal spiegeln**. Das ist **keine** reine Drehung, sondern eine **Spiegelung** in der Bildebene. Bei Text kann das je nach Ausrichtung **wie Spiegelschrift** wirken — für eine lesbare Vorschau auf dem PC ist das ungeeignet.

Ein solcher Flip wurde in **ink-encoder** / Windows-Shell nur kurz als **empirischer Versuch** genutzt („auf dem Kopf“ nach `Rotate90`), **ohne** die exakte Canvas-Geometrie aus dieser Firmware im Blick. Für Schrift ist das die falsche Richtung.

## Was die Firmware wirklich macht (`EInk.Convert`)

Bei **Portrait** (`EInkDef.PORTRAIT` / Hochkant-Pfad in `Convert`):

- Es wird ein Canvas der **Katalog-Größe** `display.width × display.height` (z. B. 800×480) gefüllt.
- Es gibt **`ctx.rotate(-90 * π/180)`** — also **90° gegen den Uhrzeigersinn** (Canvas-2D: positive Winkel sind im Uhrzeigersinn, daher negativ = CCW) — plus **`drawImage`** mit **getauschten Zielmaßen** (`dh`, `dw`), **ohne** `scale(-1,…)` oder andere Spiegel-Transforms.

Damit ist die Encodierung eine **reine Drehgeometrie** plus Umordnung der gezeichneten Fläche — **keine** bewusste Spiegelung für Lesbarkeit.

## Abgleich mit PC-Decodern (ink-encoder / Windows-Vorschau)

Für dieselbe natürliche Ansicht wie auf dem Gerät soll der PC die **inverse Drehung** anwenden — **nur Rotation**, **kein** `FlipX`/`FlipY`.

- Firmware: **−90°** (CCW) → PC (GDI+): **`Rotate90FlipNone`** (**90° im Uhrzeigersinn**), dieselbe Permutation in `inkCodec.mjs` (`rotateRgba90Clockwise`).

Hochkant-Bit im Header (Byte 3, Bit 0 bei v1–v3) markiert diese Encodierung.

Wenn Encoder und Gerät sich noch unterscheiden, **nur** mit **90° / 180° / 270°** justieren — **nicht** mit Spiegelung „reparieren“.

## Build / Installation (Windows-Shell)

Neu gebaute DLL z. B. unter `ink-encoder/extensions/win-preview-handler/bin/Release-NoMirror/net48/`, **`install.cmd` als Administrator**, Explorer neu starten, bei Bedarf Miniatur-Cache leeren (`clear-thumbnail-cache.cmd`).

## Hinweis `Decode()` im Web (`EInk.mjs`)

Die Methode **`Decode`** liest `storedOrient` derzeit **ohne** anschließende Rotation ins Canvas — die Browser-Vorschau im Frame zeigt Hochkant-.ink ggf. **ohne** die gleiche Korrektur wie der PC-Handler. Für eine einheitliche Vorschau könnte hier dieselbe **90°-Drehung (Uhrzeigersinn)** wie in ink-encoder ergänzt werden.
