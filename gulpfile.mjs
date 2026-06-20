// ===============================================================
// µPhotoFrame™ - Build & Installer Gulp Script
// © 2026 Meinolf Amekudzi (MIT License)
// ===============================================================

import gulp from 'gulp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cp from 'child_process';
import clean from 'gulp-clean';
import merge2 from 'merge2';
import zip from 'gulp-zip';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
import prompt from 'gulp-prompt';
import glob from 'fast-glob';
import pngToIco from 'png-to-ico';
import { fetchInstallerRedistributables } from './tools/installer-redistributables.mjs';

// Gulp-Tasks-Panel (u. a. nickdodd79/vscode-gulptasks) setzt bei lokalem Gulp --cwd auf
// node_modules/.bin — dann wären ./package.json und alle gulp.src-Pfade falsch.
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
process.chdir(PROJECT_ROOT);

const RELEASES_JSON = path.join(PROJECT_ROOT, 'releases.json');

/** Semver-String (x.y.z[-beta]) aus releases.json; letztes Array-Element = aktuelle Version. */
function _readVersionFromReleases() {
	if (!fs.existsSync(RELEASES_JSON)) return null;
	let data;
	try {
		data = JSON.parse(fs.readFileSync(RELEASES_JSON, 'utf8'));
	} catch (e) {
		console.warn('releases.json: ' + e.message + ' — fallback package.json');
		return null;
	}
	const entry = Array.isArray(data) ? data[data.length - 1] : data;
	if (!entry || typeof entry.main !== 'number') return null;
	const minor = typeof entry.minor === 'number' ? entry.minor : 0;
	const revision = typeof entry.revision === 'number' ? entry.revision : 0;
	let semver = `${entry.main}.${minor}.${revision}`;
	if (entry.beta === true) semver += '-beta';
	return semver;
}

/** Vier Zahlen für Windows VIProductVersion (z. B. 1.0.0.0). */
function _semverToWinFourPart(semver) {
	const core = String(semver).split('-')[0];
	const parts = core.split('.').map((p) => {
		const n = parseInt(p, 10);
		return Number.isFinite(n) ? n : 0;
	});
	while (parts.length < 4) parts.push(0);
	return parts.slice(0, 4).join('.');
}

// ==============================================
// CONSTANTS
// ==============================================

const PROJECT_NAME = 'microPhotoFrame';
const PKG_VERSION = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version || '1.0.0';
const VERSION = _readVersionFromReleases() ?? PKG_VERSION;
const VERSION_WIN = _semverToWinFourPart(VERSION);

const SERVER_TYPES = {
	node:   { label: 'Node.js Express (Port 891)',  id: 'node' },
	iis:    { label: 'IIS / ASP.NET (Port 888)',    id: 'iis' },
	apache: { label: 'Apache + PHP (Port 889)',     id: 'apache' },
	nginx:  { label: 'Nginx + PHP (Port 890)',      id: 'nginx' }
};

const DIST_DIR = './dist';
const INSTALLERS_DIR = './installers';
const TMP_DIR = './tmp';

// ==============================================
// LOGGING
// ==============================================

const C = {
	reset:   '\x1b[0m',
	red:     '\x1b[31m',
	green:   '\x1b[32m',
	yellow:  '\x1b[33m',
	cyan:    '\x1b[36m',
	bgGreen: '\x1b[42m',
	blink:   '\x1b[5m'
};

const ErrLog     = (t) => console.error(`${C.red}${C.blink} ERROR ${C.reset} ${C.red}${t}${C.reset}`);
const ResultLog  = (t) => console.log(`${C.green} OK ${C.reset} ${t}`);
const SectionLog = (t) => console.log(`${C.yellow}${C.bgGreen} ${t} ${C.reset}`);
const Log        = (t) => console.log(`${C.reset}${t}`);

// ==============================================
// UTILITIES
// ==============================================

