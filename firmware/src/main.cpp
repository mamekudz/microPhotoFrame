/*
 * µPhotoFrame Firmware
 * Based on: https://github.com/pixelEDI/reterminal-e1002-epaper
 * 
 * Firmware für das Seeed Studio reTerminal E1002
 * Zeigt Bilder auf dem E-Ink Display an
 * 
 * Display ID: "9" (Spectra 6 7,3" 800x480)
 */

#include <GxEPD2_7C.h>
#include <GxEPD2_BW.h>
#include <SD.h>
#include <SPI.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <time.h>
#include <vector>
#include <cstdlib>
#include <Wire.h>
#include <Update.h>
#include <esp32s3/rom/miniz.h>
#include <PNGdec.h>
#include <esp_task_wdt.h>

#define FIRMWARE_VERSION "1.0.0"

// MPU6050 I2C Address
#define MPU6050_ADDR 0x68
#define MPU6050_PWR_MGMT_1 0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B

// === Pin Definitions ===
// ePaper Display
#define EPD_SCK_PIN 7
#define EPD_MOSI_PIN 9
#define EPD_CS_PIN 10
#define EPD_DC_PIN 11
#define EPD_RES_PIN 12
#define EPD_BUSY_PIN 13

// SD Card
#define SD_EN_PIN 16
#define SD_DET_PIN 15
#define SD_CS_PIN 14
#define SD_MISO_PIN 8

// Buttons (reTerminal E1002 – active-low, hardware pull-ups)
// KEY0 = GPIO3 (green/red action button), KEY1 = GPIO4, KEY2 = GPIO5
#define BTN_ACTION 3  // Red button (KEY0) – Quick-Menu / long-press = Reset
#define BTN_NEXT   4  // Right  button (KEY1) – next image
#define BTN_PREV   5  // Left   button (KEY2) – previous image

// LED & Buzzer
#define LED_PIN    6  // On-board LED (inverted: LOW=on)
#define BUZZER_PIN 45 // On-board buzzer

// Serial Port
#define SERIAL_RX 44
#define SERIAL_TX 43

// MPU6050 I2C via Expansion Header (J2)
// Header wiring:
//   Pin 1  HEADER_3V3 → VCC
//   Pin 2  GND        → GND
//   Pin 7  GPIO20     → SCL  (+ 4.7 kΩ pull-up to 3.3 V)
//   Pin 8  GPIO19     → SDA  (+ 4.7 kΩ pull-up to 3.3 V)
#define MPU6050_SDA_PIN 19 // Expansion header Pin 8
#define MPU6050_SCL_PIN 20 // Expansion header Pin 7

// === ePaper Driver Selection ===
// 0: reTerminal E1001 (7.5'' B&W)
// 1: reTerminal E1002 (7.3'' Color)
#define EPD_SELECT 1

// Display ID for this device (Spectra 6 7.3" reTerminal E1002 = "I")
#define DEVICE_DISPLAY_ID "I"

// Default display rotation (0=landscape, 1=portrait, 2=landscape inverted, 3=portrait inverted)
#define DEFAULT_DISPLAY_ROTATION 0

#if (EPD_SELECT == 0)
#define GxEPD2_DISPLAY_CLASS GxEPD2_BW
#define GxEPD2_DRIVER_CLASS GxEPD2_750_GDEY075T7
#elif (EPD_SELECT == 1)
#define GxEPD2_DISPLAY_CLASS GxEPD2_7C
#define GxEPD2_DRIVER_CLASS GxEPD2_730c_GDEP073E01
#endif

// For displays with RAM limitations
#define MAX_DISPLAY_BUFFER_SIZE 16000
#define MAX_HEIGHT(EPD)                                                        \
  (EPD::HEIGHT <= MAX_DISPLAY_BUFFER_SIZE / (EPD::WIDTH / 8)                   \
       ? EPD::HEIGHT                                                           \
       : MAX_DISPLAY_BUFFER_SIZE / (EPD::WIDTH / 8))

// === Global Objects ===
SPIClass hspi(HSPI);
Preferences preferences;
WebServer server(80);
DNSServer dnsServer;

GxEPD2_DISPLAY_CLASS<GxEPD2_DRIVER_CLASS, MAX_HEIGHT(GxEPD2_DRIVER_CLASS)>
    display(GxEPD2_DRIVER_CLASS(/*CS=*/EPD_CS_PIN, /*DC=*/EPD_DC_PIN,
                                /*RST=*/EPD_RES_PIN, /*BUSY=*/EPD_BUSY_PIN));

// === Configuration Variables ===
String wifiSSID = "";
String wifiPassword = "";
String hostChannelUrl = "";
/** Wenn kein MPU6050: logische Ausrichtung für Bildfilter (0–3), siehe readOrientation(). */
uint8_t configDefaultOrientation = 0;
bool configMode = false;
unsigned long configModeStartTime = 0;
const unsigned long CONFIG_MODE_TIMEOUT = 300000; // 5 minutes

// === Show Management ===
String currentShowName = "";
String currentShowMode = "forwardssequence"; // forwardssequence, reversesequence, random
int currentShowTimer = 5; // minutes
int currentImageIndex = 0;
unsigned long lastImageChangeTime = 0;
std::vector<String> currentShowImages;

// === WiFi Status ===
bool wifiConnected = false;
unsigned long lastServerCheck = 0;
const unsigned long SERVER_CHECK_INTERVAL = 60000; // 1 minute

// === Server / letztes Bild (Offline-Hinweis) ===
int g_lastHttpStatusCode = -1;
/** Zuletzt erfolgreich auf dem Panel gezeichnete .ink-Datei (nur Dateiname). */
String lastDisplayedInkName = "";
/** True, solange das aktuell sichtbare Bild mit Offline-Warn-Badge oben rechts gezeichnet wurde. */
bool offlineBadgeOnScreen = false;
/** Letzter getShows-Lauf: HTTP 200 + gültiges JSON (Show-Liste verstanden). */
bool lastGetShowsSucceeded = true;
/** Diagnose-String: letzte Fehlerstelle in getActiveShow (für Statusbildschirm). */
String lastGetShowError = "";

// === Quick-Menu Mode ===
bool quickMenuMode = false;
unsigned long quickMenuStart = 0;
const unsigned long QUICK_MENU_TIMEOUT = 60000; // 60 seconds
String cachedShowsJson = "";  // cached response from server for the menu

/** >0 und millis() < deadline: Show nur lokal (Server-activeShows wird ignoriert). */
unsigned long showTempOverrideUntilMs = 0;
/** Zuletzt vom Server gelesene aktive Show (für Quick-Menü-Hinweis bei lokalem Override). */
String serverActiveShowCached = "";
/** Standard „Minuten bis Server wieder gilt“ im Quick-Menü (NVS qRevMin). */
uint16_t quickMenuRevertMinutes = 60;

static bool isShowTempOverrideActive() {
  if (showTempOverrideUntilMs == 0) return false;
  return (long)(millis() - showTempOverrideUntilMs) < 0;
}

// Captive-Portal DNS only when Soft-AP aktiv (sonst kein dnsServer.processNextRequest)
bool dnsServerActive = false;

// === SD Card Status ===
bool sdCardMounted = false;
/** Nach fehlgeschlagenem SD.begin (Karte meldet sich, Mount klappt nicht): kein SD.begin spam. */
bool sdLazyMountFailed = false;

// === MPU6050 Orientation Sensor ===
bool mpu6050Available = false;
int currentOrientation = 0; // 0=landscape, 1=portrait, 2=landscape_180, 3=portrait_180
unsigned long lastOrientationCheck = 0;
const unsigned long ORIENTATION_CHECK_INTERVAL = 1000; // Check every second
const float ORIENTATION_THRESHOLD = 0.5; // Threshold for orientation change (g-force)
std::vector<String> allShowImages; // Store all images before filtering
/** Hash der Server-„imgs“-Liste der zuletzt erfolgreich geladenen Show (gleicher Show-Name, neue Bilder). */
static uint32_t loadedShowImagesFingerprint = 0;

// MPU6050 Helper Functions
int16_t readMPU6050Register(uint8_t reg) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(static_cast<uint8_t>(MPU6050_ADDR), static_cast<size_t>(2), true);
  return (Wire.read() << 8) | Wire.read();
}

// Forward declarations
void filterImagesByOrientation();

// === Color Palette for E1002 (Spectra 6) ===
#if (EPD_SELECT == 1)
const uint8_t palette[][3] = {
    {0, 0, 0},       // 0: Black
    {255, 255, 255}, // 1: White
    {0, 255, 0},     // 2: Green
    {0, 0, 255},     // 3: Blue
    {255, 0, 0},     // 4: Red
    {255, 255, 0},   // 5: Yellow
};

const uint16_t epaper_colors[] = {
    GxEPD_BLACK, GxEPD_WHITE, GxEPD_GREEN, GxEPD_BLUE, GxEPD_RED, GxEPD_YELLOW,
};

const int num_colors = sizeof(palette) / sizeof(palette[0]);

uint16_t findNearestColor(uint8_t r, uint8_t g, uint8_t b) {
  long min_dist_sq = -1;
  int best_color_index = 0;

  for (int i = 0; i < num_colors; i++) {
    long dr = r - palette[i][0];
    long dg = g - palette[i][1];
    long db = b - palette[i][2];
    long dist_sq = dr * dr + dg * dg + db * db;

    if (min_dist_sq == -1 || dist_sq < min_dist_sq) {
      min_dist_sq = dist_sq;
      best_color_index = i;
    }
  }
  return epaper_colors[best_color_index];
}
#endif

// === Helper Functions ===
uint16_t read16(File &f) {
  uint16_t result;
  ((uint8_t *)&result)[0] = f.read(); // LSB
  ((uint8_t *)&result)[1] = f.read(); // MSB
  return result;
}

uint32_t read32(File &f) {
  uint32_t result;
  ((uint8_t *)&result)[0] = f.read(); // LSB
  ((uint8_t *)&result)[1] = f.read();
  ((uint8_t *)&result)[2] = f.read();
  ((uint8_t *)&result)[3] = f.read(); // MSB
  return result;
}

// === Configuration Management ===
void loadConfig() {
  preferences.begin("microPhotoFrame", false);
  wifiSSID = preferences.getString("wifiSSID", "");
  wifiPassword = preferences.getString("wifiPassword", "");
  hostChannelUrl = preferences.getString("hostChannelUrl", "");
  uint8_t o = preferences.getUChar("defOrient", 0);
  if (o > 3) o = 0;
  configDefaultOrientation = o;
  lastDisplayedInkName = preferences.getString("lastInk", "");
  currentShowName = preferences.getString("lastShow", "");
  unsigned rm = preferences.getUShort("qRevMin", 60);
  if (rm < 1) rm = 60;
  if (rm > 1440) rm = 1440;
  quickMenuRevertMinutes = (uint16_t)rm;
  showTempOverrideUntilMs = 0;
  preferences.end();
  
  Serial1.print("Loaded config - SSID: ");
  Serial1.print(wifiSSID);
  Serial1.print(", URL: ");
  Serial1.print(hostChannelUrl);
  Serial1.print(", defOrient: ");
  Serial1.print((int)configDefaultOrientation);
  Serial1.print(", lastInk len: ");
  Serial1.print(lastDisplayedInkName.length());
  Serial1.print(", lastShow: ");
  Serial1.println(currentShowName);
}

void saveConfig() {
  preferences.begin("microPhotoFrame", false);
  preferences.putString("wifiSSID", wifiSSID);
  preferences.putString("wifiPassword", wifiPassword);
  preferences.putString("hostChannelUrl", hostChannelUrl);
  preferences.putUChar("defOrient", configDefaultOrientation);
  preferences.end();
  Serial1.println("Config saved");
}

void clearConfig() {
  preferences.begin("microPhotoFrame", false);
  preferences.clear();
  preferences.end();
  wifiSSID = "";
  wifiPassword = "";
  hostChannelUrl = "";
  lastDisplayedInkName = "";
  currentShowName = "";
  Serial1.println("Config cleared");
}

void rememberDisplayedInk(const String& name) {
  lastDisplayedInkName = name;
  preferences.begin("microPhotoFrame", false);
  preferences.putString("lastInk", name);
  preferences.end();
}

// === Configuration Web Server ===
static String jsonEscapeSsid(const String& s) {
  String out;
  out.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    switch (c) {
      case '\\': out += "\\\\"; break;
      case '"':  out += "\\\""; break;
      case '\n': out += "\\n"; break;
      case '\r': out += "\\r"; break;
      case '\t': out += "\\t"; break;
      default:
        if ((uint8_t)c < 0x20) { /* skip other control chars in SSID */ }
        else { out += c; }
        break;
    }
  }
  return out;
}

void handleScan() {
  Serial1.println("Scanning WiFi networks...");
  WiFi.scanDelete();
  delay(100);
  // show_hidden=true, etwas länger pro Kanal (hilft oft bei gleichzeitigem SoftAP)
  int n = WiFi.scanNetworks(false, true, false, 450);
  if (n <= 0) {
    Serial1.println("Sync scan empty, trying async...");
    WiFi.scanNetworks(true, true, false, 450);
    unsigned long t0 = millis();
    while (WiFi.scanComplete() == WIFI_SCAN_RUNNING && millis() - t0 < 12000) {
      delay(100);
    }
    int16_t ac = WiFi.scanComplete();
    if (ac == WIFI_SCAN_FAILED || ac < 0) {
      n = 0;
    } else {
      n = ac;
    }
  }

  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + jsonEscapeSsid(WiFi.SSID(i)) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"encryption\":" + String((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "false" : "true") + "}";
  }
  json += "]";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
  Serial1.print("Found ");
  Serial1.print(n);
  Serial1.println(" networks");
}

static String htmlEscapeSsid(const String& s) {
  String out;
  out.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    switch (c) {
      case '&':  out += "&amp;"; break;
      case '<':  out += "&lt;"; break;
      case '>':  out += "&gt;"; break;
      case '"':  out += "&quot;"; break;
      case '\'': out += "&#39;"; break;
      default:   out += c; break;
    }
  }
  return out;
}

static int doWiFiScan() {
  Serial1.println("Server-side WiFi scan...");
  WiFi.scanDelete();
  delay(100);
  int n = WiFi.scanNetworks(false, true, false, 500);
  if (n <= 0) {
    Serial1.println("First scan 0 results, retrying...");
    delay(500);
    n = WiFi.scanNetworks(false, true, false, 500);
  }
  Serial1.print("Scan result: ");
  Serial1.print(n);
  Serial1.println(" networks");
  return (n < 0) ? 0 : n;
}

// --- SD-Assets für Web (gleiche Dateinamen wie Website: webassets/Logo.png + LogoText.png) ---
static bool ensureSdForWebAsset() {
  if (sdCardMounted) return true;
  pinMode(SD_EN_PIN, OUTPUT);
  digitalWrite(SD_EN_PIN, HIGH);
  if (digitalRead(SD_DET_PIN) != LOW) return false;
  if (sdLazyMountFailed) return false;
  if (SD.begin(SD_CS_PIN, hspi)) {
    sdCardMounted = true;
    sdLazyMountFailed = false;
    return true;
  }
  sdLazyMountFailed = true;
  return false;
}

static bool sendSdFirstMatch(const char* const* paths, const char* mime) {
  if (!ensureSdForWebAsset()) return false;
  for (; *paths; ++paths) {
    if (!SD.exists(*paths)) continue;
    File f = SD.open(*paths, FILE_READ);
    if (!f) continue;
    size_t fileSize = f.size();
    if (fileSize == 0) {
      f.close();
      continue;
    }
    server.sendHeader("Content-Type", mime);
    server.sendHeader("Content-Length", String(fileSize));
    server.sendHeader("Cache-Control", "public, max-age=3600");
    server.send(200);
    WiFiClient client = server.client();
    uint8_t buffer[512];
    while (fileSize > 0) {
      size_t n = f.read(buffer, min((size_t)512, fileSize));
      if (n == 0) break;
      if (client.write(buffer, n) == 0) break;
      fileSize -= n;
    }
    f.close();
    return true;
  }
  return false;
}

