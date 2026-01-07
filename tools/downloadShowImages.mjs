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

// Download a single image
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(outputDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Skipping ${filename} (already exists)`);
      resolve();
      return;
    }
    
    console.log(`⬇️  Downloading ${filename}...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded ${filename}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${filename}`);
          resolve();
        });
      }
    }).on('error', (err) => {
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

