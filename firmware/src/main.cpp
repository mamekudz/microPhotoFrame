/*
 * µPhotoFrame™ Firmware
 * Based on: https://github.com/pixelEDI/reterminal-e1002-epaper
 *
 * Board/platform: firmware/src/board.h + boards/*.h
 * (gulp-mu-build-filter BUILD_ONLY_AT_PLATFORMS, exact Project Control id).
 */

#include "board.h"
#include "i18n_fw.h"
#if (EPD_SELECT == 2)
#include <GxEPD2_4C.h>
#elif (EPD_SELECT == 1)
#include <GxEPD2_7C.h>
#else
#include <GxEPD2_BW.h>
#endif
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
#if defined(__EXCEPTIONS) && __EXCEPTIONS
#include <exception>
#endif
#include <Wire.h>
#include <Update.h>
#include <esp32s3/rom/miniz.h>
#include <PNGdec.h>
#include <esp_task_wdt.h>
#include <sys/time.h>
#include "esp_sleep.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "esp_heap_caps.h"

#define FIRMWARE_VERSION "1.5.9"

#if !PHOTOFRAME_HAS_HW_SERIAL1
#define Serial1 Serial
#endif

// Large .ink bodies + 800×480 result (~384 KB) need PSRAM on NeoFrame
// (ESP32-S3R8, 8 MB). Internal SRAM is already taken by WiFi/HTTP/GxEPD2.
static void* pfAlloc(size_t n) {
  if (n == 0) return nullptr;
#if defined(BOARD_HAS_PSRAM)
  if (psramFound()) {
    void* p = heap_caps_malloc(n, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (p) return p;
  }
#endif
  return malloc(n);
}

static void* pfRealloc(void* p, size_t n) {
#if defined(BOARD_HAS_PSRAM)
  if (psramFound()) {
    void* q = heap_caps_realloc(p, n, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (q || n == 0) return q;
  }
#endif
  return realloc(p, n);
}

static void logHeap(const char* where) {
  Serial1.print(where);
  Serial1.print(": heap=");
  Serial1.print(ESP.getFreeHeap());
#if defined(BOARD_HAS_PSRAM)
  Serial1.print(" psram=");
  Serial1.print(ESP.getFreePsram());
  Serial1.print(" found=");
  Serial1.print(psramFound() ? 1 : 0);
#endif
  Serial1.println();
}

static String firmwareVersionLabel() {
  return String(PHOTOFRAME_TARGET_NAME) + " · " + FIRMWARE_VERSION + " · " + __DATE__;
}

// For displays with RAM limitations
#define MAX_DISPLAY_BUFFER_SIZE 16000
#define MAX_HEIGHT(EPD)                                                        \
  (EPD::HEIGHT <= MAX_DISPLAY_BUFFER_SIZE / (EPD::WIDTH / 8)                   \
       ? EPD::HEIGHT                                                           \
       : MAX_DISPLAY_BUFFER_SIZE / (EPD::WIDTH / 8))

// === Global Objects ===
SPIClass hspi(HSPI);
#if PHOTOFRAME_SD_SEPARATE_SPI
SPIClass sdSpi(FSPI);
#endif

static SPIClass& sdSpiBus() {
#if PHOTOFRAME_SD_SEPARATE_SPI
  return sdSpi;
#else
  return hspi;
#endif
}

static void initSpiBuses() {
#if PHOTOFRAME_SD_SEPARATE_SPI
  hspi.begin(EPD_SCK_PIN, -1, EPD_MOSI_PIN, -1);
  sdSpi.begin(SD_SCK_PIN, SD_MISO_PIN, SD_MOSI_PIN, SD_CS_PIN);
#else
  hspi.begin(EPD_SCK_PIN, SD_MISO_PIN, EPD_MOSI_PIN, -1);
#endif
}

static void sdPowerOn() {
#if PHOTOFRAME_HAS_SD_EN
  pinMode(SD_EN_PIN, OUTPUT);
  digitalWrite(SD_EN_PIN, HIGH);
#endif
#if PHOTOFRAME_HAS_SD_DET
  pinMode(SD_DET_PIN, INPUT_PULLUP);
#endif
}

static void epdPowerOn() {
#if PHOTOFRAME_EPD_PWR_PIN >= 0
  pinMode(PHOTOFRAME_EPD_PWR_PIN, OUTPUT);
  digitalWrite(PHOTOFRAME_EPD_PWR_PIN, PHOTOFRAME_EPD_PWR_ON_LEVEL);
  delay(10);
#endif
}

static bool sdCardPresent() {
#if !PHOTOFRAME_HAS_SD
  return false;
#elif PHOTOFRAME_HAS_SD_DET
  return digitalRead(SD_DET_PIN) == LOW;
#else
  return true;
#endif
}

static bool sdMount() {
  sdPowerOn();
  if (!sdCardPresent()) return false;
  return SD.begin(SD_CS_PIN, sdSpiBus());
}

static void pfTone(unsigned freq, unsigned ms) {
#if PHOTOFRAME_HAS_BUZZER
  tone(BUZZER_PIN, freq, ms);
#else
  (void)freq;
  (void)ms;
#endif
}
Preferences preferences;
WebServer server(80);
DNSServer dnsServer;

GxEPD2_DISPLAY_CLASS<GxEPD2_DRIVER_CLASS, MAX_HEIGHT(GxEPD2_DRIVER_CLASS)>
    display(GxEPD2_DRIVER_CLASS(/*CS=*/EPD_CS_PIN, /*DC=*/EPD_DC_PIN,
                                /*RST=*/EPD_RES_PIN, /*BUSY=*/EPD_BUSY_PIN));

// === Configuration Variables ===
String wifiSSID = "";
String wifiPassword = "";
String hostServerUrl = "";
String hostUser = "";
String hostTarget = "";
String hostChannelUrl = "";
String uiLid = "";
String extractChannelSlug(const String& url);
String makeServerRequest(String action, String jsonPayload = "{}");
static String pathDisplayId();
static String normalizeServerUrl(String url);
static void applyHostParts();
static void parseLegacyHostParts();
static void takeHostUrlAndUser(String urlIn, String userIn);
static void persistHostIdentity();
static String epdToAscii(const char* s);
static String fwT(const char* key);
/** Wenn kein MPU6050: logische Ausrichtung für Bildfilter (0–3), siehe readOrientation(). */
uint8_t configDefaultOrientation = 0;
bool configMode = false;
uint64_t configModeStartSessionMs = 0;
const unsigned long CONFIG_MODE_TIMEOUT = 300000; // 5 minutes
// Buttonless boards (NeoFrame): open Soft-AP after cold boot so WLAN/URL
// can be changed without the STA IP. Not used after deep-sleep timer wake.
static bool bootConfigApActive = false;
static uint64_t bootConfigApUntilSessionMs = 0;

// === Show Management ===
String currentShowName = "";
String currentChannelPath = "";
String currentShowMode = "forwardssequence"; // forwardssequence, reversesequence, random
int currentShowTimer = 5; // minutes
int currentRestStart = 22;
int currentRestEnd = 6;
int currentTzOffsetMin = 0;
static uint32_t g_nextRestStart = 0;
static uint32_t g_restSleepUntil = 0;
int currentImageIndex = 0;
uint64_t lastImageChangeSessionMs = 0;
std::vector<String> currentShowImages;

// Random mode: 1 bit per image so each file appears once per cycle.
// RAM cap keeps huge shows from allocating; NVS persist is smaller so
// Deep Sleep does not blow the partition. Above the cap: uniform pick
// without the "every image once" guarantee (still no immediate repeat).
static const size_t kRandomCycleMaxImages = 8192;
static const size_t kRandomCycleNvsMaxBytes = 400;
static std::vector<uint8_t> g_rndSeen;
static bool g_rndCycleOn = false;
static bool g_rndPersist = false;
static uint32_t g_rndListFp = 0;

// === WiFi Status ===
bool wifiConnected = false;
uint64_t lastServerCheckSessionMs = 0;
const unsigned long SERVER_CHECK_INTERVAL = 60000; // 1 minute

// === Laufzeit: Session-Zeit (esp_timer + gemessener Light-Sleep), Strom-Schätzung, Fehlerlog ===
static uint64_t g_lightSleepMsTotal = 0;

static uint64_t sessionMs() {
  return esp_timer_get_time() / 1000ULL + g_lightSleepMsTotal;
}

// Geschätzte Stromaufnahme (mA) — Modell, keine Shunt-Messung; Werte für typisches ESP32+WiFi+E-Ink-Idle.
static const float PWR_MA_LIGHT_SLEEP_EST = 18.0f;
static const float PWR_MA_IDLE_AWAKE_WIFI = 95.0f;
static const float PWR_MA_HIGH_WIFI_DECODE = 280.0f;

static uint64_t g_pwrHighUs = 0;
#define PWR_HIGH_STACK 8
static uint64_t g_pwrHighStk[PWR_HIGH_STACK];
static int g_pwrHighStkN = 0;

static void pwrHighEnter() {
  if (g_pwrHighStkN < PWR_HIGH_STACK)
    g_pwrHighStk[g_pwrHighStkN++] = esp_timer_get_time();
}
static void pwrHighExit() {
  if (g_pwrHighStkN <= 0) return;
  uint64_t t0 = g_pwrHighStk[--g_pwrHighStkN];
  g_pwrHighUs += (uint64_t)(esp_timer_get_time() - t0);
}

struct PowerHighScope {
  PowerHighScope() { pwrHighEnter(); }
  ~PowerHighScope() { pwrHighExit(); }
};

static float pwrEstimatedAvgMa() {
  uint64_t totalMs = sessionMs();
  if (totalMs < 1) totalMs = 1;
  uint64_t awakeMs = esp_timer_get_time() / 1000ULL;
  uint64_t sleepMs = g_lightSleepMsTotal;
  uint64_t highMs = g_pwrHighUs / 1000ULL;
  if (highMs > awakeMs) highMs = awakeMs;
  uint64_t idleAwakeMs = awakeMs > highMs ? awakeMs - highMs : 0;
  float num = (float)sleepMs * PWR_MA_LIGHT_SLEEP_EST
            + (float)idleAwakeMs * PWR_MA_IDLE_AWAKE_WIFI
            + (float)highMs * PWR_MA_HIGH_WIFI_DECODE;
  return num / (float)totalMs;
}

static void doIdleLightSleepChunk(uint32_t maxSleepMs) {
  if (maxSleepMs < 15) return;
  if (maxSleepMs > 1950) maxSleepMs = 1950;

  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
  esp_sleep_enable_timer_wakeup((uint64_t)maxSleepMs * 1000ULL);

#if PHOTOFRAME_HAS_BUTTONS && (defined(CONFIG_IDF_TARGET_ESP32S3) || defined(CONFIG_IDF_TARGET_ESP32) || defined(CONFIG_IDF_TARGET_ESP32S2))
  uint64_t extMask = (1ULL << (uint8_t)BTN_ACTION) | (1ULL << (uint8_t)BTN_NEXT) | (1ULL << (uint8_t)BTN_PREV);
  esp_sleep_enable_ext1_wakeup(extMask, ESP_EXT1_WAKEUP_ANY_LOW);
#endif

  struct timeval tv0, tv1;
  gettimeofday(&tv0, nullptr);
  esp_light_sleep_start();
  gettimeofday(&tv1, nullptr);

  esp_sleep_wakeup_cause_t wc = esp_sleep_get_wakeup_cause();
  int64_t deltaMs = (int64_t)(tv1.tv_sec - tv0.tv_sec) * 1000LL;
  deltaMs += (tv1.tv_usec - tv0.tv_usec) / 1000;

  if (deltaMs >= 1 && deltaMs <= (int64_t)maxSleepMs + 800)
    g_lightSleepMsTotal += (uint64_t)deltaMs;
  else if (wc == ESP_SLEEP_WAKEUP_TIMER)
    g_lightSleepMsTotal += maxSleepMs;
  else if (deltaMs < 1 && wc == ESP_SLEEP_WAKEUP_EXT1)
    g_lightSleepMsTotal += 1;

  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_TIMER);
#if PHOTOFRAME_HAS_BUTTONS && (defined(CONFIG_IDF_TARGET_ESP32S3) || defined(CONFIG_IDF_TARGET_ESP32) || defined(CONFIG_IDF_TARGET_ESP32S2))
  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_EXT1);
#endif
}

// === Server / letztes Bild (Offline-Hinweis) ===
int g_lastHttpStatusCode = -1;
/** Zuletzt erfolgreich auf dem Panel gezeichnete .ink-Datei (nur Dateiname). */
String lastDisplayedInkName = "";
static void beginTextScreen();
static void showStatusScreen(const char* line1, const char* line2 = nullptr, const char* line3 = nullptr);
static void showStatusOrKeepLast(const char* line1, const char* line2 = nullptr, const char* line3 = nullptr);
/** True, solange das aktuell sichtbare Bild mit Offline-Warn-Badge oben rechts gezeichnet wurde. */
bool offlineBadgeOnScreen = false;
/** Letzter getShows-Lauf: HTTP 200 + gültiges JSON (Show-Liste verstanden). */
bool lastGetShowsSucceeded = true;
/** Diagnose-String: letzte Fehlerstelle in getActiveShow (für Statusbildschirm). */
String lastGetShowError = "";
/** getShows verstand die Antwort, aber die Kanal-URL gilt nicht für dieses Display. */
bool lastChannelUnintended = false;

// === Quick-Menu Mode ===
bool quickMenuMode = false;
uint64_t quickMenuStartSessionMs = 0;
const unsigned long QUICK_MENU_TIMEOUT = 60000; // 60 seconds
String cachedShowsJson = "";  // cached response from server for the menu

/** >0 und sessionMs() < deadline: Show nur lokal (Server-activeShows wird ignoriert). */
uint64_t showTempOverrideUntilSessionMs = 0;
/** Zuletzt vom Server gelesene aktive Show (für Quick-Menü-Hinweis bei lokalem Override). */
String serverActiveShowCached = "";
/** Standard „Minuten bis Server wieder gilt“ im Quick-Menü (NVS qRevMin). */
uint16_t quickMenuRevertMinutes = 60;

