import "./microLib/Config.mjs";
import EInkDef from "./microLib/EInkDef.mjs?v=21";
import EInk from "./microLib/EInk.mjs";
import { OptimizeImageForEink, FocusSpotFromPredictions } from "./microLib/EInkAutoOptimize.mjs?v=exp2";
import RESTX from "./microLib/RESTX.mjs";
import "./microLib/StorageUtils.mjs";
import WebUtils from "./microLib/WebUtils.mjs";
import "./microLib/ArrayUtils.mjs";
import "./microLib/StringUtils.mjs";
import { initI18n, t, setLid } from "./i18n.mjs";


Config.APPID = "µPhotoFrame";
// Use root URL with query string - web.config rewrite will route to aspx/microPhotoFrame.aspx
RESTX.hostUrl = "/";

let defaultDisplayId = "EINK_SPECTRA6_730_sq_800x480";
let shows = [];
let currentInk = null;
let currentFile = null;
let detectorModel = null;
let aiDetectedSpot = null; // Stores AI-detected position {x, y} in original image coordinates (0-1)

// Store original images for re-optimization (key: imageName, value: File object)
window.originalImages = {};

const stdEInkConvert = new EInkDef({
    cutAspect: EInkDef.LANDSCAPE,
    cutSpotX: 0.5,
    cutSpotY: 0.5,
    cutBgrdColor: "#ffffff",
    zoom: 1.0,
    displayID: defaultDisplayId,
    colorSaturationAdjust: 1.8,
    contrastAdjust: 1.4,
    blackPointAdjust: 1.0,
    whitePointAdjust: 1.1,
    ditherType: 'floyd'
});

const pageTitles = {
    "TopMenu": "Main Menu<context=\"ui\"/>", "AddNewShow": "Add New Show<context=\"ui\"/>", "DeleteShow": "Delete Show '<showName/>'<context=\"ui\"/>",
    "ShowSettings": "Edit Settings of '<showName/>'<context=\"ui\"/>", "ActivateShow": "Activate Show '<showName/>'<context=\"ui\"/>", "AddShowPhotos": "Add Photos to '<showName/>'<context=\"ui\"/>",
    "ManageShowPhotos": "Manage Photos of '<showName/>'<context=\"ui\"/>", "PhotoSettings": "Photo Settings<context=\"ui\"/>", "ExportShow": "Export Show '<showName/>'<context=\"ui\"/>",
    "ImportShow": "Import Show<context=\"ui\"/>", "Channels": "Manage Channel '<channelName/>'<context=\"ui\"/>", "Devices": "Device Manager<context=\"ui\"/>"
};

const SETTINGS_KEY = "microPhotoFrame_LastSettings";
const LAST_SELECTED_SHOW_KEY = "microPhotoFrame_LastSelectedShow";
const LAST_SELECTED_CHANNEL_KEY = "microPhotoFrame_LastSelectedChannel";
const NEW_CHANNEL_VALUE = '__new__';

function saveLastSelectedShow(showName) {
    if (showName) {
        localStorage.setItem(LAST_SELECTED_SHOW_KEY, showName);
    }
}

function loadLastSelectedShow() {
    return localStorage.getItem(LAST_SELECTED_SHOW_KEY) || '';
}

function saveLastSelectedChannel(slug) {
    if (slug && slug !== NEW_CHANNEL_VALUE) {
        localStorage.setItem(LAST_SELECTED_CHANNEL_KEY, slug);
    }
}

function loadLastSelectedChannel() {
    return localStorage.getItem(LAST_SELECTED_CHANNEL_KEY) || '';
}

function getSelectedChannelSlug() {
    return document.getElementById('globalChannelSelect')?.value || '';
}

function getSelectedShowName() {
    return document.getElementById('globalShowSelect')?.value || '';
}

const PAGES_NEED_SHOW = ['DeleteShow', 'ShowSettings', 'ActivateShow', 'AddShowPhotos', 'ManageShowPhotos', 'ExportShow'];

function titleWithShow(template, showName) {
    if (!template || !template.includes('<showName/>')) return template;
    if (showName) return template.replace(/<showName\/>/g, showName);
    return template
        .replace(/ to '<showName\/>'/g, '')
        .replace(/ of '<showName\/>'/g, '')
        .replace(/ '<showName\/>'/g, '')
        .replace(/<showName\/>/g, '')
        .trim();
}

function selectedChannelLabel() {
    const slug = getSelectedChannelSlug();
    if (!slug || slug === NEW_CHANNEL_VALUE) return t('(none)<context="ui"/>');
    return channelLabel(slug, currentChannels[slug], true);
}

function resolvePageTitle(pageId) {
    let title = t(pageTitles[pageId] || 'Page<context="ui"/>', {
        showName: getSelectedShowName() || t('(no show selected)<context="ui"/>'),
        channelName: selectedChannelLabel()
    });
    title = titleWithShow(title, getSelectedShowName());
    if (title.includes('<channelName/>')) {
        title = title.replace(/<channelName\/>/g, selectedChannelLabel());
    }
    return title;
}

function setPageTitle(titleEl, pageId) {
    if (!titleEl) return;
    const template = pageTitles[pageId] || '';
    if (pageId === 'Channels' || template.includes('<channelName/>')) {
        titleEl.replaceChildren();
        titleEl.append(document.createTextNode(t('Manage Channel<context="ui"/>')));
        titleEl.append(document.createElement('br'));
        titleEl.append(document.createTextNode("'" + selectedChannelLabel() + "'"));
        return;
    }
    titleEl.textContent = resolvePageTitle(pageId);
}

// Make functions globally available
window.saveLastSelectedShow = saveLastSelectedShow;
window.loadLastSelectedShow = loadLastSelectedShow;

// Clear original images on page unload/reload
window.addEventListener('beforeunload', () => {
    window.originalImages = {};
});

function saveSettingsToStorage() {
    const settings = {
        saturation: document.getElementById('saturation').value,
        contrast: document.getElementById('contrast').value,
        blackpoint: document.getElementById('blackpoint').value,
        whitepoint: document.getElementById('whitepoint').value,
        zoom: document.getElementById('zoom').value,
        cutSpotX: document.getElementById('cutSpotX').value,
        cutSpotY: document.getElementById('cutSpotY').value,
        dither: document.getElementById('dither').value,
        orientation: document.getElementById('orientation').value,
        saveAspect: getSaveAspect(),
        autoOptimize: isAutoOptimizeEnabled(),
        bgrdColor: document.getElementById('bgrdColor').value,
        displayID: document.getElementById('displayID').value
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getSaveAspect() {
    const el = document.getElementById('saveAspect') || document.getElementById('saveAspectAdd');
    const v = el ? el.value : 'both';
    return (v === 'landscape' || v === 'portrait') ? v : 'both';
}

window.SyncSaveAspect = function (fromId) {
    const src = document.getElementById(fromId);
    if (!src) return;
    const other = document.getElementById(fromId === 'saveAspect' ? 'saveAspectAdd' : 'saveAspect');
    if (other && other.value !== src.value) other.value = src.value;
    saveSettingsToStorage();
};

function isAutoOptimizeEnabled() {
    const el = document.getElementById('autoOptimize') || document.getElementById('autoOptimizeAdd');
    return el ? !!el.checked : true;
}

window.SyncAutoOptimize = function (fromId) {
    const src = document.getElementById(fromId);
    if (!src) return;
    const other = document.getElementById(fromId === 'autoOptimize' ? 'autoOptimizeAdd' : 'autoOptimize');
    if (other && other.checked !== src.checked) other.checked = src.checked;
    saveSettingsToStorage();
};

function loadSettingsFromStorage() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;
    const settings = JSON.parse(saved);
    Object.keys(settings).forEach(id => {
        if (id === 'autoOptimize' || id === 'displayID') return;
        const el = document.getElementById(id);
        if (el) el.value = settings[id];
    });
    const saveAspect = document.getElementById('saveAspect');
    const saveAspectAdd = document.getElementById('saveAspectAdd');
    if (saveAspect && saveAspectAdd) saveAspectAdd.value = saveAspect.value;
    const autoOn = settings.autoOptimize !== false;
    const autoEl = document.getElementById('autoOptimize');
    const autoAddEl = document.getElementById('autoOptimizeAdd');
    if (autoEl) autoEl.checked = autoOn;
    if (autoAddEl) autoAddEl.checked = autoOn;
}

window.ShowPage = function (pageId) {
    if (window._addPhotosBusy && pageId !== 'AddShowPhotos') {
        return;
    }
    if (PAGES_NEED_SHOW.includes(pageId) && !getSelectedShowName()) {
        if (pageId === 'AddShowPhotos' || pageId === 'ManageShowPhotos') {
            window.ShowPage('AddNewShow');
            return;
        }
        if (pageId !== 'TopMenu') {
            window.ShowPage('TopMenu');
        }
        return;
    }
    // Clear original images when navigating to TopMenu
    if (pageId === 'TopMenu') {
        window.originalImages = {};
    }
    
    // Hide all pages first
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId) || document.getElementById('PlaceholderPage');
    target.style.display = 'flex';
    // Store the current page ID immediately to prevent race conditions
    window._currentPageId = pageId;
    const titleEl = target.querySelector('.page-title') || document.getElementById('placeholder-title');
    setPageTitle(titleEl, pageId);
    window.scrollTo(0, 0);
    
    // Load page-specific data
    if (pageId === 'DeleteShow') {
        window.LoadDeleteShowPage();
    }
    if (pageId === 'ActivateShow') {
        window.LoadActivateShowPage();
    }
    if (pageId === 'Channels') {
        window.LoadChannelsPage();
    }
    if (pageId === 'ShowSettings') {
        window.LoadShowSettingsPage();
    }
    if (pageId === 'AddNewShow') {
        window.LoadAddNewShowPage();
    }
    if (pageId === 'AddShowPhotos') {
        // Clear file input when page is opened
        const fileInput = document.getElementById('addPhotosInput');
        if (fileInput) fileInput.value = '';
        const messageDiv = document.getElementById('addPhotosMessage');
        if (messageDiv) messageDiv.style.display = 'none';
        const progressDiv = document.getElementById('addPhotosProgress');
        if (progressDiv) progressDiv.style.display = 'none';
        // Update button text to show no files selected
        window.UpdateAddPhotosButtonText();
        // Setup drag and drop and file selection button
        setTimeout(() => {
            if (window.SetupDragAndDrop) {
                window.SetupDragAndDrop();
            }
            if (window.UpdatePhotoActionButtons) {
                window.UpdatePhotoActionButtons();
            }
            // Ensure file selection button works - only setup change listener, click is handled by onclick attribute
            const addPhotosInput = document.getElementById('addPhotosInput');
            if (addPhotosInput) {
                // Add change event listener to update button text when files are selected
                if (window._addPhotosChangeHandler) {
                    addPhotosInput.removeEventListener('change', window._addPhotosChangeHandler);
                }
                window._addPhotosChangeHandler = () => {
                    window.UpdateAddPhotosButtonText();
                };
                addPhotosInput.addEventListener('change', window._addPhotosChangeHandler);
            }
        }, 100);
    }
    if (pageId === 'ManageShowPhotos') {
        window.LoadManageShowPhotosPage();
    }
    if (pageId === 'ImportShow') {
        // Clear file input when page is opened
        const fileInput = document.getElementById('importShowInput');
        if (fileInput) fileInput.value = '';
        const messageDiv = document.getElementById('importShowMessage');
        if (messageDiv) messageDiv.style.display = 'none';
        // Setup drag and drop
        setTimeout(() => {
            if (window.SetupDragAndDrop) {
                window.SetupDragAndDrop();
            }
        }, 100);
    }
    if (pageId === 'Devices') {
        window.RefreshDevices();
    }
    if (pageId === 'PhotoSettings' || pageId === 'AddShowPhotos') {
        // Update button states when opening these pages
        if (window.UpdatePhotoActionButtons) {
            window.UpdatePhotoActionButtons();
        }
        // Update preview to show placeholder if no image is loaded
        if (pageId === 'PhotoSettings') {
            syncPhotoSettingsDisplayFromContext();
            if (currentFile) window.UpdateDisplay();
            else if (window.UpdatePreview) window.UpdatePreview();
        }
        // Setup drag and drop and click handlers together
        setTimeout(() => {
            if (window.SetupDragAndDrop) {
                window.SetupDragAndDrop();
            }
        }, 150);
    }
    
    // Update delete show name display when show selection changes
    if (pageId === 'DeleteShow' && window.UpdatePageTitleIfNeeded) {
        window.UpdatePageTitleIfNeeded();
    }
};

// Track ongoing operations to prevent navigation during processing
window._ongoingOperations = 0;

window._addPhotosBusy = false;

function setBusyControls(ids, busy) {
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = busy;
        if (busy) el.setAttribute('aria-disabled', 'true');
        else el.removeAttribute('aria-disabled');
    });
}

function applyAddPhotosBusyControls() {
    const next = !!window._addPhotosBusy;
    const leaveHint = t('Photos are still being processed. Stay on this page.<context="ui"/>');
    const back = document.getElementById('addPhotosBackBtn');
    if (back) {
        back.disabled = next;
        back.title = next ? leaveHint : '';
        back.setAttribute('aria-disabled', next ? 'true' : 'false');
    }
    setBusyControls([
        'btnProcessAndAddPhotos',
        'addPhotosFilesBtn',
        'addPhotosInput',
        'saveAspectAdd',
        'autoOptimizeAdd',
        'globalShowSelect',
        'globalChannelSelect'
    ], next);
}

function setAddPhotosBusy(busy) {
    const next = !!busy;
    const was = !!window._addPhotosBusy;
    window._addPhotosBusy = next;
    if (next && !was) window.StartOperation();
    if (!next && was) window.EndOperation();
    applyAddPhotosBusyControls();
}

// Enable/disable back buttons based on ongoing operations
window.UpdateBackButtons = function(enabled) {
    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(btn => {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.45';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
        btn.style.pointerEvents = enabled ? 'auto' : 'none';
        if (enabled) {
            btn.removeAttribute('aria-disabled');
        } else {
            btn.setAttribute('aria-disabled', 'true');
        }
    });
};

// Start an operation (increment counter)
window.StartOperation = function() {
    window._ongoingOperations++;
    window.UpdateBackButtons(false);
};

// End an operation (decrement counter)
window.EndOperation = function() {
    window._ongoingOperations = Math.max(0, window._ongoingOperations - 1);
    if (window._ongoingOperations === 0) {
        window.UpdateBackButtons(true);
    }
};

// Check if any operation is ongoing
window.IsOperationOngoing = function() {
    return window._ongoingOperations > 0;
};

