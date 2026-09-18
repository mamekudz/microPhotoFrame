// ===========================================
// inkEncoder.mjs
// Node.js Module for .ink file encoding/decoding
// © 2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

import sharp from 'sharp';
import zlib from 'zlib';
import { readFileSync, writeFileSync } from 'fs';

// Display definitions
const COLORS_BW = ["#FFFFFF", "#000000"];
const COLORS_GRAY4 = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"]; // 4-level grayscale
const COLORS_BWR = ["#FFFFFF", "#000000", "#FF0000"];
const COLORS_BWY = ["#FFFFFF", "#000000", "#FFFF00"];
const COLORS_E6 = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"];
const COLORS_BWRY = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00"];

const GEOMETRY_SQUARE = 0;
const GEOMETRY_ROUND = 1;

/**
 * Display definitions - matches EInkDef.mjs
 * id: short single sign identifier
 * name: display name
 * width: pixel width
 * height: pixel height
 * colors: array of display colors
 * geometry: display geometry square or round
 * size: size in inches
 */
export const DISPLAYS = {
  EINK_NONE_DISPLAY: { id: "", name: "No Display", width: 0, height: 0, colors: [], geometry: GEOMETRY_SQUARE, size: 0 },
  // ═══════════════════════════════════════════════════════════
  // MONOCHROME (B&W) - IDs: 0-9
  // Basic black & white displays (2 colors)
  // ═══════════════════════════════════════════════════════════
  EINK_BW_154_SQ_200x200: { id: "0", name: 'B&W 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 1.54 },
  EINK_BW_213_SQ_250x122: { id: "1", name: 'B&W 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BW_290_SQ_296x128: { id: "2", name: 'B&W 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.9 },
  EINK_BW_420_SQ_400x300: { id: "3", name: 'B&W 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BW_583_SQ_648x480: { id: "4", name: 'B&W 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 5.83 },
  EINK_BW_750_SQ_800x480: { id: "5", name: 'B&W 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_BW_1030_SQ_1872x1404: { id: "6", name: 'B&W 10.3" · 1872×1404 · Carta', width: 1872, height: 1404, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 10.3 },
  EINK_BW_1330_SQ_2200x1650: { id: "7", name: 'B&W 13.3" · 2200×1650 · Fina', width: 2200, height: 1650, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 13.3 },
  // ═══════════════════════════════════════════════════════════
  // GRAYSCALE (4-LEVEL) - IDs: A-F
  // 4-level grayscale displays (White, Light Gray, Dark Gray, Black)
  // ═══════════════════════════════════════════════════════════
  EINK_GRAY4_213_SQ_250x122: { id: "A", name: 'Gray4 2.13" · 250×122', width: 250, height: 122, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_GRAY4_397_SQ_800x480: { id: "B", name: 'Gray4 3.97" · 800×480', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 3.97 },
  EINK_GRAY4_420_SQ_400x300: { id: "C", name: 'Gray4 4.2" · 400×300', width: 400, height: 300, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_GRAY4_750_SQ_800x480: { id: "D", name: 'Gray4 7.5" · 800×480 · reTerminal E1001', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_GRAY4_1030_SQ_1872x1404: { id: "E", name: 'Gray4 10.3" · 1872×1404', width: 1872, height: 1404, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 10.3 },
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 6 (FULL COLOR) - IDs: G-P
  // 6-color displays (Black, White, Red, Yellow, Blue, Green)
  // ═══════════════════════════════════════════════════════════
  EINK_SPECTRA6_169_RD_400x400: { id: "G", name: 'Spectra 6 · 1.69" Round · 400×400', width: 400, height: 400, colors: COLORS_E6, geometry: GEOMETRY_ROUND, size: 1.69 },
  EINK_SPECTRA6_400_SQ_600x400: { id: "H", name: 'Spectra 6 · 4.0" · 600×400', width: 600, height: 400, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 4.0 },
  EINK_SPECTRA6_730_SQ_800x480: { id: "I", name: 'Spectra 6 · 7.3" · 800×480 · reTerminal E1002', width: 800, height: 480, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 7.3 },
  EINK_SPECTRA6_814_SQ_1024x576: { id: "J", name: 'Spectra 6 · 8.14" · 1024×576', width: 1024, height: 576, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 8.14 },
  EINK_SPECTRA6_1330_SQ_1600x1200: { id: "K", name: 'Spectra 6 · 13.3" · 1600×1200', width: 1600, height: 1200, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 13.3 },
  EINK_SPECTRA6_2530_SQ_3200x1800: { id: "L", name: 'Spectra 6 · 25.3" · 3200×1800 · Signage', width: 3200, height: 1800, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 25.3 },
  EINK_SPECTRA6_2850_SQ_2160x3060: { id: "M", name: 'Spectra 6 · 28.5" · 2160×3060 · Poster', width: 2160, height: 3060, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 28.5 },
  EINK_SPECTRA6_3150_SQ_2560x1440: { id: "N", name: 'Spectra 6 · 31.5" · 2560×1440', width: 2560, height: 1440, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 31.5 },
  EINK_SPECTRA6_3200_SQ_2560x1440: { id: "O", name: 'Spectra 6 · 32.0" · 2560×1440', width: 2560, height: 1440, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 32.0 },
  EINK_SPECTRA6_4300_SQ_3840x2160: { id: "P", name: 'Spectra 6 · 43.0" · 3840×2160 · UHD', width: 3840, height: 2160, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 43.0 },
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 3-COLOR (BWR/BWY) - IDs: Q-Z
  // 3-color displays (Black, White, Red) or (Black, White, Yellow)
  // ═══════════════════════════════════════════════════════════
  EINK_BWR_154_SQ_200x200: { id: "Q", name: 'Spectra BWR · 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 1.54 },
  EINK_BWR_213_SQ_250x122: { id: "R", name: 'Spectra BWR · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWR_270_SQ_264x176: { id: "S", name: 'Spectra BWR · 2.7" · 264×176', width: 264, height: 176, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.7 },
  EINK_BWR_290_SQ_296x128: { id: "T", name: 'Spectra BWR · 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.9 },
  EINK_BWR_420_SQ_400x300: { id: "U", name: 'Spectra BWR · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BWR_583_SQ_648x480: { id: "V", name: 'Spectra BWR · 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 5.83 },
  EINK_BWR_750_SQ_800x480: { id: "W", name: 'Spectra BWR · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_BWY_213_SQ_250x122: { id: "X", name: 'Spectra BWY · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWR_1248_SQ_1304x984: { id: "Y", name: 'Spectra BWR · 12.48" · 1304×984', width: 1304, height: 984, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 12.48 },
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 4-COLOR (BWRY) - IDs: a-f
  // Spectra 3100: 4-color displays (Black, White, Red, Yellow)
  // ═══════════════════════════════════════════════════════════
  EINK_BWRY_213_SQ_212x104: { id: "a", name: 'Spectra 3100 · 2.13" · 212×104', width: 212, height: 104, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWRY_266_SQ_296x152: { id: "b", name: 'Spectra 3100 · 2.66" · 296×152', width: 296, height: 152, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.66 },
  EINK_BWRY_300_SQ_400x168: { id: "c", name: 'Spectra 3100 · 3.0" · 400×168', width: 400, height: 168, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 3.0 },
  EINK_BWRY_420_SQ_400x300: { id: "d", name: 'Spectra 3100 · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BWRY_750_SQ_800x480: { id: "e", name: 'Spectra 3100 · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 7.5 },
  // ═══════════════════════════════════════════════════════════
  // FUTURE/NEW MODELS - IDs: f-z (Reserved)
  // Space for upcoming technologies:
  // - ACeP (Advanced Color ePaper, 8 colors)
  // - Gallery Palette 3 (7 colors)
  // - 16-level Grayscale
  // - Future innovations
  // ═══════════════════════════════════════════════════════════
};

export const DISPLAY_LONG_ID_BY_SHORT_ID = {
  "": "EINK_NONE_DISPLAY",
  "0": "EINK_BW_154_SQ_200x200",
  "1": "EINK_BW_213_SQ_250x122",
  "2": "EINK_BW_290_SQ_296x128",
  "3": "EINK_BW_420_SQ_400x300",
  "4": "EINK_BW_583_SQ_648x480",
  "5": "EINK_BW_750_SQ_800x480",
  "6": "EINK_BW_1030_SQ_1872x1404",
  "7": "EINK_BW_1330_SQ_2200x1650",
  "A": "EINK_GRAY4_213_SQ_250x122",
  "B": "EINK_GRAY4_397_SQ_800x480",
  "C": "EINK_GRAY4_420_SQ_400x300",
  "D": "EINK_GRAY4_750_SQ_800x480",
  "E": "EINK_GRAY4_1030_SQ_1872x1404",
  "G": "EINK_SPECTRA6_169_RD_400x400",
  "H": "EINK_SPECTRA6_400_SQ_600x400",
  "I": "EINK_SPECTRA6_730_SQ_800x480",
  "J": "EINK_SPECTRA6_814_SQ_1024x576",
  "K": "EINK_SPECTRA6_1330_SQ_1600x1200",
  "L": "EINK_SPECTRA6_2530_SQ_3200x1800",
  "M": "EINK_SPECTRA6_2850_SQ_2160x3060",
  "N": "EINK_SPECTRA6_3150_SQ_2560x1440",
  "O": "EINK_SPECTRA6_3200_SQ_2560x1440",
  "P": "EINK_SPECTRA6_4300_SQ_3840x2160",
  "Q": "EINK_BWR_154_SQ_200x200",
  "R": "EINK_BWR_213_SQ_250x122",
  "S": "EINK_BWR_270_SQ_264x176",
  "T": "EINK_BWR_290_SQ_296x128",
  "U": "EINK_BWR_420_SQ_400x300",
  "V": "EINK_BWR_583_SQ_648x480",
  "W": "EINK_BWR_750_SQ_800x480",
  "X": "EINK_BWY_213_SQ_250x122",
  "Y": "EINK_BWR_1248_SQ_1304x984",
  "a": "EINK_BWRY_213_SQ_212x104",
  "b": "EINK_BWRY_266_SQ_296x152",
  "c": "EINK_BWRY_300_SQ_400x168",
  "d": "EINK_BWRY_420_SQ_400x300",
  "e": "EINK_BWRY_750_SQ_800x480"
};

/**
 * Get display definition by ID
 * @param {string} _displayLongId - Display ID (e.g., "EINK_BWRY_266_SQ_296x152")
 * @returns {Object|null} Display definition or null if not found
 */
export function GetDisplayByLongId(_displayLongId) {
  return DISPLAYS[_displayLongId.toUpperCase()] || null;
}

/**
 * Get display definition by ID
 * @param {string} _displayShortId - Display ID (e.g., "I", "A", "7")
 * @returns {Object|null} Display definition or null if not found
 */
export function GetDisplayByShortId(_displayShortId) {
  let displayLongId = DISPLAY_LONG_ID_BY_SHORT_ID[_displayShortId];
  return DISPLAYS[displayLongId] || null;
}

/**
 * Get all available display definitions
 * @returns {Object} Object mapping display IDs to display definitions
 */
export function GetAllDisplays() {
  return DISPLAYS;
}

/**
 * Get encoding options from display ID
 * @param {string} _displayShortId - Display ID (e.g., "I", "A", "7")
 * @param {Object} _overrides - Optional overrides for default options
 * @returns {Object} Encoding options object
 */
export function GetOptionsFromDisplayId(_displayShortId, _overrides = {}) {
  const display = GetDisplayByShortId(_displayShortId);
  if (!display) {
    throw new Error(`Display ID "${_displayShortId}" not found`);
  }

  return {
    colors: display.colors,
    width: display.width,
    height: display.height,
    displayId: display.id,
    isRound: display.geometry === GEOMETRY_ROUND,
    dither: _overrides.dither || "floyd",
    orientation: _overrides.orientation || 0,
    compression: _overrides.compression || "deflatePaeth",
    inkFormat: _overrides.inkFormat,
    colorAdjust: _overrides.colorAdjust || {
      saturation: 1.0,
      contrast: 1.0,
      blackPoint: 1.0,
      whitePoint: 1.0
    }
  };
}

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string (e.g., "#FFFFFF")
 * @returns {{r: number, g: number, b: number}}
 */
function HEX2RGB(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let c = hex.startsWith('#') ? hex.substring(1) : hex;
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const tmp = parseInt(c, 16);
  return { r: (tmp >> 16) & 255, g: (tmp >> 8) & 255, b: tmp & 255 };
}

/**
 * Convert RGB to HLS
 */
function RGB2HLS(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, l = (max + min) / 2, s = 0;
  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, l, s };
}

/**
 * Convert HLS to RGB
 */
function HLS2RGB(h, l, s) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Create geometry mask for round displays
 */
function CreateGeometryMask(w, h, isRound) {
  if (!isRound) return null;
  const mask = new Uint8Array(w * h);
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(w, h) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      mask[y * w + x] = dist <= radius ? 1 : 0;
    }
  }
  return mask;
}

/**
 * Find nearest color in palette
 */
function FindNearestColor(r, g, b, palette) {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < palette.length; i++) {
    const col = palette[i];
    const dist = Math.pow(r - col.r, 2) + Math.pow(g - col.g, 2) + Math.pow(b - col.b, 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Paeth predictor (wie microPhotoFrame-Firmware / PNG). */
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Forward-Paeth für .ink v3: speichert (original - pred) mod numColors pro Zeile rowWidth.
 * recon[] enthält die bereits rekonstruierten Originalwerte der vorherigen Pixel.
 */
function forwardPaethDeltas(pixels, count, rowWidth, numColors) {
  const out = new Uint8Array(count);
  const recon = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const a = rowWidth > 0 && (i % rowWidth) > 0 ? recon[i - 1] : 0;
    const b = rowWidth > 0 && i >= rowWidth ? recon[i - rowWidth] : 0;
    const c = rowWidth > 0 && (i % rowWidth) > 0 && i >= rowWidth ? recon[i - rowWidth - 1] : 0;
    const pred = rowWidth > 0 ? paethPredictor(a, b, c) : (i > 0 ? recon[i - 1] : 0);
    const orig = pixels[i];
    out[i] = ((orig - pred) % numColors + numColors) % numColors;
    recon[i] = orig;
  }
  return out;
}

/** Inverse Paeth (wie Firmware inversePaethPrediction). */
function inversePaethInPlace(data, count, rowWidth, numColors) {
  for (let i = 0; i < count; i++) {
    const a = rowWidth > 0 && (i % rowWidth) > 0 ? data[i - 1] : 0;
    const b = rowWidth > 0 && i >= rowWidth ? data[i - rowWidth] : 0;
    const c = rowWidth > 0 && (i % rowWidth) > 0 && i >= rowWidth ? data[i - rowWidth - 1] : 0;
    const pred = rowWidth > 0 ? paethPredictor(a, b, c) : (i > 0 ? data[i - 1] : 0);
    data[i] = (data[i] + pred) % numColors;
  }
}

/**
 * microPhotoFrame-Firmware: LZW nur mit minCodeSize=3 (fester Pfad in decodeLZW).
 */
function CompressLZWFirmware(pixels) {
  const minCodeSize = 3;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let dict = new Map();
  const _ResetDict = () => {
    dict.clear();
    for (let i = 0; i < (1 << minCodeSize); i++) {
      dict.set(String.fromCharCode(i), i);
    }
  };
  _ResetDict();

  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  const byteData = [];
  let bitBuf = 0;
  let bitCount = 0;

  const _WriteCode = (c, s) => {
    bitBuf |= (c << bitCount);
    bitCount += s;
    while (bitCount >= 8) {
      byteData.push(bitBuf & 0xFF);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  _WriteCode(clearCode, codeSize);
  let phrase = "";

  for (let i = 0; i < pixels.length; i++) {
    const char = String.fromCharCode(pixels[i]);
    if (dict.has(phrase + char)) {
      phrase += char;
    } else {
      _WriteCode(dict.get(phrase), codeSize);
      dict.set(phrase + char, nextCode++);
      if (nextCode > (1 << codeSize) && codeSize < 12) {
        codeSize++;
      } else if (nextCode === 4096) {
        _WriteCode(clearCode, codeSize);
        _ResetDict();
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
      }
      phrase = char;
    }
  }

  _WriteCode(dict.get(phrase), codeSize);
  _WriteCode(eoiCode, codeSize);
  if (bitCount > 0) {
    byteData.push(bitBuf & 0xFF);
  }

  return new Uint8Array(byteData);
}

/**
 * Compress data using RLE (Run Length Encoding)
 */
function CompressRLE(pixels) {
  const byteData = [];
  let i = 0;
  while (i < pixels.length) {
    let runLength = 1;
    const current = pixels[i];
    while (i + runLength < pixels.length && pixels[i + runLength] === current && runLength < 255) {
      runLength++;
    }
    byteData.push(current, runLength);
    i += runLength;
  }
  return new Uint8Array(byteData);
}

/**
 * Compress data with no compression (raw bytes)
 */
function CompressNone(pixels) {
  return new Uint8Array(pixels);
}
function ApplyFloydSteinbergDither(imgData, palette, w, h) {
  const data = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];
      const colIdx = FindNearestColor(oldR, oldG, oldB, palette);
      const col = palette[colIdx];
      data[idx] = col.r;
      data[idx + 1] = col.g;
      data[idx + 2] = col.b;
      const errR = oldR - col.r;
      const errG = oldG - col.g;
      const errB = oldB - col.b;
      const _AddErr = (dx, dy, f) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny < h) {
          const nIdx = (ny * w + nx) * 4;
          data[nIdx] = Math.max(0, Math.min(255, data[nIdx] + errR * f));
          data[nIdx + 1] = Math.max(0, Math.min(255, data[nIdx + 1] + errG * f));
          data[nIdx + 2] = Math.max(0, Math.min(255, data[nIdx + 2] + errB * f));
        }
      };
      _AddErr(1, 0, 7 / 16);
      _AddErr(-1, 1, 3 / 16);
      _AddErr(0, 1, 5 / 16);
      _AddErr(1, 1, 1 / 16);
    }
  }
}

/**
 * Apply Bayer dithering
 */
function ApplyBayerDither(imgData, palette, w, h) {
  const M8 = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]
  ];
  const data = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const threshold = (M8[y % 8][x % 8] - 32) * 1.8;
      const colIdx = FindNearestColor(
        Math.max(0, Math.min(255, data[idx] + threshold)),
        Math.max(0, Math.min(255, data[idx + 1] + threshold)),
        Math.max(0, Math.min(255, data[idx + 2] + threshold)),
        palette
      );
      const col = palette[colIdx];
      data[idx] = col.r;
      data[idx + 1] = col.g;
      data[idx + 2] = col.b;
    }
  }
}

/**
 * Get pixel indices from image data
 */
function GetPixelIndices(imgData, palette, w, h) {
  const indices = new Uint8Array(w * h);
  const data = imgData.data;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    indices[i] = FindNearestColor(r, g, b, palette);
  }
  return indices;
}