/** NVS dSleep: zwischen Slides Deep Sleep.
 *  E1002 und Waveshare default an (eigene Versorgung).
 *  NeoFrame default aus: Powerbanks trennen bei µA-Last im Tiefschlaf. */
bool configSlideshowDeepSleep = PHOTOFRAME_DEEP_SLEEP_DEFAULT != 0;
static const uint8_t kDeepSleepDefault = PHOTOFRAME_DEEP_SLEEP_DEFAULT;
static uint32_t g_lastImageUnix = 0;
static uint32_t g_lastPollUnix = 0;
static bool g_wDeepPoll = false;
static bool g_wDeepImg = false;
static bool g_wDeepRest = false;

static void slideTimerMarkNow() {
  lastImageChangeSessionMs = sessionMs();
  time_t t = time(nullptr);
  if (t > 1700000000) {
    g_lastImageUnix = (uint32_t)t;
    preferences.begin("microPhotoFrame", false);
    preferences.putUInt("lstImgT", g_lastImageUnix);
    preferences.end();
  }
}

static void markServerPollWallClock() {
  time_t t = time(nullptr);
  if (t > 1700000000) {
    g_lastPollUnix = (uint32_t)t;
    preferences.begin("microPhotoFrame", false);
    preferences.putUInt("lstPolT", g_lastPollUnix);
    preferences.end();
  }
}

static bool restPeriodDisabled() {
  return currentRestStart == currentRestEnd;
}

static uint32_t restUtcAtHour(time_t localMid, int tzMin, int dayOff, int hour) {
  time_t loc = localMid + (time_t)dayOff * 86400 + (time_t)hour * 3600;
  return (uint32_t)(loc - (time_t)tzMin * 60);
}

static void computeRestWindowFromHours(uint32_t nowUtc) {
  if (restPeriodDisabled()) {
    g_nextRestStart = 0;
    g_restSleepUntil = 0;
    return;
  }
  time_t wall = (time_t)nowUtc + (time_t)currentTzOffsetMin * 60;
  struct tm t;
  gmtime_r(&wall, &t);
  int h = t.tm_hour;
  time_t localMid = wall - (time_t)t.tm_hour * 3600 - (time_t)t.tm_min * 60 - (time_t)t.tm_sec;
  uint32_t startU;
  uint32_t endU;
  if (currentRestStart > currentRestEnd) {
    if (h >= currentRestStart) {
      startU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestStart);
      endU = restUtcAtHour(localMid, currentTzOffsetMin, 1, currentRestEnd);
    } else if (h < currentRestEnd) {
      startU = restUtcAtHour(localMid, currentTzOffsetMin, -1, currentRestStart);
      endU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestEnd);
    } else {
      startU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestStart);
      endU = restUtcAtHour(localMid, currentTzOffsetMin, 1, currentRestEnd);
    }
  } else if (h < currentRestStart) {
    startU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestStart);
    endU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestEnd);
  } else if (h < currentRestEnd) {
    startU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestStart);
    endU = restUtcAtHour(localMid, currentTzOffsetMin, 0, currentRestEnd);
  } else {
    startU = restUtcAtHour(localMid, currentTzOffsetMin, 1, currentRestStart);
    endU = restUtcAtHour(localMid, currentTzOffsetMin, 1, currentRestEnd);
  }
  g_nextRestStart = startU;
  g_restSleepUntil = endU;
}

static void rollRestWindowForward(uint32_t now) {
  if (restPeriodDisabled() || g_restSleepUntil == 0) return;
  while (g_restSleepUntil <= now) {
    g_nextRestStart += 86400u;
    g_restSleepUntil += 86400u;
  }
}

static bool isInRestPeriod(uint32_t now) {
  if (restPeriodDisabled() || now <= 1700000000u) return false;
  if (g_restSleepUntil == 0) computeRestWindowFromHours(now);
  rollRestWindowForward(now);
  if (g_restSleepUntil == 0) return false;
  if (g_nextRestStart == 0) return now < g_restSleepUntil;
  return now >= g_nextRestStart && now < g_restSleepUntil;
}

/** Deep Sleep bis nächstem Bild-Timer oder Server-Poll; nur bei gültigem time() und lstImgT. */
static bool trySlideshowDeepSleep() {
  if (bootConfigApActive) return false;
  if (!configSlideshowDeepSleep || g_lastImageUnix == 0) return false;
  time_t nowt = time(nullptr);
  if (nowt <= 1700000000) return false;

  uint32_t now = (uint32_t)nowt;
  if (!restPeriodDisabled()) {
    if (g_restSleepUntil == 0) computeRestWindowFromHours(now);
    rollRestWindowForward(now);
    uint64_t imgDuePreview = (uint64_t)g_lastImageUnix + (uint64_t)(unsigned)currentShowTimer * 60ULL;
    bool inRest = isInRestPeriod(now);
    bool restSoon = !inRest && g_nextRestStart > 0 && imgDuePreview >= (uint64_t)g_nextRestStart;
    if (inRest || restSoon) {
      uint32_t sec = (g_restSleepUntil > now) ? (g_restSleepUntil - now) : 1u;
      if (sec < 15u) return false;
      const uint32_t kMaxDeepSecRest = 8u * 3600u;
      if (sec > kMaxDeepSecRest) sec = kMaxDeepSecRest;
      preferences.begin("microPhotoFrame", false);
      preferences.putInt("sImgIx", currentImageIndex);
      preferences.putUChar("dsAct", 3u);
      preferences.end();
      Serial1.printf("Deep sleep %lu s (Ruhezeit bis %lu)\n",
                     (unsigned long)sec, (unsigned long)g_restSleepUntil);
      Serial1.flush();
      WiFi.disconnect(true);
      delay(200);
      WiFi.mode(WIFI_OFF);
      esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
      esp_sleep_enable_timer_wakeup((uint64_t)sec * 1000000ULL);
#if PHOTOFRAME_HAS_BUTTONS && (defined(CONFIG_IDF_TARGET_ESP32S3) || defined(CONFIG_IDF_TARGET_ESP32) || defined(CONFIG_IDF_TARGET_ESP32S2))
      uint64_t extMask = (1ULL << (uint8_t)BTN_ACTION) | (1ULL << (uint8_t)BTN_NEXT) | (1ULL << (uint8_t)BTN_PREV);
      esp_sleep_enable_ext1_wakeup(extMask, ESP_EXT1_WAKEUP_ANY_LOW);
#endif
      esp_deep_sleep_start();
      return true;
    }
  }

  uint64_t imgDue64 = (uint64_t)g_lastImageUnix + (uint64_t)(unsigned)currentShowTimer * 60ULL;
  if (imgDue64 > 0xFFFFFFFFULL) imgDue64 = 0xFFFFFFFFULL;
  uint32_t imgDue = (uint32_t)imgDue64;

  uint32_t polDue = (g_lastPollUnix == 0) ? (now + 60u) : (g_lastPollUnix + 60u);

  uint32_t secImg = (imgDue > now) ? (imgDue - now) : 1u;
  uint32_t secPol = (polDue > now) ? (polDue - now) : 1u;
  uint32_t sec = secImg < secPol ? secImg : secPol;
  if (sec < 15u) return false;
  const uint32_t kMaxDeepSec = 8u * 3600u;
  if (sec > kMaxDeepSec) sec = kMaxDeepSec;

  uint8_t dsAct = (secImg <= secPol) ? 1u : 2u;

  preferences.begin("microPhotoFrame", false);
  preferences.putInt("sImgIx", currentImageIndex);
  preferences.putUChar("dsAct", dsAct);
  preferences.end();

  Serial1.printf("Deep sleep %lu s (dsAct=%u, bis Bild=%lu, bis Poll=%lu)\n",
                 (unsigned long)sec, (unsigned)dsAct, (unsigned long)secImg, (unsigned long)secPol);
  Serial1.flush();

  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_OFF);

  esp_sleep_disable_wakeup_source(ESP_SLEEP_WAKEUP_ALL);
  esp_sleep_enable_timer_wakeup((uint64_t)sec * 1000000ULL);
#if PHOTOFRAME_HAS_BUTTONS && (defined(CONFIG_IDF_TARGET_ESP32S3) || defined(CONFIG_IDF_TARGET_ESP32) || defined(CONFIG_IDF_TARGET_ESP32S2))
  uint64_t extMask = (1ULL << (uint8_t)BTN_ACTION) | (1ULL << (uint8_t)BTN_NEXT) | (1ULL << (uint8_t)BTN_PREV);
  esp_sleep_enable_ext1_wakeup(extMask, ESP_EXT1_WAKEUP_ANY_LOW);
#endif

  esp_deep_sleep_start();
  return true;
}

static bool isShowTempOverrideActive() {
  if (showTempOverrideUntilSessionMs == 0) return false;
  return sessionMs() < showTempOverrideUntilSessionMs;
}

// Captive-Portal DNS only when Soft-AP aktiv (sonst kein dnsServer.processNextRequest)
bool dnsServerActive = false;

#if !PHOTOFRAME_HAS_BUTTONS
static bool shouldOfferBootConfigAp() {
  return !g_wDeepImg && !g_wDeepPoll && !g_wDeepRest;
}
#else
static bool shouldOfferBootConfigAp() {
  return false;
}
#endif

/** Offenes 2,4-GHz-WLAN fürs Handy. 192.168.4.1 nur in diesem Netz. */
static bool startFrameSoftAp() {
  WiFi.mode(WIFI_AP_STA);
  IPAddress apIP(192, 168, 4, 1);
  IPAddress gw(192, 168, 4, 1);
  IPAddress mask(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, gw, mask);
  if (!WiFi.softAP("microPhotoFrame", nullptr, 6, 0, 4)) {
    Serial1.println("Soft-AP microPhotoFrame failed");
    return false;
  }
  delay(250);
  dnsServer.stop();
  dnsServer.start(53, "*", WiFi.softAPIP());
  dnsServerActive = true;
  Serial1.print("Soft-AP microPhotoFrame ");
  Serial1.println(WiFi.softAPIP());
  return true;
}

static bool startBootConfigAp() {
  if (!startFrameSoftAp()) {
    Serial1.println("Boot config AP failed");
    return false;
  }
  bootConfigApActive = true;
  // Tasterlos und ohne Deep Sleep: AP bleibt, sonst verpasst das Handy das 5-min-Fenster.
  if (PHOTOFRAME_HAS_BUTTONS || configSlideshowDeepSleep) {
    bootConfigApUntilSessionMs = sessionMs() + CONFIG_MODE_TIMEOUT;
    Serial1.println("Boot config AP 5 min");
  } else {
    bootConfigApUntilSessionMs = 0;
    Serial1.println("Boot config AP bleibt (kein Taster)");
  }
  return true;
}

static void stopBootConfigAp() {
  if (!bootConfigApActive) return;
  dnsServer.stop();
  dnsServerActive = false;
  WiFi.softAPdisconnect(true);
  if (WiFi.status() == WL_CONNECTED) {
    WiFi.mode(WIFI_STA);
  }
  bootConfigApActive = false;
  bootConfigApUntilSessionMs = 0;
  Serial1.println("Boot config AP closed");
}

// === SD Card Status ===
bool sdCardMounted = false;
/** Nach fehlgeschlagenem SD.begin (Karte meldet sich, Mount klappt nicht): kein SD.begin spam. */
bool sdLazyMountFailed = false;

static void appendRuntimeLog(const char* tag, const String& detail = String()) {
  String line = String("[ses=") + String((unsigned long)(sessionMs() / 1000UL)) + "s] ";
  line += tag;
  line += " ";
  if (detail.length()) line += detail;
  if (line.length() > 220) line = line.substring(0, 220);
  Serial1.println(line);
  preferences.begin("mpfDiag", false);
  preferences.putString("lastErr", line);
  preferences.end();
  if (sdCardMounted) {
    File f = SD.open("/error_log.txt", FILE_APPEND);
    if (f) {
      f.println(line);
      f.close();
    }
  }
}

// === MPU6050 Orientation Sensor ===
bool mpu6050Available = false;
int currentOrientation = 0; // 0=landscape, 1=portrait, 2=landscape_180, 3=portrait_180
uint64_t lastOrientationCheckSessionMs = 0;
const unsigned long ORIENTATION_CHECK_INTERVAL = 1000; // Check every second
const float ORIENTATION_THRESHOLD = 0.5; // Threshold for orientation change (g-force)
std::vector<String> allShowImages; // Store all images before filtering
/** Hash der Server-„imgs“-Liste der zuletzt erfolgreich geladenen Show (gleicher Show-Name, neue Bilder). */
static uint32_t loadedShowImagesFingerprint = 0;

#if PHOTOFRAME_HAS_MPU6050
int16_t readMPU6050Register(uint8_t reg) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(static_cast<uint8_t>(MPU6050_ADDR), static_cast<size_t>(2), true);
  return (Wire.read() << 8) | Wire.read();
}
#endif

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
  hostServerUrl = preferences.getString("hostUrl", "");
  hostUser = preferences.getString("hostUser", "");
  hostTarget = preferences.getString("hostTgt", "");
  uiLid = preferences.getString("uiLid", "");
  parseLegacyHostParts();
  applyHostParts();
  uint8_t o = preferences.getUChar("defOrient", 0);
  if (o > 3) o = 0;
  configDefaultOrientation = o;
  lastDisplayedInkName = preferences.getString("lastInk", "");
  currentShowName = preferences.getString("lastShow", "");
  unsigned rm = preferences.getUShort("qRevMin", 60);
  if (rm < 1) rm = 60;
  if (rm > 1440) rm = 1440;
  quickMenuRevertMinutes = (uint16_t)rm;
  showTempOverrideUntilSessionMs = 0;
