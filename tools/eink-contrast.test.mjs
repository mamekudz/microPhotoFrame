import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	applyEinkContrast,
	applyEinkBlackWhite,
	applyEinkToneRgb,
	nearestPaletteColor,
	suppressBrightEdgeHalos,
	floydErrorScaleToNeighbor
} from '../src/microLib/einkContrast.mjs';

const e6 = [
	{ r: 0, g: 0, b: 0 },
	{ r: 255, g: 255, b: 255 },
	{ r: 255, g: 0, b: 0 },
	{ r: 255, g: 255, b: 0 },
	{ r: 0, g: 0, b: 255 },
	{ r: 0, g: 255, b: 0 }
];

test('contrast 1 leaves lightness unchanged', () => {
	assert.equal(applyEinkContrast(0.25, 1), 0.25);
	assert.equal(applyEinkContrast(0.70, 1), 0.70);
});

test('contrast does not brighten dark pixels', () => {
	for (const lig of [0.12, 0.28, 0.36]) {
		const out = applyEinkContrast(lig, 1.6);
		assert.ok(out <= lig + 1e-9, `lig=${lig} out=${out}`);
	}
});

test('midtones gain local contrast', () => {
	const lo = applyEinkContrast(0.36, 1.5);
	const hi = applyEinkContrast(0.54, 1.5);
	assert.ok(hi - lo > 0.20, `spread=${hi - lo} (${lo}..${hi})`);
});

test('classic 0.5-pivot lifts midtones harder than the new curve', () => {
	const lig = 0.56;
	const classic = (lig - 0.5) * 1.6 + 0.5;
	const out = applyEinkContrast(lig, 1.6);
	assert.ok(classic > lig, 'sanity: old formula brightens');
	assert.ok(out < 0.68, 'must not wash midtones, out=' + out);
});

test('black/white point has no step at 0.5 (the face-stripe bug)', () => {
	const jumped = (1 - (1 - 0.5) / 1.1) - (0.499 / 1.0);
	assert.ok(jumped > 0.04, 'sanity: old branch jumps by ' + jumped);
	const a = applyEinkBlackWhite(0.499, 1, 1.1);
	const b = applyEinkBlackWhite(0.500, 1, 1.1);
	const c = applyEinkBlackWhite(0.501, 1, 1.1);
	assert.ok(Math.abs(b - a) < 0.004, `0.499→${a} 0.500→${b}`);
	assert.ok(Math.abs(c - b) < 0.004, `0.500→${b} 0.501→${c}`);
});

test('gray ramp through 0.5 has no luma jump after tone', () => {
	const opts = { saturation: 1, contrast: 1.4, blackPoint: 1, whitePoint: 1.1 };
	let prev = -1;
	let maxStep = 0;
	let stepAtHalf = 0;
	for (let v = 90; v <= 180; v++) {
		const [r, g, b] = applyEinkToneRgb(v, v, v, opts);
		const y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
		if (prev >= 0) {
			const step = y - prev;
			if (step > maxStep) maxStep = step;
			if (v === 128) stepAtHalf = step;
		}
		prev = y;
	}
	assert.ok(maxStep < 3.5, 'maxStep=' + maxStep);
	assert.ok(stepAtHalf < 2.5, 'step at 128=' + stepAtHalf);
});

test('already-bright pixels may gain a little separation', () => {
	const out = applyEinkContrast(0.72, 1.4);
	assert.ok(out >= 0.72 && out < 0.82, 'out=' + out);
});

test('white hairline fringe next to dark hair is pulled down', () => {
	const w = 5, h = 5;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const hair = x <= 1;
			const fringe = x === 2;
			const v = hair ? 20 : fringe ? 200 : 140;
			data[i] = data[i + 1] = data[i + 2] = v;
			data[i + 3] = 255;
		}
	}
	suppressBrightEdgeHalos(data, w, h);
	const fringe = data[(2 * w + 2) * 4];
	assert.ok(fringe < 160, 'fringe=' + fringe);
});

test('open highlights are not crushed by halo suppress', () => {
	const w = 5, h = 5;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = data[i + 1] = data[i + 2] = 230;
		data[i + 3] = 255;
	}
	suppressBrightEdgeHalos(data, w, h);
	assert.equal(data[(2 * w + 2) * 4], 230);
});

test('floyd does not dump bright error into darker neighbors', () => {
	assert.equal(floydErrorScaleToNeighbor(180, 30, 40), 0.12);
	assert.equal(floydErrorScaleToNeighbor(180, 190, 40), 1);
});

test('floyd still diffuses along a face gradient (no cheek stripe)', () => {
	assert.equal(floydErrorScaleToNeighbor(150, 138, 22), 1);
	assert.equal(floydErrorScaleToNeighbor(160, 145, 18), 1);
});

test('a red pullover stays nearer red than white after contrast', () => {
	const [r, g, b] = applyEinkToneRgb(180, 70, 75, {
		saturation: 1.7,
		contrast: 1.4,
		blackPoint: 1,
		whitePoint: 1.25
	});
	assert.ok(r - g > 40 && r - b > 40, `rgb=${r},${g},${b}`);
	const col = nearestPaletteColor(r, g, b, e6);
	assert.deepEqual(col, { r: 255, g: 0, b: 0 });
});

test('faded red is not snapped to white by RGB distance', () => {
	const col = nearestPaletteColor(200, 120, 125, e6);
	assert.deepEqual(col, { r: 255, g: 0, b: 0 });
});

test('light skin still prefers white over red', () => {
	const col = nearestPaletteColor(220, 185, 170, e6);
	assert.deepEqual(col, { r: 255, g: 255, b: 255 });
});

test('Vermeer skin midtone is not mapped to paper white', () => {
	const [r, g, b] = applyEinkToneRgb(166, 140, 113, {
		saturation: 1.8,
		contrast: 1.4,
		blackPoint: 1,
		whitePoint: 1.1
	});
	const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	assert.ok(y < 0.75, 'luma=' + y);
	assert.ok(r > b && g > b * 0.9, `rgb=${r},${g},${b}`);
	const col = nearestPaletteColor(r, g, b, e6);
	assert.ok(!(col.r === 255 && col.g === 255 && col.b === 255), 'must not snap to white');
});

test('near-black is crushed to paper black', () => {
	const [r, g, b] = applyEinkToneRgb(8, 8, 10, {
		saturation: 1, contrast: 1, blackPoint: 1, whitePoint: 1.1
	});
	assert.ok(r + g + b < 4, `rgb=${r},${g},${b}`);
});

test('tinted hair-edge dark is not crushed to void', () => {
	const [r, g, b] = applyEinkToneRgb(36, 22, 12, {
		saturation: 1, contrast: 1, blackPoint: 1, whitePoint: 1
	});
	assert.ok(r + g + b > 8, `rgb=${r},${g},${b}`);
});

test('legacy white/black point 10 is identity, not a blow-out', () => {
	const blown = 1 - (1 - 0.55) / 10;
	assert.ok(blown > 0.94, 'sanity: raw formula with 10 washes out');
	const a = applyEinkToneRgb(160, 120, 110, { saturation: 1, contrast: 1, blackPoint: 10, whitePoint: 10 });
	const b = applyEinkToneRgb(160, 120, 110, { saturation: 1, contrast: 1, blackPoint: 1, whitePoint: 1 });
	assert.ok(Math.abs(a[0] - b[0]) < 2 && Math.abs(a[1] - b[1]) < 2 && Math.abs(a[2] - b[2]) < 2);
});
