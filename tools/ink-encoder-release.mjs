/**
 * Helpers for PUBLISH_INK_ENCODER.
 * Publishes only the workspace package ink-encoder/, never the PhotoFrame root.
 */

import fs from 'fs';
import path from 'path';

export const INK_ENCODER_PACKAGE_NAME = 'ink-encoder';
export const INK_ENCODER_REL = 'ink-encoder';

export class InkReleaseError extends Error {
	/**
	 * @param {'confirm'|'package'|'otp'} reason
	 */
	constructor(reason, detail = '') {
		super(detail ? `${reason}: ${detail}` : reason);
		this.name = 'InkReleaseError';
		this.reason = reason;
		this.detail = detail;
	}
}

/**
 * @param {unknown} value
 * @param {boolean} [fallback=false]
 */
export function ParseFlag(value, fallback = false) {
	if (value == null || value === '') return fallback;
	if (typeof value === 'boolean') return value;
	const text = String(value).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(text)) return true;
	if (['0', 'false', 'no', 'off'].includes(text)) return false;
	return fallback;
}

/**
 * @param {unknown} raw
 * @returns {string|undefined}
 */
export function SanitizeNpmOtp(raw) {
	if (raw == null || raw === '') return undefined;
	const otp = String(raw).trim();
	if (/^\d{6,8}$/.test(otp)) return otp;
	throw new InkReleaseError('otp', 'expected 6–8 digits');
}

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function ResolveInkEncoderDir(repoRoot) {
	const root = path.resolve(repoRoot);
	const dir = path.resolve(root, INK_ENCODER_REL);
	const rel = path.relative(root, dir);
	if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
		throw new InkReleaseError('package', dir);
	}
	if (!fs.existsSync(path.join(dir, 'package.json'))) {
		throw new InkReleaseError('package', dir);
	}
	return dir;
}

/**
 * @param {string} encoderDir
 * @returns {{ name: string, version: string }}
 */
export function ReadInkEncoderPackage(encoderDir) {
	const pkg = JSON.parse(fs.readFileSync(path.join(encoderDir, 'package.json'), 'utf8'));
	if (pkg?.name !== INK_ENCODER_PACKAGE_NAME) {
		throw new InkReleaseError('package', String(pkg?.name ?? ''));
	}
	if (!pkg.version) throw new InkReleaseError('package', 'missing version');
	return { name: pkg.name, version: String(pkg.version) };
}

/**
 * @param {{ dryRun?: boolean, otp?: string, access?: string }} options
 */
export function NpmPublishArgs(options = {}) {
	const args = ['publish', `--access=${options.access || 'public'}`];
	if (options.dryRun) args.push('--dry-run');
	if (options.otp) args.push(`--otp=${options.otp}`);
	return args;
}
