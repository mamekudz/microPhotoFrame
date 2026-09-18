import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	AssertNasDestination,
	BuildRobocopyArgs,
	IsDriveOrShareRoot,
	IsDriveRoot,
	IsPathInside,
	IsStrictAncestor,
	IsUncShareRoot,
	NAS_BACKUP_EXCLUDE_DIR_NAMES,
	NormalizeNasPath,
	PathsEqual,
	RemoveReproducibleDirs,
	ResolveDeletionTarget,
	RunRobocopy,
} from './nas-backup.mjs';

const tempRoots = [];

function makeTemp(prefix) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempRoots.push(dir);
	return dir;
}

after(() => {
	for (const dir of tempRoots) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function spawnExit(code, signal) {
	return function fakeSpawn() {
		const child = new EventEmitter();
		queueMicrotask(() => child.emit('exit', code, signal));
		return child;
	};
}

describe('NAS path classification', () => {
	it('detects drive roots with mixed separators and trailing slashes', () => {
		assert.equal(IsDriveRoot('Z:\\'), true);
		assert.equal(IsDriveRoot('Z:/'), true);
		assert.equal(IsDriveRoot('z:'), true);
		assert.equal(IsDriveRoot('C:\\Projects'), false);
		assert.equal(IsDriveOrShareRoot('C:\\'), true);
	});

	it('detects UNC share roots but not folders under the share', () => {
		assert.equal(IsUncShareRoot('\\\\nas\\projects'), true);
		assert.equal(IsUncShareRoot('\\\\nas\\projects\\'), true);
		assert.equal(IsUncShareRoot('\\\\nas\\projects\\microPhotoFrame'), false);
		assert.equal(IsDriveOrShareRoot('\\\\nas\\projects'), true);
	});

	it('compares Windows paths case-insensitively with a path boundary', () => {
		assert.equal(PathsEqual('C:\\Projects\\microPhotoFrame', 'c:/projects/microPhotoFrame/'), true);
		assert.equal(IsStrictAncestor('C:\\Projects', 'C:\\Projects\\microPhotoFrame'), true);
		assert.equal(IsStrictAncestor('C:\\Projects\\microPhotoFrame', 'C:\\Projects\\microPhotoFrameBackup'), false);
		assert.equal(IsPathInside('C:\\Projects\\microPhotoFrame\\tmp', 'C:\\Projects\\microPhotoFrame'), true);
	});

	it('normalizes extended-length prefixes', () => {
		assert.equal(NormalizeNasPath('\\\\?\\C:\\Projects\\Foo\\'), 'C:\\Projects\\Foo');
		assert.equal(IsUncShareRoot('\\\\?\\UNC\\nas\\projects'), true);
	});
});

describe('AssertNasDestination', () => {
	it('refuses a missing folder', () => {
		assert.throws(
			() => AssertNasDestination(process.cwd(), path.join(os.tmpdir(), 'microPhotoFrame-nas-missing-' + Date.now())),
			(err) => err.reason === 'missing',
		);
	});

	it('refuses a drive root', () => {
		assert.throws(
			() => AssertNasDestination(process.cwd(), 'C:\\'),
			(err) => err.reason === 'drive-root',
		);
	});

	it('refuses the source folder itself', () => {
		const root = makeTemp('nas-same-');
		assert.throws(
			() => AssertNasDestination(root, root),
			(err) => err.reason === 'same',
		);
	});

	it('refuses an ancestor of the source', () => {
		const parent = makeTemp('nas-anc-');
		const source = path.join(parent, 'project');
		fs.mkdirSync(source);
		assert.throws(
			() => AssertNasDestination(source, parent),
			(err) => err.reason === 'ancestor',
		);
	});

	it('refuses a directory inside the source', () => {
		const source = makeTemp('nas-desc-');
		const dest = path.join(source, 'inside');
		fs.mkdirSync(dest);
		assert.throws(
			() => AssertNasDestination(source, dest),
			(err) => err.reason === 'descendant',
		);
	});

	it('allows a sibling directory with a shared name prefix', () => {
		const parent = makeTemp('nas-sib-');
		const source = path.join(parent, 'microPhotoFrame');
		const dest = path.join(parent, 'microPhotoFrameBackup');
		fs.mkdirSync(source);
		fs.mkdirSync(dest);
		assert.equal(path.resolve(AssertNasDestination(source, dest)), path.resolve(dest));
	});
});

describe('deletion containment', () => {
	it('refuses targets that escape the destination via ..', () => {
		const dest = makeTemp('nas-esc-');
		const outside = makeTemp('nas-out-');
		fs.writeFileSync(path.join(outside, 'keep.txt'), 'safe');
		const escaped = ResolveDeletionTarget(dest, path.join('..', path.basename(outside)));
		assert.equal(escaped.ok, false);
		assert.equal(escaped.reason, 'outside');
		assert.equal(fs.existsSync(path.join(outside, 'keep.txt')), true);
	});

	it('removes leftover node_modules and root lib, but keeps src/libs', () => {
		const dest = makeTemp('nas-rm-');
		fs.mkdirSync(path.join(dest, 'node_modules', 'pkg'), { recursive: true });
		fs.mkdirSync(path.join(dest, 'lib'), { recursive: true });
		fs.mkdirSync(path.join(dest, 'src', 'libs'), { recursive: true });
		fs.writeFileSync(path.join(dest, 'src', 'libs', 'keep.js'), 'keep');
		fs.mkdirSync(path.join(dest, 'firmware', 'backups'), { recursive: true });

		const removed = RemoveReproducibleDirs(dest);
		assert.ok(removed >= 3);
		assert.equal(fs.existsSync(path.join(dest, 'node_modules')), false);
		assert.equal(fs.existsSync(path.join(dest, 'lib')), false);
		assert.equal(fs.existsSync(path.join(dest, 'firmware', 'backups')), false);
		assert.equal(fs.existsSync(path.join(dest, 'src', 'libs', 'keep.js')), true);
		assert.equal(NAS_BACKUP_EXCLUDE_DIR_NAMES.includes('lib'), false);
	});

	it('unlinks a junction without deleting the outside target', { skip: process.platform !== 'win32' }, () => {
		const dest = makeTemp('nas-junc-');
		const outside = makeTemp('nas-junc-out-');
		const marker = path.join(outside, 'outside.txt');
		fs.writeFileSync(marker, 'outside');
		const link = path.join(dest, 'node_modules');
		fs.symlinkSync(outside, link, 'junction');
		const removed = RemoveReproducibleDirs(dest);
		assert.ok(removed >= 1);
		assert.equal(fs.existsSync(link), false);
		assert.equal(fs.existsSync(marker), true);
	});
});

describe('RunRobocopy exit handling', () => {
	it('treats codes 0 through 7 as success', async () => {
		for (const code of [0, 1, 2, 7]) {
			const result = await RunRobocopy(['src', 'dst'], { spawn: spawnExit(code, null) });
			assert.equal(result, code);
		}
	});

	it('treats code 8 and above as failure', async () => {
		await assert.rejects(
			() => RunRobocopy(['src', 'dst'], { spawn: spawnExit(8, null) }),
			/exited with code 8/,
		);
		await assert.rejects(
			() => RunRobocopy(['src', 'dst'], { spawn: spawnExit(16, null) }),
			/exited with code 16/,
		);
	});

	it('treats a missing exit code as an abort', async () => {
		await assert.rejects(
			() => RunRobocopy(['src', 'dst'], { spawn: spawnExit(null, null) }),
			/aborted \(no exit code\)/,
		);
	});

	it('treats a terminating signal as an abort', async () => {
		await assert.rejects(
			() => RunRobocopy(['src', 'dst'], { spawn: spawnExit(null, 'SIGTERM') }),
			/aborted \(SIGTERM\)/,
		);
	});

	it('builds a mirror command that excludes regenerable trees', () => {
		const args = BuildRobocopyArgs('C:\\src', 'Z:\\Projects\\microPhotoFrame');
		assert.equal(args.includes('/MIR'), true);
		assert.equal(args.includes('node_modules'), true);
		assert.equal(args.includes('firmware\\backups'), true);
		assert.equal(args.includes('lib'), true);
		assert.equal(args.includes('ink-encoder\\extensions\\win-preview-handler\\bin'), true);
		assert.equal(args.includes('ink-encoder'), false);
		assert.equal(NAS_BACKUP_EXCLUDE_DIR_NAMES.includes('ink-encoder'), false);
	});
});
