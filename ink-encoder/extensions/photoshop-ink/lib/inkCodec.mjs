/**
 * Reiner JS-Codec für .ink (microPhotoFrame) — ohne Node/sharp.
 * Für Photoshop UXP, Browser-Vorschau und ggf. Thumbnail-Skripte.
 */
import { inflate, deflate } from "./pako.esm.mjs";

const GEOMETRY_SQUARE = 0;
const GEOMETRY_ROUND = 1;

const COLORS_BW = ["#FFFFFF", "#000000"];
const COLORS_GRAY4 = ["#FFFFFF", "#AAAAAA", "#555555", "#000000"];
const COLORS_BWR = ["#FFFFFF", "#000000", "#FF0000"];
const COLORS_BWY = ["#FFFFFF", "#000000", "#FFFF00"];
const COLORS_E6 = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00", "#0000FF", "#00FF00"];
const COLORS_BWRY = ["#000000", "#FFFFFF", "#FF0000", "#FFFF00"];

export const DISPLAYS = {
  EINK_NONE_DISPLAY: { id: "", name: "No Display", width: 0, height: 0, colors: [], geometry: GEOMETRY_SQUARE, size: 0 },
  EINK_BW_154_SQ_200x200: { id: "0", name: 'B&W 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 1.54 },
  EINK_BW_213_SQ_250x122: { id: "1", name: 'B&W 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BW_290_SQ_296x128: { id: "2", name: 'B&W 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 2.9 },
  EINK_BW_420_SQ_400x300: { id: "3", name: 'B&W 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BW_583_SQ_648x480: { id: "4", name: 'B&W 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 5.83 },
  EINK_BW_750_SQ_800x480: { id: "5", name: 'B&W 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_BW_1030_SQ_1872x1404: { id: "6", name: 'B&W 10.3" · 1872×1404 · Carta', width: 1872, height: 1404, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 10.3 },
  EINK_BW_1330_SQ_2200x1650: { id: "7", name: 'B&W 13.3" · 2200×1650 · Fina', width: 2200, height: 1650, colors: COLORS_BW, geometry: GEOMETRY_SQUARE, size: 13.3 },
  EINK_GRAY4_213_SQ_250x122: { id: "A", name: 'Gray4 2.13" · 250×122', width: 250, height: 122, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_GRAY4_397_SQ_800x480: { id: "B", name: 'Gray4 3.97" · 800×480', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 3.97 },
  EINK_GRAY4_420_SQ_400x300: { id: "C", name: 'Gray4 4.2" · 400×300', width: 400, height: 300, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_GRAY4_750_SQ_800x480: { id: "D", name: 'Gray4 7.5" · 800×480 · reTerminal E1001', width: 800, height: 480, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_GRAY4_1030_SQ_1872x1404: { id: "E", name: 'Gray4 10.3" · 1872×1404', width: 1872, height: 1404, colors: COLORS_GRAY4, geometry: GEOMETRY_SQUARE, size: 10.3 },
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
  EINK_BWR_154_SQ_200x200: { id: "Q", name: 'Spectra BWR · 1.54" · 200×200', width: 200, height: 200, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 1.54 },
  EINK_BWR_213_SQ_250x122: { id: "R", name: 'Spectra BWR · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWR_270_SQ_264x176: { id: "S", name: 'Spectra BWR · 2.7" · 264×176', width: 264, height: 176, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.7 },
  EINK_BWR_290_SQ_296x128: { id: "T", name: 'Spectra BWR · 2.9" · 296×128', width: 296, height: 128, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 2.9 },
  EINK_BWR_420_SQ_400x300: { id: "U", name: 'Spectra BWR · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BWR_583_SQ_648x480: { id: "V", name: 'Spectra BWR · 5.83" · 648×480', width: 648, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 5.83 },
  EINK_BWR_750_SQ_800x480: { id: "W", name: 'Spectra BWR · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 7.5 },
  EINK_BWY_213_SQ_250x122: { id: "X", name: 'Spectra BWY · 2.13" · 250×122', width: 250, height: 122, colors: COLORS_BWY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWR_1248_SQ_1304x984: { id: "Y", name: 'Spectra BWR · 12.48" · 1304×984', width: 1304, height: 984, colors: COLORS_BWR, geometry: GEOMETRY_SQUARE, size: 12.48 },
  EINK_BWRY_213_SQ_212x104: { id: "a", name: 'Spectra 3100 · 2.13" · 212×104', width: 212, height: 104, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.13 },
  EINK_BWRY_266_SQ_296x152: { id: "b", name: 'Spectra 3100 · 2.66" · 296×152', width: 296, height: 152, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 2.66 },
  EINK_BWRY_300_SQ_400x168: { id: "c", name: 'Spectra 3100 · 3.0" · 400×168', width: 400, height: 168, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 3.0 },
  EINK_BWRY_420_SQ_400x300: { id: "d", name: 'Spectra 3100 · 4.2" · 400×300', width: 400, height: 300, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 4.2 },
  EINK_BWRY_750_SQ_800x480: { id: "e", name: 'Spectra 3100 · 7.5" · 800×480', width: 800, height: 480, colors: COLORS_BWRY, geometry: GEOMETRY_SQUARE, size: 7.5 }
};

const DISPLAY_LONG_ID_BY_SHORT_ID = {
  "": "EINK_NONE_DISPLAY",
  "0": "EINK_BW_154_SQ_200x200",
  "1": "EINK_BW_213_SQ_250x122",
  "2": "EINK_BW_290_SQ_296x128",
  "3": "EINK_BW_420_SQ_400x300",
  "4": "EINK_BW_583_SQ_648x480",
  "5": "EINK_BW_750_SQ_800x480",
  "6": "EINK_BW_1030_SQ_1872x1404",
  "7": "EINK_BW_1330_SQ_2200x1650",
  A: "EINK_GRAY4_213_SQ_250x122",
  B: "EINK_GRAY4_397_SQ_800x480",
  C: "EINK_GRAY4_420_SQ_400x300",
  D: "EINK_GRAY4_750_SQ_800x480",
  E: "EINK_GRAY4_1030_SQ_1872x1404",
  G: "EINK_SPECTRA6_169_RD_400x400",
  H: "EINK_SPECTRA6_400_SQ_600x400",
  I: "EINK_SPECTRA6_730_SQ_800x480",
  J: "EINK_SPECTRA6_814_SQ_1024x576",
  K: "EINK_SPECTRA6_1330_SQ_1600x1200",
  L: "EINK_SPECTRA6_2530_SQ_3200x1800",
  M: "EINK_SPECTRA6_2850_SQ_2160x3060",
  N: "EINK_SPECTRA6_3150_SQ_2560x1440",
  O: "EINK_SPECTRA6_3200_SQ_2560x1440",
  P: "EINK_SPECTRA6_4300_SQ_3840x2160",
  Q: "EINK_BWR_154_SQ_200x200",
  R: "EINK_BWR_213_SQ_250x122",
  S: "EINK_BWR_270_SQ_264x176",
  T: "EINK_BWR_290_SQ_296x128",
  U: "EINK_BWR_420_SQ_400x300",
  V: "EINK_BWR_583_SQ_648x480",
  W: "EINK_BWR_750_SQ_800x480",
  X: "EINK_BWY_213_SQ_250x122",
  Y: "EINK_BWR_1248_SQ_1304x984",
  a: "EINK_BWRY_213_SQ_212x104",
  b: "EINK_BWRY_266_SQ_296x152",
  c: "EINK_BWRY_300_SQ_400x168",
  d: "EINK_BWRY_420_SQ_400x300",
  e: "EINK_BWRY_750_SQ_800x480"
};

export function getDisplayByShortId(shortId) {
  const longId = DISPLAY_LONG_ID_BY_SHORT_ID[shortId];
  return longId ? DISPLAYS[longId] : null;
}

export function listDisplayChoices() {
  return Object.values(DISPLAYS)
    .filter((d) => d.id)
    .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
}

export function parseInkHeader(uint8Data) {
  if (uint8Data.length < 4) throw new Error(".ink zu kurz");
  const version = uint8Data[0];
  // Byte 3: bei v1–v3 Orientierung (0=Quer, 1=Hochkant); bei v0 = LZW minCodeSize (nicht als Orientierung lesen)
  const orientation = version >= 1 && version <= 3 ? uint8Data[3] & 1 : 0;
  return {
    version,
    displayId: String.fromCharCode(uint8Data[1]),
    dither: uint8Data[2],
    orientation
  };
}

export function decodeOptionsFromInkFile(uint8Data) {
  const header = parseInkHeader(uint8Data);
  const display = getDisplayByShortId(header.displayId);
  if (!display) {
    throw new Error(`Unbekannte Display-ID im Header: "${header.displayId}" (Code ${uint8Data[1]})`);
  }
  return {
    colors: display.colors,
    width: display.width,
    height: display.height,
    isRound: display.geometry === GEOMETRY_ROUND,
    header
  };
}

function hex2rgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let c = hex.startsWith("#") ? hex.slice(1) : hex;
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const tmp = parseInt(c, 16);
  return { r: (tmp >> 16) & 255, g: (tmp >> 8) & 255, b: tmp & 255 };
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function inversePaethInPlace(data, count, rowWidth, numColors) {
  for (let i = 0; i < count; i++) {
    const a = rowWidth > 0 && i % rowWidth > 0 ? data[i - 1] : 0;
    const b = rowWidth > 0 && i >= rowWidth ? data[i - rowWidth] : 0;
    const c = rowWidth > 0 && i % rowWidth > 0 && i >= rowWidth ? data[i - rowWidth - 1] : 0;
    const pred = rowWidth > 0 ? paethPredictor(a, b, c) : i > 0 ? data[i - 1] : 0;
    data[i] = (data[i] + pred) % numColors;
  }
}

function createGeometryMask(w, h, isRound) {
  if (!isRound) return null;
  const mask = new Uint8Array(w * h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      mask[y * w + x] = Math.sqrt(dx * dx + dy * dy) <= r ? 1 : 0;
    }
  }
  return mask;
}

function decompressLZW(uint8Data, dataPtr, minCodeSize, validPixelCount) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let bitBuf = 0;
  let bitCount = 0;
  let ptr = dataPtr;
  let codeSize = minCodeSize + 1;

  const readCode = () => {
    while (bitCount < codeSize) {
      if (ptr >= uint8Data.length) return eoiCode;
      bitBuf |= uint8Data[ptr++] << bitCount;
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
    for (let i = 0; i < 1 << minCodeSize; i++) dict[i] = [i];
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
    let entry = dict[code]
      ? dict[code]
      : code === dict.length
        ? [...dict[oldCode], dict[oldCode][0]]
        : null;
    if (!entry) break;
    for (let j = 0; j < entry.length; j++) {
      if (decodedPixels.length < validPixelCount) decodedPixels.push(entry[j]);
    }
    if (oldCode !== -1) {
      dict.push([...dict[oldCode], entry[0]]);
      if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
    }
    oldCode = code;
  }
  return decodedPixels;
}

function decompressRLE(uint8Data, dataPtr, validPixelCount) {
  const decodedPixels = [];
  let ptr = dataPtr;
  while (decodedPixels.length < validPixelCount && ptr < uint8Data.length - 1) {
    const value = uint8Data[ptr++];
    const count = uint8Data[ptr++];
    for (let i = 0; i < count && decodedPixels.length < validPixelCount; i++) decodedPixels.push(value);
  }
  return decodedPixels;
}

function decompressNone(uint8Data, dataPtr, validPixelCount) {
  const decodedPixels = [];
  let ptr = dataPtr;
  while (decodedPixels.length < validPixelCount && ptr < uint8Data.length) decodedPixels.push(uint8Data[ptr++]);
  return decodedPixels;
}

/** Wie GDI+ Rotate270FlipNone — Kopf zeigt im Raster nach links, 270° CW stellt aufrecht. Empirisch verifiziert. */
function rotateRgba270Clockwise(rgba, w, h) {
  const nw = h;
  const nh = w;
  const out = new Uint8ClampedArray(nw * nh * 4);
  for (let dy = 0; dy < nh; dy++) {
    for (let dx = 0; dx < nw; dx++) {
      const sx = w - 1 - dy;
      const sy = dx;
      const si = (sy * w + sx) * 4;
      const di = (dy * nw + dx) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3];
    }
  }
  return { rgba: out, width: nw, height: nh };
}

/**
 * Dekodiert .ink → RGBA (Breite/Höhe aus options oder automatisch aus Header+Display).
 */
export function decodeInk(uint8Data, options = {}) {
  const buf = uint8Data instanceof Uint8Array ? uint8Data : new Uint8Array(uint8Data);
  let colors = options.colors;
  let width = options.width;
  let height = options.height;
  let isRound = options.isRound;

  if (options.autoFromHeader !== false && colors == null) {
    const o = decodeOptionsFromInkFile(buf);
    colors = o.colors;
    width = o.width;
    height = o.height;
    isRound = o.isRound;
  }

  if (!colors || width == null || height == null) {
    throw new Error("decodeInk: colors, width, height erforderlich (oder autoFromHeader)");
  }

  const w = width;
  const h = height;
  const totalPixels = w * h;
  const numColors = colors.length;
  const rowWidth = w;
  const palette = colors.map((c) => hex2rgb(c));
  const defaultColor = palette[0] || { r: 255, g: 255, b: 255 };
  const mask = createGeometryMask(w, h, !!isRound);
  const validPixelCount = mask ? mask.reduce((n, v) => n + v, 0) : totalPixels;

  let version = buf[0];
  let dataPtr = 4;
  let legacyFiveByte = false;
  let legacyCompression = 0;

  if (version === 2 && buf.length > 6 && buf[4] <= 2 && buf[5] !== 0x78 && buf[5] !== 0x58) {
    legacyFiveByte = true;
    legacyCompression = buf[4];
    dataPtr = 5;
  }

  let decodedPixels;
  if (version >= 1 && version <= 3) {
    if (legacyFiveByte) {
      if (legacyCompression === 1) decodedPixels = decompressRLE(buf, dataPtr, validPixelCount);
      else if (legacyCompression === 2) decodedPixels = decompressNone(buf, dataPtr, validPixelCount);
      else decodedPixels = decompressLZW(buf, dataPtr, 3, validPixelCount);
    } else if (version === 3) {
      const inflated = inflate(buf.subarray(dataPtr), { raw: false });
      const b = new Uint8Array(inflated);
      if (b.length < validPixelCount) throw new Error(`INK v3: nach Inflate ${b.length} B, erwartet ${validPixelCount}`);
      inversePaethInPlace(b, validPixelCount, rowWidth, numColors);
      decodedPixels = Array.from(b.subarray(0, validPixelCount));
    } else if (version === 2) {
      const inflated = inflate(buf.subarray(dataPtr), { raw: false });
      const arr = new Uint8Array(inflated);
      if (arr.length < validPixelCount) throw new Error(`INK v2: nach Inflate ${arr.length} B, erwartet ≥ ${validPixelCount}`);
      decodedPixels = Array.from(arr.subarray(0, validPixelCount));
    } else {
      decodedPixels = decompressLZW(buf, dataPtr, 3, validPixelCount);
    }
  } else {
    if (buf.length < 5) throw new Error(`Unbekannte .ink Version (${version})`);
    const minCodeSizeV0 = buf[3];
    decodedPixels = decompressLZW(buf, 4, minCodeSizeV0, validPixelCount);
  }

  const rgba = new Uint8ClampedArray(totalPixels * 4);
  let decodedIdx = 0;
  for (let i = 0; i < totalPixels; i++) {
    let color;
    if (mask && mask[i] === 0) color = defaultColor;
    else {
      const idx = decodedPixels[decodedIdx++];
      color = palette[idx] ?? defaultColor;
    }
    const pos = i * 4;
    rgba[pos] = color.r;
    rgba[pos + 1] = color.g;
    rgba[pos + 2] = color.b;
    rgba[pos + 3] = 255;
  }

  const portrait =
    version >= 1 && version <= 3 && (buf[3] & 1) === 1;
  if (portrait && !isRound) {
    const r = rotateRgba270Clockwise(rgba, w, h);
    return { width: r.width, height: r.height, rgba: r.rgba };
  }

  return { width: w, height: h, rgba };
}

function rgb2hls(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let l = (max + min) / 2;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h, l, s };
}

function hls2rgb(h, l, s) {
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

function findNearestColor(r, g, b, palette) {
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < palette.length; i++) {
    const col = palette[i];
    const dist = (r - col.r) ** 2 + (g - col.g) ** 2 + (b - col.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

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

const M8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

function applyBayerDither(imgData, palette, w, h) {
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

function getPixelIndices(imgData, palette, w, h) {
  const indices = new Uint8Array(w * h);
  const data = imgData.data;
  for (let i = 0; i < w * h; i++) {
    indices[i] = findNearestColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], palette);
  }
  return indices;
}

function compressLZWFirmware(pixels) {
  const minCodeSize = 3;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const dict = new Map();
  const resetDict = () => {
    dict.clear();
    for (let i = 0; i < 1 << minCodeSize; i++) dict.set(String.fromCharCode(i), i);
  };
  resetDict();
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  const byteData = [];
  let bitBuf = 0;
  let bitCount = 0;

  const writeCode = (c, s) => {
    bitBuf |= c << bitCount;
    bitCount += s;
    while (bitCount >= 8) {
      byteData.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode, codeSize);
  let phrase = "";
  for (let i = 0; i < pixels.length; i++) {
    const char = String.fromCharCode(pixels[i]);
    if (dict.has(phrase + char)) phrase += char;
    else {
      writeCode(dict.get(phrase), codeSize);
      dict.set(phrase + char, nextCode++);
      if (nextCode > 1 << codeSize && codeSize < 12) codeSize++;
      else if (nextCode === 4096) {
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
  if (bitCount > 0) byteData.push(bitBuf & 0xff);
  return new Uint8Array(byteData);
}

function forwardPaethDeltas(pixels, count, rowWidth, numColors) {
  const out = new Uint8Array(count);
  const recon = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const a = rowWidth > 0 && i % rowWidth > 0 ? recon[i - 1] : 0;
    const b = rowWidth > 0 && i >= rowWidth ? recon[i - rowWidth] : 0;
    const c = rowWidth > 0 && i % rowWidth > 0 && i >= rowWidth ? recon[i - rowWidth - 1] : 0;
    const pred = rowWidth > 0 ? paethPredictor(a, b, c) : i > 0 ? recon[i - 1] : 0;
    const orig = pixels[i];
    out[i] = ((orig - pred) % numColors + numColors) % numColors;
    recon[i] = orig;
  }
  return out;
}

function ditherToByte(dither) {
  if (dither === "bayer") return 1;
  if (dither === "floyd") return 2;
  return 0;
}

function resolveInkFormatVersion(compression, inkFormat) {
  if (typeof inkFormat === "number" && inkFormat >= 1 && inkFormat <= 3) return inkFormat;
  const c = String(compression || "").toLowerCase();
  if (c === "lzw" || c === "v1") return 1;
  if (c === "deflate" || c === "zlib" || c === "v2") return 2;
  if (c === "deflatepaeth" || c === "paeth" || c === "v3") return 3;
  return 3;
}

/**
 * RGBA (w×h, row-major) → .ink-Datei (Uint8Array).
 * options wie in ink-encoder EncodeInk (ohne sharp/Pfad).
 */
export function encodeInkFromRGBA(rgba, w, h, options = {}) {
  const {
    colors = ["#FFFFFF", "#000000"],
    displayId = "I",
    isRound = false,
    dither = "floyd",
    orientation = 0,
    compression = "deflatePaeth",
    inkFormat: inkFormatOpt,
    colorAdjust = {}
  } = options;

  const { saturation = 1, contrast = 1, blackPoint = 1, whitePoint = 1 } = colorAdjust;

  if (rgba.length < w * h * 4) throw new Error("encodeInkFromRGBA: RGBA-Puffer zu klein");

  const data = new Uint8ClampedArray(rgba);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let { h: hue, l: lig, s: sat } = rgb2hls(r, g, b);
    if (saturation === 0) sat = 0;
    else sat = Math.min(1, sat * saturation);
    if (lig < 0.5) lig = lig / blackPoint;
    else lig = 1 - (1 - lig) / whitePoint;
    if (contrast !== 1) lig = (lig - 0.5) * contrast + 0.5;
    lig = Math.max(0, Math.min(1, lig));
    const [nr, ng, nb] = hls2rgb(hue, lig, sat);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }

  const imgData = { data, width: w, height: h };
  const palette = colors.map((c) => hex2rgb(c));

  if (dither === "floyd") applyFloydSteinbergDither(imgData, palette, w, h);
  else if (dither === "bayer") applyBayerDither(imgData, palette, w, h);
  else {
    for (let i = 0; i < data.length; i += 4) {
      const colIdx = findNearestColor(data[i], data[i + 1], data[i + 2], palette);
      const col = palette[colIdx];
      data[i] = col.r;
      data[i + 1] = col.g;
      data[i + 2] = col.b;
    }
  }

  const allPixels = getPixelIndices(imgData, palette, w, h);
  const mask = createGeometryMask(w, h, isRound);
  let pixelsToEncode;
  if (mask) {
    pixelsToEncode = [];
    for (let i = 0; i < allPixels.length; i++) if (mask[i] === 1) pixelsToEncode.push(allPixels[i]);
  } else pixelsToEncode = Array.from(allPixels);

  let fmt = resolveInkFormatVersion(compression, inkFormatOpt);
  if (isRound && fmt === 3) fmt = 2;

  const numColors = colors.length;
  const rowWidth = w;
  const raw = Uint8Array.from(pixelsToEncode);

  let payload;
  if (fmt === 1) payload = compressLZWFirmware(Array.from(raw));
  else if (fmt === 2) payload = deflate(raw, { level: 9 });
  else {
    const deltas = forwardPaethDeltas(raw, raw.length, rowWidth, numColors);
    payload = deflate(deltas, { level: 9 });
  }

  const out = new Uint8Array(4 + payload.length);
  out[0] = fmt;
  out[1] = String(displayId).charCodeAt(0);
  out[2] = ditherToByte(dither);
  out[3] = orientation & 1;
  out.set(payload, 4);
  return out;
}

/**
 * Zeichnet RGBA auf Canvas 2D (Browser/UXP).
 */
export function drawRgbaToCanvas(canvas, rgba, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = new ImageData(rgba, w, h);
  ctx.putImageData(img, 0, 0);
}
