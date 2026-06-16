import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const SERIES_PAGES = [
  { name: 'hBP04', url: '/sell/hocg/s/search?search_word=&vers[]=hbp04' },
  { name: 'hBP01', url: '/sell/hocg/s/search?search_word=&vers[]=hbp01' },
  { name: 'hBP02', url: '/sell/hocg/s/search?search_word=&vers[]=hbp02' },
  { name: 'hBP03', url: '/sell/hocg/s/search?search_word=&vers[]=hbp03' },
  { name: 'hBP05', url: '/sell/hocg/s/search?search_word=&vers[]=hbp05' },
  { name: 'hBP06', url: '/sell/hocg/s/search?search_word=&vers[]=hbp06' },
  { name: 'hBP07', url: '/sell/hocg/s/search?search_word=&vers[]=hbp07' },
  { name: 'hBP08', url: '/sell/hocg/s/search?search_word=&vers[]=hbp08' },
  { name: 'hSD01', url: '/sell/hocg/s/search?search_word=&vers[]=hsd01' },
  { name: 'hSD02', url: '/sell/hocg/s/search?search_word=&vers[]=hsd02' },
  { name: 'hSD03', url: '/sell/hocg/s/search?search_word=&vers[]=hsd03' },
  { name: 'hSD04', url: '/sell/hocg/s/search?search_word=&vers[]=hsd04' },
  { name: 'hSD05', url: '/sell/hocg/s/search?search_word=&vers[]=hsd05' },
  { name: 'hSD06', url: '/sell/hocg/s/search?search_word=&vers[]=hsd06' },
  { name: 'hSD07', url: '/sell/hocg/s/search?search_word=&vers[]=hsd07' },
  { name: 'hSD08', url: '/sell/hocg/s/search?search_word=&vers[]=hsd08' },
  { name: 'hSD09', url: '/sell/hocg/s/search?search_word=&vers[]=hsd09' },
  { name: 'hSD10', url: '/sell/hocg/s/search?search_word=&vers[]=hsd10' },
  { name: 'hSD11', url: '/sell/hocg/s/search?search_word=&vers[]=hsd11' },
  { name: 'hSD12', url: '/sell/hocg/s/search?search_word=&vers[]=hsd12' },
  { name: 'hSD13', url: '/sell/hocg/s/search?search_word=&vers[]=hsd13' },
  { name: 'hSD14', url: '/sell/hocg/s/search?search_word=&vers[]=hsd14' },
  { name: 'hSD15', url: '/sell/hocg/s/search?search_word=&vers[]=hsd15' },
  { name: 'hSD16', url: '/sell/hocg/s/search?search_word=&vers[]=hsd16' },
  { name: 'hSD17', url: '/sell/hocg/s/search?search_word=&vers[]=hsd17' },
  { name: 'hSD18', url: '/sell/hocg/s/search?search_word=&vers[]=hsd18' },
  { name: 'hSD19', url: '/sell/hocg/s/search?search_word=&vers[]=hsd19' },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  // allPrices[cardNum] = [{ sellPrice, rarity, name }]
  const allPrices = {};
  let totalListings = 0;

  for (const s of SERIES_PAGES) {
    console.log('Scraping', s.name);
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(30000);
      await page.goto('https://yuyu-tei.jp' + s.url, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));

      // Aggressive scroll to trigger ALL lazy loads
      await page.evaluate(async () => {
        let prevHeight = 0;
        for (let i = 0; i < 30; i++) {
          window.scrollBy(0, 1000);
          await new Promise(r => setTimeout(r, 400));
          const newHeight = document.body.scrollHeight;
          if (newHeight === prevHeight && i > 5) break;
          prevHeight = newHeight;
        }
      });
      await new Promise(r => setTimeout(r, 500));

      const results = await page.evaluate(() => {
        const r = [];
        const items = document.querySelectorAll('.card-product');
        items.forEach(el => {
          const text = el.textContent.trim();
          const numMatch = text.match(/(h[A-Z]{1,3}\d+-\d{2,3})/i);
          if (!numMatch) return;
          const cardNum = numMatch[1];

          const priceMatch = text.match(/([\d,]+)\s*円/);
          if (!priceMatch) return;
          const price = parseInt(priceMatch[1].replace(/,/g, ''));
          if (isNaN(price) || price <= 0) return;

          // Try to find rarity code
          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          let name = '';
          let rarity = '';
          const numIdx = lines.findIndex(l => l.match(/h[A-Z]{1,3}\d+-\d{2,3}/i));
          if (numIdx >= 0) {
            const cardLine = lines[numIdx];
            const rarityMatch = cardLine.match(/h[A-Z]{1,3}\d+-\d{2,3}\s+([A-Z]{2,4})\b/i);
            if (rarityMatch) rarity = rarityMatch[1];
            for (let i = numIdx + 1; i < lines.length; i++) {
              if (!lines[i].match(/[\d,]+\s*円/) && !lines[i].includes('在庫') && !lines[i].includes('カート')) {
                name = lines[i];
                break;
              }
            }
          }
          if (!name && lines.length > 0) {
            const cardLine = lines[numIdx >= 0 ? numIdx : 0];
            const namePart = cardLine.replace(/h[A-Z]{1,3}\d+-\d{2,3}\s*[A-Z]{2,4}\s*/i, '').trim();
            if (namePart && namePart.length > 1) name = namePart;
          }

          r.push({ cardNum, price, rarity, name });
        });
        return r;
      });

      console.log('  → Found', results.length, 'listings');
      totalListings += results.length;

      for (const r of results) {
        if (!allPrices[r.cardNum]) allPrices[r.cardNum] = [];
        // Only add if this price+rarity combo is new
        const exists = allPrices[r.cardNum].some(p => p.sellPrice === r.price && p.rarity === r.rarity);
        if (!exists) {
          allPrices[r.cardNum].push({
            sellPrice: r.price,
            rarity: r.rarity || '',
            name: r.name || '',
            timestamp: new Date().toISOString(),
          });
        }
      }

      await page.close();
    } catch (e) {
      console.log('  Error:', e.message);
    }
  }

  await browser.close();

  // Stats
  let multiCount = 0;
  let totalUnique = Object.keys(allPrices).length;
  for (const [k, v] of Object.entries(allPrices)) {
    if (v.length > 1) multiCount++;
  }
  console.log('\n=== RESULTS ===');
  console.log('Total unique cards:', totalUnique);
  console.log('Total listings:', totalListings);
  console.log('Multi-price cards:', multiCount);

  // Show hBP04-005
  const h04_5 = allPrices['hBP04-005'] || [];
  console.log('hBP04-005 prices:', h04_5.length, 'variants');
  h04_5.forEach(p => console.log('  ¥' + p.sellPrice.toLocaleString(), p.rarity ? '[' + p.rarity + ']' : '', p.name));

  // Save for debugging
  fs.writeFileSync('prices_fix.json', JSON.stringify(allPrices, null, 2));
  console.log('\nSaved to prices_fix.json');
}

run().catch(e => { console.error(e); process.exit(1); });
