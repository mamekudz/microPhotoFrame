#pragma once

/**
 * Board selection is gulp-mu-build-filter `platform` (exact id).
 * Compile firmware/.generated (npx gulp FIRMWARE_BUILD), not firmware/src directly.
 *
 * Panel size, display ID and GxEPD2 driver come from the active boards/<id>.h.
 */

#include "boards/reterminal-e1002.h"
#include "boards/neoframe.h"
#include "boards/waveshare-154g.h"

#ifndef PHOTOFRAME_TARGET_NAME
#error "No platform board header active — run gulp FIRMWARE_BUILD (gulp-mu-build-filter)"
#endif

#ifndef PHOTOFRAME_HAS_MPU6050
#define PHOTOFRAME_HAS_MPU6050 0
#endif
#ifndef PHOTOFRAME_HAS_BUTTONS
#define PHOTOFRAME_HAS_BUTTONS 0
#endif
#ifndef PHOTOFRAME_HAS_BUZZER
#define PHOTOFRAME_HAS_BUZZER 0
#endif
#ifndef PHOTOFRAME_HAS_SD
#define PHOTOFRAME_HAS_SD 1
#endif
#ifndef PHOTOFRAME_HAS_SD_EN
#define PHOTOFRAME_HAS_SD_EN 0
#endif
#ifndef PHOTOFRAME_HAS_SD_DET
#define PHOTOFRAME_HAS_SD_DET 0
#endif
#ifndef PHOTOFRAME_HAS_HW_SERIAL1
#define PHOTOFRAME_HAS_HW_SERIAL1 0
#endif
#ifndef PHOTOFRAME_SD_SEPARATE_SPI
#define PHOTOFRAME_SD_SEPARATE_SPI 0
#endif
#ifndef DEFAULT_DISPLAY_ROTATION
#define DEFAULT_DISPLAY_ROTATION 0
#endif
#ifndef PHOTOFRAME_EPD_PWR_PIN
#define PHOTOFRAME_EPD_PWR_PIN -1
#endif
#ifndef PHOTOFRAME_EPD_PWR_ON_LEVEL
#define PHOTOFRAME_EPD_PWR_ON_LEVEL 0
#endif
#ifndef PHOTOFRAME_DEEP_SLEEP_DEFAULT
#if PHOTOFRAME_HAS_BUTTONS
#define PHOTOFRAME_DEEP_SLEEP_DEFAULT 1
#else
#define PHOTOFRAME_DEEP_SLEEP_DEFAULT 0
#endif
#endif
#ifndef PANEL_PALETTE_SIZE
#define PANEL_PALETTE_SIZE 6
#endif

#ifndef DEVICE_DISPLAY_ID
#error "Board header must define DEVICE_DISPLAY_ID"
#endif
#ifndef EPD_SELECT
#error "Board header must define EPD_SELECT"
#endif
#ifndef PANEL_NATIVE_WIDTH
#error "Board header must define PANEL_NATIVE_WIDTH"
#endif
#ifndef PANEL_NATIVE_HEIGHT
#error "Board header must define PANEL_NATIVE_HEIGHT"
#endif

#if (EPD_SELECT == 2)
#define GxEPD2_DISPLAY_CLASS GxEPD2_4C
#define GxEPD2_DRIVER_CLASS GxEPD2_154c_GDEM0154F51H
#elif (EPD_SELECT == 1)
#define GxEPD2_DISPLAY_CLASS GxEPD2_7C
#define GxEPD2_DRIVER_CLASS GxEPD2_730c_GDEP073E01
#else
#define GxEPD2_DISPLAY_CLASS GxEPD2_BW
#define GxEPD2_DRIVER_CLASS GxEPD2_750_GDEY075T7
#endif
