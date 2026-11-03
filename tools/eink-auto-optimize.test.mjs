import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SuggestEinkSettings, ApplyOptimizeBias, ResolveOptimizeBias, ZoomToSubject, SubjectFitRect, ContentBBoxFromRgba, InferBackgroundColor } from '../src/microLib/EInkAutoOptimize.mjs';

const e6 = { colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'] };

test('high-key bathroom does not crush the subject', () => {
	const s = SuggestEinkSettings({
		p25: 0.58,
		p50: 0.82,
		p75: 0.92,
		trimMean: 0.76,
		mean: 0.78,
		iqr: 0.34,
		darkFrac: 0.08,
		brightFrac: 0.62,
		meanSat: 0.12,
		skinFrac: 0.08,
		subjectTrimMean: 0.36,
		subjectP25: 0.22,
		subjectP75: 0.48,
		subjectDarkFrac: 0.18,
		subjectBrightFrac: 0.12,
		subjectFrac: 0.2
	}, e6);
	assert.ok(s.blackPointAdjust <= 1.12, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust <= 1.58, 'contrast=' + s.contrastAdjust);
});

test('low-key night lifts shadows instead of adding contrast', () => {
	const s = SuggestEinkSettings({
		p25: 0.05,
		p50: 0.10,
		p75: 0.22,
		trimMean: 0.13,
		mean: 0.16,
		iqr: 0.17,
		darkFrac: 0.72,
		brightFrac: 0.04,
		meanSat: 0.15,
		skinFrac: 0.04,
		subjectTrimMean: 0.22,
		subjectP25: 0.10,
		subjectP75: 0.38,
		subjectDarkFrac: 0.55,
		subjectBrightFrac: 0.06,
		subjectFrac: 0.18
	}, e6);
	assert.ok(s.blackPointAdjust <= 0.85, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust <= 1.35, 'contrast=' + s.contrastAdjust);
});

test('normal daylight stays near previous defaults', () => {
	const s = SuggestEinkSettings({
		p25: 0.22,
		p50: 0.48,
		p75: 0.74,
		trimMean: 0.47,
		mean: 0.47,
		iqr: 0.52,
		darkFrac: 0.18,
		brightFrac: 0.16,
		meanSat: 0.28,
		skinFrac: 0.05,
		subjectTrimMean: 0.47,
		subjectP25: 0.24,
		subjectP75: 0.70,
		subjectDarkFrac: 0.16,
		subjectBrightFrac: 0.14,
		subjectFrac: 0.2
	}, e6);
	assert.ok(s.blackPointAdjust >= 0.82 && s.blackPointAdjust <= 1.22, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust >= 1.10 && s.contrastAdjust <= 1.70, 'contrast=' + s.contrastAdjust);
});

test('a few highlight spikes do not treat a dark photo as high-key', () => {
	const s = SuggestEinkSettings({
		p05: 0.02,
		p95: 0.98,
		mean: 0.28,
		p25: 0.06,
		p50: 0.12,
		p75: 0.22,
		trimMean: 0.14,
		iqr: 0.16,
		darkFrac: 0.70,
		brightFrac: 0.03,
		meanSat: 0.12,
		subjectTrimMean: 0.18,
		subjectP25: 0.08,
		subjectP75: 0.30,
		subjectDarkFrac: 0.60,
		subjectBrightFrac: 0.04,
		subjectFrac: 0.15
	}, e6);
	assert.ok(s.blackPointAdjust <= 0.88, 'bp=' + s.blackPointAdjust);
	assert.ok(s.whitePointAdjust <= 1.22, 'wp=' + s.whitePointAdjust);
});

test('a dark corner does not treat a bright photo as night', () => {
	const s = SuggestEinkSettings({
		p05: 0.02,
		p95: 0.96,
		mean: 0.68,
		p25: 0.58,
		p50: 0.74,
		p75: 0.88,
		trimMean: 0.72,
		iqr: 0.30,
		darkFrac: 0.05,
		brightFrac: 0.60,
		meanSat: 0.14,
		subjectTrimMean: 0.66,
		subjectP25: 0.50,
		subjectP75: 0.82,
		subjectDarkFrac: 0.08,
		subjectBrightFrac: 0.48,
		subjectFrac: 0.2
	}, e6);
	assert.ok(s.blackPointAdjust >= 0.90, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust <= 1.45, 'contrast=' + s.contrastAdjust);
});

test('Vermeer-like dark void is crushed, not lifted', () => {
	const s = SuggestEinkSettings({
		p25: 0.04,
		p50: 0.12,
		p75: 0.42,
		trimMean: 0.18,
		mean: 0.20,
		iqr: 0.38,
		darkFrac: 0.62,
		brightFrac: 0.04,
		meanSat: 0.22,
		skinFrac: 0.04,
		subjectTrimMean: 0.44,
		subjectP25: 0.30,
		subjectP75: 0.56,
		subjectDarkFrac: 0.12,
		subjectBrightFrac: 0.06,
		subjectFrac: 0.22
	}, e6);
	assert.ok(s.blackPointAdjust >= 1.12, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust >= 1.28, 'contrast=' + s.contrastAdjust);
});

test('photo of a person on a dark bg is not crushed like a painting void', () => {
	const s = SuggestEinkSettings({
		p25: 0.06,
		p50: 0.18,
		p75: 0.48,
		trimMean: 0.22,
		mean: 0.24,
		iqr: 0.42,
		darkFrac: 0.55,
		brightFrac: 0.06,
		meanSat: 0.24,
		skinFrac: 0.22,
		subjectTrimMean: 0.46,
		subjectP25: 0.32,
		subjectP75: 0.58,
		subjectDarkFrac: 0.10,
		subjectBrightFrac: 0.08,
		subjectFrac: 0.25
	}, e6);
	assert.ok(s.blackPointAdjust <= 1.16, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust >= 1.32 && s.contrastAdjust <= 1.62, 'contrast=' + s.contrastAdjust);
});

test('Mona Lisa-like haze gets enough e-ink contrast', () => {
	const s = SuggestEinkSettings({
		p25: 0.16,
		p50: 0.46,
		p75: 0.72,
		trimMean: 0.48,
		mean: 0.47,
		iqr: 0.56,
		darkFrac: 0.14,
		brightFrac: 0.08,
		meanSat: 0.18,
		skinFrac: 0.20,
		subjectTrimMean: 0.50,
		subjectP25: 0.40,
		subjectP75: 0.58,
		subjectDarkFrac: 0.08,
		subjectBrightFrac: 0.04,
		subjectFrac: 0.24
	}, e6);
	assert.ok(s.contrastAdjust >= 1.48, 'contrast=' + s.contrastAdjust);
	assert.ok(s.blackPointAdjust >= 1.00, 'bp=' + s.blackPointAdjust);
});

test('contrast look adds 10% contrast', () => {
	const base = { colorSaturationAdjust: 1.6, contrastAdjust: 1.4, blackPointAdjust: 1.0, whitePointAdjust: 1.1 };
	const out = ApplyOptimizeBias(base, 'contrast');
	assert.equal(out.contrastAdjust, 1.5);
	assert.equal(out.colorSaturationAdjust, 1.6);
});

test('colorful look adds 30% saturation', () => {
	const base = { colorSaturationAdjust: 1.6, contrastAdjust: 1.4, blackPointAdjust: 1.0, whitePointAdjust: 1.1 };
	const out = ApplyOptimizeBias(base, 'colorful');
	assert.equal(out.colorSaturationAdjust, 2.1);
	assert.equal(out.contrastAdjust, 1.4);
});

test('vivid stacks 10% contrast and 30% saturation', () => {
	const base = { colorSaturationAdjust: 1.8, contrastAdjust: 1.4, blackPointAdjust: 1.0, whitePointAdjust: 1.1 };
	const out = ApplyOptimizeBias(base, 'vivid');
	assert.equal(out.contrastAdjust, 1.5);
	assert.equal(out.colorSaturationAdjust, 2.3);
});

test('catalog optimize string and object resolve', () => {
	assert.equal(ResolveOptimizeBias('kontrastreicher').id, 'contrast');
	assert.equal(ResolveOptimizeBias({ style: 'colorful' }).saturation, 30);
	assert.equal(ResolveOptimizeBias({ contrast: 12, saturation: 25 }).contrast, 12);
});

test('SubjectFitRect centers a square animal in landscape', () => {
	const r = SubjectFitRect([293, 299, 438, 423], 1024, 1024, 800, 480);
	assert.ok(r, 'fit');
	assert.ok(Math.abs((r.dx + r.dw / 2) - 400) < 2, 'cx=' + (r.dx + r.dw / 2));
	assert.ok(Math.abs((r.dy + r.dh / 2) - 240) < 2, 'cy=' + (r.dy + r.dh / 2));
	assert.ok(r.dh > 450, 'fills height dh=' + r.dh);
	assert.ok(r.dw < 720, 'letterbox sides dw=' + r.dw);
});

test('InferBackgroundColor snaps a dark border to black', () => {
	const w = 24, h = 16;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i + 3] = 255;
	}
	for (let y = 5; y <= 10; y++) {
		for (let x = 8; x <= 15; x++) {
			const i = (y * w + x) * 4;
			data[i] = 220; data[i + 1] = 80; data[i + 2] = 40;
		}
	}
	assert.equal(InferBackgroundColor(data, w, h), '#000000');
});

