// CommonJS wrapper to import the ES module gulpfile.mjs via an absolute file:// URL
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  try {
    const absolute = path.resolve(__dirname, 'gulpfile.mjs');
    const url = pathToFileURL(absolute).href;
    const mod = await import(url);
    Object.assign(module.exports, mod);
  } catch (err) {
    console.error('Failed to load gulpfile.mjs:', err);
    process.exitCode = 1;
  }
})();
