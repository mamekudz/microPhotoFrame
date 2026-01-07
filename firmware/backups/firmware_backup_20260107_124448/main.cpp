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

// Buttons (reTerminal E1002)
#define BTN_UP 0
#define BTN_DOWN 1
#define BTN_LEFT 2
#define BTN_RIGHT 3
#define BTN_CENTER 4

// Serial Port
#define SERIAL_RX 44
#define SERIAL_TX 43

// MPU6050 I2C Pins (reTerminal pin header)
// MPU6050 Breakout Board Connections:
//   VCC -> Pin 1 (first contact at top near buttons)
//   GND -> Pin 2
//   SCL -> Pin 3
//   SDA -> Pin 4
//   XDA, XCL, AD0, INT -> internally capped
#define MPU6050_SDA_PIN 4  // Pin 4 on reTerminal header
#define MPU6050_SCL_PIN 3  // Pin 3 on reTerminal header

// === ePaper Driver Selection ===
// 0: reTerminal E1001 (7.5'' B&W)
// 1: reTerminal E1002 (7.3'' Color)
#define EPD_SELECT 1

// Display ID for this device (Spectra 6 7.3" reTerminal E1002 = "I")
#define DEVICE_DISPLAY_ID "I"

// Default display rotation (0=landscape, 1=portrait, 2=landscape inverted, 3=portrait inverted)
// Set to 1 if frame is mounted in portrait orientation
#define DEFAULT_DISPLAY_ROTATION 1

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

// === SD Card Status ===
bool sdCardMounted = false;

// === MPU6050 Orientation Sensor ===
bool mpu6050Available = false;
int currentOrientation = 0; // 0=landscape, 1=portrait, 2=landscape_180, 3=portrait_180
unsigned long lastOrientationCheck = 0;
const unsigned long ORIENTATION_CHECK_INTERVAL = 1000; // Check every second
const float ORIENTATION_THRESHOLD = 0.5; // Threshold for orientation change (g-force)
std::vector<String> allShowImages; // Store all images before filtering

// MPU6050 Helper Functions
int16_t readMPU6050Register(uint8_t reg) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, 2, true);
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
  preferences.end();
  
  Serial1.print("Loaded config - SSID: ");
  Serial1.print(wifiSSID);
  Serial1.print(", URL: ");
  Serial1.println(hostChannelUrl);
}

void saveConfig() {
  preferences.begin("microPhotoFrame", false);
  preferences.putString("wifiSSID", wifiSSID);
  preferences.putString("wifiPassword", wifiPassword);
  preferences.putString("hostChannelUrl", hostChannelUrl);
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
  Serial1.println("Config cleared");
}

// === Configuration Web Server ===
void handleScan() {
  Serial1.println("Scanning WiFi networks...");
  int n = WiFi.scanNetworks();
  
  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"encryption\":" + String((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "false" : "true") + "}";
  }
  json += "]";
  
  server.send(200, "application/json", json);
  Serial1.print("Found ");
  Serial1.print(n);
  Serial1.println(" networks");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>microPhotoFrame Konfiguration</title>";
  html += "<style>body{font-family:Arial;max-width:600px;margin:50px auto;padding:20px;text-align:center;}";
  html += "input,button,select{width:100%;padding:10px;margin:10px 0;box-sizing:border-box;}";
  html += "button{background:#4CAF50;color:white;border:none;cursor:pointer;}";
  html += "#scanBtn{background:#2196F3;margin-bottom:10px;}";
  html += ".network-list{max-height:200px;overflow-y:auto;border:1px solid #ddd;padding:5px;}";
  html += "img.logo{max-width:100%;height:auto;margin-bottom:20px;}";
  html += ".password-wrapper{position:relative;width:100%;}";
  html += ".password-wrapper input{width:100%;padding-right:45px;}";
  html += ".password-toggle{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:20px;padding:5px;width:auto;color:#666;}";
  html += ".password-toggle:hover{color:#333;}</style></head><body>";
  html += "<img src='/logo' alt='microPhotoFrame Logo' class='logo' onerror='this.style.display=\"none\"'>";
  html += "<h1>microPhotoFrame Konfiguration</h1>";
  html += "<button id='scanBtn' onclick='scanNetworks()'>WLANs scannen</button>";
  html += "<form method='POST' action='/save'>";
  html += "<label>WiFi SSID:</label>";
  html += "<select name='ssid' id='ssid' required>";
  html += "<option value='" + wifiSSID + "'>" + (wifiSSID.length() > 0 ? wifiSSID : "Bitte wählen...") + "</option>";
  html += "</select>";
  html += "<input type='text' name='ssid_manual' id='ssid_manual' placeholder='oder manuell eingeben' style='margin-top:5px;'>";
  html += "<label>WiFi Passwort:</label>";
  html += "<div class='password-wrapper'>";
  html += "<input type='password' name='password' id='password' value='" + wifiPassword + "'>";
  html += "<button type='button' class='password-toggle' onclick='togglePassword()' title='Passwort anzeigen/verbergen'>👁️</button>";
  html += "</div>";
  html += "<label>Host-Channel-URL:</label><input type='text' name='url' value='" + hostChannelUrl + "' placeholder='http://server.com:888' required><br>";
  html += "<small style='color:#666;'>Basis-URL ohne Pfad (z.B. http://192.168.0.107:888). Die Rewrite-Logik leitet automatisch weiter.</small><br>";
  html += "<button type='submit'>Speichern</button>";
  html += "</form>";
  html += "<script>";
  html += "function scanNetworks(){";
  html += "document.getElementById('scanBtn').disabled=true;";
  html += "document.getElementById('scanBtn').textContent='Scanne...';";
  html += "fetch('/scan').then(r=>r.json()).then(networks=>{";
  html += "var select=document.getElementById('ssid');";
  html += "select.innerHTML='<option value=\"\">Bitte wählen...</option>';";
  html += "networks.forEach(n=>{";
  html += "var opt=document.createElement('option');";
  html += "opt.value=n.ssid;";
  html += "opt.textContent=n.ssid+(n.encryption?' (🔒)':' (offen)')+' ('+n.rssi+' dBm)';";
  html += "select.appendChild(opt);";
  html += "});";
  html += "document.getElementById('scanBtn').disabled=false;";
  html += "document.getElementById('scanBtn').textContent='WLANs scannen';";
  html += "}).catch(e=>{alert('Fehler: '+e);document.getElementById('scanBtn').disabled=false;document.getElementById('scanBtn').textContent='WLANs scannen';});";
  html += "}";
  html += "document.getElementById('ssid').addEventListener('change',function(e){";
  html += "if(e.target.value){document.getElementById('ssid_manual').value='';}";
  html += "});";
  html += "document.getElementById('ssid_manual').addEventListener('input',function(e){";
  html += "if(e.target.value){document.getElementById('ssid').value='';}";
  html += "});";
  html += "document.querySelector('form').addEventListener('submit',function(e){";
  html += "var manual=document.getElementById('ssid_manual').value;";
  html += "if(manual){";
  html += "var hidden=document.createElement('input');";
  html += "hidden.type='hidden';hidden.name='ssid';hidden.value=manual;";
  html += "this.appendChild(hidden);";
  html += "}";
  html += "});";
  html += "function togglePassword(){";
  html += "var pwd=document.getElementById('password');";
  html += "var btn=event.target;";
  html += "if(pwd.type==='password'){";
  html += "pwd.type='text';";
  html += "btn.textContent='🙈';";
  html += "btn.title='Passwort verbergen';";
  html += "}else{";
  html += "pwd.type='password';";
  html += "btn.textContent='👁️';";
  html += "btn.title='Passwort anzeigen';";
  html += "}";
  html += "}";
  html += "</script></body></html>";
  server.send(200, "text/html", html);
}

