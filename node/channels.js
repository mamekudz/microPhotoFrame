'use strict';

/** Kanal = User ID / Group ID / Displaytyp.
 *  Ablage: shows/{userId}/{groupId}/{displayId}/show_*
 *  Der Displaytyp ist nach dem Anlegen unveränderlich. Keine Slugs. */

const fs = require('fs');
const path = require('path');

const SEG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;
const DISPLAY_RE = /^[0-9A-Za-z]$/;
const MIGRATE_USER = 'mamekudz';
const MIGRATE_TARGET = 'family';

function toPathDisplay(id) {
	return normalizeDisplay(id);
}

function toEinkDisplay(id) {
	return normalizeDisplay(id);
}

const DEFAULT_REST_START = 22;
const DEFAULT_REST_END = 6;

function emptyShows() {
	return {
		shows: [],
		dayStart: 7,
		dayEnd: 24,
		activeShows: {},
		channels: {},
		defaultChannel: ''
	};
}

function normalizeRestHour(raw, fallback) {
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 0 || n > 23) return fallback;
	return n;
}

function applyShowRestDefaults(show) {
	if (!show || typeof show !== 'object') return show;
	show.restStart = show.restStart === undefined
		? DEFAULT_REST_START
		: normalizeRestHour(show.restStart, DEFAULT_REST_START);
	show.restEnd = show.restEnd === undefined
		? DEFAULT_REST_END
		: normalizeRestHour(show.restEnd, DEFAULT_REST_END);
	return show;
}

function stripShowRestWindow(show) {
	if (!show || typeof show !== 'object') return show;
	delete show.restActive;
	delete show.nextRestStart;
	delete show.restSleepUntil;
	delete show.tzOffsetMin;
	return show;
}

/** restStart===restEnd → off. Overnight wrap (22–6) is allowed. Hours are server-local. */
function restWindowUnix(restStart, restEnd, nowMs = Date.now()) {
	const start = normalizeRestHour(restStart, DEFAULT_REST_START);
	const end = normalizeRestHour(restEnd, DEFAULT_REST_END);
	if (start === end) {
		return { restActive: false, nextRestStart: 0, restSleepUntil: 0 };
	}
	const now = new Date(nowMs);
	const h = now.getHours();
	const atHour = (dayOffset, hour) => {
		const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0, 0, 0);
		return Math.floor(t.getTime() / 1000);
	};
	let nextRestStart;
	let restSleepUntil;
	if (start > end) {
		if (h >= start) {
			nextRestStart = atHour(0, start);
			restSleepUntil = atHour(1, end);
		} else if (h < end) {
			nextRestStart = atHour(-1, start);
			restSleepUntil = atHour(0, end);
		} else {
			nextRestStart = atHour(0, start);
			restSleepUntil = atHour(1, end);
		}
	} else if (h < start) {
		nextRestStart = atHour(0, start);
		restSleepUntil = atHour(0, end);
	} else if (h < end) {
		nextRestStart = atHour(0, start);
		restSleepUntil = atHour(0, end);
	} else {
		nextRestStart = atHour(1, start);
		restSleepUntil = atHour(1, end);
	}
	const nowSec = Math.floor(nowMs / 1000);
	return {
		restActive: nowSec >= nextRestStart && nowSec < restSleepUntil,
		nextRestStart,
		restSleepUntil
	};
}

function attachShowRestWindow(show, nowMs = Date.now()) {
	if (!show || typeof show !== 'object') return show;
	applyShowRestDefaults(show);
	const win = restWindowUnix(show.restStart, show.restEnd, nowMs);
	show.restActive = win.restActive;
	show.nextRestStart = win.nextRestStart;
	show.restSleepUntil = win.restSleepUntil;
	show.tzOffsetMin = -new Date(nowMs).getTimezoneOffset();
	return show;
}

function normalizeSeg(raw) {
	const s = String(raw == null ? '' : raw).trim();
	return SEG_RE.test(s) ? s : '';
}

function normalizeDisplay(raw) {
	const s = String(raw == null ? '' : raw).trim();
	return DISPLAY_RE.test(s) ? s : '';
}

