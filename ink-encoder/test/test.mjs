import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import sharp from 'sharp';
import {
	DecodeInk,
	EncodeInk,
	GetDisplayByPathId,
	GetDisplayByShortId,
	GetOptionsFromDisplayId,
	GetPathDisplayId,
} from '../src/inkEncoder.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-encoder-2.1.0-'));
const pngPath = path.join(tmp, 'synthetic.png');
const inkPath = path.join(tmp, 'synthetic.ink');
const decodedPath = path.join(tmp, 'decoded.png');

before(async () => {
	await sharp({
		create: {
			width: 64,
			height: 48,
			channels: 3,
			background: { r: 32, g: 96, b: 200 },
		},
	}).png().toFile(pngPath);
});

after(() => {
	fs.rmSync(tmp, { recursive: true, force: true });
});

test('Spectra 6 7.3" id is 9; I is BWR 2.13"', () => {
	const display = GetDisplayByShortId('9');
	assert.equal(display?.id, '9');
	assert.equal(display?.width, 800);
	assert.equal(display?.height, 480);
	assert.equal(display?.colors?.length, 6);
	assert.match(display?.name || '', /NeoFrame/);
	assert.equal(GetDisplayByShortId('I')?.id, 'I');
	assert.equal(GetDisplayByShortId('I')?.colors?.length, 3);
	assert.equal(GetPathDisplayId('9'), '9');
	assert.equal(GetPathDisplayId('I'), 'I');
	assert.equal(GetDisplayByPathId('9')?.id, '9');
});

test('Waveshare 1.54G short id is f', () => {
	const display = GetDisplayByShortId('f');
	assert.equal(display?.width, 200);
	assert.equal(display?.height, 200);
	assert.equal(display?.colors?.length, 4);
	assert.equal(GetPathDisplayId('f'), 'f');
	assert.match(display?.name || '', /Waveshare/);
});

test('EncodeInk writes v3 header and DecodeInk round-trips', async () => {
	const options = GetOptionsFromDisplayId('9', { dither: 'none', compression: 'deflatePaeth' });
	const ink = await EncodeInk(pngPath, options);
	assert.ok(ink instanceof Uint8Array);
	assert.equal(ink[0], 3);
	assert.equal(String.fromCharCode(ink[1]), '9');
	const png = await DecodeInk(ink, {
		colors: options.colors,
		width: options.width,
		height: options.height,
		isRound: options.isRound,
	});
	assert.ok(Buffer.isBuffer(png));
	fs.writeFileSync(inkPath, ink);
	fs.writeFileSync(decodedPath, png);
	assert.equal(fs.existsSync(decodedPath), true);
	const meta = await sharp(decodedPath).metadata();
	assert.equal(meta.width, 800);
	assert.equal(meta.height, 480);
	assert.equal(meta.format, 'png');
});
