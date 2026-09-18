// ===============================================================
// µPhotoFrame™ - Build & Installer Gulp Script
// © 2026 Meinolf Amekudzi (MIT License)
//
// Plain ESM gulpfile: same export names for the classic gulp CLI.
// µ-prefixed metadata is for the µGulp™ dashboard only.
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
import glob from 'fast-glob';
import pngToIco from 'png-to-ico';
import { fetchInstallerRedistributables } from './tools/installer-redistributables.mjs';
import {
	AssertNasDestination,
	BuildRobocopyArgs,
	NAS_BACKUP_DEFAULT,
	NAS_BACKUP_EXCLUDE_DIR_NAMES,
	NAS_BACKUP_EXCLUDE_REL_DIRS,
	NasBackupError,
	RemoveReproducibleDirs,
	RunRobocopy,
} from './tools/nas-backup.mjs';
import {
	AssertStagedInkEncoderPaths,
	GitAddArgs,
	GitCommitArgs,
	InkReleaseError,
	NpmPublishArgs,
	ParseFlag,
	ReadInkEncoderPackage,
	ResolveInkEncoderDir,
	SanitizeNpmOtp,
} from './tools/ink-encoder-release.mjs';
import {
	ReportProgress,
	CreateProgress,
	IsMicroGulp,
	InstallStringExtensions,
	Log,
	Warn,
	LogError,
	ShowConfirmMessage,
	LogTable,
	Translate,
	GetParameter,
	RequestSelectInput,
	RequestForm,
} from 'gulp-mu-gulp-api';

InstallStringExtensions();

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
		Warn('releases.json: <message/> — falling back to package.json<context="task warning"/>', { message: e.message });
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

function _readInkEncoderVersion() {
	try {
		return ReadInkEncoderPackage(ResolveInkEncoderDir(PROJECT_ROOT)).version;
	} catch {
		return '';
	}
}

function _readFirmwareVersion() {
	try {
		const src = fs.readFileSync(path.join(PROJECT_ROOT, 'firmware', 'src', 'main.cpp'), 'utf8');
		const match = src.match(/#define\s+FIRMWARE_VERSION\s+"([^"]+)"/);
		return match?.[1] || '';
	} catch {
		return '';
	}
}

const INK_ENCODER_VERSION = _readInkEncoderVersion();
const FIRMWARE_VERSION = _readFirmwareVersion();

export const µI18xContext = {
	version: VERSION,
	project: PROJECT_NAME,
	inkEncoder: INK_ENCODER_VERSION,
	firmware: FIRMWARE_VERSION,
};

const SERVER_TYPE_PHRASES = {
	node: 'Node.js Express (Port 891)<context="task log"/>'.i18xRegister(),
	iis: 'IIS / ASP.NET (Port 888)<context="task log"/>'.i18xRegister(),
	apache: 'Apache + PHP (Port 889)<context="task log"/>'.i18xRegister(),
	nginx: 'Nginx + PHP (Port 890)<context="task log"/>'.i18xRegister(),
};

const DIST_DIR = './dist';
const INSTALLERS_DIR = './installers';
const TMP_DIR = './tmp';

const PACKAGE_TASKS = ['BUILD_SERVER_PACKAGES', 'BUILD_ALL_SERVER_PACKAGES', 'BUILD_INSTALLER'];
const FIRMWARE_IO_TASKS = ['FIRMWARE_UPLOAD', 'FIRMWARE_UPLOAD_MONITOR', 'FIRMWARE_MONITOR'];
const INK_RELEASE_TASKS = ['COMMIT_INK_ENCODER', 'PUBLISH_INK_ENCODER'];

const SERVER_TYPE_PARAMETERS = [
	{
		id: 'serverType',
		type: 'select',
		default: 'all',
		label: 'Server package<context="task parameter"/>'.i18xRegister(),
		options: [
			{ value: 'node', label: 'Node.js Express (Port 891)<context="task parameter"/>'.i18xRegister() },
			{ value: 'iis', label: 'IIS / ASP.NET (Port 888)<context="task parameter"/>'.i18xRegister() },
			{ value: 'apache', label: 'Apache + PHP (Port 889)<context="task parameter"/>'.i18xRegister() },
			{ value: 'nginx', label: 'Nginx + PHP (Port 890)<context="task parameter"/>'.i18xRegister() },
			{ value: 'all', label: 'All server types<context="task parameter"/>'.i18xRegister() },
		],
	},
];

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
		'C:\\Program Files\\NSIS\\makensis.exe',
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

function _runCaptured(cmd, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = cp.spawn(cmd, args, {
			cwd: options.cwd || PROJECT_ROOT,
			env: options.env || process.env,
			shell: true,
			windowsHide: true,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => { stdout += String(chunk); });
		child.stderr.on('data', (chunk) => { stderr += String(chunk); });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error((stderr || stdout || `${cmd} exited with code ${code}`).trim()));
				return;
			}
			resolve({ stdout, stderr, code });
		});
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

function _listZipArtifacts() {
	if (!fs.existsSync(DIST_DIR)) return [];
	return fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.zip')).map((f) => {
		const filePath = path.join(DIST_DIR, f);
		return { name: f, size: fs.statSync(filePath).size };
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
	'INSTALLATION.md',
];