void handleRoot() {
  // In Quick-Menu mode, redirect "/" to the quick menu
  if (quickMenuMode) {
    server.sendHeader("Location", "/quickmenu");
    server.send(302);
    return;
  }

  // Scan direkt beim Seitenaufbau - kein JavaScript fetch nötig
  int numNetworks = doWiFiScan();

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><link rel='icon' href='/favicon.ico' type='image/x-icon'><title>microPhotoFrame Konfiguration</title>";
  html += "<style>body{font-family:Arial;max-width:600px;margin:50px auto;padding:20px;text-align:center;}";
  html += "input,button,select{width:100%;padding:10px;margin:10px 0;box-sizing:border-box;}";
  html += "button{background:#4CAF50;color:white;border:none;cursor:pointer;}";
  html += "#scanBtn{background:#2196F3;margin-bottom:10px;}";
  html += ".header-logo{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;}";
  html += ".header-logo img{max-height:72px;width:auto;max-width:100%;}";
  html += ".password-wrapper{position:relative;width:100%;}";
  html += ".password-wrapper input{width:100%;padding-right:45px;}";
  html += ".password-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:20px;padding:5px;width:auto;color:#666;}";
  html += ".password-toggle:hover{color:#333;}";
  html += ".status{padding:8px;margin:10px 0;border-radius:4px;font-size:14px;}";
  html += ".status.ok{background:#e8f5e9;color:#2e7d32;}";
  html += ".status.warn{background:#fff3e0;color:#e65100;}</style></head><body>";
  html += "<div class='header-logo'>";
  html += "<img src='/logo' alt='Logo' onerror=\"this.style.display='none'\">";
  html += "<img src='/logotext' alt='&micro;PhotoFrame' onerror=\"this.style.display='none'\">";
  html += "</div>";
  html += "<h1>microPhotoFrame Konfiguration</h1>";

  if (numNetworks > 0) {
    html += "<div class='status ok'>" + String(numNetworks) + " WLAN-Netzwerk(e) gefunden</div>";
  } else {
    html += "<div class='status warn'>Kein WLAN gefunden. Neu laden zum erneuten Scannen.</div>";
  }

  html += "<form method='POST' action='/save' id='cfgform'>";
  html += "<label>WiFi SSID:</label>";
  html += "<select name='ssid' id='ssid'>";
  html += "<option value=''>-- WLAN wählen --</option>";
  if (wifiSSID.length() > 0) {
    html += "<option value='" + htmlEscapeSsid(wifiSSID) + "' selected>" + htmlEscapeSsid(wifiSSID) + " (gespeichert)</option>";
  }
  for (int i = 0; i < numNetworks; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) continue;
    // Duplikate mit gespeicherter SSID vermeiden
    if (ssid == wifiSSID) continue;
    int rssi = WiFi.RSSI(i);
    bool locked = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    String label = htmlEscapeSsid(ssid);
    label += locked ? " &#128274;" : " (offen)";
    label += " (" + String(rssi) + " dBm)";
    html += "<option value='" + htmlEscapeSsid(ssid) + "'>" + label + "</option>";
  }
  html += "</select>";
  html += "<a href='/' style='font-size:12px;'>Erneut scannen</a>";
  html += "<input type='text' name='ssid_manual' id='ssid_manual' placeholder='oder SSID manuell eingeben' style='margin-top:5px;' autocomplete='off'>";
  html += "<label>WiFi Passwort:</label>";
  html += "<div class='password-wrapper'>";
  html += "<input type='password' name='password' id='password' value='" + htmlEscapeSsid(wifiPassword) + "'>";
  html += "<button type='button' class='password-toggle' onclick='togglePassword()' title='Passwort anzeigen/verbergen'>&#128065;</button>";
  html += "</div>";
  html += "<label>Host-Channel-URL:</label><input type='text' name='url' value='" + htmlEscapeSsid(hostChannelUrl) + "' placeholder='http://server.com:888'><br>";
  html += "<small style='color:#666;'>Basis-URL ohne Pfad (z.B. http://192.168.0.107:888).</small><br>";
  html += "<label>Standard-Ausrichtung (ohne Lagesensor MPU6050):</label>";
  html += "<select name='def_orient' id='def_orient'>";
  html += "<option value='0'" + String(configDefaultOrientation == 0 ? " selected" : "") + ">Querformat (0&deg;)</option>";
  html += "<option value='1'" + String(configDefaultOrientation == 1 ? " selected" : "") + ">Hochkant (90&deg;)</option>";
  html += "<option value='2'" + String(configDefaultOrientation == 2 ? " selected" : "") + ">Querformat gedreht (180&deg;)</option>";
  html += "<option value='3'" + String(configDefaultOrientation == 3 ? " selected" : "") + ">Hochkant gedreht (270&deg;)</option>";
  html += "</select>";
  html += "<small style='color:#666;'>Bei verbautem Sensor wird die Lage automatisch erkannt; dieser Wert gilt nur ohne Sensor.</small><br>";
  html += "<button type='submit'>Speichern</button>";
  html += "</form>";
  html += "<script>";
  html += "document.getElementById('ssid').addEventListener('change',function(e){";
  html += "if(e.target.value){document.getElementById('ssid_manual').value='';}";
  html += "});";
  html += "document.getElementById('ssid_manual').addEventListener('input',function(e){";
  html += "if(e.target.value.trim()){document.getElementById('ssid').selectedIndex=0;}";
  html += "});";
  html += "document.getElementById('cfgform').addEventListener('submit',function(e){";
  html += "var manual=document.getElementById('ssid_manual').value.trim();";
  html += "var sel=document.getElementById('ssid');";
  html += "var url=document.querySelector('input[name=url]').value.trim();";
  html += "if(!manual && !sel.value){";
  html += "e.preventDefault();alert('Bitte ein WLAN wählen oder die SSID manuell eingeben.');return;}";
  html += "if(!url){e.preventDefault();alert('Bitte die Host-Channel-URL eingeben.');return;}";
  html += "if(manual){sel.disabled=true;";
  html += "var h=document.createElement('input');h.type='hidden';h.name='ssid';h.value=manual;this.appendChild(h);}";
  html += "});";
  html += "function togglePassword(){";
  html += "var pwd=document.getElementById('password');";
  html += "if(pwd.type==='password'){pwd.type='text';}else{pwd.type='password';}";
  html += "}";
  html += "</script></body></html>";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "text/html", html);
}

void handleSave() {
  // Manuelle SSID hat Vorrang; vermeidet leeres ssid aus dem Select bei doppeltem Formularfeld
  String ssidIn;
  if (server.hasArg("ssid_manual")) {
    ssidIn = server.arg("ssid_manual");
    ssidIn.trim();
  }
  if (ssidIn.isEmpty() && server.hasArg("ssid")) {
    ssidIn = server.arg("ssid");
    ssidIn.trim();
  }
  String urlIn = server.hasArg("url") ? server.arg("url") : "";
  urlIn.trim();
  if (ssidIn.length() > 0 && urlIn.length() > 0) {
    wifiSSID = ssidIn;
    wifiPassword = server.hasArg("password") ? server.arg("password") : "";
    hostChannelUrl = urlIn;
    if (server.hasArg("def_orient")) {
      int o = server.arg("def_orient").toInt();
      if (o >= 0 && o <= 3) configDefaultOrientation = (uint8_t)o;
    }
    saveConfig();
    
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Gespeichert</title></head><body>";
    html += "<h1>Konfiguration gespeichert!</h1>";
    html += "<p>Das Gerät startet neu und verbindet sich mit dem WiFi...</p>";
    html += "</body></html>";
    server.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/plain", "Fehlende Parameter: SSID und Host-URL sind erforderlich.");
  }
}

void handleLogo() {
  static const char* kLogoPaths[] = {
      "/webassets/Logo.png",
      "/Logo.png",
      "/EINK_SPECTRA6_730_sq_800x480_logo.png",
      nullptr,
  };
  if (!sendSdFirstMatch(kLogoPaths, "image/png"))
    server.send(404, "text/plain", "Logo not found (SD: webassets/Logo.png oder /Logo.png)");
}

void handleLogoText() {
  static const char* kTextPaths[] = {
      "/webassets/LogoText.png",
      "/LogoText.png",
      nullptr,
  };
  if (!sendSdFirstMatch(kTextPaths, "image/png"))
    server.send(404, "text/plain", "LogoText not found (SD: webassets/LogoText.png)");
}

void handleFavicon() {
  static const char* kIcoPaths[] = {
      "/favicon.ico",
      "/webassets/favicon.ico",
      nullptr,
  };
  if (!sendSdFirstMatch(kIcoPaths, "image/x-icon"))
    server.send(404, "text/plain", "favicon not found (SD: /favicon.ico)");
}

void handleNotFound() {
  // For captive portal: redirect all unknown requests to config page
  handleRoot();
}

void handleCaptivePortal() {
  // Handle common captive portal detection URLs
  server.send(200, "text/html", "");
}

void startConfigAP() {
  // AP is already started in setup(), this function is kept for compatibility
  Serial1.println("Configuration AP is already running.");
}

void startConfigMode() {
  configMode = true;
  configModeStartTime = millis();
  Serial1.println("Starting configuration mode...");
  
  startConfigAP();
  
  // Show config message on display
  display.init(115200);
  display.setRotation(0);
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);
  display.setCursor(10, 30);
  display.print("Config Mode");
  display.setCursor(10, 60);
  display.print("WiFi: microPhotoFrame");
  display.setCursor(10, 90);
  display.print("(Open - no password)");
  IPAddress IP = WiFi.softAPIP();
  display.setCursor(10, 120);
  display.print("IP: ");
  display.print(IP.toString());
  display.display(false);
}

// === WiFi Connection ===

// Sauberer Radio-Reset: OFF → STA
static void resetWiFiRadio() {
  WiFi.disconnect(false);
  delay(100);
  WiFi.mode(WIFI_OFF);
  delay(200);
  WiFi.mode(WIFI_STA);
  delay(100);
}

// Einen Verbindungsversuch mit Timeout (ms). Gibt true zurück bei WL_CONNECTED.
static bool tryConnect(const char* ssid, const char* pass, int32_t channel, int timeoutMs) {
  if (pass && strlen(pass) > 0) {
    WiFi.begin(ssid, pass, channel);
  } else {
    WiFi.begin(ssid, nullptr, channel);
  }
  unsigned long start = millis();
  int dots = 0;
  while (WiFi.status() != WL_CONNECTED && (int)(millis() - start) < timeoutMs) {
    delay(500);
    Serial1.print(".");
    dots++;
    if (dots % 10 == 0) {
      Serial1.printf(" [%d]", (int)WiFi.status());
    }
  }
  Serial1.println();
  return WiFi.status() == WL_CONNECTED;
}

bool connectWiFi() {
  if (wifiSSID.length() == 0) {
    Serial1.println("No WiFi SSID configured");
    return false;
  }

  Serial1.print("Connecting to WiFi: ");
  Serial1.print(wifiSSID);
  Serial1.printf(" (pw len=%u)\n", (unsigned)wifiPassword.length());

  // Debug: Passwort-Hex (erste 2 + letzte 2 Bytes) zur Erkennung von Encoding-Problemen
  if (wifiPassword.length() > 0) {
    Serial1.print("  pw hex: ");
    const char* p = wifiPassword.c_str();
    size_t plen = strlen(p);
    for (size_t i = 0; i < plen && i < 2; i++) Serial1.printf("%02X ", (uint8_t)p[i]);
    if (plen > 4) Serial1.print(".. ");
    for (size_t i = (plen > 2 ? plen - 2 : 0); i < plen; i++) Serial1.printf("%02X ", (uint8_t)p[i]);
    Serial1.printf(" (strlen=%u)\n", (unsigned)plen);
  }

  WiFi.persistent(false);

  // --- Phase 1: Radio-Reset + Scan ---
  resetWiFiRadio();
  WiFi.setSleep(false);

  Serial1.println("WiFi scan (2.4 GHz)…");
  WiFi.scanDelete();
  int n = WiFi.scanNetworks(false, true);
  int32_t targetChannel = 0;
  if (n <= 0) {
    Serial1.println("  No networks / scan error");
  } else {
    bool found = false;
    for (int i = 0; i < n; i++) {
      if (WiFi.SSID(i) == wifiSSID) {
        found = true;
        targetChannel = WiFi.channel(i);
        Serial1.printf("  SSID found: ch=%d RSSI=%d enc=%d\n",
                       WiFi.channel(i), WiFi.RSSI(i), (int)WiFi.encryptionType(i));
        break;
      }
    }
    if (!found) {
      Serial1.println("  SSID not in scan — wrong name, 5 GHz-only, or out of range.");
    }
  }
  WiFi.scanDelete();

  // --- Phase 2: Radio nach Scan nochmals zurücksetzen (bekanntes ESP32-Problem) ---
  resetWiFiRadio();
  WiFi.setSleep(false);

  // --- Phase 3: Verbindungsversuche (max. 2) ---
  const int maxRetries = 2;
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial1.printf("WiFi.begin() attempt %d/%d (ch=%d)…\n", attempt, maxRetries, (int)targetChannel);
    if (tryConnect(wifiSSID.c_str(), wifiPassword.c_str(), targetChannel, 15000)) {
      Serial1.print("WiFi connected! IP: ");
      Serial1.println(WiFi.localIP());
      configTime(0, 0, "pool.ntp.org");
      return true;
    }

    wl_status_t st = WiFi.status();
    Serial1.printf("Attempt %d failed — status %d\n", attempt, (int)st);

    if (attempt < maxRetries) {
      Serial1.println("Retry after full radio reset…");
      resetWiFiRadio();
      WiFi.setSleep(false);
      targetChannel = 0; // beim Retry ohne Kanal-Hint
      delay(500);
    }
  }

  // --- Fehlgeschlagen ---
  wl_status_t status = WiFi.status();
  Serial1.printf("WiFi connection failed! Status: %d (", (int)status);
  switch(status) {
    case WL_IDLE_STATUS:     Serial1.print("IDLE"); break;
    case WL_NO_SSID_AVAIL:   Serial1.print("NO_SSID_AVAIL"); break;
    case WL_SCAN_COMPLETED:  Serial1.print("SCAN_COMPLETED"); break;
    case WL_CONNECTED:       Serial1.print("CONNECTED"); break;
    case WL_CONNECT_FAILED:  Serial1.print("CONNECT_FAILED"); break;
    case WL_CONNECTION_LOST: Serial1.print("CONNECTION_LOST"); break;
    case WL_DISCONNECTED:    Serial1.print("DISCONNECTED"); break;
    default:                 Serial1.print("UNKNOWN"); break;
  }
  Serial1.println(")");
  Serial1.print("SSID: "); Serial1.println(wifiSSID);
  Serial1.printf("Password length: %u\n", (unsigned)wifiPassword.length());
  Serial1.printf("RSSI: %d\n", WiFi.RSSI());

  if (status == WL_CONNECT_FAILED) {
    Serial1.println("Moegliche Ursachen:");
    Serial1.println("- Falsches Passwort (Sonderzeichen/Encoding-Problem?)");
    Serial1.println("- Router: nur WPA3 → WPA2/WPA3-Modus aktivieren");
    Serial1.println("- Gast-WLAN / MAC-Filter / Client-Isolation");
    Serial1.println("- Router neu starten, ESP stromlos machen, erneut versuchen");
  }

  return false;
}

// --- Boot-/Status-Branding: PNG von SD (wie Website: webassets/Logo.png + LogoText.png) ---
static PNG g_brandPng;
static File g_brandPngFile;
static int g_brandOx, g_brandOy, g_brandScrW, g_brandScrH;
/** Zielbreite in Pixeln (≤ Panel); Quellzeile = PNG-Breite — für horizontale Skalierung/Zentrierung */
static int g_brandDestW = 0;
static int g_brandSrcW = 0;

static std::vector<uint8_t> g_brandHttpBuf;
static std::vector<uint8_t>* g_brandRamPtr = nullptr;
static size_t g_brandRamPos = 0;

