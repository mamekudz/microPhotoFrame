<center>
  <img src="assets/imgs/Logo.png" alt="microPhotoFrameLogo" width="200">
  <br>
  <img src="assets/imgs/LogoText.png" alt="microPhotoFrameLogoText" width="300">
</center>
<br><br>

# µPhotoFrame - WiFi-based E-Ink Photo Frame for reTerminal

**An intelligent, remote-controlled photo frame firmware for reTerminal E1001 (Grayscale) & E1002 (Full Color)**

---

## 🌍 Languages / Sprachen

- [English](#english)
- [Deutsch](#deutsch)

---

<a name="english"></a>
## 📖 English

### ⚠️ Project Status
**Currently in active development...**

### ✨ Features

This project includes photo frame firmware for the reTerminal E1001/E1002, as well as a server application for managing and preparing photo albums with several special features:

#### 🖼️ Display Support
- ✅ **reTerminal E1001:** 7.5" Grayscale (4-Level)
- ✅ **reTerminal E1002:** 7.3" Spectra 6 (Full Color)
- ✅ **Auto-Rotation:** MPU6050 sensor support for automatic orientation detection
- ✅ **Low Power:** Optimized for E-Ink displays with configurable rest periods

#### 📡 WiFi Management
- ✅ Remote management via web interface
- ✅ Multiple image lists with remote switching
- ✅ Automatic time synchronization
- ✅ Easy WiFi configuration via access point

#### 🎨 Image Processing
- ✅ Fully automated image processing in browser
- ✅ AI-powered cropping (TensorFlow.js / COCO-SSD via CDN when online — see `docs/BUILD_INSTALLER.md`)
- ✅ Extreme compression with highest quality
- ✅ Support for both landscape and portrait formats
- ✅ Custom `.ink` format for optimal storage (mimetype image/ink)

#### ⏱️ Flexible Timing
- ✅ Display duration: 1 minute to 6 hours per image list
- ✅ Configurable rest periods to preserve battery
- ✅ Different modes: sequential, reverse, or random

#### 💾 Storage
- ✅ SD card support for offline operation
- ✅ Store 2-5 million images on a 2TB SD card
- ✅ Import/Export functionality for image lists
- ✅ No database server required (JSON-based)

#### 🎛️ User Controls
- ✅ Hardware buttons for next/previous image
- ✅ Mode selection via buttons
- ✅ WiFi reconfiguration (hold both buttons for 1 second)
- ✅ Low battery warning display

### 🚀 Quick Start

#### 1. Flash Firmware
The easiest way for end users:

**👉 [Open Web Flasher](https://mamekudz.github.io/microPhotoFrame/firmware/flasher.html)**

1. Connect reTerminal via USB
2. Click "Firmware Installieren"
3. Select COM port
4. Wait until complete (~2 minutes)

More options: [Firmware README](firmware/README.md)

#### 2. Setup Server

```bash
# Clone repository
git clone https://github.com/mamekudz/microPhotoFrame.git
cd microPhotoFrame

# Setup IIS or Apache as web server
# Point webroot to project directory

# Or for development:
npx http-server -p 8080
```

#### 3. Configure Device

After first boot:

1. Connect to WiFi **"microPhotoFrame"**
2. Open browser: `http://192.168.4.1`
3. Enter WiFi credentials
4. Specify server URL (e.g., `http://192.168.0.107:888`)
5. Save and restart

### 🛠️ Hardware Expansion

**MPU6050 Acceleration Sensor (Optional)**

Add automatic orientation detection with 3D-printed case:
- 📐 [Build Instructions & 3D Files](https://makerworld.com/en/@amekudzi)
- 🎯 Automatic landscape/portrait detection
- 🔄 Instant image switching on rotation

<br>
<center>
  <img src="assets/imgs/frame.jpg" alt="microPhotoFrame Example" width="400">
</center>
<br>

### 📚 Documentation

- **[Firmware README](firmware/README.md)** - Detailed firmware documentation
- **[ink-encoder Package](packages/ink-encoder/README.md)** - NPM package documentation
- **[Technical Overview](docs/technical_overview.md)** - Architecture and design
- **[.ink orientation on PC](docs/INK_ORIENTATION_PC.md)** - Portrait encode vs. Windows preview (no mirror)
- **[Server Setup](docs/)** - IIS, Apache, NGINX, Node.js guides

### 🎁 Included Content

The project includes a sample image list with classic paintings (~100 images, 1 MB).

### 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

<a name="deutsch"></a>
## 📖 Deutsch

# µPhotoFrame - WiFi-basierter E-Ink-Fotorahmen für reTerminal

**Intelligente, ferngesteuerte Bilderrahmen-Firmware für reTerminal E1001 (Graustufen) und E1002 (Vollfarbe)**

---

### ⚠️ Projektstatus
**Aktuell noch in aktiver Entwicklung...**

### ✨ Funktionen

Dieses Projekt enthält eine Fotorahmen-Firmware für das reTerminal E1001/E1002, sowie eine Server-Applikation für die Verwaltung und Aufbereitung von Fotoalben mit einigen Besonderheiten:

#### 🖼️ Display-Unterstützung
- ✅ **reTerminal E1001:** 7,5" Graustufen (4-Level)
- ✅ **reTerminal E1002:** 7,3" Spectra 6 (Vollfarbe)
- ✅ **Auto-Rotation:** MPU6050 Sensor für automatische Orientierungserkennung
- ✅ **Stromsparend:** Optimiert für E-Ink Displays mit konfigurierbaren Ruhezeiten

#### 📡 WiFi-Verwaltung
- ✅ Fernverwaltung über Weboberfläche
- ✅ Mehrere Bildlisten mit Fernumschaltung
- ✅ Automatische Zeitsynchronisation
- ✅ Einfache WiFi-Konfiguration über Access Point

#### 🎨 Bildverarbeitung
- ✅ Vollautomatische Bildaufbereitung im Browser
- ✅ KI-gestützter Zuschnitt (TensorFlow.js / COCO-SSD per CDN bei Online — siehe `docs/BUILD_INSTALLER.md`)
- ✅ Extreme Kompression bei höchster Qualität
- ✅ Unterstützung für Quer- und Hochformat
- ✅ Eigenes `.ink` Format für optimale Speicherung (mimetype image/ink)

#### ⏱️ Flexible Zeitsteuerung
- ✅ Anzeigedauer: 1 Minute bis 6 Stunden pro Bildliste
- ✅ Konfigurierbare Ruhezeiten zur Akkuschonung
- ✅ Verschiedene Modi: fortlaufend, rücklaufend oder zufällig

#### 💾 Speicherung
- ✅ SD-Karten-Support für Offline-Betrieb
- ✅ 2-5 Millionen Bilder auf 2TB SD-Karte speicherbar
- ✅ Import/Export-Funktion für Bildlisten
- ✅ Kein Datenbank-Server erforderlich (JSON-basiert)

#### 🎛️ Bedienelemente
- ✅ Hardware-Tasten für nächstes/vorheriges Bild
- ✅ Modus-Auswahl über Tasten
- ✅ WiFi-Neukonfiguration (beide Tasten 1 Sekunde halten)
- ✅ Akkustand-Warnung bei niedrigem Ladestand

### 🚀 Schnellstart

#### 1. Firmware Flashen
Der einfachste Weg für Endanwender:

**👉 [Web-Flasher öffnen](https://mamekudz.github.io/microPhotoFrame/firmware/flasher.html)**

1. reTerminal via USB verbinden
2. "Firmware Installieren" klicken
3. COM-Port auswählen
4. Warten bis fertig (~2 Minuten)

Weitere Optionen: [Firmware README](firmware/README.md)

#### 2. Server einrichten

```bash
# Repository klonen
git clone https://github.com/mamekudz/microPhotoFrame.git
cd microPhotoFrame

# IIS oder Apache als Webserver einrichten
# Webroot auf Projektverzeichnis zeigen

# Oder für Entwicklung:
npx http-server -p 8080
```

#### 3. Gerät konfigurieren

Nach dem ersten Start:

1. Mit WiFi **"microPhotoFrame"** verbinden
2. Browser öffnen: `http://192.168.4.1`
3. WLAN-Zugangsdaten eingeben
4. Server-URL angeben (z.B. `http://192.168.0.107:888`)
5. Speichern und neu starten

### 🛠️ Hardware-Erweiterung

**MPU6050 Beschleunigungssensor (Optional)**

Fügen Sie automatische Orientierungserkennung mit 3D-gedrucktem Gehäuse hinzu:
- 📐 [Bauanleitung & 3D-Dateien](https://makerworld.com/en/@amekudzi)
- 🎯 Automatische Quer-/Hochformat-Erkennung
- 🔄 Sofortiger Bildwechsel bei Drehung

<br>
<center>
  <img src="assets/imgs/7.png" alt="Stand mit Sensor" width="200">
  <br><br>
  <img src="assets/imgs/3.png" alt="Stand Varianten" width="200">
</center>
<br>

<center>
  <img src="assets/imgs/screenshot_1.png" alt="WebUI Screenshot" style="max-width:100%;">
</center>
<br>

### 📚 Dokumentation

- **[Firmware README](firmware/README.md)** - Detaillierte Firmware-Dokumentation
- **[ink-encoder Paket](packages/ink-encoder/README.md)** - NPM-Paket Dokumentation
- **[Technische Übersicht](docs/technical_overview.md)** - Architektur und Design
- **[.ink Orientierung am PC](docs/INK_ORIENTATION_PC.md)** - Hochkant in Firmware vs. Vorschau (ohne Spiegelung)
- **[Server-Setup](docs/)** - IIS, Apache, NGINX, Node.js Anleitungen

### 🎁 Enthaltener Inhalt

Das Projekt enthält eine Beispiel-Bildliste mit klassischen Gemälden (~100 Bilder, 1 MB).

### 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details

---

## 🔗 Links

- **Repository:** https://github.com/mamekudz/microPhotoFrame
- **Issues:** https://github.com/mamekudz/microPhotoFrame/issues
- **Releases:** https://github.com/mamekudz/microPhotoFrame/releases
- **Web-Flasher:** https://mamekudz.github.io/microPhotoFrame/firmware/flasher.html
- **3D Files:** https://makerworld.com/en/@amekudzi

---

Made with ❤️ by Meinolf Amekudzi
