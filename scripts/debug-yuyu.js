/**
 * Debug script to capture yuyu-tei page and inspect structure
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

const url = 'https://yuyu-tei.jp/sell/hocg/s/hbp04';
console.log('Navigating to:', url);

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

// Take screenshot
await page.screenshot({ path: path.join(__dirname, 'yuyu-debug.png'), fullPage: true });
console.log('Screenshot saved to yuyu-debug.png');

// Get page HTML structure
const html = await page.content();
fs.writeFileSync(path.join(__dirname, 'yuyu-debug.html'), html);
console.log('HTML saved to yuyu-debug.html');

// Extract DOM structure info
const structure = await page.evaluate(() => {
  const info = {
    bodyClasses: document.body.className,
    allClasses: [],
    productElements: [],
  };

  // Find all elements that might contain products
  const selectors = [
    '.product', '.item', '.card', '.hocg-item',
    '[class*="product"]', '[class*="item"]', '[class*="card"]',
    'article', 'li',
  ];

  const elements = document.querySelectorAll(selectors.join(', '));
  elements.forEach(el => {
    const classes = el.className?.split(' ').filter(c => c).slice(0, 3);
    if (classes.length > 0 && !info.allClasses.includes(classes.join(' '))) {
      info.allClasses.push(classes.join(' '));
    }
    
    // Check if this element has price-like content
    const text = el.textContent?.trim();
    if (text && (text.includes('円') || text.match(/h[A-Z]{1,3}\d+-\d{2,3}/i))) {
      info.productElements.push({
        tag: el.tagName.toLowerCase(),
        classes: classes,
        text: text.substring(0, 100),
      });
    }
  });

  return info;
});

console.log('\n=== Page Structure ===');
console.log('Body classes:', structure.bodyClasses);
console.log('\nUnique class combinations:', structure.allClasses.slice(0, 30));
console.log('\nProduct-like elements:', structure.productElements.length);
structure.productElements.slice(0, 10).forEach(el => {
  console.log('  ', el);
});

await browser.close();
