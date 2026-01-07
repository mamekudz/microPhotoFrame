import gulp from 'gulp';
//import run from 'gulp-run';
import fs, {copyFile, writeFileSync, existsSync, statSync, mkdirSync} from "fs";
import clean from 'gulp-clean';
import merge2 from 'merge2';
//import gulpif from 'gulp-if';
import concat from 'gulp-concat';
//import addsrc from 'gulp-add-src';
import µJSCleanUp from 'gulp-mu-js-cleanup';
import µBuildFilter from 'gulp-mu-build-filter';
//import deleteempty from 'delete-empty';
//import strip from 'gulp-strip-comments';
//import decomment from 'gulp-decomment';
//import uglifyjs from 'gulp-uglify-es';
import runSequence from 'gulp4-run-sequence';
import zip from 'gulp-zip';
import {zip as zipFolder} from 'zip-a-folder';
//import uglifycss from 'gulp-uglifycss';
import rename from 'gulp-rename';
import replace from 'gulp-replace';
//import notify from 'gulp-notify';
import path from 'path';
import download from 'gulp-download2';
import glob from 'fast-glob';
import {once} from 'events';
import request from 'request';
import cp from 'child_process';
//import {cp,exec, execFileSync, spawn} from 'child_process';
//import docx from "docx-templates";
import wait from "gulp-wait";
import prompt from 'gulp-prompt';


