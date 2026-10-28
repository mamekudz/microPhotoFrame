#pragma once

/**
 * Waveshare ESP32-S3 1.54" e-Paper (G) AIoT — platform ID `waveshare-154g`
 * (exact gulp-mu-build-filter match).
 *
 * Official Waveshare docs (ESP32-S3-ePaper-1.54G / EPD_1in54g):
 * 1.54inch e-Paper (G) · GDEY0154F51 · 200×200 · Black/White/Red/Yellow
 * SKU 26565/26566 (panel), 28766 (ESP32-S3 AIoT board). Not Spectra 3100.
 * EPD SPI 12/13/11/10/9/8, EPD3V3_EN GPIO6 active-low (LOW = panel on).
 * No photo-frame buttons; USB-C native CDC. Battery connector unused.
 */

/*-- @<BUILD_ONLY_AT_PLATFORMS:waveshare-154g --*/
#define PHOTOFRAME_TARGET_NAME "Waveshare 1.54G"
#define PHOTOFRAME_PLATFORM_ID "waveshare-154g"
#define PHOTOFRAME_HAS_MPU6050 0
#define PHOTOFRAME_HAS_BUTTONS 0
#define PHOTOFRAME_DEEP_SLEEP_DEFAULT 1
#define PHOTOFRAME_HAS_BUZZER 0
#define PHOTOFRAME_HAS_SD 0
#define PHOTOFRAME_HAS_SD_EN 0
#define PHOTOFRAME_HAS_SD_DET 0
#define PHOTOFRAME_HAS_HW_SERIAL1 0
#define PHOTOFRAME_SD_SEPARATE_SPI 0

#define DEVICE_DISPLAY_ID "f"
#define EPD_SELECT 2
#define PANEL_NATIVE_WIDTH 200
#define PANEL_NATIVE_HEIGHT 200
#define PANEL_PALETTE_SIZE 4

#define EPD_MOSI_PIN 13
#define EPD_SCK_PIN 12
#define EPD_CS_PIN 11
#define EPD_DC_PIN 10
#define EPD_RES_PIN 9
#define EPD_BUSY_PIN 8
#define PHOTOFRAME_EPD_PWR_PIN 6
#define PHOTOFRAME_EPD_PWR_ON_LEVEL 0

#define SD_CS_PIN -1
#define SD_MOSI_PIN 41
#define SD_MISO_PIN 40
#define SD_SCK_PIN 39
/*-- @>BUILD_ONLY_AT_PLATFORMS --*/