static void* brandPngOpenCB(const char* fn, int32_t* sz) {
  g_brandPngFile = SD.open(fn, FILE_READ);
  if (!g_brandPngFile) return nullptr;
  *sz = g_brandPngFile.size();
  return &g_brandPngFile;
}
static void brandPngCloseCB(void* /*h*/) { g_brandPngFile.close(); }
static int32_t brandPngReadCB(PNGFILE* /*pf*/, uint8_t* buf, int32_t len) {
  return g_brandPngFile.read(buf, len);
}
static int32_t brandPngSeekCB(PNGFILE* /*pf*/, int32_t pos) {
  return g_brandPngFile.seek(pos, SeekSet) ? pos : -1;
}

static int brandPngDrawCB(PNGDRAW* pDraw) {
  uint16_t line[800];
  int wline = pDraw->iWidth;
  if (wline > 800) wline = 800;
  g_brandPng.getLineAsRGB565(pDraw, line, PNG_RGB565_LITTLE_ENDIAN, 0xffff);
  int y = g_brandOy + pDraw->y;
  if (y < 0 || y >= g_brandScrH) return 1;
  for (int x = 0; x < wline; x++) {
    int px = g_brandOx + x;
    if (px < 0 || px >= g_brandScrW) continue;
    uint16_t c = line[x];
    int r = ((c >> 11) & 0x1F) * 527 / 31;
    int g = ((c >> 5) & 0x3F) * 259 / 63;
    int b = (c & 0x1F) * 527 / 31;
    int lum = (r * 30 + g * 59 + b * 11) / 100;
    uint16_t col = lum > 155 ? GxEPD_WHITE : GxEPD_BLACK;
    display.drawPixel((int16_t)px, (int16_t)y, col);
  }
  return 1;
}

static bool drawBrandPngAtY(const char* path, int& cursorY) {
  if (!sdCardMounted || !SD.exists(path)) return false;
  g_brandScrW = display.width();
  g_brandScrH = display.height();
  int rc = g_brandPng.open(path, brandPngOpenCB, brandPngCloseCB, brandPngReadCB, brandPngSeekCB, brandPngDrawCB);
  if (rc != PNG_SUCCESS) {
    g_brandPng.close();
    return false;
  }
  int iw = g_brandPng.getWidth();
  int ih = g_brandPng.getHeight();
  g_brandOx = (g_brandScrW - iw) / 2;
  if (g_brandOx < 4) g_brandOx = 4;
  g_brandOy = cursorY;
  if (g_brandOy + ih > g_brandScrH - 72)
    g_brandOy = max(8, g_brandScrH - 72 - ih);
  rc = g_brandPng.decode(nullptr, 0);
  g_brandPng.close();
  if (rc != PNG_SUCCESS) return false;
  cursorY = g_brandOy + ih + 8;
  return true;
}

static int drawWebBrandingOnEpd(int startY) {
  int y = startY;
  static const char* logoPaths[] = {
      "/webassets/Logo.png", "/Logo.png", "/EINK_SPECTRA6_730_sq_800x480_logo.png", nullptr};
  static const char* textPaths[] = {"/webassets/LogoText.png", "/LogoText.png", nullptr};
  for (const char** p = logoPaths; *p; p++) {
    if (drawBrandPngAtY(*p, y)) break;
  }
  for (const char** p = textPaths; *p; p++) {
    if (drawBrandPngAtY(*p, y)) break;
  }
  return y + 12;
}

// Statusmeldung auf dem E-Ink in lesbarer Größe (textSize 2, ~12 px/Zeichen)
static void showStatusScreen(const char* line1, const char* line2 = nullptr, const char* line3 = nullptr) {
  display.init(115200);
  display.setRotation(currentOrientation);
  display.setFullWindow();
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);

  int yText = 20;
  if (sdCardMounted) {
    yText = drawWebBrandingOnEpd(12);
    if (yText < 100) yText = 100;
    if (yText > 300) yText = 300;
  } else {
    yText = 60;
  }

  display.setTextSize(2);
  display.setCursor(20, yText);
  display.print(line1);
  if (line2) {
    yText += 40;
    display.setCursor(20, yText);
    display.print(line2);
  }
  if (line3) {
    yText += 50;
    display.setTextSize(1);
    display.setCursor(20, yText);
    display.print(line3);
  }
  display.setTextSize(1);
  display.display(false);
}

// === Forward Declarations ===
bool downloadImage(String imageName);
bool decodeAndDisplayInk(const String& filename, bool offlineHint = false);
bool decodeAndDisplayInkFromHTTP(const String& imageUrl, bool offlineHint = false);
bool isSDCardAvailable();
static String buildImageUrlForShow(const String& imageName);
static bool tryRedisplayLastWithOfflineBadge();
static bool redisplayLastWithoutOfflineBadge();

// === Server Communication ===
String doHttpPost(String url, String jsonPayload) {
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  http.setReuse(true);

  int httpCode = http.POST(jsonPayload);
  g_lastHttpStatusCode = httpCode;
  String response = "";

  if (httpCode >= 200 && httpCode < 300) {
    response = http.getString();
    Serial1.print("Server response code: ");
    Serial1.println(httpCode);
    Serial1.print("Response length: ");
    Serial1.println(response.length());
  } else if (httpCode > 0) {
    String errorBody = http.getString();
    Serial1.print("Server HTTP error: ");
    Serial1.println(httpCode);
    Serial1.print("Error body (first 120): ");
    Serial1.println(errorBody.substring(0, min((int)errorBody.length(), 120)));
  } else {
    Serial1.print("HTTP request failed: ");
    Serial1.print(httpCode);
    Serial1.print(" (");
    switch(httpCode) {
      case HTTPC_ERROR_CONNECTION_REFUSED: Serial1.print("CONNECTION_REFUSED"); break;
      case HTTPC_ERROR_SEND_HEADER_FAILED: Serial1.print("SEND_HEADER_FAILED"); break;
      case HTTPC_ERROR_SEND_PAYLOAD_FAILED: Serial1.print("SEND_PAYLOAD_FAILED"); break;
      case HTTPC_ERROR_NOT_CONNECTED: Serial1.print("NOT_CONNECTED"); break;
      case HTTPC_ERROR_CONNECTION_LOST: Serial1.print("CONNECTION_LOST"); break;
      case HTTPC_ERROR_NO_STREAM: Serial1.print("NO_STREAM"); break;
      case HTTPC_ERROR_NO_HTTP_SERVER: Serial1.print("NO_HTTP_SERVER"); break;
      case HTTPC_ERROR_TOO_LESS_RAM: Serial1.print("TOO_LESS_RAM"); break;
      case HTTPC_ERROR_ENCODING: Serial1.print("ENCODING"); break;
      case HTTPC_ERROR_STREAM_WRITE: Serial1.print("STREAM_WRITE"); break;
      case HTTPC_ERROR_READ_TIMEOUT: Serial1.print("READ_TIMEOUT"); break;
      default: Serial1.print("UNKNOWN"); break;
    }
    Serial1.println(")");
  }

  http.end();
  return response;
}

String makeServerRequest(String action, String jsonPayload = "{}") {
  if (hostChannelUrl.length() == 0) {
    Serial1.println("No host channel URL configured");
    return "";
  }

  Serial1.print("WiFi status: ");
  Serial1.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT_CONNECTED");
  if (WiFi.status() == WL_CONNECTED) {
    Serial1.print("Local IP: ");
    Serial1.println(WiFi.localIP());
  }

  // Primary URL (relies on server-side URL rewrite)
  String url = hostChannelUrl;
  url += (url.indexOf('?') >= 0) ? "&" : "?";
  url += "action=" + action;

  Serial1.print("Requesting URL: ");
  Serial1.println(url);

  String response = doHttpPost(url, jsonPayload);
  if (response.length() > 0) return response;

  // Fallback: POST directly to ASPX handler (bypasses URL Rewrite)
  if (g_lastHttpStatusCode == 405 || g_lastHttpStatusCode == 404) {
    String baseUrl = hostChannelUrl;
    if (!baseUrl.endsWith("/")) baseUrl += "/";
    String fallbackUrl = baseUrl + "aspx/microPhotoFrame.aspx?action=" + action;
    Serial1.print("Fallback URL: ");
    Serial1.println(fallbackUrl);
    response = doHttpPost(fallbackUrl, jsonPayload);
    if (response.length() > 0) return response;
  }

  return "";
}

// --- Fingerprint der Bildliste (getShow): Reload wenn Server imgs sich ändern, Show-Name gleich ---
static uint32_t computeShowImagesFingerprint(JsonArray imgs) {
  uint32_t h = 5381;
  size_t n = 0;
  if (!imgs.isNull()) {
    for (JsonVariant img : imgs) {
      String s = img.as<String>();
      n++;
      for (unsigned int i = 0; i < s.length(); i++) {
        h = ((h << 5) + h) + (uint8_t)s.charAt(i);
      }
    }
  }
  h ^= (uint32_t)(n ^ (n << 16)) ^ 0xA5A5A5A5u;
  return h;
}

static bool fetchServerShowImagesFingerprint(const String& showName, uint32_t* outFp) {
  if (!outFp) return false;
  *outFp = 0;
  JsonDocument requestDoc;
  requestDoc["input"]["showName"] = showName;
  String requestJson;
  serializeJson(requestDoc, requestJson);
  String response = makeServerRequest("getShow", requestJson);
  if (response.length() == 0) return false;
  JsonDocument doc;
  if (deserializeJson(doc, response) != DeserializationError::Ok) return false;
  if (!doc["ok"].as<bool>()) return false;
  JsonArray imgs = doc["output"]["show"]["imgs"];
  *outFp = computeShowImagesFingerprint(imgs);
  return true;
}

bool getActiveShow() {
  Serial1.println("Fetching active show...");
  
  String response = makeServerRequest("getShows");
  if (response.length() == 0) {
    lastGetShowError = "HTTP " + String(g_lastHttpStatusCode) + " empty resp";
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = false;
    return false;
  }
  
  Serial1.print("Response (first 200 chars): ");
  Serial1.println(response.substring(0, 200));
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    lastGetShowError = "JSON: " + String(error.c_str());
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = false;
    return false;
  }
  
  bool responseOk = doc["ok"].as<bool>();
  Serial1.print("Response ok: ");
  Serial1.println(responseOk ? "true" : "false");
  if (!responseOk) {
    lastGetShowError = "ok=false";
    String errMsg = doc["error"]["msg"] | "";
    if (errMsg.length() > 0) lastGetShowError += " " + errMsg;
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = false;
    return false;
  }
  
  // Cache erst NACH JSON-Validierung setzen (nie HTML-Fehlerseiten cachen)
  cachedShowsJson = response;
  
  JsonObject activeShows = doc["output"]["shows"]["activeShows"];
  if (activeShows.isNull()) {
    // Detaillierte Diagnose: welche Pfade existieren?
    bool hasOutput = !doc["output"].isNull();
    bool hasShows  = hasOutput && !doc["output"]["shows"].isNull();
    lastGetShowError = "activeShows null";
    if (!hasOutput) lastGetShowError += " (kein output)";
    else if (!hasShows) lastGetShowError += " (kein output.shows)";
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = false;
    return false;
  }
  
  Serial1.print("Looking for display ID: ");
  Serial1.println(DEVICE_DISPLAY_ID);
  Serial1.print("Available display IDs in activeShows: ");
  String availableIds = "";
  for (JsonPair kv : activeShows) {
    Serial1.print(kv.key().c_str());
    Serial1.print("=");
    Serial1.print(kv.value().as<String>());
    Serial1.print(" ");
    if (availableIds.length() > 0) availableIds += ",";
    availableIds += String(kv.key().c_str()) + "=" + kv.value().as<String>();
  }
  Serial1.println();
  
  JsonVariant showNameVariant = activeShows[DEVICE_DISPLAY_ID];
  if (showNameVariant.isNull()) {
    int displayIdNum = atoi(DEVICE_DISPLAY_ID);
    showNameVariant = activeShows[String(displayIdNum)];
  }
  
  if (showNameVariant.isNull() || !showNameVariant.is<String>()) {
    lastGetShowError = "ID '" + String(DEVICE_DISPLAY_ID) + "' not in {" + availableIds + "}";
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = true;
    return false;
  }
  
  String newShowName = showNameVariant.as<String>();
  if (newShowName.length() == 0) {
    lastGetShowError = "Show name empty";
    Serial1.println(lastGetShowError);
    lastGetShowsSucceeded = true;
    return false;
  }
  
  lastGetShowError = "";
  
  Serial1.print("Found active show: ");
  Serial1.println(newShowName);
  
  lastGetShowsSucceeded = true;

  serverActiveShowCached = newShowName;

  if (showTempOverrideUntilMs != 0 && (long)(millis() - showTempOverrideUntilMs) >= 0) {
    showTempOverrideUntilMs = 0;
    Serial1.println("Show-Override war abgelaufen (Deadline in getActiveShow bereinigt).");
  }

  if (isShowTempOverrideActive()) {
    Serial1.print("Lokale Temp-Show aktiv, Server-Vorgabe nur Info: ");
    Serial1.println(newShowName);
    return false;
  }

  if (newShowName != currentShowName) {
    currentShowName = newShowName;
    currentImageIndex = 0;
    currentShowImages.clear();
    // Show-Name persistent speichern (Wiederherstellung nach Reboot)
    preferences.begin("microPhotoFrame", false);
    preferences.putString("lastShow", currentShowName);
    preferences.end();
    Serial1.print("Active show changed to: ");
    Serial1.println(currentShowName);
    return true;
  }
  
  // Show name hasn't changed, but if we have no images loaded, return true anyway
  // This handles the case where device was reset but show name is the same
  if (currentShowImages.size() == 0 && allShowImages.size() == 0) {
    Serial1.println("Show name unchanged, but no images loaded - will reload");
    return true;
  }

  // Gleicher Show-Name, aber neue/entfernte Bilder auf dem Server (z. B. Upload im Web-UI)
  if (allShowImages.size() > 0 || currentShowImages.size() > 0) {
    uint32_t srvFp = 0;
    if (fetchServerShowImagesFingerprint(newShowName, &srvFp)) {
      if (srvFp != loadedShowImagesFingerprint) {
        Serial1.print("Show image list changed on server (fp ");
        Serial1.print(loadedShowImagesFingerprint, HEX);
        Serial1.print(" -> ");
        Serial1.print(srvFp, HEX);
        Serial1.println(") — will reload");
        return true;
      }
    }
  }

  return false;
}

bool loadShowData() {
  if (currentShowName.length() == 0) {
    return false;
  }
  
  Serial1.print("Loading show data for: ");
  Serial1.println(currentShowName);
  
  JsonDocument requestDoc;
  requestDoc["input"]["showName"] = currentShowName;
  String requestJson;
  serializeJson(requestDoc, requestJson);
  
  String response = makeServerRequest("getShow", requestJson);
  if (response.length() == 0) {
    return false;
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error || !doc["ok"]) {
    Serial1.println("Failed to load show data");
    return false;
  }
  
  JsonObject show = doc["output"]["show"];
  currentShowMode = show["mode"].as<String>();
  currentShowTimer = show["timer"].as<int>();
  
  // Store all images first
  allShowImages.clear();
  currentShowImages.clear();
  JsonArray imgs = show["imgs"];
  for (JsonVariant img : imgs) {
    allShowImages.push_back(img.as<String>());
  }
  
  // Filter images based on current orientation
  filterImagesByOrientation();
  
  Serial1.print("Loaded ");
  Serial1.print(allShowImages.size());
  Serial1.print(" total images, ");
  Serial1.print(currentShowImages.size());
  Serial1.print(" images for orientation ");
  Serial1.print(currentOrientation);
  const char* orientationNames[] = {"landscape (0°)", "portrait (90°)", "landscape inverted (180°)", "portrait inverted (270°)"};
  if (currentOrientation >= 0 && currentOrientation < 4) {
    Serial1.print(" (");
    Serial1.print(orientationNames[currentOrientation]);
    Serial1.print(")");
  }
  Serial1.println();
  Serial1.print("Mode: ");
  Serial1.println(currentShowMode);
  Serial1.print("Timer: ");
  Serial1.print(currentShowTimer);
  Serial1.println(" minutes");
  
  // Download images to SD card if available (for offline mode)
  if (isSDCardAvailable()) {
    Serial1.println("SD card available - downloading images for offline use...");
    for (size_t i = 0; i < currentShowImages.size(); i++) {
      String imageName = currentShowImages[i];
      if (!SD.exists("/" + imageName)) {
        Serial1.print("Downloading image ");
        Serial1.print(i + 1);
        Serial1.print("/");
        Serial1.print(currentShowImages.size());
        Serial1.print(": ");
        Serial1.println(imageName);
        if (!downloadImage(imageName)) {
          Serial1.print("Failed to download: ");
          Serial1.println(imageName);
        }
        delay(100); // Small delay between downloads
      } else {
        Serial1.print("Image already exists: ");
        Serial1.println(imageName);
      }
    }
    Serial1.println("All images ready on SD card");
  } else {
    Serial1.println("No SD card - images will be loaded directly from server");
  }

  loadedShowImagesFingerprint = computeShowImagesFingerprint(imgs);

  return true;
}

