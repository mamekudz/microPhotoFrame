#pragma once

/**
 * Seeed reTerminal E1002 — platform ID `reterminal-e1002`
 * (exact gulp-mu-build-filter match).
 *
 * Pin map is the E1002 / XIAO ESP32-S3 wiring. Do not copy this into NeoFrame.
 */

/*-- @<BUILD_ONLY_AT_PLATFORMS:reterminal-e1002 --*/
#define PHOTOFRAME_TARGET_NAME "reTerminal E1002"
#define PHOTOFRAME_PLATFORM_ID "reterminal-e1002"
#define PHOTOFRAME_HAS_MPU6050 1
#define PHOTOFRAME_HAS_BUTTONS 1
#define PHOTOFRAME_HAS_BUZZER 1
#define PHOTOFRAME_HAS_SD_EN 1
#define PHOTOFRAME_HAS_SD_DET 1
#define PHOTOFRAME_HAS_HW_SERIAL1 1
#define PHOTOFRAME_HAS_SD 1
#define PHOTOFRAME_SD_SEPARATE_SPI 0
#define DEVICE_DISPLAY_ID "I"
#define EPD_SELECT 1
#define PANEL_NATIVE_WIDTH 800
#define PANEL_NATIVE_HEIGHT 480
#define PANEL_PALETTE_SIZE 6

#define MPU6050_ADDR 0x68
#define MPU6050_PWR_MGMT_1 0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B

#define EPD_SCK_PIN 7
#define EPD_MOSI_PIN 9
#define EPD_CS_PIN 10
#define EPD_DC_PIN 11
#define EPD_RES_PIN 12
#define EPD_BUSY_PIN 13

#define SD_EN_PIN 16
#define SD_DET_PIN 15
#define SD_CS_PIN 14
#define SD_MISO_PIN 8
#define SD_SCK_PIN EPD_SCK_PIN
#define SD_MOSI_PIN EPD_MOSI_PIN

#define BTN_ACTION 3
#define BTN_NEXT 4
#define BTN_PREV 5

#define LED_PIN 6
#define BUZZER_PIN 45

#define SERIAL_RX 44
#define SERIAL_TX 43

#define MPU6050_SDA_PIN 19
#define MPU6050_SCL_PIN 20
/*-- @>BUILD_ONLY_AT_PLATFORMS --*/