#if !PHOTOFRAME_HAS_BUTTONS && (PHOTOFRAME_DEEP_SLEEP_DEFAULT == 0)
  // 1.1/1.2 wrote dSleep=1 for every board. NeoFrame + powerbank: one-shot off.
  if (!preferences.isKey("dsNfOk")) {
    preferences.putUChar("dSleep", 0);
    preferences.putUChar("dsNfOk", 1);
  }
#elif !PHOTOFRAME_HAS_BUTTONS && (PHOTOFRAME_DEEP_SLEEP_DEFAULT == 1)
  // Waveshare: eigene Ladelogik, nicht NeoFrame. Einmalig an, falls dsNfOk es ausgeschaltet hat.
  if (!preferences.isKey("dsWsOk")) {
    preferences.putUChar("dSleep", 1);
    preferences.putUChar("dsWsOk", 1);
  }
#endif
  if (!preferences.isKey("dSleep")) {
    preferences.putUChar("dSleep", kDeepSleepDefault);
  }
  configSlideshowDeepSleep = (preferences.getUChar("dSleep", kDeepSleepDefault) != 0);
  g_lastImageUnix = preferences.getUInt("lstImgT", 0);
  g_lastPollUnix = preferences.getUInt("lstPolT", 0);
  preferences.end();
  
  Serial1.print("Loaded config - SSID: ");
  Serial1.print(wifiSSID);
  Serial1.print(", hostUrl: ");
  Serial1.print(hostServerUrl);
  Serial1.print(", user: ");
  Serial1.print(hostUser);
  Serial1.print(", channel: ");
  Serial1.print(hostChannelUrl);
  Serial1.print(", defOrient: ");
  Serial1.print((int)configDefaultOrientation);
  Serial1.print(", lastInk len: ");
  Serial1.print(lastDisplayedInkName.length());
  Serial1.print(", lastShow: ");
  Serial1.print(currentShowName);
  Serial1.print(", deepSleep: ");
  Serial1.println(configSlideshowDeepSleep ? "on" : "off");
}

void saveConfig() {
  preferences.begin("microPhotoFrame", false);
  preferences.putString("wifiSSID", wifiSSID);
  preferences.putString("wifiPassword", wifiPassword);
  preferences.putString("hostUrl", hostServerUrl);
  preferences.putString("hostUser", hostUser);
  preferences.putString("hostTgt", hostTarget);
  preferences.putString("hostChannelUrl", hostChannelUrl);
  preferences.putString("uiLid", uiLid);
  preferences.putUChar("defOrient", configDefaultOrientation);
  preferences.end();
  Serial1.print("Config saved url=");
  Serial1.print(hostServerUrl);
  Serial1.print(" user=");
  Serial1.println(hostUser);
}

/** Persist server URL + user immediately (Laden must not wait for Speichern). */
static void persistHostIdentity() {
  preferences.begin("microPhotoFrame", false);
  preferences.putString("hostUrl", hostServerUrl);
  preferences.putString("hostUser", hostUser);
  if (hostTarget.length() > 0) preferences.putString("hostTgt", hostTarget);
  if (hostChannelUrl.length() > 0) preferences.putString("hostChannelUrl", hostChannelUrl);
  preferences.end();
  Serial1.print("Host identity saved url=");
  Serial1.print(hostServerUrl);
  Serial1.print(" user=");
  Serial1.println(hostUser);
}

static JsonDocument fwI18nDoc;
static bool fwI18nReady = false;

static String fwResolvedLid() {
  if (uiLid == "de-DE" || uiLid.startsWith("de")) return "de-DE";
  if (uiLid == "zh-CN" || uiLid.startsWith("zh")) return "zh-CN";
  return "en-US";
}

static void ensureFwI18n() {
  if (fwI18nReady) return;
  fwI18nReady = deserializeJson(fwI18nDoc, I18N_FW_JSON) == DeserializationError::Ok;
}

static String fwT(const char* key) {
  ensureFwI18n();
  if (!fwI18nReady || !key) return String(key ? key : "");
  const char* v = fwI18nDoc[fwResolvedLid()][key];
  if (!v) v = fwI18nDoc["en-US"][key];
  return v ? String(v) : String(key);
}

static void persistUiLid() {
  preferences.begin("microPhotoFrame", false);
  preferences.putString("uiLid", uiLid);
  preferences.end();
}

static String usbCfgLine;

static void processUsbConfigLine(const String& line) {
  if (line == "CFG") {
    Serial.println("CFG WIFI <ssid>");
    Serial.println("CFG PASS <password>");
    Serial.println("CFG URL <http://host:port>");
    Serial.println("CFG USER <userId>");
    Serial.println("CFG GROUP <groupId>");
    Serial.println("CFG SAVE");
    Serial.print("ssid=");
    Serial.println(wifiSSID);
    Serial.print("url=");
    Serial.println(hostServerUrl);
    Serial.print("userId=");
    Serial.println(hostUser);
    Serial.print("groupId=");
    Serial.println(hostTarget);
    return;
  }
  if (line.startsWith("CFG WIFI ")) {
    wifiSSID = line.substring(9);
    wifiSSID.trim();
    Serial.println("OK WIFI");
    return;
  }
  if (line.startsWith("CFG PASS ")) {
    wifiPassword = line.substring(9);
    Serial.println("OK PASS");
    return;
  }
  if (line.startsWith("CFG URL ")) {
    hostServerUrl = normalizeServerUrl(line.substring(8));
    applyHostParts();
    Serial.println("OK URL");
    return;
  }
  if (line.startsWith("CFG USER ")) {
    hostUser = line.substring(9);
    hostUser.trim();
    applyHostParts();
    Serial.println("OK USER");
    return;
  }
  if (line.startsWith("CFG GROUP ") || line.startsWith("CFG TARGET ")) {
    hostTarget = line.substring(line.startsWith("CFG GROUP ") ? 10 : 11);
    hostTarget.trim();
    applyHostParts();
    Serial.println("OK GROUP");
    return;
  }
  if (line == "CFG SAVE") {
    if (wifiSSID.length() == 0 || hostServerUrl.length() == 0 || hostUser.length() == 0 || hostTarget.length() == 0) {
      Serial.println("ERR SAVE need WIFI, URL, USER, GROUP");
      return;
    }
    saveConfig();
    Serial.println("OK SAVE");
    Serial.flush();
    delay(200);
    ESP.restart();
  }
}

static void processUsbConfig() {
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\r') continue;
    if (c != '\n') {
      if (usbCfgLine.length() < 240) usbCfgLine += c;
      continue;
    }
    usbCfgLine.trim();
    if (usbCfgLine.length() > 0) processUsbConfigLine(usbCfgLine);
    usbCfgLine = "";
  }
}

