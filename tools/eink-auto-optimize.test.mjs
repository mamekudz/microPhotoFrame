import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SuggestEinkSettings } from '../src/microLib/EInkAutoOptimize.mjs';

const e6 = { colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00'] };

test('high-key bathroom does not crush the subject', () => {
	const s = SuggestEinkSettings({
		p05: 0.55,
		p50: 0.82,
		p95: 0.97,
		mean: 0.78,
		std: 0.10,
		meanSat: 0.12,
		skinFrac: 0.08,
		subjectMean: 0.34,
		subjectP05: 0.16,
		subjectP95: 0.55
	}, e6);
	assert.ok(s.blackPointAdjust <= 1.12, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust <= 1.45, 'contrast=' + s.contrastAdjust);
});

test('low-key night lifts shadows instead of adding contrast', () => {
	const s = SuggestEinkSettings({
		p05: 0.01,
		p50: 0.08,
		p95: 0.70,
		mean: 0.12,
		std: 0.14,
		meanSat: 0.15,
		skinFrac: 0.04,
		subjectMean: 0.22,
		subjectP05: 0.06,
		subjectP95: 0.72
	}, e6);
	assert.ok(s.blackPointAdjust <= 0.85, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust <= 1.35, 'contrast=' + s.contrastAdjust);
});

test('normal daylight stays near previous defaults', () => {
	const s = SuggestEinkSettings({
		p05: 0.06,
		p50: 0.48,
		p95: 0.92,
		mean: 0.47,
		std: 0.18,
		meanSat: 0.28,
		skinFrac: 0.05,
		subjectMean: 0.47,
		subjectP05: 0.08,
		subjectP95: 0.88
	}, e6);
	assert.ok(s.blackPointAdjust >= 0.85 && s.blackPointAdjust <= 1.20, 'bp=' + s.blackPointAdjust);
	assert.ok(s.contrastAdjust >= 1.15 && s.contrastAdjust <= 1.70, 'contrast=' + s.contrastAdjust);
});
