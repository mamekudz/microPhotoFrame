# µPhotoFrame™ Firmware

ESP32-S3 Firmware für WiFi-basierte E-Ink Bilderrahmen (reTerminal E1002, GooDisplay NeoFrame, Waveshare 1.54G)

## 🚀 Quick Start - Firmware Flashen

### Option 1: Web-Flasher (Empfohlen für Anfänger)

Der einfachste Weg, die Firmware zu installieren:

1. **Öffnen Sie den Web-Flasher:**
   👉 [https://mamekudz.github.io/microPhotoFrame/firmware/flasher.html](https://mamekudz.github.io/microPhotoFrame/firmware/flasher.html)

2. **Verbinden Sie Ihr reTerminal** via USB mit dem Computer

3. **Klicken Sie auf "Firmware Installieren"**

4. **Wählen Sie den COM-Port** Ihres Geräts im Browser-Dialog

5. **Warten Sie** bis der Flash-Vorgang abgeschlossen ist (~2 Minuten)

**Hinweis:** Der Web-Flasher funktioniert nur in **Chrome**, **Edge** oder **Opera** (keine Firefox-Unterstützung wegen WebSerial API).

### Option 2: µGulp / PlatformIO (für Entwickler)

Im Projektroot: **Target** in µGulp wählen (`reTerminal E1002`, `NeoFrame`, `Waveshare 1.54G`), dann `FIRMWARE_BUILD` / `FIRMWARE_UPLOAD`. Gulp findet `pio` unter `%USERPROFILE%\.platformio\penv`, schreibt die pio-Ausgabe ins Dashboard und nimmt beim Upload einen **lebendigen** USB-Serial-Port (`Status OK`). Der USB-Chip ist nur ein Hinweis: CH340 (`1A86:7523`) ist nicht automatisch NeoFrame, natives CDC (`303A:1001`) nicht automatisch E1002.

Nur-Lade-Kabel erzeugen keinen COM-Port. Windows muss den Anschluss als verbunden zeigen, nicht *Unknown*.

```bash
# Repository klonen
git clone https://github.com/mamekudz/microPhotoFrame.git
cd microPhotoFrame

# Target setzen, dann bauen / flashen
npx gulp FIRMWARE_BUILD
npx gulp FIRMWARE_UPLOAD

# oder direkt PlatformIO im firmware-Ordner
cd firmware
pio run -e seeed_xiao_esp32s3 -t upload
pio device monitor --raw
```

### Option 3: Vorkompilierte Binary (manuell)

1. Laden Sie die neueste Firmware von [Releases](https://github.com/mamekudz/microPhotoFrame/releases)
2. Verwenden Sie `esptool.py` zum Flashen:

```bash
pip install esptool

esptool.py --chip esp32s3 --port COM9 erase_flash

esptool.py --chip esp32s3 --port COM9 --baud 460800 \
  write_flash -z \
  0x0 bootloader.bin \
  0x8000 partitions.bin \
  0x10000 microPhotoFrame-firmware.bin
```

## 📱 Unterstützte Hardware

### reTerminal E1001
- **Display:** 7.5" Grayscale (4-Level)
- **Auflösung:** 800×480
- **Farben:** Weiß, Hellgrau, Dunkelgrau, Schwarz
- **Display ID:** `D`

### reTerminal E1002
- **Display:** 7.3" Spectra 6 (Full Color)
- **Auflösung:** 800×480
- **Farben:** Schwarz, Weiß, Rot, Gelb, Blau, Grün
- **Display ID:** `I`
- **MCU:** Seeed XIAO ESP32-S3

### NeoFrame (GooDisplay GDP073EW1)
- **Display:** gleiches Spectra-6-7,3"-Panel GDEP073E01
- **Auflösung:** 800×480
- **Display ID:** `I` (gleiche Shows wie E1002)
- **MCU:** ESP32-S3 (Herstellerangabe)
- **Lagesensor:** keiner (kein MPU6050)
- **Taster:** keine am Holzrahmen — Bedienung nur über WLAN/Web
- **Pinmap:** ESP32E6-E01-Datenblatt (EPD 11/12/2/3/4/5, SD 48/47/13/21, Taster 42/41/46) — am Gerät prüfen
- **Factory-Restore:** `firmware/factory/neoframe/` (`factory.bin` oder `GDEPE073E01.ino.merged.bin` nach `0x0`)

### Waveshare ESP32-S3 1.54" e-Paper (G)
- **Display:** GDEY0154F51 / GDEM0154F51H · 1,54" · 200×200
- **Farben:** Schwarz, Weiß, Rot, Gelb (BWRY, Display-ID `f`)
- **MCU:** ESP32-S3 N8R8 (8 MB Flash, 8 MB PSRAM), USB-C, WLAN+BLE, ohne Akku
- **Taster / SD:** keine Foto-Taster; SDMMC zunächst ungenutzt
- **Pinmap (Waveshare-Wiki):** EPD SCLK 12, SDI 13, CS 11, DC 10, RST 9, BUSY 8; EPD3V3_EN GPIO6 aktiv LOW
- **Factory-Restore:** `firmware/factory/waveshare-154g/`

### ESP32-S3 MCU
- **Board (E1002):** Seeed XIAO ESP32-S3
- **RAM:** 320KB
- **Flash:** 8MB
- **WiFi:** 802.11 b/g/n
- **Bluetooth:** BLE 5.0

## ⚙️ Erste Konfiguration

Nach dem ersten Flashen startet das Gerät im **Access Point Modus**:

1. **SSID:** `microPhotoFrame` (offen, kein Passwort)
2. **IP-Adresse:** `192.168.4.1`
3. Verbinden Sie sich mit dem WiFi und öffnen Sie `http://192.168.4.1`
4. Geben Sie Ihre **WLAN-Zugangsdaten** ein
5. Geben Sie die **Server-URL** Ihrer microPhotoFrame-Installation ein
6. Das Gerät startet neu und verbindet sich mit Ihrem WLAN

## 🎨 Features

- ✅ WiFi-basierter Bilderrahmen
- ✅ Unterstützung für Grayscale & Full Color Displays
- ✅ Automatische Orientierungs-Erkennung (MPU6050 Sensor)
- ✅ Konfigurierbare Slideshow-Timer
- ✅ SD-Karten-Support (optional)
- ✅ OTA-Updates (geplant)
- ✅ Low-Power-Modus mit Deep Sleep

## 🔧 Konfiguration über Webinterface

Nach der WLAN-Verbindung können Sie das Gerät über die Server-Webapp konfigurieren:

- **Shows verwalten:** Erstellen Sie Bildergalerien
- **Timer einstellen:** Bildwechsel-Intervalle konfigurieren
- **Display-Modi:** Zufällig, Vorwärts, Rückwärts
- **Orientierung:** Automatisch oder manuell

## 📊 Serial Monitor

Zum Debuggen können Sie den Serial Monitor nutzen:

```bash
# PlatformIO
pio device monitor --raw

# Arduino IDE Serial Monitor
# Baudrate: 115200
```

## 🐛 Troubleshooting

### Upload schlägt fehl
- **Problem:** µGulp: kein USB-Serial-Gerät / Windows zeigt den Anschluss als *Unknown*
- **Lösung:** Datenkabel (kein Nur-Lade-Kabel), anderen USB-Anschluss, Strom am Rahmen trennen und neu stecken. Target bewusst wählen — der COM-Port identifiziert das Board nicht eindeutig.
- **Problem:** `A fatal error occurred: Could not open port`
- **Lösung:** Stellen Sie sicher, dass kein anderes Programm den COM-Port verwendet
- **Tipp:** Drücken Sie die **BOOT-Taste** am ESP32-S3 während des Uploads

### Display bleibt weiß
- **Problem:** Kein Bild wird angezeigt
- **Lösung:** 
  1. Prüfen Sie die Serial Monitor Ausgabe auf Fehler
  2. Stellen Sie sicher, dass die Display-ID in der Show-Konfiguration korrekt ist
  3. Überprüfen Sie die Server-URL

### WiFi-Verbindung schlägt fehl
- **Problem:** Gerät verbindet sich nicht mit WLAN
- **Lösung:**
  1. Starten Sie das Gerät neu im AP-Modus (Power-Cycle)
  2. Überprüfen Sie SSID und Passwort
  3. Stellen Sie sicher, dass 2.4GHz WiFi verfügbar ist (kein 5GHz)

## 🔨 Entwicklung

### Build-Environments

Ziele wählt man im µGulp-Projektformular (**Target**): `reTerminal E1002`, `NeoFrame` oder `Waveshare 1.54G`.  
Gulp filtert `firmware/src` nach `firmware/.generated` (`gulp-mu-build-filter`, `BUILD_ONLY_AT_PLATFORMS`, `mode: remove`) und ruft `pio run -e …` auf.

Board-Header: `firmware/src/board.h` plus `firmware/src/boards/<id>.h`.  
E1002-Pins stehen nur im Block `reterminal-e1002`. NeoFrame nutzt die offizielle ESP32E6-E01-Pinmap (GDEP073E01, Display-ID `I`), 8 MB PSRAM und nach dem Einschalten 5 Minuten das offene Config-WLAN `microPhotoFrame`. Waveshare 1.54G nutzt GxEPD2_4C / GDEM0154F51H (Display-ID `f`) und die Wiki-Pinmap inkl. EPD-Power GPIO6. Factory-Restore bleibt für das Hersteller-Image.

Factory-Image bei fehlgeschlagenem Flash: `firmware/factory/<ziel>/factory.bin` (oder `GDEPE073E01.ino.merged.bin` / `*.ino.merged.bin`) und Task **Restore Factory Firmware**.

```ini
[env:seeed_xiao_esp32s3]
platform = espressif32
board = seeed_xiao_esp32s3
framework = arduino

[env:neoframe]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino

[env:waveshare_154g]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
```

### Display-ID Anpassung

Die Display-ID steht im jeweiligen Board-Header (`DEVICE_DISPLAY_ID`): `I` für E1002/NeoFrame, `f` für Waveshare 1.54G.

## 📄 Lizenz

MIT License - siehe [LICENSE](../LICENSE)

## 🙏 Credits

- **E-Ink Library:** [GxEPD2](https://github.com/ZinggJM/GxEPD2)
- **JSON Parser:** [ArduinoJson](https://arduinojson.org/)
- **Web-Flasher:** [ESP Web Tools](https://esphome.github.io/esp-web-tools/)

## 🔗 Links

- **Hauptprojekt:** [microPhotoFrame](https://github.com/mamekudz/microPhotoFrame)
- **Issues:** [Bug Reports & Feature Requests](https://github.com/mamekudz/microPhotoFrame/issues)
- **Releases:** [Download Firmware](https://github.com/mamekudz/microPhotoFrame/releases)