/**
 * Encode image to .ink format
 * @param {string|Buffer} inputPath - Path to input PNG image or Buffer
 * @param {Object} options - Encoding options
 * @param {Array<string>} options.colors - Array of hex colors (e.g., ["#FFFFFF", "#000000", "#FF0000"])
 * @param {number} options.width - Target width
 * @param {number} options.height - Target height
 * @param {string} options.displayId - Display ID character (e.g., "I" für Spectra 6 · 7,3")
 * @param {boolean} options.isRound - Whether display is round (default: false)
 * @param {string} options.dither - Dithering type: "floyd", "bayer", or "none" (default: "floyd")
 * @param {number} options.orientation - Orientation: 0=Quer (Breite×Höhe z.B. 800×480), 1=Hochkant (480×800)
 * @param {string} options.compression - microPhotoFrame: "lzw" (v1), "deflate"/"zlib" (v2), "deflatePaeth"/"paeth" (v3, Standard)
 * @param {number} [options.inkFormat] - Optional 1|2|3 überschreibt compression
 * @param {Object} options.colorAdjust - Color adjustment options
 * @param {number} options.colorAdjust.saturation - Saturation adjustment (default: 1.0)
 * @param {number} options.colorAdjust.contrast - Contrast adjustment (default: 1.0)
 * @param {number} options.colorAdjust.blackPoint - Black point adjustment (default: 1.0)
 * @param {number} options.colorAdjust.whitePoint - White point adjustment (default: 1.0)
 * @returns {Promise<Uint8Array>} Encoded .ink file data
 */
