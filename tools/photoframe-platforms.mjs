/**
 * Hardware targets + µGulp Project Control helpers.
 *
 * Project control id `platform` is the source of truth for:
 *   - gulp-mu-build-filter `platform` (exact match, mode remove)
 *   - firmware/src/boards/*.h  BUILD_ONLY_AT_PLATFORMS
 *   - PlatformIO `-e` environment
 *   - factory-firmware restore folder
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

export const PLATFORM_RETERMINAL = 'reterminal-e1002';
export const PLATFORM_NEOFRAME = 'neoframe';
export const PLATFORM_DEFAULT = PLATFORM_RETERMINAL;

export const PLATFORMS = Object.freeze([
	{
		id: PLATFORM_RETERMINAL,
		label: 'reTerminal E1002',
		tooltip: 'Seeed reTerminal E1002 · XIAO ESP32-S3 · Spectra 6 7.3" 800×480',
		shortName: 'E1002',
		pioEnv: 'seeed_xiao_esp32s3',
		esptoolChip: 'esp32s3',
	},
	{
		id: PLATFORM_NEOFRAME,
		label: 'NeoFrame',
		tooltip: 'GooDisplay NeoFrame GDP073EW1 · ESP32-S3 · Spectra 6 7.3" 800×480 (GDEP073E01)',
		shortName: 'NeoFrame',
		pioEnv: 'neoframe',
		esptoolChip: 'esp32s3',
	},
]);

export const PLATFORM_IDS = Object.freeze(PLATFORMS.map((p) => p.id));

export function buildPlatformProjectControl() {
	return {
		id: 'platform',
		type: 'radio',
		label: 'Target',
		default: PLATFORM_DEFAULT,
		tooltip: 'Hardware target for build, upload, and factory restore',
		icon: 'build',
		options: PLATFORMS.map((p) => ({
			value: p.id,
			label: p.label,
			tooltip: p.tooltip,
		})),
	};
}

export function platformMeta(platformId) {
	const id = String(platformId || PLATFORM_DEFAULT);
	return PLATFORMS.find((p) => p.id === id) || PLATFORMS[0];
}

export function isKnownPlatform(platformId) {
	return PLATFORM_IDS.includes(String(platformId || ''));
}

export function getProjectControls() {
	try {
		const require = createRequire(import.meta.url);
		const api = require('gulp-mu-gulp-api');
		if (typeof api.GetProjectControls === 'function') {
			const v = api.GetProjectControls();
			if (v && typeof v === 'object') return v;
		}
	} catch {
		/* fall through */
	}
	const raw = process.env.MICROGULP_CONTROLS;
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
	} catch {
		/* ignore */
	}
	return {};
}

export function resolveActivePlatform() {
	const controls = getProjectControls();
	const fromControl = String(controls.platform ?? '').trim();
	if (isKnownPlatform(fromControl)) return fromControl;
	const fromEnv = String(process.env.PHOTOFRAME_PLATFORM ?? '').trim();
	if (isKnownPlatform(fromEnv)) return fromEnv;
	return PLATFORM_DEFAULT;
}

export function pioEnvForPlatform(platformId) {
	return platformMeta(platformId ?? resolveActivePlatform()).pioEnv;
}

export function buildFilterPlatformOptions(platformId) {
	const platform = platformId ?? resolveActivePlatform();
	return {
		platform,
		release: '*',
		client: '*',
		mode: 'remove',
	};
}

export function factoryDir(projectRoot, platformId) {
	return path.join(projectRoot, 'firmware', 'factory', platformId ?? resolveActivePlatform());
}

/** Full-flash images written at 0x0 (Arduino `.ino.merged.bin` is the same layout). */
export const FACTORY_MERGED_BIN_NAMES = Object.freeze([
	'factory.bin',
	'stock.bin',
	'original.bin',
	'firmware.bin',
	'GDEPE073E01.ino.merged.bin',
]);

export function findMergedFactoryBinary(dir) {
	if (!dir || !fs.existsSync(dir)) return null;
	for (const name of FACTORY_MERGED_BIN_NAMES) {
		const p = path.join(dir, name);
		if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
	}
	const merged = fs
		.readdirSync(dir)
		.filter((n) => n.toLowerCase().endsWith('.ino.merged.bin'))
		.sort((a, b) => a.localeCompare(b));
	return merged.length ? path.join(dir, merged[0]) : null;
}

/**
 * Resolve flash parts for factory restore.
 * Prefer firmware/factory/<id>/manifest.json; else a merged image @ 0x0
 * (factory.bin, firmware.bin, GDEPE073E01.ino.merged.bin, *.ino.merged.bin);
 * else bootloader + partitions + firmware at ESP32-S3 defaults.
 */
export function resolveFactoryFlashPlan(projectRoot, platformId, explicitBinary) {
	const meta = platformMeta(platformId);
	if (explicitBinary) {
		if (!fs.existsSync(explicitBinary)) {
			throw new Error(`Factory binary not found: ${explicitBinary}`);
		}
		return {
			chip: meta.esptoolChip,
			parts: [{ offset: '0x0', file: path.resolve(explicitBinary) }],
			source: explicitBinary,
		};
	}

	const dir = factoryDir(projectRoot, meta.id);
	const manifestPath = path.join(dir, 'manifest.json');
	if (fs.existsSync(manifestPath)) {
		const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
		const parts = (man.flash || man.parts || []).map((p) => ({
			offset: String(p.offset),
			file: path.resolve(dir, p.file),
		}));
		for (const p of parts) {
			if (!fs.existsSync(p.file)) throw new Error(`Factory part missing: ${p.file}`);
		}
		return { chip: man.chip || meta.esptoolChip, parts, source: manifestPath };
	}

	const factoryBin = findMergedFactoryBinary(dir);
	if (factoryBin) {
		return { chip: meta.esptoolChip, parts: [{ offset: '0x0', file: factoryBin }], source: factoryBin };
	}

	const trio = [
		{ offset: '0x0', name: 'bootloader.bin' },
		{ offset: '0x8000', name: 'partitions.bin' },
		{ offset: '0x10000', name: 'firmware.bin' },
	];
	if (trio.every((p) => fs.existsSync(path.join(dir, p.name)))) {
		return {
			chip: meta.esptoolChip,
			parts: trio.map((p) => ({ offset: p.offset, file: path.join(dir, p.name) })),
			source: dir,
		};
	}

	return null;
}
