// ===========================================
// EInkAutoOptimize.mjs
// Local per-image settings for e-ink conversion.
// Histogram + optional COCO-SSD subject — no cloud.
// ===========================================

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

/** Named looks as percent on top of the auto values. JSON: "optimize": "vivid" */
export const EINK_OPTIMIZE_STYLES = {
    balanced: { contrast: 0, saturation: 0, blackPoint: 0, whitePoint: 0 },
    contrast: { contrast: 10, saturation: 0, blackPoint: 4, whitePoint: 0 },
    colorful: { contrast: 0, saturation: 30, blackPoint: 0, whitePoint: 0 },
    vivid: { contrast: 10, saturation: 30, blackPoint: 4, whitePoint: 0 },
    soft: { contrast: -10, saturation: -15, blackPoint: -5, whitePoint: 4 }
};

const STYLE_ALIASES = {
    default: 'balanced',
    punchy: 'contrast',
    'more-contrast': 'contrast',
    kontrastreicher: 'contrast',
    'more-colorful': 'colorful',
    farbenfroher: 'colorful',
    colour: 'colorful',
    softer: 'soft'
};

export function ResolveOptimizeBias(raw) {
    if (raw == null || raw === '') {
        return { id: 'balanced', ...EINK_OPTIMIZE_STYLES.balanced };
    }
    if (typeof raw === 'string') {
        const key = raw.trim().toLowerCase();
        const id = STYLE_ALIASES[key] || (EINK_OPTIMIZE_STYLES[key] ? key : 'balanced');
        return { id, ...EINK_OPTIMIZE_STYLES[id] };
    }
    if (typeof raw === 'object') {
        const key = String(raw.style || raw.id || '').trim().toLowerCase();
        const id = STYLE_ALIASES[key] || (EINK_OPTIMIZE_STYLES[key] ? key : 'custom');
        const base = EINK_OPTIMIZE_STYLES[id] || EINK_OPTIMIZE_STYLES.balanced;
        const num = (v, fallback) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : fallback;
        };
        return {
            id,
            contrast: num(raw.contrast ?? raw.contrastPct, base.contrast),
            saturation: num(raw.saturation ?? raw.saturationPct, base.saturation),
            blackPoint: num(raw.blackPoint ?? raw.blackPointPct, base.blackPoint),
            whitePoint: num(raw.whitePoint ?? raw.whitePointPct, base.whitePoint)
        };
    }
    return { id: 'balanced', ...EINK_OPTIMIZE_STYLES.balanced };
}

function scaleByPct(value, pct, lo, hi) {
    const v = Number(value);
    const p = Number(pct) || 0;
    if (!Number.isFinite(v)) return v;
    return round1(clamp(v * (1 + p / 100), lo, hi));
}