// Warn user before leaving page if operation is ongoing
window.addEventListener('beforeunload', function(e) {
    if (window.IsOperationOngoing()) {
        e.preventDefault();
        e.returnValue = 'An operation is currently in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});

window.Return2TopMenu = () => {
    if (window._addPhotosBusy) {
        return;
    }
    if (window.IsOperationOngoing()) {
        if (!confirm(t('Photos are still being processed. Stay on this page.<context="ui"/>'))) {
            return;
        }
    }
    // Clear original images when returning to top menu
    window.originalImages = {};
    window.ShowPage('TopMenu');
};

// Drag & Drop Event-Listener Setup
// Store handlers to allow removal
if (!window._dragDropHandlers) {
    window._dragDropHandlers = {};
}

function isDropPageId(id) {
    return id === 'AddShowPhotos' || id === 'PhotoSettings' || id === 'ImportShow';
}

function isAcceptedDropFile(file, kinds) {
    const n = (file && file.name ? file.name : '').toLowerCase();
    const img = (file.type && file.type.startsWith('image/')) ||
        ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some((ext) => n.endsWith(ext));
    const ink = n.endsWith('.ink');
    const zip = n.endsWith('.zip') || n.endsWith('.show');
    if (kinds === 'images') return img || ink;
    if (kinds === 'show') return zip;
    return false;
}

function assignDroppedFiles(input, files, kinds, multi) {
    if (window._addPhotosBusy) return false;
    if (!input || !files || !files.length) return false;
    const dt = new DataTransfer();
    for (const file of files) {
        if (!isAcceptedDropFile(file, kinds)) continue;
        dt.items.add(file);
        if (!multi) break;
    }
    if (!dt.files.length) return false;
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
}

function bindDropZone(zone, input, kinds, multi, onFiles) {
    if (!zone || !input) return;
    const hid = zone.id || kinds;
    const overKey = hid + 'Over';
    const leaveKey = hid + 'Leave';
    const dropKey = hid + 'Drop';
    if (window._dragDropHandlers[overKey]) {
        zone.removeEventListener('dragover', window._dragDropHandlers[overKey], true);
        zone.removeEventListener('dragleave', window._dragDropHandlers[leaveKey], true);
        zone.removeEventListener('drop', window._dragDropHandlers[dropKey], true);
    }
    window._dragDropHandlers[overKey] = (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
        return false;
    };
    window._dragDropHandlers[leaveKey] = (e) => {
        e.preventDefault();
        if (e.relatedTarget && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('drag-over');
        return false;
    };
    window._dragDropHandlers[dropKey] = (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
        const files = e.dataTransfer && e.dataTransfer.files;
        if (assignDroppedFiles(input, files, kinds, multi) && onFiles) onFiles();
        return false;
    };
    zone.addEventListener('dragover', window._dragDropHandlers[overKey], true);
    zone.addEventListener('dragleave', window._dragDropHandlers[leaveKey], true);
    zone.addEventListener('drop', window._dragDropHandlers[dropKey], true);
}

if (!window._dropNavGuard) {
    window._dropNavGuard = true;
    document.addEventListener('dragover', (e) => {
        if (isDropPageId(window._currentPageId)) e.preventDefault();
    });
    document.addEventListener('drop', (e) => {
        if (isDropPageId(window._currentPageId)) e.preventDefault();
    });
}

window.SetupDragAndDrop = function() {
    const addPhotosFilesBtn = document.getElementById('addPhotosFilesBtn');
    const addPhotosInput = document.getElementById('addPhotosInput');
    const addPhotosPage = document.getElementById('AddShowPhotos');
    if (addPhotosFilesBtn && addPhotosInput) {
        const afterAdd = () => {
            if (window.UpdateAddPhotosButtonText) window.UpdateAddPhotosButtonText();
        };
        bindDropZone(addPhotosFilesBtn, addPhotosInput, 'images', true, afterAdd);
        bindDropZone(addPhotosPage, addPhotosInput, 'images', true, afterAdd);
    }

    const importShowFileBtn = document.getElementById('importShowFileBtn');
    const importShowInput = document.getElementById('importShowInput');
    const importShowPage = document.getElementById('ImportShow');
    if (importShowFileBtn && importShowInput) {
        const afterImport = () => {
            if (importShowInput.files && importShowInput.files.length > 0) {
                importShowFileBtn.innerText = '📄 ' + importShowInput.files[0].name;
            } else {
                importShowFileBtn.innerText = '📄 Datei auswählen oder hierher ziehen';
            }
        };
        bindDropZone(importShowFileBtn, importShowInput, 'show', false, afterImport);
        bindDropZone(importShowPage, importShowInput, 'show', false, afterImport);
        importShowInput.addEventListener('change', afterImport);
    }

    const photoSettingsFileBtn = document.getElementById('photoSettingsFileBtn');
    const photoSettingsInput = document.getElementById('inputimg');
    const photoSettingsPage = document.getElementById('PhotoSettings');
    if (photoSettingsFileBtn && photoSettingsInput) {
        bindDropZone(photoSettingsFileBtn, photoSettingsInput, 'images', false);
        bindDropZone(photoSettingsPage, photoSettingsInput, 'images', false);
    }
};

// Store active shows globally (mapping: displayId -> showName)
let currentActiveShows = {};
let currentChannels = {};
let currentDefaultChannel = '';
let currentShowDisplays = {};

function displayDefForId(displayId) {
    const id = String(displayId ?? '').trim();
    if (!id) return null;
    if (EInkDef.DISPLAYS[id]) return EInkDef.DISPLAYS[id];
    const found = Object.entries(EInkDef.DISPLAYS).find(([, value]) =>
        String(value.id) === id
    );
    return found ? found[1] : null;
}

function displayNameForId(displayId) {
    const def = displayDefForId(displayId);
    return def ? (def.name || displayId) : (displayId || '');
}

function shortDisplayName(displayId) {
    const def = displayDefForId(displayId);
    if (!def) return displayId || '';
    const family = String(def.name || '').split(' · ')[0].trim();
    if (def.size) return family + ' · ' + def.size + '"';
    return family || displayId;
}

function paletteTag(def) {
    const colors = (def && def.colors) || [];
    const n = colors.length;
    if (n === 2) return 'BW';
    if (n === 3) return colors.some((c) => String(c).toUpperCase() === '#FFFF00') ? 'BWY' : 'BWR';
    if (n === 4) return colors.some((c) => /^#A{2}/i.test(c) || /^#55/i.test(c)) ? 'Gray4' : 'BWRY';
    if (n === 6) return 'E6';
    return n ? n + 'c' : '';
}

function displayOptionText(def, key) {
    const name = (def && def.name) || key || '';
    const pal = paletteTag(def);
    return name + (pal ? ' · ' + pal : '');
}

function colorsForSelectValue(val) {
    if (val && EInkDef.DISPLAYS[val]) return EInkDef.DISPLAYS[val].colors || [];
    const def = displayDefForId(val);
    return (def && def.colors) || [];
}

function swatchesHtml(colors) {
    return (colors || []).map((c) =>
        '<span class="eink-swatch" title="' + c + '" style="background:' + c + '"></span>'
    ).join('');
}

function bindDisplaySwatches(sel) {
    if (!sel) return;
    let box = sel.nextElementSibling;
    if (!box || !box.classList.contains('eink-swatches')) {
        box = document.createElement('span');
        box.className = 'eink-swatches';
        sel.insertAdjacentElement('afterend', box);
        sel.addEventListener('change', () => {
            box.innerHTML = swatchesHtml(colorsForSelectValue(sel.value));
        });
    }
    box.innerHTML = swatchesHtml(colorsForSelectValue(sel.value));
}

function channelBaseUrl() {
    const path = location.pathname
        .replace(/\/shows\/[^/]+\/[^/]+\/[0-9A-Za-z]\/?$/, '/')
        .replace(/\/c\/[^/]+(\/[^/]+\/[0-9A-Za-z])?\/?$/, '/')
        .replace(/index\.html$/i, '');
    const base = location.origin + (path.endsWith('/') ? path : path + '/');
    return base.replace(/\/$/, '');
}

function urlForChannel(slug) {
    const root = channelBaseUrl();
    if (!slug) return root;
    return root + '/shows/' + slug;
}

function channelLabel(id, ch, short) {
    const rec = ch || currentChannels[id] || {};
    const user = rec.userId || rec.user || (id || '').split('/')[0] || id;
    const target = rec.groupId || rec.group || rec.target || (id || '').split('/')[1] || '';
    const path = user + (target ? '/' + target : '');
    const dname = short ? shortDisplayName(rec.displayId) : displayNameForId(rec.displayId);
    return path + (dname ? ' · ' + dname : '');
}

function applyShowsConfig(raw) {
    currentChannels = (raw && raw.channels && typeof raw.channels === 'object') ? raw.channels : {};
    currentDefaultChannel = (raw && raw.defaultChannel) || '';
    const activeShows = (raw && raw.activeShows) || {};
    const activeShowsMap = {};
    if (activeShows && typeof activeShows === 'object') {
        if (activeShows.Properties) {
            for (let prop of activeShows.Properties) {
                activeShowsMap[prop.Name] = prop.Value;
            }
        } else {
            for (let key in activeShows) {
                if (Object.prototype.hasOwnProperty.call(activeShows, key)) {
                    activeShowsMap[key] = activeShows[key];
                }
            }
        }
    }
    currentActiveShows = activeShowsMap;
    return activeShowsMap;
}

function fillDisplaySelect(sel, selectedId) {
    if (!sel) return;
    const keep = selectedId || sel.value;
    sel.innerHTML = '';
    Object.entries(EInkDef.DISPLAYS).forEach(([key, def]) => {
        if (!def.id) return;
        const o = document.createElement('option');
        o.value = def.id;
        o.text = displayOptionText(def, key);
        sel.appendChild(o);
    });
    if (keep && [...sel.options].some((o) => o.value === keep)) sel.value = keep;
    else if (EInkDef.DISPLAYS[defaultDisplayId]?.id) sel.value = EInkDef.DISPLAYS[defaultDisplayId].id;
    bindDisplaySwatches(sel);
}

function fillShowNameSelect(sel, names, selectedName, displayId) {
    if (!sel) return;
    const keep = selectedName !== undefined ? selectedName : sel.value;
    const filtered = displayId
        ? (names || []).filter((name) => currentShowDisplays[name] === displayId)
        : (names || []);
    sel.innerHTML = '<option value="">— none —</option>';
    filtered.forEach((name) => {
        const o = document.createElement('option');
        o.value = name;
        o.text = name;
        sel.appendChild(o);
    });
    if (keep && [...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

async function loadShowDisplays(showList) {
    const names = showList || [];
    await Promise.all(names.map(async (showName) => {
        try {
            const showRes = await new RESTX().promiseCall('getShow', { showName });
            currentShowDisplays[showName] = (showRes.ok && showRes.output.show)
                ? (showRes.output.show.displayId || '')
                : '';
        } catch (e) {
            if (currentShowDisplays[showName] == null) currentShowDisplays[showName] = '';
        }
    }));
}

function selectedChannelDisplayId() {
    const slug = getSelectedChannelSlug();
    if (!slug || slug === NEW_CHANNEL_VALUE) return '';
    return (currentChannels[slug] && currentChannels[slug].displayId) || '';
}

function displayKeyForId(displayId) {
    const id = String(displayId ?? '').trim();
    if (!id) return defaultDisplayId;
    if (EInkDef.DISPLAYS[id]) return id;
    const found = Object.entries(EInkDef.DISPLAYS).find(([, value]) =>
        String(value.id) === id
    );
    return found ? found[0] : defaultDisplayId;
}

function applyPhotoSettingsDisplay(charOrKey) {
    const key = displayKeyForId(charOrKey);
    const el = document.getElementById('displayID');
    if (el) el.value = key;
    const def = EInkDef.DISPLAYS[key];
    const label = document.getElementById('photoSettingsDisplayLabel');
    if (label) {
        const pal = paletteTag(def);
        label.innerHTML = ((def && def.name) || key) +
            (pal ? ' · ' + pal : '') +
            ' <span class="eink-swatches">' + swatchesHtml((def && def.colors) || []) + '</span>';
    }
    stdEInkConvert.displayID = key;
}

function syncPhotoSettingsDisplayFromContext() {
    const showName = getSelectedShowName();
    let id = selectedChannelDisplayId();
    if (showName && currentShowDisplays[showName]) id = currentShowDisplays[showName];
    applyPhotoSettingsDisplay(id);
}

window.UpdateGlobalChannelSelect = function () {
    const sel = document.getElementById('globalChannelSelect');
    if (!sel) return;
    const prev = sel.value;
    const slugs = Object.keys(currentChannels);
    sel.innerHTML = '';
    if (!slugs.length) {
        const empty = document.createElement('option');
        empty.value = '';
        empty.text = 'No channel — tap +';
        sel.appendChild(empty);
        return;
    }
    slugs.forEach((slug) => {
        const ch = currentChannels[slug] || {};
        const o = document.createElement('option');
        o.value = slug;
        o.text = channelLabel(slug, ch, true);
        sel.appendChild(o);
    });
    let pick = loadLastSelectedChannel();
    if (!pick || !currentChannels[pick]) pick = prev;
    if (!pick || !currentChannels[pick]) pick = currentDefaultChannel || slugs[0] || '';
    sel.value = pick;
    if (pick) saveLastSelectedChannel(pick);
    applyAddPhotosBusyControls();
};

window.ShowNewChannel = function () {
    window._forceNewChannel = true;
    window.ShowPage('Channels');
};

window.OnGlobalChannelChange = function () {
    if (window._addPhotosBusy) return;
    const slug = getSelectedChannelSlug();
    if (slug && slug !== NEW_CHANNEL_VALUE) {
        saveLastSelectedChannel(slug);
    }
    if (!slug) {
        window.ShowNewChannel();
        return;
    }
    const after = () => {
        if (window.UpdateButtonTitles) window.UpdateButtonTitles();
        if (window.UpdateButtonStates) window.UpdateButtonStates();
        if (window.UpdatePageTitleIfNeeded) window.UpdatePageTitleIfNeeded();
        syncPhotoSettingsDisplayFromContext();
        if (window._currentPageId === 'PhotoSettings' && currentFile) window.UpdateDisplay();
        if (window._currentPageId === 'Channels') window.LoadChannelsPage();
        if (window._currentPageId === 'AddNewShow') window.LoadAddNewShowPage();
        if (window._currentPageId === 'ActivateShow') window.LoadActivateShowPage();
    };
    if (window.UpdateGlobalShowSelect) {
        window.UpdateGlobalShowSelect().then(after);
        return;
    }
    after();
};

window.selectChannelInHeader = function (slug) {
    const sel = document.getElementById('globalChannelSelect');
    if (!sel) return;
    sel.value = slug || '';
    window.OnGlobalChannelChange();
};

// Update global show select with active show highlighting and display IDs
window.UpdateGlobalShowSelect = async function () {
    const sel = document.getElementById('globalShowSelect');
    if (!sel) return;
    if (window._updatingShowSelect) return;
    window._updatingShowSelect = true;
    
    try {
        const _res = await new RESTX().promiseCall('getShows');
        const raw = _res.output.shows;
        const activeShowsMap = applyShowsConfig(raw);
        if (window.UpdateGlobalChannelSelect) window.UpdateGlobalChannelSelect();
        const channelSlug = getSelectedChannelSlug();
        const selectedChannel = currentChannels[channelSlug] || null;
        const showList = selectedChannel ? (selectedChannel.shows || []) : [];
        
        if (showList && showList.length > 0) {
            sel.innerHTML = "";
            
            // Load display IDs for all shows in parallel
            const showPromises = showList.map(async (showName) => {
                try {
                    const showRes = await new RESTX().promiseCall('getShow', { showName: showName });
                    if (showRes.ok && showRes.output.show && showRes.output.show.displayId) {
                        return { name: showName, displayId: showRes.output.show.displayId };
                    }
                } catch (e) {
                    console.warn("Could not load displayId for show:", showName, e);
                }
                return { name: showName, displayId: null };
            });
            
            const showsWithDisplay = await Promise.all(showPromises);
            
            // Ensure we process shows in the same order as showList
            const orderedShows = showList.map(showName => {
                return showsWithDisplay.find(s => s.name === showName) || { name: showName, displayId: null };
            });
            orderedShows.forEach((show) => {
                currentShowDisplays[show.name] = show.displayId || '';
            });
            const filterDid = selectedChannel && selectedChannel.displayId ? selectedChannel.displayId : '';
            const visibleShows = filterDid
                ? orderedShows.filter((show) => show.displayId === filterDid)
                : orderedShows;
            const assignedShow = (selectedChannel && selectedChannel.showName) || '';
            
            // Channel picks the show. Fallback: last selected, then first visible.
            let showToSelect = assignedShow;
            if (showToSelect && !visibleShows.some((show) => show.name === showToSelect)) {
                showToSelect = '';
            }
            if (!showToSelect) {
                const last = loadLastSelectedShow();
                if (last && visibleShows.some((show) => show.name === last)) showToSelect = last;
            }
            if (!showToSelect && visibleShows.length > 0) {
                showToSelect = visibleShows[0].name;
            }
            
            if (!visibleShows.length) {
                const empty = document.createElement('option');
                empty.value = '';
                empty.text = filterDid ? 'No show for this display' : 'No shows';
                sel.appendChild(empty);
            }

            visibleShows.forEach(show => {
                let o = document.createElement('option');
                o.value = show.name;
                
                // Format display ID for display
                // displayId is a single character (0-z), convert it back to display name
                let displayText = '';
                if (show.displayId) {
                    const displayName = displayNameForId(show.displayId);
                    displayText = displayName ? ' (' + displayName + ')' : '';
                }
                
                const isActiveForChannel = !!assignedShow && show.name === assignedShow;
                
                // Mark only the show assigned to the selected channel
                let activeIndicator = '';
                if (isActiveForChannel) {
                    activeIndicator = '⭐ ';
                    o.setAttribute('data-active', 'true');
                    o.setAttribute('data-display-id', show.displayId);
                    o.style.backgroundColor = '#fff5f5';
                    o.style.color = '#d32f2f';
                }
                
                o.text = activeIndicator + show.name + displayText;
                // Ensure value is the pure show name (not directory path)
                o.value = show.name;
                
                sel.appendChild(o);
            });
            
            // Set selected value IMMEDIATELY after all options are added
            // Use multiple approaches to ensure it works
            const setSelectedValue = () => {
                if (showToSelect) {
                    // Find and select the option
                    const options = sel.options;
                    let found = false;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === showToSelect) {
                            // Set all three ways to ensure it works
                            sel.selectedIndex = i;
                            sel.value = showToSelect;
                            options[i].selected = true;
                            options[i].setAttribute('selected', 'selected');
                            found = true;
                            // Save as last selected
                            saveLastSelectedShow(showToSelect);
                            break;
                        }
                    }
                    return found;
                } else {
                    // If no show to select, at least select the first one
                    if (visibleShows.length > 0) {
                        const firstShow = visibleShows[0].name;
                        sel.value = firstShow;
                        sel.selectedIndex = 0;
                        if (sel.options[0]) {
                            sel.options[0].selected = true;
                            sel.options[0].setAttribute('selected', 'selected');
                        }
                        saveLastSelectedShow(firstShow);
                        return true;
                    }
                }
                return false;
            };
            
            // Try immediately
            const wasSet = setSelectedValue();
            
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                if (!wasSet || sel.value !== showToSelect) {
                    setSelectedValue();
                }
                // Ensure active show option keeps red color before change event
                const options = sel.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].getAttribute('data-active') === 'true') {
                        options[i].style.backgroundColor = '#fff5f5';
                        options[i].style.color = '#d32f2f';
                        options[i].style.fontWeight = 'bold';
                    }
                }
                // Trigger change event
                setTimeout(() => {
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    // Re-apply styles after change event in case browser resets them
                    setTimeout(() => {
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].getAttribute('data-active') === 'true') {
                                options[i].style.backgroundColor = '#fff5f5';
                                options[i].style.color = '#d32f2f';
                                options[i].style.fontWeight = 'bold';
                            }
                        }
                    }, 5);
                }, 10);
            });
            
            // Also try after a short delay as fallback
            setTimeout(() => {
                if (showToSelect && sel.value !== showToSelect) {
                    setSelectedValue();
                    // Ensure active show option keeps red color
                    const options = sel.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].getAttribute('data-active') === 'true') {
                            options[i].style.backgroundColor = '#fff5f5';
                            options[i].style.color = '#d32f2f';
                            options[i].style.fontWeight = 'bold';
                        }
                    }
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    // Re-apply styles after change event
                    setTimeout(() => {
                        for (let i = 0; i < options.length; i++) {
                            if (options[i].getAttribute('data-active') === 'true') {
                                options[i].style.backgroundColor = '#fff5f5';
                                options[i].style.color = '#d32f2f';
                                options[i].style.fontWeight = 'bold';
                            }
                        }
                    }, 5);
                }
            }, 50);
            
            // Update shows array
            shows = showList;
            
            if (window.UpdateGlobalChannelSelect) {
                window.UpdateGlobalChannelSelect();
            }
            // Update button titles and states
            if (window.UpdateButtonTitles) {
                window.UpdateButtonTitles();
            }
            // Update button states after a short delay to ensure DOM is updated
            setTimeout(() => {
                if (window.UpdateButtonStates) {
                    window.UpdateButtonStates();
                }
                if (window.UpdateActivateShowButton) {
                    window.UpdateActivateShowButton();
                }
                applyAddPhotosBusyControls();
                // Ensure active show option keeps red color after selection
                const options = sel.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].getAttribute('data-active') === 'true') {
                        options[i].style.backgroundColor = '#fff5f5';
                        options[i].style.color = '#d32f2f';
                        options[i].style.fontWeight = 'bold';
                    }
                }
            }, 100);
        } else {
            sel.innerHTML = '<option value="">-- No shows available --</option>';
            if (window.UpdateGlobalChannelSelect) window.UpdateGlobalChannelSelect();
            if (window.UpdateButtonTitles) window.UpdateButtonTitles();
            if (window.UpdateButtonStates) window.UpdateButtonStates();
        }
    } catch (err) {
        console.error("Error updating global show select:", err);
    } finally {
        window._updatingShowSelect = false;
        syncPhotoSettingsDisplayFromContext();
        applyAddPhotosBusyControls();
    }
};

