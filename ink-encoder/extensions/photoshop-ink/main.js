/**
 * Photoshop UXP — Export/Import .ink (microPhotoFrame) über lib/inkCodec.mjs
 */
import {
  encodeInkFromRGBA,
  decodeInk,
  listDisplayChoices,
  decodeOptionsFromInkFile
} from "./lib/inkCodec.mjs";

const photoshop = require("photoshop");
const uxp = require("uxp");
const { app, core, imaging, constants } = photoshop;
const fs = uxp.storage.localFileSystem;
const formats = uxp.storage.formats;

function setStatus(el, msg) {
  el.textContent = msg || "";
}

function rgbBufferToRgba(pixelData, w, h, components) {
  const src = new Uint8Array(pixelData);
  const out = new Uint8ClampedArray(w * h * 4);
  if (components === 3) {
    let o = 0;
    for (let i = 0; i < w * h * 3; i += 3) {
      out[o++] = src[i];
      out[o++] = src[i + 1];
      out[o++] = src[i + 2];
      out[o++] = 255;
    }
  } else if (components === 4) {
    for (let i = 0; i < w * h * 4; i++) out[i] = src[i];
  } else {
    throw new Error(`Unerwartete Kanalzahl: ${components}`);
  }
  return out;
}

function fillDisplaySelect(selectEl) {
  selectEl.innerHTML = "";
  for (const d of listDisplayChoices()) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.id} — ${d.name}`;
    selectEl.appendChild(opt);
  }
}

async function exportActiveDocument(statusEl, displayId, dither, compression) {
  const doc = app.activeDocument;
  if (!doc) {
    setStatus(statusEl, "Kein aktives Dokument.");
    return;
  }

  const display = listDisplayChoices().find((x) => x.id === displayId);
  if (!display) {
    setStatus(statusEl, "Display ungültig.");
    return;
  }

  const tw = display.width;
  const th = display.height;

  let rgba;
  await core.executeAsModal(
    async () => {
      const dup = doc.duplicate(undefined, true);
      try {
        if (dup.width !== tw || dup.height !== th) {
          dup.resizeImage(tw, th, dup.resolution, constants.InterpolationMethod.BICUBIC);
        }
        const layerId = dup.activeLayers[0].id;
        const opts = {
          documentID: dup.id,
          layerID: layerId,
          sourceBounds: { left: 0, top: 0, right: tw, bottom: th },
          colorSpace: "RGB",
          componentSize: 8
        };
        const pix = await imaging.getPixels(opts);
        const id = pix.imageData;
        rgba = rgbBufferToRgba(id.pixelData, id.width, id.height, id.components);
      } finally {
        await dup.close({ saving: constants.SaveOptions.DONOTSAVECHANGES });
      }
    },
    { commandName: "INK Export" }
  );

  const ink = encodeInkFromRGBA(rgba, tw, th, {
    colors: display.colors,
    displayId: display.id,
    isRound: display.geometry === 1,
    dither,
    orientation: 0,
    compression
  });

  const file = await fs.getFileForSaving("export.ink", { types: ["ink"] });
  if (!file) {
    setStatus(statusEl, "Speichern abgebrochen.");
    return;
  }
  await file.write(ink.buffer, { format: formats.binary });
  setStatus(statusEl, `Gespeichert: ${file.name} (${ink.length} Bytes)`);
}

async function importInkFile(statusEl) {
  const file = await fs.getFileForOpening({ types: ["ink"] });
  if (!file) {
    setStatus(statusEl, "Öffnen abgebrochen.");
    return;
  }
  const ab = await file.read({ format: formats.binary });
  const u8 = new Uint8Array(ab);
  let meta;
  try {
    meta = decodeOptionsFromInkFile(u8);
  } catch (e) {
    setStatus(statusEl, String(e.message || e));
    return;
  }
  const { width: w, height: h, rgba } = decodeInk(u8, {
    colors: meta.colors,
    width: meta.width,
    height: meta.height,
    isRound: meta.isRound,
    autoFromHeader: false
  });

  await core.executeAsModal(
    async () => {
      const doc = await app.documents.add({
        width: w,
        height: h,
        resolution: 72,
        mode: "RGBColorMode",
        fill: "white"
      });
      const layerId = doc.activeLayers[0].id;
      const pixelData = new Uint8Array(rgba.length);
      pixelData.set(rgba);
      await imaging.putPixels({
        layerID: layerId,
        imageData: {
          width: w,
          height: h,
          components: 4,
          componentSize: 8,
          colorSpace: "RGB",
          pixelData,
          chunky: true
        },
        replace: true
      });
    },
    { commandName: "INK Import" }
  );

  setStatus(
    statusEl,
    `Import: ${file.name}\n${meta.header.displayId} · ${w}×${h} · v${meta.header.version}`
  );
}

function init() {
  const display = document.getElementById("display");
  const dither = document.getElementById("dither");
  const compression = document.getElementById("compression");
  const status = document.getElementById("status");
  fillDisplaySelect(display);

  document.getElementById("btnExport").addEventListener("click", async () => {
    try {
      setStatus(status, "Export…");
      await exportActiveDocument(status, display.value, dither.value, compression.value);
    } catch (e) {
      setStatus(status, `Fehler: ${e.message || e}\n(Tipp: Photoshop 24+ und flaches RGB-Dokument.)`);
      console.error(e);
    }
  });

  document.getElementById("btnImport").addEventListener("click", async () => {
    try {
      setStatus(status, "Import…");
      await importInkFile(status);
    } catch (e) {
      setStatus(status, `Fehler: ${e.message || e}`);
      console.error(e);
    }
  });
}

init();
