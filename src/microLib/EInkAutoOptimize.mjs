// ===========================================
// EInkAutoOptimize.mjs
// Local per-image settings for e-ink conversion.
// Histogram + optional COCO-SSD subject — no cloud.
// ===========================================

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function round1(v) {
    return Math.round(v * 10) / 10;
}

function hexRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let c = String(hex).replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const v = parseInt(c, 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

/** @returns {'bw'|'gray'|'tri'|'quad'|'e6'} */
export function GetPaletteKind(display) {
    const colors = (display && display.colors) || [];
    const n = colors.length;
    const chromatic = colors.filter((hex) => {
        const { r, g, b } = hexRgb(hex);
        return Math.max(r, g, b) - Math.min(r, g, b) > 20;
    });
    if (chromatic.length === 0) return n <= 2 ? 'bw' : 'gray';
    if (n <= 3) return 'tri';
    if (n === 4) return 'quad';
    return 'e6';
}

export function SampleImageStats(img, maxEdge = 160) {
    const w = img.naturalWidth || img.width || 1;
    const h = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const cnv = document.createElement('canvas');
    cnv.width = cw;
    cnv.height = ch;
    const ctx = cnv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    const data = ctx.getImageData(0, 0, cw, ch).data;

    const hist = new Uint32Array(256);
    let satSum = 0;
    let skin = 0;
    let n = 0;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        hist[y]++;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        satSum += sat;
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && (max - min) > 15 && sat > 0.12 && sat < 0.65) {
            skin++;
        }
        n++;
    }

    const percentile = (p) => {
        const target = n * p;
        let acc = 0;
        for (let i = 0; i < 256; i++) {
            acc += hist[i];
            if (acc >= target) return i;
        }
        return 255;
    };

    let mean = 0;
    for (let i = 0; i < 256; i++) mean += i * hist[i];
    mean = n ? mean / n : 128;

    let variance = 0;
    for (let i = 0; i < 256; i++) {
        const d = i - mean;
        variance += hist[i] * d * d;
    }
    const std = n ? Math.sqrt(variance / n) / 255 : 0.2;

    return {
        p05: percentile(0.05) / 255,
        p50: percentile(0.50) / 255,
        p95: percentile(0.95) / 255,
        mean: mean / 255,
        std,
        meanSat: n ? satSum / n : 0,
        skinFrac: n ? skin / n : 0,
        width: w,
        height: h
    };
}

export function SuggestEinkSettings(stats, display, extras = {}) {
    const kind = GetPaletteKind(display);
    const p05 = stats.p05 ?? 0.06;
    const p95 = stats.p95 ?? 0.92;
    const std = stats.std ?? 0.18;
    const meanSat = stats.meanSat ?? 0.28;
    const skinFrac = stats.skinFrac ?? 0;

    // Shadows: deepen fog, recover crushed blacks. Defaults stay near 1.0.
    let bp = 1.0 + (p05 - 0.06) * 2.8;
    bp = clamp(bp, 0.75, 1.45);

    // Highlights: lift dingy whites, protect already-blown ones. Default ~1.1.
    let wp = 1.1 + (0.92 - p95) * 1.8;
    wp = clamp(wp, 0.85, 1.55);

    // Contrast: boost flat photos, ease off already-punchy ones. Default ~1.4.
    let contrast = 1.4 + (0.18 - std) * 2.2;
    contrast = clamp(contrast, 1.05, 1.95);

    let sat;
    if (kind === 'bw') {
        sat = 0;
    } else if (kind === 'gray') {
        sat = 1.0;
    } else {
        const base = kind === 'e6' ? 1.8 : kind === 'quad' ? 1.7 : 1.55;
        const targetSat = kind === 'e6' ? 0.30 : 0.26;
        sat = base + (targetSat - meanSat) * 1.6;
        if (skinFrac > 0.12) sat = Math.min(sat, 1.65);
        sat = clamp(sat, 1.15, 2.5);
    }

    let zoom = 1.0;
    const bbox = extras.bbox;
    const w = stats.width || 0;
    const h = stats.height || 0;
    if (bbox && w && h) {
        const frac = Math.max(bbox[2] / w, bbox[3] / h);
        if (frac > 0 && frac < 0.55) {
            zoom = clamp(0.42 / frac, 1.0, 1.45);
        }
    }

    return {
        colorSaturationAdjust: round1(sat),
        contrastAdjust: round1(contrast),
        blackPointAdjust: round1(bp),
        whitePointAdjust: round1(wp),
        zoom: round1(zoom),
        ditherType: 'floyd'
    };
}

export function FocusSpotFromPredictions(predictions, imgW, imgH) {
    const result = { cutSpotX: 0.5, cutSpotY: 0.5, bbox: null, label: '' };
    if (!predictions || !predictions.length || !imgW || !imgH) return result;

    const sorted = [...predictions].sort((a, b) => b.score - a.score);
    const persons = sorted.filter((p) => p.class === 'person');
    const best = persons[0] || sorted[0];
    const [x, y, w, h] = best.bbox;
    result.bbox = best.bbox;

    if (persons[0]) {
        result.cutSpotX = clamp((x + w / 2) / imgW, 0, 1);
        result.cutSpotY = clamp((y + h * 0.25) / imgH, 0, 1);
        result.label = 'person';
    } else {
        result.cutSpotX = clamp((x + w / 2) / imgW, 0, 1);
        result.cutSpotY = clamp((y + h / 2) / imgH, 0, 1);
        result.label = best.class || '';
    }
    return result;
}

export async function OptimizeImageForEink(img, options = {}) {
    const display = options.display || null;
    const stats = SampleImageStats(img);
    let focus = { cutSpotX: 0.5, cutSpotY: 0.5, bbox: null, label: '' };

    if (options.predictions) {
        focus = FocusSpotFromPredictions(options.predictions, stats.width, stats.height);
    } else if (options.detectorModel) {
        try {
            const predictions = await options.detectorModel.detect(img);
            focus = FocusSpotFromPredictions(predictions, stats.width, stats.height);
        } catch (err) {
            console.warn('EInkAutoOptimize: subject detection skipped', err);
        }
    }

    const settings = SuggestEinkSettings(stats, display, { bbox: focus.bbox });
    return {
        settings: {
            ...settings,
            cutSpotX: focus.cutSpotX,
            cutSpotY: focus.cutSpotY
        },
        stats,
        focus
    };
}
