# µPhotoFrame Firmware

ESP32-S3 Firmware für WiFi-basierte E-Ink Bilderrahmen (reTerminal E1001 & E1002)

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

### Option 2: PlatformIO (für Entwickler)

Wenn Sie die Firmware selbst kompilieren möchten:

```bash
# Repository klonen
git clone https://github.com/mamekudz/microPhotoFrame.git
cd microPhotoFrame/firmware

# PlatformIO installieren (falls nicht vorhanden)
pip install platformio

# Firmware kompilieren und hochladen
pio run --target upload

# Serial Monitor starten
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

### ESP32-S3 MCU
- **Board:** Seeed XIAO ESP32-S3
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

Die `platformio.ini` definiert verschiedene Build-Targets:

```ini
[env:seeed_xiao_esp32s3]
platform = espressif32
board = seeed_xiao_esp32s3
framework = arduino
```

### Display-ID Anpassung

Für verschiedene Displays die `DEVICE_DISPLAY_ID` in `main.cpp` ändern:

```cpp
// Display ID for this device
#define DEVICE_DISPLAY_ID "I"  // reTerminal E1002 (Spectra 6)
// #define DEVICE_DISPLAY_ID "D"  // reTerminal E1001 (Grayscale)
```

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