function ditherToByte(dither) {
  if (dither === "bayer") return 1;
  if (dither === "floyd") return 2;
  return 0;
}

/** Kompatibel zu microPhotoFrame main.cpp decodeAndDisplayInk */
function resolveInkFormatVersion(compression, inkFormat) {
  if (typeof inkFormat === "number" && inkFormat >= 1 && inkFormat <= 3) return inkFormat;
  const c = String(compression || "").toLowerCase();
  if (c === "lzw" || c === "v1") return 1;
  if (c === "deflate" || c === "zlib" || c === "v2") return 2;
  if (c === "deflatepaeth" || c === "paeth" || c === "v3") return 3;
  return 3;
}

export async function EncodeInk(inputPath, options = {}) {
  const {
    colors = ["#FFFFFF", "#000000"],
    width,
    height,
    displayId = "0",
    isRound = false,
    dither = "floyd",
    orientation = 0,
    compression = "deflatePaeth",
    inkFormat: inkFormatOpt,
    colorAdjust = {}
  } = options;

  const {
    saturation = 1.0,
    contrast = 1.0,
    blackPoint = 1.0,
    whitePoint = 1.0
  } = colorAdjust;

  // Load and resize image
  let image = sharp(inputPath);
  const metadata = await image.metadata();

  // Resize if dimensions specified
  if (width && height) {
    image = image.resize(width, height, {
      fit: 'fill',
      background: { r: 255, g: 255, b: 255 }
    });
  }

  // Get raw image data
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Convert to ImageData-like format
  const imgData = {
    data: new Uint8ClampedArray(data),
    width: w,
    height: h
  };

  // Apply color adjustments
  const adjustedData = new Uint8ClampedArray(imgData.data);
  for (let i = 0; i < adjustedData.length; i += 4) {
    let r = adjustedData[i];
    let g = adjustedData[i + 1];
    let b = adjustedData[i + 2];

    // Convert to HLS
    let { h: hue, l: lig, s: sat } = RGB2HLS(r, g, b);

    // Saturation
    if (saturation === 0.0) {
      sat = 0;
    } else {
      sat = Math.min(1, sat * saturation);
    }

    // Blackpoint & Whitepoint
    if (lig < 0.5) {
      lig = lig / blackPoint;
    } else {
      lig = 1.0 - ((1.0 - lig) / whitePoint);
    }

    // Contrast
    if (contrast !== 1.0) {
      lig = (lig - 0.5) * contrast + 0.5;
    }

    lig = Math.max(0, Math.min(1, lig));

    // Convert back to RGB
    const [nr, ng, nb] = HLS2RGB(hue, lig, sat);
    adjustedData[i] = nr;
    adjustedData[i + 1] = ng;
    adjustedData[i + 2] = nb;
  }

  imgData.data = adjustedData;

  // Convert palette to RGB
  const palette = colors.map(c => HEX2RGB(c));

  // Apply dithering
  if (dither === 'floyd') {
    ApplyFloydSteinbergDither(imgData, palette, w, h);
  } else if (dither === 'bayer') {
    ApplyBayerDither(imgData, palette, w, h);
  } else {
    // No dithering - just find nearest color
    for (let i = 0; i < imgData.data.length; i += 4) {
      const colIdx = FindNearestColor(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2], palette);
      const col = palette[colIdx];
      imgData.data[i] = col.r;
      imgData.data[i + 1] = col.g;
      imgData.data[i + 2] = col.b;
    }
  }

  // Get pixel indices
  const allPixels = GetPixelIndices(imgData, palette, w, h);
  const mask = CreateGeometryMask(w, h, isRound);

  // Filter pixels based on geometry mask
  /** @type {number[]} */
  let pixelsToEncode;
  if (mask) {
    pixelsToEncode = [];
    for (let i = 0; i < allPixels.length; i++) {
      if (mask[i] === 1) pixelsToEncode.push(allPixels[i]);
    }
  } else {
    pixelsToEncode = Array.from(allPixels);
  }

  let fmt = resolveInkFormatVersion(compression, inkFormatOpt);
  if (isRound && fmt === 3) {
    console.warn("ink-encoder: v3 (Paeth) erwartet eine volle Rechteck-Rasterung; bei isRound wird v2 (Deflate) verwendet.");
    fmt = 2;
  }
  const cLow = String(compression || "").toLowerCase();
  if ((cLow === "rle" || cLow === "none") && inkFormatOpt == null) {
    console.warn('ink-encoder: "rle"/"none" ist nicht firmware-kompatibel — verwende LZW (inkFormat 1).');
    fmt = 1;
  }

  const orientByte = orientation & 1;
  const numColors = colors.length;
  const rowWidth = w;
  const raw = Uint8Array.from(pixelsToEncode);

  let payload;
  if (fmt === 1) {
    payload = CompressLZWFirmware(Array.from(raw));
  } else if (fmt === 2) {
    payload = zlib.deflateSync(Buffer.from(raw), { level: zlib.constants.Z_BEST_COMPRESSION });
  } else {
    const deltas = forwardPaethDeltas(raw, raw.length, rowWidth, numColors);
    payload = zlib.deflateSync(Buffer.from(deltas), { level: zlib.constants.Z_BEST_COMPRESSION });
  }

  const out = new Uint8Array(4 + payload.length);
  out[0] = fmt;
  out[1] = displayId.charCodeAt(0);
  out[2] = ditherToByte(dither);
  out[3] = orientByte;
  out.set(payload, 4);

  return out;
}

