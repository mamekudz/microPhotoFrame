import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseVersion, validateLayout } from './release.mjs';
test('reject inconsistent release versions and tags', () => {
  const r = { main: 1, minor: 2, revision: 0 };
  assert.equal(releaseVersion('1.2.0', r, '1.2.0', 'v1.2.0'), '1.2.0');
  assert.throws(() => releaseVersion('1.1.0', r, '1.2.0'));
  assert.throws(() => releaseVersion('1.2.0', r, '1.2.0', 'v1.2.1'));
  assert.throws(() => releaseVersion('1.2.0', r, '1.1.0'));
});
test('flash layouts cannot silently omit boot files or overwrite offsets', () => {
  assert.throws(() => validateLayout([{ offset: 65536, file: 'firmware.bin' }]));
  assert.throws(() => validateLayout([0, 0, 65536].map(offset => ({ offset, file: 'x.bin' }))));
  assert.equal(validateLayout([0, 32768, 65536].map(offset => ({ offset, file: 'x.bin' }))).length, 3);
});
