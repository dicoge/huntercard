#!/usr/bin/env node
// Quick test: scrape hBP04 page and see what comes out for hBP04-005

const html = await fetch('https://yuyu-tei.jp/sell/hocg/s/hbp04', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'ja-JP,ja;q=0.9',
  }
}).then(r => r.text());

console.log(`HTML size: ${html.length} bytes`);

// The parseCardHtml logic from build-database.js
// Strip style/script tags
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const cardNumRegex = /(h[A-Z]{1,3}\d+-\d{2,3})/gi;
const counts = {};
let match;

while ((match = cardNumRegex.exec(text)) !== null) {
  const cardNum = match[1];
  const matchStart = match.index;
  const contextEnd = Math.min(text.length, matchStart + 300);
  const context = text.slice(matchStart, contextEnd);
  const priceMatch = context.match(/([\d,]+)\s*円/);
  const price = priceMatch ? priceMatch[1] : '?';
  
  if (!counts[cardNum]) counts[cardNum] = [];
  counts[cardNum].push(price);
}

// Find hBP04-005
if (counts['hBP04-005']) {
  console.log('\nhBP04-005 prices found:', counts['hBP04-005'].join(', '));
  console.log(`Count: ${counts['hBP04-005'].length} versions`);
} else {
  console.log('\nhBP04-005 NOT FOUND in parsed text!');
}

// Stats
let multi = 0;
let total = Object.keys(counts).length;
for (const [k, v] of Object.entries(counts)) {
  if (v.length > 1) multi++;
}
console.log(`\nTotal unique card numbers: ${total}`);
console.log(`Cards with 2+ price entries: ${multi}`);

// Show a few multi-price examples
let shown = 0;
for (const [k, v] of Object.entries(counts)) {
  if (v.length > 1 && shown < 5) {
    console.log(`  ${k}: ${v.join(', ')}`);
    shown++;
  }
}