test('InferBackgroundColor snaps a light border to white', () => {
	const w = 24, h = 16;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < data.length; i += 4) {
		data[i] = 250; data[i + 1] = 248; data[i + 2] = 246; data[i + 3] = 255;
	}
	for (let y = 5; y <= 10; y++) {
		for (let x = 8; x <= 15; x++) {
			const i = (y * w + x) * 4;
			data[i] = 20; data[i + 1] = 20; data[i + 2] = 20;
		}
	}
	assert.equal(InferBackgroundColor(data, w, h), '#ffffff');
});

test('ContentBBoxFromRgba finds an isolated blob', () => {
	const w = 20, h = 10;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = 3; y <= 6; y++) {
		for (let x = 8; x <= 12; x++) {
			const i = (y * w + x) * 4;
			data[i] = 200; data[i + 1] = 40; data[i + 2] = 40; data[i + 3] = 255;
		}
	}
	const box = ContentBBoxFromRgba(data, w, h);
	assert.deepEqual(box, [8, 3, 5, 4]);
});

test('ZoomToSubject enlarges a small central object', () => {
	const z = ZoomToSubject([350, 180, 100, 120], 800, 480, 800 / 480);
	assert.ok(z >= 2.2, 'zoom=' + z);
});

test('ZoomToSubject stays near 1 when the subject already fills the frame', () => {
	const z = ZoomToSubject([40, 20, 720, 440], 800, 480, 800 / 480);
	assert.ok(z <= 1.2, 'zoom=' + z);
});

