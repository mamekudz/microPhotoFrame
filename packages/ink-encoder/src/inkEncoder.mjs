// ===========================================
// inkEncoder.mjs
// Node.js Module for .ink file encoding/decoding
// © 2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Display definitions
const COLORS_BW = ["#FFFFFF", "#000000"];
const COLORS_GRAY4 = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"]; // 4-level grayscale
const COLORS_E6 = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"];
const COLORS_BWR = ["#FFFFFF", "#000000", "#FF0000"];
const COLORS_BWY = ["#FFFFFF", "#000000", "#FFFF00"];
const COLORS_BWRY = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00"];

const GEOMETRY_SQUARE = 0;
const GEOMETRY_ROUND = 1;

/**
 * Display definitions - matches EInkDef.mjs
 * Updated 2026-01 with reorganized IDs
 */
export const DISPLAYS = {
  // ═══════════════════════════════════════════════════════════
  // MONOCHROME (B&W) - IDs: 0-9
  // ═══════════════════════════════════════════════════════════
  "0": { id: "0", name: 'B&W 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 1.54 },
  "1": { id: "1", name: 'B&W 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.13 },
  "2": { id: "2", name: 'B&W 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.9 },
  "3": { id: "3", name: 'B&W 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 4.2 },
  "4": { id: "4", name: 'B&W 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 5.83 },
  "5": { id: "5", name: 'B&W 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 7.5 },
  "6": { id: "6", name: 'B&W 10.3" · 1872×1404 · Carta', width: 1872, height: 1404, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 10.3 },
  "7": { id: "7", name: 'B&W 13.3" · 2200×1650 · Fina', width: 2200, height: 1650, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 13.3 },
  
  // ═══════════════════════════════════════════════════════════
  // GRAYSCALE (4-LEVEL) - IDs: A-F
  // ═══════════════════════════════════════════════════════════
  "A": { id: "A", name: 'Gray4 2.13" · 250×122', width: 250, height: 122, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 2.13 },
  "B": { id: "B", name: 'Gray4 3.97" · 800×480', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 3.97 },
  "C": { id: "C", name: 'Gray4 4.2" · 400×300', width: 400, height: 300, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 4.2 },
  "D": { id: "D", name: 'Gray4 7.5" · 800×480 · reTerminal E1001', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 7.5 },
  "E": { id: "E", name: 'Gray4 10.3" · 1872×1404', width: 1872, height: 1404, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 10.3 },
  
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 6 (FULL COLOR) - IDs: G-P
  // ═══════════════════════════════════════════════════════════
  "G": { id: "G", name: 'Spectra 6 · 1.69" Round · 400×400', width: 400, height: 400, colors: COLORS_E6, geometry: GEOMETRY_ROUND, size: 1.69 },
  "H": { id: "H", name: 'Spectra 6 · 4.0" · 600×400', width: 600, height: 400, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 4.0 },
  "I": { id: "I", name: 'Spectra 6 · 7.3" · 800×480 · reTerminal E1002', width: 800, height: 480, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 7.3 },
  "J": { id: "J", name: 'Spectra 6 · 8.14" · 1024×576', width: 1024, height: 576, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 8.14 },
  "K": { id: "K", name: 'Spectra 6 · 13.3" · 1600×1200', width: 1600, height: 1200, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 13.3 },
  "L": { id: "L", name: 'Spectra 6 · 25.3" · 3200×1800 · Signage', width: 3200, height: 1800, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 25.3 },
  "M": { id: "M", name: 'Spectra 6 · 28.5" · 2160×3060 · Poster', width: 2160, height: 3060, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 28.5 },
  "N": { id: "N", name: 'Spectra 6 · 31.5" · 2560×1440', width: 2560, height: 1440, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 31.5 },
  "O": { id: "O", name: 'Spectra 6 · 32.0" · 2560×1440', width: 2560, height: 1440, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 32.0 },
  "P": { id: "P", name: 'Spectra 6 · 43.0" · 3840×2160 · UHD', width: 3840, height: 2160, colors: COLORS_E6, geometry: GEOMETRY_SQUARE, size: 43.0 },
  
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 3-COLOR (BWR/BWY) - IDs: Q-Z
  // ═══════════════════════════════════════════════════════════
  "Q": { id: "Q", name: 'Spectra BWR · 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 1.54 },
  "R": { id: "R", name: 'Spectra BWR · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.13 },
  "S": { id: "S", name: 'Spectra BWR · 2.7" · 264×176', width: 264, height: 176, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.7 },
  "T": { id: "T", name: 'Spectra BWR · 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.9 },
  "U": { id: "U", name: 'Spectra BWR · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 4.2 },
  "V": { id: "V", name: 'Spectra BWR · 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 5.83 },
  "W": { id: "W", name: 'Spectra BWR · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 7.5 },
  "X": { id: "X", name: 'Spectra BWY · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  "Y": { id: "Y", name: 'Spectra BWR · 12.48" · 1304×984', width: 1304, height: 984, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 12.48 },
  
  // ═══════════════════════════════════════════════════════════
  // SPECTRA 4-COLOR (BWRY) - IDs: a-f
  // ═══════════════════════════════════════════════════════════
  "a": { id: "a", name: 'Spectra 3100 · 2.13" · 212×104', width: 212, height: 104, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  "b": { id: "b", name: 'Spectra 3100 · 2.66" · 296×152', width: 296, height: 152, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.66 },
  "c": { id: "c", name: 'Spectra 3100 · 3.0" · 400×168', width: 400, height: 168, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 3.0 },
  "d": { id: "d", name: 'Spectra 3100 · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 4.2 },
  "e": { id: "e", name: 'Spectra 3100 · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 7.5 }
};

/**
 * Get display definition by ID
 * @param {string} displayId - Display ID (e.g., "I", "D", "5")
 * @returns {Object|null} Display definition or null if not found
 */
export function getDisplay(displayId) {
  return DISPLAYS[displayId.toUpperCase()] || null;
}

/**
 * Get all available display definitions
 * @returns {Object} Object mapping display IDs to display definitions
 */
export function getAllDisplays() {
  return DISPLAYS;
}

/**
 * Get encoding options from display ID
 * @param {string} displayId - Display ID (e.g., "I", "D", "5")
 * @param {Object} overrides - Optional overrides for default options
 * @returns {Object} Encoding options object
 */
export function getOptionsFromDisplayId(displayId, overrides = {}) {
  const display = getDisplay(displayId);
  if (!display) {
    throw new Error(`Display ID "${displayId}" not found`);
  }
  
  return {
    colors: display.colors,
    width: display.width,
    height: display.height,
    displayId: display.id,
    isRound: display.geometry === GEOMETRY_ROUND,
    dither: overrides.dither || "floyd",
    orientation: overrides.orientation || 0,
    colorAdjust: overrides.colorAdjust || {
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
function hex2RGB(hex) {
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
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Create geometry mask for round displays
 */
function createGeometryMask(w, h, isRound) {
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
function findNearestColor(r, g, b, palette) {
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

/**
 * Apply Floyd-Steinberg dithering
 */
function applyFloydSteinbergDither(imgData, palette, w, h) {
  const data = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];
      const colIdx = findNearestColor(oldR, oldG, oldB, palette);
      const col = palette[colIdx];
      data[idx] = col.r;
      data[idx + 1] = col.g;
      data[idx + 2] = col.b;
      const errR = oldR - col.r;
      const errG = oldG - col.g;
      const errB = oldB - col.b;
      const addErr = (dx, dy, f) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny < h) {
          const nIdx = (ny * w + nx) * 4;
          data[nIdx] = Math.max(0, Math.min(255, data[nIdx] + errR * f));
          data[nIdx + 1] = Math.max(0, Math.min(255, data[nIdx + 1] + errG * f));
          data[nIdx + 2] = Math.max(0, Math.min(255, data[nIdx + 2] + errB * f));
        }
      };
      addErr(1, 0, 7 / 16);
      addErr(-1, 1, 3 / 16);
      addErr(0, 1, 5 / 16);
      addErr(1, 1, 1 / 16);
    }
  }
}

/**
 * Apply Bayer dithering
 */
function applyBayerDither(imgData, palette, w, h) {
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
      const colIdx = findNearestColor(
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
function getPixelIndices(imgData, palette, w, h) {
  const indices = new Uint8Array(w * h);
  const data = imgData.data;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    indices[i] = findNearestColor(r, g, b, palette);
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
 * @param {string} options.displayId - Display ID character (e.g., "9")
 * @param {boolean} options.isRound - Whether display is round (default: false)
 * @param {string} options.dither - Dithering type: "floyd", "bayer", or "none" (default: "floyd")
 * @param {number} options.orientation - Orientation: 0=landscape, 1=portrait (default: 0)
 * @param {Object} options.colorAdjust - Color adjustment options
 * @param {number} options.colorAdjust.saturation - Saturation adjustment (default: 1.0)
 * @param {number} options.colorAdjust.contrast - Contrast adjustment (default: 1.0)
 * @param {number} options.colorAdjust.blackPoint - Black point adjustment (default: 1.0)
 * @param {number} options.colorAdjust.whitePoint - White point adjustment (default: 1.0)
 * @returns {Promise<Uint8Array>} Encoded .ink file data
 */
export async function encodeInk(inputPath, options = {}) {
  const {
    colors = ["#FFFFFF", "#000000"],
    width,
    height,
    displayId = "9",
    isRound = false,
    dither = "floyd",
    orientation = 0,
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
  const palette = colors.map(c => hex2RGB(c));

  // Apply dithering
  if (dither === 'floyd') {
    applyFloydSteinbergDither(imgData, palette, w, h);
  } else if (dither === 'bayer') {
    applyBayerDither(imgData, palette, w, h);
  } else {
    // No dithering - just find nearest color
    for (let i = 0; i < imgData.data.length; i += 4) {
      const colIdx = findNearestColor(imgData.data[i], imgData.data[i + 1], imgData.data[i + 2], palette);
      const col = palette[colIdx];
      imgData.data[i] = col.r;
      imgData.data[i + 1] = col.g;
      imgData.data[i + 2] = col.b;
    }
  }

  // Get pixel indices
  const allPixels = getPixelIndices(imgData, palette, w, h);
  const mask = createGeometryMask(w, h, isRound);

  // Filter pixels based on geometry mask
  const pixelsToEncode = [];
  if (mask) {
    for (let i = 0; i < allPixels.length; i++) {
      if (mask[i] === 1) {
        pixelsToEncode.push(allPixels[i]);
      }
    }
  } else {
    pixelsToEncode.push(...allPixels);
  }

  // LZW Encoding
  const numColors = colors.length;
  const minCodeSize = Math.max(2, Math.ceil(Math.log2(numColors)));
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  
  let dict = new Map();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < (1 << minCodeSize); i++) {
      dict.set(String.fromCharCode(i), i);
    }
  };
  resetDict();

  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  const byteData = [];
  let bitBuf = 0;
  let bitCount = 0;

  const writeCode = (c, s) => {
    bitBuf |= (c << bitCount);
    bitCount += s;
    while (bitCount >= 8) {
      byteData.push(bitBuf & 0xFF);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode, codeSize);
  let phrase = "";
  
  for (let i = 0; i < pixelsToEncode.length; i++) {
    const char = String.fromCharCode(pixelsToEncode[i]);
    if (dict.has(phrase + char)) {
      phrase += char;
    } else {
      writeCode(dict.get(phrase), codeSize);
      dict.set(phrase + char, nextCode++);
      if (nextCode > (1 << codeSize) && codeSize < 12) {
        codeSize++;
      } else if (nextCode === 4096) {
        writeCode(clearCode, codeSize);
        resetDict();
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
      }
      phrase = char;
    }
  }
  
  writeCode(dict.get(phrase), codeSize);
  writeCode(eoiCode, codeSize);
  if (bitCount > 0) {
    byteData.push(bitBuf & 0xFF);
  }

  // Create output header: [version, displayId, dither, orient, ...data]
  const VERSION = 1;
  const out = new Uint8Array(4 + byteData.length);
  out[0] = VERSION;
  out[1] = displayId.charCodeAt(0);
  out[2] = (dither === 'bayer' ? 1 : (dither === 'floyd' ? 2 : 0));
  out[3] = orientation;
  out.set(byteData, 4);

  return out;
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
export async function decodeInk(inputPath, options = {}) {
  const {
    colors = ["#FFFFFF", "#000000"],
    width,
    height,
    isRound = false,
    outputPath = null
  } = options;

  // Read .ink file
  const data = Buffer.isBuffer(inputPath) ? inputPath : readFileSync(inputPath);
  const uint8Data = new Uint8Array(data);

  if (uint8Data.length < 4) {
    throw new Error("Invalid .ink file: too short");
  }

  // Detect format version
  let version, displayIdChar, storedDither, storedOrient, dataPtr;
  if (uint8Data[0] === 1) {
    // New format (Version 1)
    version = 1;
    displayIdChar = String.fromCharCode(uint8Data[1]);
    storedDither = uint8Data[2];
    storedOrient = uint8Data[3];
    dataPtr = 4;
  } else {
    // Old format (Version 0)
    version = 0;
    displayIdChar = String.fromCharCode(uint8Data[0]);
    storedDither = uint8Data[1];
    storedOrient = uint8Data[2];
    dataPtr = 4;
  }

  const w = width || 800;
  const h = height || 480;

  // Calculate minCodeSize from number of colors
  const numColors = colors.length;
  let minCodeSize = Math.max(2, Math.ceil(Math.log2(numColors)));

  // For old format, read minCodeSize from header
  if (version === 0) {
    minCodeSize = uint8Data[3];
  }

  // LZW Decoding
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

  // Create geometry mask
  const mask = createGeometryMask(w, h, isRound);
  const totalPixels = w * h;
  const validPixelCount = mask ? mask.reduce((sum, val) => sum + val, 0) : totalPixels;

  // Decode only valid pixels
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

  // Fill result array with decoded pixels and default color for masked pixels
  const palette = colors.map(c => hex2RGB(c));
  const defaultColor = palette[0] || { r: 255, g: 255, b: 255 };
  const result = new Uint8ClampedArray(w * h * 4);
  
  let decodedIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    let color;
    if (mask && mask[i] === 0) {
      // Masked pixel (corner): use default color
      color = defaultColor;
    } else {
      // Valid pixel: use decoded color
      color = palette[decodedPixels[decodedIdx++]] || defaultColor;
    }
    const pos = i * 4;
    result[pos] = color.r;
    result[pos + 1] = color.g;
    result[pos + 2] = color.b;
    result[pos + 3] = 255;
  }

  // Create PNG from decoded data
  const pngBuffer = await sharp(result, {
    raw: {
      width: w,
      height: h,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  // Save to file if output path specified
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
export async function loadConfigFromJSON(configPath) {
  const configContent = readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  
  // If config contains displayId, try to load from display definitions
  if (config.displayId && !config.colors) {
    const display = getDisplay(config.displayId);
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
  
  // Return options object compatible with encodeInk
  return {
    colors: config.colors,
    width: config.width,
    height: config.height,
    displayId: config.displayId,
    isRound: config.isRound || false,
    dither: config.dither || 'floyd',
    orientation: config.orientation || 0,
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
export async function encodeInkFromConfig(inputPath, configPath, outputPath = null) {
  const options = await loadConfigFromJSON(configPath);
  const inkData = await encodeInk(inputPath, options);
  
  if (outputPath) {
    writeFileSync(outputPath, inkData);
  }
  
  return inkData;
}

/**
 * Encode PNG image to .ink format using display ID
 * @param {string|Buffer} inputPath - Path to input PNG image or Buffer
 * @param {string} displayId - Display ID (e.g., "9", "A", "7")
 * @param {Object} overrides - Optional overrides for default options
 * @param {string} outputPath - Path to output .ink file (optional, if not provided, returns Buffer)
 * @returns {Promise<Uint8Array>} Encoded .ink file data
 */
export async function encodeInkFromDisplayId(inputPath, displayId, overrides = {}, outputPath = null) {
  const options = getOptionsFromDisplayId(displayId, overrides);
  const inkData = await encodeInk(inputPath, options);
  
  if (outputPath) {
    writeFileSync(outputPath, inkData);
  }
  
  return inkData;
}

/**
 * Default export
 */
export default {
  encodeInk,
  decodeInk,
  loadConfigFromJSON,
  encodeInkFromConfig,
  encodeInkFromDisplayId,
  getDisplay,
  getAllDisplays,
  getOptionsFromDisplayId,
  DISPLAYS
};