function inputUserId(input) {
	if (!input || typeof input !== 'object') return normalizeSeg(input);
	return normalizeSeg(input.userId || input.user);
}

function inputGroupId(input) {
	if (!input || typeof input !== 'object') return normalizeSeg(input);
	return normalizeSeg(input.groupId || input.group || input.target);
}

function channelId(user, target, displayId) {
	return `${user}/${target}/${displayId}`;
}

function parseChannelId(id) {
	const parts = String(id || '').replace(/\\/g, '/').split('/').filter(Boolean);
	if (parts.length !== 3) return null;
	const user = normalizeSeg(parts[0]);
	const target = normalizeSeg(parts[1]);
	const rawDisp = normalizeDisplay(parts[2]);
	if (!user || !target || !rawDisp) return null;
	const pathId = toPathDisplay(rawDisp);
	const einkId = toEinkDisplay(pathId);
	return { user, target, displayId: einkId, pathId, id: channelId(user, target, pathId) };
}

function extractChannelFromPath(pathname) {
	const m = String(pathname || '').match(
		/\/(?:shows|c)\/([A-Za-z0-9][A-Za-z0-9_-]{0,31})\/([A-Za-z0-9][A-Za-z0-9_-]{0,31})\/([0-9A-Za-z])(?:\/|$)/
	);
	if (!m) return '';
	const parsed = parseChannelId(channelId(m[1], m[2], m[3]));
	return parsed ? parsed.id : '';
}

function extractChannelFromQuery(raw) {
	try {
		raw = decodeURIComponent(String(raw || ''));
	} catch (_) { /* keep raw */ }
	const parsed = parseChannelId(raw);
	return parsed ? parsed.id : '';
}

function isLegacyShowDir(name) {
	return String(name || '').startsWith('show_');
}

function isReservedTop(name) {
	return name === 'shows.json' || name === 'devices.json' || name === '.gitkeep' || String(name || '').startsWith('.');
}

function safeShowDirName(name) {
	return 'show_' + String(name || '').replace(/[^a-zA-Z0-9\-_]/g, '_');
}

function showNameFromDir(dir) {
	return String(dir || '').startsWith('show_') ? dir.slice(5) : dir;
}

function readJSON(p) {
	try {
		if (!fs.existsSync(p)) return null;
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	} catch (_) {
		return null;
	}
}

function writeJSON(p, data) {
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, JSON.stringify(data), 'utf8');
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, ent.name);
		const d = path.join(dest, ent.name);
		if (ent.isDirectory()) copyDir(s, d);
		else fs.copyFileSync(s, d);
	}
}

function pruneEmpty(dir) {
	try {
		if (!fs.existsSync(dir)) return;
		if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
	} catch (_) { /* ignore */ }
}

function channelDir(showsDir, ch) {
	const pathId = ch.pathId || toPathDisplay(ch.displayId);
	return path.join(showsDir, ch.user, ch.target, pathId);
}

function listShowNames(dir) {
	if (!dir || !fs.existsSync(dir)) return [];
	return fs.readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name.startsWith('show_'))
		.map((e) => {
			const show = readJSON(path.join(dir, e.name, 'show.json'));
			return (show && show.name) || showNameFromDir(e.name);
		});
}

function scanChannels(showsDir) {
	const channels = {};
	if (!showsDir || !fs.existsSync(showsDir)) return channels;
	for (const userEnt of fs.readdirSync(showsDir, { withFileTypes: true })) {
		if (!userEnt.isDirectory() || isReservedTop(userEnt.name) || isLegacyShowDir(userEnt.name)) continue;
		const user = normalizeSeg(userEnt.name);
		if (!user) continue;
		const userDir = path.join(showsDir, userEnt.name);
		for (const targetEnt of fs.readdirSync(userDir, { withFileTypes: true })) {
			if (!targetEnt.isDirectory()) continue;
			const target = normalizeSeg(targetEnt.name);
			if (!target) continue;
			const targetDir = path.join(userDir, targetEnt.name);
			for (const dispEnt of fs.readdirSync(targetDir, { withFileTypes: true })) {
				if (!dispEnt.isDirectory()) continue;
				const pathId = normalizeDisplay(dispEnt.name);
				if (!pathId) continue;
				const einkId = toEinkDisplay(pathId);
				const id = channelId(user, target, pathId);
				const dir = path.join(targetDir, dispEnt.name);
				const local = readJSON(path.join(dir, 'channel.json')) || {};
				const names = listShowNames(dir);
				let showName = local.showName || local.activeShow || '';
				if (showName && !names.includes(showName)) showName = '';
				channels[id] = {
					user, userId: user,
					target, group: target, groupId: target,
					displayId: einkId, pathId, showName, shows: names
				};
			}
		}
	}
	return channels;
}

