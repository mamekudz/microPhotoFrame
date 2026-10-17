import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PLATFORM_NEOFRAME,
	PLATFORM_RETERMINAL,
	PLATFORM_WAVESHARE_154G,
	buildFilterPlatformOptions,
} from './photoframe-platforms.mjs';

const require = createRequire(import.meta.url);
const µBuildFilter = require('gulp-mu-build-filter');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'firmware', 'src');

function filterFile(rel, platformId) {
	const raw = fs.readFileSync(path.join(SRC, rel), 'utf8');
	return µBuildFilter({ text: raw, ...buildFilterPlatformOptions(platformId) });
}

test('filter options use exact platform id and mode remove', () => {
	const opts = buildFilterPlatformOptions(PLATFORM_NEOFRAME);
	assert.equal(opts.platform, PLATFORM_NEOFRAME);
	assert.equal(opts.mode, 'remove');
	assert.equal(opts.release, '*');
	assert.equal(opts.client, '*');
});

test('E1002 board header stays live only for reterminal-e1002', () => {
	const e1002 = filterFile('boards/reterminal-e1002.h', PLATFORM_RETERMINAL);
	const neo = filterFile('boards/reterminal-e1002.h', PLATFORM_NEOFRAME);
	assert.match(e1002, /#define PHOTOFRAME_TARGET_NAME "reTerminal E1002"/);
	assert.match(e1002, /#define PHOTOFRAME_HAS_MPU6050 1/);
	assert.match(e1002, /#define EPD_CS_PIN 10/);
	assert.doesNotMatch(neo, /PHOTOFRAME_TARGET_NAME/);
	assert.doesNotMatch(neo, /EPD_CS_PIN/);
	assert.doesNotMatch(neo, /PHOTOFRAME_HAS_MPU6050/);
});

test('NeoFrame board header stays live only for neoframe with ESP32E6-E01 pins, no MPU', () => {
	const neo = filterFile('boards/neoframe.h', PLATFORM_NEOFRAME);
	const e1002 = filterFile('boards/neoframe.h', PLATFORM_RETERMINAL);
	assert.match(neo, /#define PHOTOFRAME_TARGET_NAME "NeoFrame"/);
	assert.match(neo, /#define PHOTOFRAME_HAS_MPU6050 0/);
	assert.match(neo, /#define PHOTOFRAME_HAS_BUTTONS 0/);
	assert.doesNotMatch(neo, /BTN_ACTION/);
	assert.match(neo, /#define PHOTOFRAME_PINMAP_ESP32E6_E01 1/);
	assert.match(neo, /#define EPD_CS_PIN 2/);
	assert.match(neo, /#define EPD_BUSY_PIN 5/);
	assert.match(neo, /#define SD_CS_PIN 48/);
	assert.doesNotMatch(neo, /MPU6050_SDA_PIN/);
	assert.doesNotMatch(e1002, /PHOTOFRAME_TARGET_NAME/);
	assert.doesNotMatch(e1002, /EPD_CS_PIN/);
});

test('Waveshare 1.54G header stays live only for waveshare-154g with official EPD pins', () => {
	const ws = filterFile('boards/waveshare-154g.h', PLATFORM_WAVESHARE_154G);
	const e1002 = filterFile('boards/waveshare-154g.h', PLATFORM_RETERMINAL);
	assert.match(ws, /#define PHOTOFRAME_TARGET_NAME "Waveshare 1.54G"/);
	assert.match(ws, /#define DEVICE_DISPLAY_ID "f"/);
	assert.match(ws, /#define PANEL_NATIVE_WIDTH 200/);
	assert.match(ws, /#define PHOTOFRAME_EPD_PWR_PIN 6/);
	assert.match(ws, /#define EPD_BUSY_PIN 8/);
	assert.match(ws, /#define EPD_CS_PIN 11/);
	assert.match(ws, /#define PHOTOFRAME_HAS_BUTTONS 0/);
	assert.match(ws, /#define PHOTOFRAME_HAS_SD 0/);
	assert.doesNotMatch(e1002, /PHOTOFRAME_TARGET_NAME/);
	assert.doesNotMatch(e1002, /EPD_CS_PIN/);
});

test('main.cpp has no C fallback that reintroduces the other platform name', () => {
	const src = fs.readFileSync(path.join(SRC, 'main.cpp'), 'utf8');
	assert.match(src, /#include "board\.h"/);
	assert.doesNotMatch(src, /#ifndef PHOTOFRAME_TARGET_NAME/);
	assert.doesNotMatch(src, /#define PHOTOFRAME_TARGET_NAME "reTerminal E1002"/);
	assert.doesNotMatch(src, /#define PHOTOFRAME_TARGET_NAME "NeoFrame"/);
	assert.doesNotMatch(src, /#define PHOTOFRAME_TARGET_NAME "Waveshare 1.54G"/);
});