/*
export const Fetch_AI_Models = (cb) => {
    const modelDir = 'src/models';
    // Die Basis-URL muss zum Modell passen (hier V2)
    const baseUrl = 'https://raw.githubusercontent.com/tensorflow/tfjs-models/master/coco-ssd/models/mobilenet_v2/';

    // 1. Zuerst die model.json lesen
    const config = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf8'));
    
    // 2. Alle Pfade aus der weightsManifest extrahieren
    const binaryFiles = config.weightsManifest[0].paths; 

    console.log(`Gefundene Binärdateien in model.json: ${binaryFiles.join(', ')}`);

    let completed = 0;
    binaryFiles.forEach(file => {
        request(baseUrl + file)
            .pipe(fs.createWriteStream(path.join(modelDir, file)))
            .on('finish', () => {
                completed++;
                if (completed === binaryFiles.length) {
                    console.log('✅ Alle Binärdaten laut model.json geladen!');
                    cb();
                }
            });
    });
};


function _BuildServerPackages(_cb){

function _BuildServerPackages(_cb){
  const packages = [
    { name: 'node-server', globs: ['node/**', 'package.json', 'package-lock.json'] },
    { name: 'web-ui', globs: ['index.html', 'assets/**', 'src/**', 'styles/**', 'webassets/**'] },
    { name: 'php-server', globs: ['php/**', 'aspx/**'] }
  ];

  // ensure dist exists
  if (!existsSync('dist')) mkdirSync('dist');

  const streams = packages.map(p => {
    return gulp.src(p.globs, { base: '.', dot: true, allowEmpty: true })
      .pipe(zip(`${p.name}.zip`))
      .pipe(gulp.dest('dist'));
  });

  return merge2(streams);
}

export const Build_Server_Packages2 = gulp.series(
	_BuildServerPackages,
	function(cb) {
			console.log('Packages build ready.');
			cb();
	}
);

// ===========================================
// E-Ink Image Encoding Tasks
// ===========================================

import { encodeInk, encodeInkFromConfig, loadConfigFromJSON } from 'ink-encoder';

// Convert PNG images to .ink format using JSON configuration
//Usage: gulp encode-ink --config=./config/display-config.json --input=./firmware/imgs/startup.png --output=./firmware/imgs/startup.ink
 // Or: gulp encode-ink --config=./config/display-config.json --input=./firmware/imgs/*.png
 //
export const encode_ink = async function(cb) {
  const configPath = process.env.config || './config/ink-encode-config.json';
  const inputPath = process.env.input;
  const outputPath = process.env.output;
  
  if (!inputPath) {
    console.error('Error: --input parameter is required');
    console.log('Usage: gulp encode-ink --config=<config.json> --input=<input.png> [--output=<output.ink>]');
    cb(new Error('Missing input parameter'));
    return;
  }
  
  if (!existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    console.log('Create a JSON config file with the following structure:');
    console.log(JSON.stringify({
      colors: ["#000000", "#FFFFFF"],
      width: 800,
      height: 480,
      displayId: "9",
      isRound: false,
      dither: "floyd",
      orientation: 0,
      colorAdjust: {
        saturation: 1.0,
        contrast: 1.0,
        blackPoint: 1.0,
        whitePoint: 1.0
      }
    }, null, 2));
    cb(new Error('Config file not found'));
    return;
  }
  
  try {
    // Handle glob patterns
    const files = await glob(inputPath);
    
    if (files.length === 0) {
      console.error(`Error: No files found matching: ${inputPath}`);
      cb(new Error('No files found'));
      return;
    }
    
    const options = await loadConfigFromJSON(configPath);
    
    for (const file of files) {
      const inputFile = file;
      let outputFile = outputPath;
      
      // If no output specified, create .ink file next to input
      if (!outputFile) {
        outputFile = inputFile.replace(/\.(png|jpg|jpeg)$/i, '.ink');
      }
      
      // If output is a directory, use input filename with .ink extension
      if (outputFile && !outputFile.endsWith('.ink') && existsSync(outputFile) && statSync(outputFile).isDirectory()) {
        const inputName = path.basename(inputFile).replace(/\.(png|jpg|jpeg)$/i, '.ink');
        outputFile = path.join(outputFile, inputName);
      }
      
      console.log(`Converting ${inputFile} -> ${outputFile}...`);
      const inkData = await encodeInk(inputFile, options);
      fs.writeFileSync(outputFile, inkData);
      console.log(`✓ Converted ${inputFile} to ${outputFile}`);
    }
    
    cb();
  } catch (error) {
    console.error('Error encoding images:', error);
    cb(error);
  }
};

//Batch convert multiple PNG images using a JSON config file
// Usage: gulp encode-ink-batch --config=./config/display-config.json --inputDir=./firmware/imgs --outputDir=./firmware/imgs/ink
//
export const encode_ink_batch = async function(cb) {
  const configPath = process.env.config || './config/ink-encode-config.json';
  const inputDir = process.env.inputDir || './firmware/imgs';
  const outputDir = process.env.outputDir || inputDir;
  
  if (!existsSync(configPath)) {
    console.error(`Error: Config file not found: ${configPath}`);
    cb(new Error('Config file not found'));
    return;
  }
  
  try {
    const pngFiles = await glob(path.join(inputDir, '** / *.png'));
    
    if (pngFiles.length === 0) {
      console.log(`No PNG files found in ${inputDir}`);
      cb();
      return;
    }
    
    const options = await loadConfigFromJSON(configPath);
    
    // Create output directory if it doesn't exist
    if (!existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    for (const pngFile of pngFiles) {
      const relativePath = path.relative(inputDir, pngFile);
      const inkFile = path.join(outputDir, relativePath.replace(/\.png$/i, '.ink'));
      
      // Create subdirectories if needed
      const inkDir = path.dirname(inkFile);
      if (!existsSync(inkDir)) {
        mkdirSync(inkDir, { recursive: true });
      }
      
      console.log(`Converting ${pngFile} -> ${inkFile}...`);
      const inkData = await encodeInk(pngFile, options);
      fs.writeFileSync(inkFile, inkData);
      console.log(`✓ Converted ${pngFile} to ${inkFile}`);
    }
    
    console.log(`\n✓ Converted ${pngFiles.length} PNG files to .ink format`);
    cb();
  } catch (error) {
    console.error('Error encoding images:', error);
    cb(error);
  }
};



// ===========================================
// PlatformIO Tasks
// ===========================================

//
//Kill all running PlatformIO monitor processes
 //
function killMonitorProcesses() {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Kill all python processes that might be running monitor
      cp.exec('taskkill /F /IM python.exe /T 2>nul', (error) => {
        // Ignore errors (process might not exist)
        resolve();
      });
    } else {
      // Unix: Kill pio monitor processes
      cp.exec('pkill -f "pio.*monitor"', (error) => {
        // Ignore errors (process might not exist)
        resolve();
      });
    }
    
    // Also give it a moment to release the port
    setTimeout(resolve, 500);
  });
}
// Upload firmware and start monitor
// Usage: gulp firmware_upload_monitor
//
export const firmware_upload_monitor = async function(cb) {
  console.log('🔌 Closing any open serial monitors...');
  await killMonitorProcesses();
  
  console.log('📤 Uploading firmware to device...');
  
  // Upload first
  const upload = cp.spawn('pio', ['run', '-t', 'upload'], {
    stdio: 'inherit',
    shell: true
  });
  
  upload.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Upload failed with code ${code}`);
      cb(new Error('Upload failed'));
      return;
    }
    
    console.log('✅ Upload successful! Starting monitor...');
    
    // Wait a bit for the device to reset
    setTimeout(() => {
      // Then start monitor
      const monitor = cp.spawn('pio', ['device', 'monitor'], {
        stdio: 'inherit',
        shell: true
      });
      
      // Don't call cb() here - let monitor run
      monitor.on('exit', () => {
        cb();
      });
    }, 2000);
  });
};

//Just upload firmware (no monitor)
// Usage: gulp firmware_upload
//
export const firmware_upload = async function(cb) {
  console.log('🔌 Closing any open serial monitors...');
  await killMonitorProcesses();
  
  console.log('📤 Uploading firmware to device...');
  
  const upload = cp.spawn('pio', ['run', '-t', 'upload'], {
    stdio: 'inherit',
    shell: true
  });
  
  upload.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Upload failed with code ${code}`);
      cb(new Error('Upload failed'));
      return;
    }
    
    console.log('✅ Upload successful!');
    console.log('');
    console.log('💡 Tipps zum Monitor:');
    console.log('   - PuTTY: COM9, 115200 Baud');
    console.log('   - Arduino Serial Monitor');
    console.log('   - Oder: pio device monitor --raw (in neuem Terminal)');
    cb();
  });
};

export const firmware_build = function(cb) {
  console.log('🔨 Building firmware...');
  
  const build = cp.spawn('pio', ['run'], {
    stdio: 'inherit',
    shell: true
  });
  
  build.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Build failed with code ${code}`);
      cb(new Error('Build failed'));
      return;
    }
    
    console.log('✅ Build successful!');
    cb();
  });
};

*/


function _BuildServerPackages(_cb){
  _cb();
}

export const Build_Server_Packages = gulp.series(
	_BuildServerPackages,
	function(cb) {
			console.log('Packages build ready.');
			cb();
	}
);