const SERVER_GLOBS = {
	node: [
		'node/server.js',
		'node/package.json',
	],
	iis: [
		'web.config',
		'aspx/microPhotoFrame.aspx',
		'aspx/microPhotoFrame.cs',
	],
	apache: [
		'.htaccess',
		'php/**/*',
		'apache/httpd-microPhotoFrame.conf',
		'apache/START_APACHE.bat',
		'apache/STOP_APACHE.bat',
		'apache/ENABLE_MOD_REWRITE.bat',
		'apache/ENABLE_MOD_REWRITE.md',
	],
	nginx: [
		'php/**/*',
		'nginx/microPhotoFrame.conf',
		'nginx/START_NGINX.bat',
		'nginx/STOP_NGINX.bat',
		'nginx/START_PHP_CGI.bat',
		'nginx/STOP_PHP_CGI.bat',
		'nginx/RELOAD_NGINX.bat',
		'nginx/CHECK_NGINX.bat',
	],
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
	const label = Translate(SERVER_TYPE_PHRASES[serverType]);
	Log('Building <label/> package…<context="task section"/>', { label });
	_ensureDir(DIST_DIR);

	const allGlobs = [...COMMON_GLOBS, ...SERVER_GLOBS[serverType]];
	const zipName = `${PROJECT_NAME}_${serverType}_v${VERSION}.zip`;

	return gulp.src(allGlobs, { base: '.', dot: true, allowEmpty: true, encoding: false })
		.pipe(zip(zipName))
		.pipe(gulp.dest(DIST_DIR));
}

function _buildNodePackage() { return _buildServerPackage('node'); }
function _buildIISPackage() { return _buildServerPackage('iis'); }
function _buildApachePackage() { return _buildServerPackage('apache'); }
function _buildNginxPackage() { return _buildServerPackage('nginx'); }

function _buildAllDone(cb) {
	Log('All server packages created in <dir/>/<context="task log"/>', { dir: DIST_DIR });
	const files = _listZipArtifacts();
	if (files.length > 0) {
		LogTable({
			columns: [
				Translate('Package<context="task log"/>'),
				Translate('Size<context="task log"/>'),
			],
			rows: files.map((f) => [f.name, f.size.Format('byteSize')]),
		});
	}
	cb();
}

// ==============================================
// INTERACTIVE SERVER PACKAGE
// ==============================================

let selectedServerType = null;

async function _selectServerType() {
	let chosen = GetParameter('serverType');
	if (!chosen && !IsMicroGulp()) {
		chosen = await RequestSelectInput({
			label: 'Which server package should be created?<context="task parameter"/>'.i18xTrans(),
			options: [
				{ value: 'node', label: 'Node.js Express (Port 891)<context="task parameter"/>'.i18xTrans() },
				{ value: 'iis', label: 'IIS / ASP.NET (Port 888)<context="task parameter"/>'.i18xTrans() },
				{ value: 'apache', label: 'Apache + PHP (Port 889)<context="task parameter"/>'.i18xTrans() },
				{ value: 'nginx', label: 'Nginx + PHP (Port 890)<context="task parameter"/>'.i18xTrans() },
				{ value: 'all', label: 'All server types<context="task parameter"/>'.i18xTrans() },
			],
			default: 'all',
		});
	}
	selectedServerType = chosen || 'all';
}

function _buildSelectedPackage(cb) {
	if (selectedServerType === 'all') {
		gulp.series(_buildNodePackage, _buildIISPackage, _buildApachePackage, _buildNginxPackage, _buildAllDone)(cb);
	} else if (selectedServerType && SERVER_GLOBS[selectedServerType]) {
		gulp.series(
			function buildOne() { return _buildServerPackage(selectedServerType); },
			_buildAllDone
		)(cb);
	} else {
		LogError('No server type selected.<context="task error"/>');
		cb();
	}
}

// ==============================================
// NSIS INSTALLER
// ==============================================