/**
 * Decompress data using LZW
 */
function DecompressLZW(uint8Data, dataPtr, minCodeSize, validPixelCount) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let bitBuf = 0;
  let bitCount = 0;
  let ptr = dataPtr;
  let codeSize = minCodeSize + 1;

  const readCode = () => {
    while (bitCount < codeSize) {
      if (ptr >= uint8Data.length) return eoiCode;
      bitBuf |= (uint8Data[ptr++] << bitCount);
      bitCount += 8;
    }
    const code = bitBuf & ((1 << codeSize) - 1);
    bitBuf >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  let dict = [];
  const initDict = () => {
    dict = [];
    for (let i = 0; i < (1 << minCodeSize); i++) {
      dict[i] = [i];
    }
    dict[clearCode] = [];
    dict[eoiCode] = [];
  };
  initDict();

  const decodedPixels = [];
  let oldCode = -1;
  while (decodedPixels.length < validPixelCount) {
    const code = readCode();
    if (code === eoiCode) break;
    if (code === clearCode) {
      initDict();
      codeSize = minCodeSize + 1;
      oldCode = -1;
      continue;
    }
    let entry = dict[code] ? dict[code] : (code === dict.length ? [...dict[oldCode], dict[oldCode][0]] : null);
    if (!entry) break;
    for (let j = 0; j < entry.length; j++) {
      if (decodedPixels.length < validPixelCount) {
        decodedPixels.push(entry[j]);
      }
    }
    if (oldCode !== -1) {
      dict.push([...dict[oldCode], entry[0]]);
      if (dict.length === (1 << codeSize) && codeSize < 12) {
        codeSize++;
      }
    }
    oldCode = code;
  }
  return decodedPixels;
}

