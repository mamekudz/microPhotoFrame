// =========================================
// microPhotoFrame Node.js Server - FULLY COMPATIBLE
// © 2026 Meinolf Amekudzi
// =========================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const channels = require('./channels');

const app = express();
const PORT = 891;

// Pfad-Logik: Sprung von /node/ ins Hauptverzeichnis
const BASE_DIR = path.join(__dirname, '..'); 
const SHOWS_DIR = path.join(BASE_DIR, 'shows');
const LOGS_DIR = path.join(BASE_DIR, 'logs');
const NODE_FATAL_LOG = path.join(LOGS_DIR, 'node_fatal.log');

function logNodeFatal(scope, err) {
    const msg = (err && err.stack) ? err.stack : String(err);
    const line = new Date().toISOString() + ' ' + scope + '\n' + msg + '\n\n';
    try {
        if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
        fs.appendFileSync(NODE_FATAL_LOG, line, 'utf8');
    } catch (_) { /* ignore */ }
    console.error(line);
}

process.on('uncaughtException', (err) => {
    logNodeFatal('uncaughtException', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logNodeFatal('unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

// Verzeichnisse sicherstellen
if (!fs.existsSync(SHOWS_DIR)) {
    fs.mkdirSync(SHOWS_DIR, { recursive: true });
}

// --- DER ULTIMATIVE BODY-PARSER ---
// Liest die Rohdaten ein, da express.json() bei deinem Client-Format blockiert
app.use((req, res, next) => {
    if (req.method === 'POST') {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try {
                if (data) {
                    req.body = JSON.parse(data);
                }
            } catch (e) {
                req.body = {}; 
            }
            next();
        });
    } else {
        next();
    }
});

// Cache-Control Header
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// --- HILFSFUNKTIONEN ---
const readJSON = (p) => { 
    try { if (!fs.existsSync(p)) return null; return JSON.parse(fs.readFileSync(p, 'utf8')); } 
    catch (e) { return null; } 
};
const writeJSON = (p, d) => { 
    try { fs.writeFileSync(p, JSON.stringify(d), 'utf8'); return true; } 
    catch (e) { return false; } 
};
const getSafeShowName = (n) => 'show_' + n.toString().replace(/[^a-zA-Z0-9\-_]/g, '_');

// Datei mit Retry-Logik lesen (wie ASPX FileReadAllText)
const fileReadAllText = (filePath) => {
    let times = 0;
    while (times < 1000) {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return '';
        } catch (err) {
            times++;
            if (times >= 1000) return '';
        }
    }
    return '';
};

// Datei mit Retry-Logik schreiben (wie ASPX FileWriteAllText)
const fileWriteAllText = (filePath, text) => {
    let times = 0;
    while (times < 1000) {
        try {
            fs.writeFileSync(filePath, text, 'utf8');
            return true;
        } catch (err) {
            times++;
            if (times >= 1000) return false;
        }
    }
    return false;
};

// Device-Registry: speichert angeschlossene Geräte
const registerDeviceEcho = (input) => {
    try {
        const devicesPath = path.join(SHOWS_DIR, 'devices.json');
        if (input && input.deviceInfo) {
            const device = input.deviceInfo;
            let devices = readJSON(devicesPath) || {};
            const deviceID = device.name + "_" + device.ip;
            device.lastEcho = Date.now();
            devices[deviceID] = device;
            writeJSON(devicesPath, devices);
        }
    } catch (err) {
        console.error("Error in registerDeviceEcho:", err.message);
    }
};

// Image-Orientierung erkennen (Legacy und Versionen 1–3: gleicher 4-Byte-Header)
const detectImageOrientation = (rawBuffer) => {
    if (rawBuffer.length < 4) return 0;
    
    const firstByte = rawBuffer[0];
    const thirdByte = rawBuffer[2];
    const fourthByte = rawBuffer[3];
    
    // Version 1 (LZW), 2 (Deflate), 3 (Paeth+Deflate): [version, displayId, dither, orient, ...]
    if (firstByte === 1 || firstByte === 2 || firstByte === 3) {
        return fourthByte;
    }
    // Legacy: displayId, dither, orient, minCodeSize...
    return thirdByte;
};

// DisplayId aus Image-Buffer erkennen
const detectDisplayIdFromImage = (rawBuffer) => {
    if (rawBuffer.length < 1) return '';
    
    const firstByte = rawBuffer[0];
    
    if (rawBuffer.length >= 2 && (firstByte === 1 || firstByte === 2 || firstByte === 3)) {
        return String.fromCharCode(rawBuffer[1]);
    }
    // Legacy: erstes Byte ist displayId
    return String.fromCharCode(firstByte);
};

// Validiere Verzeichnisnamen
const isValidDirectoryName = (name) => {
    if (!name || name.trim() === '') return false;
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    return !invalidChars.test(name);
};

// --- API HANDLER FUNKTIONEN ---

const handleGetDevices = (rest) => {
    const devicesPath = path.join(SHOWS_DIR, 'devices.json');
    rest.output.devices = readJSON(devicesPath) || {};
    rest.ok = true;
};

const showsCfgPath = () => path.join(SHOWS_DIR, 'shows.json');

const loadShowsCfg = () => {
    const raw = readJSON(showsCfgPath()) || channels.emptyShows();
    const cfg = channels.migrateShows(raw, SHOWS_DIR);
    saveShowsCfg(cfg);
    return cfg;
};

const saveShowsCfg = (shows) => writeJSON(showsCfgPath(), shows);

const requestedChannelId = (req, input) => {
    const fromQuery = channels.extractChannelFromQuery(req && req.query && req.query.channel);
    if (fromQuery) return fromQuery;
    const fromInput = channels.extractChannelFromQuery(input && input.channel);
    if (fromInput) return fromInput;
    return channels.extractChannelFromPath(req && req.path);
};

const requestedDeviceDisplayId = (input) => {
    const raw = input && input.deviceInfo && input.deviceInfo.displayId;
    return raw ? String(raw) : '';
};

const attachChannelOutput = (rest, shows, req, input) => {
    const resolved = channels.resolveChannel(shows, requestedChannelId(req, input), requestedDeviceDisplayId(input));
    rest.output.shows = resolved.shows;
    rest.output.channel = resolved.channel;
    rest.output.channelError = resolved.channelError;
};

const requireShow = (showName, channelHint) => {
    const found = channels.findShow(SHOWS_DIR, showName, channelHint);
    if (!found) throw new Error(`Show "${showName}" existiert nicht.`);
    return found;
};

const attachShowMeta = (show, found) => {
    if (!show) return show;
    show.channel = found.channel || '';
    show.relDir = found.relDir || '';
    return show;
};

const handleListTargets = (rest, input) => {
    const user = channels.inputUserId(input);
    const displayId = (input && input.displayId) ||
        (input && input.deviceInfo && input.deviceInfo.displayId) || '';
    if (!user) throw new Error('User ID fehlt.');
    if (!displayId) throw new Error('Displaytyp fehlt.');
    const shows = loadShowsCfg();
    const groups = channels.listTargetsForUserDisplay(shows, user, displayId);
    rest.output.user = user;
    rest.output.userId = user;
    rest.output.displayId = displayId;
    rest.output.groups = groups;
    rest.output.targets = groups;
    rest.ok = true;
};

const handleGetShows = (rest, input, req) => {
    try {
        registerDeviceEcho(input);
        const shows = loadShowsCfg();
        saveShowsCfg(shows);
        attachChannelOutput(rest, shows, req, input);
        rest.ok = true;
    } catch (err) {
        rest.ok = false;
        rest.error.msg = 'Error in getShows: ' + err.message;
        rest.error.code = -1;
    }
};

const handleGetShow = (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    
    registerDeviceEcho(input);
    const found = requireShow(showName, input.channel);
    const show = attachShowMeta(readJSON(path.join(found.dir, 'show.json')), found);
    rest.output.show = show;
    rest.ok = true;
};

const handleCreateShow = (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    const shows = channels.createShow(SHOWS_DIR, loadShowsCfg(), {
        showName,
        channel: input.channel
    });
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.output.showName = showName;
    rest.ok = true;
};

const handleDeleteShow = (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    const shows = channels.deleteShow(SHOWS_DIR, loadShowsCfg(), {
        showName,
        channel: input.channel
    });
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleSaveShowImage = (rest, input) => {
    const showName = input.showName;
    const imgDataUrl = input.img;
    const replaceImageName = input.replaceImageName;
    const referenceName = input.referenceName;
    
    if (!showName || !imgDataUrl) throw new Error("showName oder img fehlt.");
    
    const found = requireShow(showName, input.channel);
    const showDir = found.dir;
    const showPath = path.join(showDir, 'show.json');
    
    // Extrahiere Base64-Daten
    const imgData = imgDataUrl.includes(',') ? imgDataUrl.split(',')[1] : imgDataUrl;
    const rawBuffer = Buffer.from(imgData, 'base64');
    
    let show = readJSON(showPath);
    if (!show) throw new Error(`Show "${showName}" existiert nicht.`);
    
    // Erkenne Orientierung aus Image-Buffer
    const currentOrientation = detectImageOrientation(rawBuffer);
    const displayIdFromImage = detectDisplayIdFromImage(rawBuffer);
    
    // Überprüfe ob displayId passt wenn in show.json definiert
    if (show.displayId && displayIdFromImage !== show.displayId) {
        rest.error.msg = "Display ID mismatch";
        rest.output.show = show;
        return;
    }
    
    let imageName;
    
    // Case 1: Replace an existing image
    if (replaceImageName) {
        const replacePath = path.join(showDir, replaceImageName);
        if (fs.existsSync(replacePath)) {
            imageName = replaceImageName;
            fs.writeFileSync(replacePath, rawBuffer);
            rest.output.imgName = imageName;
            rest.ok = true;
            rest.output.show = show;
            return;
        } else {
            rest.error.msg = "Image to replace not found: " + replaceImageName;
        }
    }
    
    // Case 2: Reference name provided
    if (referenceName) {
        const referencePath = path.join(showDir, referenceName);
        if (fs.existsSync(referencePath)) {
            // Extrahiere Base-Name ohne Orientierungs-Prefix
            let baseName = referenceName;
            if (baseName.length > 0 && baseName[0] >= '0' && baseName[0] <= '3') {
                baseName = baseName.substring(1);
            }
            if (baseName.endsWith('.ink')) {
                baseName = baseName.substring(0, baseName.length - 4);
            }
            
            // Ermittle Orientierung der Reference-Datei
            const referenceBuffer = fs.readFileSync(referencePath);
            const referenceOrientation = detectImageOrientation(referenceBuffer);
            
            // Nutze Reference-Name nur wenn Orientierungen entgegengesetzt sind
            const isOpposite = (referenceOrientation === 0 && currentOrientation === 1) ||
                              (referenceOrientation === 1 && currentOrientation === 0) ||
                              (referenceOrientation === 2 && currentOrientation === 3) ||
                              (referenceOrientation === 3 && currentOrientation === 2);
            
            if (isOpposite) {
                imageName = currentOrientation + baseName + '.ink';
            } else {
                imageName = currentOrientation + Date.now() + '.ink';
            }
        } else {
            imageName = currentOrientation + Date.now() + '.ink';
        }
    } else {
        // Case 3: Default naming
        imageName = currentOrientation + Date.now() + '.ink';
    }
    
    fs.writeFileSync(path.join(showDir, imageName), rawBuffer);
    
    // Füge zu show.imgs hinzu wenn nicht bereits vorhanden
    if (!show.imgs) show.imgs = [];
    if (!show.imgs.includes(imageName)) {
        show.imgs.push(imageName);
    }
    
    writeJSON(showPath, show);
    rest.output.imgName = imageName;
    rest.output.show = show;
    rest.ok = true;
};

const handleDeleteShowImage = (rest, input) => {
    const showName = input.showName;
    const imgName = input.imgName;
    
    if (!showName || !imgName) throw new Error("showName oder imgName fehlt.");
    
    const found = requireShow(showName, input.channel);
    const showDir = found.dir;
    const showPath = path.join(showDir, 'show.json');
    const imgPath = path.join(showDir, imgName);
    
    if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
        
        let show = readJSON(showPath);
        if (show && show.imgs) {
            show.imgs = show.imgs.filter(img => img !== imgName);
            writeJSON(showPath, show);
            rest.output.show = show;
            rest.ok = true;
        } else {
            rest.error.msg = "Show not found";
        }
    } else {
        rest.ok = false;
    }
};

const handleSetActiveShow = (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    const shows = channels.setActiveShow(SHOWS_DIR, loadShowsCfg(), {
        showName,
        channel: input.channel
    });
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleCreateChannel = (rest, input) => {
    const shows = channels.createChannel(SHOWS_DIR, loadShowsCfg(), input);
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleDeleteChannel = (rest, input) => {
    const shows = channels.deleteChannel(SHOWS_DIR, loadShowsCfg(), input);
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleDeleteTarget = (rest, input) => {
    const shows = channels.deleteTarget(SHOWS_DIR, loadShowsCfg(), input);
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleDeleteUser = (rest, input) => {
    const shows = channels.deleteUser(SHOWS_DIR, loadShowsCfg(), input);
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleSetDefaultChannel = (rest, input) => {
    const shows = channels.setDefaultChannel(SHOWS_DIR, loadShowsCfg(), input);
    saveShowsCfg(shows);
    rest.output.shows = shows;
    rest.ok = true;
};

const handleSetShowSettings = (rest, input) => {
    const showName = input.showName;
    const showMode = input.showMode;
    const showTimer = input.showTimer;
    
    if (!showName) throw new Error("showName fehlt.");
    
    const found = requireShow(showName, input.channel);
    const showPath = path.join(found.dir, 'show.json');
    
    let show = attachShowMeta(readJSON(showPath), found);
    if (!show) throw new Error("Show not found.");
    
    if (showMode !== undefined) show.mode = showMode;
    if (showTimer !== undefined) show.timer = showTimer;
    
    writeJSON(showPath, show);
    rest.output.show = show;
    rest.ok = true;
};

const handleExportShowAsync = async (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    
    const found = requireShow(showName, input.channel);
    const safeName = getSafeShowName(showName);
    const showDir = found.dir;
    const showPath = path.join(showDir, 'show.json');
    
    if (!fs.existsSync(showDir)) throw new Error("Show directory not found.");
    
    const show = readJSON(showPath);
    if (!show) throw new Error("Show not found.");
    
    const exportObj = {
        name: safeName,
        show: show,
        imgsdata: {}
    };
    
    // Füge alle Bilder als Base64 hinzu
    if (show.imgs && Array.isArray(show.imgs)) {
        for (const imgName of show.imgs) {
            const imgPath = path.join(showDir, imgName);
            if (fs.existsSync(imgPath)) {
                const imgData = fs.readFileSync(imgPath);
                exportObj.imgsdata[imgName] = 'data:image/ink;base64,' + imgData.toString('base64');
            }
        }
    }
    
    const exportStr = JSON.stringify(exportObj);
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    zip.file(safeName + '.show', exportStr);
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    rest.output.showZip = zipBuffer.toString('base64');
    rest.ok = true;
};

const handleImportShowAsync = async (rest, input) => {
    rest.ok = false;
    rest.error = { msg: "", code: 0 };
    
    if (!input || !input.importShow) {
        rest.error.msg = "No import data provided";
        rest.error.code = 1;
        return;
    }
    
    try {
        const zipBuffer = Buffer.from(input.importShow, 'base64');
        const JSZip = require('jszip');
        
        const zip = await JSZip.loadAsync(zipBuffer);
        
        // Finde die .show Datei
        let jsonContent = null;
        let showFileName = null;
        
        for (const filename in zip.files) {
            if (filename.endsWith('.show')) {
                showFileName = filename;
                break;
            }
        }
        
        if (!showFileName) {
            rest.error.msg = "No .show file found in archive";
            rest.error.code = 4;
            return;
        }
        
        const content = await zip.file(showFileName).async('string');
        const info = JSON.parse(content);
        const orgShowName = info.name;
        const safeName = getSafeShowName(orgShowName);
        
        if (!isValidDirectoryName(safeName)) {
            rest.error.msg = "Invalid show name";
            rest.error.code = 3;
            return;
        }
        
        const showDir = path.join(SHOWS_DIR, safeName);
        const showPath = path.join(showDir, 'show.json');
        
        let shows = loadShowsCfg();
        
        // Erstelle Show-Verzeichnis
        if (!fs.existsSync(showDir)) {
            fs.mkdirSync(showDir, { recursive: true });
        }
        
        // Schreibe Bilder
        const show = { imgs: [] };
        if (info.show) {
            Object.assign(show, info.show);
            show.imgs = [];
        }
        
        if (info.imgsdata) {
            for (const [imgName, imgDataUrl] of Object.entries(info.imgsdata)) {
                const imgData = imgDataUrl.split(',')[1];
                const imgBuffer = Buffer.from(imgData, 'base64');
                
                fs.writeFileSync(path.join(showDir, imgName), imgBuffer);
                show.imgs.push(imgName);
            }
        }
        
        writeJSON(showPath, show);
        
        if (!shows.shows.includes(orgShowName)) {
            shows.shows.push(orgShowName);
        }
        
        saveShowsCfg(shows);
        
        rest.ok = true;
    } catch (err) {
        rest.error.msg = "Import error: " + err.message;
        rest.error.code = 5;
    }
};

// --- OTA Firmware Update: Proxy .bin to device ---
const handleFirmwareUpdate = async (rest, input) => {
    const deviceIp = input.deviceIp;
    const firmwareBase64 = input.firmware; // Base64-encoded .bin
    if (!deviceIp) throw new Error("deviceIp fehlt.");
    if (!firmwareBase64) throw new Error("firmware (Base64) fehlt.");

    const firmwareBuf = Buffer.from(firmwareBase64, 'base64');
    console.log(`[OTA] Sending ${firmwareBuf.length} bytes to ${deviceIp}...`);

    const http = require('http');
    const boundary = '----FWUpload' + Date.now();
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="firmware"; filename="firmware.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const bodyLen = Buffer.byteLength(header) + firmwareBuf.length + Buffer.byteLength(footer);

    const result = await new Promise((resolve, reject) => {
        const req = http.request({
            hostname: deviceIp,
            port: 80,
            path: '/ota',
            method: 'POST',
            headers: {
                'Content-Type': 'multipart/form-data; boundary=' + boundary,
                'Content-Length': bodyLen
            },
            timeout: 120000
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve({ ok: res.statusCode === 200, msg: data }); }
            });
        });
        req.on('error', e => reject(e));
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout beim Senden an Gerät')); });
        req.write(header);
        req.write(firmwareBuf);
        req.write(footer);
        req.end();
    });

    rest.output.deviceResponse = result;
    rest.ok = result.ok !== false;
    if (!rest.ok) {
        rest.error.msg = result.msg || 'Firmware-Update fehlgeschlagen';
        rest.error.code = 10;
    }
};

const handleGetDeviceInfo = async (rest, input) => {
    const deviceIp = input.deviceIp;
    if (!deviceIp) throw new Error("deviceIp fehlt.");

    const http = require('http');
    const result = await new Promise((resolve, reject) => {
        http.get(`http://${deviceIp}/info`, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: data }); }
            });
        }).on('error', e => reject(e))
          .on('timeout', function() { this.destroy(); reject(new Error('Gerät nicht erreichbar')); });
    });

    rest.output.deviceInfo = result;
    rest.ok = true;
};