void clearConfig() {
  preferences.begin("microPhotoFrame", false);
  preferences.clear();
  preferences.end();
  wifiSSID = "";
  wifiPassword = "";
  hostServerUrl = "";
  hostUser = "";
  hostTarget = "";
  hostChannelUrl = "";
  uiLid = "";
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
  if (!sdCardPresent()) return false;
  if (sdLazyMountFailed) return false;
  if (sdMount()) {
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

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><link rel='icon' href='/favicon.ico' type='image/x-icon'><title>microPhotoFrame</title>";
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
  html += "<img src='/logotext' alt='&micro;PhotoFrame&trade;' onerror=\"this.style.display='none'\">";
  html += "</div>";
  html += "<h1 data-i18n='title'>Configuration</h1>";
  html += "<label data-i18n='language'>Language</label>";
  html += "<select id='uiLid' name='lid'>";
  html += "<option value='auto'>Auto (browser)</option>";
  html += "<option value='en-US'>English</option>";
  html += "<option value='de-DE'>Deutsch</option>";
  html += "<option value='zh-CN'>中文</option>";
  html += "</select>";
  if (WiFi.status() == WL_CONNECTED) {
    html += "<div class='status ok'><span data-i18n='homeNet'>Home WiFi</span> ";
    html += htmlEscapeSsid(wifiSSID);
    html += " &middot; ";
    html += WiFi.localIP().toString();
    html += "</div>";
  }
  if (bootConfigApActive) {
    unsigned long leftSec = 0;
    if (bootConfigApUntilSessionMs > sessionMs())
      leftSec = (unsigned long)((bootConfigApUntilSessionMs - sessionMs()) / 1000ULL);
    html += "<div class='status ok'><span data-i18n='apOpen'>Direct WiFi microPhotoFrame (open)</span> &middot; http://";
    html += WiFi.softAPIP().toString();
    html += "/ &middot; ";
    html += String(leftSec / 60);
    html += ":";
    if ((leftSec % 60) < 10) html += "0";
    html += String(leftSec % 60);
    html += "</div>";
  } else if (WiFi.status() == WL_CONNECTED) {
    html += "<div class='status warn' data-i18n='phoneHint'>Phone: join open WiFi microPhotoFrame (2.4 GHz), turn off mobile data, then http://192.168.4.1 — not the home WiFi.</div>";
  }

  html += "<div class='status ok' id='scanStatus' data-i18n='scanReady'>Page ready. WiFi list loads in the background…</div>";

  html += "<form method='POST' action='/save' id='cfgform'>";
  html += "<input type='hidden' name='lid' id='lidField' value=''>";
  html += "<label data-i18n='ssid'>WiFi SSID</label>";
  html += "<select name='ssid' id='ssid'>";
  html += "<option value='' data-i18n='ssidChoose'>-- Choose WiFi --</option>";
  if (wifiSSID.length() > 0) {
    html += "<option value='" + htmlEscapeSsid(wifiSSID) + "' selected>" + htmlEscapeSsid(wifiSSID) + "</option>";
  }
  html += "</select>";
  html += "<a href='#' id='rescanLink' style='font-size:12px;' data-i18n='rescan'>Scan again</a>";
  html += "<input type='text' name='ssid_manual' id='ssid_manual' data-i18n-placeholder='ssidManual' placeholder='or enter SSID manually' style='margin-top:5px;' autocomplete='off'>";
  html += "<label data-i18n='password'>WiFi password</label>";
  html += "<div class='password-wrapper'>";
  html += "<input type='password' name='password' id='password' value='" + htmlEscapeSsid(wifiPassword) + "'>";
  html += "<button type='button' class='password-toggle' onclick='togglePassword()'>&#128065;</button>";
  html += "</div>";
  html += "<label data-i18n='serverUrl'>Server URL</label><input type='text' name='url' id='hostUrl' value='" + htmlEscapeSsid(hostServerUrl.length() ? hostServerUrl : hostChannelUrl) + "' placeholder='http://192.168.1.10:888'><br>";
  html += "<small style='color:#666;' data-i18n='serverUrlHint'>Host and port only, e.g. http://192.168.1.10:888</small><br>";
  html += "<label data-i18n='userId'>User ID</label><input type='text' name='user' id='hostUser' value='" + htmlEscapeSsid(hostUser) + "' placeholder='userid' autocomplete='off'><br>";
  html += "<label data-i18n='groupId'>Group ID</label>";
  html += "<div style='display:flex;gap:8px;align-items:center;'>";
  html += "<select name='group' id='hostGroup' style='flex:1'>";
  if (hostTarget.length() > 0) {
    html += "<option value='" + htmlEscapeSsid(hostTarget) + "' selected>" + htmlEscapeSsid(hostTarget) + "</option>";
  } else {
    html += "<option value='' data-i18n='groupsPlaceholder'>-- Load groups --</option>";
  }
  html += "</select>";
  html += "<button type='button' id='loadTargetsBtn' style='width:auto;margin:0;padding:10px 12px;' data-i18n='loadGroups'>Load</button>";
  html += "</div>";
  html += "<small style='color:#666;'><span data-i18n='displayHint'>Display comes from this device</span>: " + htmlEscapeSsid(String(PHOTOFRAME_TARGET_NAME)) + " (" + htmlEscapeSsid(String(DEVICE_DISPLAY_ID)) + ")</small><br>";
  html += "<div class='status warn' id='targetStatus' style='display:none'></div>";
  html += "<label data-i18n='orient'>Default orientation</label>";
  html += "<select name='def_orient' id='def_orient'>";
  html += "<option value='0'" + String(configDefaultOrientation == 0 ? " selected" : "") + " data-i18n='orient0'>Landscape (0&deg;)</option>";
  html += "<option value='1'" + String(configDefaultOrientation == 1 ? " selected" : "") + " data-i18n='orient1'>Portrait (90&deg;)</option>";
  html += "<option value='2'" + String(configDefaultOrientation == 2 ? " selected" : "") + " data-i18n='orient2'>Landscape flipped (180&deg;)</option>";
  html += "<option value='3'" + String(configDefaultOrientation == 3 ? " selected" : "") + " data-i18n='orient3'>Portrait flipped (270&deg;)</option>";
  html += "</select>";
#if PHOTOFRAME_HAS_MPU6050
  html += "<small style='color:#666;' data-i18n='orientMpu'>With a built-in sensor the pose is detected automatically; this value applies only without a sensor.</small><br>";
#else
  html += "<small style='color:#666;' data-i18n='orientNoMpu'>This device has no pose sensor. The chosen orientation is fixed.</small><br>";
#endif
#if !PHOTOFRAME_HAS_BUTTONS
  html += "<input type='hidden' name='deep_sleep_present' value='1'>";
  html += "<label style='display:flex;align-items:flex-start;gap:10px;margin-top:12px;text-align:left;'>";
  html += "<input type='checkbox' name='deep_sleep' value='1' style='width:auto;margin-top:4px;'";
  if (configSlideshowDeepSleep) html += " checked";
  html += ">";
#if PHOTOFRAME_DEEP_SLEEP_DEFAULT
  html += "<span data-i18n='deepSleepWs'>Deep Sleep between images. On by default on this board (own power/charge circuit).</span></label>";
#else
  html += "<span data-i18n='deepSleep'>Deep Sleep between images. Off by default on NeoFrame: power banks cut power when current is low. Enable only with a wall supply.</span></label>";
#endif
#endif
  html += "<button type='submit' data-i18n='save'>Save</button>";
  html += "</form>";
  html += "<p style='color:#666;font-size:13px;margin-top:16px;'>" + firmwareVersionLabel() + "</p>";
  html += "<script>var I18N=";
  html += I18N_FW_JSON;
  html += ";var savedLid='";
  html += htmlEscapeSsid(uiLid.length() ? uiLid : "auto");
  html += "';";
  html += "function bestLid(){if(savedLid&&savedLid!=='auto'&&I18N[savedLid])return savedLid;var n=(navigator.language||'en-US').replace('_','-');if(I18N[n])return n;var p=n.split('-')[0];if(p==='de')return 'de-DE';if(p==='zh')return 'zh-CN';return 'en-US';}";
  html += "function t(k){var pack=I18N[bestLid()]||I18N['en-US']||{};return pack[k]||(I18N['en-US']&&I18N['en-US'][k])||k;}";
  html += "function applyI18n(){var pack=I18N[bestLid()]||{};document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(pack[k])el.textContent=pack[k];});document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){var k=el.getAttribute('data-i18n-placeholder');if(pack[k])el.placeholder=pack[k];});document.documentElement.lang=bestLid();var s=document.getElementById('uiLid');if(s)s.value=savedLid||'auto';var hf=document.getElementById('lidField');if(hf)hf.value=savedLid||'auto';}";
  html += "applyI18n();";
  html += "var lidSel=document.getElementById('uiLid');if(lidSel)lidSel.addEventListener('change',function(){savedLid=lidSel.value||'auto';applyI18n();fetch('/lang',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'lid='+encodeURIComponent(savedLid)});});";
  html += "document.getElementById('ssid').addEventListener('change',function(e){";
  html += "if(e.target.value){document.getElementById('ssid_manual').value='';}";
  html += "});";
  html += "document.getElementById('ssid_manual').addEventListener('input',function(e){";
  html += "if(e.target.value.trim()){document.getElementById('ssid').selectedIndex=0;}";
  html += "});";
  html += "document.getElementById('cfgform').addEventListener('submit',function(e){";
  html += "var manual=document.getElementById('ssid_manual').value.trim();";
  html += "var sel=document.getElementById('ssid');";
  html += "var url=document.getElementById('hostUrl').value.trim();";
  html += "var user=document.getElementById('hostUser').value.trim();";
  html += "var target=document.getElementById('hostGroup').value.trim();";
  html += "if(!manual && !sel.value){";
  html += "e.preventDefault();alert(t('needSsid'));return;}";
  html += "if(!url){e.preventDefault();alert(t('needUrl'));return;}";
  html += "if(!user){e.preventDefault();alert(t('needUser'));return;}";
  html += "if(!target){e.preventDefault();alert(t('needGroup'));return;}";
  html += "if(manual){sel.disabled=true;";
  html += "var h=document.createElement('input');h.type='hidden';h.name='ssid';h.value=manual;this.appendChild(h);}";
  html += "});";
  html += "function togglePassword(){";
  html += "var pwd=document.getElementById('password');";
  html += "if(pwd.type==='password'){pwd.type='text';}else{pwd.type='password';}";
  html += "}";
  html += "function loadScan(){";
  html += "var st=document.getElementById('scanStatus');";
  html += "if(st)st.textContent=t('scanSearch');";
  html += "fetch('/scan').then(function(r){return r.json();}).then(function(list){";
  html += "var sel=document.getElementById('ssid'); if(!sel)return;";
  html += "var keep=sel.value;";
  html += "while(sel.options.length>1)sel.remove(1);";
  html += "list.forEach(function(n){var o=document.createElement('option');o.value=n.ssid;";
  html += "o.text=n.ssid+(n.encryption?' \\uD83D\\uDD12':' '+t('wifiOpen'))+' ('+n.rssi+' dBm)';sel.appendChild(o);});";
  html += "if(keep)sel.value=keep;";
  html += "if(st)st.textContent=(list.length||0)+' '+t('scanFound');";
  html += "}).catch(function(){if(st){st.className='status warn';st.textContent=t('scanFail');}});";
  html += "}";
  html += "function loadTargets(){";
  html += "var st=document.getElementById('targetStatus');";
  html += "var url=document.getElementById('hostUrl').value.trim();";
  html += "var user=document.getElementById('hostUser').value.trim();";
  html += "var ssid=document.getElementById('ssid_manual').value.trim()||document.getElementById('ssid').value;";
  html += "var password=document.getElementById('password').value;";
  html += "if(st){st.style.display='block';st.className='status ok';st.textContent=t('loadingGroups');}";
  html += "var body=new URLSearchParams();if(url)body.set('url',url);if(user)body.set('user',user);body.set('ssid',ssid);body.set('password',password);";
  html += "fetch('/targets',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()}).then(function(r){return r.json();}).then(function(data){";
  html += "var sel=document.getElementById('hostGroup'); if(!sel)return;";
  html += "var keep=sel.value; sel.innerHTML='';";
  html += "var list=(data&&data.output&&(data.output.groups||data.output.targets))||[];";
  html += "if(!data||!data.ok){if(st){st.className='status warn';st.textContent=(data&&data.error&&data.error.msg)||t('groupsFail');}return;}";
  html += "if(!list.length){sel.appendChild(new Option(t('noGroups'),''));if(st){st.className='status warn';st.textContent=t('noGroupsHint');}return;}";
  html += "list.forEach(function(g){var id=g.groupId||g.group||g.target;var o=new Option(id+(g.showName?' · '+g.showName:''),id);sel.appendChild(o);});";
  html += "if(keep)sel.value=keep; if(!sel.value&&list[0])sel.value=list[0].groupId||list[0].group||list[0].target;";
  html += "if(st){st.className='status ok';st.textContent=list.length+' '+t('groupsOk');}";
  html += "}).catch(function(){if(st){st.style.display='block';st.className='status warn';st.textContent=t('groupsNetFail');}});";
  html += "}";
  html += "var lt=document.getElementById('loadTargetsBtn');if(lt)lt.addEventListener('click',function(e){e.preventDefault();loadTargets();});";
  html += "if(document.getElementById('hostUrl').value.trim()&&document.getElementById('hostUser').value.trim())loadTargets();";
  html += "loadScan();";
  html += "var rs=document.getElementById('rescanLink');if(rs)rs.addEventListener('click',function(e){e.preventDefault();loadScan();});";
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
  String userIn = server.hasArg("user") ? server.arg("user") : (server.hasArg("userId") ? server.arg("userId") : "");
  userIn.trim();
  String targetIn = server.hasArg("group") ? server.arg("group") : "";
  if (targetIn.length() == 0 && server.hasArg("groupId")) targetIn = server.arg("groupId");
  if (targetIn.length() == 0 && server.hasArg("target")) targetIn = server.arg("target");
  targetIn.trim();
  if (urlIn.length() > 0 && userIn.length() > 0 && targetIn.length() > 0 &&
      (ssidIn.length() > 0 || wifiSSID.length() > 0)) {
    if (ssidIn.length() > 0) {
      wifiSSID = ssidIn;
      wifiPassword = server.hasArg("password") ? server.arg("password") : "";
    }
    if (server.hasArg("lid")) {
      uiLid = server.arg("lid");
      uiLid.trim();
    }
    hostTarget = targetIn;
    takeHostUrlAndUser(urlIn, userIn);
    if (hostUser.length() == 0 || hostTarget.length() == 0) {
      hostChannelUrl = urlIn;
      parseLegacyHostParts();
      applyHostParts();
    }
    if (server.hasArg("def_orient")) {
      int o = server.arg("def_orient").toInt();
      if (o >= 0 && o <= 3) configDefaultOrientation = (uint8_t)o;
    }
    if (server.hasArg("deep_sleep_present")) {
      configSlideshowDeepSleep = server.hasArg("deep_sleep");
      preferences.begin("microPhotoFrame", false);
      preferences.putUChar("dSleep", configSlideshowDeepSleep ? 1 : 0);
#if !PHOTOFRAME_HAS_BUTTONS
      preferences.putUChar("dsNfOk", 1);
#endif
      preferences.end();
    }
    saveConfig();
    
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>";
    html += fwT("savedTitle");
    html += "</title></head><body>";
    html += "<h1>";
    html += fwT("savedTitle");
    html += "</h1><p>";
    html += fwT("savedBody");
    html += "</p></body></html>";
    server.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/plain", fwT("missingParams"));
  }
}

void handleLang() {
  String lid = server.hasArg("lid") ? server.arg("lid") : "";
  lid.trim();
  if (lid == "en-US" || lid == "de-DE" || lid == "zh-CN" || lid == "auto" || lid.length() == 0) {
    uiLid = (lid == "auto") ? "" : lid;
    persistUiLid();
    server.send(200, "application/json", "{\"ok\":true}");
    return;
  }
  server.send(400, "application/json", "{\"ok\":false}");
}

void handleTargets() {
  String urlIn = server.hasArg("url") ? server.arg("url") : "";
  String userIn = server.hasArg("user") ? server.arg("user") : (server.hasArg("userId") ? server.arg("userId") : "");
  urlIn.trim();
  userIn.trim();
  if (urlIn.length() == 0) urlIn = hostServerUrl;
  if (userIn.length() == 0) userIn = hostUser;
  takeHostUrlAndUser(urlIn, userIn);
  if (hostServerUrl.length() == 0 || hostUser.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"error\":{\"msg\":\"Server-URL und User ID fehlen.\"}}");
    return;
  }
  persistHostIdentity();
  String ssidIn = server.hasArg("ssid") ? server.arg("ssid") : "";
  ssidIn.trim();
  if (ssidIn.length() > 0) {
    wifiSSID = ssidIn;
    wifiPassword = server.hasArg("password") ? server.arg("password") : wifiPassword;
    preferences.begin("microPhotoFrame", false);
    preferences.putString("wifiSSID", wifiSSID);
    preferences.putString("wifiPassword", wifiPassword);
    preferences.end();
  }
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiSSID.length() == 0) {
      server.send(503, "application/json", "{\"ok\":false,\"error\":{\"msg\":\"Zuerst ein WLAN wählen.\"}}");
      return;
    }
    WiFi.mode(WIFI_AP_STA);
    WiFi.setSleep(false);
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
      delay(200);
    }
  }
  if (WiFi.status() != WL_CONNECTED) {
    server.send(503, "application/json", "{\"ok\":false,\"error\":{\"msg\":\"Kein Heimnetz. WLAN prüfen, dann Targets laden.\"}}");
    return;
  }
  String saved = hostChannelUrl;
  hostChannelUrl = normalizeServerUrl(urlIn);
  JsonDocument requestDoc;
  requestDoc["input"]["user"] = userIn;
  requestDoc["input"]["userId"] = userIn;
  requestDoc["input"]["displayId"] = DEVICE_DISPLAY_ID;
  String requestJson;
  serializeJson(requestDoc, requestJson);
  String response = makeServerRequest("listTargets", requestJson);
  hostChannelUrl = saved;
  if (response.length() == 0) {
    server.send(502, "application/json", "{\"ok\":false,\"error\":{\"msg\":\"Server antwortet nicht.\"}}");
    return;
  }
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", response);
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
  configModeStartSessionMs = sessionMs();
  Serial1.println("Starting configuration mode...");
  
  startConfigAP();
  
  beginTextScreen();
  display.setTextSize(2);
  display.setCursor(20, 40);
  display.print(epdToAscii(fwT("epdConfig").c_str()));
  display.setTextSize(1);
  display.setCursor(20, 90);
  display.print(epdToAscii(fwT("epdWifi").c_str()));
  display.setCursor(20, 120);
  display.print(epdToAscii(fwT("epdOpen").c_str()));
  IPAddress IP = WiFi.softAPIP();
  display.setCursor(20, 150);
  display.print(epdToAscii(fwT("epdIp").c_str()));
  display.print(" ");
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

// .ink-Pixel liegen schon in nativer Panel-Lage. setRotation(1/2/3) + nextPage
// (paged) aktualisiert Spectra-6-Panels unvollständig. Text nutzt display()
// mit der Rahmen-Ausrichtung (currentOrientation).
static void useNativePanelRotation() {
  display.setRotation(0);
}

static bool g_epdInited = false;

static void ensureEpdInited() {
  if (g_epdInited) return;
  epdPowerOn();
  display.init(115200);
  g_epdInited = true;
}

static int frameTextRotation() {
  int rot = currentOrientation;
  if (rot < 0 || rot > 3) rot = 0;
  return rot;
}

static bool epdIsSmall() {
  return display.width() <= 250 || display.height() <= 250;
}

static String epdToAscii(const char* s) {
  String o;
  if (!s) return o;
  for (size_t i = 0; s[i]; ) {
    const uint8_t c = (uint8_t)s[i];
    if (c < 0x80) {
      o += (char)c;
      i++;
      continue;
    }
    if ((c & 0xE0) == 0xC0 && s[i + 1]) {
      const uint16_t u = ((uint16_t)(c & 0x1F) << 6) | ((uint8_t)s[i + 1] & 0x3F);
      if (u == 0xE4 || u == 0xC4) o += "ae";
      else if (u == 0xF6 || u == 0xD6) o += "oe";
      else if (u == 0xFC || u == 0xDC) o += "ue";
      else if (u == 0xDF) o += "ss";
      else o += '?';
      i += 2;
      continue;
    }
    i++;
  }
  return o;
}

static void epdPrintWrapped(const String& text, int16_t x, int16_t& y, uint8_t size) {
  String t = epdToAscii(text.c_str());
  t.trim();
  if (!t.length()) return;
  display.setTextSize(size);
  const int cw = 6 * (int)size;
  const int ch = 8 * (int)size;
  const int maxChars = (display.width() - x - 4) / cw;
  const int limit = maxChars < 1 ? 1 : maxChars;
  int i = 0;
  const int n = (int)t.length();
  while (i < n && y + ch <= display.height() - 2) {
    int remain = n - i;
    int take = remain < limit ? remain : limit;
    if (take == limit && remain > limit) {
      int brk = take;
      for (int k = take; k >= 4; k--) {
        const char c = t[i + k - 1];
        if (c == ' ' || c == '/' || c == '?' || c == '&' || c == ':') {
          brk = k;
          break;
        }
      }
      take = brk;
    }
    while (take > 0 && t[i + take - 1] == ' ') take--;
    if (take < 1) take = remain < limit ? remain : limit;
    display.setCursor(x, y);
    display.print(t.substring(i, i + take));
    y += ch + (epdIsSmall() ? 2 : 4);
    i += take;
    while (i < n && t[i] == ' ') i++;
  }
}

