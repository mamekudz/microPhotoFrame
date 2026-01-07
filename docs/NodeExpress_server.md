# Node.js Express Server Setup für µPhotoFrame

**Port: 891 | Status: ✅ Vollständig kompatibel mit ASP.NET Server**

## Voraussetzungen

- Node.js (Version 14 oder höher) installiert
- npm (wird mit Node.js mitgeliefert)

**Hinweis**: 
- Apache/PHP läuft auf Port **889**
- Nginx/PHP läuft auf Port **890**
- Node.js Express läuft auf Port **891**

## Installation

### 1. Dependencies installieren

Öffnen Sie eine Eingabeaufforderung im `node` Verzeichnis:

```bash
cd node
npm install
```

Dies installiert folgende Pakete:
- **express** - Web Framework
- **body-parser** - Request Parsing
- **multer** - File Upload Handling
- **jszip** - ZIP-Datei Handling für Import/Export

### 2. Server starten

```bash
npm start
```

Oder für Entwicklung mit Auto-Reload:

```bash
npm run dev
```

Der Server läuft dann auf:
```
http://localhost:891
```

### 3. Als Windows-Service (optional)

Für die Ausführung als Windows-Service können Sie `node-windows` oder `pm2` verwenden:

#### Mit pm2:

```bash
npm install -g pm2
pm2 start server.js --name microPhotoFrame
pm2 save
pm2 startup
```

#### Mit node-windows:

```bash
npm install -g node-windows
node-windows install
```

## Konfiguration

Die Server-Konfiguration kann in `server.js` angepasst werden:

- **Port**: Standard ist `891`, kann in Zeile `const PORT = 891;` geändert werden
- **BASE_DIR**: Basispfad für Shows und Assets (Standard: parent directory von `/node`)

## API-Endpunkte

Der Server implementiert alle 11 API-Endpunkte und ist **100% kompatibel mit dem ASP.NET Server**:

### Show-Verwaltung
| Endpoint | Beschreibung |
|----------|-------------|
| `getShows` | Gibt alle Shows mit Metadaten zurück (activeShows, timer, mode, etc.) |
| `getShow` | Ruft Details einer spezifischen Show ab |
| `createShow` | Erstellt neue Show mit optionalem `displayId` Parameter |
| `deleteShow` | Löscht Show und verwaltet activeShows automatisch |
| `setActiveShow` | Setzt aktive Show für einen Display-Typ (displayId) |
| `setShowSettings` | Ändert Timer und Mode-Einstellungen (random/sequence/reverse) |

### Image-Verwaltung
| Endpoint | Beschreibung |
|----------|-------------|
| `saveShowImage` | Speichert Bild in Show mit automatischer Orientierungserkennung |
| `deleteShowImage` | Löscht Bild aus Show |

### Device-Verwaltung
| Endpoint | Beschreibung |
|----------|-------------|
| `getDevices` | Gibt registrierte Geräte mit Metadaten zurück |

### Import/Export
| Endpoint | Beschreibung |
|----------|-------------|
| `exportShow` | Exportiert Show als ZIP mit allen Bildern |
| `importShow` | Importiert Show von ZIP-Datei |

## Erweiterte Features

### 🎯 DisplayId-Support
- Automatische Verwaltung von mehreren Displays
- Aktive Show pro Display-Typ
- Automatische Ersatz-Show bei Löschung
- Validierung der displayId in Image-Daten

### 🖼️ Image-Orientierungserkennung
- Unterstützt **Old Format** (displayId an Index 0, orient an Index 2)
- Unterstützt **New Format** (Version 1, displayId an Index 1, orient an Index 3)
- Automatische Erkennung beim Speichern
- Korrekte Orientierungs-Prefixe (0-3) im Dateinamen

### 📝 Intelligente Image-Verwaltung
- **replaceImageName**: Ersetzt existierende Bilder
- **referenceName**: Nutzt andere Bilder als Referenz für intelligente Benennnung
- **Orientierungs-Intelligenz**: Nutzt Reference-Name nur bei entgegengesetzter Orientierung

### 📦 Robuste ZIP-Verwaltung
- Base64-kodierte ZIP-Export mit allen Image-Daten
- Sichere ZIP-Extraktion mit Validierung
- Integrierte Image-Rekonstruktion

### 📱 Device-Registrierung
- Automatische Device-Registrierung via `registerDeviceEcho()`
- Metadaten-Speicherung (Name, IP, Battery, Temperature, etc.)
- Für `getShows` und `getShow` automatisch aufgerufen

## Fehlerbehebung

- **Port bereits belegt**: Ändern Sie den Port in `server.js` (Zeile `const PORT = 891;`)
- **Module nicht gefunden**: Führen Sie `npm install` erneut aus
- **Permission denied**: Stellen Sie sicher, dass Node.js Schreibrechte im `shows` Verzeichnis hat
- **Connection refused**: Stellen Sie sicher, dass der Server läuft (`npm start`)
- **ZIP-Fehler bei Export/Import**: Prüfen Sie ob `jszip` korrekt installiert ist

## Produktions-Deployment

Für Produktionsumgebungen sollten Sie:

1. **Process Manager verwenden**: pm2 oder ähnliche Tools
2. **Reverse Proxy einrichten**: Nginx oder Apache vor dem Node.js Server
3. **HTTPS aktivieren**: SSL/TLS Zertifikat konfigurieren
4. **Logging einrichten**: Logs in Dateien schreiben statt Console
5. **Error Handling**: Umfassendes Error Handling und Monitoring
6. **Environment Variables**: Nutzen Sie `.env` Dateien für sensitive Daten

## Vergleich mit anderen Servern

| Feature | Node.js | ASP.NET | PHP/Apache | PHP/Nginx |
|---------|---------|---------|-----------|-----------|
| displayId-Support | ✅ | ✅ | ✅ | ✅ |
| ZIP Import/Export | ✅ | ✅ | ⚠️ | ⚠️ |
| Device-Registry | ✅ | ✅ | ✅ | ✅ |
| Orientierungserkennung | ✅ | ✅ | ✅ | ✅ |
| Asynchrone Anfragen | ✅ | ✅ | ⚠️ | ⚠️ |