// --- API POST ROUTE ---
const handleApiPost = async (req, res) => {
    const body = req.body || {};
    const action = body.action || req.query.action;
    const input = body.input || {};

    console.log(`[API] Action: ${action}`);

    const rest = { 
        action: action, 
        ok: false, 
        output: {}, 
        error: { msg: "", code: 0 } 
    };

    try {
        if (!action) throw new Error("Keine Action im Payload gefunden.");

        switch (action) {
            case 'getDevices':
                handleGetDevices(rest);
                break;
            case 'listTargets':
                handleListTargets(rest, input);
                break;
            case 'getShows':
                handleGetShows(rest, input, req);
                break;
            case 'getShow':
                handleGetShow(rest, input);
                break;
            case 'createShow':
                handleCreateShow(rest, input);
                break;
            case 'deleteShow':
                handleDeleteShow(rest, input);
                break;
            case 'saveShowImage':
                handleSaveShowImage(rest, input);
                break;
            case 'deleteShowImage':
                handleDeleteShowImage(rest, input);
                break;
            case 'setActiveShow':
                handleSetActiveShow(rest, input);
                break;
            case 'createChannel':
                handleCreateChannel(rest, input);
                break;
            case 'updateChannel':
                handleSetActiveShow(rest, input);
                break;
            case 'deleteChannel':
                handleDeleteChannel(rest, input);
                break;
            case 'deleteTarget':
                handleDeleteTarget(rest, input);
                break;
            case 'deleteUser':
                handleDeleteUser(rest, input);
                break;
            case 'setDefaultChannel':
                handleSetDefaultChannel(rest, input);
                break;
            case 'setShowSettings':
                handleSetShowSettings(rest, input);
                break;
            case 'exportShow':
                await handleExportShowAsync(rest, input);
                break;
            case 'importShow':
                await handleImportShowAsync(rest, input);
                break;
            case 'firmwareUpdate':
                await handleFirmwareUpdate(rest, input);
                break;
            case 'getDeviceInfo':
                await handleGetDeviceInfo(rest, input);
                break;
            default:
                rest.error.msg = "Unbekannte Aktion: " + action;
                rest.error.code = -1;
        }
    } catch (e) {
        rest.ok = false;
        rest.error.msg = e.message;
        rest.error.code = -1;
        console.error("API Error:", e.message);
    }

    res.json(rest);
};

