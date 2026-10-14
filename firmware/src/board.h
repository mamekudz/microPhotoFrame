#pragma once

/**
 * Board selection is gulp-mu-build-filter `platform` (exact id).
 * Compile firmware/.generated (npx gulp FIRMWARE_BUILD), not firmware/src directly.
 *
 * Shared panel (both targets): Spectra 6 7.3" GDEP073E01, display ID "I".
 */

#define DEVICE_DISPLAY_ID "I"
#define EPD_SELECT 1
#define PANEL_NATIVE_WIDTH 800
#define PANEL_NATIVE_HEIGHT 480
#define DEFAULT_DISPLAY_ROTATION 0

#if (EPD_SELECT == 0)
#define GxEPD2_DISPLAY_CLASS GxEPD2_BW
#define GxEPD2_DRIVER_CLASS GxEPD2_750_GDEY075T7
#elif (EPD_SELECT == 1)
#define GxEPD2_DISPLAY_CLASS GxEPD2_7C
#define GxEPD2_DRIVER_CLASS GxEPD2_730c_GDEP073E01
#endif

#include "boards/reterminal-e1002.h"
#include "boards/neoframe.h"

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
