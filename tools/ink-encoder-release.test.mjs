import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import {
	AssertStagedInkEncoderPaths,
	GitAddArgs,
	GitCommitArgs,
	INK_ENCODER_GIT_PATHS,
	InkReleaseError,
	NpmPublishArgs,
	ParseFlag,
	ReadInkEncoderPackage,
	ResolveInkEncoderDir,
	SanitizeNpmOtp,
} from './ink-encoder-release.mjs';

const tempRoots = [];

after(() => {
	for (const dir of tempRoots) fs.rmSync(dir, { recursive: true, force: true });
});

describe('ParseFlag', () => {
	it('treats the string false as false', () => {
		assert.equal(ParseFlag('false', true), false);
		assert.equal(ParseFlag('0'), false);
	});
	it('treats true/1/yes as true', () => {
		assert.equal(ParseFlag('true'), true);
		assert.equal(ParseFlag('1'), true);
		assert.equal(ParseFlag('yes'), true);
	});
	it('uses the fallback when empty', () => {
		assert.equal(ParseFlag('', true), true);
		assert.equal(ParseFlag(undefined, false), false);
	});
});

describe('git arguments', () => {
	it('stages only the ink-encoder workspace folder', () => {
		assert.deepEqual(GitAddArgs(), ['add', '--', 'ink-encoder']);
		assert.deepEqual(INK_ENCODER_GIT_PATHS, ['ink-encoder']);
	});
	it('refuses an empty commit message', () => {
		assert.throws(() => GitCommitArgs('  \n'), InkReleaseError);
	});
	it('does not skip hooks or amend and commits only ink-encoder paths', () => {
		const args = GitCommitArgs('Release ink-encoder 2.0.0');
		assert.equal(args.includes('--no-verify'), false);
		assert.equal(args.includes('--amend'), false);
		assert.deepEqual(args, ['commit', '--only', '-m', 'Release ink-encoder 2.0.0', '--', 'ink-encoder']);
	});
	it('rejects staged paths outside ink-encoder/', () => {
		assert.doesNotThrow(() => AssertStagedInkEncoderPaths(['ink-encoder/package.json', 'ink-encoder/src/inkEncoder.mjs']));
		assert.throws(() => AssertStagedInkEncoderPaths(['package.json']), /staged/);
		assert.throws(() => AssertStagedInkEncoderPaths(['../secret']), /staged/);
	});
});

describe('npm publish arguments', () => {
	it('never targets the PhotoFrame root and defaults to public access', () => {
		assert.deepEqual(NpmPublishArgs({ dryRun: true }), ['publish', '--access=public', '--dry-run']);
	});
	it('passes a numeric OTP without logging it', () => {
		assert.deepEqual(
			NpmPublishArgs({ otp: SanitizeNpmOtp('123456') }),
			['publish', '--access=public', '--otp=123456'],
		);
	});
	it('rejects placeholder OTP text', () => {
		assert.throws(() => SanitizeNpmOtp('DEIN_CODE'), /otp/);
	});
});

describe('package location', () => {
	it('resolves ink-encoder inside the repo and checks the package name', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-release-'));
		tempRoots.push(root);
		const dir = path.join(root, 'ink-encoder');
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'ink-encoder', version: '2.0.0' }));
		assert.equal(ResolveInkEncoderDir(root), dir);
		assert.deepEqual(ReadInkEncoderPackage(dir), { name: 'ink-encoder', version: '2.0.0' });
	});
	it('refuses a different package name', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-release-'));
		tempRoots.push(root);
		const dir = path.join(root, 'ink-encoder');
		fs.mkdirSync(dir);
		fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'microphotoframe', version: '1.0.0' }));
		assert.throws(() => ReadInkEncoderPackage(dir), /package/);
	});
});
