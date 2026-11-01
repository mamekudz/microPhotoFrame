// Tone and palette math for e-ink.
// HLS Lightness + RGB-nearest is wrong: raising L of a red mixes in G/B (pink),
// then Euclidean RGB picks white. Faces lose contours the same way.

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstep(edge0, edge1, x) {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function applyEinkContrast(lig, contrast) {
  const c = Number(contrast);
  if (!Number.isFinite(c) || c === 1) return lig;
  const pivot = 0.40;
  // Shadows get full contrast. Midtones keep most of it (e-ink needs
  // that pop). Highlights ease off smoothly — no 0.5 branch, no fade
  // that left 0.40–0.55 unchanged.
  const hiMix = smoothstep(0.28, 0.74, lig);
  const gain = c * (1 - hiMix) + (1 + (c - 1) * 0.70) * hiMix;
  let out = pivot + (lig - pivot) * gain;
  if (out > lig && lig > 0.68) {
    out = lig + (out - lig) * (1 - smoothstep(0.68, 0.92, lig) * 0.65);
  }
  return out;
}

/**
 * Shadows use black point, highlights use white point.
 * The old `y<0.5 ? y/bp : 1-(1-y)/wp` jumps at 0.5 whenever bp≠wp
 * (default wp=1.1: 0.499 stays, 0.500 → 0.545). That stripe follows
 * the isoluminance line across a face.
 */
export function applyEinkBlackWhite(y, blackPoint, whitePoint) {
  const shadow = y / blackPoint;
  const highlight = 1 - (1 - y) / whitePoint;
  const w = smoothstep(0.22, 0.78, y);
  return shadow * (1 - w) + highlight * w;
}

export function luma01(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Saturation / black / white / contrast on luma only. RGB ratios stay,
 * so a red pullover does not become pink-then-white.
 */
function toneScale(raw, fallback = 1) {
  let v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  if (v > 5) v /= 10;
  return clamp(v, 0.4, 2.5);
}

export function applyEinkToneRgb(r, g, b, opts = {}) {
  const sat = Number(opts.saturation);
  const satAdj = !Number.isFinite(sat) ? 1 : clamp(sat, 0, 3);
  const blackPoint = toneScale(opts.blackPoint);
  const whitePoint = toneScale(opts.whitePoint);
  const contrast = toneScale(opts.contrast);

  let y = luma01(r, g, b);
  const gy = y * 255;
  if (satAdj === 0) {
    r = g = b = gy;
  } else if (satAdj !== 1) {
    r = gy + (r - gy) * satAdj;
    g = gy + (g - gy) * satAdj;
    b = gy + (b - gy) * satAdj;
  }

  y = luma01(r, g, b);
  let y2 = applyEinkBlackWhite(y, blackPoint, whitePoint);
  y2 = applyEinkContrast(y2, contrast);
  y2 = clamp(y2, 0, 1);
  // Crush only achromatic voids. Hair anti-alias is tinted; killing it
  // next to a crushed background draws a white halo.
  if (y2 < 0.07 && chroma(r, g, b) < 16) y2 = 0;

  if (y <= 1e-6) {
    const v = y2 * 255;
    return [v, v, v];
  }
  let scale = y2 / y;
  const maxC = Math.max(r, g, b) * scale;
  if (maxC > 255) scale *= 255 / maxC;
  return [
    clamp(r * scale, 0, 255),
    clamp(g * scale, 0, 255),
    clamp(b * scale, 0, 255)
  ];
}

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** RGB distance, but chromatic pixels are not snapped to white/black. */
export function nearestPaletteColor(r, g, b, palette) {
  const srcC = chroma(r, g, b);
  let best = palette[0];
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const col = palette[i];
    let d = (r - col.r) ** 2 + (g - col.g) ** 2 + (b - col.b) ** 2;
    const colC = chroma(col.r, col.g, col.b);
    if (colC < 28) {
      const t = smoothstep(36, 72, srcC);
      if (t > 0) {
        const extra = srcC - 36;
        d += extra * extra * 2.2 * t;
      }
    }
    if (d < bestD) {
      bestD = d;
      best = col;
    }
  }
  return best;
}

export function nearestPaletteIndex(r, g, b, palette) {
  const col = nearestPaletteColor(r, g, b, palette);
  for (let i = 0; i < palette.length; i++) {
    if (palette[i] === col || (palette[i].r === col.r && palette[i].g === col.g && palette[i].b === col.b)) {
      return i;
    }
  }
  return 0;
}

function pixelLum01(data, i) {
  return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
}

/**
 * Pull a bright fringe back toward neighboring dark hair / fabric.
 * Scale + contrast + Floyd often leave a white rim at hairlines.
 */
export function suppressBrightEdgeHalos(data, w, h) {
  if (!data || w < 3 || h < 3) return;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = pixelLum01(data, i * 4);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const L = lum[i];
      let minN = 1;
      let darkN = 0;
      let brightN = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const Ln = lum[i + dy * w + dx];
          if (Ln < minN) minN = Ln;
          if (Ln < 0.30) darkN++;
          if (Ln > 0.72) brightN++;
        }
      }
      if (darkN < 2 || minN >= 0.32 || L <= minN + 0.14) continue;
      if (brightN > 2 && minN > 0.12) continue;
      if (L >= 0.90 && minN > 0.20) continue;
      const pull = Math.min(0.72, 0.30 + (L - minN) * 0.55);
      const target = minN + (L - minN) * (1 - pull);
      if (target >= L) continue;
      const scale = L > 1e-6 ? target / L : 1;
      const o = i * 4;
      data[o] *= scale;
      data[o + 1] *= scale;
      data[o + 2] *= scale;
    }
  }
}

/** Scale Floyd error so leftover brightness is not dumped into darker neighbors. */
export function floydErrorScaleToNeighbor(srcLum, neighborLum, errLum) {
  // Only hold back bright error at real dark edges (hair / fabric).
  // A threshold of 8 was hitting cheek gradients and drew a stripe
  // where skin crosses the white/yellow palette boundary.
  if (errLum > 0 && neighborLum < 48 && srcLum - neighborLum > 70) return 0.12;
  return 1;
}
