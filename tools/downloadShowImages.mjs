#!/usr/bin/env node

/**
 * Download images from Unsplash URLs specified in _orgimgs.json
 * Usage: node downloadShowImages.mjs <ShowName>
 * Example: node downloadShowImages.mjs ColorfulAnimals
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const showName = process.argv[2];

if (!showName) {
  console.error('❌ Error: Show name required');
  console.log('Usage: node downloadShowImages.mjs <ShowName>');
  console.log('Example: node downloadShowImages.mjs ColorfulAnimals');
  process.exit(1);
}

const showDir = path.join(__dirname, '..', 'readyToGoShows', showName);
const jsonFile = path.join(showDir, `${showName}_orgimgs.json`);
const outputDir = path.join(showDir, `${showName}_orgimgs`);

// Check if JSON file exists
if (!fs.existsSync(jsonFile)) {
  console.error(`❌ Error: JSON file not found: ${jsonFile}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read and parse JSON
console.log(`📖 Reading ${showName}_orgimgs.json...`);
const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

if (!data.images || !Array.isArray(data.images)) {
  console.error('❌ Error: No images array found in JSON');
  process.exit(1);
}

console.log(`✅ Found ${data.images.length} images to download\n`);

const USER_AGENT = 'microPhotoFrame/1.5 (https://github.com/mamekudz/microPhotoFrame)';

function downloadImage(url, filename, hops = 0) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(outputDir, filename);

    if (hops === 0 && fs.existsSync(filepath)) {
      console.log(`⏭️  Skipping ${filename} (already exists)`);
      resolve();
      return;
    }
    if (hops > 6) {
      reject(new Error('too many redirects'));
      return;
    }
    if (hops === 0) console.log(`⬇️  Downloading ${filename}...`);

    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (response) => {
      const loc = response.headers.location;
      if (loc && [301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        downloadImage(next, filename, hops + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const type = String(response.headers['content-type'] || '');
      if (type && !type.startsWith('image/')) {
        response.resume();
        reject(new Error(`not an image: ${type}`));
        return;
      }
      const file = fs.createWriteStream(filepath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${filename}`);
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
    req.on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Download all images sequentially
async function downloadAll() {
  console.log('🚀 Starting downloads...\n');
  
  for (let i = 0; i < data.images.length; i++) {
    const image = data.images[i];
    const ext = '.jpg'; // Unsplash default
    const filename = `${image.name}${ext}`;
    
    try {
      await downloadImage(image.url, filename);
    } catch (error) {
      console.error(`❌ Failed to download ${filename}: ${error.message}`);
    }
    
    // Small delay to be nice to Unsplash servers
    if (i < data.images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n✨ All downloads complete!');
  console.log(`📁 Images saved to: ${outputDir}`);
}

// Run
downloadAll().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