void handleSave() {
  if (server.hasArg("ssid") && server.hasArg("url")) {
    wifiSSID = server.arg("ssid");
    wifiPassword = server.hasArg("password") ? server.arg("password") : "";
    hostChannelUrl = server.arg("url");
    saveConfig();
    
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Gespeichert</title></head><body>";
    html += "<h1>Konfiguration gespeichert!</h1>";
    html += "<p>Das Gerät startet neu und verbindet sich mit dem WiFi...</p>";
    html += "</body></html>";
    server.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/plain", "Fehlende Parameter");
  }
}

void handleLogo() {
  // Serve logo image from SD card (if available)
  String logoPath = "/EINK_SPECTRA6_730_sq_800x480_logo.png";
  
  Serial1.println("=== Logo request ===");
  
  // Check if SD card is available and mounted
  if (!sdCardMounted) {
    Serial1.println("SD card not mounted - attempting to mount...");
    if (digitalRead(SD_DET_PIN) == LOW) {
      if (SD.begin(SD_CS_PIN, hspi)) {
        sdCardMounted = true;
        Serial1.println("SD card mounted successfully");
      } else {
        Serial1.println("SD card mount failed");
        server.send(404, "text/plain", "SD card not available");
        return;
      }
    } else {
      Serial1.println("No SD card detected (pin HIGH)");
      server.send(404, "text/plain", "SD card not available");
      return;
    }
  }
  
  Serial1.print("Checking for logo file: ");
  Serial1.println(logoPath);
  
  if (!SD.exists(logoPath)) {
    Serial1.println("Logo file not found on SD card");
    // List files in root for debugging
    File root = SD.open("/");
    if (root) {
      Serial1.println("Files in root directory:");
      File file = root.openNextFile();
      int count = 0;
      while (file && count < 10) {
        Serial1.print("  ");
        Serial1.println(file.name());
        file = root.openNextFile();
        count++;
      }
      root.close();
    }
    server.send(404, "text/plain", "Logo not found");
    return;
  }
  
  File logoFile = SD.open(logoPath, FILE_READ);
  if (!logoFile) {
    Serial1.println("Failed to open logo file");
    server.send(500, "text/plain", "Failed to open logo");
    return;
  }
  
  // Get file size
  size_t fileSize = logoFile.size();
  Serial1.print("Logo file size: ");
  Serial1.println(fileSize);
  
  if (fileSize == 0) {
    Serial1.println("Logo file is empty");
    logoFile.close();
    server.send(500, "text/plain", "Logo file is empty");
    return;
  }
  
  // Set content type and headers
  server.sendHeader("Content-Type", "image/png");
  server.sendHeader("Content-Length", String(fileSize));
  server.sendHeader("Cache-Control", "public, max-age=3600");
  server.send(200);
  
  // Send file in chunks
  uint8_t buffer[512];
  size_t bytesRead;
  WiFiClient client = server.client();
  size_t totalSent = 0;
  
  while (fileSize > 0) {
    bytesRead = logoFile.read(buffer, min((size_t)512, fileSize));
    if (bytesRead == 0) {
      Serial1.println("Unexpected end of file");
      break;
    }
    size_t written = client.write(buffer, bytesRead);
    if (written == 0) {
      Serial1.println("Failed to write to client");
      break;
    }
    totalSent += written;
    fileSize -= bytesRead;
  }
  
  logoFile.close();
  Serial1.print("Logo served successfully. Sent ");
  Serial1.print(totalSent);
  Serial1.println(" bytes");
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
  display.print("WiFi: erPhotoFrame");
  display.setCursor(10, 90);
  display.print("(Open - no password)");
  IPAddress IP = WiFi.softAPIP();
  display.setCursor(10, 120);
  display.print("IP: ");
  display.print(IP.toString());
  display.display(false);
}