function displayIdsMatch(a, b) {
	const ea = toEinkDisplay(a);
	const eb = toEinkDisplay(b);
	return !!(ea && eb && ea === eb);
}

function aliasChannelForDevice(channel) {
	return channel;
}

function syncActiveShows(cfg) {
	const active = {};
	for (const id of Object.keys(cfg.channels || {})) {
		const ch = cfg.channels[id];
		if (ch && ch.displayId && ch.showName) active[ch.displayId] = ch.showName;
	}
	cfg.activeShows = active;
	return cfg;
}

function withShowsFor(cfg, id) {
	const ch = cfg.channels && cfg.channels[id];
	return Object.assign({}, cfg, { shows: (ch && ch.shows) || [] });
}

function refreshFromDisk(showsDir, cfg) {
	const next = (!cfg || typeof cfg !== 'object') ? emptyShows() : cfg;
	if (typeof next.dayStart !== 'number') next.dayStart = 7;
	if (typeof next.dayEnd !== 'number') next.dayEnd = 24;
	next.channels = scanChannels(showsDir);
	const ids = Object.keys(next.channels);
	if (!next.defaultChannel || !next.channels[next.defaultChannel]) {
		next.defaultChannel = ids[0] || '';
	}
	const def = next.channels[next.defaultChannel];
	next.shows = def ? (def.shows || []) : [];
	return syncActiveShows(next);
}

function migrateLegacyShows(showsDir, cfg) {
	const base = (!cfg || typeof cfg !== 'object') ? emptyShows() : cfg;
	if (!showsDir || !fs.existsSync(showsDir)) return refreshFromDisk(showsDir, base);
	const oldActive = (base.activeShows && typeof base.activeShows === 'object') ? base.activeShows : {};
	let copied = false;
	for (const ent of fs.readdirSync(showsDir, { withFileTypes: true })) {
		if (!ent.isDirectory() || !isLegacyShowDir(ent.name)) continue;
		const src = path.join(showsDir, ent.name);
		const show = readJSON(path.join(src, 'show.json'));
		if (!show || !show.displayId) continue;
		const einkId = normalizeDisplay(show.displayId);
		if (!einkId) continue;
		const pathId = toPathDisplay(einkId);
		const destDir = path.join(showsDir, MIGRATE_USER, MIGRATE_TARGET, pathId, ent.name);
		if (!fs.existsSync(destDir)) {
			copyDir(src, destDir);
			copied = true;
		}
		if (fs.existsSync(destDir) && src !== destDir) {
			fs.rmSync(src, { recursive: true, force: true });
		}
		const showName = show.name || showNameFromDir(ent.name);
		const chJsonPath = path.join(showsDir, MIGRATE_USER, MIGRATE_TARGET, pathId, 'channel.json');
		const chJson = readJSON(chJsonPath) || {};
		if (oldActive[einkId] === showName || oldActive[einkId] === show.name) {
			chJson.showName = showName;
			writeJSON(chJsonPath, chJson);
		} else if (!chJson.showName) {
			chJson.showName = showName;
			writeJSON(chJsonPath, chJson);
		}
	}
	renameEinkFoldersToPathIds(showsDir);
	const next = refreshFromDisk(showsDir, base);
	const oldDefaultIsSlug = base.defaultChannel && !String(base.defaultChannel).includes('/');
	if (copied || oldDefaultIsSlug) {
		const preferred = channelId(MIGRATE_USER, MIGRATE_TARGET, '9');
		if (next.channels[preferred]) next.defaultChannel = preferred;
		else if (next.channels[next.defaultChannel] == null) {
			next.defaultChannel = Object.keys(next.channels)[0] || '';
		}
	}
	return next;
}

