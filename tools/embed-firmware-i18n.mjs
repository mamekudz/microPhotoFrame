import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const lids = ['en-US', 'de-DE', 'zh-CN'];
const all = {};
for (const lid of lids) {
	all[lid] = JSON.parse(fs.readFileSync(path.join(root, 'i18x', 'firmware', `${lid}.json`), 'utf8'));
}
const json = JSON.stringify(all);
const header = `#pragma once\nstatic const char I18N_FW_JSON[] = R"I18N(${json})I18N";\n`;
const out = path.join(root, 'firmware', 'src', 'i18n_fw.h');
fs.writeFileSync(out, header);
console.log('wrote', out, json.length, 'bytes');
