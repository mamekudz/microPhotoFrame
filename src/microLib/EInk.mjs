// ===========================================
// eink.mjs
// © 2026 Meinolf Amekudzi
// (published under MIT license)
// ===========================================

/** E-Ink Display Image Functions.
 * @module EInk
 */
import EInkDef from "./EInkDef.mjs";

/** Class with image helper functions.
 * @class EInk
 */
export default class EInk {
  static PATTERN_COUNTS = new Map();
  static GLOBAL_PATTERNS = [];

  #imgRef = "";
  #displayID = "EINK_NONE_DISPLAY";
  #display = null;
  #cnvEncodedData = null;

  #imgOrg = null;
  #imgOrgCnv = null;
  #imgOrgCtx = null;
  #imgOrgData = null;
  #imgCnv = null;
  #imgCnvCnv = null;
  #imgCnvCtx = null;
  #imgCnvData = null;
  #ditherType = "floyd";
  #aspect = EInkDef.LANDSCAPE;

  constructor(_imgRef = "", _displayID = "EINK_E6_730_sq_800x480") {
    this.#imgRef = _imgRef;
    this.displayID = _displayID;
    this.#display = EInkDef.DISPLAYS[this.displayID];

    if (!this.#display) {
      throw new Error(`Invalid DisplayID: ${this.displayID}`);
    }
  }