static void beginTextScreen() {
  // Always re-init: after .ink hibernate the panel is asleep. Rotation 1/2/3
  // on Spectra 6 leaves the right half of the 800×480 panel stale (startup
  // image or color noise). Text screens stay native landscape.
  epdPowerOn();
  display.init(115200);
  g_epdInited = true;
  display.setRotation(0);
  display.setFullWindow();
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);
}

static bool hasLastImageOnPanel() {
  return lastDisplayedInkName.length() > 0;
}

static void pumpWeb(uint32_t ms) {
  uint32_t t0 = millis();
  while (millis() - t0 < ms) {
    if (dnsServerActive) dnsServer.processNextRequest();
    server.handleClient();
    delay(10);
  }
}

static void showStatusScreen(const char* line1, const char* line2, const char* line3) {
  beginTextScreen();
  const bool small = epdIsSmall();
  const int16_t margin = small ? 6 : 20;
  const uint8_t bodySize = small ? 1 : 2;
  int16_t y = small ? 10 : 60;
  if (sdCardMounted && !small) {
    y = drawWebBrandingOnEpd(12);
    if (y < 100) y = 100;
    if (y > 300) y = 300;
  }
  if (line1) epdPrintWrapped(String(line1), margin, y, bodySize);
  if (line2 && line2[0]) {
    y += small ? 4 : 8;
    epdPrintWrapped(String(line2), margin, y, 1);
  }
  if (line3 && line3[0]) {
    y += small ? 4 : 10;
    epdPrintWrapped(String(line3), margin, y, 1);
  }
  display.setTextSize(1);
  display.display(false);
}

static void showStatusOrKeepLast(const char* line1, const char* line2, const char* line3) {
  if (hasLastImageOnPanel()) {
    Serial1.print("Status '");
    Serial1.print(line1);
    Serial1.println("' — letztes Bild bleibt sichtbar");
    return;
  }
  showStatusScreen(line1, line2, line3);
}

// === Forward Declarations ===
bool downloadImage(String imageName);
static String buildImageUrlForShow(const String& imageName, bool nested = true);
bool decodeAndDisplayInk(const String& filename, bool offlineHint = false);
bool decodeAndDisplayInkFromHTTP(const String& imageUrl, bool offlineHint = false);
bool isSDCardAvailable();
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

String extractChannelSlug(const String& url) {
  int q = url.indexOf("channel=");
  if (q >= 0) {
    int start = q + 8;
    int end = url.indexOf('&', start);
    if (end < 0) end = url.length();
    String s = url.substring(start, end);
    s.trim();
    if (s.endsWith("/")) s = s.substring(0, s.length() - 1);
    return s;
  }
  int p = url.indexOf("/shows/");
  int prefixLen = 7;
  if (p < 0) { p = url.indexOf("/c/"); prefixLen = 3; }
  if (p >= 0) {
    int start = p + prefixLen;
    int end = url.length();
    for (int i = start; i < (int)url.length(); i++) {
      char c = url[i];
      if (c == '?' || c == '#') { end = i; break; }
    }
    String s = url.substring(start, end);
    while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
    return s;
  }
  return "";
}

static String pathDisplayId() {
  return String(DEVICE_DISPLAY_ID);
}

static bool displayIdsEqual(const String& a, const String& b) {
  return a.length() > 0 && a == b;
}

static String normalizeServerUrl(String url) {
  url.trim();
  int q = url.indexOf('?');
  if (q >= 0) url = url.substring(0, q);
  int hash = url.indexOf('#');
  if (hash >= 0) url = url.substring(0, hash);
  int scheme = url.indexOf("://");
  int start = (scheme >= 0) ? scheme + 3 : 0;
  int pathSlash = url.indexOf('/', start);
  if (pathSlash >= 0) url = url.substring(0, pathSlash);
  if (url.length() == 0) return "";
  if (!url.endsWith("/")) url += "/";
  return url;
}

static void applyHostParts() {
  if (hostServerUrl.length() == 0 || hostUser.length() == 0 || hostTarget.length() == 0) return;
  hostChannelUrl = hostServerUrl + "shows/" + hostUser + "/" + hostTarget + "/" + pathDisplayId();
}

static void takeHostUrlAndUser(String urlIn, String userIn) {
  urlIn.trim();
  userIn.trim();
  if (urlIn.length() > 0 && userIn.length() == 0) {
    String slug = extractChannelSlug(urlIn);
    int a = slug.indexOf('/');
    int b = slug.lastIndexOf('/');
    if (a > 0 && b > a) {
      userIn = slug.substring(0, a);
      if (hostTarget.length() == 0) hostTarget = slug.substring(a + 1, b);
    }
  }
  if (urlIn.length() > 0) hostServerUrl = normalizeServerUrl(urlIn);
  if (userIn.length() > 0) hostUser = userIn;
  applyHostParts();
}

static void parseLegacyHostParts() {
  if (hostServerUrl.length() == 0 && hostChannelUrl.length() > 0) {
    hostServerUrl = normalizeServerUrl(hostChannelUrl);
  }
  if (hostUser.length() > 0) return;
  String slug = extractChannelSlug(hostChannelUrl);
  int a = slug.indexOf('/');
  int b = slug.lastIndexOf('/');
  if (a > 0 && b > a) {
    hostUser = slug.substring(0, a);
    hostTarget = slug.substring(a + 1, b);
  }
}

String serverOriginFromHost() {
  String baseUrl = hostChannelUrl;
  int queryPos = baseUrl.indexOf("?");
  if (queryPos >= 0) baseUrl = baseUrl.substring(0, queryPos);
  int scheme = baseUrl.indexOf("://");
  int start = (scheme >= 0) ? scheme + 3 : 0;
  int pathSlash = baseUrl.indexOf('/', start);
  if (pathSlash >= 0) baseUrl = baseUrl.substring(0, pathSlash);
  if (!baseUrl.endsWith("/")) baseUrl += "/";
  return baseUrl;
}

const char* noShowStatusTitle() {
  return lastChannelUnintended ? "Falscher Kanal" : "Keine Show";
}

static String withDeviceInfo(String jsonPayload) {
  JsonDocument req;
  if (jsonPayload.length() > 0) {
    DeserializationError err = deserializeJson(req, jsonPayload);
    if (err) {
      req.clear();
    }
  }
  JsonObject input = req["input"].is<JsonObject>() ? req["input"].as<JsonObject>() : req["input"].to<JsonObject>();
  JsonObject device = input["deviceInfo"].to<JsonObject>();
  device["displayId"] = DEVICE_DISPLAY_ID;
  device["name"] = PHOTOFRAME_TARGET_NAME;
  device["ip"] = WiFi.localIP().toString();
  device["showName"] = currentShowName;
  device["imgName"] = (currentImageIndex >= 0 && currentImageIndex < (int)currentShowImages.size())
      ? currentShowImages[currentImageIndex] : "";
  String out;
  serializeJson(req, out);
  return out;
}

String makeServerRequest(String action, String jsonPayload) {
  PowerHighScope _pwrSrv;
  jsonPayload = withDeviceInfo(jsonPayload);
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

  // Primary URL (relies on server-side URL rewrite).
  // Always use a path ("/") before "?": IIS returns HTTP 400 empty for
  // "http://host:888?action=getShows" as sent by ESP32 HTTPClient.
  String channelSlug = extractChannelSlug(hostChannelUrl);
  String url = hostChannelUrl;
  int qpos = url.indexOf('?');
  if (qpos >= 0) url = url.substring(0, qpos);
  int scheme = url.indexOf("://");
  int pathSlash = (scheme >= 0) ? url.indexOf('/', scheme + 3) : url.indexOf('/');
  if (pathSlash < 0) url += "/";
  url += "?action=" + action;
  if (channelSlug.length() > 0) url += "&channel=" + channelSlug;

  Serial1.print("Requesting URL: ");
  Serial1.println(url);

  String response = doHttpPost(url, jsonPayload);
  if (response.length() > 0) return response;

  // Fallback: POST directly to ASPX handler (bypasses URL Rewrite)
  if (g_lastHttpStatusCode == 405 || g_lastHttpStatusCode == 404 || g_lastHttpStatusCode == 400) {
    String fallbackUrl = serverOriginFromHost() + "aspx/microPhotoFrame.aspx?action=" + action;
    if (channelSlug.length() > 0) fallbackUrl += "&channel=" + channelSlug;
    Serial1.print("Fallback URL: ");
    Serial1.println(fallbackUrl);
    response = doHttpPost(fallbackUrl, jsonPayload);
    if (response.length() > 0) return response;
  }

  return "";
}

// --- Fingerprint der Bildliste (getShow): Reload wenn Server imgs sich ändern, Show-Name gleich ---
static uint32_t hashShowNameList(uint32_t h, const String& name) {
  for (unsigned int i = 0; i < name.length(); i++) {
    h = ((h << 5) + h) + (uint8_t)name.charAt(i);
  }
  return h;
}

static uint32_t computeFilteredImagesFingerprint() {
  uint32_t h = 5381;
  h = hashShowNameList(h, currentShowName);
  h = ((h << 5) + h) + (uint8_t)currentOrientation;
  for (size_t i = 0; i < currentShowImages.size(); i++) {
    h = hashShowNameList(h, currentShowImages[i]);
  }
  const size_t n = currentShowImages.size();
  h ^= (uint32_t)(n ^ (n << 16)) ^ 0xA5A5A5A5u;
  return h;
}

static size_t randomCycleByteCount(size_t n) {
  return (n + 7) / 8;
}

static bool randomCycleBit(size_t i) {
  if ((i >> 3) >= g_rndSeen.size()) return true;
  return (g_rndSeen[i >> 3] >> (i & 7)) & 1;
}

static void randomCycleSetBit(size_t i) {
  if ((i >> 3) >= g_rndSeen.size()) return;
  g_rndSeen[i >> 3] |= (uint8_t)(1u << (i & 7));
}

static void randomCycleClearBits() {
  for (size_t i = 0; i < g_rndSeen.size(); i++) g_rndSeen[i] = 0;
}

static int randomCycleUnseenCount(size_t n) {
  int c = 0;
  for (size_t i = 0; i < n; i++) {
    if (!randomCycleBit(i)) c++;
  }
  return c;
}

static void randomCyclePersist() {
  if (!g_rndPersist || !g_rndCycleOn) return;
  preferences.begin("microPhotoFrame", false);
  preferences.putUInt("rndFp", g_rndListFp);
  preferences.putUShort("rndN", (uint16_t)currentShowImages.size());
  if (!g_rndSeen.empty()) {
    preferences.putBytes("rndBits", g_rndSeen.data(), g_rndSeen.size());
  }
  preferences.end();
}

static void randomCyclePrepare() {
  g_rndCycleOn = false;
  g_rndPersist = false;
  g_rndSeen.clear();
  g_rndListFp = 0;
  if (currentShowMode != "random") return;

  const size_t n = currentShowImages.size();
  if (n == 0 || n > kRandomCycleMaxImages) {
    Serial1.printf("random cycle off (n=%u, max=%u)\n",
                   (unsigned)n, (unsigned)kRandomCycleMaxImages);
    return;
  }

  const size_t bytes = randomCycleByteCount(n);
  g_rndSeen.assign(bytes, 0);
  g_rndCycleOn = true;
  g_rndPersist = (bytes <= kRandomCycleNvsMaxBytes);
  g_rndListFp = computeFilteredImagesFingerprint();

  if (g_rndPersist) {
    preferences.begin("microPhotoFrame", false);
    const uint32_t savedFp = preferences.getUInt("rndFp", 0);
    const uint16_t savedN = preferences.getUShort("rndN", 0);
    if (savedFp == g_rndListFp && savedN == (uint16_t)n &&
        preferences.getBytesLength("rndBits") == bytes) {
      preferences.getBytes("rndBits", g_rndSeen.data(), bytes);
      Serial1.printf("random cycle restored unseen=%d/%u\n",
                     randomCycleUnseenCount(n), (unsigned)n);
    } else {
      preferences.putUInt("rndFp", g_rndListFp);
      preferences.putUShort("rndN", (uint16_t)n);
      preferences.putBytes("rndBits", g_rndSeen.data(), bytes);
      Serial1.printf("random cycle new n=%u persist=1\n", (unsigned)n);
    }
    preferences.end();
  } else {
    Serial1.printf("random cycle RAM-only n=%u (no NVS, bits=%u)\n",
                   (unsigned)n, (unsigned)bytes);
  }
}

static int pickRandomImageIndex(int prevIndex) {
  const size_t n = currentShowImages.size();
  if (n == 0) return 0;
  if (n == 1) return 0;

  if (g_rndCycleOn && g_rndSeen.size() == randomCycleByteCount(n)) {
    int unseen = randomCycleUnseenCount(n);
    if (unseen <= 0) {
      Serial1.println("random cycle complete — new cycle");
      randomCycleClearBits();
      unseen = (int)n;
    }
    const bool skipPrev =
        prevIndex >= 0 && (size_t)prevIndex < n && unseen > 1 && !randomCycleBit((size_t)prevIndex);
    int pool = skipPrev ? unseen - 1 : unseen;
    uint32_t k = esp_random() % (uint32_t)pool;
    for (size_t i = 0; i < n; i++) {
      if (skipPrev && (int)i == prevIndex) continue;
      if (randomCycleBit(i)) continue;
      if (k == 0) return (int)i;
      k--;
    }
  }

  uint32_t r = esp_random() % (uint32_t)(n - 1);
  int next = (int)r;
  if (prevIndex >= 0 && next >= prevIndex) next++;
  return next;
}