// Preserve red color for active show options after selection
window.PreserveActiveShowStyles = function(selectElement) {
    if (!selectElement) selectElement = document.getElementById('globalShowSelect');
    if (!selectElement) return;
    
    const options = selectElement.options;
    for (let i = 0; i < options.length; i++) {
        if (options[i].getAttribute('data-active') === 'true') {
            options[i].style.backgroundColor = '#fff5f5';
            options[i].style.color = '#d32f2f';
            options[i].style.fontWeight = 'bold';
        }
    }
};

// Update button states based on whether they modify the current show
window.UpdateButtonStates = async function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    
    // Buttons that modify the current show
    const modifyButtons = ['btnDeleteShow', 'btnShowSettings', 'btnActivateShow', 'btnAddShowPhotos', 'btnManageShowPhotos', 'btnExportShow'];

    const selectedShowTrimmed = selectedShow ? selectedShow.trim() : '';
    const channelSlug = getSelectedChannelSlug();
    const isActive = !!selectedShowTrimmed && !!channelSlug &&
        currentChannels[channelSlug] &&
        (currentChannels[channelSlug].showName || '').trim() === selectedShowTrimmed;
    
    modifyButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (!selectedShow) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Create or select a show first.';
                btn.style.backgroundColor = '';
                btn.style.borderColor = '';
                btn.style.color = '';
                return;
            }
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            if (isActive) {
                // Current show is selected and active for its displayId - highlight button with light red tint
                btn.style.backgroundColor = '#ffe0e0';
                btn.style.borderColor = '#ff9999';
                btn.style.color = '#d32f2f';
                
                // For Activate Show button, also disable it when show is already active
                if (btnId === 'btnActivateShow') {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.title = 'This show is already assigned to the channel.';
                }
            } else {
                // Reset to default
                btn.style.backgroundColor = '';
                btn.style.borderColor = '';
                btn.style.color = '';
                
                // For Activate Show button, enable it when show is not active
                if (btnId === 'btnActivateShow') {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.title = 'Assign this show to the channel.';
                }
            }
        }
    });
};

// Get the currently visible page ID
window.GetCurrentPageId = function () {
    const pages = document.querySelectorAll('.page');
    for (let page of pages) {
        if (page.style.display === 'flex' || page.style.display === '') {
            return page.id;
        }
    }
    return null;
};

// Reload the current page if it's show-specific
window.ReloadCurrentPageIfNeeded = function () {
    if (window._addPhotosBusy) return;
    // Use stored page ID to avoid race conditions
    const currentPageId = window._currentPageId || window.GetCurrentPageId();
    if (!currentPageId) return;
    
    // Don't reload if we're on TopMenu
    if (currentPageId === 'TopMenu') return;
    
    // List of show-specific pages that should reload when show changes
    const showSpecificPages = [
        'ManageShowPhotos',  // Photos change per show
        'ShowSettings',      // Settings are per show
        'AddShowPhotos',     // Adding photos is per show
        'DeleteShow',        // Delete is per show
        'ActivateShow'       // Activate is per show
    ];
    
    if (showSpecificPages.includes(currentPageId)) {
        if (!getSelectedShowName()) {
            window.ShowPage(currentPageId === 'AddShowPhotos' || currentPageId === 'ManageShowPhotos'
                ? 'AddNewShow' : 'TopMenu');
            return;
        }
        // Reload the page by calling ShowPage again (which will call the appropriate Load function)
        // Use a small delay to ensure the show selection is fully updated
        setTimeout(() => {
            // Double-check that we're still on the same page (not TopMenu)
            const stillOnPage = window._currentPageId || window.GetCurrentPageId();
            // Only reload if we're still on the same show-specific page and not on TopMenu
            if (stillOnPage === currentPageId && stillOnPage !== 'TopMenu' && stillOnPage !== null) {
                // Additional check: make sure the page is actually visible
                const pageElement = document.getElementById(stillOnPage);
                if (pageElement && (pageElement.style.display === 'flex' || pageElement.style.display === '')) {
                    window.ShowPage(currentPageId);
                }
            }
        }, 50);
    }
};

window.UpdatePageTitleIfNeeded = function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    
    // Update the current page title if it contains <showName/>
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        if (page.style.display === 'flex' || page.style.display === '') {
            const pageId = page.id;
            const titleEl = page.querySelector('.page-title');
            if (titleEl && pageTitles[pageId]) {
                setPageTitle(titleEl, pageId);
            }
            
            // Update delete show name display if on DeleteShow page
            if (pageId === 'DeleteShow') {
                const displayEl = document.getElementById('deleteShowNameDisplay');
                if (displayEl) {
                    displayEl.innerText = selectedShow || '(no show selected)';
                }
            }
            // Update activate show name display if on ActivateShow page
            if (pageId === 'ActivateShow') {
                const displayEl = document.getElementById('activateShowNameDisplay');
                if (displayEl) {
                    displayEl.innerText = selectedShow || '(no show selected)';
                }
            }
        }
    });
    // Also update button titles
    if (window.UpdateButtonTitles) {
        window.UpdateButtonTitles();
    }
    // Update photo action buttons (Save Image, Add Photos) based on displayId match
    if (window.UpdatePhotoActionButtons) {
        window.UpdatePhotoActionButtons();
    }
    
    // Reload current page if it's show-specific
    window.ReloadCurrentPageIfNeeded();
};

window.UpdatePreview = async function () {
    const dID = document.getElementById('displayID').value;
    const isRound = dID.toLowerCase().includes('round') || dID.toLowerCase().includes('_rd');
    const imgEl = document.getElementById('testimg');
    const placeholderEl = document.getElementById('preview-placeholder');

    // IMPORTANT: The field names blackpoint vs blackPointAdjust were the issue here
    stdEInkConvert.colorSaturationAdjust = parseFloat(document.getElementById('saturation').value);
    stdEInkConvert.contrastAdjust = parseFloat(document.getElementById('contrast').value);
    stdEInkConvert.blackPointAdjust = parseFloat(document.getElementById('blackpoint').value);
    stdEInkConvert.whitePointAdjust = parseFloat(document.getElementById('whitepoint').value);
    stdEInkConvert.zoom = parseFloat(document.getElementById('zoom').value);
    stdEInkConvert.cutSpotX = parseFloat(document.getElementById('cutSpotX').value);
    stdEInkConvert.cutSpotY = parseFloat(document.getElementById('cutSpotY').value);
    stdEInkConvert.ditherType = document.getElementById('dither').value;
    stdEInkConvert.cutAspect = parseInt(document.getElementById('orientation').value);
    stdEInkConvert.cutBgrdColor = document.getElementById('bgrdColor').value;
    stdEInkConvert.displayID = dID;

    // Update labels
    document.getElementById('val-saturation').innerText = stdEInkConvert.colorSaturationAdjust.toFixed(1);
    document.getElementById('val-contrast').innerText = stdEInkConvert.contrastAdjust.toFixed(1);
    document.getElementById('val-blackpoint').innerText = stdEInkConvert.blackPointAdjust.toFixed(1);
    document.getElementById('val-whitepoint').innerText = stdEInkConvert.whitePointAdjust.toFixed(1);
    document.getElementById('val-zoom').innerText = stdEInkConvert.zoom.toFixed(1);
    document.getElementById('val-cutSpotX').innerText = stdEInkConvert.cutSpotX.toFixed(2);
    document.getElementById('val-cutSpotY').innerText = stdEInkConvert.cutSpotY.toFixed(2);

    saveSettingsToStorage();

    // Check if image is loaded
    if (!currentInk) {
        // No image loaded - show placeholder text, hide image
        if (placeholderEl) placeholderEl.style.display = 'block';
        if (imgEl) imgEl.style.display = 'none';
        // Hide focus marker
        const marker = document.getElementById('focus-marker');
        if (marker) marker.style.display = 'none';
        return;
    }

    // Try to convert - if it fails, the image is not yet loaded
    try {
        // Image is loaded - show image, hide placeholder
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (imgEl) {
            imgEl.style.display = 'block';
            if (isRound) imgEl.classList.add('is-round');
            else imgEl.classList.remove('is-round');
        }

        currentInk.Convert(stdEInkConvert);
        currentInk.Show('testimg');
    } catch (e) {
        // Image is not yet fully loaded - show placeholder, hide image
        // This is expected when no image is loaded or image is still loading
        if (placeholderEl) placeholderEl.style.display = 'block';
        if (imgEl) imgEl.style.display = 'none';
        // Hide focus marker
        const marker = document.getElementById('focus-marker');
        if (marker) marker.style.display = 'none';
        return;
    }

    // Update focus point marker after image is loaded
    // Use setTimeout to ensure the image is rendered before calculating position
    setTimeout(() => {
        window.updateFocusMarker();
    }, 50);
    
    // Update button states based on displayId match
    window.UpdatePhotoActionButtons();

    const encoded = await currentInk.Encode();
    const b64 = encoded.toBase64();
    // Store as data URI format
    const dataURI = await currentInk.GetDataURI(encoded);
    document.getElementById('encoded_string').value = dataURI;
    document.getElementById('encoded_length').innerText = encoded.length;
    document.getElementById('encoded_64_length').innerText = b64.length;
};

window.updateFocusMarker = function () {
    const imgEl = document.getElementById('testimg');
    const marker = document.getElementById('focus-marker');
    
    if (!imgEl || !marker) {
        if (marker) marker.style.display = 'none';
        return;
    }

    // Wait for image to be loaded
    if (!imgEl.complete || imgEl.naturalWidth === 0) {
        // Try again after a short delay
        setTimeout(() => window.updateFocusMarker(), 100);
        return;
    }

    // If no AI detection, hide marker
    if (!aiDetectedSpot) {
        marker.style.display = 'none';
        return;
    }

    // Get current settings
    const zoom = parseFloat(document.getElementById('zoom').value);
    const orientation = parseInt(document.getElementById('orientation').value);
    const displayID = document.getElementById('displayID').value;
    const display = EInkDef.DISPLAYS[displayID];
    
    if (!display || !currentInk) {
        marker.style.display = 'none';
        return;
    }

    // Get the actual display size of the image element
    const rect = imgEl.getBoundingClientRect();
    
    // Check if image has valid dimensions
    if (rect.width === 0 || rect.height === 0) {
        marker.style.display = 'none';
        return;
    }
    
    // Calculate the crop area in the original image (mirroring EInk.Convert logic)
    let dw = display.width;
    let dh = display.height;
    let rotate = false;
    
    if (orientation === EInkDef.PORTRAIT) {
        rotate = true;
        [dw, dh] = [dh, dw];
    }
    
    const imgOrgWidth = aiDetectedSpot.originalWidth;
    const imgOrgHeight = aiDetectedSpot.originalHeight;
    
    // Calculate aspect ratio
    let targetAspect = dw / dh;
    if (orientation === EInkDef.PORTRAIT) {
        targetAspect = dh / dw;
    }
    
    let sw = imgOrgWidth;
    let sh = imgOrgHeight;
    let imgAspect = sw / sh;
    
    if (imgAspect > targetAspect) {
        sw = sh * targetAspect;
    } else {
        sh = sw / targetAspect;
    }
    
    // Apply zoom
    sw /= zoom;
    sh /= zoom;
    
    // Calculate crop position (centered on current cutSpot, not AI spot)
    const cutSpotX = parseFloat(document.getElementById('cutSpotX').value);
    const cutSpotY = parseFloat(document.getElementById('cutSpotY').value);
    
    let sx = (imgOrgWidth * cutSpotX) - (sw / 2);
    let sy = (imgOrgHeight * cutSpotY) - (sh / 2);
    
    // Clamp to image bounds
    if (sw <= imgOrgWidth) sx = Math.max(0, Math.min(sx, imgOrgWidth - sw));
    if (sh <= imgOrgHeight) sy = Math.max(0, Math.min(sy, imgOrgHeight - sh));
    
    // Calculate AI-detected position in original image coordinates (pixels)
    const aiX = aiDetectedSpot.x * imgOrgWidth;
    const aiY = aiDetectedSpot.y * imgOrgHeight;
    
    // Check if AI-detected point is within the current crop area
    if (aiX < sx || aiX > sx + sw || aiY < sy || aiY > sy + sh) {
        // AI-detected point is outside the visible crop area
        marker.style.display = 'none';
        return;
    }
    
    // Calculate position relative to crop area (0-1 within crop)
    const relX = (aiX - sx) / sw;
    const relY = (aiY - sy) / sh;
    
    // Map to displayed image coordinates
    // Account for rotation in portrait mode
    let x, y;
    if (rotate) {
        // Hochkant: gleiche Zuordnung wie EInk.Convert (−90°)
        x = relY * rect.width;
        y = (1 - relX) * rect.height;
    } else {
        x = relX * rect.width;
        y = relY * rect.height;
    }
    
    marker.style.left = x + 'px';
    marker.style.top = y + 'px';
    marker.style.display = 'block';
};

window.ResetToDefault = async function () {
    localStorage.removeItem(SETTINGS_KEY);
    document.getElementById('saturation').value = 1.8;
    document.getElementById('contrast').value = 1.4;
    document.getElementById('blackpoint').value = 1.0;
    document.getElementById('whitepoint').value = 1.1;
    document.getElementById('zoom').value = 1.0;
    document.getElementById('cutSpotX').value = 0.5;
    document.getElementById('cutSpotY').value = 0.5;
    document.getElementById('dither').value = 'floyd';
    document.getElementById('orientation').value = 0;
    const saveAspect = document.getElementById('saveAspect');
    const saveAspectAdd = document.getElementById('saveAspectAdd');
    if (saveAspect) saveAspect.value = 'both';
    if (saveAspectAdd) saveAspectAdd.value = 'both';
    const autoEl = document.getElementById('autoOptimize');
    const autoAddEl = document.getElementById('autoOptimizeAdd');
    if (autoEl) autoEl.checked = true;
    if (autoAddEl) autoAddEl.checked = true;
    document.getElementById('bgrdColor').value = "#ffffff";
    syncPhotoSettingsDisplayFromContext();
    if (currentInk) {
        window.UpdateDisplay();
    }
};

async function previewAfterLoad() {
    if (isAutoOptimizeEnabled() && currentFile) {
        await window.AutoOptimizeCurrentImage({ silent: true });
    } else {
        window.UpdatePreview();
    }
}

window.InputImageChange = function (ev) {
    if (ev.target.files.length > 0) {
        currentFile = ev.target.files[0];
        currentInk = new EInk(currentFile, document.getElementById('displayID').value);
        aiDetectedSpot = null; // Reset AI detection when new image is loaded
        // Enable all controls when a new image file is loaded
        window.SetPhotoSettingsControlsEnabled(true);
        currentInk.Load().then(() => previewAfterLoad());
    }
};

