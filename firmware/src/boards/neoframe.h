#pragma once

/**
 * GooDisplay NeoFrame GDP073EW1 — platform ID `neoframe`
 * (exact gulp-mu-build-filter match).
 *
 * Pin map from official ESP32E6-E01 spec (Good Display, 2024-09-24).
 * The finished wooden frame is documented as using that driver board;
 * a hardware flash is the check that the wiring is 1:1.
 *
 * No accelerometer / MPU6050 and no front buttons on the wooden frame.
 * Factory restore: firmware/factory/neoframe/ (GDEPE073E01.ino.merged.bin @ 0x0).
 */

/*-- @<BUILD_ONLY_AT_PLATFORMS:neoframe ----
#define PHOTOFRAME_TARGET_NAME "NeoFrame"
#define PHOTOFRAME_PLATFORM_ID "neoframe"
#define PHOTOFRAME_HAS_MPU6050 0
#define PHOTOFRAME_HAS_BUTTONS 0
#define PHOTOFRAME_HAS_BUZZER 0
#define PHOTOFRAME_HAS_SD_EN 0
#define PHOTOFRAME_HAS_SD_DET 0
#define PHOTOFRAME_HAS_HW_SERIAL1 0
#define PHOTOFRAME_HAS_SD 1
#define PHOTOFRAME_SD_SEPARATE_SPI 1
#define PHOTOFRAME_PINMAP_ESP32E6_E01 1
#define DEVICE_DISPLAY_ID "9"
#define EPD_SELECT 1
#define PANEL_NATIVE_WIDTH 800
#define PANEL_NATIVE_HEIGHT 480
#define PANEL_PALETTE_SIZE 6

#define EPD_MOSI_PIN 11
#define EPD_SCK_PIN 12
#define EPD_CS_PIN 2
#define EPD_DC_PIN 3
#define EPD_RES_PIN 4
#define EPD_BUSY_PIN 5

#define SD_CS_PIN 48
#define SD_MOSI_PIN 47
#define SD_MISO_PIN 13
#define SD_SCK_PIN 21
---- @>BUILD_ONLY_AT_PLATFORMS --*/
