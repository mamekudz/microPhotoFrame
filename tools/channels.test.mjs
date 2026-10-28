import { createRequire } from 'module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ch = require('../node/channels.js');

function tmpShows() {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'mpf-ch-'));
}

function writeShow(dir, name, displayId) {
	const showDir = path.join(dir, ch.safeShowDirName(name));
	fs.mkdirSync(showDir, { recursive: true });
	fs.writeFileSync(path.join(showDir, 'show.json'), JSON.stringify({
		name, displayId, imgs: [], timer: 1, mode: 'random'
	}));
}

test('does not invent channels from show names', () => {
	const dir = tmpShows();
	const cfg = ch.migrateShows({
		shows: ['vacation', 'kids'],
		activeShows: { I: 'vacation' }
	}, dir);
	assert.deepEqual(cfg.channels, {});
	assert.equal(cfg.defaultChannel, '');
});

test('channel id is user/target/display, no slug', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	assert.ok(cfg.channels['mamekudz/family/9']);
	assert.equal(cfg.channels['mamekudz/family/9'].displayId, '9');
	assert.equal(cfg.channels['mamekudz/family/9'].pathId, '9');
	assert.equal(cfg.defaultChannel, 'mamekudz/family/9');
	assert.throws(
		() => ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'family', displayId: '9' }),
		/existiert/
	);
});

test('root URL uses the default channel; unknown path is not intended', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'desk', displayId: 'f' });
	writeShow(path.join(dir, 'mamekudz', 'family', '9'), 'vacation', '9');
	cfg = ch.setActiveShow(dir, cfg, { channel: 'mamekudz/family/9', showName: 'vacation' });
	cfg = ch.setDefaultChannel(dir, cfg, { channel: 'mamekudz/family/9' });
	const root = ch.resolveChannel(cfg, '');
	assert.equal(root.channel.slug, 'mamekudz/family/9');
	assert.equal(root.channel.showName, 'vacation');
	assert.equal(root.channelError, null);
	const miss = ch.resolveChannel(cfg, 'mamekudz/attic/9');
	assert.equal(miss.channel, null);
	assert.equal(miss.channelError, 'unknown');
});

test('root URL with device display picks a matching channel, else default', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'desk', displayId: 'f' });
	writeShow(path.join(dir, 'mamekudz', 'family', '9'), 'vacation', '9');
	writeShow(path.join(dir, 'mamekudz', 'desk', 'f'), 'mini', 'f');
	cfg = ch.setActiveShow(dir, cfg, { channel: 'mamekudz/family/9', showName: 'vacation' });
	cfg = ch.setActiveShow(dir, cfg, { channel: 'mamekudz/desk/f', showName: 'mini' });
	cfg = ch.setDefaultChannel(dir, cfg, { channel: 'mamekudz/family/9' });
	const web = ch.resolveChannel(cfg, '');
	assert.equal(web.channel.slug, 'mamekudz/family/9');
	const waveshare = ch.resolveChannel(cfg, '', 'f');
	assert.equal(waveshare.channel.slug, 'mamekudz/desk/f');
	assert.equal(waveshare.channel.showName, 'mini');
	const spectra = ch.resolveChannel(cfg, '', '9');
	assert.equal(spectra.channel.slug, 'mamekudz/family/9');
	assert.equal(spectra.channel.displayId, '9');
	assert.equal(ch.displayIdsMatch('9', 'I'), false);
	assert.equal(cfg.activeShows.I, undefined);
	assert.equal(cfg.activeShows['9'], 'vacation');
	assert.equal(cfg.activeShows.f, 'mini');
});

test('show must be created inside a channel and cannot change display', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	assert.throws(() => ch.createShow(dir, cfg, { showName: 'album' }), /Kanal fehlt/);
	cfg = ch.createShow(dir, cfg, { showName: 'album', channel: 'mamekudz/family/9' });
	assert.equal(cfg.channels['mamekudz/family/9'].showName, '');
	const found = ch.findShow(dir, 'album', 'mamekudz/family/9');
	assert.ok(found);
	assert.equal(found.displayId, '9');
	const show = JSON.parse(fs.readFileSync(path.join(found.dir, 'show.json'), 'utf8'));
	assert.equal(show.displayId, '9');
	assert.equal(show.restStart, 22);
	assert.equal(show.restEnd, 6);
});

test('rest window 22-6 wraps overnight and same hour disables rest', () => {
	const local = (y, m, d, h) => new Date(y, m, d, h, 0, 0, 0).getTime();
	const evening = local(2026, 5, 15, 23);
	const night = local(2026, 5, 16, 3);
	const morning = local(2026, 5, 16, 6);
	const day = local(2026, 5, 16, 10);
	const eveOff = ch.restWindowUnix(22, 6, evening);
	assert.equal(eveOff.restActive, true);
	assert.ok(eveOff.restSleepUntil > eveOff.nextRestStart);
	const nightWin = ch.restWindowUnix(22, 6, night);
	assert.equal(nightWin.restActive, true);
	const morningWin = ch.restWindowUnix(22, 6, morning);
	assert.equal(morningWin.restActive, false);
	const dayWin = ch.restWindowUnix(22, 6, day);
	assert.equal(dayWin.restActive, false);
	assert.equal(ch.restWindowUnix(8, 8, day).restActive, false);
	assert.equal(ch.restWindowUnix(8, 8, day).nextRestStart, 0);
	const afternoon = ch.restWindowUnix(13, 17, local(2026, 5, 16, 14));
	assert.equal(afternoon.restActive, true);
});