window.UpdateDisplay = function () {
    if (currentFile) {
        currentInk = new EInk(currentFile, document.getElementById('displayID').value);
        currentInk.Load().then(() => previewAfterLoad());
    } else {
        window.UpdatePreview();
    }
    // Update button states when display changes
    if (window.UpdatePhotoActionButtons) {
        window.UpdatePhotoActionButtons();
    }
};

window.AutoDetectCenter = async function () {
    if (!currentInk || !currentFile) {
        alert("Please select an image first!");
        return;
    }
    const btn = event.currentTarget;

    // IMPORTANT: If the model is not loaded yet, we only load it 
    // through the local function, never directly via cocoSsd.load()!
    if (!detectorModel) {
        btn.innerText = "⏳ Loading model...";
        btn.disabled = true;
        try {
        await LoadKIModel();
        } catch (loadErr) {
            alert("AI could not be loaded: " + loadErr.message + "\n\nCheck the console (F12) for details.");
            btn.innerText = "AI Auto-Center";
            btn.disabled = false;
            return;
        }
    }

    if (!detectorModel) {
        alert("AI could not be loaded. Check the console (F12).");
        btn.innerText = "AI Auto-Center";
        btn.disabled = false;
        return;
    }

    try {
        btn.innerText = "⏳ Scanning...";
        btn.disabled = true;

        // IMPORTANT: Use the original image, not the processed testimg
        // The original image is loaded directly from the file, independent of portrait/landscape
        const originalImg = new Image();
        const imgUrl = URL.createObjectURL(currentFile);
        
        await new Promise((resolve, reject) => {
            originalImg.onload = resolve;
            originalImg.onerror = reject;
            originalImg.src = imgUrl;
        });

        const predictions = await detectorModel.detect(originalImg);
        
        // Cleanup
        URL.revokeObjectURL(imgUrl);

        if (predictions.length > 0) {
            const focus = FocusSpotFromPredictions(predictions, originalImg.naturalWidth, originalImg.naturalHeight);
            const best = [...predictions].sort((a, b) => b.score - a.score).find(p => p.class === 'person')
                || [...predictions].sort((a, b) => b.score - a.score)[0];

            aiDetectedSpot = {
                x: focus.cutSpotX,
                y: focus.cutSpotY,
                originalWidth: originalImg.naturalWidth,
                originalHeight: originalImg.naturalHeight
            };

            document.getElementById('cutSpotX').value = focus.cutSpotX;
            document.getElementById('cutSpotY').value = focus.cutSpotY;

            console.log(`Focus on ${focus.label} (${(best.score * 100).toFixed(0)}%) at (${(focus.cutSpotX * 100).toFixed(1)}%, ${(focus.cutSpotY * 100).toFixed(1)}%)`);
            window.UpdatePreview();
        } else {
            alert("Nothing detected – try a different image.");
        }
    } catch (err) {
        console.error("AI detection error:", err);
        alert("AI error: " + (err.message || err.toString()));
    } finally {
        btn.innerText = "AI Auto-Center";
        btn.disabled = false;
    }
};

function applyOptimizedSettingsToForm(opt) {
    if (!opt) return;
    const setVal = (id, value) => {
        const el = document.getElementById(id);
        if (el && value !== undefined && value !== null) el.value = value;
    };
    setVal('saturation', opt.colorSaturationAdjust);
    setVal('contrast', opt.contrastAdjust);
    setVal('blackpoint', opt.blackPointAdjust);
    setVal('whitepoint', opt.whitePointAdjust);
    setVal('zoom', opt.zoom);
    setVal('dither', opt.ditherType);
    setVal('cutSpotX', opt.cutSpotX);
    setVal('cutSpotY', opt.cutSpotY);
}

async function loadImageFromFile(file) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
    });
    img._objectUrl = url;
    return img;
}

function releaseLoadedImage(img) {
    if (img && img._objectUrl) {
        URL.revokeObjectURL(img._objectUrl);
        img._objectUrl = null;
    }
}

window.AutoOptimizeCurrentImage = async function (opts) {
    const silent = !!(opts && opts.silent);
    if (!currentInk || !currentFile) {
        if (!silent) alert("Please select an image first!");
        return;
    }

    const btn = document.getElementById('AutoOptimizeBtn');
    const prevLabel = btn ? btn.innerText : '';
    if (btn) {
        btn.innerText = "⏳ Optimizing...";
        btn.disabled = true;
    }

    try {
        if (!detectorModel) {
            try {
                await LoadKIModel();
            } catch (loadErr) {
                if (!silent) console.warn("AI model unavailable, using histogram only:", loadErr);
            }
        }

        const originalImg = await loadImageFromFile(currentFile);
        const displayID = document.getElementById('displayID').value;
        let result;
        try {
            result = await OptimizeImageForEink(originalImg, {
                display: EInkDef.DISPLAYS[displayID],
                detectorModel
            });
        } finally {
            releaseLoadedImage(originalImg);
        }

        applyOptimizedSettingsToForm(result.settings);
        if (result.focus && result.focus.label) {
            aiDetectedSpot = {
                x: result.settings.cutSpotX,
                y: result.settings.cutSpotY,
                originalWidth: originalImg.naturalWidth,
                originalHeight: originalImg.naturalHeight
            };
        }
        window.UpdatePreview();
    } catch (err) {
        console.error("Auto-optimize error:", err);
        if (!silent) alert("Auto-optimize error: " + (err.message || err.toString()));
        else window.UpdatePreview();
    } finally {
        if (btn) {
            btn.innerText = prevLabel || "✨ Auto Optimize";
            btn.disabled = false;
        }
    }
};

async function LoadKIModel() {
    try {
        console.log("AI: Initializing TensorFlow...");
        
        // Wait until TensorFlow.js is fully loaded
        if (typeof tf === 'undefined') {
            throw new Error("TensorFlow.js is not loaded. Check the CDN connection.");
        }
        
        if (typeof cocoSsd === 'undefined') {
            throw new Error("COCO-SSD is not loaded. Check the CDN connection.");
        }
        
        // Wait until TensorFlow is fully ready
        await tf.ready();

        // Backend packages are already loaded, wait briefly for initialization
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Try to use CPU backend (usually more reliable)
        const currentBackend = tf.getBackend();
        console.log(`AI: Current backend: ${currentBackend}`);
        
        // If WebGL is active, try to switch to CPU
        if (currentBackend === 'webgl') {
            try {
                console.log("AI: Switching from WebGL to CPU backend...");
                await tf.setBackend('cpu');
                await tf.ready();
                console.log("AI: CPU backend activated.");
            } catch (cpuErr) {
                console.warn("AI: CPU backend could not be activated, using WebGL:", cpuErr);
            }
        }
        
        const activeBackend = tf.getBackend();
        console.log(`AI: TensorFlow ready. Backend: ${activeBackend}`);
        
        // Test if the backend works - use simple operations
        try {
            // Simple test without cast operation
            const testTensor = tf.tensor1d([1, 2, 3]);
            const result = testTensor.sum();
            const value = await result.data();
            testTensor.dispose();
            result.dispose();
            console.log("AI: Backend test successful.");
        } catch (testErr) {
            console.error("AI: Backend test failed:", testErr);
            // We don't throw an error here, as the backend might still work
            console.warn("AI: Backend test failed, but we'll still try to load the model...");
        }

        const root = (typeof channelBaseUrl === 'function' ? channelBaseUrl() : '') || location.origin;
        const localUrl = root + '/src/libs/models/model.json';
        console.log("AI: Loading local COCO-SSD model…", localUrl);
        try {
            detectorModel = await cocoSsd.load({
                base: 'lite_mobilenet_v2',
                modelUrl: localUrl
            });
        } catch (localErr) {
            console.warn("AI: Local model failed, trying CDN:", localErr);
            detectorModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        }
        console.log("AI: Model loaded.");

        if (!detectorModel) {
            throw new Error("Model could not be loaded");
        }

        console.log("AI: Successfully loaded and ready.");
    } catch (e) {
        console.error("AI: Error:", e);
        detectorModel = null;
        throw e; // Weiterwerfen, damit der Aufrufer es sieht
    }
}

window.addEventListener('DOMContentLoaded', () => {
    initI18n().then(() => {
        if (window.UpdateButtonTitles) window.UpdateButtonTitles();
        if (window.UpdatePageTitleIfNeeded) window.UpdatePageTitleIfNeeded();
    });
    const lidSel = document.getElementById('appLid');
    if (lidSel) lidSel.addEventListener('change', () => {
        setLid(lidSel.value);
        if (window.UpdateButtonTitles) window.UpdateButtonTitles();
        if (window.UpdatePageTitleIfNeeded) window.UpdatePageTitleIfNeeded();
    });
    loadSettingsFromStorage();
    syncPhotoSettingsDisplayFromContext();
    // Load AI model and hide overlay when done
    Promise.all([
        window.UpdateGlobalShowSelect().then(() => {
            // Ensure the selected value is still set after all updates
            // Use multiple checks to ensure it stays set
            const checkAndSetValue = () => {
                const sel = document.getElementById('globalShowSelect');
                if (!sel) return;
                
                const lastSelected = loadLastSelectedShow();
                let showToSelect = lastSelected || '';
                
                // Verify the show still exists
                if (showToSelect) {
                    let exists = false;
                    for (let i = 0; i < sel.options.length; i++) {
                        if (sel.options[i].value === showToSelect) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        showToSelect = '';
                    }
                }
                
                // If still no show, select the first one
                if (!showToSelect && sel.options.length > 0) {
                    showToSelect = sel.options[0].value;
                }
                
                // Set the value if it's not already set correctly
                if (showToSelect && sel.value !== showToSelect) {
                    sel.value = showToSelect;
                    for (let i = 0; i < sel.options.length; i++) {
                        if (sel.options[i].value === showToSelect) {
                            sel.selectedIndex = i;
                            sel.options[i].selected = true;
                            saveLastSelectedShow(showToSelect);
                            break;
                        }
                    }
                }
            };
            
            // Check immediately
            checkAndSetValue();
            
            // Check again after a short delay
            setTimeout(checkAndSetValue, 50);
            
            // Check again after a longer delay
            setTimeout(checkAndSetValue, 200);
            
            // Update button titles after shows are loaded
            setTimeout(() => {
                if (window.UpdateButtonTitles) {
                    window.UpdateButtonTitles();
                }
                if (window.UpdateButtonStates) {
                    window.UpdateButtonStates();
                }
                if (window.UpdateActivateShowButton) {
                    window.UpdateActivateShowButton();
                }
            }, 100);
        }),
        LoadKIModel().catch(err => {
            console.warn("AI model could not be loaded at startup, will be loaded on first use:", err);
            return null; // Return null instead of throwing to allow Promise.all to complete
        })
    ]).then(() => {
        // Everything is loaded, hide the overlay
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            // Remove overlay from DOM after fade-out animation
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
        // Setup drag and drop for initial page load
        setTimeout(() => {
            if (window.SetupDragAndDrop) {
                window.SetupDragAndDrop();
            }
        }, 500);
    }).catch(err => {
        console.error("Error during initialization:", err);
        // Hide overlay even on error
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
    });
    
    window.UpdateButtonTitles = function () {
        const selectedShow = document.getElementById('globalShowSelect')?.value || '';
    Object.keys(pageTitles).forEach(id => {
        const btn = document.getElementById('btn' + id);
        if (btn) {
                let title = t(pageTitles[id], { showName: selectedShow, channelName: selectedChannelLabel() });
                title = titleWithShow(title, selectedShow);
                if (title.includes('<channelName/>')) {
                    title = title.replace(/<channelName\/>/g, selectedChannelLabel());
                }
                btn.innerText = title;
                btn.onclick = () => window.ShowPage(id);
        }
    });
    };
    
    // Initial button setup
    window.UpdateButtonTitles();
    if (window.UpdateButtonStates) {
        window.UpdateButtonStates();
    }
    if (window.UpdateActivateShowButton) {
        window.UpdateActivateShowButton();
    }
    window.UpdatePreview();
    window.ShowPage('TopMenu');
    
    
    // Update focus point marker on window resize
    window.addEventListener('resize', window.updateFocusMarker);
});

window.SaveCurImage = function () {
    const activeShow = document.getElementById('globalShowSelect').value;
    const messageDiv = document.getElementById('saveImageMessage');
    
    if (!activeShow) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Check if displayId matches (additional check, button should already be disabled)
    window.CheckShowDisplayIdMatch().then(checkResult => {
        if (!checkResult.match && checkResult.showDisplayId) {
            const photoSettingsDisplayId = document.getElementById('displayID')?.value || defaultDisplayId;
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = `Cannot save: Show is configured for display '${checkResult.showDisplayId}', but Photo Settings is set to '${photoSettingsDisplayId}'. Please change Photo Settings Display to match the show.`;
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
            return;
        }
        
        // Continue with save if match
        saveImageToShow();
    });
    
    return;
    
    function saveImageToShow() {
        // Show loading message
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#3498db';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Saving image...";
        
        // Get the value from textarea - it should already be a data URI
        let imgData = document.getElementById('encoded_string').value;
        // If it's not a data URI yet, convert it
        if (!imgData.startsWith('data:')) {
            imgData = EInk.GetDataURIByBase64(imgData);
        }
        
        // Check if we're replacing an existing image
        const saveParams = {
            show: activeShow, 
            showName: activeShow,
            img: imgData
        };
        
        // If optimizing (replacing existing image), include the target image name
        if (window._optimizeTargetImageName) {
            saveParams.replaceImageName = window._optimizeTargetImageName;
        }
        
        new RESTX().promiseCall('saveShowImage', saveParams).then(() => {
            // Show success message
            messageDiv.style.background = '#27ae60';
            messageDiv.innerText = window._optimizeTargetImageName 
                ? `Image "${window._optimizeTargetImageName}" replaced successfully!`
                : "Image saved successfully!";
            
            // Clear optimization target
            window._optimizeTargetImageName = null;
            
            // Hide message after 2 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
        }).catch(err => {
            // Show error message
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: " + (err.message || err.toString());
            // Hide message after 3 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        });
    }
};

// Enable/disable photo settings controls based on whether we have an original image
window.SetPhotoSettingsControlsEnabled = function(enabled) {
    const controls = [
        'bgrdColor',
        'saturation',
        'contrast',
        'blackpoint',
        'whitepoint',
        'zoom',
        'cutSpotX',
        'cutSpotY',
        'dither',
        'orientation'
    ];
    
    const buttons = [
        'AutoSpotBtn',
        'AutoOptimizeBtn',
        'ResetToDefault'
    ];
    
    controls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !enabled;
            el.style.opacity = enabled ? '1' : '0.5';
            el.style.cursor = enabled ? '' : 'not-allowed';
        }
    });
    
    buttons.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !enabled;
            el.style.opacity = enabled ? '1' : '0.5';
            el.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    });
};

