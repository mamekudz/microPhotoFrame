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
		throw new Error('Leere Antwort: ' + url);
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
	const log = opts.log ?? console.log;
	const ok = opts.ok ?? ((s) => console.log('OK ' + s));
	const warn = opts.warn ?? console.warn;
	const err = opts.err ?? console.error;

	if (process.env.SKIP_FETCH_INSTALLER_ASSETS === '1') {
		log('SKIP_FETCH_INSTALLER_ASSETS=1 — überspringe Redistributable-Downloads.');
		return;
	}

	const manifestPath = path.join(root, 'installer', 'assets', MANIFEST_NAME);
	if (!fs.existsSync(manifestPath)) {
		warn(`Kein Manifest: ${manifestPath} — nichts zu laden.`);
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

	for (const entry of items) {
		if (entry.enabled === false) continue;
		const name = entry.file;
		const url = entry.url;
		if (!name || !url) {
			warn('Manifest-Eintrag ohne file/url übersprungen.');
			continue;
		}

		const dest = path.join(assetsDir, path.basename(name));

		let needDownload = false;
		if (!fs.existsSync(dest)) {
			needDownload = true;
			log(`Fehlt: ${name} — lade von Originalquelle …`);
		} else {
			const match = await _hashMatches(dest, entry);
			if (match === true) {
				ok(`unverändert (Hash ok): ${name}`);
				continue;
			}
			if (match === false) {
				needDownload = true;
				log(`Hash abweichend: ${name} — lade neu …`);
			} else {
				const min = typeof entry.minSizeBytes === 'number' ? entry.minSizeBytes : 0;
				const st = fs.statSync(dest);
				if (min > 0 && st.size >= min) {
					ok(`unverändert (minSizeBytes): ${name}`);
					continue;
				}
				needDownload = true;
				log(`Kein Hash / Größe unsicher: ${name} — lade (neu) …`);
			}
		}

		await _downloadToFile(url, dest);

		const matchAfter = await _hashMatches(dest, entry);
		if (entry.sha512 || entry.sha256) {
			if (matchAfter !== true) {
				const sha256 = await _hexDigestFile(dest, 'sha256');
				const sha512 = await _hexDigestFile(dest, 'sha512');
				err(`Hash-Prüfung fehlgeschlagen: ${name}`);
				log(`  sha256: ${sha256}`);
				log(`  sha512: ${sha512}`);
				throw new Error(`Hash mismatch: ${name}`);
			}
		}

		ok(`geladen: ${name} (${(fs.statSync(dest).size / (1024 * 1024)).toFixed(1)} MB)`);

		if (!entry.sha256 && !entry.sha512) {
			const sha256 = await _hexDigestFile(dest, 'sha256');
			const sha512 = await _hexDigestFile(dest, 'sha512');
			log(`  (Manifest ergänzen) sha256: ${sha256}`);
			log(`  (Manifest ergänzen) sha512: ${sha512}`);
		}
	}
}
