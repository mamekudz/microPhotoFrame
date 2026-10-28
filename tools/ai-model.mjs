/**
 * COCO-SSD weights for in-browser auto-center. Downloaded by gulp INIT.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

export const AI_MODEL_MANIFEST = 'src/libs/models/manifest.json';

export function readAiModelManifest(root) {
	const p = path.join(root, AI_MODEL_MANIFEST);
	if (!fs.existsSync(p)) throw new Error('AI model manifest missing: ' + p);
	const data = JSON.parse(fs.readFileSync(p, 'utf8'));
	if (!data || !Array.isArray(data.files) || !data.files.length) {
		throw new Error('AI model manifest has no files: ' + p);
	}
	return data;
}

function destPath(root, entry) {
	return path.join(root, String(entry.dest || '').replace(/\\/g, '/'));
}

async function sha256File(filePath) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256');
		const rs = fs.createReadStream(filePath);
		rs.on('error', reject);
		rs.on('data', (chunk) => hash.update(chunk));
		rs.on('end', () => resolve(hash.digest('hex')));
	});
}

export function listMissingAiModelFiles(root, manifest) {
	const missing = [];
	for (const entry of manifest.files) {
		const dest = destPath(root, entry);
		if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) missing.push(entry);
	}
	return missing;
}

export async function listStaleAiModelFiles(root, manifest) {
	const stale = [];
	for (const entry of manifest.files) {
		const dest = destPath(root, entry);
		if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) continue;
		if (!entry.sha256) continue;
		const digest = await sha256File(dest);
		if (digest.toLowerCase() !== String(entry.sha256).toLowerCase()) stale.push(entry);
	}
	return stale;
}

async function downloadToFile(url, dest) {
	const res = await fetch(url, { redirect: 'follow' });
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
	if (!res.body) throw new Error('Empty response: ' + url);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	const tmp = dest + '.part';
	const ws = fs.createWriteStream(tmp);
	try {
		await pipeline(Readable.fromWeb(res.body), ws);
		await finished(ws);
		await fs.promises.rename(tmp, dest);
	} catch (err) {
		try { fs.unlinkSync(tmp); } catch { /* ignore */ }
		throw err;
	}
}

/**
 * @param {object} opts
 * @param {string} opts.root
 * @param {boolean} [opts.force]
 * @param {(n:number, msg:string)=>void} [opts.progress]
 * @param {(msg:string)=>void} [opts.log]
 */
export async function fetchAiModel(opts) {
	const root = opts.root;
	const force = !!opts.force;
	const log = opts.log || (() => {});
	const progress = opts.progress || (() => {});
	const manifest = readAiModelManifest(root);
	const missing = listMissingAiModelFiles(root, manifest);
	const stale = force ? [] : await listStaleAiModelFiles(root, manifest);
	const needed = force ? manifest.files.slice() : [...missing, ...stale];
	const seen = new Set();
	const todo = needed.filter((entry) => {
		const key = entry.dest;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	if (!todo.length) {
		log('AI model already present.');
		progress(1, 'AI model already present.');
		return { downloaded: [], skipped: manifest.files.length };
	}

	let done = 0;
	const downloaded = [];
	for (const entry of todo) {
		const dest = destPath(root, entry);
		progress(done / todo.length, entry.dest);
		log('Downloading ' + entry.dest);
		await downloadToFile(entry.url, dest);
		if (entry.sha256) {
			const digest = await sha256File(dest);
			if (digest.toLowerCase() !== String(entry.sha256).toLowerCase()) {
				throw new Error('Checksum mismatch: ' + entry.dest);
			}
		}
		downloaded.push(entry.dest);
		done += 1;
		progress(done / todo.length, entry.dest);
	}
	log('AI model ready (' + downloaded.length + ' file(s)).');
	return { downloaded, skipped: manifest.files.length - downloaded.length };
}