// Load image from Base64 string (expects data:image/ink;base64,... format)
window.LoadImageFromBase64 = async function () {
    const base64Textarea = document.getElementById('encoded_string');
    const base64String = base64Textarea.value.trim();
    
    if (!base64String) {
        const messageDiv = document.getElementById('saveImageMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Please enter a Base64 string!";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
        }
        return;
    }
    
    try {
        // Check if it's a data URI (data:image/ink;base64,...)
        let cleanBase64 = base64String;
        
        if (cleanBase64.startsWith('data:')) {
            // Extract base64 part after comma
            if (cleanBase64.includes(',')) {
                cleanBase64 = cleanBase64.split(',')[1];
            } else {
                throw new Error("Invalid data URI format. Expected: data:image/ink;base64,<base64string>");
            }
        } else if (cleanBase64.includes(',')) {
            // Also handle case where comma is present but not data: prefix
            cleanBase64 = cleanBase64.split(',')[1];
        }
        
        // Convert Base64 to Uint8Array
        const uint8Array = cleanBase64.ToUint8Array();
        
        // Read display ID and orientation from the encoded data
        // New format (Version 1): [version=1, displayIdChar, dither, orient, ...]
        // Old format (Version 0): [displayIdChar, dither, orient, minCodeSize, ...]
        if (uint8Array.length < 4) {
            throw new Error("Invalid encoded data: too short");
        }
        
        let storedIdChar, storedOrient;
        if (uint8Array[0] === 1) {
            // New format (Version 1)
            storedIdChar = String.fromCharCode(uint8Array[1]);
            storedOrient = uint8Array[3]; // 0 = landscape, 1 = portrait
        } else {
            // Old format (Version 0)
            storedIdChar = String.fromCharCode(uint8Array[0]);
            storedOrient = uint8Array[2]; // 0 = landscape, 1 = portrait
        }
        
        // Find display entry by ID character
        const displayEntry = Object.entries(EInkDef.DISPLAYS).find(([k, v]) => v.id === storedIdChar);
        if (!displayEntry) {
            throw new Error(`Display ID '${storedIdChar}' not found in display definitions`);
        }
        
        const decodedDisplayID = displayEntry[0];
        const decodedDisplayName = displayEntry[1].name || decodedDisplayID.replace(/^EINK_/, '');
        const decodedOrientation = storedOrient === 1 ? EInkDef.PORTRAIT : EInkDef.LANDSCAPE;
        
        applyPhotoSettingsDisplay(decodedDisplayID);
        
        const orientationSelect = document.getElementById('orientation');
        if (orientationSelect) {
            // orientation value: 0 = landscape, -1 = portrait
            orientationSelect.value = decodedOrientation === EInkDef.PORTRAIT ? '-1' : '0';
        }
        
        // Create EInk instance with Uint8Array and decoded display ID
        currentInk = new EInk(uint8Array, decodedDisplayID);
        currentFile = null; // Clear file reference since we're loading from Base64
        aiDetectedSpot = null; // Reset AI detection
        
        // Load and decode (this will call Decode internally)
        // When Load() is called with Uint8Array, it calls Decode() which fills #imgCnvCnv
        await currentInk.Load();
        
        // After Load(), Decode() has been called and the canvas is ready
        // Display the decoded image directly (no conversion needed, it's already decoded)
        // The Decode() method has already filled the canvas, so we can show it directly
        const placeholderEl = document.getElementById('preview-placeholder');
        const imgEl = document.getElementById('testimg');
        if (placeholderEl) placeholderEl.style.display = 'none';
        if (imgEl) imgEl.style.display = 'block';
        currentInk.Show('testimg');
        
        // Update UI settings to match decoded values
        const dID = currentInk.displayID;
        const isRound = dID.toLowerCase().includes('round') || dID.toLowerCase().includes('_rd');
        if (imgEl) {
            if (isRound) imgEl.classList.add('is-round');
            else imgEl.classList.remove('is-round');
        }
        
        // Update focus point marker after image is loaded
        setTimeout(() => {
            if (window.updateFocusMarker) {
                window.updateFocusMarker();
            }
        }, 50);
        
        // Update button states based on displayId match
        if (window.UpdatePhotoActionButtons) {
            window.UpdatePhotoActionButtons();
        }
        
        // Re-encode to update the Base64 string in textarea
        const encoded = await currentInk.Encode();
        const b64 = encoded.toBase64();
        const dataURI = await currentInk.GetDataURI(encoded);
        document.getElementById('encoded_string').value = dataURI;
        
        // Update length displays
        document.getElementById('encoded_length').innerText = encoded.length;
        document.getElementById('encoded_64_length').innerText = b64.length;
        
        // Disable all controls except file input (no original image to work with)
        window.SetPhotoSettingsControlsEnabled(false);
        
        // Show success message
        const messageDiv = document.getElementById('saveImageMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#27ae60';
            messageDiv.style.color = 'white';
            messageDiv.innerText = `Image decoded successfully! Display: ${decodedDisplayName}, Orientation: ${decodedOrientation === EInkDef.PORTRAIT ? 'Portrait' : 'Landscape'}. Controls disabled - no original image available.`;
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 4000);
        }
        
    } catch (err) {
        console.error("Error loading image from Base64:", err);
        const messageDiv = document.getElementById('saveImageMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Error: " + (err.message || err.toString());
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
};

// Copy Base64 string to clipboard
window.CopyBase64ToClipboard = async function () {
    const base64Textarea = document.getElementById('encoded_string');
    const base64String = base64Textarea.value.trim();
    
    if (!base64String) {
        const messageDiv = document.getElementById('saveImageMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "No Base64 string to copy!";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
        }
        return;
    }
    
    try {
        await navigator.clipboard.writeText(base64String);
        const messageDiv = document.getElementById('saveImageMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#27ae60';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Base64 string copied to clipboard!";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
        }
    } catch (err) {
        console.error("Error copying to clipboard:", err);
        // Fallback: select text
        base64Textarea.select();
        base64Textarea.setSelectionRange(0, 99999); // For mobile devices
        try {
            document.execCommand('copy');
            const messageDiv = document.getElementById('saveImageMessage');
            if (messageDiv) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = '#27ae60';
                messageDiv.style.color = 'white';
                messageDiv.innerText = "Base64 string copied to clipboard!";
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 2000);
            }
        } catch (fallbackErr) {
            const messageDiv = document.getElementById('saveImageMessage');
            if (messageDiv) {
                messageDiv.style.display = 'block';
                messageDiv.style.background = '#e74c3c';
                messageDiv.style.color = 'white';
                messageDiv.innerText = "Error copying to clipboard. Please copy manually.";
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 3000);
            }
        }
    }
};

function fillRestHourSelect(sel, value) {
    if (!sel) return;
    if (sel.options.length === 0) {
        for (let h = 0; h < 24; h++) {
            const o = document.createElement('option');
            o.value = String(h);
            o.textContent = String(h).padStart(2, '0') + ':00';
            sel.appendChild(o);
        }
    }
    const n = Number(value);
    sel.value = (Number.isInteger(n) && n >= 0 && n <= 23) ? String(n) : '22';
}

function applyShowSettingsForm(show) {
    const modeSelect = document.getElementById('showMode');
    const timerInput = document.getElementById('showTimer');
    const restStart = document.getElementById('showRestStart');
    const restEnd = document.getElementById('showRestEnd');
    if (modeSelect) modeSelect.value = (show && show.mode) || 'random';
    if (timerInput) timerInput.value = (show && show.timer) || 1;
    fillRestHourSelect(restStart, show && show.restStart !== undefined ? show.restStart : 22);
    fillRestHourSelect(restEnd, show && show.restEnd !== undefined ? show.restEnd : 6);
}

window.LoadShowSettingsPage = function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    const messageDiv = document.getElementById('showSettingsMessage');
    
    if (!showName) {
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Please select a show first!";
        }
        return;
    }
    
    // Clear message
    if (messageDiv) messageDiv.style.display = 'none';
    
    // Load current show settings
    new RESTX().promiseCall('getShow', {
        showName: showName
    }).then(_res => {
        if (_res.ok && _res.output.show) {
            applyShowSettingsForm(_res.output.show);
        } else {
            applyShowSettingsForm(null);
        }
    }).catch(err => {
        console.error("Error loading show settings:", err);
        applyShowSettingsForm(null);
    });
};

window.SaveShowSettings = function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    const messageDiv = document.getElementById('showSettingsMessage');
    const modeSelect = document.getElementById('showMode');
    const timerInput = document.getElementById('showTimer');
    const restStartInput = document.getElementById('showRestStart');
    const restEndInput = document.getElementById('showRestEnd');
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show first!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    const showMode = modeSelect ? modeSelect.value : 'random';
    const showTimer = timerInput ? parseInt(timerInput.value) : 1;
    const showRestStart = restStartInput ? parseInt(restStartInput.value, 10) : 22;
    const showRestEnd = restEndInput ? parseInt(restEndInput.value, 10) : 6;
    
    if (showTimer < 1 || showTimer > 1440) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Timer must be between 1 and 1440 minutes!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Show loading message
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Saving settings...";
    
    if (showRestStart < 0 || showRestStart > 23 || showRestEnd < 0 || showRestEnd > 23) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Rest hours must be between 0 and 23.";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }

    new RESTX().promiseCall('setShowSettings', {
        showName: showName,
        showMode: showMode,
        showTimer: showTimer,
        showRestStart: showRestStart,
        showRestEnd: showRestEnd
    }).then(_res => {
        if (_res.ok) {
            // Show success message
            messageDiv.style.background = '#27ae60';
            messageDiv.innerText = "Settings saved successfully!";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
        } else {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: Could not save settings.";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }).catch(err => {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: " + (err.message || err.toString());
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    });
};

// Update the Process button text to show number of selected files
window.UpdateAddPhotosButtonText = function () {
    const fileInput = document.getElementById('addPhotosInput');
    const processBtn = document.getElementById('btnProcessAndAddPhotos');
    if (processBtn && fileInput) {
        const fileCount = fileInput.files ? fileInput.files.length : 0;
        if (fileCount > 0) {
            processBtn.textContent = `📸 Process and Add Photos (${fileCount} file${fileCount !== 1 ? 's' : ''} selected)`;
        } else {
            processBtn.textContent = '📸 Process and Add Photos';
        }
    }
};

// Flag to track if processing should be stopped
window._stopAddPhotos = false;

// Stop the Add Photos process
window.StopAddPhotos = function() {
    window._stopAddPhotos = true;
    const messageDiv = document.getElementById('addPhotosMessage');
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#f39c12';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Stopping processing...";
    }
};

window.ProcessAndAddPhotos = async function () {
    const fileInput = document.getElementById('addPhotosInput');
    const messageDiv = document.getElementById('addPhotosMessage');
    const progressDiv = document.getElementById('addPhotosProgress');
    const progressBar = document.getElementById('addPhotosProgressBar');
    const progressText = document.getElementById('addPhotosProgressText');
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show first!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select at least one image!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }

    if (window._addPhotosBusy) return;

    window._stopAddPhotos = false;
    setAddPhotosBusy(true);

    let showDisplayId = null;
    let processedCount = 0;
    let totalFiles = 0;
    let stopped = false;
    try {
        try {
            const showRes = await new RESTX().promiseCall('getShow', { showName: showName });
            if (showRes.ok && showRes.output.show && showRes.output.show.displayId) {
                showDisplayId = showRes.output.show.displayId;
            }
        } catch (err) {
            console.error("Error loading show displayId:", err);
        }
    
    if (!detectorModel) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#3498db';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Loading AI model...";
        try {
            await LoadKIModel();
        } catch (loadErr) {
            console.warn("AI unavailable, adding photos without subject detection:", loadErr);
            messageDiv.style.background = '#f39c12';
            messageDiv.innerText = "AI unavailable — adding photos without subject detection.";
        }
    }
    
    const files = Array.from(fileInput.files);
    totalFiles = files.length;
    let successCount = 0;
    let errorCount = 0;
    
    // Show progress
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.innerText = `Processing 0 of ${totalFiles} images...`;
    const stopBtn = document.getElementById('addPhotosStopBtn');
    if (stopBtn) stopBtn.style.display = 'block';
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = `Processing ${totalFiles} image(s)...`;
    
    // Get displayId from show (convert single char ID to display key)
    let displayIDKey = defaultDisplayId;
    if (showDisplayId) {
        // Find the display entry by ID
        displayIDKey = displayKeyForId(showDisplayId);
    }
    
    // Get current photo settings (but use displayId from show, not from Photo Settings)
    const settings = {
        colorSaturationAdjust: parseFloat(document.getElementById('saturation').value),
        contrastAdjust: parseFloat(document.getElementById('contrast').value),
        blackPointAdjust: parseFloat(document.getElementById('blackpoint').value),
        whitePointAdjust: parseFloat(document.getElementById('whitepoint').value),
        zoom: parseFloat(document.getElementById('zoom').value),
        ditherType: document.getElementById('dither').value,
        cutBgrdColor: document.getElementById('bgrdColor').value,
        displayID: displayIDKey  // Use displayId from show, not from Photo Settings
    };
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        // Check if stop was requested
        if (window._stopAddPhotos) {
            processedCount = i;
            break;
        }
        
        const file = files[i];
        try {
            // Step 1: AI Spot Detection
            const originalImg = new Image();
            const imgUrl = URL.createObjectURL(file);
            
            await new Promise((resolve, reject) => {
                originalImg.onload = resolve;
                originalImg.onerror = reject;
                originalImg.src = imgUrl;
            });
            
            let predictions = [];
            if (detectorModel) {
                try {
                    predictions = await detectorModel.detect(originalImg);
                } catch (detectErr) {
                    console.warn("AI detect skipped:", detectErr);
                }
            }
            URL.revokeObjectURL(imgUrl);

            let imageSettings = { ...settings };
            let spotX = 0.5;
            let spotY = 0.5;

            if (isAutoOptimizeEnabled()) {
                const opt = await OptimizeImageForEink(originalImg, {
                    display: EInkDef.DISPLAYS[displayIDKey],
                    predictions
                });
                imageSettings = {
                    ...settings,
                    ...opt.settings,
                    displayID: displayIDKey
                };
                spotX = opt.settings.cutSpotX;
                spotY = opt.settings.cutSpotY;
            } else if (predictions.length > 0) {
                const focus = FocusSpotFromPredictions(predictions, originalImg.naturalWidth, originalImg.naturalHeight);
                spotX = focus.cutSpotX;
                spotY = focus.cutSpotY;
            }
            
            const saveAspect = getSaveAspect();
            const wantLandscape = saveAspect !== 'portrait';
            const wantPortrait = saveAspect !== 'landscape';

            const encodeAndSave = async (cutAspect, extraSave) => {
                const ink = new EInk(file, displayIDKey);
                await ink.Load();
                ink.Convert(new EInkDef({
                    ...imageSettings,
                    cutAspect,
                    cutSpotX: spotX,
                    cutSpotY: spotY
                }));
                const encoded = await ink.Encode();
                const dataUri = EInk.GetDataURIByBase64(encoded.toBase64());
                const res = await new RESTX().promiseCall('saveShowImage', {
                    show: showName,
                    showName: showName,
                    img: dataUri,
                    ...(extraSave || {})
                });
                if (res && res.ok && res.output && res.output.imgName) {
                    window.originalImages[res.output.imgName] = file;
                    return res.output.imgName;
                }
                return null;
            };

            let landscapeImageName = null;
            if (wantLandscape) {
                landscapeImageName = await encodeAndSave(EInkDef.LANDSCAPE);
                if (landscapeImageName) successCount++;
            }
            if (wantPortrait) {
                const extra = {};
                if (landscapeImageName) extra.referenceName = landscapeImageName;
                const portraitName = await encodeAndSave(EInkDef.PORTRAIT, extra);
                if (portraitName) successCount++;
            }
        } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            errorCount++;
        }
        
        processedCount++;
        const progress = (processedCount / totalFiles) * 100;
        progressBar.style.width = progress + '%';
        progressText.innerText = `Processing ${processedCount} of ${totalFiles} images... (${successCount} saved, ${errorCount} errors)`;
    }
    
    // Hide stop button
    const stopBtnFinal = document.getElementById('addPhotosStopBtn');
    if (stopBtnFinal) stopBtnFinal.style.display = 'none';
    
    const saveAspectDone = getSaveAspect();
    const versionsHint = saveAspectDone === 'landscape'
        ? 'landscape only'
        : saveAspectDone === 'portrait'
            ? 'portrait only'
            : 'landscape + portrait';

    // Show final result
    progressDiv.style.display = 'none';
    if (window._stopAddPhotos) {
        messageDiv.style.background = '#f39c12';
        messageDiv.innerText = `Processing stopped. Processed ${processedCount} of ${totalFiles} image(s). ${successCount} versions saved (${versionsHint}), ${errorCount} error(s).`;
    } else if (errorCount === 0) {
        messageDiv.style.background = '#27ae60';
        messageDiv.innerText = `Successfully processed ${totalFiles} image(s)! ${successCount} versions saved (${versionsHint}).`;
    } else {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = `Processed ${processedCount} image(s). ${successCount} versions saved (${versionsHint}), ${errorCount} error(s).`;
    }
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
    
    stopped = window._stopAddPhotos;
    } finally {
        fileInput.value = '';
        window.UpdateAddPhotosButtonText();
        window._stopAddPhotos = false;
        setAddPhotosBusy(false);
    }

    if (!stopped && processedCount > 0) {
        setTimeout(() => {
            window.ShowPage('ManageShowPhotos');
        }, 1000);
    }
};

