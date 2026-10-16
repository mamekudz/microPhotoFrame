import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { PLATFORMS } from './photoframe-platforms.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
export function releaseVersion(pkg, release, firmware, tag) {
  const version = `${release.main}.${release.minor}.${release.revision}${release.beta ? '-beta' : ''}`;
  if (!/^\d+\.\d+\.\d+(-beta)?$/.test(version) || pkg !== version || firmware !== version)
    throw new Error('package.json, RELEASES.json and FIRMWARE_VERSION must match');
  if (tag && tag !== `v${version}`) throw new Error(`Tag must be v${version}`);
  return version;
}
export function validateLayout(parts) {
  if (!Array.isArray(parts) || parts.length < 3) throw new Error('Incomplete flash layout');
  const offsets = new Set();
  for (const part of parts) {
    if (!Number.isSafeInteger(part.offset) || part.offset < 0 || offsets.has(part.offset) || !part.file)
      throw new Error('Invalid flash layout');
    offsets.add(part.offset);
  }
  return parts;
}

async function main() {
  const command = process.argv[2];
  const fw = fs.readFileSync(path.join(root, 'firmware/src/main.cpp'), 'utf8').match(/#define\s+FIRMWARE_VERSION\s+"([^"]+)"/)?.[1];
  const version = releaseVersion(read('package.json').version, read('RELEASES.json')[0], fw,
    process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined);
  const output = path.join(root, 'release-assets');
  fs.mkdirSync(output, { recursive: true });
  if (command === 'check') { console.log(version); return; }
  if (command === 'firmware') {
    const platform = PLATFORMS.find(p => p.id === process.argv[3]);
    if (!platform) throw new Error('Unknown firmware target');
    const parts = validateLayout(read(`firmware/.pio/build/${platform.pioEnv}/release-layout.json`));
    const zip = new JSZip();
    const manifestParts = [];
    const flashArgs = [];
    for (const [index, part] of parts.entries()) {
      const name = `${index}-${path.basename(part.file)}`;
      const data = fs.readFileSync(part.file);
      if (!data.length) throw new Error(`Empty firmware: ${name}`);
      zip.file(name, data);
      manifestParts.push({ path: name, offset: part.offset });
      flashArgs.push(`0x${part.offset.toString(16)}`, name);
    }
    zip.file('manifest.json', JSON.stringify({ name: `microPhotoFrame ${platform.label}`, version,
      new_install_prompt_erase: true, builds: [{ chipFamily: 'ESP32-S3', parts: manifestParts }] }, null, 2));
    zip.file('install.py', `import pathlib, subprocess, sys\nroot = pathlib.Path(__file__).resolve().parent\nprint(${JSON.stringify(`Firmware ${version} fuer ${platform.label}. Nur dieses Geraet anschliessen.`)})\nport = input('Serieller Port (z.B. COM9 oder /dev/ttyACM0): ').strip()\nif not port or input('Firmware schreiben? Mit JA bestaetigen: ') != 'JA':\n    sys.exit('Abgebrochen')\nsubprocess.run([sys.executable, '-m', 'esptool', '--chip', 'esp32s3', '--port', port, '--baud', '460800', 'write_flash', ${flashArgs.map(x => JSON.stringify(x)).join(', ')}], cwd=root, check=True)\n`);
    zip.file('install.cmd', '@echo off\r\ncd /d "%~dp0"\r\npy install.py\r\npause\r\n');
    zip.file('README.txt', `microPhotoFrame ${version} - ${platform.label}\n\nNur fuer ${platform.label}; nicht fuer E1001 oder andere Boards.\n1. Python 3 installieren.\n2. Einmalig: python -m pip install esptool==4.8.1\n3. USB-Datenkabel anschliessen, serielle Monitore schliessen.\n4. python install.py (Windows alternativ install.cmd). Port auswaehlen und bestaetigen.\nAlternativ: python -m http.server 8000 und http://localhost:8000/flasher.html in Chrome/Edge oeffnen. Internet fuer ESP Web Tools erforderlich.\nDer Flash-Vorgang ersetzt die Firmware. Vorher Daten und Originalfirmware sichern.\nDanach WLAN microPhotoFrame, http://192.168.4.1, WLAN und Server-URL konfigurieren.\n`);
    zip.file('flasher.html', `<!doctype html><html lang="de"><meta charset="utf-8"><title>${platform.label} Firmware</title><script type="module" src="https://unpkg.com/esp-web-tools@10.1.0/dist/web/install-button.js?module"></script><h1>microPhotoFrame ${platform.label}</h1><p>Version ${version}. Nur fuer ${platform.label}. USB-Datenkabel anschliessen.</p><esp-web-install-button manifest="manifest.json"></esp-web-install-button></html>`);
    fs.writeFileSync(path.join(output, `microPhotoFrame_firmware_${platform.id}_v${version}.zip`), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    return;
  }
  if (command === 'checksums') {
    const names = fs.readdirSync(output).filter(n => n !== 'SHA256SUMS.txt').sort();
    if (!names.length) throw new Error('No release assets');
    fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), names.map(name => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex')}  ${name}`).join('\n') + '\n');
    return;
  }
  throw new Error('Use check, firmware <target>, or checksums');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(error => { console.error(error); process.exitCode = 1; });
