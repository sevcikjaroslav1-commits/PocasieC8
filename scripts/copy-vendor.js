// Copies MapLibre GL into www/vendor so the app works without a CDN.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const dst = path.join(__dirname, '..', 'www', 'vendor', 'maplibre');
fs.mkdirSync(dst, { recursive: true });
for (const f of ['maplibre-gl.js', 'maplibre-gl.css']) fs.copyFileSync(path.join(src, f), path.join(dst, f));
console.log('MapLibre copied to www/vendor/maplibre');