window.LoadManageShowPhotosPage = function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const originalShowName = globalSelect ? globalSelect.value : '';
    const messageDiv = document.getElementById('managePhotosMessage');
    const gridDiv = document.getElementById('managePhotosGrid');
    const emptyDiv = document.getElementById('managePhotosEmpty');
    
    if (!originalShowName) {
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Please select a show first!";
        }
        if (gridDiv) gridDiv.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'block';
        return;
    }
    
    // Convert show name to safe format for file paths (add show_ prefix if not present)
    // getShows returns original show names WITHOUT show_ prefix, but directories use show_ prefix
    // getShow expects the original name (it calls GetSafeShowName internally)
    let safeShowName = originalShowName;
    if (!safeShowName.startsWith('show_')) {
        // Clean the name and add show_ prefix (matching GetSafeShowName logic)
        const cleanedName = safeShowName.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/^_+|_+$/g, '');
        safeShowName = 'show_' + cleanedName;
    }
    
    // Clear message
    if (messageDiv) messageDiv.style.display = 'none';
    if (gridDiv) gridDiv.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px;">Loading photos...</div>';
    if (emptyDiv) emptyDiv.style.display = 'none';
    
    // Load show photos - use original show name for getShow (it will convert internally)
    new RESTX().promiseCall('getShow', {
        showName: originalShowName,
        channel: getSelectedChannelSlug()
    }).then(_res => {
        if (_res.ok && _res.output.show && _res.output.show.imgs) {
            const imgs = _res.output.show.imgs;
            const show = _res.output.show;
            if (gridDiv) gridDiv.innerHTML = '';
            
            // Remove old duration info container by ID if it exists
            const oldDurationContainer = document.getElementById('durationInfoContainer');
            if (oldDurationContainer) {
                oldDurationContainer.remove();
            }
            
            // ALSO remove any orphan duration divs from before the fix (they don't have IDs)
            const orphanDivs = gridDiv.parentElement.querySelectorAll('div[style*="background:#ecf0f1"]');
            orphanDivs.forEach(div => {
                // Only remove if it's a duration info div (has the specific structure)
                if (div.innerHTML.includes('Landscape') && div.innerHTML.includes('Portrait') && div.innerHTML.includes('Timer')) {
                    div.remove();
                }
            });
            
            if (imgs.length === 0) {
                if (emptyDiv) emptyDiv.style.display = 'block';
                return;
            }
            
            if (emptyDiv) emptyDiv.style.display = 'none';
            
            // Calculate show duration by orientation
            const timer = show.timer || 5; // Default 5 minutes
            let landscapeCount = 0;
            let portraitCount = 0;
            
            imgs.forEach(imgName => {
                if (imgName && imgName.length > 0) {
                    const firstChar = imgName.charAt(0);
                    if (firstChar === '0' || firstChar === '2') {
                        landscapeCount++; // Landscape and Landscape inverted
                    } else if (firstChar === '1' || firstChar === '3') {
                        portraitCount++; // Portrait and Portrait inverted
                    }
                }
            });
            
            const landscapeDuration = landscapeCount * timer; // in minutes
            const portraitDuration = portraitCount * timer; // in minutes
            
            // Format duration (convert to hours if >= 60 minutes)
            const formatDuration = (minutes) => {
                if (minutes >= 60) {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
                }
                return `${minutes}min`;
            };
            
            // Get display aspect ratio and geometry from show's displayId
            let displayAspectRatio = 1.0; // Default to square
            let thumbnailHeight = 120; // Default height
            let isRoundDisplay = false; // Default to square
            if (show.displayId) {
                const display = displayDefForId(show.displayId);
                if (display) {
                    if (display.width && display.height) {
                        displayAspectRatio = display.width / display.height;
                        // Calculate thumbnail height based on aspect ratio (width is 100%, so height = width / aspectRatio)
                        // Use a base width of 150px (minmax in grid) for calculation
                        thumbnailHeight = Math.round(150 / displayAspectRatio);
                        // Clamp between 80px and 200px for reasonable sizes
                        thumbnailHeight = Math.max(80, Math.min(200, thumbnailHeight));
                    }
                    // Check if display is round
                    if (display.geometry === EInkDef.GEOMETRY_ROUND) {
                        isRoundDisplay = true;
                        // For round displays, use square aspect ratio and equal dimensions
                        displayAspectRatio = 1.0;
                        thumbnailHeight = 150; // Square thumbnails for round displays
                    }
                }
            }
            
            // Calculate safe show name for file paths (with show_ prefix)
            let safeShowNameForPaths = originalShowName;
            if (!safeShowNameForPaths.startsWith('show_')) {
                const cleanedName = safeShowNameForPaths.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/^_+|_+$/g, '');
                safeShowNameForPaths = 'show_' + cleanedName;
            }
            
            // Display show duration info above grid (ONCE, not per image!)
            const durationContainer = document.createElement('div');
            durationContainer.id = 'durationInfoContainer';
            const durationInfo = document.createElement('div');
            durationInfo.style.cssText = 'background:#ecf0f1; padding:12px; border-radius:8px; margin-bottom:15px; font-size:0.95rem; display:flex; justify-content:space-around; gap:15px;';
            durationInfo.innerHTML = `
                <div style="text-align:center; flex:1;">
                    <div style="font-weight:bold; color:#2c3e50; margin-bottom:4px;">↔️ Landscape</div>
                    <div style="color:#555;">${landscapeCount} photos · ${formatDuration(landscapeDuration)}</div>
                </div>
                <div style="text-align:center; flex:1;">
                    <div style="font-weight:bold; color:#2c3e50; margin-bottom:4px;">↕️ Portrait</div>
                    <div style="color:#555;">${portraitCount} photos · ${formatDuration(portraitDuration)}</div>
                </div>
                <div style="text-align:center; flex:1;">
                    <div style="font-weight:bold; color:#2c3e50; margin-bottom:4px;">⏱️ Timer</div>
                    <div style="color:#555;">${timer} min/photo</div>
                </div>
            `;
            durationContainer.appendChild(durationInfo);
            gridDiv.parentElement.insertBefore(durationContainer, gridDiv);
            
            // Load each image as thumbnail
            imgs.forEach((imgName, index) => {
                const thumbnailDiv = document.createElement('div');
                thumbnailDiv.style.cssText = 'position:relative; background:#f0f0f0; border-radius:8px; padding:10px; text-align:center;';
                const thumbId = `thumb_${index}_${Date.now()}`;
                // Style for round or square thumbnails
                const containerBorderRadius = isRoundDisplay ? '50%' : '4px';
                const containerStyle = isRoundDisplay 
                    ? `width:${thumbnailHeight}px; height:${thumbnailHeight}px; margin:0 auto;`
                    : `width:100%; height:${thumbnailHeight}px;`;
                const canvasStyle = isRoundDisplay
                    ? `max-width:100%; max-height:100%; object-fit:cover; border-radius:50%;`
                    : `max-width:100%; max-height:100%; object-fit:contain;`;
                
                // Determine orientation from first character of filename
                let orientationIcon = '📐'; // Default
                let orientationText = 'Unknown';
                if (imgName && imgName.length > 0) {
                    const firstChar = imgName.charAt(0);
                    switch(firstChar) {
                        case '0':
                            orientationIcon = '↔️'; // Landscape
                            orientationText = 'Landscape';
                            break;
                        case '1':
                            orientationIcon = '↕️'; // Portrait
                            orientationText = 'Portrait';
                            break;
                        case '2':
                            orientationIcon = '↔️'; // Landscape inverted
                            orientationText = 'Landscape (180°)';
                            break;
                        case '3':
                            orientationIcon = '↕️'; // Portrait inverted
                            orientationText = 'Portrait (270°)';
                            break;
                    }
                }
                
                // Check if original image is available for re-optimization
                const hasOriginal = window.originalImages && window.originalImages[imgName];
                const optimizeBtn = hasOriginal 
                    ? `<button onclick="window.OptimizeShowPhoto('${imgName.replace(/'/g, "\\'")}')" style="width:100%; padding:6px; background:#3498db; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9rem; margin-bottom:5px;">⚙️ Optimize</button>`
                    : '';
                
                thumbnailDiv.innerHTML = `
                    <div style="${containerStyle} background:#ddd; border-radius:${containerBorderRadius}; margin-bottom:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; aspect-ratio:${displayAspectRatio}; position:relative;">
                        <canvas id="${thumbId}" style="${canvasStyle}"></canvas>
                        <div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:white; padding:4px 6px; border-radius:4px; font-size:0.8rem; line-height:1; z-index:10;" title="${orientationText}">${orientationIcon}</div>
                    </div>
                    ${optimizeBtn}
                    <button onclick="window.DeleteShowPhoto('${imgName.replace(/'/g, "\\'")}')" style="width:100%; padding:6px; background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.9rem;">🗑️ Delete</button>
                `;
                gridDiv.appendChild(thumbnailDiv);
                
                // Wait for DOM to be ready before accessing the canvas
                // Use setTimeout to ensure the element is in the DOM
                setTimeout(() => {
                    // Load and decode the .ink file to display as thumbnail on canvas
                    // Images are stored as .ink files in /shows/show_{showName}/{imgName}
                    // Use safeShowNameForPaths (with show_ prefix) for file paths
                    const imgUrl = `/shows/${show.relDir || safeShowNameForPaths}/${imgName}`;
                    fetch(imgUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            return response.arrayBuffer();
                        })
                        .then(buffer => {
                            const uint8Array = new Uint8Array(buffer);
                            // Use displayId from show, not from Photo Settings
                            let displayIDKey = defaultDisplayId;
                            if (show && show.displayId) {
                                displayIDKey = displayKeyForId(show.displayId);
                            }
                            const ink = new EInk(uint8Array, displayIDKey);
                            ink.Load().then(() => {
                                // Decode the .ink file (renders to internal canvas)
                                ink.Decode(uint8Array);
                                
                                // Render to canvas using Show method (creates data URI internally, but we use canvas)
                                const thumbCanvas = document.getElementById(thumbId);
                                if (thumbCanvas) {
                                    // Create temporary img to get decoded image from EInk
                                    const tempImgId = 'temp_' + thumbId;
                                    // Remove old tempImg if it exists
                                    const oldTempImg = document.getElementById(tempImgId);
                                    if (oldTempImg && oldTempImg.parentNode) {
                                        oldTempImg.parentNode.removeChild(oldTempImg);
                                    }
                                    const tempImg = document.createElement('img');
                                    tempImg.id = tempImgId;
                                    tempImg.style.display = 'none';
                                    document.body.appendChild(tempImg);
                                    
                                    // Wait a bit to ensure element is in DOM, then call Show
                                    setTimeout(() => {
                                        // Show method decodes and sets tempImg.src to data URI
                                        ink.Show(tempImgId);
                                        
                                        // Function to draw image to canvas with proper scaling
                                        const drawImageToCanvas = () => {
                                            if (!tempImg.complete || !tempImg.naturalWidth) {
                                                return false;
                                            }
                                            
                                            const ctx = thumbCanvas.getContext('2d');
                                            // Use display from show, not from Photo Settings
                                            const display = EInkDef.DISPLAYS[displayIDKey] || EInkDef.DISPLAYS[defaultDisplayId];
                                            
                                            // Get container size (calculated based on display aspect ratio)
                                            const containerHeight = thumbnailHeight;
                                            const containerWidth = thumbCanvas.parentElement ? thumbCanvas.parentElement.clientWidth : 150;
                                            
                                            // Calculate thumbnail size maintaining aspect ratio
                                            const displayAspect = display.width / display.height;
                                            let thumbWidth, thumbHeight;
                                            
                                            if (displayAspect > 1) {
                                                // Landscape: fit to width
                                                thumbWidth = containerWidth;
                                                thumbHeight = containerWidth / displayAspect;
                                            } else {
                                                // Portrait: fit to height
                                                thumbHeight = containerHeight;
                                                thumbWidth = containerHeight * displayAspect;
                                            }
                                            
                                            // Set canvas size to thumbnail size
                                            thumbCanvas.width = thumbWidth;
                                            thumbCanvas.height = thumbHeight;
                                            
                                            // Clear canvas with white background
                                            ctx.fillStyle = '#ffffff';
                                            ctx.fillRect(0, 0, thumbWidth, thumbHeight);
                                            
                                            // Draw the image scaled to thumbnail size
                                            try {
                                                ctx.drawImage(tempImg, 0, 0, thumbWidth, thumbHeight);
                                                return true;
                                            } catch (err) {
                                                console.error("Error drawing image for", imgName, err);
                                                return false;
                                            }
                                        };
                                        
                                        // Always wait for onload to ensure image is fully loaded
                                        tempImg.onload = () => {
                                            if (drawImageToCanvas()) {
                                                if (document.body.contains(tempImg)) {
                                                    document.body.removeChild(tempImg);
                                                }
                                            }
                                        };
                                        
                                        // If image is already loaded, try to draw immediately
                                        if (tempImg.complete && tempImg.naturalWidth > 0) {
                                            if (drawImageToCanvas()) {
                                                if (document.body.contains(tempImg)) {
                                                    document.body.removeChild(tempImg);
                                                }
                                            }
                                        }
                                        
                                        // Fallback timeout
                                        setTimeout(() => {
                                            if (tempImg.complete && tempImg.naturalWidth > 0) {
                                                drawImageToCanvas();
                                            }
                                            if (document.body.contains(tempImg)) {
                                                document.body.removeChild(tempImg);
                                            }
                                        }, 1000);
                                    }, 10);
                                } else {
                                    console.warn("LoadManageShowPhotosPage: thumbCanvas not found for", imgName, "- element may not be in DOM yet, retrying...");
                                    // Retry after a short delay
                                    setTimeout(() => {
                                        const thumbCanvasRetry = document.getElementById(thumbId);
                                        if (thumbCanvasRetry) {
                                            // Retry the rendering process
                                            const tempImgId = 'temp_' + thumbId;
                                            // Remove old tempImg if it exists
                                            const oldTempImg = document.getElementById(tempImgId);
                                            if (oldTempImg && oldTempImg.parentNode) {
                                                oldTempImg.parentNode.removeChild(oldTempImg);
                                            }
                                            const tempImg = document.createElement('img');
                                            tempImg.id = tempImgId;
                                            tempImg.style.display = 'none';
                                            document.body.appendChild(tempImg);
                                            
                                            setTimeout(() => {
                                                ink.Show(tempImgId);
                                                const drawImageToCanvas = () => {
                                                    if (!tempImg.complete || !tempImg.naturalWidth) {
                                                        return false;
                                                    }
                                                    const ctx = thumbCanvasRetry.getContext('2d');
                                                    const display = EInkDef.DISPLAYS[displayIDKey] || EInkDef.DISPLAYS[defaultDisplayId];
                                                    const containerHeight = thumbnailHeight;
                                                    const containerWidth = thumbCanvasRetry.parentElement ? thumbCanvasRetry.parentElement.clientWidth : 150;
                                                    const displayAspect = display.width / display.height;
                                                    let thumbWidth, thumbHeight;
                                                    if (displayAspect > 1) {
                                                        thumbWidth = containerWidth;
                                                        thumbHeight = containerWidth / displayAspect;
                                                    } else {
                                                        thumbHeight = containerHeight;
                                                        thumbWidth = containerHeight * displayAspect;
                                                    }
                                                    thumbCanvasRetry.width = thumbWidth;
                                                    thumbCanvasRetry.height = thumbHeight;
                                                    ctx.fillStyle = '#ffffff';
                                                    ctx.fillRect(0, 0, thumbWidth, thumbHeight);
                                                    try {
                                                        ctx.drawImage(tempImg, 0, 0, thumbWidth, thumbHeight);
                                                        if (document.body.contains(tempImg)) {
                                                            document.body.removeChild(tempImg);
                                                        }
                                                        return true;
                                                    } catch (err) {
                                                        console.error("Error drawing image for", imgName, err);
                                                        return false;
                                                    }
                                                };
                                                tempImg.onload = () => {
                                                    drawImageToCanvas();
                                                    if (document.body.contains(tempImg)) {
                                                        document.body.removeChild(tempImg);
                                                    }
                                                };
                                                if (tempImg.complete && tempImg.naturalWidth > 0) {
                                                    if (drawImageToCanvas()) {
                                                        if (document.body.contains(tempImg)) {
                                                            document.body.removeChild(tempImg);
                                                        }
                                                    }
                                                }
                                            }, 50);
                                        }
                                    }, 100);
                                }
                            }).catch(err => {
                                console.error(`Error loading thumbnail for ${imgName}:`, err);
                                const thumbCanvas = document.getElementById(thumbId);
                                if (thumbCanvas) {
                                    const parent = thumbCanvas.parentElement;
                                    if (parent) {
                                        parent.innerHTML = '<div style="color:#999; padding:20px;">Preview unavailable</div>';
                                    }
                                }
                            });
                        })
                        .catch(err => {
                            console.error(`Error fetching ${imgName}:`, err);
                            const thumbCanvas = document.getElementById(thumbId);
                            if (thumbCanvas) {
                                const parent = thumbCanvas.parentElement;
                                if (parent) {
                                    parent.innerHTML = '<div style="color:#999; padding:20px;">Preview unavailable</div>';
                                }
                            }
                        });
                });
            });
        } else {
            if (gridDiv) gridDiv.innerHTML = '';
            if (emptyDiv) emptyDiv.style.display = 'block';
        }
    }).catch(err => {
        console.error("Error loading show photos:", err);
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Error loading photos: " + (err.message || err.toString());
        }
        if (gridDiv) gridDiv.innerHTML = '';
        if (emptyDiv) emptyDiv.style.display = 'block';
    });
};

window.OptimizeShowPhoto = async function (imgName) {
    // Check if original image is available
    if (!window.originalImages || !window.originalImages[imgName]) {
        alert("Original image not available. Please re-add the photo to enable optimization.");
        return;
    }
    
    const originalFile = window.originalImages[imgName];
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    
    if (!showName) {
        alert("Please select a show first!");
        return;
    }
    
    // Navigate to Photo Settings page and load the original image
    // Set currentFile so Photo Settings can use it
    currentFile = originalFile;
    
    // Load the image into Photo Settings
    const fileInput = document.getElementById('photoSettingsInput');
    if (fileInput) {
        // Create a new FileList with the original file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(originalFile);
        fileInput.files = dataTransfer.files;
        
        // Trigger change event to load the image
        const changeEvent = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(changeEvent);
    }
    
    // Navigate to Photo Settings
    window.ShowPage('PhotoSettings');
    
    // Show message that this is for replacing the existing image
    setTimeout(() => {
        const messageDiv = document.getElementById('photoSettingsMessage');
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#3498db';
            messageDiv.style.color = 'white';
            messageDiv.innerText = `Optimizing "${imgName}". Adjust settings and click "Save Image" to replace the existing image.`;
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }, 500);
    
    // Store the target image name for replacement
    window._optimizeTargetImageName = imgName;
};