async function _fetchInstallerRedistributables(cb) {
	Log('Checking installer redistributables / downloading from Microsoft if needed…<context="task section"/>');
	try {
		await fetchInstallerRedistributables({ root: PROJECT_ROOT });
		cb();
	} catch (err) {
		LogError('Installer assets failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

async function _buildInstaller(cb) {
	Log('Building NSIS installer…<context="task section"/>');
	const progress = CreateProgress(Translate('NSIS installer<context="task log"/>'));
	_ensureDir(DIST_DIR);
	_ensureDir(INSTALLERS_DIR);
	_ensureDir(TMP_DIR);
	progress.Update(0.1);

	const nsisScript = path.resolve('./installer/microPhotoFrame_Installer.nsi');
	if (!fs.existsSync(nsisScript)) {
		LogError('NSIS script not found: <path/><context="task error"/>', { path: nsisScript });
		cb(new Error('NSIS script not found'));
		return;
	}

	const rel = _readVersionFromReleases();
	if (rel) {
		Log('Version from releases.json (last entry): <version/> (Win <win/>)<context="task log"/>', { version: VERSION, win: VERSION_WIN });
	} else {
		Log('Version from package.json: <version/> (Win <win/>)<context="task log"/>', { version: VERSION, win: VERSION_WIN });
	}

	const outDir = path.resolve(INSTALLERS_DIR).replace(/\\/g, '/');
	const versionNsh =
		`!define VERSION "${VERSION}"\n` +
		`!define VERSION_WIN "${VERSION_WIN}"\n` +
		`!define INSTALLER_OUTDIR "${outDir}"\n`;
	fs.writeFileSync(path.join(TMP_DIR, 'version.nsh'), versionNsh);
	progress.Update(0.25);

	const makensisPath = _resolveMakensis();
	if (!makensisPath) {
		LogError('makensis.exe not found. Install NSIS or set MAKENSIS.<context="task error"/>');
		Log('See docs/BUILD_INSTALLER.md<context="task log"/>');
		cb(new Error('makensis.exe not found'));
		return;
	}
	Log('makensis: <path/><context="task log"/>', { path: makensisPath });

	try {
		// .nsi liegt unter installer\ — File "..\…" relativ zur .nsi-Datei; Aufruf vom Projektroot.
		const scriptArg = path.relative(PROJECT_ROOT, nsisScript).replace(/\//g, '\\');
		progress.Update(0.4, Translate('Compiling NSIS script…<context="task log"/>'));
		await _spawn(makensisPath, ['/V3', scriptArg], { cwd: PROJECT_ROOT });
		const exeName = `${PROJECT_NAME}_Setup_v${VERSION}.exe`;
		const exePath = path.join(INSTALLERS_DIR, exeName);
		if (fs.existsSync(exePath)) {
			const size = fs.statSync(exePath).size;
			Log('Installer created: <path/> (<size format="byteSize"/>)<context="task log"/>', { path: exePath, size });
		}
		progress.Done();
		cb();
	} catch (err) {
		LogError('NSIS compilation failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

// ==============================================
// FIRMWARE TASKS (PlatformIO)
// ==============================================

async function _firmwareBuild(cb) {
	Log('Building firmware…<context="task section"/>');
	const progress = CreateProgress(Translate('Firmware<context="task log"/>'));
	progress.Update(0.15);
	try {
		await _spawn('pio', ['run'], { cwd: path.resolve('.') });
		progress.Done();
		Log('Firmware build successful.<context="task log"/>');
		cb();
	} catch (err) {
		LogError('Firmware build failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

async function _firmwareUpload(cb) {
	Log('Uploading firmware…<context="task section"/>');
	await _killSerialMonitors();
	ReportProgress(0.2, Translate('Uploading firmware…<context="task log"/>'));
	try {
		await _spawn('pio', ['run', '-t', 'upload']);
		ReportProgress(1);
		Log('Firmware upload successful.<context="task log"/>');
		cb();
	} catch (err) {
		LogError('Firmware upload failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

async function _firmwareUploadMonitor(cb) {
	Log('Uploading firmware and starting monitor…<context="task section"/>');
	await _killSerialMonitors();
	try {
		await _spawn('pio', ['run', '-t', 'upload']);
		Log('Upload successful. Starting monitor…<context="task log"/>');
		await new Promise((r) => setTimeout(r, 2000));
		await _spawn('pio', ['device', 'monitor']);
		cb();
	} catch (err) {
		LogError('Firmware upload/monitor failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

async function _firmwareMonitor(cb) {
	Log('Starting serial monitor…<context="task section"/>');
	try {
		await _spawn('pio', ['device', 'monitor']);
		cb();
	} catch (err) {
		LogError('Monitor failed: <message/><context="task error"/>', { message: err.message });
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
		// Workspace package ink-encoder (2.0.0) exports PascalCase; npm 1.0.0 used camelCase.
		encodeInk = mod.EncodeInk ?? mod.encodeInk;
		loadConfigFromJSON = mod.LoadConfigFromJSON ?? mod.loadConfigFromJSON;
	}
}

async function _encodeInk(cb) {
	const configPath = GetParameter('config', process.env.config || './config/ink-encode-config.json');
	const inputPath = GetParameter('input', process.env.input);
	const outputPath = GetParameter('output', process.env.output);

	if (!inputPath) {
		LogError('The input parameter is required.<context="task error"/>');
		Log('Usage: gulp ENCODE_INK with input (optional output and config).<context="task log"/>');
		cb(new Error('Missing input'));
		return;
	}

	await _loadInkEncoder();
	if (!fs.existsSync(configPath)) {
		LogError('Config not found: <path/><context="task error"/>', { path: configPath });
		cb(new Error('Config not found'));
		return;
	}

	try {
		const files = await glob(inputPath);
		if (files.length === 0) {
			LogError('No files found: <path/><context="task error"/>', { path: inputPath });
			cb(new Error('No files'));
			return;
		}
		const options = await loadConfigFromJSON(configPath);
		const progress = CreateProgress(Translate('INK encoding<context="task log"/>'));

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			let out = outputPath || file.replace(/\.(png|jpg|jpeg)$/i, '.ink');
			Log('<file/> → <out/><context="task log"/>', { file, out });
			const data = await encodeInk(file, options);
			fs.writeFileSync(out, data);
			Log('Converted: <path/><context="task log"/>', { path: out });
			progress.Update((i + 1) / files.length);
		}
		progress.Done();
		cb();
	} catch (err) {
		LogError('INK encoding failed: <message/><context="task error"/>', { message: err.message });
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
	Log('Sync rawmedia → webassets (Logo / LogoText)…<context="task section"/>');
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
			Log('Copied <src/> → <dst/><context="task log"/>', { src: relSrc, dst: relDst });
		} else {
			Log('(skip) <path/> not found<context="task log"/>', { path: relSrc });
		}
	}
	cb();
}

async function _buildIco(cb) {
	Log('Generating favicon.ico from PNG sources…<context="task section"/>');
	const icoDir = path.join(PROJECT_ROOT, 'rawmedia', 'ico');
	const pngs = (await glob(path.join(icoDir, 'LogoIco_*x*.png').replace(/\\/g, '/')))
		.sort((a, b) => {
			const sizeA = parseInt(path.basename(a).match(/(\d+)x\d+/)?.[1] || '0');
			const sizeB = parseInt(path.basename(b).match(/(\d+)x\d+/)?.[1] || '0');
			return sizeA - sizeB;
		});
	if (pngs.length === 0) {
		LogError('No LogoIco_*x*.png files found in rawmedia/ico/<context="task error"/>');
		cb(new Error('No PNG sources'));
		return;
	}
	Log('Found <count/> PNG(s): <names/><context="task log"/>', {
		count: pngs.length,
		names: pngs.map((p) => path.basename(p)).join(', '),
	});

	const buffers = pngs.map((p) => fs.readFileSync(p));
	const ico = await pngToIco(buffers);

	const targets = [
		path.join(PROJECT_ROOT, 'installer', 'assets', 'microPhotoFrame.ico'),
		path.join(PROJECT_ROOT, 'favicon.ico'),
	];
	for (const t of targets) {
		_ensureDir(path.dirname(t));
		fs.writeFileSync(t, ico);
		Log('Written: <path/> (<size format="byteSize"/>)<context="task log"/>', {
			path: path.relative(PROJECT_ROOT, t),
			size: ico.length,
		});
	}
	cb();
}

// ==============================================
// NAS BACKUP (robocopy mirror — not a versioned backup)
// ==============================================

function _nasBackupPath() {
	const fromParam = GetParameter('destination');
	if (fromParam) return String(fromParam).trim();
	const override = String(process.env.MICROPHOTOFRAME_NAS_BACKUP ?? '').trim();
	return override || NAS_BACKUP_DEFAULT;
}

function _logNasDestinationError(err, fallbackPath) {
	const destPath = err?.path || fallbackPath;
	const reason = err instanceof NasBackupError ? err.reason : '';
	if (reason === 'drive-root') {
		LogError('NAS destination must not be a drive or share root: <path/><context="task error"/>', { path: destPath });
		return;
	}
	if (reason === 'same') {
		LogError('NAS destination must not be the project folder itself.<context="task error"/>');
		return;
	}
	if (reason === 'ancestor') {
		LogError('NAS destination must not be a parent of the project folder: <path/><context="task error"/>', { path: destPath });
		return;
	}
	if (reason === 'descendant') {
		LogError('NAS destination must not be inside the project folder: <path/><context="task error"/>', { path: destPath });
		return;
	}
	LogError('NAS destination is missing: <path/>. Create the folder on the NAS first.<context="task error"/>', {
		path: destPath,
	});
}

async function _backupToNas(cb) {
	if (process.platform !== 'win32') {
		LogError('BACKUP_TO_NAS requires Windows (robocopy) and the NAS drive letter.<context="task error"/>');
		cb(new Error('BACKUP_TO_NAS requires Windows'));
		return;
	}

	const destination = _nasBackupPath();
	let destResolved;
	try {
		destResolved = AssertNasDestination(PROJECT_ROOT, destination);
	} catch (err) {
		_logNasDestinationError(err, destination);
		cb(err);
		return;
	}

	const progress = CreateProgress(Translate('NAS backup<context="task log"/>'));
	Warn('This is a robocopy /MIR mirror with deletions, not a versioned backup.<context="task warning"/>');
	Log('Mirroring project → <path/> (changes only)<context="task log"/>', { path: destResolved });
	Log('Skipping reproducible directories: <dirs/><context="task log"/>', {
		dirs: [...NAS_BACKUP_EXCLUDE_DIR_NAMES, ...NAS_BACKUP_EXCLUDE_REL_DIRS].join(', '),
	});
	progress.Update(0.1);

	try {
		progress.Update(0.2, Translate('Copying changed files…<context="task log"/>'));
		const exitCode = await RunRobocopy(BuildRobocopyArgs(path.resolve(PROJECT_ROOT), destResolved), {
			cwd: PROJECT_ROOT,
		});
		progress.Update(0.85, Translate('Removing leftover reproducible directories…<context="task log"/>'));
		const removed = RemoveReproducibleDirs(destResolved, {
			log: (rel) => Log('Removing leftover <path/> on the NAS<context="task log"/>', { path: rel }),
			warn: (rel, message) => {
				if (message === 'outside') {
					Warn('Refusing to delete <path/> outside the NAS destination.<context="task warning"/>', { path: rel });
				} else {
					Warn('Failed to remove <path/>: <message/><context="task warning"/>', { path: rel, message });
				}
			},
		});
		if (removed > 0) {
			Log('Removed <count/> leftover reproducible directories on the NAS.<context="task log"/>', { count: removed });
		}
		progress.Done();
		Log('NAS backup finished (robocopy <code format="int"/>).<context="task log"/>', { code: exitCode });
		cb();
	} catch (err) {
		LogError('NAS backup failed: <message/><context="task error"/>', { message: err.message });
		cb(err);
	}
}

function _flagParam(id, fallback = false) {
	return ParseFlag(GetParameter(id), fallback);
}

function _logInkReleaseError(err) {
	if (err instanceof InkReleaseError) {
		if (err.reason === 'confirm') {
			LogError('Confirmation is required. On the CLI set MICROGULP_PARAM_CONFIRM=true.<context="task error"/>');
			return;
		}
		if (err.reason === 'message') {
			LogError('A commit message is required (MICROGULP_PARAM_MESSAGE).<context="task error"/>');
			return;
		}
		if (err.reason === 'package') {
			LogError('Not the ink-encoder workspace package: <path/><context="task error"/>', { path: err.detail || err.message });
			return;
		}
		if (err.reason === 'staged') {
			LogError('Refusing to commit a path outside ink-encoder/: <path/><context="task error"/>', { path: err.detail });
			return;
		}
		if (err.reason === 'otp') {
			LogError('Invalid npm OTP. Use 6–8 digits or leave it empty.<context="task error"/>');
			return;
		}
	}
	LogError('ink-encoder release failed: <message/><context="task error"/>', { message: err.message });
}

async function _confirmInkRelease(kind, summary) {
	if (IsMicroGulp()) {
		const result = await ShowConfirmMessage({
			variant: 'warning',
			title: Translate('Confirm <kind/><context="task parameter"/>', { kind }),
			message: summary,
			style: 'yes-no',
		});
		if (result?.button !== 'yes') throw new InkReleaseError('confirm');
		return;
	}
	if (!_flagParam('confirm')) throw new InkReleaseError('confirm');
}

async function _commitInkEncoder(cb) {
	try {
		const encoderDir = ResolveInkEncoderDir(PROJECT_ROOT);
		const pkg = ReadInkEncoderPackage(encoderDir);
		const message = String(GetParameter('message') || '').trim();
		if (!message) throw new InkReleaseError('message');

		const progress = CreateProgress(Translate('ink-encoder git commit<context="task log"/>'));
		Log('Committing workspace package <name/>@<version/> (paths under ink-encoder/ only).<context="task log"/>', pkg);
		progress.Update(0.15);

		const status = await _runCaptured('git', ['status', '--short', '--', 'ink-encoder']);
		const statusText = status.stdout.trim();
		if (!statusText) {
			throw new Error('Nothing to commit under ink-encoder/.');
		}
		Log(statusText + '<context="task log"/>');
		await _confirmInkRelease(
			Translate('git commit<context="task parameter"/>'),
			Translate('Stage and commit only ink-encoder/ with message: <message/><context="task log"/>', { message }),
		);
		progress.Update(0.4, Translate('Staging ink-encoder/…<context="task log"/>'));
		await _runCaptured('git', GitAddArgs());
		const staged = await _runCaptured('git', ['diff', '--cached', '--name-only', '--', 'ink-encoder']);
		const files = staged.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
		AssertStagedInkEncoderPaths(files);
		if (files.length === 0) throw new Error('Nothing to commit under ink-encoder/.');
		progress.Update(0.7, Translate('Creating git commit…<context="task log"/>'));
		const committed = await _runCaptured('git', GitCommitArgs(message));
		if (committed.stdout.trim()) Log(committed.stdout.trim() + '<context="task log"/>');
		const head = await _runCaptured('git', ['log', '-1', '--oneline']);
		progress.Done();
		Log('Committed: <rev/><context="task log"/>', { rev: head.stdout.trim() });
		cb();
	} catch (err) {
		_logInkReleaseError(err);
		cb(err);
	}
}

async function _publishInkEncoder(cb) {
	try {
		const encoderDir = ResolveInkEncoderDir(PROJECT_ROOT);
		const pkg = ReadInkEncoderPackage(encoderDir);
		const dryRun = ParseFlag(GetParameter('dryRun', 'true'), true);
		const skipTests = _flagParam('skipTests');
		let otp = SanitizeNpmOtp(GetParameter('otp'));

		const progress = CreateProgress(Translate('ink-encoder npm publish<context="task log"/>'));
		Log('Publishing <name/>@<version/> from the workspace folder (not the PhotoFrame root).<context="task log"/>', pkg);
		if (dryRun) {
			Warn('Dry run: npm will not upload the package. Set MICROGULP_PARAM_DRYRUN=false and confirm to publish.<context="task warning"/>');
		}
		progress.Update(0.15);

		if (!skipTests) {
			progress.Update(0.25, Translate('Running ink-encoder tests…<context="task log"/>'));
			await _spawn('npm', ['test', '-w', 'ink-encoder'], { cwd: PROJECT_ROOT });
		}

		if (IsMicroGulp() && !dryRun && !otp) {
			const values = await RequestForm({
				title: Translate('npm 2FA<context="task parameter"/>'),
				fields: [{
					id: 'otp',
					type: 'password',
					label: Translate('2FA one-time code (optional)<context="task parameter"/>'),
				}],
			});
			const entered = values?.otp ?? values?.fields?.otp;
			if (entered) otp = SanitizeNpmOtp(entered);
		}

		if (!dryRun) {
			await _confirmInkRelease(
				Translate('npm publish<context="task parameter"/>'),
				Translate('Publish <name/>@<version/> to the npm registry.<context="task log"/>', pkg),
			);
		}
		progress.Update(0.7, Translate('Running npm publish…<context="task log"/>'));
		const args = NpmPublishArgs({ dryRun, otp });
		await _spawn('npm', args, { cwd: encoderDir });
		progress.Done();
		Log(dryRun
			? 'npm publish dry-run finished for <name/>@<version/>.<context="task log"/>'
			: 'Published <name/>@<version/> to npm.<context="task log"/>', pkg);
		cb();
	} catch (err) {
		_logInkReleaseError(err);
		cb(err);
	}
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
	_copyRawmediaToWebassets   as COPY_RAWMEDIA_WEBASSETS,
	_backupToNas               as BACKUP_TO_NAS,
	_commitInkEncoder          as COMMIT_INK_ENCODER,
	_publishInkEncoder         as PUBLISH_INK_ENCODER,
};

Build_Server_Packages.µDisplayName = 'Build One Server Package V<version/><context="µDisplayName"/>'.i18xRegister();
Build_Server_Packages.µDescription = 'Creates a zip for one server type (or all) after asking which target to build.<context="µDescription"/>'.i18xRegister();
Build_Server_Packages.µTooltip = 'Opens a parameter form, then writes dist/*.zip.<context="µTooltip"/>'.i18xRegister();
Build_Server_Packages.µGroup = 'Build/Packages<context="µGroup"/>'.i18xRegister();
Build_Server_Packages.µIcon = '\uE901';
Build_Server_Packages.µOrder = 20;
Build_Server_Packages.µExecutionConcurrency = false;
Build_Server_Packages.µExecutionRestrictions = { deny: PACKAGE_TASKS.filter((n) => n !== 'BUILD_SERVER_PACKAGES') };
Build_Server_Packages.µParameters = SERVER_TYPE_PARAMETERS;

Build_All_Server_Packages.µDisplayName = 'Build All Server Packages V<version/><context="µDisplayName"/>'.i18xRegister();
Build_All_Server_Packages.µDescription = 'Creates Node, IIS, Apache and Nginx zip packages in dist/.<context="µDescription"/>'.i18xRegister();
Build_All_Server_Packages.µTooltip = 'Cleans dist/, then packs all four server variants.<context="µTooltip"/>'.i18xRegister();
Build_All_Server_Packages.µGroup = 'Build/Packages<context="µGroup"/>'.i18xRegister();
Build_All_Server_Packages.µIcon = '\uE900';
Build_All_Server_Packages.µOrder = 10;
Build_All_Server_Packages.µExecutionConcurrency = false;
Build_All_Server_Packages.µExecutionRestrictions = { deny: PACKAGE_TASKS.filter((n) => n !== 'BUILD_ALL_SERVER_PACKAGES') };
Build_All_Server_Packages.µKeyBinding = { key: 'ctrl+shift+B', mac: 'cmd+shift+B' };

Build_Installer.µDisplayName = 'Build Installer V<version/><context="µDisplayName"/>'.i18xRegister();
Build_Installer.µDescription = 'Fetches redistributables, packs all server zips and compiles the NSIS setup.exe.<context="µDescription"/>'.i18xRegister();
Build_Installer.µTooltip = 'Writes installers/microPhotoFrame_Setup_v<version/>.exe. Requires makensis on PATH.<context="µTooltip"/>'.i18xRegister();
Build_Installer.µGroup = 'Build/Installer<context="µGroup"/>'.i18xRegister();
Build_Installer.µIcon = '\uE911';
Build_Installer.µOrder = 30;
Build_Installer.µExecutionConcurrency = false;
Build_Installer.µExecutionRestrictions = { deny: PACKAGE_TASKS.filter((n) => n !== 'BUILD_INSTALLER') };
Build_Installer.µKeyBinding = { key: 'ctrl+shift+I', mac: 'cmd+shift+I' };

_fetchInstallerRedistributables.µDisplayName = 'Fetch Installer Assets<context="µDisplayName"/>'.i18xRegister();
_fetchInstallerRedistributables.µDescription = 'Downloads Microsoft redistributables listed in installer/assets/redistributables.json when missing or stale.<context="µDescription"/>'.i18xRegister();
_fetchInstallerRedistributables.µTooltip = 'Skipped when SKIP_FETCH_INSTALLER_ASSETS=1.<context="µTooltip"/>'.i18xRegister();
_fetchInstallerRedistributables.µGroup = 'Build/Installer<context="µGroup"/>'.i18xRegister();
_fetchInstallerRedistributables.µIcon = '\uE902';
_fetchInstallerRedistributables.µOrder = 40;

_firmwareBuild.µDisplayName = 'Build Firmware V<firmware/><context="µDisplayName"/>'.i18xRegister();
_firmwareBuild.µDescription = 'Compiles the PlatformIO firmware (pio run).<context="µDescription"/>'.i18xRegister();
_firmwareBuild.µTooltip = 'Requires PlatformIO CLI (pio) on PATH.<context="µTooltip"/>'.i18xRegister();
_firmwareBuild.µGroup = 'Firmware<context="µGroup"/>'.i18xRegister();
_firmwareBuild.µIcon = '\uE916';
_firmwareBuild.µOrder = 10;
_firmwareBuild.µKeyBinding = { key: 'ctrl+shift+R', mac: 'cmd+shift+R' };
_firmwareBuild.µWatch = {
	files: ['firmware/src/**/*', 'firmware/include/**/*', 'firmware/platformio.ini'],
	ignore: ['firmware/.pio/**', '**/*.elf', '**/*.bin'],
	debounceMs: 400,
	autoStart: false,
};

_firmwareUpload.µDisplayName = 'Upload Firmware V<firmware/><context="µDisplayName"/>'.i18xRegister();
_firmwareUpload.µDescription = 'Stops serial monitors, then uploads firmware (pio run -t upload).<context="µDescription"/>'.i18xRegister();
_firmwareUpload.µTooltip = 'Kills lingering python/pio monitor processes first.<context="µTooltip"/>'.i18xRegister();
_firmwareUpload.µGroup = 'Firmware<context="µGroup"/>'.i18xRegister();
_firmwareUpload.µIcon = '\uE912';
_firmwareUpload.µOrder = 20;
_firmwareUpload.µExecutionConcurrency = false;
_firmwareUpload.µExecutionRestrictions = { deny: FIRMWARE_IO_TASKS.filter((n) => n !== 'FIRMWARE_UPLOAD') };
_firmwareUpload.µKeyBinding = { key: 'ctrl+shift+U', mac: 'cmd+shift+U' };

_firmwareUploadMonitor.µDisplayName = 'Upload Firmware V<firmware/> and Monitor<context="µDisplayName"/>'.i18xRegister();
_firmwareUploadMonitor.µDescription = 'Uploads firmware and opens the serial monitor.<context="µDescription"/>'.i18xRegister();
_firmwareUploadMonitor.µTooltip = 'Keeps the run sector open while the monitor is attached.<context="µTooltip"/>'.i18xRegister();
_firmwareUploadMonitor.µGroup = 'Firmware<context="µGroup"/>'.i18xRegister();
_firmwareUploadMonitor.µIcon = '\uE90B';
_firmwareUploadMonitor.µOrder = 30;
_firmwareUploadMonitor.µExecutionConcurrency = false;
_firmwareUploadMonitor.µExecutionRestrictions = { deny: FIRMWARE_IO_TASKS.filter((n) => n !== 'FIRMWARE_UPLOAD_MONITOR') };
_firmwareUploadMonitor.µAutoClose = -1;

_firmwareMonitor.µDisplayName = 'Serial Monitor<context="µDisplayName"/>'.i18xRegister();
_firmwareMonitor.µDescription = 'Opens the PlatformIO device monitor.<context="µDescription"/>'.i18xRegister();
_firmwareMonitor.µTooltip = 'Keeps the run sector open until the monitor exits.<context="µTooltip"/>'.i18xRegister();
_firmwareMonitor.µGroup = 'Firmware<context="µGroup"/>'.i18xRegister();
_firmwareMonitor.µIcon = '\uE90C';
_firmwareMonitor.µOrder = 40;
_firmwareMonitor.µExecutionConcurrency = false;
_firmwareMonitor.µExecutionRestrictions = { deny: FIRMWARE_IO_TASKS.filter((n) => n !== 'FIRMWARE_MONITOR') };
_firmwareMonitor.µAutoClose = -1;

_encodeInk.µDisplayName = 'Encode INK<context="µDisplayName"/>'.i18xRegister();
_encodeInk.µDescription = 'Encodes PNG/JPEG images to .ink using ink-encoder.<context="µDescription"/>'.i18xRegister();
_encodeInk.µTooltip = 'Requires an input path (file or glob). Optional output and config.<context="µTooltip"/>'.i18xRegister();
_encodeInk.µGroup = 'Tools<context="µGroup"/>'.i18xRegister();
_encodeInk.µIcon = '\uE906';
_encodeInk.µOrder = 10;
_encodeInk.µAutoClose = -1;
_encodeInk.µParameters = [
	{
		id: 'input',
		type: 'text',
		required: true,
		label: 'Input PNG/JPEG (file or glob)<context="task parameter"/>'.i18xRegister(),
		placeholder: 'path/to/image.png<context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'output',
		type: 'text',
		label: 'Output .ink path (optional)<context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'config',
		type: 'text',
		default: './config/ink-encode-config.json',
		label: 'Encoder config JSON<context="task parameter"/>'.i18xRegister(),
	},
];

_buildIco.µDisplayName = 'Build Favicon ICO<context="µDisplayName"/>'.i18xRegister();
_buildIco.µDescription = 'Builds favicon.ico and the installer icon from rawmedia/ico PNG sizes.<context="µDescription"/>'.i18xRegister();
_buildIco.µTooltip = 'Writes favicon.ico and installer/assets/microPhotoFrame.ico.<context="µTooltip"/>'.i18xRegister();
_buildIco.µGroup = 'Assets<context="µGroup"/>'.i18xRegister();
_buildIco.µIcon = '\uE915';
_buildIco.µOrder = 10;
_buildIco.µWatch = {
	files: ['rawmedia/ico/LogoIco_*x*.png'],
	debounceMs: 300,
	autoStart: false,
};

_copyRawmediaToWebassets.µDisplayName = 'Copy Rawmedia to Webassets<context="µDisplayName"/>'.i18xRegister();
_copyRawmediaToWebassets.µDescription = 'Copies Logo.png and LogoText.png from rawmedia/ to webassets/ when present.<context="µDescription"/>'.i18xRegister();
_copyRawmediaToWebassets.µTooltip = 'Skips missing source files without failing.<context="µTooltip"/>'.i18xRegister();
_copyRawmediaToWebassets.µGroup = 'Assets<context="µGroup"/>'.i18xRegister();
_copyRawmediaToWebassets.µIcon = '\uE919';
_copyRawmediaToWebassets.µOrder = 20;
_copyRawmediaToWebassets.µWatch = {
	files: ['rawmedia/Logo.png', 'rawmedia/LogoText.png'],
	debounceMs: 300,
	autoStart: false,
};

_backupToNas.µDisplayName = 'Backup to NAS<context="µDisplayName"/>'.i18xRegister();
_backupToNas.µDescription = 'Robocopy /MIR mirror to Z:\\Projects\\microPhotoFrame. Not a versioned backup: extra files on the destination are deleted. Skips regenerable directories and removes leftovers there.<context="µDescription"/>'.i18xRegister();
_backupToNas.µTooltip = 'Refuses drive/share roots and source/parent/child destinations. Override with the destination parameter or MICROPHOTOFRAME_NAS_BACKUP.<context="µTooltip"/>'.i18xRegister();
_backupToNas.µGroup = 'Build/Maintenance<context="µGroup"/>'.i18xRegister();
_backupToNas.µIcon = '\uE902';
_backupToNas.µOrder = 80;
_backupToNas.µExecutionConcurrency = false;
_backupToNas.µExecutionRestrictions = { deny: PACKAGE_TASKS };
_backupToNas.µKeyBinding = { key: 'ctrl+shift+N', mac: 'cmd+shift+N' };
_backupToNas.µParameters = [
	{
		id: 'destination',
		type: 'text',
		default: NAS_BACKUP_DEFAULT,
		label: 'NAS destination<context="task parameter"/>'.i18xRegister(),
	},
];

_commitInkEncoder.µDisplayName = 'Commit ink-encoder V<inkEncoder/><context="µDisplayName"/>'.i18xRegister();
_commitInkEncoder.µDescription = 'Stages and commits only the ink-encoder/ workspace package. Does not push.<context="µDescription"/>'.i18xRegister();
_commitInkEncoder.µTooltip = 'CLI requires MICROGULP_PARAM_MESSAGE and MICROGULP_PARAM_CONFIRM=true. Other staged files are not included.<context="µTooltip"/>'.i18xRegister();
_commitInkEncoder.µGroup = 'Publish<context="µGroup"/>'.i18xRegister();
_commitInkEncoder.µIcon = '\uE90A';
_commitInkEncoder.µOrder = 10;
_commitInkEncoder.µExecutionConcurrency = false;
_commitInkEncoder.µExecutionRestrictions = { deny: INK_RELEASE_TASKS.filter((n) => n !== 'COMMIT_INK_ENCODER') };
_commitInkEncoder.µParameters = [
	{
		id: 'message',
		type: 'textarea',
		required: true,
		label: 'Commit message<context="task parameter"/>'.i18xRegister(),
		placeholder: 'Release ink-encoder <inkEncoder/><context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'confirm',
		type: 'boolean',
		default: false,
		label: 'Create the git commit<context="task parameter"/>'.i18xRegister(),
	},
];

_publishInkEncoder.µDisplayName = 'Publish ink-encoder V<inkEncoder/> to npm<context="µDisplayName"/>'.i18xRegister();
_publishInkEncoder.µDescription = 'Publishes only the ink-encoder workspace package. CLI defaults to a dry run; a real upload needs DRYRUN=false and confirmation. Does not publish PhotoFrame.<context="µDescription"/>'.i18xRegister();
_publishInkEncoder.µTooltip = 'Log in once with npm login. Optional OTP via MICROGULP_PARAM_OTP. Dry run unless MICROGULP_PARAM_DRYRUN=false.<context="µTooltip"/>'.i18xRegister();
_publishInkEncoder.µGroup = 'Publish<context="µGroup"/>'.i18xRegister();
_publishInkEncoder.µIcon = '\uE912';
_publishInkEncoder.µOrder = 20;
_publishInkEncoder.µExecutionConcurrency = false;
_publishInkEncoder.µExecutionRestrictions = { deny: INK_RELEASE_TASKS.filter((n) => n !== 'PUBLISH_INK_ENCODER') };
_publishInkEncoder.µParameters = [
	{
		id: 'dryRun',
		type: 'boolean',
		default: true,
		label: 'Dry run (no upload)<context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'confirm',
		type: 'boolean',
		default: false,
		label: 'Publish for real (ignored during dry run)<context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'otp',
		type: 'password',
		label: '2FA one-time code (optional)<context="task parameter"/>'.i18xRegister(),
	},
	{
		id: 'skipTests',
		type: 'boolean',
		default: false,
		label: 'Skip ink-encoder tests<context="task parameter"/>'.i18xRegister(),
	},
];

