// =========================================
// microPhotoFrame Node.js Server - FULLY COMPATIBLE
// © 2026 Meinolf Amekudzi
// =========================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 891;

// Pfad-Logik: Sprung von /node/ ins Hauptverzeichnis
const BASE_DIR = path.join(__dirname, '..'); 
const SHOWS_DIR = path.join(BASE_DIR, 'shows');

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

// Image-Orientierung erkennen (Old und New Format)
const detectImageOrientation = (rawBuffer) => {
    if (rawBuffer.length < 4) return 0;
    
    const firstByte = rawBuffer[0];
    const secondByte = rawBuffer[1];
    const thirdByte = rawBuffer[2];
    const fourthByte = rawBuffer[3];
    
    // New format: Version 1 starts with 1 byte, then displayId, dither, orient
    if (firstByte === 1) {
        return fourthByte; // Index 3
    } else {
        // Old format: displayId, dither, orient, minCodeSize...
        return thirdByte; // Index 2
    }
};

// DisplayId aus Image-Buffer erkennen
const detectDisplayIdFromImage = (rawBuffer) => {
    if (rawBuffer.length < 1) return '';
    
    const firstByte = rawBuffer[0];
    
    // New format: Version 1
    if (firstByte === 1 && rawBuffer.length >= 2) {
        return String.fromCharCode(rawBuffer[1]);
    } else {
        // Old format: displayId ist das erste Byte
        return String.fromCharCode(firstByte);
    }
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

const handleGetShows = (rest, input) => {
    try {
        registerDeviceEcho(input);
        const showsCfgPath = path.join(SHOWS_DIR, 'shows.json');
        let shows = readJSON(showsCfgPath);
        if (!shows) {
            shows = {
                shows: [],
                dayStart: 7,
                dayEnd: 24,
                activeShows: {}
            };
        }
        rest.output.shows = shows;
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
    const safeName = getSafeShowName(showName);
    const showPath = path.join(SHOWS_DIR, safeName, 'show.json');
    const show = readJSON(showPath);
    
    if (!show) throw new Error(`Show "${showName}" existiert nicht.`);
    rest.output.show = show;
    rest.ok = true;
};

const handleCreateShow = (rest, input) => {
    const showName = input.showName;
    const displayId = input.displayId;
    
    if (!showName) throw new Error("showName fehlt.");
    const safeName = getSafeShowName(showName);
    
    if (!isValidDirectoryName(safeName)) {
        rest.ok = false;
        return;
    }
    
    const showsCfgPath = path.join(SHOWS_DIR, 'shows.json');
    const showDir = path.join(SHOWS_DIR, safeName);
    const showPath = path.join(showDir, 'show.json');
    
    let shows = readJSON(showsCfgPath);
    if (!shows) {
        shows = {
            shows: [],
            dayStart: 7,
            dayEnd: 24,
            activeShows: {}
        };
    }
    
    // Füge Show zur Liste hinzu wenn nicht vorhanden
    if (!shows.shows.includes(showName)) {
        shows.shows.push(showName);
    }
    
    // Setze aktive Show für displayId wenn displayId vorhanden
    if (displayId && !shows.activeShows[displayId]) {
        shows.activeShows[displayId] = showName;
    } else if (displayId) {
        shows.activeShows[displayId] = showName;
    }
    
    writeJSON(showsCfgPath, shows);
    
    // Erstelle Show-Verzeichnis
    if (!fs.existsSync(showDir)) {
        fs.mkdirSync(showDir, { recursive: true });
    }
    
    // Erstelle oder aktualisiere show.json
    let show = readJSON(showPath) || {};
    show.name = showName;
    if (!show.imgs) show.imgs = [];
    if (!show.timer) show.timer = 1;
    if (!show.mode) show.mode = 'random';
    if (displayId) show.displayId = displayId;
    
    writeJSON(showPath, show);
    
    rest.output.shows = shows;
    rest.output.showName = safeName;
    rest.ok = true;
};

const handleDeleteShow = (rest, input) => {
    const showName = input.showName;
    if (!showName) throw new Error("showName fehlt.");
    
    const safeName = getSafeShowName(showName);
    const showsCfgPath = path.join(SHOWS_DIR, 'shows.json');
    const showDir = path.join(SHOWS_DIR, safeName);
    const showPath = path.join(showDir, 'show.json');
    
    if (fs.existsSync(showDir)) {
        fs.rmSync(showDir, { recursive: true, force: true });
        rest.ok = true;
        
        let shows = readJSON(showsCfgPath);
        if (!shows) {
            shows = {
                shows: [],
                dayStart: 7,
                dayEnd: 24,
                activeShows: {},
                timer: 1,
                mode: 'random'
            };
        }
        
        // Entferne aus Shows-Array
        shows.shows = shows.shows.filter(n => n !== showName);
        
        // Finde displayId der gelöschten Show
        const show = readJSON(showPath);
        let showDisplayId = null;
        if (show && show.displayId) {
            showDisplayId = show.displayId;
        }
        
        // Entferne aus activeShows wenn aktiv
        if (showDisplayId && shows.activeShows && shows.activeShows[showDisplayId] === showName) {
            delete shows.activeShows[showDisplayId];
            
            // Versuche andere Show mit gleicher displayId zu aktivieren
            let newActiveShow = null;
            for (const sName of shows.shows) {
                const safeSName = getSafeShowName(sName);
                const sSPath = path.join(SHOWS_DIR, safeSName, 'show.json');
                const sShow = readJSON(sSPath);
                if (sShow && sShow.displayId === showDisplayId) {
                    newActiveShow = sName;
                    break;
                }
            }
            
            if (newActiveShow) {
                shows.activeShows[showDisplayId] = newActiveShow;
            }
        }
        
        writeJSON(showsCfgPath, shows);
        rest.output.shows = shows;
    }
};

const handleSaveShowImage = (rest, input) => {
    const showName = input.showName;
    const imgDataUrl = input.img;
    const replaceImageName = input.replaceImageName;
    const referenceName = input.referenceName;
    
    if (!showName || !imgDataUrl) throw new Error("showName oder img fehlt.");
    
    const safeName = getSafeShowName(showName);
    const showDir = path.join(SHOWS_DIR, safeName);
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
    
    const safeName = getSafeShowName(showName);
    const showDir = path.join(SHOWS_DIR, safeName);
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
    
    const safeName = getSafeShowName(showName);
    const showsCfgPath = path.join(SHOWS_DIR, 'shows.json');
    const showPath = path.join(SHOWS_DIR, safeName, 'show.json');
    
    let shows = readJSON(showsCfgPath);
    let show = readJSON(showPath);
    
    if (!shows) throw new Error("Shows not found.");
    if (!show) throw new Error("Show not found.");
    
    const displayId = show.displayId;
    if (displayId) {
        shows.activeShows[displayId] = showName;
        writeJSON(showsCfgPath, shows);
        rest.output.shows = shows;
        rest.ok = true;
    } else {
        throw new Error("Show has no displayId.");
    }
};

const handleSetShowSettings = (rest, input) => {
    const showName = input.showName;
    const showMode = input.showMode;
    const showTimer = input.showTimer;
    
    if (!showName) throw new Error("showName fehlt.");
    
    const safeName = getSafeShowName(showName);
    const showPath = path.join(SHOWS_DIR, safeName, 'show.json');
    
    let show = readJSON(showPath);
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
    
    const safeName = getSafeShowName(showName);
    const showDir = path.join(SHOWS_DIR, safeName);
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
        
        const showsCfgPath = path.join(SHOWS_DIR, 'shows.json');
        const showDir = path.join(SHOWS_DIR, safeName);
        const showPath = path.join(showDir, 'show.json');
        
        let shows = readJSON(showsCfgPath);
        if (!shows) {
            shows = {
                shows: [],
                dayStart: 7,
                dayEnd: 24,
                activeShows: {}
            };
        }
        
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
        
        writeJSON(showsCfgPath, shows);
        
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
app.post('/', async (req, res) => {
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
            case 'getShows':
                handleGetShows(rest, input);
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
});

// --- STATIK & FALLBACK ---

// Bedient index.html, CSS, JS aus C:\Projects\microPhotoFrame
app.use(express.static(BASE_DIR));

// Fallback für alle GET-Anfragen liefert die index.html
app.get('/', (req, res) => {
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
    console.log(`µPhotoFrame Server LÄUFT!`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`=========================================\n`);
});