bool downloadImage(String imageName) {
  if (hostChannelUrl.length() == 0 || currentShowName.length() == 0) {
    return false;
  }
  
  // Construct image URL: extract base URL from hostChannelUrl
  // Remove query parameters and path, keep only protocol://host:port
  String baseUrl = hostChannelUrl;
  int queryPos = baseUrl.indexOf("?");
  if (queryPos >= 0) {
    baseUrl = baseUrl.substring(0, queryPos);
  }
  // Find the port number (after :)
  int portPos = baseUrl.lastIndexOf(":");
  if (portPos > 0) {
    // Find the first / after the port
    int slashAfterPort = baseUrl.indexOf("/", portPos);
    if (slashAfterPort > 0) {
      // Keep only protocol://host:port
      baseUrl = baseUrl.substring(0, slashAfterPort);
    }
  }
  // Ensure baseUrl ends with /
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }
  String imageUrl = baseUrl + "shows/show_" + currentShowName + "/" + imageName;
  
  Serial1.print("Downloading image: ");
  Serial1.println(imageUrl);
  
  // Check WiFi connection first
  if (WiFi.status() != WL_CONNECTED) {
    Serial1.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  http.begin(imageUrl);
  // Add standard headers like Postman sends them
  http.addHeader("Accept", "*/*");
  http.addHeader("User-Agent", "microPhotoFrame/1.0");
  http.setTimeout(30000); // 30 second timeout
  http.setConnectTimeout(10000); // 10 second connection timeout
  
  int httpCode = http.GET();
  if (httpCode != HTTP_CODE_OK) {
    Serial1.print("HTTP error: ");
    Serial1.print(httpCode);
    Serial1.print(" (");
    switch(httpCode) {
      case HTTPC_ERROR_CONNECTION_REFUSED: Serial1.print("CONNECTION_REFUSED"); break;
      case HTTPC_ERROR_READ_TIMEOUT: Serial1.print("READ_TIMEOUT"); break;
      default: Serial1.print("UNKNOWN"); break;
    }
    Serial1.println(")");
    http.end();
    return false;
  }
  
  // Save to SD card
  String filePath = "/" + imageName;
  File file = SD.open(filePath, FILE_WRITE);
  if (!file) {
    Serial1.println("Failed to open file for writing");
    http.end();
    return false;
  }
  
  int len = http.getSize();
  uint8_t buff[128] = {0};
  WiFiClient *stream = http.getStreamPtr();
  const unsigned long kDownloadTimeoutMs = 120000UL;
  unsigned long dwStart = millis();

  if (len > 0) {
    while (len > 0) {
      if (millis() - dwStart > kDownloadTimeoutMs) {
        Serial1.println("downloadImage: timeout (Content-Length)");
        break;
      }
      int av = stream->available();
      if (av > 0) {
        int chunk = min(av, (int)sizeof(buff));
        chunk = min(chunk, len);
        int c = stream->readBytes(buff, (size_t)chunk);
        if (c > 0) {
          file.write(buff, c);
          len -= c;
        }
      } else if (!http.connected()) {
        break;
      } else {
        delay(2);
      }
    }
    if (len != 0) {
      Serial1.println("downloadImage: incomplete body");
      file.close();
      http.end();
      SD.remove(filePath.c_str());
      return false;
    }
  } else {
    while (http.connected() || stream->available() > 0) {
      if (millis() - dwStart > kDownloadTimeoutMs) {
        Serial1.println("downloadImage: timeout (chunked/unknown length)");
        break;
      }
      int av = stream->available();
      if (av > 0) {
        int c = stream->readBytes(buff, min(av, (int)sizeof(buff)));
        if (c > 0) file.write(buff, c);
      } else {
        delay(2);
      }
    }
  }

  file.close();
  http.end();

  Serial1.println("Image downloaded successfully");
  return true;
}

// === .ink File Decoding ===
// LZW Dictionary Entry Structure
struct LZWDictEntry {
  std::vector<uint8_t> data;
};

// Color palette for Spectra 6: Black, White, Red, Yellow, Blue, Green
static const uint16_t displayPalette[6] = {
  GxEPD_BLACK, GxEPD_WHITE, GxEPD_RED, GxEPD_YELLOW, GxEPD_BLUE, GxEPD_GREEN
};

// Decode raw deflate using ESP32 ROM tinfl. tinfl_decompressor is ~12–15 kB;
// tinfl_decompress_mem_to_mem keeps it on the caller stack and overflows the
// Arduino loop stack (8 kB) — allocate on heap instead (same logic as miniz).
static size_t decodeDeflate(const uint8_t* compData, size_t compLen,
                            uint8_t* outBuf, size_t outBufLen) {
  tinfl_decompressor* decomp =
      (tinfl_decompressor*)malloc(sizeof(tinfl_decompressor));
  if (!decomp) {
    Serial1.println("decodeDeflate: malloc tinfl_decompressor failed");
    return 0;
  }
  tinfl_init(decomp);
  size_t srcLeft = compLen;
  size_t dstLeft = outBufLen;
  const mz_uint32 flags =
      (0u & ~(mz_uint32)TINFL_FLAG_HAS_MORE_INPUT) |
      (mz_uint32)TINFL_FLAG_USING_NON_WRAPPING_OUTPUT_BUF;
  tinfl_status st = tinfl_decompress(
      decomp, (const mz_uint8*)compData, &srcLeft, (mz_uint8*)outBuf,
      (mz_uint8*)outBuf, &dstLeft, flags);
  free(decomp);
  if (st != TINFL_STATUS_DONE) {
    Serial1.print("Deflate decompression failed, status=");
    Serial1.println((int)st);
    return 0;
  }
  return dstLeft;
}

// Paeth predictor (same algorithm as PNG/WebP VP8L)
static inline uint8_t paethPredictor(int a, int b, int c) {
  int p = a + b - c;
  int pa = abs(p - a);
  int pb = abs(p - b);
  int pc = abs(p - c);
  if (pa <= pb && pa <= pc) return (uint8_t)a;
  if (pb <= pc) return (uint8_t)b;
  return (uint8_t)c;
}

// Reverse Paeth prediction in-place: deltas → original pixel indices
static void inversePaethPrediction(uint8_t* data, int count, int width, int numColors) {
  for (int i = 0; i < count; i++) {
    if ((i & 0x1FFF) == 0) {
      yield();
      esp_task_wdt_reset();
    }
    int a = (width > 0 && (i % width) > 0) ? data[i - 1] : 0;
    int b = (width > 0 && i >= width)       ? data[i - width] : 0;
    int c = (width > 0 && (i % width) > 0 && i >= width) ? data[i - width - 1] : 0;
    int pred = (width > 0) ? paethPredictor(a, b, c) : (i > 0 ? data[i - 1] : 0);
    data[i] = (data[i] + pred) % numColors;
  }
}

// Decode LZW data (Version 0/1 .ink files)
static int decodeLZW(const uint8_t* fileData, int fileSize, int dataPtr,
                     uint8_t minCodeSize, uint8_t* result, int totalPixels) {
  int clearCode = 1 << minCodeSize;
  int eoiCode = clearCode + 1;
  uint32_t bitBuf = 0;
  int bitCount = 0;
  int ptr = dataPtr;
  int codeSize = minCodeSize + 1;

  auto readCode = [&]() -> int {
    while (bitCount < codeSize) {
      if (ptr >= fileSize) return eoiCode;
      bitBuf |= ((uint32_t)fileData[ptr++] << bitCount);
      bitCount += 8;
    }
    int code = bitBuf & ((1 << codeSize) - 1);
    bitBuf >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  std::vector<LZWDictEntry> dict;
  auto initDict = [&]() {
    dict.clear();
    for (int i = 0; i < (1 << minCodeSize); i++) {
      LZWDictEntry entry;
      entry.data.push_back(i);
      dict.push_back(entry);
    }
    dict.push_back(LZWDictEntry()); // clearCode
    dict.push_back(LZWDictEntry()); // eoiCode
  };

  initDict();

  int resIdx = 0;
  int oldCode = -1;

  while (resIdx < totalPixels) {
    int code = readCode();
    if (code == eoiCode) break;
    if (code == clearCode) {
      initDict();
      codeSize = minCodeSize + 1;
      oldCode = -1;
      continue;
    }

    std::vector<uint8_t> entry;
    if (code < (int)dict.size() && dict[code].data.size() > 0) {
      entry = dict[code].data;
    } else if (code == (int)dict.size() && oldCode != -1 && oldCode < (int)dict.size()) {
      entry = dict[oldCode].data;
      if (entry.size() > 0) entry.push_back(entry[0]);
    } else {
      Serial1.print("Invalid LZW code: ");
      Serial1.println(code);
      break;
    }

    for (size_t j = 0; j < entry.size() && resIdx < totalPixels; j++) {
      result[resIdx++] = entry[j];
    }

    if (oldCode != -1 && oldCode < (int)dict.size() && dict[oldCode].data.size() > 0) {
      LZWDictEntry newEntry;
      newEntry.data = dict[oldCode].data;
      if (entry.size() > 0) newEntry.data.push_back(entry[0]);
      dict.push_back(newEntry);
      if (dict.size() == (size_t)(1 << codeSize) && codeSize < 12) codeSize++;
    }

    oldCode = code;
  }
  return resIdx;
}

// Kleines Hinweis-Badge oben rechts (Server/WLAN-Problem) — in Bildkoordinaten
static bool offlineBadgePixel(int x, int y, int dw, int dh, uint16_t& outColor) {
  const int m = 6;
  const int bw = 36;
  const int bh = 40;
  if (dw < m + bw + 4 || dh < m + bh + 4) return false;
  int bx0 = dw - m - bw;
  int by0 = m;
  if (x < bx0 || x >= bx0 + bw || y < by0 || y >= by0 + bh) return false;
  bool border = (x < bx0 + 2 || x >= bx0 + bw - 2 || y < by0 + 2 || y >= by0 + bh - 2);
  if (border) {
#if (EPD_SELECT == 1)
    outColor = GxEPD_RED;
#else
    outColor = GxEPD_BLACK;
#endif
    return true;
  }
  int cx = bx0 + bw / 2;
  if (x >= cx - 1 && x <= cx + 1 && y >= by0 + 6 && y <= by0 + 22) {
    outColor = GxEPD_BLACK;
    return true;
  }
  if (x >= cx - 1 && x <= cx + 1 && y >= by0 + 26 && y <= by0 + 30) {
    outColor = GxEPD_BLACK;
    return true;
  }
#if (EPD_SELECT == 1)
  outColor = GxEPD_YELLOW;
#else
  outColor = GxEPD_WHITE;
#endif
  return true;
}

// Display decoded pixel data on the E-Ink display
static void displayPixels(uint8_t* result, int resIdx,
                          int displayWidth, int displayHeight, int fileOrientation,
                          bool offlineHint) {
  display.init(115200);
  display.setRotation(fileOrientation);
  display.fillScreen(GxEPD_WHITE);
  display.setFullWindow();
  display.firstPage();
  do {
    for (int y = 0; y < displayHeight; y++) {
      if ((y & 7) == 0) {
        yield();
        esp_task_wdt_reset();
      }
      for (int x = 0; x < displayWidth; x++) {
        uint16_t epdColor;
        if (offlineHint && offlineBadgePixel(x, y, displayWidth, displayHeight, epdColor)) {
          display.drawPixel(x, y, epdColor);
          continue;
        }
        int pixelIdx = y * displayWidth + x;
        if (pixelIdx < resIdx) {
          uint8_t colorIdx = result[pixelIdx];
          if (colorIdx < 6) {
            display.drawPixel(x, y, displayPalette[colorIdx]);
          } else {
            display.drawPixel(x, y, GxEPD_BLACK);
          }
        }
      }
    }
  } while (display.nextPage());
  display.hibernate();
}

static String buildImageUrlForShow(const String& imageName) {
  String baseUrl = hostChannelUrl;
  int queryPos = baseUrl.indexOf("?");
  if (queryPos >= 0) {
    baseUrl = baseUrl.substring(0, queryPos);
  }
  int portPos = baseUrl.lastIndexOf(":");
  if (portPos > 0) {
    int slashAfterPort = baseUrl.indexOf("/", portPos);
    if (slashAfterPort > 0) {
      baseUrl = baseUrl.substring(0, slashAfterPort);
    }
  }
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }
  return baseUrl + "shows/show_" + currentShowName + "/" + imageName;
}

static bool tryRedisplayLastWithOfflineBadge() {
  if (offlineBadgeOnScreen || lastDisplayedInkName.length() == 0) return false;
  if (isSDCardAvailable() && SD.exists("/" + lastDisplayedInkName)) {
    if (decodeAndDisplayInk(lastDisplayedInkName, true)) {
      offlineBadgeOnScreen = true;
      return true;
    }
  }
  if (WiFi.status() == WL_CONNECTED && hostChannelUrl.length() > 0 && currentShowName.length() > 0) {
    String url = buildImageUrlForShow(lastDisplayedInkName);
    if (decodeAndDisplayInkFromHTTP(url, true)) {
      offlineBadgeOnScreen = true;
      return true;
    }
  }
  return false;
}

static bool redisplayLastWithoutOfflineBadge() {
  if (lastDisplayedInkName.length() == 0) return false;
  if (isSDCardAvailable() && SD.exists("/" + lastDisplayedInkName)) {
    if (decodeAndDisplayInk(lastDisplayedInkName, false)) {
      offlineBadgeOnScreen = false;
      return true;
    }
  }
  if (WiFi.status() == WL_CONNECTED && hostChannelUrl.length() > 0 && currentShowName.length() > 0) {
    String url = buildImageUrlForShow(lastDisplayedInkName);
    if (decodeAndDisplayInkFromHTTP(url, false)) {
      offlineBadgeOnScreen = false;
      return true;
    }
  }
  return false;
}

// Nach Neustart: letztes Bild mit Offline-Badge — zuerst SD, sonst HTTP (ohne SD nutzbar)
static bool tryBootOfflineLastImage() {
  if (lastDisplayedInkName.length() == 0) return false;
  Serial1.println("Boot: letztes Bild mit Offline-Hinweis (SD oder HTTP)…");
  if (isSDCardAvailable() && SD.exists("/" + lastDisplayedInkName)) {
    if (decodeAndDisplayInk(lastDisplayedInkName, true)) {
      offlineBadgeOnScreen = true;
      lastImageChangeTime = millis();
      return true;
    }
  }
  if (WiFi.status() == WL_CONNECTED && hostChannelUrl.length() > 0 && currentShowName.length() > 0) {
    String url = buildImageUrlForShow(lastDisplayedInkName);
    if (decodeAndDisplayInkFromHTTP(url, true)) {
      offlineBadgeOnScreen = true;
      lastImageChangeTime = millis();
      return true;
    }
  }
  return false;
}