function migrateShows(shows, showsDir) {
	const cfg = (!shows || typeof shows !== 'object') ? emptyShows() : shows;
	if (!Array.isArray(cfg.shows)) cfg.shows = [];
	if (!cfg.activeShows || typeof cfg.activeShows !== 'object' || Array.isArray(cfg.activeShows)) {
		cfg.activeShows = {};
	}
	if (!cfg.channels || typeof cfg.channels !== 'object' || Array.isArray(cfg.channels)) {
		cfg.channels = {};
	}
	if (!showsDir) {
		const slugs = Object.keys(cfg.channels);
		if (!cfg.defaultChannel || !cfg.channels[cfg.defaultChannel]) {
			cfg.defaultChannel = slugs[0] || '';
		}
		return syncActiveShows(cfg);
	}
	return migrateLegacyShows(showsDir, cfg);
}

function channelIdForDeviceDisplay(shows, displayId) {
	const eink = toEinkDisplay(normalizeDisplay(displayId));
	if (!eink || !shows || !shows.channels) return '';
	const ids = Object.keys(shows.channels);
	const match = (id) => shows.channels[id] && shows.channels[id].displayId === eink;
	const def = shows.defaultChannel;
	if (def && match(def)) return def;
	const withShow = ids.find((id) => match(id) && shows.channels[id].showName);
	if (withShow) return withShow;
	return ids.find(match) || '';
}

function resolveChannel(shows, requestedId, deviceDisplayId) {
	const parsed = parseChannelId(requestedId);
	if (parsed) {
		if (shows.channels && shows.channels[parsed.id]) {
			return {
				shows: withShowsFor(shows, parsed.id),
				channel: aliasChannelForDevice(
					Object.assign({ slug: parsed.id }, shows.channels[parsed.id]),
					deviceDisplayId
				),
				channelError: null
			};
		}
		return { shows, channel: null, channelError: 'unknown' };
	}
	if (!requestedId) {
		const id = channelIdForDeviceDisplay(shows, deviceDisplayId) || shows.defaultChannel;
		if (id && shows.channels && shows.channels[id]) {
			return {
				shows: withShowsFor(shows, id),
				channel: aliasChannelForDevice(
					Object.assign({ slug: id }, shows.channels[id]),
					deviceDisplayId
				),
				channelError: null
			};
		}
		return { shows, channel: null, channelError: 'no_default' };
	}
	return { shows, channel: null, channelError: 'unknown' };
}

function renameEinkFoldersToPathIds(showsDir) {
	if (!showsDir || !fs.existsSync(showsDir)) return;
	for (const userEnt of fs.readdirSync(showsDir, { withFileTypes: true })) {
		if (!userEnt.isDirectory() || isReservedTop(userEnt.name) || isLegacyShowDir(userEnt.name)) continue;
		const userDir = path.join(showsDir, userEnt.name);
		for (const targetEnt of fs.readdirSync(userDir, { withFileTypes: true })) {
			if (!targetEnt.isDirectory()) continue;
			const targetDir = path.join(userDir, targetEnt.name);
			for (const dispEnt of fs.readdirSync(targetDir, { withFileTypes: true })) {
				if (!dispEnt.isDirectory()) continue;
				const pathId = toPathDisplay(dispEnt.name);
				if (pathId === dispEnt.name) continue;
				const from = path.join(targetDir, dispEnt.name);
				const to = path.join(targetDir, pathId);
				if (!fs.existsSync(to)) fs.renameSync(from, to);
				else {
					copyDir(from, to);
					fs.rmSync(from, { recursive: true, force: true });
				}
			}
		}
	}
}

