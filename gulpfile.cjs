// CommonJS wrapper to import the ES module gulpfile.mjs
(async () => {
  try {
    const mod = await import('./gulpfile.mjs');
    Object.assign(module.exports, mod);
  } catch (err) {
    /* eslint-disable no-console */
    console.error('Failed to load gulpfile.mjs:', err);
    process.exitCode = 1;
  }
})();