// === WiFi Connection ===
bool connectWiFi() {
  if (wifiSSID.length() == 0) {
    Serial1.println("No WiFi SSID configured");
    return false;
  }
  
  Serial1.print("Connecting to WiFi: ");
  Serial1.print(wifiSSID);
  if (wifiPassword.length() > 0) {
    Serial1.println(" (with password)");
  } else {
    Serial1.println(" (open network)");
  }
  
  // Disconnect any existing connection
  WiFi.disconnect();
  delay(100);
  
  // WiFi.mode is already set to WIFI_AP_STA by startConfigAP()
  // Just begin the connection
  if (wifiPassword.length() > 0) {
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  } else {
    WiFi.begin(wifiSSID.c_str());
  }
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) { // Increased timeout
    delay(500);
    Serial1.print(".");
    attempts++;
    
    // Check WiFi status and print error if available
    if (attempts % 10 == 0) {
      wl_status_t status = WiFi.status();
      Serial1.print(" [Status: ");
      Serial1.print(status);
      Serial1.print("]");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial1.println();
    Serial1.print("WiFi connected! IP: ");
    Serial1.println(WiFi.localIP());
    
    // Configure time
    configTime(0, 0, "pool.ntp.org");
    
    return true;
  } else {
    Serial1.println();
    wl_status_t status = WiFi.status();
    Serial1.print("WiFi connection failed! Status: ");
    Serial1.print(status);
    Serial1.print(" (");
    switch(status) {
      case WL_IDLE_STATUS: Serial1.print("IDLE"); break;
      case WL_NO_SSID_AVAIL: Serial1.print("NO_SSID_AVAIL"); break;
      case WL_SCAN_COMPLETED: Serial1.print("SCAN_COMPLETED"); break;
      case WL_CONNECTED: Serial1.print("CONNECTED"); break;
      case WL_CONNECT_FAILED: Serial1.print("CONNECT_FAILED"); break;
      case WL_CONNECTION_LOST: Serial1.print("CONNECTION_LOST"); break;
      case WL_DISCONNECTED: Serial1.print("DISCONNECTED"); break;
      default: Serial1.print("UNKNOWN"); break;
    }
    Serial1.println(")");
    Serial1.print("SSID: ");
    Serial1.println(wifiSSID);
    Serial1.print("Password length: ");
    Serial1.println(wifiPassword.length());
    Serial1.print("RSSI: ");
    Serial1.println(WiFi.RSSI());
    
    // Additional troubleshooting info
    if (status == WL_CONNECT_FAILED) {
      Serial1.println("Possible causes:");
      Serial1.println("- Wrong password");
      Serial1.println("- WLAN not in range");
      Serial1.println("- WLAN uses 5 GHz only (ESP32 supports 2.4 GHz only)");
      Serial1.println("- WLAN security not supported (try WPA2)");
    }
    
    return false;
  }
}

// === Forward Declarations ===
bool downloadImage(String imageName);
bool decodeAndDisplayInk(String filename);
bool decodeAndDisplayInkFromHTTP(String imageUrl);
bool isSDCardAvailable();

// === Server Communication ===
String makeServerRequest(String action, String jsonPayload = "{}") {
  if (hostChannelUrl.length() == 0) {
    Serial1.println("No host channel URL configured");
    return "";
  }
  
  HTTPClient http;
  
  // Use URL exactly as configured (no automatic path addition)
  // Supports different server types: ASPX, PHP, Node.js, etc.
  String url = hostChannelUrl;
  
  // Ensure URL ends with / before adding query
  if (!url.endsWith("/")) {
    url += "/";
  }
  
  // Add action parameter
  url += "?action=" + action;
  
  Serial1.print("Requesting URL: ");
  Serial1.println(url);
  Serial1.print("Payload: ");
  Serial1.println(jsonPayload);
  Serial1.print("WiFi status: ");
  Serial1.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "NOT_CONNECTED");
  if (WiFi.status() == WL_CONNECTED) {
    Serial1.print("Local IP: ");
    Serial1.println(WiFi.localIP());
  }
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  http.setReuse(true); // Reuse connection
  
  // Always use POST (like the web application does)
  // The server expects POST with JSON body, even if it's just "{}"
  int httpCode = http.POST(jsonPayload);
  String response = "";
  
  if (httpCode > 0) {
    response = http.getString();
    Serial1.print("Server response code: ");
    Serial1.println(httpCode);
    if (httpCode == 200) {
      Serial1.print("Response length: ");
      Serial1.println(response.length());
    } else {
      Serial1.print("Error response: ");
      Serial1.println(response);
    }
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
    Serial1.println("Check if server is running and URL is correct");
  }
  
  http.end();
  return response;
}

