# Ready-to-Go Shows für µPhotoFrame

Dieses Verzeichnis enthält vorgefertigte Bildergalerien zum direkten Import.

## 📦 Verfügbare Shows

### 1. Colorful Animals 🦎
**Für:** reTerminal E1002 (Full Color)  
**Bilder:** 10 farbenfrohe Tier-Fotos  
**Lizenz:** Unsplash License (kostenlos)

- Chamäleon mit bunten Schuppen
- Ara-Papagei in Blau und Gelb
- Blauer Morphofalter
- Kampffisch (Betta) in lebendigen Farben
- Pfau mit ausgebreiteten Federn
- Tukan mit farbigem Schnabel
- Pfeilgiftfrosch
- Eisvogel in brillantem Blau
- Mandrill mit buntem Gesicht
- Tropische Korallenfische

**Status:** ✅ Bildquellen fertig, ZIP-Export folgt

## 🎯 Verwendung

### Option 1: Über Webapp importieren (Empfohlen)
1. Webapp öffnen
2. 'Import Show' auswählen
3. ZIP-Datei hochladen
4. Fertig!

### Option 2: Bilder manuell herunterladen
1. JSON-Datei öffnen (z.B. 'ColorfulAnimals_orgimgs.json')
2. Bildquellen über URLs herunterladen
3. In 'xxx_orgimgs/' Verzeichnis ablegen
4. Über Webapp 'Add Photos' verwenden

## 📥 Bildquellen

Alle Bilder stammen von **Unsplash.com** und sind:
- ✅ Kostenlos für privaten und kommerziellen Gebrauch
- ✅ Keine Registrierung erforderlich
- ✅ Keine Namensnennung erforderlich (aber nett!)
- ✅ Hochauflösend (800px optimal für E-Ink)

## 🎨 Weitere Show-Ideen

- **Nature Landscapes:** Berge, Ozeane, Wälder (gut für Grayscale)
- **Abstract Art:** Moderne abstrakte Kunst und Geometrie
- **Space & Cosmos:** Planeten, Nebel, Galaxien
- **Minimalist:** Einfache, reduzierte Designs

## 🛠️ Show selbst erstellen

1. Verzeichnis erstellen: 'MyShow/'
2. JSON-Datei mit Bildquellen: 'MyShow_orgimgs.json'
3. Bilder-Ordner: 'MyShow_orgimgs/'
4. Über Webapp verarbeiten und exportieren

## 📄 JSON Format

`json
{
  "name": "Show Name",
  "description": "Beschreibung",
  "displayId": "I",
  "timer": 5,
  "mode": "random",
  "images": [
    {
      "name": "bild_name",
      "url": "https://...",
      "description": "...",
      "photographer": "...",
      "source": "Unsplash"
    }
  ],
  "credits": {
    "source": "Quelle",
    "license": "Lizenz",
    "url": "https://..."
  }
}
`

---

💡 **Tipp:** Verwenden Sie die Webapp zum Verarbeiten - sie optimiert Bilder automatisch für E-Ink Displays!

Made with ❤️ for microPhotoFrame
