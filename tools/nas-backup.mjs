/**
 * NAS backup helpers for BACKUP_TO_NAS.
 * Isolated from gulp so path safety and robocopy exit handling can be tested
 * without copying the project or talking to Z:\.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const NAS_BACKUP_DEFAULT = 'Z:\\Projects\\microPhotoFrame';

/**
 * Directory names that are always regenerable in this repo (any nesting).
 * Do not list short source-folder names such as `lib` or `build` here:
 * `src/libs` is vendored source (`libs`, not `lib`), but a future `lib/`
 * source tree must not be skipped or deleted by a blanket name match.
 */
export const NAS_BACKUP_EXCLUDE_DIR_NAMES = Object.freeze([
	'node_modules',
	'dist',
	'installers',
	'tmp',
	'logs',
	'packages',
	'.microgulp',
	'.pio',
	'.pioenvs',
	'libdeps',
	'__pycache__',
	'venv',
]);

/** Regenerable paths relative to the project / NAS destination root. */
export const NAS_BACKUP_EXCLUDE_REL_DIRS = Object.freeze([
	'lib',
	'build',
	'firmware/lib',
	'firmware/backups',
	'ink-encoder/extensions/win-preview-handler/bin',
	'ink-encoder/extensions/win-preview-handler/obj',
	'installer/NSISBI_3.08',
	'installer/bin',
]);

export const NAS_BACKUP_EXCLUDE_FILES = Object.freeze(['Thumbs.db', '.DS_Store', 'desktop.ini']);

export class NasBackupError extends Error {
	/**
	 * @param {'missing'|'drive-root'|'same'|'ancestor'|'descendant'|'outside'} reason
	 * @param {string} [destPath]
	 */
	constructor(reason, destPath = '') {
		super(reason);
		this.name = 'NasBackupError';
		this.reason = reason;
		this.path = destPath;
	}
}

function _stripExtendedPrefix(_path) {
	let value = String(_path);
	if (value.toUpperCase().startsWith('\\\\?\\UNC\\')) {
		return '\\' + value.slice(7);
	}
	if (value.startsWith('\\\\?\\')) {
		return value.slice(4);
	}
	return value;
}