// SD optional: Slot leer → schnell false; einmal gemountet → sdCardMounted; sonst lazy mount
bool isSDCardAvailable() {
  pinMode(SD_EN_PIN, OUTPUT);
  digitalWrite(SD_EN_PIN, HIGH);
  if (digitalRead(SD_DET_PIN) == HIGH) {
    sdCardMounted = false;
    sdLazyMountFailed = false;
    return false;
  }
  if (sdCardMounted) return true;
  if (sdLazyMountFailed) return false;
  if (SD.begin(SD_CS_PIN, hspi)) {
    sdCardMounted = true;
    return true;
  }
  sdLazyMountFailed = true;
  return false;
}

bool decodeAndDisplayInk(const String& filename, bool offlineHint) {
  if (!isSDCardAvailable()) {
    Serial1.println("SD card not available for decodeAndDisplayInk");
    return false;
  }

  int fileOrientation = 0;
  if (filename.length() > 0) {
    char firstChar = filename.charAt(0);
    if (firstChar >= '0' && firstChar <= '3') fileOrientation = firstChar - '0';
  }

  File inkFile = SD.open("/" + filename, FILE_READ);
  if (!inkFile) {
    Serial1.print("Failed to open .ink file: ");
    Serial1.println(filename);
    return false;
  }

  size_t fileSize = inkFile.size();
  if (fileSize < 4) { Serial1.println("File too small"); inkFile.close(); return false; }

  uint8_t* fileData = (uint8_t*)malloc(fileSize);
  if (!fileData) { Serial1.println("Failed to allocate memory"); inkFile.close(); return false; }

  inkFile.read(fileData, fileSize);
  inkFile.close();

  uint8_t version = fileData[0];
  uint8_t displayId = fileData[1];
  uint8_t orient = fileData[3];

  Serial1.print("INK v"); Serial1.print(version);
  Serial1.print(" display="); Serial1.print((char)displayId);
  Serial1.print(" orient="); Serial1.println(orient == 0 ? "L" : "P");

  if (displayId != DEVICE_DISPLAY_ID[0]) {
    Serial1.println("Display ID mismatch!");
    free(fileData);
    return false;
  }

  const int displayWidth = (orient == 0) ? 800 : 480;
  const int displayHeight = (orient == 0) ? 480 : 800;
  const int totalPixels = displayWidth * displayHeight;

  uint8_t* result = (uint8_t*)malloc(totalPixels);
  if (!result) { Serial1.println("Failed to allocate result buffer"); free(fileData); return false; }

  int resIdx = 0;
  if (version == 3) {
    resIdx = decodeDeflate(fileData + 4, fileSize - 4, result, totalPixels);
    if (resIdx > 0) {
      inversePaethPrediction(result, resIdx, displayWidth, 6);
    }
  } else if (version == 2) {
    resIdx = decodeDeflate(fileData + 4, fileSize - 4, result, totalPixels);
  } else {
    uint8_t minCodeSize = 3;
    resIdx = decodeLZW(fileData, fileSize, 4, minCodeSize, result, totalPixels);
  }

  free(fileData);

  Serial1.print("Decoded "); Serial1.print(resIdx); Serial1.println(" pixels");

  if (resIdx != totalPixels) {
    Serial1.println("Decode size mismatch (SD) — abort display");
    free(result);
    return false;
  }

  displayPixels(result, resIdx, displayWidth, displayHeight, fileOrientation, offlineHint);
  free(result);

  Serial1.println("Image displayed successfully");
  return true;
}

// Decode and display .ink file directly from HTTP stream (without SD card)
bool decodeAndDisplayInkFromHTTP(const String& imageUrl, bool offlineHint) {
  Serial1.print("Loading .ink file from HTTP: ");
  Serial1.println(imageUrl);
  
  // Extract orientation from filename (first character: '0', '1', '2', or '3')
  int fileOrientation = 0; // Default to landscape
  // Extract filename from URL (last part after /)
  int lastSlash = imageUrl.lastIndexOf('/');
  if (lastSlash >= 0 && lastSlash < (int)imageUrl.length() - 1) {
    String filename = imageUrl.substring(lastSlash + 1);
    Serial1.print("Extracted filename: ");
    Serial1.println(filename);
    if (filename.length() > 0) {
      char firstChar = filename.charAt(0);
      Serial1.print("First character: ");
      Serial1.println(firstChar);
      if (firstChar >= '0' && firstChar <= '3') {
        fileOrientation = firstChar - '0';
        Serial1.print("File orientation set to: ");
        Serial1.println(fileOrientation);
      }
    }
  }
  
  // Check WiFi connection first
  if (WiFi.status() != WL_CONNECTED) {
    Serial1.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  http.begin(imageUrl);
  // Add standard headers like Postman sends them
  http.addHeader("Accept", "*/*");
  http.addHeader("User-Agent", "microPhotoFrame/1.0");
  // HTTPClient::setTimeout is uint16_t ms on ESP32 (max ~65 s — larger values overflow).
  http.setTimeout(65000);
  http.setConnectTimeout(20000);
  http.setReuse(false); // Don't reuse connection for large files
  
  Serial1.println("Sending HTTP GET request...");
  Serial1.print("WiFi status: ");
  Serial1.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT_CONNECTED");
  
  // Retry logic for HTTP requests (up to 3 attempts)
  int httpCode = -1;
  int retryCount = 0;
  const int maxRetries = 3;
  
  while (retryCount < maxRetries && httpCode != HTTP_CODE_OK) {
    if (retryCount > 0) {
      Serial1.print("HTTP GET retry ");
      Serial1.print(retryCount);
      Serial1.print(" of ");
      Serial1.println(maxRetries);
      delay(1000); // Wait 1 second before retry
    }
    
    httpCode = http.GET();
    Serial1.print("HTTP response code: ");
    Serial1.println(httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      break; // Success, exit retry loop
    }
    
    retryCount++;
    
    if (httpCode != HTTP_CODE_OK && retryCount < maxRetries) {
      Serial1.print("HTTP error: ");
      Serial1.print(httpCode);
      Serial1.print(" (");
      // Decode error codes
      switch(httpCode) {
        case HTTPC_ERROR_CONNECTION_REFUSED: Serial1.print("CONNECTION_REFUSED"); break;
        case HTTPC_ERROR_SEND_HEADER_FAILED: Serial1.print("SEND_HEADER_FAILED"); break;
        case HTTPC_ERROR_SEND_PAYLOAD_FAILED: Serial1.print("SEND_PAYLOAD_FAILED"); break;
        case HTTPC_ERROR_NOT_CONNECTED: Serial1.print("NOT_CONNECTED"); break;
        case HTTPC_ERROR_CONNECTION_LOST: Serial1.print("CONNECTION_LOST"); break;
        case HTTPC_ERROR_NO_STREAM: Serial1.print("NO_STREAM"); break;
        case HTTPC_ERROR_NO_HTTP_SERVER: Serial1.print("NO_HTTP_SERVER"); break;
        case HTTPC_ERROR_TOO_LESS_RAM: Serial1.print("TOO_LESS_RAM"); break;
        case HTTPC_ERROR_ENCODING: Serial1.print("ENCODING"); break;
        case HTTPC_ERROR_STREAM_WRITE: Serial1.print("STREAM_WRITE"); break;
        case HTTPC_ERROR_READ_TIMEOUT: Serial1.print("READ_TIMEOUT"); break;
        default: Serial1.print("UNKNOWN"); break;
      }
      Serial1.println(") - will retry...");
      http.end(); // Close connection before retry
      delay(500);
      http.begin(imageUrl); // Reinitialize connection
      // Add standard headers like Postman sends them
      http.addHeader("Accept", "*/*");
      http.addHeader("User-Agent", "microPhotoFrame/1.0");
      http.setTimeout(65000);
      http.setConnectTimeout(20000);
      http.setReuse(false);
    }
  }
  
  if (httpCode != HTTP_CODE_OK) {
    Serial1.print("HTTP error after ");
    Serial1.print(maxRetries);
    Serial1.print(" attempts: ");
    Serial1.print(httpCode);
    Serial1.print(" (");
    switch(httpCode) {
      case HTTPC_ERROR_CONNECTION_REFUSED: Serial1.print("CONNECTION_REFUSED"); break;
      case HTTPC_ERROR_SEND_HEADER_FAILED: Serial1.print("SEND_HEADER_FAILED"); break;
      case HTTPC_ERROR_SEND_PAYLOAD_FAILED: Serial1.print("SEND_PAYLOAD_FAILED"); break;
      case HTTPC_ERROR_NOT_CONNECTED: Serial1.print("NOT_CONNECTED"); break;
      case HTTPC_ERROR_CONNECTION_LOST: Serial1.print("CONNECTION_LOST"); break;
      case HTTPC_ERROR_NO_STREAM: Serial1.print("NO_STREAM"); break;
      case HTTPC_ERROR_NO_HTTP_SERVER: Serial1.print("NO_HTTP_SERVER"); break;
      case HTTPC_ERROR_TOO_LESS_RAM: Serial1.print("TOO_LESS_RAM"); break;
      case HTTPC_ERROR_ENCODING: Serial1.print("ENCODING"); break;
      case HTTPC_ERROR_STREAM_WRITE: Serial1.print("STREAM_WRITE"); break;
      case HTTPC_ERROR_READ_TIMEOUT: Serial1.print("READ_TIMEOUT"); break;
      default: Serial1.print("UNKNOWN"); break;
    }
    Serial1.println(")");
    http.end();
    return false;
  }
  
  // HTTP-Body: Content-Length bekannt ODER chunked / ohne Länge (getSize() == -1)
  const int announcedSize = http.getSize();
  Serial1.print("HTTP getSize (Content-Length): ");
  Serial1.println(announcedSize);

  WiFiClient *stream = http.getStreamPtr();
  if (stream) {
    // WiFiClient::setTimeout(seconds) — socket SO_RCVTIMEO for slow .ink body reads
    stream->setTimeout(240);
  }
  unsigned long readStartTime = millis();
  // Large .ink over WiFi: allow slow servers; avoid per-chunk Serial (blocks TCP/WiFi).
  const unsigned long kHttpBodyTimeoutMs =
      180000UL + (announcedSize > 0 ? (unsigned long)announcedSize / 400UL : 0UL);
  const size_t kMaxInkBodyBytes = 1700 * 1024;
  const size_t kReadLogStepBytes = 8192;

  uint8_t* fileData = nullptr;
  size_t bodyLen = 0;

  if (announcedSize > 0) {
    if ((size_t)announcedSize > kMaxInkBodyBytes) {
      Serial1.println("HTTP body larger than max");
      http.end();
      return false;
    }
    fileData = (uint8_t*)malloc((size_t)announcedSize);
    if (!fileData) {
      Serial1.println("Failed to allocate memory");
      http.end();
      return false;
    }
    size_t nextLogAt = 0;
    while (bodyLen < (size_t)announcedSize) {
      size_t available = stream->available();
      if (available) {
        size_t n = min(available, (size_t)announcedSize - bodyLen);
        size_t got = stream->readBytes(fileData + bodyLen, n);
        bodyLen += got;
        if (bodyLen >= nextLogAt || bodyLen == (size_t)announcedSize) {
          Serial1.print("Read ");
          Serial1.print(bodyLen);
          Serial1.print("/");
          Serial1.println(announcedSize);
          nextLogAt = bodyLen + kReadLogStepBytes;
        }
      } else if (!http.connected()) {
        delay(5);
        yield();
        if (stream->available() == 0) break;
      } else {
        delay(2);
        yield();
        esp_task_wdt_reset();
      }
      if (millis() - readStartTime > kHttpBodyTimeoutMs) {
        Serial1.println("Read timeout!");
        break;
      }
    }
    http.end();
    if (bodyLen != (size_t)announcedSize) {
      Serial1.println("Incomplete HTTP body for .ink (Content-Length)");
      free(fileData);
      return false;
    }
  } else {
    Serial1.println("No Content-Length (chunked/unknown) — read until connection closes");
    size_t cap = 32768;
    fileData = (uint8_t*)malloc(cap);
    if (!fileData) {
      Serial1.println("Failed to allocate memory");
      http.end();
      return false;
    }
    while (millis() - readStartTime < kHttpBodyTimeoutMs) {
      int av = stream->available();
      if (av > 0) {
        if (bodyLen + (size_t)av > cap) {
          size_t ncap = cap;
          while (bodyLen + (size_t)av > ncap) {
            ncap *= 2;
            if (ncap > kMaxInkBodyBytes) break;
          }
          if (bodyLen + (size_t)av > ncap || ncap > kMaxInkBodyBytes) {
            Serial1.println("HTTP body exceeds max size");
            free(fileData);
            http.end();
            return false;
          }
          void* p = realloc(fileData, ncap);
          if (!p) {
            free(fileData);
            http.end();
            return false;
          }
          fileData = (uint8_t*)p;
          cap = ncap;
        }
        int got = stream->readBytes(fileData + bodyLen, (size_t)av);
        if (got > 0) bodyLen += (size_t)got;
      } else if (!http.connected()) {
        delay(5);
        yield();
        if (stream->available() == 0) break;
      } else {
        delay(2);
        yield();
        esp_task_wdt_reset();
      }
    }
    http.end();
  }

  Serial1.print("Total body bytes: ");
  Serial1.println(bodyLen);
  if (bodyLen < 4) {
    Serial1.println("HTTP body too small for .ink header");
    free(fileData);
    return false;
  }
  
  uint8_t version = fileData[0];
  uint8_t displayId = fileData[1];
  uint8_t orient = fileData[3];

  Serial1.print("INK v"); Serial1.print(version);
  Serial1.print(" display="); Serial1.print((char)displayId);
  Serial1.print(" orient="); Serial1.println(orient == 0 ? "L" : "P");

  if (displayId != DEVICE_DISPLAY_ID[0]) {
    Serial1.println("Display ID mismatch!");
    free(fileData);
    return false;
  }

  const int displayWidth = (orient == 0) ? 800 : 480;
  const int displayHeight = (orient == 0) ? 480 : 800;
  const int totalPixels = displayWidth * displayHeight;

  uint8_t* result = (uint8_t*)malloc(totalPixels);
  if (!result) {
    Serial1.println("Failed to allocate result buffer");
    free(fileData);
    return false;
  }

  int resIdx = 0;
  if (version == 3) {
    resIdx = decodeDeflate(fileData + 4, bodyLen - 4, result, totalPixels);
    if (resIdx > 0) {
      inversePaethPrediction(result, resIdx, displayWidth, 6);
    }
  } else if (version == 2) {
    resIdx = decodeDeflate(fileData + 4, bodyLen - 4, result, totalPixels);
  } else {
    uint8_t minCodeSize = 3;
    resIdx = decodeLZW(fileData, bodyLen, 4, minCodeSize, result, totalPixels);
  }

  Serial1.print("Decoded "); Serial1.print(resIdx);
  Serial1.print("/"); Serial1.print(totalPixels); Serial1.println(" pixels");

  if (resIdx != totalPixels) {
    Serial1.println("Decode size mismatch — abort display");
    free(result);
    free(fileData);
    return false;
  }

  displayPixels(result, resIdx, displayWidth, displayHeight, fileOrientation, offlineHint);

  free(result);
  free(fileData);

  Serial1.println("Image displayed successfully from HTTP");
  return true;
}

// I2C Scanner function
void scanI2C() {
  Serial1.println("Scanning I2C bus...");
  int devicesFound = 0;
  
  // Check if I2C bus is working by testing a known invalid address first
  Wire.beginTransmission(0x00); // Address 0x00 is reserved and should always fail
  uint8_t testError = Wire.endTransmission();
  
  if (testError == 0) {
    Serial1.println("WARNING: I2C bus appears to be stuck or pins are wrong!");
    Serial1.println("All addresses are responding, which indicates a hardware problem.");
    Serial1.println("Possible causes:");
    Serial1.println("  1. Wrong SDA/SCL pins");
    Serial1.println("  2. Missing pull-up resistors (need 4.7kΩ on SDA and SCL)");
    Serial1.println("  3. Short circuit on I2C bus");
    Serial1.println("  4. I2C pins not properly configured");
    return;
  }
  
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();
    
    // Only count error == 0 as valid device
    // Error codes: 0=success, 1=data too long, 2=NACK on address, 3=NACK on data, 4=other error
    if (error == 0) {
      // Verify it's a real device by trying to read a byte
      Wire.beginTransmission(address);
      Wire.endTransmission(false);
      Wire.requestFrom(address, static_cast<size_t>(1), true);

      if (Wire.available() || Wire.read() != 0xFF) {
        Serial1.print("I2C device found at address 0x");
        if (address < 16) Serial1.print("0");
        Serial1.print(address, HEX);
        
        // Try to read WHO_AM_I for MPU6050
        if (address == MPU6050_ADDR || address == 0x69) {
          Wire.beginTransmission(address);
          Wire.write(0x75); // WHO_AM_I register
          Wire.endTransmission(false);
          Wire.requestFrom(address, static_cast<size_t>(1), true);
          if (Wire.available()) {
            uint8_t whoAmI = Wire.read();
            Serial1.print(" (WHO_AM_I: 0x");
            Serial1.print(whoAmI, HEX);
            Serial1.print(")");
            if (whoAmI == 0x68 || whoAmI == 0x71) {
              Serial1.print(" - MPU6050 detected!");
            }
          }
        }
        Serial1.println();
        devicesFound++;
      }
    }
  }
  
  if (devicesFound == 0) {
    Serial1.println("No I2C devices found!");
  } else {
    Serial1.print("Found ");
    Serial1.print(devicesFound);
    Serial1.println(" device(s)");
  }
}