function _ensureDir(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** NSIS: kein eingechecktes NSISBI — systemweites makensis (PATH / MAKENSIS / NSISDIR). */
function _resolveMakensis() {
	const fromEnv = process.env.MAKENSIS || process.env.NSIS_MAKENSIS || '';
	if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
	const nsisdir = process.env.NSISDIR;
	if (nsisdir) {
		const p = path.join(nsisdir, 'makensis.exe');
		if (fs.existsSync(p)) return p;
	}
	const candidates = [
		'C:\\Program Files (x86)\\NSIS\\makensis.exe',
		'C:\\Program Files\\NSIS\\makensis.exe'
	];
	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}
	try {
		const out = cp.execSync('where makensis', { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore'] });
		const line = out.trim().split(/\r?\n/)[0];
		if (line && fs.existsSync(line)) return line.trim();
	} catch {
		/* where fehlgeschlagen */
	}
	return null;
}

function _RunSeries(...tasks) {
	return new Promise((resolve, reject) => {
		gulp.series(...tasks)((err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

function _spawn(cmd, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = cp.spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
		child.on('close', (code) => {
			if (code !== 0) reject(new Error(`${cmd} exited with code ${code}`));
			else resolve();
		});
		child.on('error', reject);
	});
}

function _killSerialMonitors() {
	return new Promise((resolve) => {
		if (process.platform === 'win32') {
			cp.exec('taskkill /F /IM python.exe /T 2>nul', () => setTimeout(resolve, 500));
		} else {
			cp.exec('pkill -f "pio.*monitor" 2>/dev/null', () => setTimeout(resolve, 500));
		}
	});
}

// ==============================================
// COMMON FILE GLOBS (SPA frontend + shared)
// ==============================================

const COMMON_GLOBS = [
	'index.html',
	'favicon.ico',
	'welcome2microPhotoFrame.html',
	'welcome2microPhotoFrame_config.js',
	'config.json',
	'src/**/*',
	'assets/**/*',
	'readyToGoShows/**/*',
	'LICENSE',
	'README.md',
	'INSTALLATION.md'
];

const SERVER_GLOBS = {
	node: [
		'node/server.js',
		'node/package.json'
	],
	iis: [
		'web.config',
		'aspx/microPhotoFrame.aspx',
		'aspx/microPhotoFrame.cs'
	],
	apache: [
		'.htaccess',
		'php/**/*',
		'apache/httpd-microPhotoFrame.conf',
		'apache/START_APACHE.bat',
		'apache/STOP_APACHE.bat',
		'apache/ENABLE_MOD_REWRITE.bat',
		'apache/ENABLE_MOD_REWRITE.md'
	],
	nginx: [
		'php/**/*',
		'nginx/microPhotoFrame.conf',
		'nginx/START_NGINX.bat',
		'nginx/STOP_NGINX.bat',
		'nginx/START_PHP_CGI.bat',
		'nginx/STOP_PHP_CGI.bat',
		'nginx/RELOAD_NGINX.bat',
		'nginx/CHECK_NGINX.bat'
	]
};

// ==============================================
// CLEAN
// ==============================================

function _cleanDist() {
	if (!fs.existsSync(DIST_DIR)) return Promise.resolve();
	return gulp.src(DIST_DIR, { read: false, allowEmpty: true }).pipe(clean({ force: true }));
}

// ==============================================
// SERVER PACKAGE BUILDERS
// ==============================================

function _buildServerPackage(serverType) {
	SectionLog(`Building ${SERVER_TYPES[serverType].label} package...`);
	_ensureDir(DIST_DIR);

	const allGlobs = [...COMMON_GLOBS, ...SERVER_GLOBS[serverType]];
	const zipName = `${PROJECT_NAME}_${serverType}_v${VERSION}.zip`;

	return gulp.src(allGlobs, { base: '.', dot: true, allowEmpty: true, encoding: false })
		.pipe(zip(zipName))
		.pipe(gulp.dest(DIST_DIR));
}

function _buildNodePackage(cb)   { return _buildServerPackage('node'); }
function _buildIISPackage(cb)    { return _buildServerPackage('iis'); }
function _buildApachePackage(cb) { return _buildServerPackage('apache'); }
function _buildNginxPackage(cb)  { return _buildServerPackage('nginx'); }

function _buildAllDone(cb) {
	ResultLog(`All server packages created in ${DIST_DIR}/`);
	const files = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.zip'));
	files.forEach(f => {
		const size = (fs.statSync(path.join(DIST_DIR, f)).size / 1024).toFixed(1);
		Log(`  ${f}  (${size} KB)`);
	});
	cb();
}

// ==============================================
// INTERACTIVE SERVER PACKAGE
// ==============================================

let selectedServerType = null;

function _selectServerType() {
	return gulp.src('gulpfile.mjs')
		.pipe(prompt.prompt({
			type: 'list',
			name: 'serverType',
			message: 'Which server package should be created?',
			choices: [
				{ name: 'Node.js Express (Port 891)',  value: 'node' },
				{ name: 'IIS / ASP.NET (Port 888)',    value: 'iis' },
				{ name: 'Apache + PHP (Port 889)',     value: 'apache' },
				{ name: 'Nginx + PHP (Port 890)',      value: 'nginx' },
				{ name: 'All server types',            value: 'all' }
			]
		}, function(res) {
			selectedServerType = res.serverType;
		}));
}

function _buildSelectedPackage(cb) {
	if (selectedServerType === 'all') {
		gulp.series(_buildNodePackage, _buildIISPackage, _buildApachePackage, _buildNginxPackage, _buildAllDone)(cb);
	} else if (selectedServerType && SERVER_GLOBS[selectedServerType]) {
		gulp.series(
			function buildOne(done) { return _buildServerPackage(selectedServerType); },
			_buildAllDone
		)(cb);
	} else {
		ErrLog('No server type selected.');
		cb();
	}
}

// ==============================================
// NSIS INSTALLER
// ==============================================

async function _fetchInstallerRedistributables(cb) {
	SectionLog('Installer-Assets (Redistributables) prüfen / bei Bedarf von Microsoft laden …');
	try {
		await fetchInstallerRedistributables({
			root: PROJECT_ROOT,
			log: Log,
			ok: ResultLog,
			warn: (t) => console.warn(`${C.yellow}${t}${C.reset}`),
			err: ErrLog
		});
		cb();
	} catch (err) {
		ErrLog(err.message);
		cb(err);
	}
}

async function _buildInstaller(cb) {
	SectionLog('Building NSIS installer...');
	_ensureDir(DIST_DIR);
	_ensureDir(INSTALLERS_DIR);
	_ensureDir(TMP_DIR);

	const nsisScript = path.resolve('./installer/microPhotoFrame_Installer.nsi');
	if (!fs.existsSync(nsisScript)) {
		ErrLog('NSIS script not found: ' + nsisScript);
		cb(new Error('NSIS script not found'));
		return;
	}

	const rel = _readVersionFromReleases();
	if (rel) {
		Log(`Version from releases.json (last entry): ${VERSION} (Win ${VERSION_WIN})`);
	} else {
		Log(`Version from package.json: ${VERSION} (Win ${VERSION_WIN})`);
	}

	const outDir = path.resolve(INSTALLERS_DIR).replace(/\\/g, '/');
	const versionNsh =
		`!define VERSION "${VERSION}"\n` +
		`!define VERSION_WIN "${VERSION_WIN}"\n` +
		`!define INSTALLER_OUTDIR "${outDir}"\n`;
	fs.writeFileSync(path.join(TMP_DIR, 'version.nsh'), versionNsh);

	const makensisPath = _resolveMakensis();
	if (!makensisPath) {
		ErrLog('makensis.exe nicht gefunden. NSIS installieren oder MAKENSIS setzen.');
		Log('Hinweis: siehe docs/BUILD_INSTALLER.md');
		cb(new Error('makensis.exe not found'));
		return;
	}
	Log('makensis: ' + makensisPath);

	try {
		// .nsi liegt unter installer\ — File "..\…" relativ zur .nsi-Datei; Aufruf vom Projektroot.
		const scriptArg = path.relative(PROJECT_ROOT, nsisScript).replace(/\//g, '\\');
		await _spawn(makensisPath, ['/V3', scriptArg], { cwd: PROJECT_ROOT });
		const exeName = `${PROJECT_NAME}_Setup_v${VERSION}.exe`;
		const exePath = path.join(INSTALLERS_DIR, exeName);
		if (fs.existsSync(exePath)) {
			const size = (fs.statSync(exePath).size / (1024 * 1024)).toFixed(1);
			ResultLog(`Installer created: ${exePath} (${size} MB)`);
		}
		cb();
	} catch (err) {
		ErrLog('NSIS compilation failed: ' + err.message);
		cb(err);
	}
}

// ==============================================
// FIRMWARE TASKS (PlatformIO)
// ==============================================

async function _firmwareBuild(cb) {
	SectionLog('Building firmware...');
	try {
		await _spawn('pio', ['run'], { cwd: path.resolve('.') });
		ResultLog('Firmware build successful.');
		cb();
	} catch (err) {
		ErrLog('Firmware build failed: ' + err.message);
		cb(err);
	}
}

async function _firmwareUpload(cb) {
	SectionLog('Uploading firmware...');
	await _killSerialMonitors();
	try {
		await _spawn('pio', ['run', '-t', 'upload']);
		ResultLog('Firmware upload successful.');
		cb();
	} catch (err) {
		ErrLog('Firmware upload failed: ' + err.message);
		cb(err);
	}
}

async function _firmwareUploadMonitor(cb) {
	SectionLog('Uploading firmware and starting monitor...');
	await _killSerialMonitors();
	try {
		await _spawn('pio', ['run', '-t', 'upload']);
		ResultLog('Upload successful. Starting monitor...');
		await new Promise(r => setTimeout(r, 2000));
		await _spawn('pio', ['device', 'monitor']);
		cb();
	} catch (err) {
		ErrLog('Firmware upload/monitor failed: ' + err.message);
		cb(err);
	}
}

async function _firmwareMonitor(cb) {
	SectionLog('Starting serial monitor...');
	try {
		await _spawn('pio', ['device', 'monitor']);
		cb();
	} catch (err) {
		ErrLog('Monitor failed: ' + err.message);
		cb(err);
	}
}

// ==============================================
// INK ENCODING TASKS
// ==============================================

let encodeInk, loadConfigFromJSON;

async function _loadInkEncoder() {
	if (!encodeInk) {
		const mod = await import('ink-encoder');
		// Lokales Paket C:\Projects\ink-encoder exportiert PascalCase (noch nicht auf npm)
		encodeInk = mod.EncodeInk ?? mod.encodeInk;
		loadConfigFromJSON = mod.LoadConfigFromJSON ?? mod.loadConfigFromJSON;
	}
}

async function _encodeInk(cb) {
	await _loadInkEncoder();
	const configPath = process.env.config || './config/ink-encode-config.json';
	const inputPath = process.env.input;
	const outputPath = process.env.output;

	if (!inputPath) {
		ErrLog('--input parameter is required');
		Log('Usage: gulp ENCODE_INK --input=<file.png> [--output=<file.ink>] [--config=<config.json>]');
		cb(new Error('Missing input'));
		return;
	}
	if (!fs.existsSync(configPath)) {
		ErrLog('Config not found: ' + configPath);
		cb(new Error('Config not found'));
		return;
	}

	try {
		const files = await glob(inputPath);
		if (files.length === 0) { ErrLog('No files found: ' + inputPath); cb(new Error('No files')); return; }
		const options = await loadConfigFromJSON(configPath);

		for (const file of files) {
			let out = outputPath || file.replace(/\.(png|jpg|jpeg)$/i, '.ink');
			Log(`  ${file} -> ${out}`);
			const data = await encodeInk(file, options);
			fs.writeFileSync(out, data);
			ResultLog(`Converted: ${out}`);
		}
		cb();
	} catch (err) {
		ErrLog(err.message);
		cb(err);
	}
}

// ==============================================
// ICO GENERATION (png-to-ico)
// ==============================================

/**
 * Kopiert Branding-PNGs aus rawmedia nach webassets (wie index.html: Logo.png, LogoText.png).
 * Lege Quelldateien unter rawmedia/ ab, z. B. rawmedia/Logo.png — Task ist optional (kein Fehler wenn fehlt).
 */
async function _copyRawmediaToWebassets(cb) {
	SectionLog('Sync rawmedia → webassets (Logo / LogoText)...');
	const pairs = [
		['rawmedia/Logo.png', 'webassets/Logo.png'],
		['rawmedia/LogoText.png', 'webassets/LogoText.png'],
	];
	for (const [relSrc, relDst] of pairs) {
		const s = path.join(PROJECT_ROOT, relSrc);
		const d = path.join(PROJECT_ROOT, relDst);
		if (fs.existsSync(s)) {
			_ensureDir(path.dirname(d));
			fs.copyFileSync(s, d);
			ResultLog(`Copied ${relSrc} → ${relDst}`);
		} else {
			Log(`  (skip) ${relSrc} not found`);
		}
	}
	cb();
}

async function _buildIco(cb) {
	SectionLog('Generating favicon.ico from PNG sources...');
	const icoDir = path.join(PROJECT_ROOT, 'rawmedia', 'ico');
	const pngs = (await glob(path.join(icoDir, 'LogoIco_*x*.png').replace(/\\/g, '/')))
		.sort((a, b) => {
			const sizeA = parseInt(path.basename(a).match(/(\d+)x\d+/)?.[1] || '0');
			const sizeB = parseInt(path.basename(b).match(/(\d+)x\d+/)?.[1] || '0');
			return sizeA - sizeB;
		});
	if (pngs.length === 0) {
		ErrLog('No LogoIco_*x*.png files found in rawmedia/ico/');
		cb(new Error('No PNG sources'));
		return;
	}
	Log(`  Found ${pngs.length} PNG(s): ${pngs.map(p => path.basename(p)).join(', ')}`);

	const buffers = pngs.map(p => fs.readFileSync(p));
	const ico = await pngToIco(buffers);

	const targets = [
		path.join(PROJECT_ROOT, 'installer', 'assets', 'microPhotoFrame.ico'),
		path.join(PROJECT_ROOT, 'favicon.ico')
	];
	for (const t of targets) {
		_ensureDir(path.dirname(t));
		fs.writeFileSync(t, ico);
		ResultLog(`Written: ${path.relative(PROJECT_ROOT, t)}  (${(ico.length / 1024).toFixed(1)} KB)`);
	}
	cb();
}

// ==============================================
// COMPOSED / EXPORTED TASKS
// ==============================================

const Build_Server_Packages = gulp.series(_cleanDist, _selectServerType, _buildSelectedPackage);

const Build_All_Server_Packages = gulp.series(
	_cleanDist,
	_buildNodePackage,
	_buildIISPackage,
	_buildApachePackage,
	_buildNginxPackage,
	_buildAllDone
);

const Build_Installer = gulp.series(
	_fetchInstallerRedistributables,
	_cleanDist,
	_buildNodePackage,
	_buildIISPackage,
	_buildApachePackage,
	_buildNginxPackage,
	_buildAllDone,
	_buildInstaller
);

// ==============================================
// EXPORTS
// ==============================================

export {
	Build_Server_Packages      as BUILD_SERVER_PACKAGES,
	Build_All_Server_Packages  as BUILD_ALL_SERVER_PACKAGES,
	Build_Installer            as BUILD_INSTALLER,
	_fetchInstallerRedistributables as FETCH_INSTALLER_ASSETS,
	_firmwareBuild             as FIRMWARE_BUILD,
	_firmwareUpload            as FIRMWARE_UPLOAD,
	_firmwareUploadMonitor     as FIRMWARE_UPLOAD_MONITOR,
	_firmwareMonitor           as FIRMWARE_MONITOR,
	_encodeInk                 as ENCODE_INK,
	_buildIco                  as BUILD_ICO,
	_copyRawmediaToWebassets   as COPY_RAWMEDIA_WEBASSETS
};