function _asWinSlashes(input) {
	return _stripExtendedPrefix(String(input ?? '').trim().replace(/^["']+|["']+$/g, '')).replace(/\//g, '\\');
}

/**
 * @param {unknown} input
 * @returns {string}
 */
export function NormalizeNasPath(input) {
	if (input == null) return '';
	let value = _asWinSlashes(input);
	if (!value) return '';
	if (value.startsWith('\\\\')) {
		value = '\\\\' + value.slice(2).replace(/\\+/g, '\\');
	} else {
		value = value.replace(/\\+/g, '\\');
	}
	if (IsDriveRoot(value)) {
		if (/^[A-Za-z]:$/.test(value.replace(/\\+$/, ''))) return value.replace(/\\+$/, '') + '\\';
		return value.replace(/\\+$/, '') + '\\';
	}
	if (IsUncShareRoot(value)) {
		return value.replace(/\\+$/, '');
	}
	return value.replace(/\\+$/, '');
}

/**
 * @param {string} input
 * @returns {boolean}
 */
export function IsDriveRoot(input) {
	const slashes = _asWinSlashes(input);
	const trimmed = slashes.replace(/\\+$/, '');
	return /^[A-Za-z]:$/.test(trimmed);
}

/**
 * UNC share root `\\server\share` (not `\\server\share\folder`).
 * @param {string} input
 * @returns {boolean}
 */
export function IsUncShareRoot(input) {
	let value = _asWinSlashes(input);
	if (!value.startsWith('\\\\')) return false;
	value = '\\\\' + value.slice(2).replace(/\\+/g, '\\');
	value = value.replace(/\\+$/, '');
	const parts = value.slice(2).split('\\').filter(Boolean);
	return parts.length === 2;
}

export function IsDriveOrShareRoot(input) {
	return IsDriveRoot(input) || IsUncShareRoot(input);
}

function _pathKey(input) {
	return NormalizeNasPath(input).toLowerCase();
}

export function PathsEqual(left, right) {
	const a = _pathKey(left);
	const b = _pathKey(right);
	if (!a || !b) return false;
	return a === b;
}

/** True if `parent` is a strict ancestor of `child` (requires a path boundary). */
export function IsStrictAncestor(parent, child) {
	const parentKey = _pathKey(parent);
	const childKey = _pathKey(child);
	if (!parentKey || !childKey || parentKey === childKey) return false;
	const prefix = parentKey.endsWith('\\') ? parentKey : parentKey + '\\';
	return childKey.startsWith(prefix);
}

export function IsPathInside(inner, outer) {
	return IsStrictAncestor(outer, inner);
}

/**
 * @param {string} input
 * @param {{ follow?: boolean }} [options]
 * @returns {string}
 */
export function ResolveNasPath(input, options = {}) {
	const follow = options.follow !== false;
	const normalized = NormalizeNasPath(input);
	if (!normalized) return '';
	let resolved = NormalizeNasPath(path.resolve(normalized));
	if (!follow) return resolved;
	try {
		if (fs.existsSync(resolved)) {
			const real = fs.realpathSync.native ? fs.realpathSync.native(resolved) : fs.realpathSync(resolved);
			resolved = NormalizeNasPath(real);
		}
	} catch {
		/* keep resolved */
	}
	return resolved;
}

/**
 * @param {string} sourceDir
 * @param {string} destinationDir
 * @returns {string} resolved destination
 */
export function AssertNasDestination(sourceDir, destinationDir) {
	const destInput = NormalizeNasPath(destinationDir);
	if (!destInput) {
		throw new NasBackupError('missing', String(destinationDir ?? ''));
	}
	if (IsDriveOrShareRoot(destInput)) {
		throw new NasBackupError('drive-root', destInput);
	}
	if (!fs.existsSync(destInput)) {
		throw new NasBackupError('missing', destInput);
	}

	const source = ResolveNasPath(sourceDir);
	const dest = ResolveNasPath(destinationDir);
	if (!dest) {
		throw new NasBackupError('missing', destInput);
	}
	if (IsDriveOrShareRoot(dest)) {
		throw new NasBackupError('drive-root', dest);
	}
	if (PathsEqual(source, dest)) {
		throw new NasBackupError('same', dest);
	}
	if (IsStrictAncestor(dest, source)) {
		throw new NasBackupError('ancestor', dest);
	}
	if (IsStrictAncestor(source, dest)) {
		throw new NasBackupError('descendant', dest);
	}
	return dest;
}

/**
 * Join a destination-relative path and prove the result stays inside destRoot.
 * Follows the final path only when it is not a junction/symlink.
 * @param {string} destRoot
 * @param {string} relativeOrAbsolute
 * @returns {{ ok: true, path: string, symlink: boolean } | { ok: false, reason: string, path: string }}
 */
export function ResolveDeletionTarget(destRoot, relativeOrAbsolute) {
	const dest = ResolveNasPath(destRoot);
	if (!dest || IsDriveOrShareRoot(dest)) {
		return { ok: false, reason: 'drive-root', path: destRoot };
	}

	const raw = String(relativeOrAbsolute ?? '');
	if (!raw) return { ok: false, reason: 'outside', path: raw };

	const joined = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(dest, raw);
	const logical = NormalizeNasPath(joined);
	if (!IsPathInside(logical, dest)) {
		return { ok: false, reason: 'outside', path: logical };
	}

	let symlink = false;
	try {
		const st = fs.lstatSync(logical);
		symlink = st.isSymbolicLink();
	} catch {
		return { ok: false, reason: 'missing', path: logical };
	}

	if (symlink) {
		return { ok: true, path: logical, symlink: true };
	}

	let real = logical;
	try {
		real = NormalizeNasPath(fs.realpathSync.native ? fs.realpathSync.native(logical) : fs.realpathSync(logical));
	} catch {
		real = logical;
	}
	if (!IsPathInside(real, dest)) {
		return { ok: false, reason: 'outside', path: real };
	}
	return { ok: true, path: logical, symlink: false };
}

function _removeOne(target, destRoot, log, warn) {
	const resolved = ResolveDeletionTarget(destRoot, target);
	if (!resolved.ok) {
		if (resolved.reason === 'missing') return false;
		warn(resolved.path, 'outside');
		return false;
	}
	const rel = path.relative(destRoot, resolved.path);
	log(rel || resolved.path);
	try {
		if (resolved.symlink) {
			fs.rmSync(resolved.path, { force: true });
		} else {
			fs.rmSync(resolved.path, { recursive: true, force: true });
		}
		return true;
	} catch (err) {
		warn(rel || resolved.path, err.message);
		return false;
	}
}

/**
 * Delete leftover regenerable directories inside destRoot only.
 * @param {string} destRoot
 * @param {{ log?: (rel: string) => void, warn?: (rel: string, message?: string) => void }} [options]
 * @returns {number} removed count
 */
export function RemoveReproducibleDirs(destRoot, options = {}) {
	const log = options.log ?? (() => {});
	const warn = options.warn ?? (() => {});
	const dest = ResolveNasPath(destRoot);
	if (!dest || IsDriveOrShareRoot(dest) || !fs.existsSync(dest)) return 0;

	let removed = 0;
	const excludeNames = new Set(NAS_BACKUP_EXCLUDE_DIR_NAMES);

	for (const rel of NAS_BACKUP_EXCLUDE_REL_DIRS) {
		if (_removeOne(rel, dest, log, warn)) removed++;
	}

	function walk(dir) {
		let st;
		try {
			st = fs.lstatSync(dir);
		} catch {
			return;
		}
		if (st.isSymbolicLink() || !st.isDirectory()) return;
		const logical = NormalizeNasPath(path.resolve(dir));
		if (!PathsEqual(logical, dest) && !IsPathInside(logical, dest)) return;

		let entries;
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name === '.git') continue;
			const full = path.join(dir, entry.name);
			if (entry.isSymbolicLink()) {
				if (excludeNames.has(entry.name)) {
					if (_removeOne(full, dest, log, warn)) removed++;
				}
				continue;
			}
			if (!entry.isDirectory()) continue;
			if (excludeNames.has(entry.name)) {
				if (_removeOne(full, dest, log, warn)) removed++;
				continue;
			}
			walk(full);
		}
	}

	walk(dest);
	return removed;
}

export function BuildRobocopyArgs(sourceDir, destDir) {
	const xd = [
		...NAS_BACKUP_EXCLUDE_DIR_NAMES,
		...NAS_BACKUP_EXCLUDE_REL_DIRS.map((rel) => rel.replace(/\//g, '\\')),
	];
	return [
		sourceDir,
		destDir,
		'/MIR',
		'/FFT',
		'/DST',
		'/R:2',
		'/W:2',
		'/MT:8',
		'/NFL',
		'/NDL',
		'/NP',
		'/XD',
		...xd,
		'/XF',
		...NAS_BACKUP_EXCLUDE_FILES,
	];
}

/**
 * Robocopy treats 0–7 as success. A missing code or a terminating signal is an error.
 * @param {string[]} args
 * @param {{ spawn?: typeof spawn, cwd?: string, stdio?: any }} [options]
 * @returns {Promise<number>}
 */
export function RunRobocopy(args, options = {}) {
	const spawnFn = options.spawn ?? spawn;
	return new Promise((resolve, reject) => {
		const child = spawnFn('robocopy', args, {
			stdio: options.stdio ?? 'inherit',
			cwd: options.cwd,
			windowsHide: true,
		});
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (signal) {
				reject(new Error(`robocopy aborted (${signal})`));
				return;
			}
			if (code === null || code === undefined) {
				reject(new Error('robocopy aborted (no exit code)'));
				return;
			}
			if (code >= 0 && code < 8) {
				resolve(code);
				return;
			}
			reject(new Error(`robocopy exited with code ${code}`));
		});
	});
}