function createChannel(showsDir, shows, input = {}) {
	const u = inputUserId(input);
	const t = inputGroupId(input);
	const d = toPathDisplay(input.displayId);
	if (!u) throw new Error('User ID fehlt.');
	if (!t) throw new Error('Group ID fehlt.');
	if (!d) throw new Error('Displaytyp fehlt.');
	const dir = path.join(showsDir, u, t, d);
	if (fs.existsSync(dir) && (fs.existsSync(path.join(dir, 'channel.json')) || listShowNames(dir).length)) {
		throw new Error('Kanal existiert bereits.');
	}
	fs.mkdirSync(dir, { recursive: true });
	writeJSON(path.join(dir, 'channel.json'), { showName: '' });
	const next = refreshFromDisk(showsDir, shows);
	if (!next.defaultChannel) next.defaultChannel = channelId(u, t, d);
	return next;
}

function deleteChannel(showsDir, shows, input = {}) {
	const u = inputUserId(input);
	const g = inputGroupId(input);
	const parsed = parseChannelId(input.channel) || parseChannelId(
		u && g && input.displayId
			? channelId(u, g, input.displayId)
			: ''
	);
	if (!parsed) throw new Error('Kanal nicht gefunden.');
	const dir = channelDir(showsDir, parsed);
	if (!fs.existsSync(dir)) throw new Error('Kanal nicht gefunden.');
	fs.rmSync(dir, { recursive: true, force: true });
	pruneEmpty(path.join(showsDir, parsed.user, parsed.target));
	pruneEmpty(path.join(showsDir, parsed.user));
	return refreshFromDisk(showsDir, shows);
}

function deleteTarget(showsDir, shows, input = {}) {
	const u = inputUserId(input);
	const t = inputGroupId(input);
	if (!u || !t) throw new Error('Group ID fehlt.');
	const dir = path.join(showsDir, u, t);
	if (!fs.existsSync(dir)) throw new Error('Gruppe nicht gefunden.');
	fs.rmSync(dir, { recursive: true, force: true });
	pruneEmpty(path.join(showsDir, u));
	return refreshFromDisk(showsDir, shows);
}

function deleteUser(showsDir, shows, input = {}) {
	const u = inputUserId(input);
	if (!u || isLegacyShowDir(u) || isReservedTop(u)) throw new Error('User ID nicht gefunden.');
	const dir = path.join(showsDir, u);
	if (!fs.existsSync(dir)) throw new Error('User ID nicht gefunden.');
	fs.rmSync(dir, { recursive: true, force: true });
	return refreshFromDisk(showsDir, shows);
}

function listTargetsForUserDisplay(shows, user, displayId) {
	const u = normalizeSeg(user);
	const eink = toEinkDisplay(normalizeDisplay(displayId));
	if (!u || !eink) return [];
	const out = [];
	for (const id of Object.keys(shows.channels || {})) {
		const ch = shows.channels[id];
		if (!ch || (ch.userId || ch.user) !== u || ch.displayId !== eink) continue;
		const group = ch.groupId || ch.group || ch.target;
		out.push({
			group,
			groupId: group,
			target: group,
			user: u,
			userId: u,
			channel: id,
			pathId: ch.pathId || toPathDisplay(eink),
			displayId: ch.displayId,
			showName: ch.showName || '',
			shows: Array.isArray(ch.shows) ? ch.shows.length : 0
		});
	}
	return out;
}

function setDefaultChannel(showsDir, shows, { channel } = {}) {
	const next = refreshFromDisk(showsDir, shows);
	const parsed = parseChannelId(channel);
	if (!parsed || !next.channels[parsed.id]) throw new Error('Kanal nicht gefunden.');
	next.defaultChannel = parsed.id;
	return next;
}

function setActiveShow(showsDir, shows, { channel, showName } = {}) {
	const parsed = parseChannelId(channel);
	if (!parsed) throw new Error('Kanal fehlt.');
	if (!showName) throw new Error('showName fehlt.');
	const dir = channelDir(showsDir, parsed);
	const names = listShowNames(dir);
	if (!names.includes(showName)) throw new Error('Show gehört nicht zu diesem Kanal.');
	writeJSON(path.join(dir, 'channel.json'), { showName });
	return refreshFromDisk(showsDir, shows);
}

