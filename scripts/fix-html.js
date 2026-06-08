/**
 * Post-build script: injects PWA meta tags into Expo's generated index.html
 * and copies public assets to dist/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

// Read the generated index.html
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Copy manifest.json to dist
fs.copyFileSync(
  path.join(publicDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// If manifest link already exists (public/index.html has it), skip re-adding
if (html.includes('manifest')) {
  console.log('PWA meta tags already present, skipping injection.');
  process.exit(0);
}

// Inject PWA meta tags and Apple-specific tags before </head>
const pwaTags = `
    <!-- PWA -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#ffffff" />
    
    <!-- iOS Safari PWA meta tags -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HoloHunter" />
    <link rel="apple-touch-icon" href="/favicon.ico" />
  `;

// Add type="module" to all bundle script tags (fixes import.meta outside module error)
html = html.replace(
  /<script\s+src="(\/_expo\/static\/js\/web\/.*?)"\s+defer><\/script>/g,
  '<script type="module" src="$1" defer></script>'
);

html = html.replace('</head>', pwaTags + '\n  </head>');
fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('PWA meta tags injected into dist/index.html');