test('same show name in two channels is found via the channel hint', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'family', displayId: 'f' });
	cfg = ch.createShow(dir, cfg, { showName: 'hochzeiten', channel: 'mamekudz/family/9' });
	cfg = ch.createShow(dir, cfg, { showName: 'hochzeiten', channel: 'mamekudz/family/f' });
	const spectra = ch.findShow(dir, 'hochzeiten', 'mamekudz/family/9');
	const wave = ch.findShow(dir, 'hochzeiten', 'mamekudz/family/f');
	assert.ok(spectra);
	assert.ok(wave);
	assert.equal(spectra.displayId, '9');
	assert.equal(wave.displayId, 'f');
	assert.notEqual(spectra.dir, wave.dir);
	const first = ch.findShow(dir, 'hochzeiten', '');
	assert.ok(first);
});

test('activate only accepts a show that lives in the channel', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'desk', displayId: 'f' });
	cfg = ch.createShow(dir, cfg, { showName: 'wide', channel: 'mamekudz/family/9' });
	assert.throws(
		() => ch.setActiveShow(dir, cfg, { channel: 'mamekudz/desk/f', showName: 'wide' }),
		/gehört nicht/
	);
	cfg = ch.setActiveShow(dir, cfg, { channel: 'mamekudz/family/9', showName: 'wide' });
	assert.equal(cfg.channels['mamekudz/family/9'].showName, 'wide');
});

test('deleting a target removes all its channels', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'family', displayId: 'f' });
	cfg = ch.deleteTarget(dir, cfg, { user: 'mamekudz', target: 'family' });
	assert.deepEqual(cfg.channels, {});
});

test('legacy shows are copied into user/family/{displayId}', () => {
	const dir = tmpShows();
	writeShow(dir, 'Kids', '9');
	writeShow(dir, 'mini', 'f');
	const cfg = ch.migrateLegacyShows(dir, { activeShows: { '9': 'Kids' } });
	assert.ok(cfg.channels['user/family/9']);
	assert.ok(cfg.channels['user/family/f']);
	assert.equal(cfg.channels['user/family/9'].showName, 'Kids');
	assert.ok(fs.existsSync(path.join(dir, 'user', 'family', '9', 'show_Kids', 'show.json')));
	assert.equal(fs.existsSync(path.join(dir, 'show_Kids', 'show.json')), false);
});

test('listTargets returns only frames for that user and display', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createChannel(dir, cfg, { user: 'mamekudz', target: 'desk', displayId: 'f' });
	cfg = ch.createChannel(dir, cfg, { user: 'other', target: 'hall', displayId: 'f' });
	const waveshare = ch.listTargetsForUserDisplay(cfg, 'mamekudz', 'f');
	assert.equal(waveshare.length, 1);
	assert.equal(waveshare[0].target, 'desk');
	assert.equal(waveshare[0].group, 'desk');
	assert.equal(waveshare[0].groupId, 'desk');
	assert.equal(waveshare[0].channel, 'mamekudz/desk/f');
	const spectra = ch.listTargetsForUserDisplay(cfg, 'mamekudz', '9');
	assert.equal(spectra.length, 1);
	assert.equal(spectra[0].groupId, 'family');
	assert.equal(ch.listTargetsForUserDisplay(cfg, 'mamekudz', 'I').length, 0);
});

test('activeShows stores one key per display', () => {
	const dir = tmpShows();
	let cfg = ch.createChannel(dir, ch.emptyShows(), { user: 'mamekudz', target: 'family', displayId: '9' });
	cfg = ch.createShow(dir, cfg, { showName: 'Kids', channel: 'mamekudz/family/9' });
	cfg = ch.setActiveShow(dir, cfg, { channel: 'mamekudz/family/9', showName: 'Kids' });
	assert.equal(cfg.activeShows['9'], 'Kids');
	assert.equal(cfg.activeShows.I, undefined);
});

test('createChannel accepts userId and groupId', () => {
	const dir = tmpShows();
	const cfg = ch.createChannel(dir, ch.emptyShows(), { userId: 'anna', groupId: 'kitchen', displayId: 'f' });
	assert.ok(cfg.channels['anna/kitchen/f']);
	assert.equal(cfg.channels['anna/kitchen/f'].userId, 'anna');
	assert.equal(cfg.channels['anna/kitchen/f'].groupId, 'kitchen');
});

test('extracts user/target/display from a path', () => {
	assert.equal(ch.extractChannelFromPath('/shows/mamekudz/family/9'), 'mamekudz/family/9');
	assert.equal(ch.extractChannelFromPath('/shows/mamekudz/family/9/show_Kids'), 'mamekudz/family/9');
	assert.equal(ch.extractChannelFromPath('/c/mamekudz/family/9'), 'mamekudz/family/9');
	assert.equal(ch.extractChannelFromPath('/c/wohnzimmer'), '');
	assert.equal(ch.extractChannelFromQuery('mamekudz/family/9'), 'mamekudz/family/9');
});