  Load() {
    return new Promise((_resolve, _reject) => {
      this.#display = EInkDef.DISPLAYS[this.displayID];

      if (!this.#display) {
        _reject("Ungültige DisplayID: " + this.displayID);
        return;
      }

      if (this.#imgOrg == null) {
        this.#imgOrg = document.createElement("img");
      }

      this.#imgOrg.onload = () => {
        if (this.#imgOrg.width === 0 || this.#imgOrg.height === 0) {
          _reject("Image loaded, but no dimensions.");
          return;
        }

        this.#imgOrgCnv = document.createElement('canvas');
        this.#imgOrgCnv.width = this.#imgOrg.width;
        this.#imgOrgCnv.height = this.#imgOrg.height;
        this.#imgOrgCtx = this.#imgOrgCnv.getContext("2d");
        this.#imgOrgCtx.drawImage(this.#imgOrg, 0, 0);
        this.#imgOrgData = this.#imgOrgCtx.getImageData(0, 0, this.#imgOrg.width, this.#imgOrg.height);

        this.#imgCnvCnv = document.createElement('canvas');
        this.#imgCnvCnv.width = this.#display.width;
        this.#imgCnvCnv.height = this.#display.height;
        this.#imgCnvCtx = this.#imgCnvCnv.getContext("2d", { willReadFrequently: true });
        this.#imgCnvData = this.#imgCnvCtx.getImageData(0, 0, this.#display.width, this.#display.height);

        _resolve();
      };

      this.#imgOrg.onerror = () => { _reject("Error loading image."); };

      if (this.#imgRef instanceof File) {
        let reader = new FileReader();
        reader.onload = (_le) => { this.#imgOrg.src = _le.target.result; };
        reader.readAsDataURL(this.#imgRef);
      } else if (typeof this.#imgRef === 'string') {
        this.#imgOrg.src = this.#imgRef;
      } else if (this.#imgRef instanceof Uint8Array) {
        this.#PrepareCanvas(this.#display.width, this.#display.height);
        this.Decode(this.#imgRef);
        _resolve();
      } else {
        _reject("Invalid image reference");
      }
    });
  }

  #RGB2HLS(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, l, s];
  }

  #HLS2RGB(h, l, s) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const HUE2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = HUE2rgb(p, q, h + 1 / 3);
      g = HUE2rgb(p, q, h);
      b = HUE2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  Convert(_opts) {
    this.#ditherType = _opts.ditherType || "floyd";
    let aspect = _opts.cutAspect;
    this.#aspect = aspect;
    let rotate = false;
    let sx = 0, sy = 0, sw = this.#imgOrg.width, sh = this.#imgOrg.height;
    let dw = this.#display.width, dh = this.#display.height;

    if (aspect === EInkDef.PORTRAIT) {
      rotate = true;
      aspect = dh / dw;
    } else {
      rotate = false;
      aspect = dw / dh;
    }

    let imgAspect = sw / sh;
    if (imgAspect > aspect) sw = sh * aspect;
    else sh = sw / aspect;

    let zoom = _opts.zoom || 1.0;
    sw /= zoom; sh /= zoom;

    let spotX = (_opts.cutSpotX >= 0 && _opts.cutSpotX <= 1) ? _opts.cutSpotX : 0.5;
    let spotY = (_opts.cutSpotY >= 0 && _opts.cutSpotY <= 1) ? _opts.cutSpotY : 0.5;

    sx = (this.#imgOrg.width * spotX) - (sw / 2);
    sy = (this.#imgOrg.height * spotY) - (sh / 2);

    if (sw <= this.#imgOrg.width) sx = Math.max(0, Math.min(sx, this.#imgOrg.width - sw));
    if (sh <= this.#imgOrg.height) sy = Math.max(0, Math.min(sy, this.#imgOrg.height - sh));

    let ctx = this.#imgCnvCtx;
    ctx.save();
    ctx.fillStyle = _opts.cutBgrdColor || "#ffffff";
    ctx.fillRect(0, 0, dw, dh);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (rotate) {
      ctx.translate(dw / 2, dh / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(this.#imgOrg, sx, sy, sw, sh, -dh / 2, -dw / 2, dh, dw);
    } else {
      ctx.drawImage(this.#imgOrg, sx, sy, sw, sh, 0, 0, dw, dh);
    }
    ctx.restore();

    this.#imgCnvData = ctx.getImageData(0, 0, dw, dh);
    let d = this.#imgCnvData.data;

    // --- COLOR CORRECTIONS (FIXED: BLACK- & WHITEPOINT INCLUDED) ---
    const satAdj = _opts.colorSaturationAdjust || 1.0;
    const conAdj = _opts.contrastAdjust || 1.0;
    const bp = _opts.blackPointAdjust || 1.0;
    const wp = _opts.whitePointAdjust || 1.0;

    for (let i = 0; i < d.length; i += 4) {
      let [hue, lig, sat] = this.#RGB2HLS(d[i], d[i + 1], d[i + 2]);

      // Saturation
      if (satAdj === 0.0) {
        sat = 0; // Force grayscale when saturation is 0
      } else {
        sat = Math.min(1, sat * satAdj);
      }

      // Blackpoint & Whitepoint Logic
      // Scale luminance to stretch or compress shadows/highlights
      if (lig < 0.5) {
        lig = lig / bp;
      } else {
        lig = 1.0 - ((1.0 - lig) / wp);
      }

      // Contrast
      if (conAdj !== 1.0) {
        lig = (lig - 0.5) * conAdj + 0.5;
      }

      lig = Math.max(0, Math.min(1, lig));

      let [nr, ng, nb] = this.#HLS2RGB(hue, lig, sat);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
    }

    // --- DITHERING ---
    const palette = this.#display.colors.map(c => this.#Hex2RGB(c));
    const findNearest = (r, g, b) => {
      let bestDist = Infinity, bestCol = palette[0];
      for (let col of palette) {
        let dist = Math.pow(r - col.r, 2) + Math.pow(g - col.g, 2) + Math.pow(b - col.b, 2);
        if (dist < bestDist) { bestDist = dist; bestCol = col; }
      }
      return bestCol;
    };

    if (this.#ditherType === 'bayer') {
      const M8 = [
        [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]
      ];
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          let idx = (y * dw + x) * 4;
          let threshold = (M8[y % 8][x % 8] - 32) * 1.8;
          let col = findNearest(d[idx] + threshold, d[idx + 1] + threshold, d[idx + 2] + threshold);
          d[idx] = col.r; d[idx + 1] = col.g; d[idx + 2] = col.b;
        }
      }
    } else if (this.#ditherType === 'floyd') {
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          let idx = (y * dw + x) * 4;
          let oldR = d[idx], oldG = d[idx + 1], oldB = d[idx + 2];
          let col = findNearest(oldR, oldG, oldB);
          d[idx] = col.r; d[idx + 1] = col.g; d[idx + 2] = col.b;
          let errR = oldR - col.r, errG = oldG - col.g, errB = oldB - col.b;
          const addErr = (dx, dy, f) => {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < dw && ny < dh) {
              let nIdx = (ny * dw + nx) * 4;
              d[nIdx] += errR * f; d[nIdx + 1] += errG * f; d[nIdx + 2] += errB * f;
            }
          };
          addErr(1, 0, 7 / 16); addErr(-1, 1, 3 / 16); addErr(0, 1, 5 / 16); addErr(1, 1, 1 / 16);
        }
      }
    } else {
      for (let i = 0; i < d.length; i += 4) {
        let col = findNearest(d[i], d[i + 1], d[i + 2]);
        d[i] = col.r; d[i + 1] = col.g; d[i + 2] = col.b;
      }
    }
    this.#imgCnvCtx.putImageData(this.#imgCnvData, 0, 0);
  }

  #Hex2RGB(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const tmp = parseInt(c, 16);
    return { r: (tmp >> 16) & 255, g: (tmp >> 8) & 255, b: tmp & 255 };
  }

  Encode() {
    const display = EInkDef.DISPLAYS[this.displayID];
    const w = this.#imgCnvCnv.width, h = this.#imgCnvCnv.height;
    const imgData = this.#imgCnvCtx.getImageData(0, 0, w, h).data;
    const allPixels = this.#GetPixelIndices(imgData, w, h);
    const mask = this.#CreateGeometryMask(w, h);
    
    // Filter pixels based on geometry mask (only encode valid pixels for round displays)
    const pixelsToEncode = [];
    if (mask) {
      for (let i = 0; i < allPixels.length; i++) {
        if (mask[i] === 1) {
          pixelsToEncode.push(allPixels[i]);
        }
      }
    } else {
      // Square geometry: encode all pixels
      for (let i = 0; i < allPixels.length; i++) {
        pixelsToEncode.push(allPixels[i]);
      }
    }
    
    const numColors = display.colors.length;
    let minCodeSize = Math.max(2, Math.ceil(Math.log2(numColors)));
    let clearCode = 1 << minCodeSize, eoiCode = clearCode + 1;
    let dict = new Map();
    const resetDict = () => {
      dict.clear();
      for (let i = 0; i < (1 << minCodeSize); i++) dict.Set(String.fromCharCode(i), i);
    };
    resetDict();
    let nextCode = eoiCode + 1, codeSize = minCodeSize + 1, byteData = [], bitBuf = 0, bitCount = 0;
    const writeCode = (c, s) => {
      bitBuf |= (c << bitCount); bitCount += s;
      while (bitCount >= 8) { byteData.push(bitBuf & 0xFF); bitBuf >>= 8; bitCount -= 8; }
    };
    writeCode(clearCode, codeSize);
    let phrase = "";
    for (let i = 0; i < pixelsToEncode.length; i++) {
      let char = String.fromCharCode(pixelsToEncode[i]);
      if (dict.has(phrase + char)) { phrase += char; }
      else {
        writeCode(dict.Get(phrase), codeSize);
        dict.Set(phrase + char, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
        else if (nextCode === 4096) { writeCode(clearCode, codeSize); resetDict(); nextCode = eoiCode + 1; codeSize = minCodeSize + 1; }
        phrase = char;
      }
    }
    writeCode(dict.Get(phrase), codeSize);
    writeCode(eoiCode, codeSize);
    if (bitCount > 0) byteData.push(bitBuf & 0xFF);
    
    // New format: [version, displayId, dither, orient, ...data]
    const VERSION = 1;
    let out = new Uint8Array(4 + byteData.length);
    out[0] = VERSION;
    out[1] = display.id.charCodeAt(0);
    out[2] = (this.#ditherType === 'bayer' ? 1 : (this.#ditherType === 'floyd' ? 2 : 0));
    out[3] = (this.#aspect === EInkDef.PORTRAIT ? 1 : 0);
    out.Set(byteData, 4);
    return out;
  }

  Decode(_data) {
    const data = _data || this.#imgRef;
    if (!(data instanceof Uint8Array)) return;
    
    // Detect format version
    let version, displayIdChar, storedDither, storedOrient, dataPtr;
    if (data.length >= 4 && data[0] === 1) {
      // New format (Version 1): [version, displayId, dither, orient, ...data]
      version = 1;
      displayIdChar = String.fromCharCode(data[1]);
      storedDither = data[2];
      storedOrient = data[3];
      dataPtr = 4;
    } else {
      // Old format (Version 0): [displayId, dither, orient, minCodeSize, ...data]
      version = 0;
      displayIdChar = String.fromCharCode(data[0]);
      storedDither = data[1];
      storedOrient = data[2];
      dataPtr = 4;
    }
    
    const displayEntry = Object.entries(EInkDef.DISPLAYS).find(([k, v]) => v.id === displayIdChar);
    if (!displayEntry) return;
    this.displayID = displayEntry[0]; this.#display = displayEntry[1];
    const w = this.#display.width, h = this.#display.height;
    
    // Calculate minCodeSize from number of colors
    const numColors = this.#display.colors.length;
    let minCodeSize = Math.max(2, Math.ceil(Math.log2(numColors)));
    
    // For old format, read minCodeSize from header
    if (version === 0) {
      minCodeSize = data[3];
    }
    
    let clearCode = 1 << minCodeSize, eoiCode = clearCode + 1, bitBuf = 0, bitCount = 0, ptr = dataPtr, codeSize = minCodeSize + 1;
    const readCode = () => {
      while (bitCount < codeSize) { if (ptr >= data.length) return eoiCode; bitBuf |= (data[ptr++] << bitCount); bitCount += 8; }
      let code = bitBuf & ((1 << codeSize) - 1); bitBuf >>= codeSize; bitCount -= codeSize; return code;
    };
    let dict = [];
    const initDict = () => { dict = []; for (let i = 0; i < (1 << minCodeSize); i++) dict[i] = [i]; dict[clearCode] = []; dict[eoiCode] = []; };
    initDict();
    
    // Create geometry mask
    const mask = this.#CreateGeometryMask(w, h);
    const totalPixels = w * h;
    const validPixelCount = mask ? mask.reduce((sum, val) => sum + val, 0) : totalPixels;
    
    // Decode only valid pixels
    let decodedPixels = [];
    let oldCode = -1;
    while (decodedPixels.length < validPixelCount) {
      let code = readCode();
      if (code === eoiCode) break;
      if (code === clearCode) { initDict(); codeSize = minCodeSize + 1; oldCode = -1; continue; }
      let entry = dict[code] ? dict[code] : (code === dict.length ? [...dict[oldCode], dict[oldCode][0]] : null);
      if (!entry) break;
      for (let j = 0; j < entry.length; j++) { 
        if (decodedPixels.length < validPixelCount) decodedPixels.push(entry[j]);
      }
      if (oldCode !== -1) { dict.push([...dict[oldCode], entry[0]]); if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++; }
      oldCode = code;
    }
    
    // Fill result array with decoded pixels and default color for masked pixels
    this.#PrepareCanvas(w, h);
    const imgData = this.#imgCnvCtx.createImageData(w, h);
    const palette = this.#display.colors.map(c => this.#Hex2RGB(c));
    const defaultColor = palette[0]; // Use first color (usually white) for masked pixels
    
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
      imgData.data[pos] = color.r; 
      imgData.data[pos + 1] = color.g; 
      imgData.data[pos + 2] = color.b; 
      imgData.data[pos + 3] = 255;
    }
    this.#imgCnvCtx.putImageData(imgData, 0, 0);
  }

  #CreateGeometryMask(w, h) {
    const display = EInkDef.DISPLAYS[this.displayID];
    if (display.geometry === EInkDef.GEOMETRY_ROUND) {
      // Create circular mask
      const mask = new Uint8Array(w * h);
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) / 2;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            mask[y * w + x] = 1; // Valid pixel
          } else {
            mask[y * w + x] = 0; // Invalid pixel (corner)
          }
        }
      }
      return mask;
    }
    // Square geometry: all pixels are valid
    return null;
  }

  #GetPixelIndices(rgbaData, w, h, mask = null) {
    const display = EInkDef.DISPLAYS[this.displayID];
    const palette = display.colors.map(c => this.#Hex2RGB(c));
    const indices = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const r = rgbaData[i * 4], g = rgbaData[i * 4 + 1], b = rgbaData[i * 4 + 2];
      let bestIdx = 0, minDst = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const dst = Math.pow(r - palette[p].r, 2) + Math.pow(g - palette[p].g, 2) + Math.pow(b - palette[p].b, 2);
        if (dst < minDst) { minDst = dst; bestIdx = p; }
      }
      indices[i] = bestIdx;
    }
    return indices;
  }

  async GetDataURI(_imgData = null) {
    if (_imgData == null) _imgData = await this.Encode();
    return "data:image/ink;base64," + _imgData.ToBase64();
  }

  static GetDataURIByBase64(_imgData = null) {
    return "data:image/ink;base64," + _imgData;
  }

  #PrepareCanvas(w, h) {
    if (!this.#imgCnvCnv) {
      this.#imgCnvCnv = document.createElement('canvas');
      this.#imgCnvCtx = this.#imgCnvCnv.getContext('2d', { willReadFrequently: true });
    }
    this.#imgCnvCnv.width = w; this.#imgCnvCnv.height = h;
  }

  Show(_toImgId) {
    let o = document.getElementById(_toImgId);
    if (o) o.src = this.#imgCnvCnv.toDataURL("image/png");
  }
}