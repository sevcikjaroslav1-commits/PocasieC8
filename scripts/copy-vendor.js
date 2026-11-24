// Copies Leaflet into www/vendor so the app works without a CDN.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist');
const dst = path.join(__dirname, '..', 'www', 'vendor', 'leaflet');
fs.mkdirSync(path.join(dst, 'images'), { recursive: true });
for (const f of ['leaflet.js', 'leaflet.css']) fs.copyFileSync(path.join(src, f), path.join(dst, f));
for (const f of fs.readdirSync(path.join(src, 'images'))) fs.copyFileSync(path.join(src, 'images', f), path.join(dst, 'images', f));
console.log('Leaflet copied to www/vendor/leaflet');
