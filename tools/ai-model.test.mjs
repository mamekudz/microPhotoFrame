import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	AI_MODEL_MANIFEST,
	listMissingAiModelFiles,
	readAiModelManifest,
} from './ai-model.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('committed manifest lists the local COCO-SSD files', () => {
	const manifest = readAiModelManifest(ROOT);
	assert.equal(manifest.files.length, 6);
	assert.ok(manifest.files.every((f) => f.url && f.dest && f.sha256));
	assert.ok(manifest.files.every((f) => f.dest.startsWith('src/libs/models/')));
	assert.equal(AI_MODEL_MANIFEST, 'src/libs/models/manifest.json');
});

test('missing list is empty when the local model is already installed', () => {
	const manifest = readAiModelManifest(ROOT);
	const missing = listMissingAiModelFiles(ROOT, manifest);
	assert.deepEqual(missing, []);
});

test('missing list reports absent shards', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpf-ai-'));
	const manifest = {
		files: [
			{ dest: 'src/libs/models/model.json', url: 'https://example.test/model.json' },
			{ dest: 'src/libs/models/group1-shard1of5', url: 'https://example.test/s1' },
		],
	};
	fs.mkdirSync(path.join(dir, 'src/libs/models'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'src/libs/models/model.json'), '{}');
	const missing = listMissingAiModelFiles(dir, manifest);
	assert.equal(missing.length, 1);
	assert.equal(missing[0].dest, 'src/libs/models/group1-shard1of5');
});