bool getActiveShow() {
  Serial1.println("Fetching active show...");
  
  String response = makeServerRequest("getShows");
  if (response.length() == 0) {
    Serial1.println("Empty response from server");
    return false;
  }
  
  // Debug: Print first 200 chars of response
  Serial1.print("Response (first 200 chars): ");
  Serial1.println(response.substring(0, 200));
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial1.print("JSON parse error: ");
    Serial1.println(error.c_str());
    return false;
  }
  
  // Check if response has "ok" field
  bool responseOk = doc["ok"].as<bool>();
  Serial1.print("Response ok: ");
  Serial1.println(responseOk ? "true" : "false");
  
  // Get activeShows object
  JsonObject activeShows = doc["output"]["shows"]["activeShows"];
  if (activeShows.isNull()) {
    Serial1.println("activeShows is null or missing");
    return false;
  }
  
  // Debug: Print all activeShows keys
  Serial1.print("Looking for display ID: ");
  Serial1.println(DEVICE_DISPLAY_ID);
  Serial1.print("Available display IDs in activeShows: ");
  for (JsonPair kv : activeShows) {
    Serial1.print(kv.key().c_str());
    Serial1.print("=");
    Serial1.print(kv.value().as<String>());
    Serial1.print(" ");
  }
  Serial1.println();
  
  // Try to get the show name for this display ID
  // Try both string key and numeric key (in case server sends numbers)
  JsonVariant showNameVariant = activeShows[DEVICE_DISPLAY_ID];
  if (showNameVariant.isNull()) {
    // Try numeric key as fallback
    int displayIdNum = atoi(DEVICE_DISPLAY_ID);
    showNameVariant = activeShows[String(displayIdNum)];
  }
  
  if (showNameVariant.isNull() || !showNameVariant.is<String>()) {
    Serial1.print("No active show found for display ID: ");
    Serial1.println(DEVICE_DISPLAY_ID);
    return false;
  }
  
  String newShowName = showNameVariant.as<String>();
  if (newShowName.length() == 0) {
    Serial1.println("Active show name is empty");
    return false;
  }
  
  Serial1.print("Found active show: ");
  Serial1.println(newShowName);
  
  if (newShowName != currentShowName) {
    currentShowName = newShowName;
    currentImageIndex = 0;
    currentShowImages.clear();
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
  
  while (http.connected() && (len > 0 || len == -1)) {
    size_t size = stream->available();
    if (size) {
      int c = stream->readBytes(buff, ((size > sizeof(buff)) ? sizeof(buff) : size));
      file.write(buff, c);
      if (len > 0) {
        len -= c;
      }
    }
    delay(1);
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

// Color palette for Display ID "9" (Spectra 6 7,3" 800x480)
// Colors: Black, White, Red, Yellow, Blue, Green
const uint16_t displayPalette[6] = {
  GxEPD_BLACK,   // 0: #000000
  GxEPD_WHITE,   // 1: #FFFFFF
  GxEPD_RED,     // 2: #FF0000
  GxEPD_YELLOW,  // 3: #FFFF00
  GxEPD_BLUE,    // 4: #0000FF
  GxEPD_GREEN    // 5: #00FF00
};

// Helper function to check if SD card is available
bool isSDCardAvailable() {
  if (digitalRead(SD_DET_PIN) == HIGH) {
    return false;
  }
  return SD.begin(SD_CS_PIN, hspi);
}

bool decodeAndDisplayInk(String filename) {
  // Try to open from SD card
  if (!isSDCardAvailable()) {
    Serial1.println("SD card not available for decodeAndDisplayInk");
    return false;
  }
  
  // Extract orientation from filename (first character: '0', '1', '2', or '3')
  int fileOrientation = 0; // Default to landscape
  if (filename.length() > 0) {
    char firstChar = filename.charAt(0);
    if (firstChar >= '0' && firstChar <= '3') {
      fileOrientation = firstChar - '0';
    }
  }
  
  File inkFile = SD.open("/" + filename, FILE_READ);
  if (!inkFile) {
    Serial1.print("Failed to open .ink file: ");
    Serial1.println(filename);
    return false;
  }
  
  // Get file size
  size_t fileSize = inkFile.size();
  if (fileSize < 4) {
    Serial1.println("File too small");
    inkFile.close();
    return false;
  }
  
  // Read header (Version 1 format): [version, displayId, dither, orient, ...data]
  uint8_t version = inkFile.read();
  uint8_t displayId = inkFile.read();
  uint8_t dither = inkFile.read();
  uint8_t orient = inkFile.read();
  uint8_t minCodeSize = 3; // Fixed for 6 colors (Spectra 6)
  
  Serial1.print("Version: ");
  Serial1.println(version);
  Serial1.print("Display ID: ");
  Serial1.println((char)displayId);
  Serial1.print("Dither: ");
  Serial1.println(dither);
  Serial1.print("Orientation: ");
  Serial1.println(orient == 0 ? "Landscape" : "Portrait");
  Serial1.print("MinCodeSize: ");
  Serial1.println(minCodeSize);
  
  // Check if display ID matches
  if (displayId != DEVICE_DISPLAY_ID[0]) {
    Serial1.println("Display ID mismatch!");
    inkFile.close();
    return false;
  }
  
  // Display dimensions for Display ID "9" (Spectra 6 7,3" 800x480)
  // For portrait images, dimensions are swapped (480x800)
  const int displayWidth = (orient == 0) ? 800 : 480;
  const int displayHeight = (orient == 0) ? 480 : 800;
  const int totalPixels = displayWidth * displayHeight;
  
  // Read entire file into buffer
  uint8_t* fileData = (uint8_t*)malloc(fileSize);
  if (!fileData) {
    Serial1.println("Failed to allocate memory");
    inkFile.close();
    return false;
  }
  
  inkFile.seek(0);
  inkFile.read(fileData, fileSize);
  inkFile.close();
  
  // LZW Decoding
  int clearCode = 1 << minCodeSize;
  int eoiCode = clearCode + 1;
  uint32_t bitBuf = 0;
  int bitCount = 0;
  int ptr = 4; // Start after header
  int codeSize = minCodeSize + 1;
  
  // Read code function
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
  
  // Initialize dictionary
  std::vector<LZWDictEntry> dict;
  auto initDict = [&]() {
    dict.clear();
    for (int i = 0; i < (1 << minCodeSize); i++) {
      LZWDictEntry entry;
      entry.data.push_back(i);
      dict.push_back(entry);
    }
    // Add clear and EOI codes
    dict.push_back(LZWDictEntry()); // clearCode
    dict.push_back(LZWDictEntry()); // eoiCode
  };
  
  initDict();
  
  // Decode pixel data
  uint8_t* result = (uint8_t*)malloc(totalPixels);
  if (!result) {
    Serial1.println("Failed to allocate result buffer");
    free(fileData);
    return false;
  }
  
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
    
    // Get dictionary entry
    std::vector<uint8_t> entry;
    if (code < (int)dict.size() && dict[code].data.size() > 0) {
      entry = dict[code].data;
    } else if (code == (int)dict.size() && oldCode != -1 && oldCode < (int)dict.size()) {
      // Special case: code equals dict length
      entry = dict[oldCode].data;
      if (entry.size() > 0) {
        entry.push_back(entry[0]);
      }
    } else {
      Serial1.print("Invalid code: ");
      Serial1.println(code);
      break;
    }
    
    // Output entry data
    for (size_t j = 0; j < entry.size() && resIdx < totalPixels; j++) {
      result[resIdx++] = entry[j];
    }
    
    // Update dictionary
    if (oldCode != -1 && oldCode < (int)dict.size() && dict[oldCode].data.size() > 0) {
      LZWDictEntry newEntry;
      newEntry.data = dict[oldCode].data;
      if (entry.size() > 0) {
        newEntry.data.push_back(entry[0]);
      }
      dict.push_back(newEntry);
      
      // Increase code size if needed
      if (dict.size() == (size_t)(1 << codeSize) && codeSize < 12) {
        codeSize++;
      }
    }
    
    oldCode = code;
  }
  
  free(fileData);
  
  Serial1.print("Decoded ");
  Serial1.print(resIdx);
  Serial1.println(" pixels");
  
  // Initialize display
  display.init(115200);
  // Set rotation based on file orientation (0=0°, 1=90°, 2=180°, 3=270°)
  display.setRotation(fileOrientation);
  display.fillScreen(GxEPD_WHITE);
  
  // Draw pixels to display
  display.setFullWindow();
  display.firstPage();
  do {
    for (int y = 0; y < displayHeight; y++) {
      for (int x = 0; x < displayWidth; x++) {
        int pixelIdx = y * displayWidth + x;
        if (pixelIdx < resIdx) {
          uint8_t colorIdx = result[pixelIdx];
          if (colorIdx < 6) {
            display.drawPixel(x, y, displayPalette[colorIdx]);
          } else {
            // Fallback to black if color index out of range
            display.drawPixel(x, y, GxEPD_BLACK);
          }
        }
      }
    }
  } while (display.nextPage());
  
  display.hibernate();
  
  free(result);
  free(fileData);
  
  Serial1.println("Image displayed successfully");
  return true;
}

// Decode and display .ink file directly from HTTP stream (without SD card)
bool decodeAndDisplayInkFromHTTP(String imageUrl) {
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
  // Set longer timeouts for large image files
  http.setTimeout(60000); // 60 second timeout for large files
  http.setConnectTimeout(15000); // 15 second connection timeout
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
      Serial1.print("Retry attempt ");
      Serial1.print(retryCount);
      Serial1.print("/");
      Serial1.print(maxRetries - 1);
      Serial1.println("...");
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
      http.setTimeout(60000);
      http.setConnectTimeout(15000);
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
  
  // Get file size
  int fileSize = http.getSize();
  Serial1.print("File size: ");
  Serial1.println(fileSize);
  
  if (fileSize < 4) {
    Serial1.println("File too small");
    http.end();
    return false;
  }
  
  // Read entire file into buffer
  Serial1.println("Allocating memory for file...");
  uint8_t* fileData = (uint8_t*)malloc(fileSize);
  if (!fileData) {
    Serial1.println("Failed to allocate memory");
    http.end();
    return false;
  }
  
  Serial1.println("Reading file data...");
  WiFiClient *stream = http.getStreamPtr();
  size_t bytesRead = 0;
  unsigned long readStartTime = millis();
  while (http.connected() && bytesRead < (size_t)fileSize) {
    size_t available = stream->available();
    if (available) {
      size_t read = stream->readBytes(fileData + bytesRead, min(available, (size_t)fileSize - bytesRead));
      bytesRead += read;
      Serial1.print("Read ");
      Serial1.print(bytesRead);
      Serial1.print("/");
      Serial1.println(fileSize);
    }
    delay(1);
    
    // Timeout after 30 seconds
    if (millis() - readStartTime > 30000) {
      Serial1.println("Read timeout!");
      break;
    }
  }
  http.end();
  
  Serial1.print("Total bytes read: ");
  Serial1.println(bytesRead);
  
  if (bytesRead < 4) {
    Serial1.println("Failed to read file");
    free(fileData);
    return false;
  }
  
  // Read header (Version 1 format): [version, displayId, dither, orient, ...data]
  uint8_t version = fileData[0];
  uint8_t displayId = fileData[1];
  uint8_t dither = fileData[2];
  uint8_t orient = fileData[3];
  uint8_t minCodeSize = 3; // Fixed for 6 colors (Spectra 6)
  int dataPtr = 4;
  
  Serial1.print("Version: ");
  Serial1.println(version);
  Serial1.print("Display ID: ");
  Serial1.println((char)displayId);
  Serial1.print("Dither: ");
  Serial1.println(dither);
  Serial1.print("Orientation: ");
  Serial1.println(orient == 0 ? "Landscape" : "Portrait");
  Serial1.print("MinCodeSize: ");
  Serial1.println(minCodeSize);
  
  // Check if display ID matches
  if (displayId != DEVICE_DISPLAY_ID[0]) {
    Serial1.println("Display ID mismatch!");
    free(fileData);
    return false;
  }
  
  // Display dimensions for Display ID "9" (Spectra 6 7,3" 800x480)
  // For portrait images, dimensions are swapped (480x800)
  const int displayWidth = (orient == 0) ? 800 : 480;
  const int displayHeight = (orient == 0) ? 480 : 800;
  const int totalPixels = displayWidth * displayHeight;
  
  // LZW Decoding (same as decodeAndDisplayInk)
  int clearCode = 1 << minCodeSize;
  int eoiCode = clearCode + 1;
  uint32_t bitBuf = 0;
  int bitCount = 0;
  int ptr = dataPtr; // Start from correct position
  int codeSize = minCodeSize + 1;
  
  // Read code function
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
  
  // Initialize dictionary
  std::vector<LZWDictEntry> dict;
  auto initDict = [&]() {
    dict.clear();
    for (int i = 0; i < (1 << minCodeSize); i++) {
      LZWDictEntry entry;
      entry.data.push_back(i);
      dict.push_back(entry);
    }
    // Add clear and EOI codes
    dict.push_back(LZWDictEntry()); // clearCode
    dict.push_back(LZWDictEntry()); // eoiCode
  };
  
  initDict();
  
  // Decode pixel data
  uint8_t* result = (uint8_t*)malloc(totalPixels);
  if (!result) {
    Serial1.println("Failed to allocate result buffer");
    free(fileData);
    return false;
  }
  
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
    
    // Get dictionary entry
    std::vector<uint8_t> entry;
    if (code < (int)dict.size() && dict[code].data.size() > 0) {
      entry = dict[code].data;
    } else if (code == (int)dict.size() && oldCode != -1 && oldCode < (int)dict.size()) {
      // Special case: code equals dict length
      entry = dict[oldCode].data;
      if (entry.size() > 0) {
        entry.push_back(entry[0]);
      }
    } else {
      Serial1.print("Invalid code: ");
      Serial1.println(code);
      break;
    }
    
    // Output entry data
    for (size_t j = 0; j < entry.size() && resIdx < totalPixels; j++) {
      result[resIdx++] = entry[j];
    }
    
    // Update dictionary
    if (oldCode != -1 && oldCode < (int)dict.size() && dict[oldCode].data.size() > 0) {
      LZWDictEntry newEntry;
      newEntry.data = dict[oldCode].data;
      if (entry.size() > 0) {
        newEntry.data.push_back(entry[0]);
      }
      dict.push_back(newEntry);
      
      // Increase code size if needed
      if (dict.size() == (size_t)(1 << codeSize) && codeSize < 12) {
        codeSize++;
      }
    }
    
    oldCode = code;
  }
  
  Serial1.print("Decoded ");
  Serial1.print(resIdx);
  Serial1.print("/");
  Serial1.print(totalPixels);
  Serial1.println(" pixels");
  
  // Initialize display
  Serial1.println("Initializing display...");
  display.init(115200);
  // Set rotation based on file orientation (0=0°, 1=90°, 2=180°, 3=270°)
  Serial1.print("Setting display rotation to: ");
  Serial1.println(fileOrientation);
  display.setRotation(fileOrientation);
  display.fillScreen(GxEPD_WHITE);
  
  // Draw pixels to display
  Serial1.println("Drawing pixels to display...");
  display.setFullWindow();
  display.firstPage();
  int pixelsDrawn = 0;
  do {
    for (int y = 0; y < displayHeight; y++) {
      for (int x = 0; x < displayWidth; x++) {
        int pixelIdx = y * displayWidth + x;
        if (pixelIdx < resIdx) {
          uint8_t colorIdx = result[pixelIdx];
          if (colorIdx < 6) {
            display.drawPixel(x, y, displayPalette[colorIdx]);
          } else {
            // Fallback to black if color index out of range
            display.drawPixel(x, y, GxEPD_BLACK);
          }
          pixelsDrawn++;
        }
      }
    }
  } while (display.nextPage());
  
  Serial1.print("Drew ");
  Serial1.print(pixelsDrawn);
  Serial1.println(" pixels");
  
  Serial1.println("Hibernating display...");
  display.hibernate();
  
  Serial1.println("Freeing memory...");
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
      Wire.requestFrom(address, 1, true);
      
      if (Wire.available() || Wire.read() != 0xFF) {
        Serial1.print("I2C device found at address 0x");
        if (address < 16) Serial1.print("0");
        Serial1.print(address, HEX);
        
        // Try to read WHO_AM_I for MPU6050
        if (address == MPU6050_ADDR || address == 0x69) {
          Wire.beginTransmission(address);
          Wire.write(0x75); // WHO_AM_I register
          Wire.endTransmission(false);
          Wire.requestFrom(address, 1, true);
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
      Wire.requestFrom(addr, 1, true);
      
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
    return 0; // Default to landscape if MPU6050 not available
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
    // Show error message on display
    display.init(115200);
    display.setRotation(DEFAULT_DISPLAY_ROTATION);
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(50, 200);
    display.print("No images in show");
    display.setCursor(50, 230);
    display.print(currentShowName);
    display.display(false);
    return;
  }
  
  // Select next image based on mode
  if (currentShowMode == "random") {
    currentImageIndex = random(0, currentShowImages.size());
  } else if (currentShowMode == "reversesequence") {
    currentImageIndex--;
    if (currentImageIndex < 0) {
      currentImageIndex = currentShowImages.size() - 1;
    }
  } else { // forwardssequence (default)
    currentImageIndex++;
    if (currentImageIndex >= (int)currentShowImages.size()) {
      currentImageIndex = 0;
    }
  }
  
  String imageName = currentShowImages[currentImageIndex];
  Serial1.print("Displaying image ");
  Serial1.print(currentImageIndex + 1);
  Serial1.print("/");
  Serial1.print(currentShowImages.size());
  Serial1.print(": ");
  Serial1.println(imageName);
  
  // Check if image exists on SD card (if SD available)
  bool useSD = isSDCardAvailable();
  bool imageOnSD = false;
  
  if (useSD && SD.exists("/" + imageName)) {
    imageOnSD = true;
    Serial1.println("Image found on SD card");
  } else {
    Serial1.println("Image not on SD - loading from server...");
  }
  
  if (imageOnSD) {
    // Decode and display from SD card
    Serial1.println("Decoding and displaying image from SD...");
    if (decodeAndDisplayInk(imageName)) {
      lastImageChangeTime = millis();
      Serial1.println("Image displayed successfully");
    } else {
      Serial1.println("Failed to decode image from SD");
    }
  } else {
    // Load directly from server
    // Extract base URL from hostChannelUrl (remove query parameters and path)
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
    
    Serial1.print("Loading image directly from server: ");
    Serial1.println(imageUrl);
    
    if (decodeAndDisplayInkFromHTTP(imageUrl)) {
      lastImageChangeTime = millis();
      Serial1.println("Image displayed successfully from server");
    } else {
      Serial1.println("Failed to load image from server");
      // Show error on display
      display.init(115200);
      display.setRotation(DEFAULT_DISPLAY_ROTATION);
      display.fillScreen(GxEPD_WHITE);
      display.setTextColor(GxEPD_BLACK);
      display.setCursor(50, 200);
      display.print("Load failed:");
      display.setCursor(50, 230);
      display.print(imageName);
      display.display(false);
    }
  }
}

// === Setup Function ===
void setup() {
  Serial1.begin(115200, SERIAL_8N1, SERIAL_RX, SERIAL_TX);
  while (!Serial1)
    delay(10);
  delay(2000);
  Serial1.println("--- microPhotoFrame Firmware ---");
  
  // Start AP FIRST, before anything else (so AP is always available)
  // Open AP (no password) for easier captive portal access
  Serial1.println("Starting configuration access point...");
  WiFi.mode(WIFI_AP_STA);
  if (!WiFi.softAP("erPhotoFrame")) {
    Serial1.println("Failed to start AP!");
  } else {
    delay(500); // Give AP time to start
    IPAddress AP_IP = WiFi.softAPIP();
    Serial1.print("AP started. SSID: erPhotoFrame (open), IP: ");
    Serial1.println(AP_IP);
  }
  
  // Initialize buttons
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);
  pinMode(BTN_LEFT, INPUT_PULLUP);
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_CENTER, INPUT_PULLUP);
  
  // Check if config should be cleared (center button pressed for 5 seconds)
  unsigned long buttonCheckStart = millis();
  bool bothButtonsPressed = false;
  bool clearConfigPressed = false;
  while (millis() - buttonCheckStart < 5000) {
    if (digitalRead(BTN_LEFT) == LOW && digitalRead(BTN_RIGHT) == LOW) {
      bothButtonsPressed = true;
    } else if (digitalRead(BTN_CENTER) == LOW) {
      clearConfigPressed = true;
    } else {
      bothButtonsPressed = false;
      clearConfigPressed = false;
      break;
    }
    delay(100);
  }
  
  // Clear config if center button was pressed
  if (clearConfigPressed) {
    preferences.begin("microPhotoFrame", false);
    preferences.clear();
    preferences.end();
    Serial1.println("Config cleared by button press");
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
  
  bool sdCardAvailable = false;
  if (digitalRead(SD_DET_PIN) == LOW) {
    Serial1.println("SD card detected, attempting to mount...");
    if (SD.begin(SD_CS_PIN, hspi)) {
      Serial1.println("SD card mounted successfully.");
      sdCardAvailable = true;
      sdCardMounted = true;
      
      // Show startup image if available
      // Try both landscape and portrait filenames (check for typo in filename)
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
          // Extract filename without path
          String filename = startupFiles[i];
          filename.replace("/", "");
          if (i == 2) { // portrait
            display.setRotation(1);
            Serial1.println("Showing startup image (portrait)...");
          } else {
            display.setRotation(DEFAULT_DISPLAY_ROTATION);
            Serial1.println("Showing startup image (landscape)...");
          }
          if (decodeAndDisplayInk(filename)) {
            startupShown = true;
            if (i == 2) {
              display.setRotation(DEFAULT_DISPLAY_ROTATION); // Reset to default
            }
          }
        }
      }
      
      if (!startupShown) {
        Serial1.println("No startup image found");
        display.fillScreen(GxEPD_WHITE);
        display.hibernate();
      }
    } else {
      Serial1.println("SD Card Mount Failed!");
      display.init(115200);
      display.setCursor(10, 20);
      display.print("SD Card Mount Failed!");
      display.display(false);
    }
  } else {
    Serial1.println("No SD card detected.");
    display.init(115200);
    display.setCursor(10, 20);
    display.print("No SD card detected.");
    display.display(false);
  }
  
  // Get AP IP (already started above)
  IPAddress AP_IP = WiFi.softAPIP();
  
  // Initialize MPU6050 for orientation detection
  initMPU6050();
  // Read initial orientation
  currentOrientation = readOrientation();
  Serial1.print("Initial orientation: ");
  const char* orientationNames[] = {"Landscape (0°)", "Portrait (90°)", "Landscape inverted (180°)", "Portrait inverted (270°)"};
  if (currentOrientation >= 0 && currentOrientation < 4) {
    Serial1.println(orientationNames[currentOrientation]);
  } else {
    Serial1.println(currentOrientation);
  }
  
  // Load configuration
  loadConfig();
  
  // Setup web server for configuration
  dnsServer.start(53, "*", AP_IP);
  server.on("/", handleRoot);
  server.on("/logo", handleLogo);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/generate_204", handleRoot);
  server.on("/gen_204", handleRoot);
  server.on("/hotspot-detect.html", handleRoot);
  server.on("/canonical.html", handleRoot);
  server.on("/success.txt", handleRoot);
  server.on("/ncsi.txt", handleRoot);
  server.on("/connecttest.txt", handleRoot);
  server.on("/redirect", handleRoot);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial1.println("Configuration web server started");
  
  // Start config mode if buttons pressed or no config exists
  if (bothButtonsPressed || wifiSSID.length() == 0 || hostChannelUrl.length() == 0) {
    startConfigMode();
    return;
  }
  
  // Connect to WiFi (AP is already running)
  if (connectWiFi()) {
    wifiConnected = true;
    
    // Show connecting message
    display.init(115200);
    display.setRotation(DEFAULT_DISPLAY_ROTATION);
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(50, 200);
    display.print("Connected to WiFi");
    display.setCursor(50, 230);
    display.print("Loading show...");
    display.display(false);
    
    // Get active show and load images
    if (getActiveShow()) {
      if (loadShowData()) {
        if (currentShowImages.size() > 0) {
          Serial1.println("Displaying first image...");
          currentImageIndex = -1; // Start from beginning
          displayNextImage();
        } else {
          Serial1.println("Show has no images");
          display.init(115200);
          display.setRotation(DEFAULT_DISPLAY_ROTATION);
          display.fillScreen(GxEPD_WHITE);
          display.setTextColor(GxEPD_BLACK);
          display.setCursor(50, 200);
          display.print("Show has no images");
          display.setCursor(50, 230);
          display.print(currentShowName);
          display.display(false);
        }
      } else {
        Serial1.println("Failed to load show data");
        display.init(115200);
        display.setRotation(DEFAULT_DISPLAY_ROTATION);
        display.fillScreen(GxEPD_WHITE);
        display.setTextColor(GxEPD_BLACK);
        display.setCursor(50, 200);
        display.print("Failed to load show");
        display.display(false);
      }
    } else {
      Serial1.println("No active show found");
      display.init(115200);
      display.setRotation(DEFAULT_DISPLAY_ROTATION);
      display.fillScreen(GxEPD_WHITE);
      display.setTextColor(GxEPD_BLACK);
      display.setCursor(50, 200);
      display.print("No active show");
      display.setCursor(50, 230);
      display.print("for this display");
      display.display(false);
    }
  } else {
    Serial1.println("Failed to connect to WiFi, entering config mode");
    // AP is already running, just switch to config mode
    configMode = true;
    configModeStartTime = millis();
    display.init(115200);
    display.setRotation(DEFAULT_DISPLAY_ROTATION);
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setCursor(10, 30);
    display.print("WiFi Connection Failed");
    display.setCursor(10, 60);
    display.print("SSID: ");
    display.print(wifiSSID.length() > 0 ? wifiSSID : "not set");
    display.setCursor(10, 90);
    display.print("Config Mode Active");
    display.setCursor(10, 120);
    display.print("WiFi: erPhotoFrame");
    display.setCursor(10, 150);
    display.print("(Open - no password)");
    IPAddress IP = WiFi.softAPIP();
    display.setCursor(10, 180);
    display.print("IP: ");
    display.print(IP.toString());
    display.display(false);
  }
}

