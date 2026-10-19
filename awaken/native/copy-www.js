// Copies the web app into www/, which Capacitor bundles into the APK.
const fs = require('fs'), path = require('path');
const APP = path.join(__dirname, '..'), OUT = path.join(__dirname, 'www');
const FILES = ['index.html', 'privacy.html', 'manifest.webmanifest', 'sw.js', 'icons', 'widgets'];
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of FILES) fs.cpSync(path.join(APP, f), path.join(OUT, f), { recursive: true });
console.log('www ready');
