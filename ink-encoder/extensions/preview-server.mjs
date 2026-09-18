#!/usr/bin/env node
/**
 * Lokaler Server für extensions/ink-preview (und optionales Öffnen einer .ink per CLI).
 * Nutzung:
 *   node extensions/preview-server.mjs
 *   node extensions/preview-server.mjs C:\pfad\bild.ink
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const PORT = Number(process.env.INK_PREVIEW_PORT || 3847);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function safeJoin(base, reqPath) {
  const rel = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(base, rel);
  if (!full.startsWith(base)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  if (u.pathname === "/api/load-cli" && req.method === "GET") {
    const p = globalThis.__INK_CLI_PATH__;
    if (!p || !fs.existsSync(p)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Keine CLI-Datei gesetzt.");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    fs.createReadStream(p).pipe(res);
    return;
  }

  let filePath = safeJoin(root, u.pathname === "/" ? "/ink-preview/index.html" : u.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`INK-Vorschau: ${url}`);
  console.log("Ziehen Sie eine .ink ins Fenster (Drag & Drop).");
});

const cliPath = process.argv[2];
if (cliPath) {
  const abs = path.resolve(cliPath);
  if (fs.existsSync(abs)) {
    globalThis.__INK_CLI_PATH__ = abs;
    console.log(`CLI-Datei: ${abs} — Seite lädt sie über /api/load-cli (öffnen Sie die URL im Browser).`);
  } else {
    console.error("Datei nicht gefunden:", abs);
    process.exit(1);
  }
}
