/**
 * Quick test: can puppeteer-extra + stealth access yuyu-tei.jp?
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Anti-detection
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    
    console.log('Navigating to yuyu-tei hbp04...');
    const response = await page.goto('https://yuyu-tei.jp/sell/hocg/s/hbp04', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log(`HTTP status: ${response.status()}`);
    
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    
    const cardProducts = await page.evaluate(() => {
      return document.querySelectorAll('.card-product').length;
    });
    console.log(`.card-product count: ${cardProducts}`);
    
    // Check body text for 403 or block messages
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log(`Body preview: "${bodyText.replace(/\n/g, ' | ').slice(0, 300)}"`);
    
    if (cardProducts > 0) {
      // Try to extract first card
      const firstCard = await page.evaluate(() => {
        const el = document.querySelector('.card-product');
        return el ? el.textContent.trim().slice(0, 200) : 'none';
      });
      console.log(`First card: "${firstCard}"`);
      console.log('✅ SUCCESS! Puppeteer-extra + stealth works!');
    } else {
      // Check if we got a 403 or block page
      if (bodyText.includes('403') || bodyText.includes('Access Denied') || bodyText.includes('blocked')) {
        console.log('❌ FAILED: Blocked by Cloudflare/WAF');
      } else {
        console.log('⚠️ Page loaded but no card products found');
      }
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

test().then(() => {
  console.log('\nTest complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});