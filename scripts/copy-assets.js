/**
 * copy-assets.js — Build 時複製 database.json 和圖片到 dist/
 *
 * 在 Vercel build 流程中執行，確保靜態資源可以被 App 存取
 */
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(PROJECT_DIR, 'dist');

console.log('[copy-assets] Copying assets to dist/...');

// Copy database.json
const dbSource = path.join(PROJECT_DIR, 'data', 'database.json');
const dbDest = path.join(DIST_DIR, 'data', 'database.json');

if (fs.existsSync(dbSource)) {
  fs.mkdirSync(path.dirname(dbDest), { recursive: true });
  fs.copyFileSync(dbSource, dbDest);
  console.log(`  ✅ database.json → dist/data/database.json`);
} else {
  console.log(`  ⚠️  database.json not found, skipping`);
}

// Copy images
const imagesSource = path.join(PROJECT_DIR, 'data', 'images');
const imagesDest = path.join(DIST_DIR, 'images');

if (fs.existsSync(imagesSource)) {
  fs.mkdirSync(imagesDest, { recursive: true });

  const files = fs.readdirSync(imagesSource);
  let count = 0;
  files.forEach(file => {
    const srcPath = path.join(imagesSource, file);
    const dstPath = path.join(imagesDest, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, dstPath);
      count++;
    }
  });
  console.log(`  ✅ ${count} images → dist/images/`);
} else {
  console.log(`  ⚠️  data/images/ not found, skipping`);
}

console.log('[copy-assets] Done!');