function findShow(showsDir, showName, channelHint) {
	if (!showName) return null;
	const safe = safeShowDirName(showName);
	if (channelHint) {
		const parsed = parseChannelId(channelHint);
		if (parsed) {
			const dir = path.join(channelDir(showsDir, parsed), safe);
			if (fs.existsSync(path.join(dir, 'show.json'))) {
				return { dir, channel: parsed.id, displayId: parsed.displayId, relDir: `${parsed.id}/${safe}` };
			}
		}
	}
	const channels = scanChannels(showsDir);
	for (const id of Object.keys(channels)) {
		const ch = parseChannelId(id);
		const dir = path.join(channelDir(showsDir, ch), safe);
		if (fs.existsSync(path.join(dir, 'show.json'))) {
			return { dir, channel: id, displayId: ch.displayId, relDir: `${id}/${safe}` };
		}
	}
	const legacy = path.join(showsDir, safe);
	if (fs.existsSync(path.join(legacy, 'show.json'))) {
		return { dir: legacy, channel: '', displayId: '', relDir: safe };
	}
	return null;
}

function createShow(showsDir, shows, { showName, channel } = {}) {
	if (!showName) throw new Error('showName fehlt.');
	const parsed = parseChannelId(channel);
	if (!parsed) throw new Error('Kanal fehlt — zuerst einen Kanal anlegen.');
	const dir = channelDir(showsDir, parsed);
	if (!fs.existsSync(dir)) throw new Error('Kanal nicht gefunden.');
	const safe = safeShowDirName(showName);
	const showDir = path.join(dir, safe);
	if (fs.existsSync(showDir)) throw new Error('Show existiert bereits.');
	fs.mkdirSync(showDir, { recursive: true });
	writeJSON(path.join(showDir, 'show.json'), {
		name: showName,
		imgs: [],
		timer: 1,
		mode: 'random',
		restStart: DEFAULT_REST_START,
		restEnd: DEFAULT_REST_END,
		displayId: parsed.displayId
	});
	return refreshFromDisk(showsDir, shows);
}

function deleteShow(showsDir, shows, { showName, channel } = {}) {
	const found = findShow(showsDir, showName, channel);
	if (!found) throw new Error('Show nicht gefunden.');
	fs.rmSync(found.dir, { recursive: true, force: true });
	if (found.channel) {
		const parsed = parseChannelId(found.channel);
		const chDir = channelDir(showsDir, parsed);
		const chJson = readJSON(path.join(chDir, 'channel.json')) || {};
		if (chJson.showName === showName) {
			const names = listShowNames(chDir);
			writeJSON(path.join(chDir, 'channel.json'), { showName: names[0] || '' });
		}
	}
	return refreshFromDisk(showsDir, shows);
}

module.exports = {
	SEG_RE,
	DISPLAY_RE,
	MIGRATE_USER,
	MIGRATE_TARGET,
	toPathDisplay,
	toEinkDisplay,
	emptyShows,
	normalizeSeg,
	normalizeDisplay,
	inputUserId,
	inputGroupId,
	channelId,
	parseChannelId,
	extractChannelFromPath,
	extractChannelFromQuery,
	extractSlugFromPath: extractChannelFromPath,
	normalizeSlug: extractChannelFromQuery,
	safeShowDirName,
	channelDir,
	listShowNames,
	scanChannels,
	refreshFromDisk,
	migrateLegacyShows,
	migrateShows,
	resolveChannel,
	channelIdForDeviceDisplay,
	displayIdsMatch,
	aliasChannelForDevice,
	listTargetsForUserDisplay,
	createChannel,
	deleteChannel,
	deleteTarget,
	deleteUser,
	setDefaultChannel,
	setActiveShow,
	findShow,
	createShow,
	deleteShow,
	syncActiveShows,
	DEFAULT_REST_START,
	DEFAULT_REST_END,
	normalizeRestHour,
	applyShowRestDefaults,
	stripShowRestWindow,
	restWindowUnix,
	attachShowRestWindow
};