/**
 * Decompress data using RLE
 */
function DecompressRLE(uint8Data, dataPtr, validPixelCount) {
  const decodedPixels = [];
  let ptr = dataPtr;
  while (decodedPixels.length < validPixelCount && ptr < uint8Data.length - 1) {
    const value = uint8Data[ptr++];
    const count = uint8Data[ptr++];
    for (let i = 0; i < count && decodedPixels.length < validPixelCount; i++) {
      decodedPixels.push(value);
    }
  }
  return decodedPixels;
}

/**
 * Decompress data with no compression
 */
function DecompressNone(uint8Data, dataPtr, validPixelCount) {
  const decodedPixels = [];
  let ptr = dataPtr;
  while (decodedPixels.length < validPixelCount && ptr < uint8Data.length) {
    decodedPixels.push(uint8Data[ptr++]);
  }
  return decodedPixels;
}

/**
 * Decode .ink file to PNG
 * @param {string|Buffer} inputPath - Path to .ink file or Buffer
 * @param {Object} options - Decoding options
 * @param {Array<string>} options.colors - Array of hex colors (must match encoding colors)
 * @param {number} options.width - Display width
 * @param {number} options.height - Display height
 * @param {boolean} options.isRound - Whether display is round (default: false)
 * @param {string} options.outputPath - Optional output path for PNG file
 * @returns {Promise<Buffer>} Decoded PNG image buffer
 */
