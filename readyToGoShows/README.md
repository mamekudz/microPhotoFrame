# Ready-to-Go Shows für µPhotoFrame

Dieses Verzeichnis enthält vorgefertigte Bildergalerien zum direkten Import.

## Verfügbare Shows

### 1. Colorful Animals
**Für:** reTerminal E1002 (Full Color)
**Bilder:** 10 farbenfrohe Tier-Fotos
**Lizenz:** Unsplash License

Chamäleon, Ara, Morphofalter, Kampffisch, Pfau, Tukan, Pfeilgiftfrosch, Eisvogel, Mandrill, Korallenfische.

**Status:** Bildquellen fertig, ZIP-Export: ColorFullAnimals_I.show (Display I)

### 2. Classic Art
**Für:** reTerminal E1002 (Full Color), auch andere Farb-Panels
**Bilder:** 12 gemeinfreie Gemälde
**Lizenz:** Public Domain (Wikimedia Commons)

Vermeer (Perlenohrring, Milchmädchen), van Gogh (Sternennacht, Sonnenblumen), Hokusai (Große Welle), Leonardo (Mona Lisa), Botticelli (Geburt der Venus), Monet (Impression, Sonnenaufgang), Rembrandt (Nachtwache), Turner (Fighting Temeraire), Seurat (Grande Jatte), Klimt (Der Kuss).

```bash
node tools/downloadShowImages.mjs ClassicArt
```

**Status:** Bildquellen fertig. Originale nach `ClassicArt/ClassicArt_orgimgs/` laden, dann in der Webapp Add Photos.

## Verwendung

### Option 1: Über Webapp importieren
1. Webapp öffnen
2. Import Show
3. ZIP- oder `.show`-Datei hochladen

### Option 2: Originale herunterladen und verarbeiten
1. `node tools/downloadShowImages.mjs <ShowName>`
2. Show in der Webapp anlegen
3. Add Photos auf den Ordner `*_orgimgs`

## Bildquellen

**Unsplash** (Colorful Animals): frei für privat und kommerziell.

**Wikimedia Commons** (Classic Art): gemeinfreie Werke, Künstler tot seit mehr als 70 Jahren.

## JSON-Format

```json
{
  "name": "Show Name",
  "description": "Beschreibung",
  "displayId": "I",
  "timer": 15,
  "mode": "sequential",
  "images": [
    {
      "name": "bild_name",
      "url": "https://...",
      "description": "...",
      "source": "Wikimedia Commons"
    }
  ],
  "credits": {
    "source": "Quelle",
    "license": "Lizenz",
    "url": "https://..."
  }
}
```

Die Webapp verarbeitet die Fotos für das gewählte E-Ink-Display.

Exportierte Pakete heißen Name_DisplayID.show, z. B. ColorFullAnimals_I.show. Nur fuer dieses Display importieren.
