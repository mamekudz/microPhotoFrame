import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SuggestEinkSettings } from '../src/microLib/EInkAutoOptimize.mjs';

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
	assert.ok(s.contrastAdjust <= 1.45, 'contrast=' + s.contrastAdjust);
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
	assert.ok(s.contrastAdjust <= 1.40, 'contrast=' + s.contrastAdjust);
});