// === MPU6050 Orientation Functions ===
bool initMPU6050() {
  Serial1.print("Initializing MPU6050 on SDA=");
  Serial1.print(MPU6050_SDA_PIN);
  Serial1.print(", SCL=");
  Serial1.print(MPU6050_SCL_PIN);
  Serial1.print(", ADDR=0x");
  Serial1.println(MPU6050_ADDR, HEX);
  
  // Initialize I2C with specific pins for reTerminal header
  Wire.begin(MPU6050_SDA_PIN, MPU6050_SCL_PIN);
  delay(100);
  
  // Scan I2C bus first
  scanI2C();
  
  // Try both possible addresses (0x68 and 0x69)
  uint8_t addresses[] = {MPU6050_ADDR, 0x69};
  
  for (int addrIdx = 0; addrIdx < 2; addrIdx++) {
    uint8_t addr = addresses[addrIdx];
    Serial1.print("Trying address 0x");
    Serial1.println(addr, HEX);
    
    // Wake up MPU6050 (clear sleep bit)
    Wire.beginTransmission(addr);
    Wire.write(MPU6050_PWR_MGMT_1);
    Wire.write(0); // Wake up
    uint8_t error = Wire.endTransmission();
    
    Serial1.print("Power management write error: ");
    Serial1.println(error);
    
    if (error == 0) {
      delay(10);
      // Check if device responds by reading WHO_AM_I register (0x75, should return 0x68)
      Wire.beginTransmission(addr);
      Wire.write(0x75);
      Wire.endTransmission(false);
      Wire.requestFrom(addr, static_cast<size_t>(1), true);

      if (Wire.available()) {
        uint8_t whoAmI = Wire.read();
        Serial1.print("WHO_AM_I register value: 0x");
        Serial1.println(whoAmI, HEX);
        
        if (whoAmI == 0x68 || whoAmI == 0x71) { // 0x71 is alternative address
          mpu6050Available = true;
          Serial1.print("MPU6050 initialized successfully at address 0x");
          Serial1.println(addr, HEX);
          // Update the address if we found it at 0x69
          if (addr == 0x69) {
            Serial1.println("Note: MPU6050 found at alternative address 0x69");
          }
          return true;
        } else {
          Serial1.print("Unexpected WHO_AM_I value, expected 0x68 or 0x71, got 0x");
          Serial1.println(whoAmI, HEX);
        }
      } else {
        Serial1.println("No data available from MPU6050");
      }
    } else {
      Serial1.print("I2C communication error: ");
      Serial1.println(error);
    }
  }
  
  mpu6050Available = false;
  Serial1.println("MPU6050 not found, orientation detection disabled");
  Serial1.println("Possible causes:");
  Serial1.println("  1. MPU6050 not connected");
  Serial1.println("  2. Wrong I2C pins (SDA/SCL)");
  Serial1.println("  3. MPU6050 defective");
  Serial1.println("  4. Power supply issue");
  return false;
}

int readOrientation() {
  if (!mpu6050Available) {
    return (int)configDefaultOrientation; // NVS / Erstkonfiguration (ohne Sensor)
  }
  
  // Read accelerometer data (16-bit values, need to divide by 16384 for ±2g range)
  int16_t accelX = readMPU6050Register(MPU6050_ACCEL_XOUT_H);
  int16_t accelY = readMPU6050Register(MPU6050_ACCEL_XOUT_H + 2);
  int16_t accelZ = readMPU6050Register(MPU6050_ACCEL_XOUT_H + 4);
  
  // Convert to g-force (assuming ±2g range: 16384 LSB/g)
  float gX = accelX / 16384.0;
  float gY = accelY / 16384.0;
  float gZ = accelZ / 16384.0;
  
  // Determine orientation based on accelerometer
  // Note: X and Y are swapped compared to previous logic
  // If device is in portrait, X-axis will have more gravity (not Y)
  // If device is in landscape, Y-axis will have more gravity (not X)
  float absX = abs(gX);
  float absY = abs(gY);
  float absZ = abs(gZ);
  
  // Find the axis with the most gravity (closest to 1.0 g)
  // Portrait: X-axis should be close to 1.0 (corrected from Y)
  // Landscape: Y-axis should be close to 1.0 (corrected from X)
  
  // Determine primary orientation (landscape vs portrait)
  bool isPortrait = absX > absY && absX > absZ * 0.7;
  bool isLandscape = absY > absX && absY > absZ * 0.7;
  
  if (isPortrait) {
    // Portrait orientation - check if normal (90°) or inverted (270°)
    if (gX > 0) {
      return 1; // Portrait normal (90°)
    } else {
      return 3; // Portrait inverted (270°)
    }
  } else if (isLandscape) {
    // Landscape orientation - check if normal (0°) or inverted (180°)
    if (gY > 0) {
      return 0; // Landscape normal (0°)
    } else {
      return 2; // Landscape inverted (180°)
    }
  }
  
  // Default to current orientation if unclear
  return currentOrientation;
}

void filterImagesByOrientation() {
  currentShowImages.clear();
  // Map orientation to image prefix character
  // 0 = landscape (0°) -> '0'
  // 1 = portrait (90°) -> '1'
  // 2 = landscape inverted (180°) -> '2'
  // 3 = portrait inverted (270°) -> '3'
  char orientationChar = '0' + currentOrientation;
  
  for (size_t i = 0; i < allShowImages.size(); i++) {
    String imageName = allShowImages[i];
    // Check if first character matches orientation
    if (imageName.length() > 0 && imageName.charAt(0) == orientationChar) {
      currentShowImages.push_back(imageName);
    }
  }

  // Wenn z. B. nur Hochformat-Dateien in der Show sind, das Gerät aber Quer meldet (oder umgekehrt),
  // wäre die Liste leer obwohl Bilder existieren — dann alle Bilder verwenden (Dekodierung nutzt Dateiname/Header).
  if (currentShowImages.size() == 0 && allShowImages.size() > 0) {
    Serial1.println("filterImagesByOrientation: keine Treffer für MPU-Ausrichtung — Fallback: alle Bilder der Show");
    for (size_t i = 0; i < allShowImages.size(); i++) {
      currentShowImages.push_back(allShowImages[i]);
    }
  }

  Serial1.print("Filtered to ");
  Serial1.print(currentShowImages.size());
  Serial1.print(" images for orientation ");
  Serial1.print(currentOrientation);
  const char* orientationNames[] = {"landscape (0°)", "portrait (90°)", "landscape inverted (180°)", "portrait inverted (270°)"};
  if (currentOrientation >= 0 && currentOrientation < 4) {
    Serial1.print(" (");
    Serial1.print(orientationNames[currentOrientation]);
    Serial1.print(")");
  }
  Serial1.println();
  
  // Reset image index if current index is out of bounds
  if (currentImageIndex >= (int)currentShowImages.size()) {
    currentImageIndex = 0;
  }
}

// === Image Display Logic ===
void displayNextImage() {
  if (currentShowImages.size() == 0) {
    Serial1.println("No images in current show");
    showStatusScreen("No images in show", currentShowName.c_str());
    return;
  }

  const int prevIndex = currentImageIndex;
  int nextIndex = prevIndex;

  if (currentShowMode == "random") {
    nextIndex = random(0, currentShowImages.size());
  } else if (currentShowMode == "reversesequence") {
    nextIndex = prevIndex - 1;
    if (nextIndex < 0) {
      nextIndex = (int)currentShowImages.size() - 1;
    }
  } else { // forwardssequence (default)
    nextIndex = prevIndex + 1;
    if (nextIndex >= (int)currentShowImages.size()) {
      nextIndex = 0;
    }
  }

  currentImageIndex = nextIndex;
  String imageName = currentShowImages[currentImageIndex];
  Serial1.print("Displaying image ");
  Serial1.print(currentImageIndex + 1);
  Serial1.print("/");
  Serial1.print(currentShowImages.size());
  Serial1.print(": ");
  Serial1.println(imageName);

  bool useSD = isSDCardAvailable();
  bool imageOnSD = (useSD && SD.exists("/" + imageName));

  if (imageOnSD) {
    Serial1.println("Image found on SD card");
  } else {
    Serial1.println("Image not on SD - loading from server...");
  }

  if (imageOnSD) {
    Serial1.println("Decoding and displaying image from SD...");
    if (decodeAndDisplayInk(imageName, false)) {
      lastImageChangeTime = millis();
      rememberDisplayedInk(imageName);
      offlineBadgeOnScreen = false;
      Serial1.println("Image displayed successfully");
    } else {
      // Alte/kurze SD-Kopie (z. B. vor v2/v3 oder abgebrochener Download) — frische Datei vom Server
      Serial1.println("SD decode failed — trying same file via HTTP");
      String imageUrl = buildImageUrlForShow(imageName);
      if (decodeAndDisplayInkFromHTTP(imageUrl, false)) {
        lastImageChangeTime = millis();
        rememberDisplayedInk(imageName);
        offlineBadgeOnScreen = false;
        Serial1.println("Image displayed from server (SD file unusable)");
      } else {
        Serial1.println("Failed to decode from SD and from server");
        currentImageIndex = prevIndex;
        tryRedisplayLastWithOfflineBadge();
        lastImageChangeTime = millis();
      }
    }
  } else {
    String imageUrl = buildImageUrlForShow(imageName);
    Serial1.print("Loading image directly from server: ");
    Serial1.println(imageUrl);

    if (decodeAndDisplayInkFromHTTP(imageUrl, false)) {
      lastImageChangeTime = millis();
      rememberDisplayedInk(imageName);
      offlineBadgeOnScreen = false;
      Serial1.println("Image displayed successfully from server");
    } else {
      Serial1.println("Failed to load image from server — behalte letztes Bild (ohne leeren Fehlerbildschirm)");
      currentImageIndex = prevIndex;
      if (!tryRedisplayLastWithOfflineBadge()) {
        Serial1.println("Kein lokales letztes Bild: E-Ink bleibt unverändert.");
      }
      lastImageChangeTime = millis();
    }
  }
}

// === OTA Firmware Update Handler ===
void handleOtaUpdate() {
  HTTPUpload& upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    Serial1.printf("OTA Update start: %s (%u bytes)\n", upload.filename.c_str(), upload.totalSize);
    if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
      Update.printError(Serial1);
    }
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
      Update.printError(Serial1);
    }
  } else if (upload.status == UPLOAD_FILE_END) {
    if (Update.end(true)) {
      Serial1.printf("OTA Update success: %u bytes\n", upload.totalSize);
    } else {
      Update.printError(Serial1);
    }
  }
}

void handleOtaResult() {
  bool success = !Update.hasError();
  server.sendHeader("Connection", "close");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (success) {
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Update successful, rebooting...\"}");
    delay(500);
    ESP.restart();
  } else {
    server.send(500, "application/json", "{\"ok\":false,\"msg\":\"Update failed\"}");
  }
}

void handleDeviceInfo() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  String json = "{";
  json += "\"name\":\"microPhotoFrame\"";
  json += ",\"version\":\"" + String(FIRMWARE_VERSION) + "\"";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += ",\"mac\":\"" + WiFi.macAddress() + "\"";
  json += ",\"freeHeap\":" + String(ESP.getFreeHeap());
  json += ",\"sketchSize\":" + String(ESP.getSketchSize());
  json += ",\"freeSketchSpace\":" + String(ESP.getFreeSketchSpace());
  json += ",\"display\":\"" + String(DEVICE_DISPLAY_ID) + "\"";
  json += "}";
  server.send(200, "application/json", json);
}

void handleOtaCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// === Quick-Menu Web Handlers ===

