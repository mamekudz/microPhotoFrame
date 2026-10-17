import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PLATFORM_DEFAULT,
	PLATFORM_NEOFRAME,
	PLATFORM_RETERMINAL,
	PLATFORM_WAVESHARE_154G,
	PLATFORM_IDS,
	buildFilterPlatformOptions,
	buildPlatformProjectControl,
	FACTORY_MERGED_BIN_NAMES,
	factoryDir,
	findMergedFactoryBinary,
	pioEnvForPlatform,
	platformMeta,
	resolveActivePlatform,
	resolveFactoryFlashPlan,
} from './photoframe-platforms.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('platform IDs are stable and default is reTerminal E1002', () => {
	assert.equal(PLATFORM_RETERMINAL, 'reterminal-e1002');
	assert.equal(PLATFORM_NEOFRAME, 'neoframe');
	assert.equal(PLATFORM_WAVESHARE_154G, 'waveshare-154g');
	assert.equal(PLATFORM_DEFAULT, PLATFORM_RETERMINAL);
	assert.deepEqual([...PLATFORM_IDS], [PLATFORM_RETERMINAL, PLATFORM_NEOFRAME, PLATFORM_WAVESHARE_154G]);
});

test('Project Control is radio id=platform', () => {
	const ctrl = buildPlatformProjectControl();
	assert.equal(ctrl.id, 'platform');
	assert.equal(ctrl.type, 'radio');
	assert.equal(ctrl.default, PLATFORM_RETERMINAL);
	assert.deepEqual(ctrl.options.map((o) => o.value), [PLATFORM_RETERMINAL, PLATFORM_NEOFRAME, PLATFORM_WAVESHARE_154G]);
});

test('microgulp.config.json mirrors platform Project Control', () => {
	const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'microgulp.config.json'), 'utf8'));
	const platform = (cfg.project?.controls || []).find((c) => c.id === 'platform');
	assert.ok(platform);
	assert.equal(platform.type, 'radio');
	assert.equal(platform.default, PLATFORM_RETERMINAL);
	assert.deepEqual(
		platform.options.map((o) => o.value),
		[PLATFORM_RETERMINAL, PLATFORM_NEOFRAME, PLATFORM_WAVESHARE_154G],
	);
	assert.equal(
		platform.options.find((o) => o.value === PLATFORM_NEOFRAME).tooltip,
		platformMeta(PLATFORM_NEOFRAME).tooltip,
	);
});

test('resolveActivePlatform uses MICROGULP_CONTROLS then PHOTOFRAME_PLATFORM', () => {
	const prevControls = process.env.MICROGULP_CONTROLS;
	const prevPlatform = process.env.PHOTOFRAME_PLATFORM;
	try {
		delete process.env.MICROGULP_CONTROLS;
		delete process.env.PHOTOFRAME_PLATFORM;
		assert.equal(resolveActivePlatform(), PLATFORM_RETERMINAL);

		process.env.PHOTOFRAME_PLATFORM = PLATFORM_NEOFRAME;
		assert.equal(resolveActivePlatform(), PLATFORM_NEOFRAME);

		process.env.MICROGULP_CONTROLS = JSON.stringify({ platform: PLATFORM_RETERMINAL });
		assert.equal(resolveActivePlatform(), PLATFORM_RETERMINAL);
	} finally {
		if (prevControls === undefined) delete process.env.MICROGULP_CONTROLS;
		else process.env.MICROGULP_CONTROLS = prevControls;
		if (prevPlatform === undefined) delete process.env.PHOTOFRAME_PLATFORM;
		else process.env.PHOTOFRAME_PLATFORM = prevPlatform;
	}
});

test('pio env and build-filter platform match the target', () => {
	assert.equal(pioEnvForPlatform(PLATFORM_RETERMINAL), 'seeed_xiao_esp32s3');
	assert.equal(pioEnvForPlatform(PLATFORM_NEOFRAME), 'neoframe');
	assert.equal(pioEnvForPlatform(PLATFORM_WAVESHARE_154G), 'waveshare_154g');
	assert.equal(buildFilterPlatformOptions(PLATFORM_NEOFRAME).platform, PLATFORM_NEOFRAME);
	assert.equal(buildFilterPlatformOptions(PLATFORM_NEOFRAME).mode, 'remove');
	const neo = platformMeta(PLATFORM_NEOFRAME);
	assert.match(neo.tooltip, /GDP073EW1/);
	assert.match(neo.tooltip, /GDEP073E01/);
	assert.equal(neo.esptoolChip, 'esp32s3');
});

test('factory plan prefers explicit bin, then factory.bin at 0x0', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-factory-'));
	try {
		const explicit = path.join(tmp, 'stock.bin');
		fs.writeFileSync(explicit, 'x');
		const plan = resolveFactoryFlashPlan(tmp, PLATFORM_NEOFRAME, explicit);
		assert.equal(plan.parts[0].offset, '0x0');
		assert.equal(plan.parts[0].file, explicit);

		const root = path.join(tmp, 'root');
		const dir = factoryDir(root, PLATFORM_NEOFRAME);
		fs.mkdirSync(dir, { recursive: true });
		const factory = path.join(dir, 'factory.bin');
		fs.writeFileSync(factory, 'y');
		const auto = resolveFactoryFlashPlan(root, PLATFORM_NEOFRAME);
		assert.equal(auto.parts[0].file, factory);
		assert.equal(auto.chip, 'esp32s3');
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});

test('factory plan accepts GooDisplay Arduino merged.bin at 0x0', () => {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-factory-gdep-'));
	try {
		const root = path.join(tmp, 'root');
		const dir = factoryDir(root, PLATFORM_NEOFRAME);
		fs.mkdirSync(dir, { recursive: true });
		const vendor = path.join(dir, 'GDEPE073E01.ino.merged.bin');
		fs.writeFileSync(vendor, 'merged');
		assert.equal(findMergedFactoryBinary(dir), vendor);
		const plan = resolveFactoryFlashPlan(root, PLATFORM_NEOFRAME);
		assert.equal(plan.parts[0].offset, '0x0');
		assert.equal(plan.parts[0].file, vendor);
		assert.ok(FACTORY_MERGED_BIN_NAMES.includes('GDEPE073E01.ino.merged.bin'));
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
});