test('SuggestEinkSettings crop-to-subject zooms a small bbox', () => {
	const s = SuggestEinkSettings({
		p25: 0.22, p50: 0.48, p75: 0.74, trimMean: 0.47, mean: 0.47,
		iqr: 0.52, darkFrac: 0.18, brightFrac: 0.16, meanSat: 0.28, skinFrac: 0.05,
		width: 800, height: 480
	}, e6, { bbox: [350, 180, 100, 120], cropToSubject: true, displayWidth: 800, displayHeight: 480 });
	assert.ok(s.zoom >= 2.2, 'zoom=' + s.zoom);
});

test('SuggestEinkSettings without crop keeps a mild zoom cap', () => {
	const s = SuggestEinkSettings({
		p25: 0.22, p50: 0.48, p75: 0.74, trimMean: 0.47, mean: 0.47,
		iqr: 0.52, darkFrac: 0.18, brightFrac: 0.16, meanSat: 0.28, skinFrac: 0.05,
		width: 800, height: 480
	}, e6, { bbox: [350, 180, 100, 120], cropToSubject: false });
	assert.ok(s.zoom <= 1.5, 'zoom=' + s.zoom);
});

test('bw saturation stays zero under colorful', () => {
	const out = ApplyOptimizeBias({
		colorSaturationAdjust: 0, contrastAdjust: 1.3, blackPointAdjust: 1, whitePointAdjust: 1
	}, 'colorful');
	assert.equal(out.colorSaturationAdjust, 0);
});