window.DeleteShowPhoto = function (imgName) {
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    const messageDiv = document.getElementById('managePhotosMessage');
    
    if (!showName) {
        if (messageDiv) {
            messageDiv.style.display = 'block';
            messageDiv.style.background = '#e74c3c';
            messageDiv.style.color = 'white';
            messageDiv.innerText = "Please select a show first!";
        }
        return;
    }
    
    // Show confirmation
    if (!confirm(`Are you sure you want to delete the photo "${imgName}"?`)) {
        return;
    }
    
    // Show loading message
    if (messageDiv) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#3498db';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Deleting photo...";
    }
    
    new RESTX().promiseCall('deleteShowImage', {
        showName: showName,
        imgName: imgName
    }).then(_res => {
        if (_res.ok) {
            // Remove from originalImages if it was stored
            if (window.originalImages && window.originalImages[imgName]) {
                delete window.originalImages[imgName];
            }
            
            // Clean up any existing tempImg elements before reloading
            const existingTempImgs = document.querySelectorAll('img[id^="temp_"]');
            existingTempImgs.forEach(img => {
                if (img.parentNode) {
                    img.parentNode.removeChild(img);
                }
            });
            // Reload photos
            window.LoadManageShowPhotosPage();
            if (messageDiv) {
                messageDiv.style.background = '#27ae60';
                messageDiv.innerText = "Photo deleted successfully!";
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 2000);
            }
        } else {
            if (messageDiv) {
                messageDiv.style.background = '#e74c3c';
                messageDiv.innerText = "Error: Could not delete photo.";
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 3000);
            }
        }
    }).catch(err => {
        if (messageDiv) {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: " + (err.message || err.toString());
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    });
};

window.LoadDeleteShowPage = function () {
    // Update the display of the show name to be deleted
    const displayEl = document.getElementById('deleteShowNameDisplay');
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    if (displayEl) {
        displayEl.innerText = selectedShow || '(no show selected)';
    }
    // Clear message
    const messageDiv = document.getElementById('deleteShowMessage');
    if (messageDiv) messageDiv.style.display = 'none';
};

window.LoadActivateShowPage = async function () {
    const displayEl = document.getElementById('activateShowNameDisplay');
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    if (displayEl) {
        displayEl.innerText = selectedShow || '(no show selected)';
    }
    const messageDiv = document.getElementById('activateShowMessage');
    if (messageDiv) messageDiv.style.display = 'none';

    let selectedShowDisplayId = null;
    if (selectedShow) {
        try {
            const showRes = await new RESTX().promiseCall('getShow', { showName: selectedShow });
            if (showRes.ok && showRes.output.show) selectedShowDisplayId = showRes.output.show.displayId || null;
        } catch (e) { /* ignore */ }
    }
    const chSel = document.getElementById('activateChannelSelect');
    if (chSel) {
        chSel.innerHTML = '';
        const matching = Object.entries(currentChannels).filter(([, ch]) =>
            selectedShowDisplayId && ch.displayId === selectedShowDisplayId
        );
        if (!matching.length) {
            const o = document.createElement('option');
            o.value = '';
            o.text = selectedShowDisplayId
                ? 'No channel for this display — create one first'
                : 'No channels yet';
            chSel.appendChild(o);
        } else {
            const headerSlug = getSelectedChannelSlug();
            const prefer = matching.some(([slug]) => slug === headerSlug)
                ? headerSlug
                : currentDefaultChannel;
            matching.forEach(([slug, ch]) => {
                const o = document.createElement('option');
                o.value = slug;
                o.text = channelLabel(slug, ch, true) +
                    (ch.showName ? ' → ' + ch.showName : '');
                if (slug === prefer) o.selected = true;
                chSel.appendChild(o);
            });
        }
    }
    window.UpdateActivateShowButton();
};

window.UpdateActivateShowButton = async function () {
    const activateBtn = document.getElementById('activateShowBtn');
    if (!activateBtn) return;
    
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    
    if (!selectedShow) {
        activateBtn.disabled = true;
        activateBtn.style.opacity = '0.5';
        activateBtn.style.cursor = 'not-allowed';
        activateBtn.title = 'Please select a show first.';
        return;
    }
    
    // Get the displayId of the selected show
    let selectedShowDisplayId = null;
    try {
        const showRes = await new RESTX().promiseCall('getShow', { showName: selectedShow });
        if (showRes.ok && showRes.output.show && showRes.output.show.displayId) {
            selectedShowDisplayId = showRes.output.show.displayId;
        }
    } catch (e) {
        console.warn("Could not load displayId for selected show:", selectedShow, e);
    }
    
    // Check if the selected show is active for its displayId
    const selectedShowTrimmed = selectedShow ? selectedShow.trim() : '';
    const chSel = document.getElementById('activateChannelSelect');
    const channelSlug = chSel ? chSel.value : '';
    const assigned = channelSlug && currentChannels[channelSlug] &&
        currentChannels[channelSlug].showName === selectedShowTrimmed;
    
    if (!channelSlug) {
        activateBtn.disabled = true;
        activateBtn.style.opacity = '0.5';
        activateBtn.style.cursor = 'not-allowed';
        activateBtn.title = 'Create a matching channel first.';
    } else if (assigned) {
        activateBtn.disabled = true;
        activateBtn.style.opacity = '0.5';
        activateBtn.style.cursor = 'not-allowed';
        activateBtn.title = 'This show is already assigned to the channel.';
    } else {
        activateBtn.disabled = false;
        activateBtn.style.opacity = '1';
        activateBtn.style.cursor = 'pointer';
        activateBtn.title = 'Assign this show to the channel.';
    }
};

window.ActivateSelectedShow = function () {
    const messageDiv = document.getElementById('activateShowMessage');
    const globalSelect = document.getElementById('globalShowSelect');
    // Get the pure show name from the select value (not directory path)
    let showName = globalSelect ? globalSelect.value : '';
    // Ensure we have the pure show name, not a path
    if (showName && showName.includes('/')) {
        showName = showName.split('/').pop();
    }
    if (showName && showName.includes('\\')) {
        showName = showName.split('\\').pop();
    }
    showName = showName ? showName.trim() : '';
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show to activate!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Show loading message
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Activating show...";
    
    const channelSlug = document.getElementById('activateChannelSelect')?.value || '';
    new RESTX().promiseCall('setActiveShow', {
        showName: showName,
        channel: channelSlug
    }).then(async _res => {
        if (_res.ok) {
            // Update global show select to reflect the new active show
            // Wait for it to complete before continuing
            await window.UpdateGlobalShowSelect();
            
            // Ensure the select value is set correctly
            const sel = document.getElementById('globalShowSelect');
            if (sel) {
                sel.value = showName;
            }
            
            // Update button state since show is now active
            if (window.UpdateActivateShowButton) {
                await window.UpdateActivateShowButton();
            }
            
            // Show success message
            messageDiv.style.background = '#27ae60';
            messageDiv.innerText = "Show '" + showName + "' activated successfully!";
            
            // Hide message after 2 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
            
            // Return to menu after a short delay
            setTimeout(() => {
                window.Return2TopMenu();
            }, 2000);
        } else {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: Could not activate show.";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }).catch(err => {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: " + (err.message || err.toString());
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    });
};

window.DeleteSelectedShow = function () {
    const messageDiv = document.getElementById('deleteShowMessage');
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show to delete!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Show confirmation dialog
    if (!confirm("Are you sure you want to delete the show '" + showName + "'?\n\nThis action cannot be undone!")) {
        return;
    }
    
    // Show loading message
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Deleting show...";
    
    new RESTX().promiseCall('deleteShow', {
        showName: showName
    }).then(_res => {
        if (_res.ok) {
            // Update global show select
            window.UpdateGlobalShowSelect();
            
            // Show success message
            messageDiv.style.background = '#27ae60';
            messageDiv.innerText = "Show '" + showName + "' deleted successfully!";
            
            // Hide message after 2 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
            
            // Return to menu after a short delay
            setTimeout(() => {
                window.Return2TopMenu();
            }, 2000);
        } else {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: Could not delete show.";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }).catch(err => {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: " + (err.message || err.toString());
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    });
};

window.ExportSelectedShow = function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    const messageDiv = document.getElementById('exportShowMessage');
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a show to export!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Start operation - disable back buttons
    window.StartOperation();
    
    // Show loading message
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Exporting show...";
    
    new RESTX().promiseCall('exportShow', {
        showName: showName
    }).then(_res => {
        if (_res.ok && _res.output.showZip) {
            // Convert base64 to blob and download
            const base64Data = _res.output.showZip;
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = showName + '.show';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Show success message
            messageDiv.style.background = '#27ae60';
            messageDiv.innerText = "Show exported successfully!";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 2000);
            
            // End operation - re-enable back buttons
            window.EndOperation();
        } else {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: Could not export show.";
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
            
            // End operation - re-enable back buttons
            window.EndOperation();
        }
    }).catch(err => {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: " + (err.message || err.toString());
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        
        // End operation - re-enable back buttons
        window.EndOperation();
    });
};

window.ImportShow = function () {
    const fileInput = document.getElementById('importShowInput');
    const messageDiv = document.getElementById('importShowMessage');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please select a ZIP file to import!";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
        return;
    }
    
    // Start operation - disable back buttons
    window.StartOperation();
    
    const file = fileInput.files[0];
    
    // Show loading message
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Importing show...";
    
    // Read file as base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const bytes = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binaryString);
        
        console.log('Import data size:', base64Data.length, 'bytes');
        console.log('Import data preview:', base64Data.substring(0, 100));
        
        // Call import service
        new RESTX().promiseCall('importShow', {
            importShow: base64Data
        }).then(_res => {
            if (_res.ok) {
                // Update shows list
                new RESTX().promiseCall('getShows').then(_res2 => {
                    const raw = _res2.output.shows;
                    shows = raw.shows || raw;
                    const sel = document.getElementById('globalShowSelect');
                    if (shows && shows.length > 0) {
                        sel.innerHTML = "";
                        shows.forEach(s => {
                            let o = document.createElement('option');
                            o.value = s;
                            o.text = s;
                            sel.appendChild(o);
                        });
                    }
                    
                    // Update button titles
                    if (window.UpdateButtonTitles) {
                        window.UpdateButtonTitles();
                    }
                });
                
                // Show success message
                messageDiv.style.background = '#27ae60';
                messageDiv.innerText = "Show imported successfully!";
                
                // Clear file input
                fileInput.value = '';
                
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 2000);
                
                // End operation - re-enable back buttons
                window.EndOperation();
                
                // Return to menu after a short delay
                setTimeout(() => {
                    window.Return2TopMenu();
                }, 2000);
            } else {
                messageDiv.style.background = '#e74c3c';
                messageDiv.innerText = "Error: Could not import show. The file may be invalid or corrupted.";
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 3000);
                
                // End operation - re-enable back buttons
                window.EndOperation();
            }
        }).catch(err => {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: " + (err.message || err.toString());
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
            
            // End operation - re-enable back buttons
            window.EndOperation();
        });
    };
    
    reader.onerror = function() {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: Could not read file.";
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    };
    
    reader.readAsArrayBuffer(file);
};

window.LoadAddNewShowPage = function () {
    const slug = getSelectedChannelSlug();
    const ch = currentChannels[slug];
    const chLabel = document.getElementById('newShowChannelLabel');
    if (chLabel) {
        chLabel.textContent = (slug && ch) ? channelLabel(slug, ch, true) : 'Choose a channel in the header first';
    }
    updateNewShowDisplayFromChannel();
};

function updateNewShowDisplayFromChannel() {
    const slug = getSelectedChannelSlug();
    const label = document.getElementById('newShowDisplayLabel');
    if (!label) return;
    const ch = currentChannels[slug];
    if (!ch || !ch.displayId) {
        label.innerHTML = '–';
        return;
    }
    const def = displayDefForId(ch.displayId);
    label.innerHTML = (displayNameForId(ch.displayId) || ch.displayId) +
        (paletteTag(def) ? ' · ' + paletteTag(def) : '') +
        ' <span class="eink-swatches">' + swatchesHtml((def && def.colors) || []) + '</span>';
}

// Check if current show's displayId matches Photo Settings displayId
window.CheckShowDisplayIdMatch = async function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const showName = globalSelect ? globalSelect.value : '';
    const photoSettingsDisplayIdKey = document.getElementById('displayID')?.value || defaultDisplayId;
    
    // Get the single character ID from Photo Settings
    const photoSettingsDisplayId = EInkDef.DISPLAYS[photoSettingsDisplayIdKey]?.id || '';
    
    if (!showName) {
        return { match: false, showDisplayId: null };
    }
    
    try {
        const _res = await new RESTX().promiseCall('getShow', {
            showName: showName
        });
        
        if (_res.ok && _res.output.show && _res.output.show.displayId) {
            const showDisplayId = _res.output.show.displayId;
            // Compare single character IDs
            return { match: showDisplayId === photoSettingsDisplayId, showDisplayId: showDisplayId };
        }
    } catch (err) {
        console.error("Error checking show displayId:", err);
    }
    
    return { match: false, showDisplayId: null };
};

// Update Save Image and Add Photos button states based on displayId match
window.UpdatePhotoActionButtons = async function () {
    const globalSelect = document.getElementById('globalShowSelect');
    const selectedShow = globalSelect ? globalSelect.value : '';
    const checkResult = await window.CheckShowDisplayIdMatch();
    const photoSettingsDisplayIdKey = document.getElementById('displayID')?.value || defaultDisplayId;
    // Get display name for display in messages
    const photoSettingsDisplayName = EInkDef.DISPLAYS[photoSettingsDisplayIdKey] ? 
        (EInkDef.DISPLAYS[photoSettingsDisplayIdKey].name || photoSettingsDisplayIdKey.replace(/^EINK_/, '')) : photoSettingsDisplayIdKey;
    
    // Find Save Image button (in PhotoSettings page)
    const saveImageBtn = document.querySelector('#PhotoSettings .btn-action.save-btn[onclick*="SaveCurImage"]') || 
                         document.querySelector('button[onclick="window.SaveCurImage()"]');
    
    // Find Add Photos button (in AddShowPhotos page)
    // Try multiple selectors to find the button, including by ID
    let addPhotosBtn = document.getElementById('btnProcessAndAddPhotos') ||
                       document.querySelector('#AddShowPhotos button[onclick*="ProcessAndAddPhotos"]') ||
                       document.querySelector('#AddShowPhotos .btn-action.save-btn') ||
                       document.querySelector('button[onclick="window.ProcessAndAddPhotos()"]');
    
    // Convert show displayId (single char) to display name for messages
    let showDisplayName = checkResult.showDisplayId || '';
    if (checkResult.showDisplayId) {
        showDisplayName = displayNameForId(checkResult.showDisplayId);
    }
    
    // For Save Image button: only enable if show is selected AND displayId matches
    if (saveImageBtn) {
        if (!selectedShow) {
            // No show selected
            saveImageBtn.disabled = true;
            saveImageBtn.title = 'Please select a show first.';
            saveImageBtn.style.opacity = '0.5';
            saveImageBtn.style.cursor = 'not-allowed';
        } else if (!checkResult.match && checkResult.showDisplayId) {
            // Show selected but displayId doesn't match
            saveImageBtn.disabled = true;
            saveImageBtn.title = `This show is configured for display '${showDisplayName}', but Photo Settings is set to '${photoSettingsDisplayName}'. Please change Photo Settings Display to match the show.`;
            saveImageBtn.style.opacity = '0.5';
            saveImageBtn.style.cursor = 'not-allowed';
        } else {
            // Show selected and displayId matches (or show has no displayId)
            saveImageBtn.disabled = false;
            saveImageBtn.title = '';
            saveImageBtn.style.opacity = '1';
            saveImageBtn.style.cursor = 'pointer';
        }
    }
    
    // For Add Photos button: only disable if no show is selected
    // DisplayId is automatically used from show during conversion, so no need to check match
    if (addPhotosBtn) {
        if (!selectedShow) {
            // No show selected
            addPhotosBtn.disabled = true;
            addPhotosBtn.title = 'Please select a show first.';
            addPhotosBtn.style.opacity = '0.5';
            addPhotosBtn.style.cursor = 'not-allowed';
        } else {
            // Show selected - always enable (displayId will be used from show automatically)
            addPhotosBtn.disabled = false;
            addPhotosBtn.removeAttribute('disabled');
            addPhotosBtn.title = 'Process and add photos to the selected show. The show\'s display type will be used automatically.';
            addPhotosBtn.style.opacity = '1';
            addPhotosBtn.style.cursor = 'pointer';
        }
    }
};