static void randomCycleMarkShown(int index) {
  if (!g_rndCycleOn || index < 0) return;
  if ((size_t)index >= currentShowImages.size()) return;
  randomCycleSetBit((size_t)index);
  randomCyclePersist();
}

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
  lastChannelUnintended = false;
  
  String response = makeServerRequest("getShows");
  if (response.length() == 0) {
    lastGetShowError = "HTTP " + String(g_lastHttpStatusCode) + " empty resp";
    Serial1.println(lastGetShowError);
    appendRuntimeLog("getShows", lastGetShowError);
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
    lastChannelUnintended = false;
    return false;
  }
  
  // Cache erst NACH JSON-Validierung setzen (nie HTML-Fehlerseiten cachen)
  cachedShowsJson = response;
  lastChannelUnintended = false;

  JsonVariant channelVar = doc["output"]["channel"];
  const char* channelError = doc["output"]["channelError"] | "";
  JsonVariant channelsVar = doc["output"]["shows"]["channels"];
  bool hasChannelModel = channelsVar.is<JsonObject>();
  if (!hasChannelModel) {
    const char* defCh = doc["output"]["shows"]["defaultChannel"] | "";
    hasChannelModel = defCh[0] != 0;
  }

  String newShowName = "";
  if (hasChannelModel) {
    if (!channelVar.is<JsonObject>() || (channelError && channelError[0])) {
      lastGetShowError = (channelError && strcmp(channelError, "unknown") == 0)
        ? "Kanal in der URL unbekannt"
        : "Kein Default-Kanal";
      lastChannelUnintended = true;
      lastGetShowsSucceeded = true;
      Serial1.println(lastGetShowError);
      return false;
    }
    const char* chDisplay = channelVar["displayId"] | "";
    const char* chSlug = channelVar["slug"] | "";
    currentChannelPath = chSlug;
    Serial1.print("Channel ");
    Serial1.print(chSlug);
    Serial1.print(" display=");
    Serial1.println(chDisplay);
    if (!chDisplay[0] || displayIdsEqual(chDisplay, DEVICE_DISPLAY_ID)) {
      newShowName = channelVar["showName"] | "";
    }
  }
  if (newShowName.length() == 0) {
    JsonObject activeShows = doc["output"]["shows"]["activeShows"];
    if (activeShows.isNull()) {
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
    String availableIds = "";
    for (JsonPair kv : activeShows) {
      if (availableIds.length() > 0) availableIds += ",";
      availableIds += String(kv.key().c_str()) + "=" + kv.value().as<String>();
    }
    Serial1.println(availableIds);

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
    newShowName = showNameVariant.as<String>();
    if (newShowName.length() == 0) {
      lastGetShowError = "Show name empty";
      Serial1.println(lastGetShowError);
      lastGetShowsSucceeded = true;
      return false;
    }
  }
  
  lastGetShowError = "";
  
  Serial1.print("Found active show: ");
  Serial1.println(newShowName);
  
  lastGetShowsSucceeded = true;

  serverActiveShowCached = newShowName;

  if (showTempOverrideUntilSessionMs != 0 && sessionMs() >= showTempOverrideUntilSessionMs) {
    showTempOverrideUntilSessionMs = 0;
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
    appendRuntimeLog("loadShow", String("empty getShow ") + currentShowName);
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
  currentRestStart = show["restStart"] | 22;
  currentRestEnd = show["restEnd"] | 6;
  if (currentRestStart < 0 || currentRestStart > 23) currentRestStart = 22;
  if (currentRestEnd < 0 || currentRestEnd > 23) currentRestEnd = 6;
  currentTzOffsetMin = show["tzOffsetMin"] | 0;
  g_nextRestStart = show["nextRestStart"] | 0;
  g_restSleepUntil = show["restSleepUntil"] | 0;
  {
    time_t nowt = time(nullptr);
    if (nowt > 1700000000 && g_restSleepUntil == 0 && !restPeriodDisabled()) {
      computeRestWindowFromHours((uint32_t)nowt);
    }
  }
  
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
  Serial1.printf("Rest: %02d:00-%02d:00%s\n", currentRestStart, currentRestEnd,
                 restPeriodDisabled() ? " (off)" : "");
  
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
  randomCyclePrepare();

  return true;
}

bool downloadImage(String imageName) {
  if (hostChannelUrl.length() == 0 || currentShowName.length() == 0) {
    return false;
  }
  String imageUrl = buildImageUrlForShow(imageName, true);
  
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
  if (httpCode != HTTP_CODE_OK && currentChannelPath.length() > 0) {
    http.end();
    imageUrl = buildImageUrlForShow(imageName, false);
    Serial1.print("Retry legacy image URL: ");
    Serial1.println(imageUrl);
    http.begin(imageUrl);
    http.addHeader("Accept", "*/*");
    http.addHeader("User-Agent", "microPhotoFrame/1.0");
    http.setTimeout(30000);
    http.setConnectTimeout(10000);
    httpCode = http.GET();
  }
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

#if (PANEL_PALETTE_SIZE == 4)
static const uint16_t displayPalette[4] = {
  GxEPD_BLACK, GxEPD_WHITE, GxEPD_RED, GxEPD_YELLOW
};
#else
static const uint16_t displayPalette[6] = {
  GxEPD_BLACK, GxEPD_WHITE, GxEPD_RED, GxEPD_YELLOW, GxEPD_BLUE, GxEPD_GREEN
};
#endif

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
  epdPowerOn();
  display.init(115200);
  // Pixel liegen im nativen Panelraster; Hochkant steckt schon im .ink-Inhalt.
  // setRotation(1) würde das Raster drehen und drawPixel außerhalb verwerfen.
  display.setRotation(0);
  (void)fileOrientation;
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
          if (colorIdx < PANEL_PALETTE_SIZE) {
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

static String buildImageUrlForShow(const String& imageName, bool nested) {
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
  String imageUrl = baseUrl + "shows/";
  if (nested && currentChannelPath.length() > 0) imageUrl += currentChannelPath + "/";
  imageUrl += "show_" + currentShowName + "/" + imageName;
  return imageUrl;
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
      slideTimerMarkNow();
      return true;
    }
  }
  if (WiFi.status() == WL_CONNECTED && hostChannelUrl.length() > 0 && currentShowName.length() > 0) {
    String url = buildImageUrlForShow(lastDisplayedInkName);
    if (decodeAndDisplayInkFromHTTP(url, true)) {
      offlineBadgeOnScreen = true;
      slideTimerMarkNow();
      return true;
    }
  }
  return false;
}

// SD optional: Slot leer → schnell false; einmal gemountet → sdCardMounted; sonst lazy mount
bool isSDCardAvailable() {
  if (!sdCardPresent()) {
    sdCardMounted = false;
    sdLazyMountFailed = false;
    return false;
  }
  if (sdCardMounted) return true;
  if (sdLazyMountFailed) return false;
  if (sdMount()) {
    sdCardMounted = true;
    return true;
  }
  sdLazyMountFailed = true;
  return false;
}

bool decodeAndDisplayInk(const String& filename, bool offlineHint) {
  PowerHighScope _pwrInk;
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
    appendRuntimeLog("decodeSD", String("open ") + filename);
    return false;
  }

  size_t fileSize = inkFile.size();
  if (fileSize < 4) { Serial1.println("File too small"); inkFile.close(); return false; }

  uint8_t* fileData = (uint8_t*)pfAlloc(fileSize);
  if (!fileData) {
    Serial1.println("Failed to allocate memory");
    appendRuntimeLog("decodeSD", String("malloc body sz=") + String((unsigned)fileSize));
    inkFile.close();
    return false;
  }

  inkFile.read(fileData, fileSize);
  inkFile.close();

  uint8_t version = fileData[0];
  uint8_t displayId = fileData[1];
  uint8_t orient = fileData[3];

  Serial1.print("INK v"); Serial1.print(version);
  Serial1.print(" display="); Serial1.print((char)displayId);
  Serial1.print(" orient="); Serial1.println(orient == 0 ? "L" : "P");

  if (displayId != DEVICE_DISPLAY_ID[0] &&
      !displayIdsEqual(String((char)displayId), String(DEVICE_DISPLAY_ID))) {
    Serial1.println("Display ID mismatch!");
    free(fileData);
    return false;
  }

  const int displayWidth = PANEL_NATIVE_WIDTH;
  const int displayHeight = PANEL_NATIVE_HEIGHT;
  const int totalPixels = displayWidth * displayHeight;

  uint8_t* result = (uint8_t*)pfAlloc(totalPixels);
  if (!result) { Serial1.println("Failed to allocate result buffer"); free(fileData); return false; }

  int resIdx = 0;
  if (version == 3) {
    resIdx = decodeDeflate(fileData + 4, fileSize - 4, result, totalPixels);
    if (resIdx > 0) {
      inversePaethPrediction(result, resIdx, displayWidth, PANEL_PALETTE_SIZE);
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
    appendRuntimeLog("decodeSD", String("size ") + resIdx + "/" + totalPixels + " " + filename);
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
  PowerHighScope _pwrHttpInk;
  Serial1.print("Loading .ink file from HTTP: ");
  Serial1.println(imageUrl);
  logHeap("httpInk start");
  
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
    appendRuntimeLog("httpInk", "WiFi not connected");
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
    appendRuntimeLog("httpInk", String("HTTP ") + httpCode + " " + imageUrl);
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
    fileData = (uint8_t*)pfAlloc((size_t)announcedSize);
    if (!fileData) {
      Serial1.println("Failed to allocate memory");
      logHeap("httpInk malloc body");
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
    fileData = (uint8_t*)pfAlloc(cap);
    if (!fileData) {
      Serial1.println("Failed to allocate memory");
      logHeap("httpInk malloc cap");
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
          void* p = pfRealloc(fileData, ncap);
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

  if (displayId != DEVICE_DISPLAY_ID[0] &&
      !displayIdsEqual(String((char)displayId), String(DEVICE_DISPLAY_ID))) {
    Serial1.println("Display ID mismatch!");
    free(fileData);
    return false;
  }

  const int displayWidth = PANEL_NATIVE_WIDTH;
  const int displayHeight = PANEL_NATIVE_HEIGHT;
  const int totalPixels = displayWidth * displayHeight;

  uint8_t* result = (uint8_t*)pfAlloc(totalPixels);
  if (!result) {
    Serial1.println("Failed to allocate result buffer");
    logHeap("httpInk malloc result");
    free(fileData);
    return false;
  }

  int resIdx = 0;
  if (version == 3) {
    resIdx = decodeDeflate(fileData + 4, bodyLen - 4, result, totalPixels);
    if (resIdx > 0) {
      inversePaethPrediction(result, resIdx, displayWidth, PANEL_PALETTE_SIZE);
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

#if PHOTOFRAME_HAS_MPU6050
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
#endif

int readOrientation() {
#if !PHOTOFRAME_HAS_MPU6050
  return (int)configDefaultOrientation;
#else
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
#endif
}

static bool inkHasOrientPrefix(const String& name) {
  return name.length() > 1 && name.charAt(0) >= '0' && name.charAt(0) <= '3';
}

static String inkBaseName(const String& name) {
  return inkHasOrientPrefix(name) ? name.substring(1) : name;
}

// 0 = exact orientation, 1 = same aspect family (0/2 landscape, 1/3 portrait), 2 = other
static int inkOrientRank(char prefix, char exactWanted, char familyWanted) {
  if (prefix == exactWanted) return 0;
  const bool isLandscape = (prefix == '0' || prefix == '2');
  const bool wantLandscape = (familyWanted == '0');
  if (isLandscape == wantLandscape) return 1;
  return 2;
}

void filterImagesByOrientation() {
  currentShowImages.clear();
  // Map orientation to image prefix character
  // 0 = landscape (0°) -> '0'
  // 1 = portrait (90°) -> '1'
  // 2 = landscape inverted (180°) -> '2'
  // 3 = portrait inverted (270°) -> '3'
  const char exactWanted = '0' + (currentOrientation >= 0 && currentOrientation <= 3 ? currentOrientation : 0);
  const char familyWanted = (currentOrientation == 1 || currentOrientation == 3) ? '1' : '0';

  for (size_t i = 0; i < allShowImages.size(); i++) {
    const String& name = allShowImages[i];
    if (name.length() == 0) continue;

    const String base = inkBaseName(name);
    const char myPrefix = inkHasOrientPrefix(name) ? name.charAt(0) : exactWanted;
    int bestRank = inkHasOrientPrefix(name) ? inkOrientRank(myPrefix, exactWanted, familyWanted) : 2;
    size_t bestIndex = i;

    for (size_t j = 0; j < allShowImages.size(); j++) {
      const String& other = allShowImages[j];
      if (other.length() == 0) continue;
      if (inkBaseName(other) != base) continue;
      const char op = inkHasOrientPrefix(other) ? other.charAt(0) : exactWanted;
      const int rank = inkHasOrientPrefix(other) ? inkOrientRank(op, exactWanted, familyWanted) : 2;
      if (rank < bestRank || (rank == bestRank && j < bestIndex)) {
        bestRank = rank;
        bestIndex = j;
      }
    }

    if (bestIndex == i) {
      currentShowImages.push_back(name);
    }
  }

  if (currentShowImages.size() == 0 && allShowImages.size() > 0) {
    Serial1.println("filterImagesByOrientation: keine Treffer — Fallback: alle Bilder der Show");
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
    showStatusOrKeepLast("No images in show", currentShowName.c_str());
    return;
  }

  const int prevIndex = currentImageIndex;
  int nextIndex = prevIndex;

  if (currentShowMode == "random") {
    nextIndex = pickRandomImageIndex(prevIndex);
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
      slideTimerMarkNow();
      rememberDisplayedInk(imageName);
      randomCycleMarkShown(currentImageIndex);
      offlineBadgeOnScreen = false;
      Serial1.println("Image displayed successfully");
    } else {
      // Alte/kurze SD-Kopie (z. B. vor v2/v3 oder abgebrochener Download) — frische Datei vom Server
      Serial1.println("SD decode failed — trying same file via HTTP");
      String imageUrl = buildImageUrlForShow(imageName);
      if (decodeAndDisplayInkFromHTTP(imageUrl, false)) {
        slideTimerMarkNow();
        rememberDisplayedInk(imageName);
        randomCycleMarkShown(currentImageIndex);
        offlineBadgeOnScreen = false;
        Serial1.println("Image displayed from server (SD file unusable)");
      } else {
        Serial1.println("Failed to decode from SD and from server");
        currentImageIndex = prevIndex;
        tryRedisplayLastWithOfflineBadge();
        slideTimerMarkNow();
      }
    }
  } else {
    String imageUrl = buildImageUrlForShow(imageName);
    Serial1.print("Loading image directly from server: ");
    Serial1.println(imageUrl);

    if (decodeAndDisplayInkFromHTTP(imageUrl, false)) {
      slideTimerMarkNow();
      rememberDisplayedInk(imageName);
      randomCycleMarkShown(currentImageIndex);
      offlineBadgeOnScreen = false;
      Serial1.println("Image displayed successfully from server");
    } else {
      Serial1.println("Failed to load image from server — behalte letztes Bild (ohne leeren Fehlerbildschirm)");
      currentImageIndex = prevIndex;
      if (!tryRedisplayLastWithOfflineBadge()) {
        Serial1.println("Kein lokales letztes Bild: E-Ink bleibt unverändert.");
        String ipLine = WiFi.localIP().toString();
        showStatusOrKeepLast("Bild nicht geladen", ipLine.c_str(), hostChannelUrl.c_str());
      }
      slideTimerMarkNow();
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
  json += ",\"buildDate\":\"" + String(__DATE__) + "\"";
  json += ",\"ip\":\"" + WiFi.localIP().toString() + "\"";
  json += ",\"mac\":\"" + WiFi.macAddress() + "\"";
  json += ",\"freeHeap\":" + String(ESP.getFreeHeap());
  json += ",\"sketchSize\":" + String(ESP.getSketchSize());
  json += ",\"freeSketchSpace\":" + String(ESP.getFreeSketchSpace());
  json += ",\"display\":\"" + String(DEVICE_DISPLAY_ID) + "\"";
  json += ",\"deepSleep\":" + String(configSlideshowDeepSleep ? "true" : "false");
  json += ",\"power\":{";
  json += "\"avgEstMa\":" + String(pwrEstimatedAvgMa(), 1);
  json += ",\"sessionMs\":" + String((unsigned long long)sessionMs());
  json += ",\"lightSleepMs\":" + String((unsigned long long)g_lightSleepMsTotal);
  json += ",\"highPowerMs\":" + String((unsigned long long)(g_pwrHighUs / 1000ULL));
  json += ",\"awakeMs\":" + String((unsigned long long)(esp_timer_get_time() / 1000ULL));
  json += "}";
  json += "}";
  server.send(200, "application/json", json);
}

static String jsonEscapeInner(const String& s) {
  String o;
  o.reserve(s.length() + 8);
  for (unsigned i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '\\' || c == '"') o += '\\';
    if (c == '\r' || c == '\n') o += ' ';
    else o += c;
  }
  return o;
}

void handleDiag() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  preferences.begin("mpfDiag", true);
  String last = preferences.getString("lastErr", "");
  preferences.end();
  String json = "{\"lastErr\":\"" + jsonEscapeInner(last) + "\"";
  json += ",\"power\":{";
  json += "\"avgEstMa\":" + String(pwrEstimatedAvgMa(), 1);
  json += ",\"sessionMs\":" + String((unsigned long long)sessionMs());
  json += ",\"lightSleepMs\":" + String((unsigned long long)g_lightSleepMsTotal);
  json += ",\"highPowerMs\":" + String((unsigned long long)(g_pwrHighUs / 1000ULL));
  json += "}}";
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
  if (quickMenuMode && sessionMs() - quickMenuStartSessionMs < QUICK_MENU_TIMEOUT)
    remaining = (QUICK_MENU_TIMEOUT - (unsigned long)(sessionMs() - quickMenuStartSessionMs)) / 1000;

  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<link rel='icon' href='/favicon.ico' type='image/x-icon'><title>&micro;PhotoFrame&trade;</title><style>";
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
  html += ".ver{text-align:center;color:#8aa;font-size:12px;margin-top:14px;}";
  html += ".info{background:#0f3460;border-radius:8px;padding:12px;margin-top:16px;font-size:13px;color:#aaa;line-height:1.6;}";
  html += ".ok{background:#27ae60;border-radius:8px;padding:12px;margin-top:12px;text-align:center;display:none;line-height:1.5;}";
  html += ".err{background:#c0392b;border-radius:8px;padding:12px;margin-top:12px;text-align:center;display:none;line-height:1.5;}";
  html += "</style></head><body><div class='card'>";
  html += "<div class='header-logo'>";
  html += "<img src='/logo' alt='' onerror=\"this.style.display='none'\">";
  html += "<img src='/logotext' alt='&micro;PhotoFrame&trade;' onerror=\"this.style.display='none'\">";
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
  html += "<label style='display:flex;align-items:flex-start;gap:10px;margin-top:14px;cursor:pointer;'>";
  html += "<input type='checkbox' id='deepSleepIn' style='width:auto;margin-top:4px;' " + String(configSlideshowDeepSleep ? "checked" : "") + ">";
#if PHOTOFRAME_HAS_BUTTONS
  html += "<span><b>Deep Sleep</b> zwischen den Bildern (Standard, max. Stromsparen). Erfordert <b>g&uuml;ltige Uhrzeit</b> (NTP nach WLAN). ";
  html += "Ohne NTP oder abgew&auml;hlt: nur Leichtschlaf.</span></label>";
#elif PHOTOFRAME_DEEP_SLEEP_DEFAULT
  html += "<span><b>Deep Sleep</b> zwischen den Bildern (Standard). Dieses Board hat eigene Ladelogik.</span></label>";
#else
  html += "<span><b>Deep Sleep</b> zwischen den Bildern. Am NeoFrame <b>standardm&auml;&szlig;ig aus</b>: Powerbanks schalten bei fast keinem Strom ab. ";
  html += "Aus = WLAN bleibt aktiv (Powerbank-tauglich). An = max. sparen, nur mit festem Netzteil.</span></label>";
#endif
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
  html += "</div>";
  html += "<div class='ver'>" + firmwareVersionLabel() + "</div>";
  html += "</div>";

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
  html += "let ds=document.getElementById('deepSleepIn');if(ds&&d.deepSleep!==undefined)ds.checked=!!d.deepSleep;";
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
  html += "let b={show:document.getElementById('showSel').value,mode:document.getElementById('modeSel').value,timer:parseInt(document.getElementById('timerIn').value,10)||5,followServer:!!(fs&&fs.checked),deepSleep:!!(document.getElementById('deepSleepIn')&&document.getElementById('deepSleepIn').checked)};";
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
        JsonVariant ch = doc["output"]["channel"];
        if (ch.is<JsonObject>()) {
          const char* chDisplay = ch["displayId"] | "";
          if (!chDisplay[0] || strcmp(chDisplay, DEVICE_DISPLAY_ID) == 0) {
            activeShow = ch["showName"] | "";
          }
        }
        if (activeShow.length() == 0) {
          JsonObject activeShows = doc["output"]["shows"]["activeShows"];
          if (!activeShows.isNull()) {
            JsonVariant sv = activeShows[DEVICE_DISPLAY_ID];
            if (sv.isNull()) {
              sv = activeShows[String(atoi(DEVICE_DISPLAY_ID))];
            }
            if (!sv.isNull() && sv.is<String>()) {
              activeShow = sv.as<String>();
            }
          }
        }
        if (activeShow.length() > 0) {
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

  bool ov = isShowTempOverrideActive();
  unsigned long leftMin = 0;
  if (ov && showTempOverrideUntilSessionMs > sessionMs())
    leftMin = (unsigned long)((showTempOverrideUntilSessionMs - sessionMs()) / 60000ULL);

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
  json += ",\"revertLeftMin\":" + String(leftMin);
  json += ",\"deepSleep\":" + String(configSlideshowDeepSleep ? "true" : "false") + "}";
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

  {
    bool deepSl = false;
    if (doc["deepSleep"].is<bool>())
      deepSl = doc["deepSleep"].as<bool>();
    else if (doc["deepSleep"].is<int>())
      deepSl = doc["deepSleep"].as<int>() != 0;
    configSlideshowDeepSleep = deepSl;
    preferences.begin("microPhotoFrame", false);
    preferences.putUChar("dSleep", deepSl ? 1 : 0);
    preferences.end();
  }

  if (!mpu6050Available && doc["defOrient"].is<int>()) {
    int o = doc["defOrient"].as<int>();
    if (o >= 0 && o <= 3) {
      configDefaultOrientation = (uint8_t)o;
      preferences.begin("microPhotoFrame", false);
      preferences.putUChar("defOrient", configDefaultOrientation);
      preferences.end();
      currentOrientation = (int)configDefaultOrientation;
      filterImagesByOrientation();
      randomCyclePrepare();
      if (currentShowImages.size() > 0) {
        currentImageIndex = -1;
        displayNextImage();
      }
    }
  }

  if (followSrv) {
    showTempOverrideUntilSessionMs = 0;
    if (showChanged && wifiConnected) {
      String payload = "{\"action\":\"setActiveShow\",\"input\":{\"showName\":\"" + newShow + "\",\"displayId\":\"" + String(DEVICE_DISPLAY_ID) + "\",\"channel\":\"" + extractChannelSlug(hostChannelUrl) + "\"}}";
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
    showTempOverrideUntilSessionMs = sessionMs() + (uint64_t)revMin * 60000ULL;
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
    quickMenuStartSessionMs = sessionMs();
  unsigned long remSec = QUICK_MENU_TIMEOUT / 1000;

  String respJson = "{\"ok\":true,\"remainingSec\":" + String(remSec) + "}";
  server.send(200, "application/json", respJson);

  // Short feedback beep
  pfTone( 1500, 80);
}

void enterQuickMenu() {
  quickMenuMode = true;
  quickMenuStartSessionMs = sessionMs();
  cachedShowsJson = "";

  // Feedback beep
  pfTone( 1000, 100);
  delay(120);
  pfTone( 1500, 100);

  Serial1.println("Quick-Menu mode active for 60 seconds");

  beginTextScreen();

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
  y += 28;
  display.setCursor(m, y);
  display.print(firmwareVersionLabel());

  display.display(false);
}

void exitQuickMenu() {
  if (!quickMenuMode) return;
  quickMenuMode = false;
  Serial1.println("Quick-Menu mode ended");
  pfTone( 800, 150);

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
  server.on("/lang", HTTP_POST, handleLang);
  server.on("/targets", HTTP_POST, handleTargets);
  server.on("/ota", HTTP_POST, handleOtaResult, handleOtaUpdate);
  server.on("/ota", HTTP_OPTIONS, handleOtaCors);
  server.on("/info", HTTP_GET, handleDeviceInfo);
  server.on("/diag", HTTP_GET, handleDiag);
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

static void mpfShutdownHandler(void) {
  Serial1.println("[mpf] esp_shutdown_handler");
}

// === Setup Function ===
void setup() {
  Serial.begin(115200);
#if PHOTOFRAME_HAS_HW_SERIAL1
  Serial1.begin(115200, SERIAL_8N1, SERIAL_RX, SERIAL_TX);
  while (!Serial1)
    delay(10);
#endif
  delay(2000);
  Serial1.println("--- microPhotoFrame Firmware ---");
  Serial1.println(firmwareVersionLabel());
  logHeap("boot");

  esp_register_shutdown_handler(mpfShutdownHandler);
#if defined(__EXCEPTIONS) && __EXCEPTIONS
  std::set_terminate([]() {
    appendRuntimeLog("terminate", "std::terminate");
    std::abort();
  });
#endif

#if PHOTOFRAME_HAS_BUTTONS
  // Tasten: interne Pull-ups — verhindert „schwebendes LOW“ auf GPIO3 (sonst fälschlich
  // 5s „gedrückt“ → NVS wird jedes Mal gelöscht → nur noch Config-Modus).
  pinMode(BTN_ACTION, INPUT_PULLUP);
  pinMode(BTN_NEXT, INPUT_PULLUP);
  pinMode(BTN_PREV, INPUT_PULLUP);
#endif
#if PHOTOFRAME_HAS_BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
#endif

  delay(100);
  bool resetRequested = false;
#if PHOTOFRAME_HAS_BUTTONS
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
      pfTone( 800, 300);
      delay(350);
      pfTone( 600, 500);
    }
  }
#endif

  epdPowerOn();
  initSpiBuses();

  // Initialize Display
  display.epd2.selectSPI(hspi, SPISettings(4000000, MSBFIRST, SPI_MODE0));
  ensureEpdInited();
  display.setRotation(DEFAULT_DISPLAY_ROTATION);

  sdPowerOn();
  delay(100);

  sdLazyMountFailed = false;
  if (sdCardPresent()) {
    Serial1.println("SD slot: Karte erkannt, Mount wird versucht…");
    if (sdMount()) {
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
          useNativePanelRotation();
          Serial1.println(i == 2 ? "Showing startup image (portrait)..." : "Showing startup image (landscape)...");
          if (decodeAndDisplayInk(filename)) {
            startupShown = true;
          }
        }
      }

      if (!startupShown) {
        Serial1.println("Kein Startup-.ink auf SD — letztes Panelbild bleibt sichtbar.");
      }
    } else {
      Serial1.println("SD-Mount fehlgeschlagen — Betrieb ohne SD (nur Serial, kein Fehlerbildschirm).");
      sdLazyMountFailed = true;
      sdCardMounted = false;
    }
  } else {
    Serial1.println("Keine SD-Karte (optional) — voller Betrieb über WLAN/Server.");
    sdCardMounted = false;
  }
  
  // Konfiguration vor MPU: Standard-Ausrichtung (defOrient) kommt aus NVS
  loadConfig();

  g_wDeepPoll = false;
  g_wDeepImg = false;
  {
    esp_sleep_wakeup_cause_t wc = esp_sleep_get_wakeup_cause();
    preferences.begin("microPhotoFrame", false);
    uint8_t dact = preferences.getUChar("dsAct", 0);
    if (wc == ESP_SLEEP_WAKEUP_TIMER && dact != 0) {
      preferences.putUChar("dsAct", 0);
      if (dact == 1) g_wDeepImg = true;
      else if (dact == 2) g_wDeepPoll = true;
      else if (dact == 3) g_wDeepRest = true;
      Serial1.printf("Wake from deep sleep: TIMER dsAct was %u\n", (unsigned)dact);
    } else if (wc == ESP_SLEEP_WAKEUP_EXT1) {
      preferences.putUChar("dsAct", 0);
      Serial1.println("Wake from deep sleep: GPIO — Timer-Aktion verworfen");
    }
    preferences.end();
  }

#if PHOTOFRAME_HAS_MPU6050
  initMPU6050();
#endif
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

  if (hostChannelUrl.length() == 0) applyHostParts();
  bool haveChannel = hostChannelUrl.length() > 0
      || (hostServerUrl.length() > 0 && hostUser.length() > 0 && hostTarget.length() > 0);
  bool needConfig =
      resetRequested || wifiSSID.length() == 0 || !haveChannel;

  if (needConfig) {
    Serial1.println("Starting CONFIG mode (Soft-AP + Captive Portal)...");
    if (!startFrameSoftAp()) {
      Serial1.println("Failed to start AP!");
    }
    registerWebServerRoutes();
    server.begin();
    Serial1.println("HTTP server started (config)");
    startConfigMode();
    return;
  }

  // Normalbetrieb: Heim-WLAN. Ohne Taster nach Kaltstart zusätzlich 5 min Soft-AP.
  Serial1.println("Starting STA mode (slideshow)...");
  WiFi.mode(WIFI_STA);
  registerWebServerRoutes();
  server.begin();
  Serial1.println("HTTP server on STA (OTA /info /quickmenu when connected)");

  if (connectWiFi()) {
    wifiConnected = true;

    if (shouldOfferBootConfigAp()) {
      startBootConfigAp();
    }

    if (!g_wDeepImg && !g_wDeepPoll && !g_wDeepRest) {
      String ipLine = WiFi.localIP().toString();
      if (bootConfigApActive) {
        String apLine = String("5 min AP microPhotoFrame http://") + WiFi.softAPIP().toString() + "/";
        showStatusOrKeepLast("WLAN verbunden", ipLine.c_str(), apLine.c_str());
      } else {
        showStatusOrKeepLast("WLAN verbunden", ipLine.c_str(), "http://<IP>/ = Config, auch ohne Taster");
      }
    }

    bool showFound = false;
    for (int attempt = 0; attempt < 3 && !showFound; attempt++) {
      if (attempt > 0) {
        Serial1.printf("getActiveShow Retry %d/2 nach 2s...\n", attempt);
        pumpWeb(2000);
      }
      showFound = getActiveShow();
      pumpWeb(50);
    }

    if (showFound) {
      bool dataLoaded = loadShowData();
      if (!dataLoaded) {
        Serial1.println("loadShowData failed, Retry nach 2s...");
        pumpWeb(2000);
        dataLoaded = loadShowData();
      }
      if (dataLoaded) {
        if (currentShowImages.size() > 0) {
          if (g_wDeepImg) {
            g_wDeepImg = false;
            preferences.begin("microPhotoFrame", false);
            int savedIx = preferences.getInt("sImgIx", -1);
            preferences.end();
            currentImageIndex = savedIx;
            Serial1.println("Deep-Sleep-Wake: naechstes Bild");
            displayNextImage();
          } else if (g_wDeepPoll) {
            g_wDeepPoll = false;
            Serial1.println("Deep-Sleep-Wake: Server-Poll");
            lastServerCheckSessionMs = sessionMs();
            markServerPollWallClock();
            {
              bool su = getActiveShow();
              if (su && loadShowData() && currentShowImages.size() > 0) {
                currentImageIndex = -1;
                displayNextImage();
              }
            }
          } else if (g_wDeepRest) {
            g_wDeepRest = false;
            preferences.begin("microPhotoFrame", false);
            int savedIx = preferences.getInt("sImgIx", -1);
            preferences.end();
            if (savedIx >= 0) currentImageIndex = savedIx;
            {
              time_t nowt = time(nullptr);
              uint32_t nowu = (nowt > 1700000000) ? (uint32_t)nowt : 0;
              if (nowu && isInRestPeriod(nowu)) {
                Serial1.println("Deep-Sleep-Wake: Ruhezeit — Bild bleibt");
                lastImageChangeSessionMs = sessionMs();
              } else {
                Serial1.println("Deep-Sleep-Wake: Ruhezeit vorbei — naechstes Bild");
                displayNextImage();
              }
            }
          } else {
            Serial1.println("Displaying first image...");
            currentImageIndex = -1;
            displayNextImage();
          }
        } else {
          Serial1.println("Show has no images");
          if (!tryBootOfflineLastImage()) {
            showStatusOrKeepLast("Show has no images", currentShowName.c_str());
          }
        }
      } else {
        Serial1.println("Failed to load show data");
        if (!tryBootOfflineLastImage()) {
          showStatusOrKeepLast("Failed to load show", currentShowName.c_str());
        }
      }
    } else if (lastChannelUnintended) {
      Serial1.println("Kanal-URL nicht vorgesehen — Status statt gespeicherter Show");
      showStatusScreen(noShowStatusTitle(), lastGetShowError.c_str(), hostChannelUrl.c_str());
    } else {
      Serial1.println("No active show found (nach 3 Versuchen)");
      // Fallback: NVS-Show-Name bekannt → versuche Show trotzdem zu laden
      if (currentShowName.length() > 0) {
        Serial1.print("Versuche gespeicherte Show aus NVS: ");
        Serial1.println(currentShowName);
        bool dataLoaded = loadShowData();
        if (!dataLoaded) {
          pumpWeb(2000);
          dataLoaded = loadShowData();
        }
        if (dataLoaded && currentShowImages.size() > 0) {
          Serial1.println("Gespeicherte Show geladen!");
          if (g_wDeepImg) {
            g_wDeepImg = false;
            preferences.begin("microPhotoFrame", false);
            int savedIx = preferences.getInt("sImgIx", -1);
            preferences.end();
            currentImageIndex = savedIx;
            Serial1.println("Deep-Sleep-Wake: naechstes Bild (NVS-Show)");
            displayNextImage();
          } else if (g_wDeepPoll) {
            g_wDeepPoll = false;
            lastServerCheckSessionMs = sessionMs();
            markServerPollWallClock();
            bool su = getActiveShow();
            if (su && loadShowData() && currentShowImages.size() > 0) {
              currentImageIndex = -1;
              displayNextImage();
            }
          } else if (g_wDeepRest) {
            g_wDeepRest = false;
            preferences.begin("microPhotoFrame", false);
            int savedIx = preferences.getInt("sImgIx", -1);
            preferences.end();
            if (savedIx >= 0) currentImageIndex = savedIx;
            {
              time_t nowt = time(nullptr);
              uint32_t nowu = (nowt > 1700000000) ? (uint32_t)nowt : 0;
              if (nowu && isInRestPeriod(nowu)) {
                Serial1.println("Deep-Sleep-Wake: Ruhezeit — Bild bleibt (NVS-Show)");
                lastImageChangeSessionMs = sessionMs();
              } else {
                Serial1.println("Deep-Sleep-Wake: Ruhezeit vorbei — naechstes Bild (NVS-Show)");
                displayNextImage();
              }
            }
          } else {
            currentImageIndex = -1;
            displayNextImage();
          }
        } else if (!tryBootOfflineLastImage()) {
          showStatusOrKeepLast(noShowStatusTitle(), lastGetShowError.c_str(), hostChannelUrl.c_str());
        }
      } else if (!tryBootOfflineLastImage()) {
        showStatusOrKeepLast(noShowStatusTitle(), lastGetShowError.c_str(), hostChannelUrl.c_str());
      }
    }
    if (g_wDeepPoll || g_wDeepImg || g_wDeepRest) {
      Serial1.println("Deep-Sleep-Wake: nicht verarbeitet — Flags zurueckgesetzt");
      g_wDeepPoll = false;
      g_wDeepImg = false;
      g_wDeepRest = false;
    }
  } else {
    g_wDeepPoll = false;
    g_wDeepImg = false;
    g_wDeepRest = false;
    Serial1.println("WiFi connect failed — opening config AP for setup");
    if (startFrameSoftAp()) {
      Serial1.print("Fallback AP IP: ");
      Serial1.println(WiFi.softAPIP());
    }
    configMode = true;
    configModeStartSessionMs = sessionMs();
    String ssidInfo = "SSID: " + (wifiSSID.length() > 0 ? wifiSSID : String("not set"));
    String apInfo = "AP: microPhotoFrame  IP: " + WiFi.softAPIP().toString();
    showStatusOrKeepLast("WiFi Connection Failed", ssidInfo.c_str(), apInfo.c_str());
  }
}

// === Loop Function ===
void loop() {
  processUsbConfig();
  if (dnsServerActive) {
    dnsServer.processNextRequest();
  }
  server.handleClient();

  if (bootConfigApActive && bootConfigApUntilSessionMs != 0 && sessionMs() >= bootConfigApUntilSessionMs) {
    stopBootConfigAp();
  }

  // --- Config mode (WiFi setup) ---
  if (configMode) {
#if PHOTOFRAME_HAS_BUTTONS
    if (sessionMs() - configModeStartSessionMs > CONFIG_MODE_TIMEOUT) {
      Serial1.println("Config mode timeout, restarting...");
      ESP.restart();
    }
#endif
    return;
  }

  // --- Quick-Menu timeout ---
  if (quickMenuMode) {
    if (sessionMs() - quickMenuStartSessionMs > QUICK_MENU_TIMEOUT) {
      exitQuickMenu();
    }
#if PHOTOFRAME_HAS_BUTTONS
    if (digitalRead(BTN_ACTION) == LOW) {
      delay(200);
      if (digitalRead(BTN_ACTION) == LOW) {
        exitQuickMenu();
        delay(300);
      }
    }
#endif
    delay(50);
    return;
  }

#if PHOTOFRAME_HAS_BUTTONS
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
        pfTone( 600, 500);
        delay(600);
        ESP.restart();
      } else {
        // Short press → Quick Menu
        if (wifiConnected) {
          enterQuickMenu();
        } else {
          pfTone( 300, 200); // error beep: no WiFi
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
#endif

  // --- Orientation sensor (nur mit MPU6050) ---
  if (mpu6050Available && sessionMs() - lastOrientationCheckSessionMs > ORIENTATION_CHECK_INTERVAL) {
    lastOrientationCheckSessionMs = sessionMs();
    int newOrientation = readOrientation();
    if (newOrientation != currentOrientation) {
      const char* orientationNames[] = {"landscape (0)", "portrait (90)", "landscape inv (180)", "portrait inv (270)"};
      Serial1.printf("Orientation: %s -> %s\n",
        (currentOrientation >= 0 && currentOrientation < 4) ? orientationNames[currentOrientation] : "?",
        (newOrientation >= 0 && newOrientation < 4) ? orientationNames[newOrientation] : "?");
      currentOrientation = newOrientation;
      filterImagesByOrientation();
      randomCyclePrepare();
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
  if (showTempOverrideUntilSessionMs != 0 && sessionMs() >= showTempOverrideUntilSessionMs) {
    showTempOverrideUntilSessionMs = 0;
    Serial1.println("Temporäre Show abgelaufen -> Server-Vorgabe laden");
    lastServerCheckSessionMs = sessionMs();
    markServerPollWallClock();
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
  if (wifiConnected && WiFi.status() == WL_CONNECTED && sessionMs() - lastServerCheckSessionMs > SERVER_CHECK_INTERVAL) {
    lastServerCheckSessionMs = sessionMs();
    markServerPollWallClock();
    Serial1.println("Checking for active show update...");
    bool showUpdate = getActiveShow();
    if (lastGetShowsSucceeded) {
      if (lastChannelUnintended) {
        showStatusScreen(noShowStatusTitle(), lastGetShowError.c_str(), hostChannelUrl.c_str());
      } else if (showUpdate) {
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
  if (currentShowImages.size() > 0 && sessionMs() - lastImageChangeSessionMs > (uint64_t)currentShowTimer * 60000ULL) {
    time_t nowt = time(nullptr);
    uint32_t nowu = (nowt > 1700000000) ? (uint32_t)nowt : 0;
    if (!(nowu && isInRestPeriod(nowu))) {
      displayNextImage();
    }
  }

  // Deep Sleep oder Leichtschlaf zwischen Slides/Poll.
  // NeoFrame ohne Deep Sleep: wach bleiben — Powerbanks halten die Last.
  if (!configMode && !quickMenuMode && !bootConfigApActive && wifiConnected && WiFi.status() == WL_CONNECTED
      && currentShowImages.size() > 0) {
    if (configSlideshowDeepSleep) {
      trySlideshowDeepSleep();
    }
#if !PHOTOFRAME_HAS_BUTTONS
    const bool allowLightSleep = configSlideshowDeepSleep;
#else
    const bool allowLightSleep = true;
#endif
    if (allowLightSleep) {
      uint64_t now = sessionMs();
      uint64_t nextImg = lastImageChangeSessionMs + (uint64_t)currentShowTimer * 60000ULL;
      uint64_t nextPoll = lastServerCheckSessionMs + (uint64_t)SERVER_CHECK_INTERVAL;
      uint64_t nextEv = nextImg < nextPoll ? nextImg : nextPoll;
      if (nextEv > now + 40) {
        uint64_t wait = nextEv - now;
        if (wait > 1950) wait = 1950;
        doIdleLightSleepChunk((uint32_t)wait);
      }
    }
  }

  delay(100);
}