export function ApplyOptimizeBias(settings, raw) {
    if (!settings) return settings;
    const b = ResolveOptimizeBias(raw);
    const sat0 = Number(settings.colorSaturationAdjust);
    const next = { ...settings };
    next.contrastAdjust = scaleByPct(settings.contrastAdjust || 1, b.contrast, 0.4, 2.5);
    if (Number.isFinite(sat0) && sat0 > 0) {
        next.colorSaturationAdjust = scaleByPct(sat0, b.saturation, 0, 3);
    }
    next.blackPointAdjust = scaleByPct(settings.blackPointAdjust || 1, b.blackPoint, 0.4, 2.5);
    next.whitePointAdjust = scaleByPct(settings.whitePointAdjust || 1, b.whitePoint, 0.4, 2.5);
    return next;
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

function massAtMost(hist, total, maxIncl) {
    if (!total) return 0;
    let acc = 0;
    for (let i = 0; i <= maxIncl; i++) acc += hist[i];
    return acc / total;
}

function massAtLeast(hist, total, minIncl) {
    if (!total) return 0;
    let acc = 0;
    for (let i = minIncl; i < 256; i++) acc += hist[i];
    return acc / total;
}

/** Mean of the middle 80% — ignores short highlight/shadow spikes. */
function trimmedMeanOf(hist, total, loP = 0.10, hiP = 0.90) {
    if (!total) return 128;
    const lo = percentileOf(hist, total, loP);
    const hi = percentileOf(hist, total, hiP);
    let sum = 0;
    let w = 0;
    for (let i = lo; i <= hi; i++) {
        sum += i * hist[i];
        w += hist[i];
    }
    return w ? sum / w : meanOf(hist, total);
}

function robustFromHist(hist, n) {
    const p25 = percentileOf(hist, n, 0.25) / 255;
    const p50 = percentileOf(hist, n, 0.50) / 255;
    const p75 = percentileOf(hist, n, 0.75) / 255;
    return {
        trimMean: trimmedMeanOf(hist, n) / 255,
        p25,
        p50,
        p75,
        darkFrac: massAtMost(hist, n, 64),
        brightFrac: massAtLeast(hist, n, 191),
        iqr: Math.max(0, p75 - p25)
    };
}

function mix(a, b, t) {
    const x = Number.isFinite(a) ? a : b;
    const y = Number.isFinite(b) ? b : a;
    if (!Number.isFinite(x)) return 0;
    if (!Number.isFinite(y)) return x;
    return x * (1 - t) + y * t;
}

function packStats(hist, n, satSum, skin, w, h, subject) {
    const mean = meanOf(hist, n);
    const robust = robustFromHist(hist, n);
    return {
        p05: percentileOf(hist, n, 0.05) / 255,
        p10: percentileOf(hist, n, 0.10) / 255,
        p25: robust.p25,
        p50: robust.p50,
        p75: robust.p75,
        p90: percentileOf(hist, n, 0.90) / 255,
        p95: percentileOf(hist, n, 0.95) / 255,
        mean: mean / 255,
        trimMean: robust.trimMean,
        std: stdOf(hist, n, mean),
        iqr: robust.iqr,
        darkFrac: robust.darkFrac,
        brightFrac: robust.brightFrac,
        meanSat: n ? satSum / n : 0,
        skinFrac: n ? skin / n : 0,
        width: w,
        height: h,
        subjectMean: subject.mean,
        subjectTrimMean: subject.trimMean,
        subjectP05: subject.p05,
        subjectP25: subject.p25,
        subjectP75: subject.p75,
        subjectP95: subject.p95,
        subjectDarkFrac: subject.darkFrac,
        subjectBrightFrac: subject.brightFrac,
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
    const src = useSub ? subHist : hist;
    const srcN = useSub ? subN : n;
    const subRobust = robustFromHist(src, srcN);
    const subject = {
        mean: meanOf(src, srcN) / 255,
        trimMean: subRobust.trimMean,
        p05: percentileOf(src, srcN, 0.05) / 255,
        p25: subRobust.p25,
        p75: subRobust.p75,
        p95: percentileOf(src, srcN, 0.95) / 255,
        darkFrac: subRobust.darkFrac,
        brightFrac: subRobust.brightFrac,
        frac: n ? subN / n : 0
    };

    return packStats(hist, n, satSum, skin, w, h, subject);
}

export function SuggestEinkSettings(stats, display, extras = {}) {
    const kind = GetPaletteKind(display);
    const p25 = stats.p25 ?? stats.p05 ?? 0.15;
    const p50 = stats.p50 ?? stats.trimMean ?? stats.mean ?? 0.45;
    const p75 = stats.p75 ?? stats.p95 ?? 0.85;
    const trimMean = stats.trimMean ?? stats.mean ?? p50;
    const iqr = stats.iqr ?? Math.max(0, p75 - p25);
    const darkFrac = stats.darkFrac ?? 0;
    const brightFrac = stats.brightFrac ?? 0;
    const meanSat = stats.meanSat ?? 0.28;
    const skinFrac = stats.skinFrac ?? 0;

    const subW = clamp((extras.subjectFrac ?? stats.subjectFrac ?? 0) > 0.04 ? 0.55 : 0.35, 0, 0.7);
    const toneCenter = mix(
        trimMean,
        extras.subjectTrimMean ?? stats.subjectTrimMean ?? extras.subjectMean ?? stats.subjectMean ?? trimMean,
        subW
    );
    const bulkLow = mix(p25, extras.subjectP25 ?? stats.subjectP25 ?? p25, subW);
    const bulkHigh = mix(p75, extras.subjectP75 ?? stats.subjectP75 ?? p75, subW);
    const darkMass = mix(darkFrac, extras.subjectDarkFrac ?? stats.subjectDarkFrac ?? darkFrac, subW);
    const brightMass = mix(brightFrac, extras.subjectBrightFrac ?? stats.subjectBrightFrac ?? brightFrac, subW);

    const subjectTone = extras.subjectTrimMean ?? stats.subjectTrimMean ?? extras.subjectMean ?? stats.subjectMean ?? toneCenter;
    const subjectDark = extras.subjectDarkFrac ?? stats.subjectDarkFrac ?? darkMass;
    const subjectP25v = extras.subjectP25 ?? stats.subjectP25 ?? p25;
    const subjectP75v = extras.subjectP75 ?? stats.subjectP75 ?? p75;
    const subjectIqr = Math.max(0, subjectP75v - subjectP25v);
    const subjectFrac = extras.subjectFrac ?? stats.subjectFrac ?? 0;
    const contrastIqr = subjectFrac > 0.08 ? subjectIqr : iqr;

    // Dark frame + lighter subject (Vermeer): crush the void, do not lift it.
    const darkBackground = darkFrac >= 0.38 && subjectTone > 0.30 && subjectDark < 0.45;
    // Night / dark subject: lift shadows.
    const lowKey = !darkBackground && subjectTone < 0.32 && subjectDark >= 0.42;
    const highKey = toneCenter > 0.60 && brightMass >= 0.42;
    const brightBgDarkSubject = brightMass - darkMass > 0.22 && toneCenter < 0.42 && brightFrac > 0.35;
    // Mona Lisa: face/landscape are flat even if dress+sky make global IQR look large.
    const hazySubject = contrastIqr < 0.22 && subjectTone > 0.32 && subjectTone < 0.68;

    let bp = 1.0;
    let wp = 1.1;
    let contrast = kind === 'e6' ? 1.42 : 1.32;

    if (darkBackground) {
        // Paintings (low skin): crush the void. Photos of people: stay gentler
        // or hair anti-alias becomes a white rim and faces blow out.
        if (skinFrac > 0.10) {
            bp = clamp(1.06 + (darkFrac - 0.38) * 0.25, 1.04, 1.16);
            wp = clamp(1.06 + (0.70 - bulkHigh) * 0.3, 0.98, 1.16);
            contrast = clamp(1.42 + (0.26 - Math.min(contrastIqr, 0.32)) * 0.75, 1.32, 1.62);
        } else {
            bp = clamp(1.16 + (darkFrac - 0.38) * 0.7, 1.12, 1.45);
            wp = clamp(1.08 + (0.70 - bulkHigh) * 0.35, 0.98, 1.22);
            contrast = clamp(1.38 + (0.24 - Math.min(contrastIqr, 0.30)) * 0.8, 1.28, 1.62);
        }
    } else if (lowKey) {
        const lift = clamp((0.40 - subjectTone) * 1.6 + (subjectDark - 0.42) * 0.35, 0.12, 0.48);
        bp = clamp(1.0 - lift, 0.50, 0.88);
        wp = clamp(1.06 + (0.62 - bulkHigh) * 0.4, 0.96, 1.20);
        contrast = clamp(1.10 + (0.22 - Math.min(contrastIqr, 0.28)) * 0.6, 1.04, 1.28);
    } else if (highKey) {
        bp = clamp(1.0 + (bulkLow - 0.28) * 0.25, 0.92, 1.12);
        wp = clamp(1.04 + (0.78 - bulkHigh) * 0.5, 0.92, 1.18);
        contrast = clamp(1.32 + (0.22 - Math.min(contrastIqr, 0.28)) * 0.6, 1.22, 1.52);
    } else if (brightBgDarkSubject) {
        const lift = clamp((0.38 - toneCenter) * 1.3 + darkMass * 0.2, 0.06, 0.36);
        bp = clamp(1.0 - lift, 0.60, 1.05);
        wp = clamp(1.06 + (0.76 - bulkHigh) * 0.4, 0.94, 1.18);
        contrast = clamp(1.24 + (0.24 - Math.min(contrastIqr, 0.30)) * 0.5, 1.14, 1.48);
    } else {
        const haze = hazySubject || (bulkLow > 0.18 && contrastIqr < 0.18 && toneCenter > 0.34 && toneCenter < 0.62);
        const darkPull = (darkMass - brightMass) * 0.22;
        bp = haze
            ? clamp(1.08 + (bulkLow - 0.16) * 0.55, 1.02, 1.28)
            : clamp(1.0 - darkPull + (bulkLow - 0.16) * 0.35, 0.82, 1.22);
        wp = clamp(1.06 + (0.70 - bulkHigh) * 0.45 + (0.22 - brightMass) * 0.2, 0.92, 1.24);
        contrast = clamp(1.48 + (0.28 - contrastIqr) * 0.70, 1.36, 1.78);
        if (haze) contrast = Math.max(contrast, 1.56);
    }

    if (!darkBackground && subjectTone < 0.34 && subjectDark >= 0.30 && !highKey) {
        bp = Math.min(bp, clamp(1.0 - (0.36 - subjectTone) * 1.1, 0.55, 0.95));
        contrast = Math.min(contrast, 1.50);
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
    const settings = ApplyOptimizeBias(SuggestEinkSettings(stats, display, {
        bbox: focus.bbox,
        subjectMean: stats.subjectMean,
        subjectTrimMean: stats.subjectTrimMean,
        subjectP25: stats.subjectP25,
        subjectP75: stats.subjectP75,
        subjectDarkFrac: stats.subjectDarkFrac,
        subjectBrightFrac: stats.subjectBrightFrac,
        subjectFrac: stats.subjectFrac
    }), options.style ?? options.optimize);
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
