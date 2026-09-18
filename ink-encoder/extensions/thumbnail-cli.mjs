#!/usr/bin/env node
/**
 * PNG aus .ink erzeugen (Thumbnail / Vorschau-Pipeline).
 * Nutzung (im Projektroot): node extensions/thumbnail-cli.mjs eingabe.ink ausgabe.png
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import path from "path";
import { DecodeInk } from "../src/inkEncoder.mjs";
import { decodeOptionsFromInkFile } from "./photoshop-ink/lib/inkCodec.mjs";

const inkPath = process.argv[2];
const pngPath = process.argv[3];
if (!inkPath || !pngPath) {
  console.error("Nutung: node extensions/thumbnail-cli.mjs <eingabe.ink> <ausgabe.png>");
  process.exit(1);
}

const absInk = path.isAbsolute(inkPath) ? inkPath : path.join(process.cwd(), inkPath);
if (!existsSync(absInk)) {
  console.error("Nicht gefunden:", absInk);
  process.exit(1);
}

const buf = readFileSync(absInk);
const meta = decodeOptionsFromInkFile(new Uint8Array(buf));
const png = await DecodeInk(buf, {
  colors: meta.colors,
  width: meta.width,
  height: meta.height,
  isRound: meta.isRound
});

const outAbs = path.isAbsolute(pngPath) ? pngPath : path.join(process.cwd(), pngPath);
writeFileSync(outAbs, png);
console.log(outAbs, png.length, "Bytes");