void handleQuickMenu() {
  unsigned long remaining = 0;
  if (quickMenuMode && millis() - quickMenuStart < QUICK_MENU_TIMEOUT)
    remaining = (QUICK_MENU_TIMEOUT - (millis() - quickMenuStart)) / 1000;

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<link rel='icon' href='/favicon.ico' type='image/x-icon'><title>&micro;PhotoFrame</title><style>";
  html += "body{font-family:'Segoe UI',sans-serif;background:#1a1a2e;color:#eee;margin:0;padding:20px;}";
  html += ".card{background:#16213e;border-radius:12px;padding:24px;max-width:420px;margin:0 auto;}";
  html += ".header-logo{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin:0 0 18px;}";
  html += ".header-logo img{max-height:56px;width:auto;max-width:100%;}";
  html += "label{display:block;margin:12px 0 4px;font-size:14px;color:#aaa;}";
  html += "select,input[type=number]{width:100%;padding:10px;border:1px solid #333;border-radius:6px;background:#0f3460;color:#fff;font-size:16px;}";
  html += "button{width:100%;padding:12px;margin-top:16px;border:none;border-radius:6px;background:#e94560;color:#fff;font-size:16px;cursor:pointer;}";
  html += "button:active{background:#c23152;}";
  html += "button:disabled{opacity:.55;cursor:not-allowed;}";
  html += ".radio-row{display:flex;flex-direction:column;gap:8px;margin:8px 0 4px;}";
  html += ".radio-row label{display:flex;align-items:flex-start;gap:8px;font-size:15px;color:#ddd;cursor:pointer;margin:0;}";
  html += ".radio-row input{margin-top:3px;}";
  html += "#revertWrap{margin-top:4px;}";
  html += "#srvHint{font-size:13px;color:#9ab;margin-top:8px;line-height:1.5;display:none;}";
  html += ".timer{text-align:center;color:#e94560;font-size:13px;margin-top:12px;}";
  html += ".info{background:#0f3460;border-radius:8px;padding:12px;margin-top:16px;font-size:13px;color:#aaa;line-height:1.6;}";
  html += ".ok{background:#27ae60;border-radius:8px;padding:12px;margin-top:12px;text-align:center;display:none;line-height:1.5;}";
  html += ".err{background:#c0392b;border-radius:8px;padding:12px;margin-top:12px;text-align:center;display:none;line-height:1.5;}";
  html += "</style></head><body><div class='card'>";
  html += "<div class='header-logo'>";
  html += "<img src='/logo' alt='' onerror=\"this.style.display='none'\">";
  html += "<img src='/logotext' alt='&micro;PhotoFrame' onerror=\"this.style.display='none'\">";
  html += "</div>";

  html += "<label>Show-Quelle:</label>";
  html += "<div class='radio-row'>";
  html += "<label><input type='radio' name='showSrc' id='followSrv' value='1' checked> Vom <b>Server</b> (wie Web-Interface; &Auml;nderung wirkt f&uuml;r alle Displays)</label>";
  html += "<label><input type='radio' name='showSrc' id='followLocal' value='0'> Nur <b>auf diesem Rahmen</b> (nach Ablauf wieder Server-Vorgabe)</label>";
  html += "</div>";
  html += "<div id='revertWrap' style='display:none'><label>Zur&uuml;ck zur Server-Show nach (Minuten):</label><input type='number' id='revertMinIn' min='1' max='1440' value='" + String((unsigned)quickMenuRevertMinutes) + "'></div>";
  html += "<div id='srvHint'></div>";
  html += "<label>Aktive Show:</label><select id='showSel'><option>Lade...</option></select>";
  html += "<label>Modus:</label><select id='modeSel'>";
  html += "<option value='forwardssequence'" + String(currentShowMode == "forwardssequence" ? " selected" : "") + ">Vorw&auml;rts</option>";
  html += "<option value='reversesequence'" + String(currentShowMode == "reversesequence" ? " selected" : "") + ">R&uuml;ckw&auml;rts</option>";
  html += "<option value='random'" + String(currentShowMode == "random" ? " selected" : "") + ">Zufall</option></select>";
  html += "<label>Bildwechsel (Minuten):</label><input type='number' id='timerIn' min='1' max='1440' value='" + String(currentShowTimer) + "'>";
  if (!mpu6050Available) {
    html += "<label>Standard-Ausrichtung (kein Lagesensor):</label><select id='orientSel'>";
    html += "<option value='0'" + String(configDefaultOrientation == 0 ? " selected" : "") + ">Querformat (0&deg;)</option>";
    html += "<option value='1'" + String(configDefaultOrientation == 1 ? " selected" : "") + ">Hochkant (90&deg;)</option>";
    html += "<option value='2'" + String(configDefaultOrientation == 2 ? " selected" : "") + ">Querformat gedreht (180&deg;)</option>";
    html += "<option value='3'" + String(configDefaultOrientation == 3 ? " selected" : "") + ">Hochkant gedreht (270&deg;)</option>";
    html += "</select>";
  }
  html += "<button type='button' id='saveBtn'>&#10004; Speichern</button>";
  html += "<div class='ok' id='ok'><b>Gespeichert.</b><br>Rahmen &uuml;bernimmt die Einstellungen.<br><span style='font-size:12px;opacity:.9'>Formular unten wurde aktualisiert.</span></div>";
  html += "<div class='err' id='err'></div>";

  html += "<div class='timer'>Dieses Men&uuml; schlie&szlig;t in <span id='cd'>" + String(remaining) + "</span>s</div>";
  html += "<div class='info'>";
  html += "<b>Tipp:</b> Roten Knopf <b>lang dr&uuml;cken</b> (5 s) = WiFi-Reset &amp; Neukonfiguration.";
  html += "</div></div>";

  html += "<script>";
  html += "let cd=" + String(remaining) + ";";
  html += "setInterval(()=>{cd--;if(cd<0)cd=0;let el=document.getElementById('cd');if(el)el.textContent=cd;},1000);";
  html += "function syncRevertVisibility(){";
  html += "let loc=document.getElementById('followLocal');let rw=document.getElementById('revertWrap');";
  html += "if(rw)rw.style.display=(loc&&loc.checked)?'block':'none';";
  html += "}";
  html += "function applyState(d){";
  html += "let s=document.getElementById('showSel');if(!s)return;";
  html += "s.innerHTML='';";
  html += "if(d.shows&&d.shows.length){d.shows.forEach(n=>{let o=document.createElement('option');o.value=n;o.textContent=n;if(n==d.active)o.selected=true;s.appendChild(o);});}";
  html += "else{s.innerHTML='<option>Keine Shows</option>';}";
  html += "let fs=document.getElementById('followSrv'),fl=document.getElementById('followLocal');";
  html += "if(fs&&fl){if(d.followServer===false){fl.checked=true;}else{fs.checked=true;}}";
  html += "let rmi=document.getElementById('revertMinIn');if(rmi&&d.revertMin!=null&&d.revertMin!==undefined){rmi.value=String(d.revertMin);}";
  html += "syncRevertVisibility();";
  html += "let hint=document.getElementById('srvHint');";
  html += "if(hint){if(d.overrideActive&&d.serverActive){hint.style.display='block';hint.textContent='Server-Vorgabe: \"'+d.serverActive+'\". Dieser Rahmen spielt lokal noch ca. '+d.revertLeftMin+' Min.';}";
  html += "else{hint.style.display='none';hint.textContent='';}}";
  html += "if(d.mode){let m=document.getElementById('modeSel');if(m)m.value=d.mode;}";
  html += "if(d.timer!=null&&d.timer!==undefined){let t=document.getElementById('timerIn');if(t)t.value=d.timer;}";
  html += "let os=document.getElementById('orientSel');if(os&&d.defOrient!=null&&d.defOrient!==undefined){os.value=String(d.defOrient);}";
  html += "}";
  html += "document.getElementById('followSrv').addEventListener('change',syncRevertVisibility);";
  html += "document.getElementById('followLocal').addEventListener('change',syncRevertVisibility);";
  html += "function loadShows(){return fetch('/quickmenu/shows').then(r=>{if(!r.ok)throw new Error('Shows '+r.status);return r.json();}).then(d=>{applyState(d);return d;});}";
  html += "loadShows().catch(e=>{document.getElementById('err').textContent='Shows laden: '+e.message;document.getElementById('err').style.display='block';});";
  html += "function save(){";
  html += "let okEl=document.getElementById('ok'),errEl=document.getElementById('err'),btn=document.getElementById('saveBtn');";
  html += "okEl.style.display='none';errEl.style.display='none';errEl.textContent='';";
  html += "btn.disabled=true;btn.textContent='Speichern\u2026';";
  html += "let fs=document.getElementById('followSrv');";
  html += "let b={show:document.getElementById('showSel').value,mode:document.getElementById('modeSel').value,timer:parseInt(document.getElementById('timerIn').value,10)||5,followServer:!!(fs&&fs.checked)};";
  html += "if(!b.followServer){let rm=document.getElementById('revertMinIn');b.revertMinutes=parseInt((rm&&rm.value)||'60',10)||60;if(b.revertMinutes<1)b.revertMinutes=1;if(b.revertMinutes>1440)b.revertMinutes=1440;}";
  html += "let os=document.getElementById('orientSel');if(os)b.defOrient=parseInt(os.value,10)||0;";
  html += "fetch('/quickmenu/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)})";
  html += ".then(r=>r.json().then(j=>({ok:r.ok,status:r.status,body:j})))";
  html += ".then(({ok,status,body})=>{";
  html += "btn.disabled=false;btn.textContent='\u2714 Speichern';";
  html += "if(!ok||!body.ok){errEl.textContent=(body&&body.msg)||('Speichern fehlgeschlagen (HTTP '+status+')');errEl.style.display='block';return Promise.reject();}";
  html += "if(body.remainingSec!=null){cd=body.remainingSec;document.getElementById('cd').textContent=cd;}";
  html += "okEl.style.display='block';okEl.scrollIntoView({behavior:'smooth',block:'nearest'});";
  html += "return loadShows().catch(()=>{});";
  html += "}).catch(e=>{btn.disabled=false;btn.textContent='\u2714 Speichern';if(!errEl.textContent){errEl.textContent=(e&&e.message)?e.message:'Netzwerkfehler';errEl.style.display='block';}});";
  html += "}";
  html += "document.getElementById('saveBtn').addEventListener('click',save);";
  html += "</script></body></html>";

  server.send(200, "text/html", html);
}

void handleQuickMenuShows() {
  server.sendHeader("Access-Control-Allow-Origin", "*");

  // Immer frisch vom Server versuchen, nur valides JSON cachen
  if (wifiConnected) {
    String resp = makeServerRequest("getShows");
    if (resp.length() > 0) {
      JsonDocument testDoc;
      if (deserializeJson(testDoc, resp) == DeserializationError::Ok && testDoc["ok"].as<bool>()) {
        cachedShowsJson = resp;
      }
    }
  }

  String showsArr = "[]";
  String activeShow = currentShowName;

  if (cachedShowsJson.length() > 0) {
    JsonDocument doc;
    if (deserializeJson(doc, cachedShowsJson) == DeserializationError::Ok) {
      JsonArray shows = doc["output"]["shows"]["shows"];
      if (!shows.isNull() && shows.size() > 0) {
        showsArr = "[";
        for (size_t i = 0; i < shows.size(); i++) {
          if (i > 0) showsArr += ",";
          showsArr += "\"" + String(shows[i].as<const char*>()) + "\"";
        }
        showsArr += "]";
      }
      // Aktive Show direkt aus Server-Antwort ermitteln (falls lokal unbekannt, kein Temp-Override)
      if (activeShow.length() == 0 && !isShowTempOverrideActive()) {
        JsonObject activeShows = doc["output"]["shows"]["activeShows"];
        if (!activeShows.isNull()) {
          JsonVariant sv = activeShows[DEVICE_DISPLAY_ID];
          if (sv.isNull()) {
            sv = activeShows[String(atoi(DEVICE_DISPLAY_ID))];
          }
          if (!sv.isNull() && sv.is<String>()) {
            activeShow = sv.as<String>();
            currentShowName = activeShow;
            preferences.begin("microPhotoFrame", false);
            preferences.putString("lastShow", currentShowName);
            preferences.end();
            Serial1.print("Quick-Menu: aktive Show aus Server-Antwort: ");
            Serial1.println(activeShow);
          }
        }
      }
    }
  }

  bool ov = isShowTempOverrideActive();
  unsigned long leftMin = 0;
  if (ov && showTempOverrideUntilMs > millis())
    leftMin = (showTempOverrideUntilMs - millis()) / 60000UL;

  String json = "{\"shows\":" + showsArr;
  json += ",\"active\":\"" + activeShow + "\"";
  json += ",\"defOrient\":" + String((int)configDefaultOrientation);
  json += ",\"hasMpu\":" + String(mpu6050Available ? "true" : "false");
  json += ",\"mode\":\"" + currentShowMode + "\"";
  json += ",\"timer\":" + String(currentShowTimer);
  json += ",\"followServer\":" + String(ov ? "false" : "true");
  json += ",\"overrideActive\":" + String(ov ? "true" : "false");
  {
    String srvAct = serverActiveShowCached.length() > 0 ? serverActiveShowCached : activeShow;
    json += ",\"serverActive\":\"" + srvAct + "\"";
  }
  json += ",\"revertMin\":" + String((unsigned)quickMenuRevertMinutes);
  json += ",\"revertLeftMin\":" + String(leftMin) + "}";
  server.send(200, "application/json", json);
}