app.post('/', handleApiPost);
app.post('/shows/:user/:target/:displayId', handleApiPost);
app.post('/c/:user/:target/:displayId', handleApiPost);
app.post('/c/:slug', handleApiPost);

// --- STATIK & FALLBACK ---

// Bedient index.html, CSS, JS aus C:\Projects\microPhotoFrame
// Keep bundled service executables, setup scripts and logs outside the public surface.
app.use((req, res, next) => {
    let requestPath;
    try { requestPath = decodeURIComponent(req.path).replace(/\\/g, '/'); } catch { return res.sendStatus(400); }
    if (/^\/(?:runtime|\.installer|logs|temp|node|aspx|bin|php)(?:\/|$)/i.test(requestPath) || /^\/(?:config\.json|web\.config)$/i.test(requestPath)) return res.sendStatus(404);
    next();
});
app.get('/shows/:showDir/:file', (req, res, next) => {
    const showDir = String(req.params.showDir || '');
    if (!/^show_[A-Za-z0-9_\-]+$/.test(showDir)) return next();
    const showName = showDir.slice(5);
    const file = path.basename(String(req.params.file || ''));
    if (!showName || !file || file === '.' || file === '..') return next();
    const found = channels.findShow(SHOWS_DIR, showName);
    if (!found) return next();
    const fp = path.join(found.dir, file);
    if (!fp.startsWith(found.dir + path.sep) || !fs.existsSync(fp)) return next();
    res.sendFile(fp);
});

app.use(express.static(BASE_DIR));

// Fallback für alle GET-Anfragen liefert die index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'index.html'));
});

app.get('/shows/:user/:target/:displayId', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'index.html'));
});
app.get('/c/:user/:target/:displayId', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'index.html'));
});
app.get('/c/:slug', (req, res) => {
    res.sendFile(path.join(BASE_DIR, 'index.html'));
});

app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(BASE_DIR, 'index.html'));
    } else {
        next();
    }
});

// Server Start
app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`µPhotoFrame™ Server LÄUFT!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`=========================================\n`);
});