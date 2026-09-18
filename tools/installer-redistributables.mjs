/**
 * Lädt große Installer-Assets aus dem Manifest nur bei Bedarf:
 * Datei fehlt oder Hash (sha256/sha512) weicht vom Manifest ab → Download.
 * Umstellung auf neue Version: URL + Hash im Manifest anpassen.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { CreateProgress, Log, Warn, LogError } from 'gulp-mu-gulp-api';

const MANIFEST_NAME = 'redistributables.json';

function _hexDigestFile(filePath, algorithm) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash(algorithm);
		const rs = fs.createReadStream(filePath);
		rs.on('error', reject);
		rs.on('data', (chunk) => hash.update(chunk));
		rs.on('end', () => resolve(hash.digest('hex')));
	});
}

async function _hashMatches(filePath, entry) {
	if (entry.sha512) {
		const d = await _hexDigestFile(filePath, 'sha512');
		return d.toLowerCase() === String(entry.sha512).toLowerCase();
	}
	if (entry.sha256) {
		const d = await _hexDigestFile(filePath, 'sha256');
		return d.toLowerCase() === String(entry.sha256).toLowerCase();
	}
	return null;
}

async function _downloadToFile(url, destPath) {
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
	}
	if (!res.body) {
		throw new Error('Empty response: ' + url);
	}
	const dir = path.dirname(destPath);
	fs.mkdirSync(dir, { recursive: true });
	const tmp = destPath + '.part';
	const ws = fs.createWriteStream(tmp);
	try {
		await pipeline(Readable.fromWeb(res.body), ws);
		await finished(ws);
		await fs.promises.rename(tmp, destPath);
	} catch (e) {
		try {
			fs.unlinkSync(tmp);
		} catch {
			/* ignore */
		}
		throw e;
	}
}

/**
 * @param {object} opts
 * @param {string} opts.root - Projektroot
 * @param {(s:string)=>void} [opts.log]
 * @param {(s:string)=>void} [opts.ok]
 * @param {(s:string)=>void} [opts.warn]
 * @param {(s:string)=>void} [opts.err]
 */
export async function fetchInstallerRedistributables(opts) {
	const root = opts.root;

	if (process.env.SKIP_FETCH_INSTALLER_ASSETS === '1') {
		Log('SKIP_FETCH_INSTALLER_ASSETS=1 — skipping redistributable downloads.<context="task log"/>');
		return;
	}

	const manifestPath = path.join(root, 'installer', 'assets', MANIFEST_NAME);
	if (!fs.existsSync(manifestPath)) {
		Warn('No manifest: <path/> — nothing to fetch.<context="task warning"/>', { path: manifestPath });
		return;
	}

	let manifest;
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	} catch (e) {
		throw new Error(`${MANIFEST_NAME}: ${e.message}`);
	}

	const items = Array.isArray(manifest.items) ? manifest.items : [];
	const assetsDir = path.join(root, 'installer', 'assets');
	const enabled = items.filter((entry) => entry.enabled !== false);
	const progress = enabled.length > 0 ? CreateProgress('Redistributables<context="task log"/>'.i18xTrans()) : null;
	let done = 0;

	for (const entry of items) {
		if (entry.enabled === false) continue;
		const name = entry.file;
		const url = entry.url;
		if (!name || !url) {
			Warn('Manifest entry without file/url skipped.<context="task warning"/>');
			done++;
			progress?.Update(done / enabled.length);
			continue;
		}

		const dest = path.join(assetsDir, path.basename(name));

		let needDownload = false;
		if (!fs.existsSync(dest)) {
			needDownload = true;
			Log('Missing: <name/> — downloading from original source…<context="task log"/>', { name });
		} else {
			const match = await _hashMatches(dest, entry);
			if (match === true) {
				Log('Unchanged (hash ok): <name/><context="task log"/>', { name });
				done++;
				progress?.Update(done / enabled.length);
				continue;
			}
			if (match === false) {
				needDownload = true;
				Log('Hash mismatch: <name/> — downloading again…<context="task log"/>', { name });
			} else {
				const min = typeof entry.minSizeBytes === 'number' ? entry.minSizeBytes : 0;
				const st = fs.statSync(dest);
				if (min > 0 && st.size >= min) {
					Log('Unchanged (minSizeBytes): <name/><context="task log"/>', { name });
					done++;
					progress?.Update(done / enabled.length);
					continue;
				}
				needDownload = true;
				Log('No hash / size uncertain: <name/> — downloading (again)…<context="task log"/>', { name });
			}
		}

		if (needDownload) {
			await _downloadToFile(url, dest);
		}

		const matchAfter = await _hashMatches(dest, entry);
		if (entry.sha512 || entry.sha256) {
			if (matchAfter !== true) {
				const sha256 = await _hexDigestFile(dest, 'sha256');
				const sha512 = await _hexDigestFile(dest, 'sha512');
				LogError('Hash check failed: <name/><context="task error"/>', { name });
				Log('sha256: <hash/><context="task log"/>', { hash: sha256 });
				Log('sha512: <hash/><context="task log"/>', { hash: sha512 });
				throw new Error(`Hash mismatch: ${name}`);
			}
		}

		Log('Downloaded: <name/> (<size format="byteSize"/>)<context="task log"/>', {
			name,
			size: fs.statSync(dest).size,
		});

		if (!entry.sha256 && !entry.sha512) {
			const sha256 = await _hexDigestFile(dest, 'sha256');
			const sha512 = await _hexDigestFile(dest, 'sha512');
			Log('(Add to manifest) sha256: <hash/><context="task log"/>', { hash: sha256 });
			Log('(Add to manifest) sha512: <hash/><context="task log"/>', { hash: sha512 });
		}

		done++;
		progress?.Update(done / enabled.length);
	}

	progress?.Done();
}