export async function DecodeInk(inputPath, options = {}) {
  const {
    colors = ["#FFFFFF", "#000000"],
    width = 800,
    height = 480,
    isRound = false,
    outputPath = null
  } = options;

  const data = Buffer.isBuffer(inputPath)
    ? inputPath
    : (inputPath instanceof Uint8Array ? Buffer.from(inputPath) : readFileSync(inputPath));
  const uint8Data = new Uint8Array(data);

  if (uint8Data.length < 4) {
    throw new Error("Invalid .ink file: too short");
  }

  const w = width;
  const h = height;
  const totalPixels = w * h;
  const numColors = colors.length;
  const rowWidth = w;
  const palette = colors.map(c => HEX2RGB(c));
  const defaultColor = palette[0] || { r: 255, g: 255, b: 255 };

  const mask = CreateGeometryMask(w, h, isRound);
  const validPixelCount = mask
    ? mask.reduce((n, v) => n + v, 0)
    : totalPixels;

  let version = uint8Data[0];
  let dataPtr = 4;
  let legacyFiveByte = false;
  let legacyCompression = 0;

  // Ältere ink-encoder-NPM: 5-Byte-Header bei v2 + compression-Byte, Payload ab Offset 5
  if (
    version === 2 &&
    uint8Data.length > 6 &&
    uint8Data[4] <= 2 &&
    uint8Data[5] !== 0x78 &&
    uint8Data[5] !== 0x58
  ) {
    legacyFiveByte = true;
    legacyCompression = uint8Data[4];
    dataPtr = 5;
  }

  /** @type {number[]} */
  let decodedPixels;

  if (version >= 1 && version <= 3) {
    if (legacyFiveByte) {
      if (legacyCompression === 1) {
        decodedPixels = DecompressRLE(uint8Data, dataPtr, validPixelCount);
      } else if (legacyCompression === 2) {
        decodedPixels = DecompressNone(uint8Data, dataPtr, validPixelCount);
      } else {
        decodedPixels = DecompressLZW(uint8Data, dataPtr, 3, validPixelCount);
      }
    } else if (version === 3) {
      const inflated = zlib.inflateSync(Buffer.from(uint8Data.subarray(dataPtr)));
      const buf = new Uint8Array(inflated);
      if (buf.length < validPixelCount) {
        throw new Error(
          `INK v3: nach Inflate ${buf.length} Bytes, erwartet ${validPixelCount}`
        );
      }
      inversePaethInPlace(buf, validPixelCount, rowWidth, numColors);
      decodedPixels = Array.from(buf.subarray(0, validPixelCount));
    } else if (version === 2) {
      const inflated = zlib.inflateSync(Buffer.from(uint8Data.subarray(dataPtr)));
      const arr = new Uint8Array(inflated);
      if (arr.length < validPixelCount) {
        throw new Error(
          `INK v2: nach Inflate ${arr.length} Bytes, erwartet mindestens ${validPixelCount}`
        );
      }
      decodedPixels = Array.from(arr.subarray(0, validPixelCount));
    } else {
      decodedPixels = DecompressLZW(uint8Data, dataPtr, 3, validPixelCount);
    }
  } else {
    if (uint8Data.length < 5) {
      throw new Error(`Unbekannte .ink Version (erstes Byte: ${version})`);
    }
    const minCodeSizeV0 = uint8Data[3];
    decodedPixels = DecompressLZW(uint8Data, 4, minCodeSizeV0, validPixelCount);
  }

  const result = new Uint8ClampedArray(totalPixels * 4);
  let decodedIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    let color;
    if (mask && mask[i] === 0) {
      color = defaultColor;
    } else {
      const idx = decodedPixels[decodedIdx++];
      color = palette[idx] ?? defaultColor;
    }
    const pos = i * 4;
    result[pos] = color.r;
    result[pos + 1] = color.g;
    result[pos + 2] = color.b;
    result[pos + 3] = 255;
  }

  const pngBuffer = await sharp(result, {
    raw: { width: w, height: h, channels: 4 }
  })
    .png()
    .toBuffer();

  if (outputPath) {
    writeFileSync(outputPath, pngBuffer);
  }

  return pngBuffer;
}