// === Loop Function ===
void loop() {
  // Always handle configuration web server (AP is always running)
  dnsServer.processNextRequest();
  server.handleClient();
  
  if (configMode) {
    // Exit config mode after timeout
    if (millis() - configModeStartTime > CONFIG_MODE_TIMEOUT) {
      Serial1.println("Config mode timeout, restarting...");
      ESP.restart();
    }
    return;
  }
  
  // Handle button presses
  if (digitalRead(BTN_LEFT) == LOW) {
    delay(200); // Debounce
    if (digitalRead(BTN_LEFT) == LOW) {
      Serial1.println("Previous image");
      if (currentShowMode == "forwardssequence") {
        currentImageIndex -= 2; // Will be incremented in displayNextImage
        if (currentImageIndex < -1) currentImageIndex = currentShowImages.size() - 2;
      } else if (currentShowMode == "reversesequence") {
        currentImageIndex += 2;
        if (currentImageIndex >= currentShowImages.size()) currentImageIndex = 1;
      }
      displayNextImage();
    }
  }
  
  if (digitalRead(BTN_RIGHT) == LOW) {
    delay(200); // Debounce
    if (digitalRead(BTN_RIGHT) == LOW) {
      Serial1.println("Next image");
      displayNextImage();
    }
  }
  
  // Check orientation periodically
  if (millis() - lastOrientationCheck > ORIENTATION_CHECK_INTERVAL) {
    lastOrientationCheck = millis();
    int newOrientation = readOrientation();
    if (newOrientation != currentOrientation) {
      Serial1.print("Orientation changed from ");
      const char* orientationNames[] = {"landscape (0°)", "portrait (90°)", "landscape inverted (180°)", "portrait inverted (270°)"};
      if (currentOrientation >= 0 && currentOrientation < 4) {
        Serial1.print(orientationNames[currentOrientation]);
      } else {
        Serial1.print(currentOrientation);
      }
      Serial1.print(" to ");
      if (newOrientation >= 0 && newOrientation < 4) {
        Serial1.println(orientationNames[newOrientation]);
      } else {
        Serial1.println(newOrientation);
      }
      currentOrientation = newOrientation;
      // Re-filter images for new orientation
      filterImagesByOrientation();
      // Reset image index and display new image
      if (currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    }
  }
  
  // Check for new active show periodically
  if (wifiConnected && millis() - lastServerCheck > SERVER_CHECK_INTERVAL) {
    lastServerCheck = millis();
    
    Serial1.println("Checking for active show update...");
    if (getActiveShow()) {
      Serial1.println("Active show changed, reloading...");
      if (loadShowData()) {
        if (currentShowImages.size() > 0) {
          currentImageIndex = -1; // Reset to start
          displayNextImage();
        }
      }
    }
  }
  
  // Change image based on timer
  if (currentShowImages.size() > 0 && millis() - lastImageChangeTime > (currentShowTimer * 60000UL)) {
    displayNextImage();
  }
  
  delay(100);
}