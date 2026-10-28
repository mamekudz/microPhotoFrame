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

function percentileOf(hist, total, p) {
    if (!total) return 255;
    const target = total * p;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
        acc += hist[i];
        if (acc >= target) return i;
    }
    return 255;
}

function meanOf(hist, total) {
    if (!total) return 128;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    return sum / total;
}

function stdOf(hist, total, mean) {
    if (!total) return 0.2;
    let variance = 0;
    for (let i = 0; i < 256; i++) {
        const d = i - mean;
        variance += hist[i] * d * d;
    }
    return Math.sqrt(variance / total) / 255;
}

function packStats(hist, n, satSum, skin, w, h, subject) {
    const mean = meanOf(hist, n);
    return {
        p05: percentileOf(hist, n, 0.05) / 255,
        p25: percentileOf(hist, n, 0.25) / 255,
        p50: percentileOf(hist, n, 0.50) / 255,
        p95: percentileOf(hist, n, 0.95) / 255,
        mean: mean / 255,
        std: stdOf(hist, n, mean),
        meanSat: n ? satSum / n : 0,
        skinFrac: n ? skin / n : 0,
        width: w,
        height: h,
        subjectMean: subject.mean,
        subjectP05: subject.p05,
        subjectP95: subject.p95,
        subjectFrac: subject.frac
    };
}

/**
 * @param {CanvasImageSource} img
 * @param {number|object} maxEdge
 * @param {{bbox?: number[]}} [options] bbox = [x, y, w, h] in source pixels
 */
export function SampleImageStats(img, maxEdge = 160, options = {}) {
    if (maxEdge && typeof maxEdge === 'object') {
        options = maxEdge;
        maxEdge = 160;
    }
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
    const subHist = new Uint32Array(256);
    let satSum = 0;
    let skin = 0;
    let n = 0;
    let subN = 0;

    let sx0 = cw * 0.28, sy0 = ch * 0.22, sx1 = cw * 0.72, sy1 = ch * 0.78;
    const bbox = options.bbox;
    if (bbox && bbox.length >= 4 && bbox[2] > 0 && bbox[3] > 0) {
        const padX = bbox[2] * 0.18;
        const padY = bbox[3] * 0.18;
        sx0 = ((bbox[0] - padX) / w) * cw;
        sy0 = ((bbox[1] - padY) / h) * ch;
        sx1 = ((bbox[0] + bbox[2] + padX) / w) * cw;
        sy1 = ((bbox[1] + bbox[3] + padY) / h) * ch;
    }

    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            const i = (y * cw + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            hist[lum]++;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max === 0 ? 0 : (max - min) / max;
            satSum += sat;
            if (r > 95 && g > 40 && b > 20 && r > g && r > b && (max - min) > 15 && sat > 0.12 && sat < 0.65) {
                skin++;
            }
            n++;
            if (x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1) {
                subHist[lum]++;
                subN++;
            }
        }
    }

    const useSub = subN >= Math.max(8, n * 0.02);
    const subMean = useSub ? meanOf(subHist, subN) / 255 : meanOf(hist, n) / 255;
    const subject = {
        mean: subMean,
        p05: (useSub ? percentileOf(subHist, subN, 0.05) : percentileOf(hist, n, 0.05)) / 255,
        p95: (useSub ? percentileOf(subHist, subN, 0.95) : percentileOf(hist, n, 0.95)) / 255,
        frac: n ? subN / n : 0
    };

    return packStats(hist, n, satSum, skin, w, h, subject);
}

export function SuggestEinkSettings(stats, display, extras = {}) {
    const kind = GetPaletteKind(display);
    const p05 = stats.p05 ?? 0.06;
    const p50 = stats.p50 ?? stats.mean ?? 0.45;
    const p95 = stats.p95 ?? 0.92;
    const mean = stats.mean ?? p50;
    const std = stats.std ?? 0.18;
    const meanSat = stats.meanSat ?? 0.28;
    const skinFrac = stats.skinFrac ?? 0;
    const subjectMean = extras.subjectMean ?? stats.subjectMean ?? mean;
    const subjectP05 = extras.subjectP05 ?? stats.subjectP05 ?? p05;
    const subjectP95 = extras.subjectP95 ?? stats.subjectP95 ?? p95;

    const toneMean = subjectMean;
    const toneP05 = subjectP05;
    const hiP95 = Math.max(p95, subjectP95);

    const lowKey = toneMean < 0.30 || (mean < 0.22 && p95 < 0.78);
    const highKey = mean > 0.68 && p05 > 0.28 && toneMean > 0.45;
    const brightBgDarkSubject = mean - toneMean > 0.22 && mean > 0.45;

    let bp = 1.0;
    let wp = 1.1;
    let contrast = 1.35;

    if (lowKey) {
        const lift = clamp((0.42 - toneMean) * 2.0, 0.15, 0.55);
        bp = clamp(1.0 - lift, 0.45, 0.85);
        wp = clamp(1.06 + (0.82 - hiP95) * 0.5, 0.95, 1.22);
        contrast = clamp(1.10 + (0.12 - Math.min(std, 0.16)) * 0.8, 1.04, 1.28);
    } else if (highKey) {
        bp = clamp(1.0 + (toneP05 - 0.22) * 0.35, 0.92, 1.12);
        wp = clamp(1.04 + (0.96 - hiP95) * 1.0, 0.90, 1.20);
        contrast = clamp(1.18 + (0.14 - Math.min(std, 0.18)) * 0.8, 1.05, 1.36);
    } else if (brightBgDarkSubject) {
        const lift = clamp((0.38 - toneMean) * 1.5, 0.08, 0.40);
        bp = clamp(1.0 - lift, 0.58, 1.05);
        wp = clamp(1.06 + (0.94 - hiP95) * 0.8, 0.92, 1.22);
        contrast = clamp(1.22 + (0.16 - Math.min(std, 0.20)) * 0.7, 1.08, 1.42);
    } else {
        const haze = toneP05 > 0.12 && std < 0.15 && mean > 0.32 && mean < 0.62;
        bp = haze
            ? clamp(1.0 + (toneP05 - 0.10) * 0.9, 0.92, 1.22)
            : clamp(1.0 + (toneP05 - 0.06) * 0.8, 0.82, 1.18);
        wp = clamp(1.08 + (0.92 - hiP95) * 1.1, 0.90, 1.38);
        contrast = clamp(1.32 + (0.18 - std) * 1.4, 1.10, 1.65);
    }

    if (toneMean < 0.34 && !highKey) {
        bp = Math.min(bp, clamp(1.0 - (0.38 - toneMean) * 1.35, 0.52, 0.95));
        contrast = Math.min(contrast, 1.38);
    }

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
    let focus = { cutSpotX: 0.5, cutSpotY: 0.5, bbox: null, label: '' };

    if (options.predictions) {
        focus = FocusSpotFromPredictions(
            options.predictions,
            img.naturalWidth || img.width,
            img.naturalHeight || img.height
        );
    } else if (options.detectorModel) {
        try {
            const predictions = await options.detectorModel.detect(img);
            focus = FocusSpotFromPredictions(
                predictions,
                img.naturalWidth || img.width,
                img.naturalHeight || img.height
            );
        } catch (err) {
            console.warn('EInkAutoOptimize: subject detection skipped', err);
        }
    }

    const stats = SampleImageStats(img, 160, { bbox: focus.bbox });
    const settings = SuggestEinkSettings(stats, display, {
        bbox: focus.bbox,
        subjectMean: stats.subjectMean,
        subjectP05: stats.subjectP05,
        subjectP95: stats.subjectP95
    });
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