/**
 * Load encoding options from JSON file
 * @param {string} configPath - Path to JSON configuration file
 * @returns {Promise<Object>} Encoding options object
 */
export async function LoadConfigFromJSON(configPath) {
  const configContent = readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);

  // If config contains displayId, try to load from display definitions
  if (config.displayId && !config.colors) {
    const display = GetDisplayByShortId(config.displayId);
    if (display) {
      // Use display definition as base, override with config values
      return {
        colors: display.colors,
        width: display.width,
        height: display.height,
        displayId: display.id,
        isRound: display.geometry === GEOMETRY_ROUND,
        dither: config.dither || 'floyd',
        orientation: config.orientation || 0,
        compression: config.compression || 'deflatePaeth',
        inkFormat: config.inkFormat,
        colorAdjust: config.colorAdjust || {
          saturation: config.saturation || 1.0,
          contrast: config.contrast || 1.0,
          blackPoint: config.blackPoint || 1.0,
          whitePoint: config.whitePoint || 1.0
        }
      };
    }
  }

  // Validate required fields for manual config
  if (!config.colors || !Array.isArray(config.colors)) {
    throw new Error('Config must contain a "colors" array or a valid "displayId"');
  }
  if (config.width === undefined || config.height === undefined) {
    throw new Error('Config must contain "width" and "height" or a valid "displayId"');
  }
  if (!config.displayId) {
    throw new Error('Config must contain "displayId"');
  }

  // Return options object compatible with EncodeInk
  return {
    colors: config.colors,
    width: config.width,
    height: config.height,
    displayId: config.displayId,
    isRound: config.isRound || false,
    dither: config.dither || 'floyd',
    orientation: config.orientation || 0,
    compression: config.compression || 'deflatePaeth',
    inkFormat: config.inkFormat,
    colorAdjust: config.colorAdjust || {
      saturation: config.saturation || 1.0,
      contrast: config.contrast || 1.0,
      blackPoint: config.blackPoint || 1.0,
      whitePoint: config.whitePoint || 1.0
    }
  };
}