void handleQuickMenuSave() {
  String body = server.arg("plain");
  JsonDocument doc;
  if (deserializeJson(doc, body) != DeserializationError::Ok) {
    server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Ung\\u00fcltige Anfrage\"}");
    return;
  }

  String newShow = doc["show"] | "";
  String newMode = doc["mode"] | "forwardssequence";
  int newTimer = doc["timer"] | 5;
  if (newTimer < 1) newTimer = 1;
  if (newTimer > 1440) newTimer = 1440;

  bool followSrv = true;
  if (doc["followServer"].is<bool>())
    followSrv = doc["followServer"].as<bool>();

  int revMin = (int)quickMenuRevertMinutes;
  if (doc["revertMinutes"].is<int>())
    revMin = doc["revertMinutes"].as<int>();
  if (revMin < 1) revMin = 1;
  if (revMin > 1440) revMin = 1440;
  quickMenuRevertMinutes = (uint16_t)revMin;
  preferences.begin("microPhotoFrame", false);
  preferences.putUShort("qRevMin", quickMenuRevertMinutes);
  preferences.end();

  bool showChanged = (newShow.length() > 0 && newShow != currentShowName);

  currentShowMode = newMode;
  currentShowTimer = newTimer;

  if (!mpu6050Available && doc["defOrient"].is<int>()) {
    int o = doc["defOrient"].as<int>();
    if (o >= 0 && o <= 3) {
      configDefaultOrientation = (uint8_t)o;
      preferences.begin("microPhotoFrame", false);
      preferences.putUChar("defOrient", configDefaultOrientation);
      preferences.end();
      currentOrientation = (int)configDefaultOrientation;
      filterImagesByOrientation();
      if (currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    }
  }

  if (followSrv) {
    showTempOverrideUntilMs = 0;
    if (showChanged && wifiConnected) {
      String payload = "{\"action\":\"setActiveShow\",\"input\":{\"showName\":\"" + newShow + "\",\"displayId\":\"" + String(DEVICE_DISPLAY_ID) + "\"}}";
      makeServerRequest("setActiveShow", payload);
      currentShowName = newShow;
      getActiveShow();
      loadShowData();
      if (currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    } else if (wifiConnected) {
      getActiveShow();
      if (loadShowData() && currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    }
  } else {
    if (newShow.length() == 0) {
      server.send(400, "application/json", "{\"ok\":false,\"msg\":\"Show w\\u00e4hlen (tempor\\u00e4r)\"}");
      return;
    }
    showTempOverrideUntilMs = millis() + (unsigned long)revMin * 60000UL;
    currentShowName = newShow;
    preferences.begin("microPhotoFrame", false);
    preferences.putString("lastShow", currentShowName);
    preferences.end();
    if (loadShowData() && currentShowImages.size() > 0) {
      currentImageIndex = -1;
      displayNextImage();
    }
  }

  // Quick-Menü-Zeitfenster neu starten, damit Countdown nicht bei 0 stehen bleibt
  if (quickMenuMode)
    quickMenuStart = millis();
  unsigned long remSec = QUICK_MENU_TIMEOUT / 1000;

  String respJson = "{\"ok\":true,\"remainingSec\":" + String(remSec) + "}";
  server.send(200, "application/json", respJson);

  // Short feedback beep
  tone(BUZZER_PIN, 1500, 80);
}

void enterQuickMenu() {
  quickMenuMode = true;
  quickMenuStart = millis();
  cachedShowsJson = "";

  // Feedback beep
  tone(BUZZER_PIN, 1000, 100);
  delay(120);
  tone(BUZZER_PIN, 1500, 100);

  Serial1.println("Quick-Menu mode active for 60 seconds");

  display.init(115200);
  display.setRotation(currentOrientation);
  display.setFullWindow();
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);

  String ipStr = WiFi.localIP().toString();
  int m = 20;
  int y = 14;
  if (sdCardMounted)
    y = drawWebBrandingOnEpd(8);
  if (y > 160) y = 160;

  display.setCursor(m, y);       display.setTextSize(2);
  display.print("Quick Menu");   display.setTextSize(1);
  y += 40;
  display.setCursor(m, y);
  display.print("Im selben WLAN im Browser oeffnen:");
  y += 35;
  display.setCursor(m, y);       display.setTextSize(2);
  display.print("http://");      display.setTextSize(1);
  y += 28;
  display.setCursor(m, y);       display.setTextSize(3);
  display.print(ipStr);          display.setTextSize(1);
  y += 45;
  display.setCursor(m, y);
  display.print("Shows auswaehlen & Bildwechsel einstellen.");
  y += 22;
  display.setCursor(m, y);
  display.print("Menue schliesst nach 60 Sekunden automatisch.");
  y += 35;
  display.setCursor(m, y);
  display.print("Tipp: Roten Knopf LANG druecken (5s)");
  y += 18;
  display.setCursor(m, y);
  display.print("= WLAN-Reset & Neukonfiguration");

  display.display(false);
}

void exitQuickMenu() {
  if (!quickMenuMode) return;
  quickMenuMode = false;
  Serial1.println("Quick-Menu mode ended");
  tone(BUZZER_PIN, 800, 150);

  // Redisplay current image
  if (currentShowImages.size() > 0) {
    displayNextImage();
  }
}

static void registerWebServerRoutes() {
  server.on("/", handleRoot);
  server.on("/logo", handleLogo);
  server.on("/logotext", handleLogoText);
  server.on("/favicon.ico", HTTP_GET, handleFavicon);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/ota", HTTP_POST, handleOtaResult, handleOtaUpdate);
  server.on("/ota", HTTP_OPTIONS, handleOtaCors);
  server.on("/info", HTTP_GET, handleDeviceInfo);
  server.on("/quickmenu", HTTP_GET, handleQuickMenu);
  server.on("/quickmenu/shows", HTTP_GET, handleQuickMenuShows);
  server.on("/quickmenu/save", HTTP_POST, handleQuickMenuSave);
  server.on("/generate_204", handleRoot);
  server.on("/gen_204", handleRoot);
  server.on("/hotspot-detect.html", handleRoot);
  server.on("/canonical.html", handleRoot);
  server.on("/success.txt", handleRoot);
  server.on("/ncsi.txt", handleRoot);
  server.on("/connecttest.txt", handleRoot);
  server.on("/redirect", handleRoot);
  server.onNotFound(handleNotFound);
}

// === Setup Function ===
void setup() {
  Serial1.begin(115200, SERIAL_8N1, SERIAL_RX, SERIAL_TX);
  while (!Serial1)
    delay(10);
  delay(2000);
  Serial1.println("--- microPhotoFrame Firmware ---");

  // Tasten: interne Pull-ups — verhindert „schwebendes LOW“ auf GPIO3 (sonst fälschlich
  // 5s „gedrückt“ → NVS wird jedes Mal gelöscht → nur noch Config-Modus).
  pinMode(BTN_ACTION, INPUT_PULLUP);
  pinMode(BTN_NEXT, INPUT_PULLUP);
  pinMode(BTN_PREV, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);

  delay(100);
  bool resetRequested = false;
  if (digitalRead(BTN_ACTION) == LOW) {
    // Nur wenn Taste beim Einschalten wirklich gedrückt: bis 5s warten
    unsigned long t0 = millis();
    while (digitalRead(BTN_ACTION) == LOW && millis() - t0 < 5000) {
      delay(100);
    }
    if (digitalRead(BTN_ACTION) == LOW) {
      resetRequested = true;
      preferences.begin("microPhotoFrame", false);
      preferences.clear();
      preferences.end();
      Serial1.println("Config cleared: red button held 5s at boot");
      tone(BUZZER_PIN, 800, 300);
      delay(350);
      tone(BUZZER_PIN, 600, 500);
    }
  }
  
  // Initialize shared SPI bus
  hspi.begin(EPD_SCK_PIN, SD_MISO_PIN, EPD_MOSI_PIN, -1);
  
  // Initialize Display
  display.epd2.selectSPI(hspi, SPISettings(4000000, MSBFIRST, SPI_MODE0));
  display.init(115200);
  display.setRotation(DEFAULT_DISPLAY_ROTATION);
  
  // Initialize SD Card
  pinMode(SD_EN_PIN, OUTPUT);
  digitalWrite(SD_EN_PIN, HIGH);
  pinMode(SD_DET_PIN, INPUT_PULLUP);
  delay(100);
  
  sdLazyMountFailed = false;
  if (digitalRead(SD_DET_PIN) == LOW) {
    Serial1.println("SD slot: Karte erkannt, Mount wird versucht…");
    if (SD.begin(SD_CS_PIN, hspi)) {
      Serial1.println("SD-Karte gemountet (optional, für Cache/Logos/Offline).");
      sdCardMounted = true;

      // Show startup image if available
      String startupFiles[] = {
        "/EINK_SPECTRA6_730_sq_800x480_startup_landscape.ink",
        "/EINK_SPECTRA6_730_sq_800x480_startup_landscsape.ink", // typo version
        "/EINK_SPECTRA6_730_sq_800x480_startup_portrait.ink"
      };

      bool startupShown = false;
      for (int i = 0; i < 3 && !startupShown; i++) {
        if (SD.exists(startupFiles[i])) {
          Serial1.print("Found startup image: ");
          Serial1.println(startupFiles[i]);
          String filename = startupFiles[i];
          filename.replace("/", "");
          if (i == 2) {
            display.setRotation(1);
            Serial1.println("Showing startup image (portrait)...");
          } else {
            display.setRotation(DEFAULT_DISPLAY_ROTATION);
            Serial1.println("Showing startup image (landscape)...");
          }
          if (decodeAndDisplayInk(filename)) {
            startupShown = true;
            if (i == 2) {
              display.setRotation(DEFAULT_DISPLAY_ROTATION);
            }
          }
        }
      }

      if (!startupShown) {
        Serial1.println("Kein Startup-.ink auf SD — weiter ohne Begrüßungsbild.");
        display.fillScreen(GxEPD_WHITE);
        display.hibernate();
      }
    } else {
      Serial1.println("SD-Mount fehlgeschlagen — Betrieb ohne SD (nur Serial, kein Fehlerbildschirm).");
      sdLazyMountFailed = true;
      sdCardMounted = false;
      display.fillScreen(GxEPD_WHITE);
      display.hibernate();
    }
  } else {
    Serial1.println("Keine SD-Karte (optional) — voller Betrieb über WLAN/Server.");
    sdCardMounted = false;
    display.fillScreen(GxEPD_WHITE);
    display.hibernate();
  }
  
  // Konfiguration vor MPU: Standard-Ausrichtung (defOrient) kommt aus NVS
  loadConfig();

  // Initialize MPU6050 for orientation detection
  initMPU6050();
  // Read initial orientation (Sensor oder configDefaultOrientation)
  currentOrientation = readOrientation();
  Serial1.print("Initial orientation: ");
  const char* orientationNames[] = {"Landscape (0°)", "Portrait (90°)", "Landscape inverted (180°)", "Portrait inverted (270°)"};
  if (currentOrientation >= 0 && currentOrientation < 4) {
    Serial1.println(orientationNames[currentOrientation]);
  } else {
    Serial1.println(currentOrientation);
  }

  dnsServerActive = false;
  Serial1.printf("Config: SSID len=%u, URL len=%u, defOrient=%u, mpu=%d, factoryReset=%d\n",
                 (unsigned)wifiSSID.length(), (unsigned)hostChannelUrl.length(),
                 (unsigned)configDefaultOrientation, mpu6050Available ? 1 : 0, resetRequested ? 1 : 0);

  bool needConfig =
      resetRequested || wifiSSID.length() == 0 || hostChannelUrl.length() == 0;

  if (needConfig) {
    Serial1.println("Starting CONFIG mode (Soft-AP + Captive Portal)...");
    WiFi.mode(WIFI_AP_STA);
    if (!WiFi.softAP("microPhotoFrame")) {
      Serial1.println("Failed to start AP!");
    }
    delay(500);
    IPAddress AP_IP = WiFi.softAPIP();
    Serial1.print("AP: microPhotoFrame  IP: ");
    Serial1.println(AP_IP);
    dnsServer.start(53, "*", AP_IP);
    dnsServerActive = true;
    registerWebServerRoutes();
    server.begin();
    Serial1.println("HTTP server started (config)");
    startConfigMode();
    return;
  }

  // Normalbetrieb: kein offenes Gast-WLAN, nur Heim-WLAN
  Serial1.println("Starting STA mode (slideshow)...");
  WiFi.mode(WIFI_STA);
  registerWebServerRoutes();
  server.begin();
  Serial1.println("HTTP server on STA (OTA /info /quickmenu when connected)");

  if (connectWiFi()) {
    wifiConnected = true;
    
    showStatusScreen("Connected to WiFi", "Loading show...");
    
    // Get active show (mit Retry falls Server beim ersten Versuch noch nicht antwortet)
    bool showFound = false;
    for (int attempt = 0; attempt < 3 && !showFound; attempt++) {
      if (attempt > 0) {
        Serial1.printf("getActiveShow Retry %d/2 nach 2s...\n", attempt);
        delay(2000);
      }
      showFound = getActiveShow();
    }

    if (showFound) {
      bool dataLoaded = loadShowData();
      if (!dataLoaded) {
        Serial1.println("loadShowData failed, Retry nach 2s...");
        delay(2000);
        dataLoaded = loadShowData();
      }
      if (dataLoaded) {
        if (currentShowImages.size() > 0) {
          Serial1.println("Displaying first image...");
          currentImageIndex = -1;
          displayNextImage();
        } else {
          Serial1.println("Show has no images");
          if (!tryBootOfflineLastImage()) {
            showStatusScreen("Show has no images", currentShowName.c_str());
          }
        }
      } else {
        Serial1.println("Failed to load show data");
        if (!tryBootOfflineLastImage()) {
          showStatusScreen("Failed to load show", currentShowName.c_str());
        }
      }
    } else {
      Serial1.println("No active show found (nach 3 Versuchen)");
      // Fallback: NVS-Show-Name bekannt → versuche Show trotzdem zu laden
      if (currentShowName.length() > 0) {
        Serial1.print("Versuche gespeicherte Show aus NVS: ");
        Serial1.println(currentShowName);
        bool dataLoaded = loadShowData();
        if (!dataLoaded) {
          delay(2000);
          dataLoaded = loadShowData();
        }
        if (dataLoaded && currentShowImages.size() > 0) {
          Serial1.println("Gespeicherte Show geladen!");
          currentImageIndex = -1;
          displayNextImage();
        } else if (!tryBootOfflineLastImage()) {
          showStatusScreen("No active show", lastGetShowError.c_str(), hostChannelUrl.c_str());
        }
      } else if (!tryBootOfflineLastImage()) {
        showStatusScreen("No active show", lastGetShowError.c_str(), hostChannelUrl.c_str());
      }
    }
  } else {
    Serial1.println("WiFi connect failed — opening config AP for setup");
    WiFi.mode(WIFI_AP_STA);
    if (WiFi.softAP("microPhotoFrame")) {
      delay(400);
      IPAddress apip = WiFi.softAPIP();
      dnsServer.start(53, "*", apip);
      dnsServerActive = true;
      Serial1.print("Fallback AP IP: ");
      Serial1.println(apip);
    }
    configMode = true;
    configModeStartTime = millis();
    String ssidInfo = "SSID: " + (wifiSSID.length() > 0 ? wifiSSID : String("not set"));
    String apInfo = "AP: microPhotoFrame  IP: " + WiFi.softAPIP().toString();
    showStatusScreen("WiFi Connection Failed", ssidInfo.c_str(), apInfo.c_str());
  }
}

// === Loop Function ===
void loop() {
  if (dnsServerActive) {
    dnsServer.processNextRequest();
  }
  server.handleClient();

  // --- Config mode (WiFi setup) ---
  if (configMode) {
    if (millis() - configModeStartTime > CONFIG_MODE_TIMEOUT) {
      Serial1.println("Config mode timeout, restarting...");
      ESP.restart();
    }
    return;
  }

  // --- Quick-Menu timeout ---
  if (quickMenuMode) {
    if (millis() - quickMenuStart > QUICK_MENU_TIMEOUT) {
      exitQuickMenu();
    }
    // While in quick menu, still respond to buttons to exit early
    if (digitalRead(BTN_ACTION) == LOW) {
      delay(200);
      if (digitalRead(BTN_ACTION) == LOW) {
        exitQuickMenu();
        delay(300);
      }
    }
    delay(50);
    return;
  }

  // --- Red button: short press = Quick Menu, long press handled at boot ---
  if (digitalRead(BTN_ACTION) == LOW) {
    delay(200); // debounce
    if (digitalRead(BTN_ACTION) == LOW) {
      // Measure how long held
      unsigned long pressStart = millis();
      while (digitalRead(BTN_ACTION) == LOW && millis() - pressStart < 5000) {
        delay(50);
      }
      if (millis() - pressStart >= 5000) {
        // Long press during runtime → reset & reboot
        Serial1.println("Long press detected → resetting config...");
        preferences.begin("microPhotoFrame", false);
        preferences.clear();
        preferences.end();
        tone(BUZZER_PIN, 600, 500);
        delay(600);
        ESP.restart();
      } else {
        // Short press → Quick Menu
        if (wifiConnected) {
          enterQuickMenu();
        } else {
          tone(BUZZER_PIN, 300, 200); // error beep: no WiFi
        }
      }
    }
  }

  // --- Previous image (left button) ---
  if (digitalRead(BTN_PREV) == LOW) {
    delay(200);
    if (digitalRead(BTN_PREV) == LOW) {
      Serial1.println("Previous image");
      if (currentShowMode == "forwardssequence") {
        currentImageIndex -= 2;
        if (currentImageIndex < -1) currentImageIndex = (int)currentShowImages.size() - 2;
      } else if (currentShowMode == "reversesequence") {
        currentImageIndex += 2;
        if (currentImageIndex >= (int)currentShowImages.size()) currentImageIndex = 1;
      }
      displayNextImage();
    }
  }

  // --- Next image (right button) ---
  if (digitalRead(BTN_NEXT) == LOW) {
    delay(200);
    if (digitalRead(BTN_NEXT) == LOW) {
      Serial1.println("Next image");
      displayNextImage();
    }
  }

  // --- Orientation sensor (nur mit MPU6050) ---
  if (mpu6050Available && millis() - lastOrientationCheck > ORIENTATION_CHECK_INTERVAL) {
    lastOrientationCheck = millis();
    int newOrientation = readOrientation();
    if (newOrientation != currentOrientation) {
      const char* orientationNames[] = {"landscape (0)", "portrait (90)", "landscape inv (180)", "portrait inv (270)"};
      Serial1.printf("Orientation: %s -> %s\n",
        (currentOrientation >= 0 && currentOrientation < 4) ? orientationNames[currentOrientation] : "?",
        (newOrientation >= 0 && newOrientation < 4) ? orientationNames[newOrientation] : "?");
      currentOrientation = newOrientation;
      filterImagesByOrientation();
      if (currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    }
  }

  // --- WiFi-Reconnect wenn Verbindung verloren ---
  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    Serial1.println("WiFi verloren, Reconnect...");
    WiFi.disconnect(false);
    delay(500);
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000) {
      delay(500);
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial1.print("WiFi reconnected! IP: ");
      Serial1.println(WiFi.localIP());
    } else {
      Serial1.println("WiFi Reconnect fehlgeschlagen");
    }
  }

  // --- Temporäre Quick-Menü-Show: Frist abgelaufen -> wieder Server-Vorgabe ---
  if (showTempOverrideUntilMs != 0 && millis() >= showTempOverrideUntilMs) {
    showTempOverrideUntilMs = 0;
    Serial1.println("Temporäre Show abgelaufen -> Server-Vorgabe laden");
    lastServerCheck = millis();
    if (wifiConnected && WiFi.status() == WL_CONNECTED) {
      bool showUpdate = getActiveShow();
      if (showUpdate || currentShowImages.size() == 0) {
        if (loadShowData()) {
          if (currentShowImages.size() > 0) {
            currentImageIndex = -1;
            displayNextImage();
          }
        } else {
          tryRedisplayLastWithOfflineBadge();
        }
      }
      if (offlineBadgeOnScreen && lastGetShowsSucceeded)
        redisplayLastWithoutOfflineBadge();
    }
  }

  // --- Periodic server check for active show ---
  if (wifiConnected && WiFi.status() == WL_CONNECTED && millis() - lastServerCheck > SERVER_CHECK_INTERVAL) {
    lastServerCheck = millis();
    Serial1.println("Checking for active show update...");
    bool showUpdate = getActiveShow();
    if (lastGetShowsSucceeded) {
      if (showUpdate) {
        Serial1.println("Active show changed, reloading...");
        if (loadShowData()) {
          if (currentShowImages.size() > 0) {
            currentImageIndex = -1;
            displayNextImage();
          }
        } else {
          Serial1.println("loadShowData failed — Hinweis-Badge, letztes Bild");
          tryRedisplayLastWithOfflineBadge();
        }
      } else if (offlineBadgeOnScreen) {
        redisplayLastWithoutOfflineBadge();
      }
    } else {
      Serial1.println("getShows fehlgeschlagen — letztes Bild mit Offline-Hinweis (einmal)");
      tryRedisplayLastWithOfflineBadge();
    }
  }

  // --- Auto image change ---
  if (currentShowImages.size() > 0 && millis() - lastImageChangeTime > (currentShowTimer * 60000UL)) {
    displayNextImage();
  }

  delay(100);
}