window.CreateNewShow = function () {
    const showNameInput = document.getElementById('newShowName');
    const messageDiv = document.getElementById('newShowMessage');
    const showName = showNameInput.value.trim();
    const channelPick = getSelectedChannelSlug();
    const displayId = (currentChannels[channelPick] && currentChannels[channelPick].displayId) || '';
    
    if (!showName) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Please enter a show name!";
        return;
    }
    
    if (!channelPick || !currentChannels[channelPick] || !displayId) {
        messageDiv.style.display = 'block';
        messageDiv.style.background = '#e74c3c';
        messageDiv.style.color = 'white';
        messageDiv.innerText = "Choose a channel first. The channel sets the display type.";
        return;
    }
    
    // Disable input and show loading
    showNameInput.disabled = true;
    messageDiv.style.display = 'block';
    messageDiv.style.background = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.innerText = "Creating show...";
    
    const createPayload = { showName: showName, displayId: displayId, channel: channelPick };
    new RESTX().promiseCall('createShow', createPayload).then(_res => {
        if (_res.ok) {
            // Update global show select and set the new show as selected
            window.UpdateGlobalShowSelect().then(() => {
                // Select the newly created show in the dropdown
                const sel = document.getElementById('globalShowSelect');
                if (sel) {
                    sel.value = showName;
                    // Save the selection to localStorage
                    saveLastSelectedShow(showName);
                }
                
                // Show success message
                messageDiv.style.background = '#27ae60';
                messageDiv.innerText = "Show '" + showName + "' created successfully!";
                
                // Clear input and re-enable it
                showNameInput.value = '';
                showNameInput.disabled = false;
                
                // Return to menu after a short delay - ONLY AFTER UpdateGlobalShowSelect is done!
                setTimeout(() => {
                    window.Return2TopMenu();
                }, 1500);
            });
        } else {
            messageDiv.style.background = '#e74c3c';
            messageDiv.innerText = "Error: Could not create show. The name may be invalid.";
            showNameInput.disabled = false;
        }
    }).catch(err => {
        messageDiv.style.background = '#e74c3c';
        messageDiv.innerText = "Error: " + (err.message || err.toString());
        showNameInput.disabled = false;
    });
};

// ===============================================================
// DEVICE MANAGER & OTA FIRMWARE UPDATE
// ===============================================================

function showChannelMessage(text, ok) {
    const el = document.getElementById('channelMessage');
    if (!el) return;
    el.style.display = 'block';
    el.style.background = ok ? '#27ae60' : '#e74c3c';
    el.style.color = 'white';
    el.innerText = text;
    if (ok) setTimeout(() => { el.style.display = 'none'; }, 3000);
}

window.LoadChannelsPage = async function () {
    const listEl = document.getElementById('channelList');
    const createBlock = document.getElementById('channelCreateBlock');
    const editBlock = document.getElementById('channelEditBlock');
    try {
        const _res = await new RESTX().promiseCall('getShows');
        const raw = _res.output.shows || {};
        applyShowsConfig(raw);
        if (window.UpdateGlobalChannelSelect) window.UpdateGlobalChannelSelect();
        fillDisplaySelect(document.getElementById('newChannelDisplay'));
        const users = [...new Set(Object.values(currentChannels).map((c) => c.userId || c.user).filter(Boolean))];
        const targets = [...new Set(Object.values(currentChannels).map((c) => c.groupId || c.group || c.target).filter(Boolean))];
        const userList = document.getElementById('channelUserList');
        const targetList = document.getElementById('channelTargetList');
        if (userList) userList.innerHTML = users.map((u) => `<option value="${u}">`).join('');
        if (targetList) targetList.innerHTML = targets.map((t) => `<option value="${t}">`).join('');

        const slug = getSelectedChannelSlug();
        const isNew = window._forceNewChannel || !slug || !currentChannels[slug];
        window._forceNewChannel = false;
        if (createBlock) createBlock.style.display = isNew ? 'block' : 'none';
        if (editBlock) editBlock.style.display = isNew ? 'none' : 'block';

        if (!isNew) {
            const ch = currentChannels[slug] || {};
            const isDef = slug === currentDefaultChannel;
            const titleEl = document.getElementById('channelEditTitle');
            if (titleEl) titleEl.textContent = channelLabel(slug, ch, true) + (isDef ? ' (default)' : '');
            const urlEl = document.getElementById('editChannelUrl');
            if (urlEl) urlEl.textContent = urlForChannel(slug);
            const dLabel = document.getElementById('editChannelDisplayLabel');
            if (dLabel) {
                const def = displayDefForId(ch.displayId);
                dLabel.innerHTML = (displayNameForId(ch.displayId) || ch.displayId || '–') +
                    (paletteTag(def) ? ' · ' + paletteTag(def) : '') +
                    ' <span class="eink-swatches">' + swatchesHtml((def && def.colors) || []) + '</span>';
            }
            fillShowNameSelect(document.getElementById('editChannelShow'), ch.shows || [], ch.showName || '');
            const defBox = document.getElementById('editChannelDefault');
            if (defBox) defBox.checked = isDef;
        }

        const slugs = Object.keys(currentChannels);
        if (!listEl) return;
        if (!slugs.length) {
            listEl.innerHTML = '<p style="color:#888;">No channels yet. Choose + New Channel in the header.</p>';
            return;
        }
        let html = '<table style="width:100%; border-collapse:collapse; font-size:0.92rem;">';
        html += '<tr style="text-align:left; border-bottom:1px solid var(--border);"><th style="padding:6px;">Channel</th><th>Display</th><th>Show</th><th></th></tr>';
        slugs.forEach((s) => {
            const ch = currentChannels[s] || {};
            const isDef = s === currentDefaultChannel;
            const current = s === slug;
            html += '<tr style="border-bottom:1px solid var(--border);' + (current ? ' background:rgba(230,126,34,0.12);' : '') + '">';
            html += `<td style="padding:8px 6px;"><strong>${s}</strong>${isDef ? ' <span style="color:#d32f2f;">default</span>' : ''}</td>`;
            const def = displayDefForId(ch.displayId);
            html += `<td>${displayNameForId(ch.displayId) || ch.displayId || '–'}${paletteTag(def) ? ' · ' + paletteTag(def) : ''} <span class="eink-swatches">${swatchesHtml((def && def.colors) || [])}</span></td>`;
            html += `<td>${ch.showName || '—'}</td>`;
            html += '<td style="white-space:nowrap; padding:8px 0;">';
            html += `<button class="btn-action" type="button" onclick="window.selectChannelInHeader('${s}')" style="padding:4px 8px; font-size:0.8rem;">Edit</button>`;
            html += '</td></tr>';
        });
        html += '</table>';
        listEl.innerHTML = html;
        if (window.UpdatePageTitleIfNeeded) window.UpdatePageTitleIfNeeded();
        if (window.UpdateButtonTitles) window.UpdateButtonTitles();
    } catch (err) {
        if (listEl) listEl.innerHTML = '<p style="color:#c00;">Could not load channels: ' + (err.message || err) + '</p>';
    }
};

window.CreateChannel = async function () {
    const user = document.getElementById('newChannelUser')?.value.trim();
    const target = document.getElementById('newChannelTarget')?.value.trim();
    const displayId = document.getElementById('newChannelDisplay')?.value;
    if (!user || !target || !displayId) {
        showChannelMessage('User ID, Group ID and display are required.', false);
        return;
    }
    try {
        const res = await new RESTX().promiseCall('createChannel', { userId: user, groupId: target, displayId });
        if (!res.ok) throw new Error(res.error?.msg || 'Create failed');
        const created = (res.output.shows && res.output.shows.channels) || {};
        const id = Object.keys(created).find((k) => {
            const c = created[k] || {};
            return (c.userId || c.user) === user && (c.groupId || c.group || c.target) === target && c.displayId === displayId;
        }) || (user + '/' + target + '/' + displayId);
        showChannelMessage('Channel "' + id + '" created.', true);
        saveLastSelectedChannel(id);
        await window.UpdateGlobalShowSelect();
        const hdr = document.getElementById('globalChannelSelect');
        if (hdr) hdr.value = id;
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.SaveSelectedChannel = async function () {
    const slug = getSelectedChannelSlug();
    if (!slug || !currentChannels[slug]) {
        showChannelMessage('Select a channel first.', false);
        return;
    }
    const showName = document.getElementById('editChannelShow')?.value || '';
    const makeDefault = !!document.getElementById('editChannelDefault')?.checked;
    try {
        if (showName) {
            const res = await new RESTX().promiseCall('setActiveShow', { showName, channel: slug });
            if (!res.ok) throw new Error(res.error?.msg || 'Activate failed');
        }
        if (makeDefault && slug !== currentDefaultChannel) {
            const dres = await new RESTX().promiseCall('setDefaultChannel', { channel: slug });
            if (!dres.ok) throw new Error(dres.error?.msg || 'Default failed');
        }
        showChannelMessage('Channel updated.', true);
        await window.UpdateGlobalShowSelect();
        const hdr = document.getElementById('globalChannelSelect');
        if (hdr) hdr.value = slug;
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.DeleteSelectedChannel = async function () {
    const slug = getSelectedChannelSlug();
    if (!slug || slug === NEW_CHANNEL_VALUE) {
        showChannelMessage('Select a channel first.', false);
        return;
    }
    await window.DeleteChannel(slug);
};

window.AssignChannelShow = async function (slug, showName) {
    try {
        const res = await new RESTX().promiseCall('updateChannel', { slug, showName });
        if (!res.ok) throw new Error(res.error?.msg || 'Update failed');
        await window.UpdateGlobalShowSelect();
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.SetDefaultChannel = async function (slug) {
    if (!slug) {
        showChannelMessage('Select a channel first.', false);
        return;
    }
    try {
        const res = await new RESTX().promiseCall('setDefaultChannel', { slug });
        if (!res.ok) throw new Error(res.error?.msg || 'Default failed');
        showChannelMessage('Default channel is now "' + slug + '".', true);
        await window.UpdateGlobalShowSelect();
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.DeleteChannel = async function (slug) {
    if (!confirm('Delete channel "' + slug + '" and all its shows?')) return;
    try {
        const res = await new RESTX().promiseCall('deleteChannel', { channel: slug });
        if (!res.ok) throw new Error(res.error?.msg || 'Delete failed');
        showChannelMessage('Channel "' + slug + '" deleted.', true);
        if (loadLastSelectedChannel() === slug) {
            localStorage.removeItem(LAST_SELECTED_CHANNEL_KEY);
        }
        await window.UpdateGlobalShowSelect();
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.DeleteSelectedTarget = async function () {
    const slug = getSelectedChannelSlug();
    const ch = currentChannels[slug];
    if (!ch) return;
    if (!confirm('Delete all channels and shows of group "' + (ch.userId || ch.user) + '/' + (ch.groupId || ch.group || ch.target) + '"?')) return;
    try {
        const res = await new RESTX().promiseCall('deleteTarget', { userId: ch.userId || ch.user, groupId: ch.groupId || ch.group || ch.target });
        if (!res.ok) throw new Error(res.error?.msg || 'Delete failed');
        localStorage.removeItem(LAST_SELECTED_CHANNEL_KEY);
        await window.UpdateGlobalShowSelect();
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.DeleteSelectedUser = async function () {
    const slug = getSelectedChannelSlug();
    const ch = currentChannels[slug];
    if (!ch) return;
    if (!confirm('Delete User ID "' + (ch.userId || ch.user) + '" and all groups and shows?')) return;
    try {
        const res = await new RESTX().promiseCall('deleteUser', { userId: ch.userId || ch.user });
        if (!res.ok) throw new Error(res.error?.msg || 'Delete failed');
        localStorage.removeItem(LAST_SELECTED_CHANNEL_KEY);
        await window.UpdateGlobalShowSelect();
        await window.LoadChannelsPage();
    } catch (err) {
        showChannelMessage(err.message || String(err), false);
    }
};

window.CopySelectedChannelUrl = async function () {
    const slug = getSelectedChannelSlug();
    if (!slug || slug === NEW_CHANNEL_VALUE) return;
    await window.CopyChannelUrl(slug);
};

window.CopyChannelUrl = async function (slug) {
    const url = urlForChannel(slug);
    try {
        await navigator.clipboard.writeText(url);
        showChannelMessage('Copied ' + url, true);
    } catch {
        showChannelMessage(url, true);
    }
};

window.RefreshDevices = async function () {
    const listEl = document.getElementById('deviceList');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:#888;">Loading devices...</p>';

    try {
        const res = await new RESTX().promiseCall('getDevices');
        const devices = res.output?.devices || {};
        const keys = Object.keys(devices);
        if (keys.length === 0) {
            listEl.innerHTML = '<p style="color:#888;">No devices registered yet. Devices appear here once they connect to the server.</p>';
            return;
        }

        let html = '<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">';
        html += '<tr style="background:#f5f5f5; text-align:left;"><th style="padding:8px;">Name</th><th style="padding:8px;">IP</th><th style="padding:8px;">Display</th><th style="padding:8px;">Last Seen</th><th style="padding:8px;">Actions</th></tr>';
        for (const key of keys) {
            const d = devices[key];
            const ip = d.ip || key.split('_').pop();
            const name = d.name || key;
            const display = displayNameForId(d.displayId || d.display) || d.displayId || d.display || '–';
            const lastSeen = d.lastEcho ? new Date(d.lastEcho).toLocaleString() : '–';
            html += `<tr style="border-bottom:1px solid #eee;">`;
            html += `<td style="padding:8px;">${name}</td>`;
            html += `<td style="padding:8px;"><code>${ip}</code></td>`;
            html += `<td style="padding:8px;">${display}</td>`;
            html += `<td style="padding:8px;">${lastSeen}</td>`;
            html += `<td style="padding:8px;">`;
            html += `<button class="btn-action" style="font-size:0.8rem; padding:4px 10px;" onclick="window.QueryDeviceInfo('${ip}')">ℹ Info</button> `;
            html += `<button class="btn-action" style="font-size:0.8rem; padding:4px 10px;" onclick="document.getElementById('otaDeviceIp').value='${ip}'">🎯 Select for OTA</button>`;
            html += `</td></tr>`;
        }
        html += '</table>';
        listEl.innerHTML = html;
    } catch (err) {
        listEl.innerHTML = '<p style="color:#c00;">Error loading devices: ' + (err.message || err) + '</p>';
    }
};

window.QueryDeviceInfo = async function (ip) {
    try {
        const res = await new RESTX().promiseCall('getDeviceInfo', { deviceIp: ip });
        const info = res.output?.deviceInfo;
        if (info) {
            let msg = `Device: ${info.name || '?'}\nFirmware: ${info.version || '?'}${info.buildDate ? ' (' + info.buildDate + ')' : ''}\nMAC: ${info.mac || '?'}\nDisplay: ${info.display || '?'}\nFree Heap: ${info.freeHeap ? (info.freeHeap / 1024).toFixed(1) + ' KB' : '?'}\nSketch: ${info.sketchSize ? (info.sketchSize / 1024).toFixed(0) + ' KB' : '?'}\nFree Space: ${info.freeSketchSpace ? (info.freeSketchSpace / 1024).toFixed(0) + ' KB' : '?'}`;
            alert(msg);
        }
    } catch (err) {
        alert('Device not reachable: ' + (err.message || err));
    }
};

let _otaSelectedFile = null;

window.OtaFileSelected = function (event) {
    const files = event.target.files;
    const infoEl = document.getElementById('otaFileInfo');
    const uploadBtn = document.getElementById('otaUploadBtn');
    if (files && files.length > 0) {
        _otaSelectedFile = files[0];
        if (infoEl) {
            infoEl.style.display = 'block';
            infoEl.textContent = `${_otaSelectedFile.name} (${(_otaSelectedFile.size / 1024).toFixed(1)} KB)`;
        }
        if (uploadBtn) uploadBtn.disabled = false;
    } else {
        _otaSelectedFile = null;
        if (infoEl) infoEl.style.display = 'none';
        if (uploadBtn) uploadBtn.disabled = true;
    }
};

window.StartOtaUpdate = async function () {
    const ip = document.getElementById('otaDeviceIp')?.value?.trim();
    if (!ip) { alert('Please enter the device IP address.'); return; }
    if (!_otaSelectedFile) { alert('Please select a firmware .bin file.'); return; }

    const msgEl = document.getElementById('otaMessage');
    const progressEl = document.getElementById('otaProgress');
    const barEl = document.getElementById('otaProgressBar');
    const statusEl = document.getElementById('otaStatusText');
    const uploadBtn = document.getElementById('otaUploadBtn');

    if (uploadBtn) uploadBtn.disabled = true;
    if (progressEl) progressEl.style.display = 'block';
    if (msgEl) msgEl.style.display = 'none';
    if (barEl) barEl.style.width = '10%';
    if (statusEl) statusEl.textContent = 'Reading firmware file...';

    try {
        const arrayBuf = await _otaSelectedFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);

        if (barEl) barEl.style.width = '30%';
        if (statusEl) statusEl.textContent = `Uploading ${(_otaSelectedFile.size / 1024).toFixed(0)} KB to ${ip}...`;

        const res = await new RESTX().promiseCall('firmwareUpdate', {
            deviceIp: ip,
            firmware: base64
        });

        if (barEl) barEl.style.width = '100%';

        if (res.ok) {
            if (statusEl) statusEl.textContent = 'Firmware update successful! Device is rebooting...';
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.style.background = '#27ae60';
                msgEl.style.color = '#fff';
                msgEl.textContent = 'OTA update successful. The device will reboot with the new firmware.';
            }
        } else {
            throw new Error(res.error?.msg || 'Unknown error');
        }
    } catch (err) {
        if (barEl) barEl.style.width = '0%';
        if (progressEl) progressEl.style.display = 'none';
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = '#e74c3c';
            msgEl.style.color = '#fff';
            msgEl.textContent = 'Firmware update failed: ' + (err.message || err);
        }
    } finally {
        if (uploadBtn) uploadBtn.disabled = false;
    }
};