/**
 * Encode PNG image to .ink format using JSON configuration
 * @param {string|Buffer} inputPath - Path to input PNG image or Buffer
 * @param {string} configPath - Path to JSON configuration file
 * @param {string} outputPath - Path to output .ink file (optional, if not provided, returns Buffer)
 * @returns {Promise<Uint8Array>} Encoded .ink file data
 */
export async function EncodeInkFromConfig(inputPath, configPath, outputPath = null) {
  const options = await LoadConfigFromJSON(configPath);
  const inkData = await EncodeInk(inputPath, options);

  if (outputPath) {
    writeFileSync(outputPath, inkData);
  }

  return inkData;
}

/**
 * Encode PNG image to .ink format using display ID
 * @param {string|Buffer} inputPath - Path to input PNG image or Buffer
 * @param {string} displayId - Display ID (e.g., "I", "A", "7")
 * @param {Object} overrides - Optional overrides for default options
 * @param {string} outputPath - Path to output .ink file (optional, if not provided, returns Buffer)
 * @returns {Promise<Uint8Array>} Encoded .ink file data
 */
export async function EncodeInkFromDisplayId(inputPath, displayId, overrides = {}, outputPath = null) {
  const options = GetOptionsFromDisplayId(displayId, overrides);
  const inkData = await EncodeInk(inputPath, options);

  if (outputPath) {
    writeFileSync(outputPath, inkData);
  }

  return inkData;
}

/**
 * Default export
 */
export default {
  EncodeInk,
  DecodeInk,
  LoadConfigFromJSON,
  EncodeInkFromConfig,
  EncodeInkFromDisplayId,
  GetDisplayByLongId,
  GetDisplayByShortId,
  GetAllDisplays,
  GetOptionsFromDisplayId,
  DISPLAYS,
  DISPLAY_LONG_ID_BY_SHORT_ID
};




