#!/usr/bin/env node
/**
 * scripts/scrape-effects.js
 * 
 * Scrapes card skill/effect text from the official hololive card game website.
 * Reads card IDs from data/official/*.json files and fetches each card's detail page.
 * Outputs data/effects-jp.json with extracted skills and metadata.
 * 
 * Uses only built-in Node.js modules (https, fs, path).
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://hololive-official-cardgame.com/cardlist/?id=';
const OFFICIAL_DIR = path.join(__dirname, '..', 'data', 'official');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'effects-jp.json');
const RATE_LIMIT_MS = 200;
const MAX_RETRIES = 3;

// Color name mapping
const COLOR_MAP = {
  'white': '白',
  'red': '赤',
  'blue': '青',
  'green': '緑',
  'purple': '紫',
  'yellow': '黄',
  'black': '黒',
};

/**
 * Fetch a URL and return the body text.
 * Uses built-in https module with retry logic.
 */
function fetchUrl(url, retries = MAX_RETRIES) {
  return new Promise((resolve, reject) => {
    const requester = url.startsWith('https') ? https : http;
    const req = requester.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; hunterCard/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          fetchUrl(res.headers.location, retries).then(resolve, reject);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
      });
    });
    req.on('error', (err) => {
      if (retries > 0) {
        setTimeout(() => {
          fetchUrl(url, retries - 1).then(resolve, reject);
        }, 1000);
      } else {
        reject(err);
      }
    });
    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) {
        setTimeout(() => {
          fetchUrl(url, retries - 1).then(resolve, reject);
        }, 1000);
      } else {
        reject(new Error(`Timeout for ${url}`));
      }
    });
  });
}

/**
 * Extract text content between tag open and close.
 * Handles simple cases - not a full HTML parser.
 */
function extractTagContent(html, tagName, className) {
  const classAttr = className ? ` class="${className}"` : '';
  const openTag = `<${tagName}${classAttr}`;
  
  // Find the opening tag
  let startIdx = html.indexOf(openTag);
  if (startIdx === -1) return null;
  
  // Find the closing '>' of the opening tag
  let tagEnd = html.indexOf('>', startIdx);
  if (tagEnd === -1) return null;
  
  // Now find the matching closing tag
  const closeTag = `</${tagName}>`;
  let endIdx = html.indexOf(closeTag, tagEnd);
  if (endIdx === -1) return null;
  
  return html.substring(tagEnd + 1, endIdx);
}

/**
 * Extract attribute value from HTML tag.
 */
function extractAttrValue(html, attrName) {
  const regex = new RegExp(`${attrName}="([^"]*)"`);
  const match = html.match(regex);
  return match ? match[1] : null;
}

/**
 * Strip HTML tags from text.
 */
function stripTags(text) {
  return text.replace(/<[^>]+>/g, '');
}

/**
 * Clean text by removing extra whitespace.
 */
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extract text content from a specific div by class name.
 * Returns the inner HTML of the first matching div.
 */
function extractDivByClass(html, className) {
  const pattern = `<div class="${className}">`;
  let startIdx = html.indexOf(pattern);
  if (startIdx === -1) {
    // Try partial match
    const regex = new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`);
    const match = html.match(regex);
    if (!match) return null;
    startIdx = match.index;
  }
  
  const contentStart = html.indexOf('>', startIdx) + 1;
  
  // Find matching closing div tag
  let depth = 1;
  let i = contentStart;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    
    if (nextClose === -1) break;
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      i = nextClose + 6;
    }
  }
  
  const endIdx = i;
  return html.substring(contentStart, endIdx - 6);
}

/**
 * Parse the info section of a card page to extract metadata.
 */
function parseInfo(html) {
  const info = {
    cardType: '',
    color: '',
    life: '',
    cardNumber: '',
  };
  
  // Get the cardlist-Detail_Box section
  const boxPattern = 'class="cardlist-Detail_Box"';
  let boxStart = html.indexOf(boxPattern);
  if (boxStart === -1) {
    // Try alternative pattern
    boxStart = html.indexOf('cardlist-Detail_Box');
  }
  if (boxStart === -1) return info;
  
  const boxContent = html.substring(boxStart);
  
  // Extract info section
  const infoDiv = extractDivByClass(boxContent, 'info');
  if (!infoDiv) return info;
  
  // Extract card type
  const typeMatch = infoDiv.match(/<dt>カードタイプ<\/dt>\s*<dd>([^<]+)<\/dd>/);
  if (typeMatch) info.cardType = cleanText(typeMatch[1]);
  
  // Extract color - look for img with alt text
  const colorMatch = infoDiv.match(/<dt>色<\/dt>\s*<dd>.*?<img[^>]*alt="([^"]+)"[^>]*>/);
  if (colorMatch) info.color = cleanText(colorMatch[1]);
  
  // Extract LIFE
  const lifeMatch = infoDiv.match(/<dt>LIFE<\/dt>\s*<dd>([^<]+)<\/dd>/);
  if (lifeMatch) info.life = cleanText(lifeMatch[1]);
  
  // Extract HP (for member cards)
  const hpMatch = infoDiv.match(/<dt>HP<\/dt>\s*<dd>([^<]+)<\/dd>/);
  if (hpMatch) info.hp = cleanText(hpMatch[1]);
  
  // Extract card number from the page
  const numMatch = boxContent.match(/カードナンバー[：:]\s*<span>([^<]+)<\/span>/);
  if (numMatch) info.cardNumber = cleanText(numMatch[1]);
  
  return info;
}

/**
 * Parse oshi skill section from HTML.
 * Structure: <div class="oshi skill"><p>推しスキル</p><p>[ホロパワー:-X]<span>skillName</span>effect text</p></div>
 */
function parseOshiSkill(html) {
  // Try to find the oshi skill div
  const oshiDiv = extractDivByClass(html, 'oshi');
  if (!oshiDiv) return null;
  
  // Find the paragraph with skill content (second <p>)
  const pMatch = oshiDiv.match(/<p>(.*?)<\/p>/);
  if (!pMatch) return null;
  
  // Get the full content between all <p> tags
  const pContents = [];
  const pRegex = /<p>(.*?)<\/p>/gs;
  let m;
  while ((m = pRegex.exec(oshiDiv)) !== null) {
    pContents.push(m[1]);
  }
  
  if (pContents.length < 2) return null;
  
  // The second <p> contains: [ホロパワー:-X]<span>name</span>effect
  const skillHtml = pContents[pContents.length - 1];
  
  // Parse cost: [ホロパワー:...]
  const costMatch = skillHtml.match(/^(\[ホロパワー:[^\]]*\])/);
  const cost = costMatch ? costMatch[1] : '';
  
  // Parse name from <span> tag
  const spanContent = extractTagContent(skillHtml, 'span');
  const name = spanContent ? cleanText(spanContent) : '';
  
  // Parse effect: everything after the </span>
  const effect = skillHtml.replace(/^\[ホロパワー:[^\]]*\]/, '')
    .replace(/<span>.*?<\/span>/, '')
    .trim();
  
  return {
    name: name,
    cost: cost,
    effect: cleanText(effect),
  };
}

/**
 * Parse SP oshi skill section from HTML.
 * Structure: <div class="sp skill"><p>SP推しスキル</p><p>[ホロパワー:-X]<span>skillName</span>effect text</p></div>
 */
function parseSpOshiSkill(html) {
  // Try to find the sp skill div
  const spDiv = extractDivByClass(html, 'sp');
  if (!spDiv) return null;
  
  const pContents = [];
  const pRegex = /<p>(.*?)<\/p>/gs;
  let m;
  while ((m = pRegex.exec(spDiv)) !== null) {
    pContents.push(m[1]);
  }
  
  if (pContents.length < 2) return null;
  
  const skillHtml = pContents[pContents.length - 1];
  
  const costMatch = skillHtml.match(/^(\[ホロパワー:[^\]]*\])/);
  const cost = costMatch ? costMatch[1] : '';
  
  const spanContent = extractTagContent(skillHtml, 'span');
  const name = spanContent ? cleanText(spanContent) : '';
  
  const effect = skillHtml.replace(/^\[ホロパワー:[^\]]*\]/, '')
    .replace(/<span>.*?<\/span>/, '')
    .trim();
  
  return {
    name: name,
    cost: cost,
    effect: cleanText(effect),
  };
}

/**
 * Parse generic skill text from non-oshi cards (member, support, etc.)
 * These don't have structured skill divs, so we extract the main text content.
 */
function parseGenericSkills(html, cardType) {
  const skills = {};
  
  // Extract the main text area content
  const txtInner = extractDivByClass(html, 'txt-Inner');
  if (!txtInner) return skills;
  
  // Get the full page text to extract ability descriptions
  // For support cards: 能力テキスト section
  // For member cards: アーツ sections
  
  // Try to extract all text between the info section and illustrator section
  const idxStart = html.indexOf('txt-Inner');
  if (idxStart === -1) return skills;
  
  const section = html.substring(idxStart);
  
  // Find the illustrator section end
  const illIdx = section.indexOf('illustrator');
  const textSection = illIdx > 0 ? section.substring(0, illIdx) : section;
  
  // Strip HTML tags to get plain text
  const plainText = stripTags(textSection);
  
  // Split by lines and filter
  const lines = plainText.split('\n').map(l => l.trim()).filter(l => l);
  
  // Look for skill-related content
  let skillParts = [];
  let currentKey = 'skill1';
  let foundSkill = false;
  
  for (const line of lines) {
    if (line.includes('アーツ') || line.includes('能力テキスト') || 
        line.includes('エクストラ') || line.includes('ギフト') ||
        line.includes('条件') || line.includes('特殊') ||
        line.match(/^\d+$/) || line.startsWith('+') ||
        line.includes('このホロメン') || line.includes('自分の') ||
        line.includes('相手の') || line.includes('ターン') ||
        line.includes('ダメージ') || line.includes('使える') ||
        line.includes('選ぶ') || line.includes('デッキ') ||
        line.includes('手札') || line.includes('ステージ') ||
        line === '') {
      if (line) {
        // Check if this looks like a skill header (アーツ, エクストラ, etc.)
        if (line.match(/^(アーツ|エクストラ|ギフト|条件)/)) {
          if (skillParts.length > 0) {
            skills[currentKey] = skillParts.join(' ').trim();
            currentKey = 'skill' + (Object.keys(skills).length + 1);
            skillParts = [];
          }
          skillParts.push(line);
          foundSkill = true;
        } else if (foundSkill) {
          skillParts.push(line);
        }
      }
    }
  }
  
  if (skillParts.length > 0) {
    skills[currentKey] = skillParts.join(' ').trim();
  }
  
  // If no structured skills found, try to extract the raw text area
  if (Object.keys(skills).length === 0) {
    const allText = stripTags(textSection);
    const cleaned = cleanText(allText);
    if (cleaned && cleaned.length > 5) {
      skills.skill1 = cleaned;
    }
  }
  
  return skills;
}

/**
 * Parse a card page HTML and extract all relevant data.
 */
function parseCardPage(html, id, cardData) {
  const result = {
    cardNumber: cardData.cardNumber || '',
    type: '',
    color: '',
    life: '',
    skills: {},
  };
  
  // Parse info section
  const info = parseInfo(html);
  result.type = info.cardType || cardData.cardType || '';
  result.color = info.color || '';
  result.life = info.life || '';
  result.cardNumber = info.cardNumber || cardData.cardNumber || '';
  
  // Color mapping: if color is in English format (e.g. "white"), map to Japanese
  if (COLOR_MAP[result.color.toLowerCase()]) {
    result.color = COLOR_MAP[result.color.toLowerCase()];
  }
  
  // For oshi cards (推しホロメン), parse structured skills
  if (result.type === '推しホロメン' || html.includes('oshi skill') || html.includes('sp skill')) {
    const oshiSkill = parseOshiSkill(html);
    if (oshiSkill) result.skills.oshiSkill = oshiSkill;
    
    const spOshiSkill = parseSpOshiSkill(html);
    if (spOshiSkill) result.skills.spOshiSkill = spOshiSkill;
    
    // If no structured skills found, try generic parsing
    if (Object.keys(result.skills).length === 0) {
      const generic = parseGenericSkills(html, result.type);
      Object.assign(result.skills, generic);
    }
  } else {
    // For all other card types, use generic parsing
    const generic = parseGenericSkills(html, result.type);
    Object.assign(result.skills, generic);
  }
  
  // Also try to extract any text that looks like skills from the raw content
  // Look for text between info and illustrator
  if (Object.keys(result.skills).length === 0) {
    const infoEndIdx = html.indexOf('</div>', html.indexOf('class="info"'));
    const illIdx = html.indexOf('illustrator');
    
    if (infoEndIdx > 0 && illIdx > infoEndIdx) {
      const rawText = html.substring(infoEndIdx, illIdx);
      const plainText = stripTags(rawText);
      const cleaned = cleanText(plainText);
      if (cleaned && cleaned.length > 3) {
        result.skills.skill1 = cleaned;
      }
    }
  }
  
  // If card number is still empty, try extracting from image src
  if (!result.cardNumber) {
    const imgMatch = html.match(/<img[^>]*src="[^"]*\/([^\/]+)\.(png|jpg)"/);
    if (imgMatch) {
      const imgName = imgMatch[1];
      // Try to extract card number pattern like hBP04-001
      const numPattern = imgName.match(/([A-Za-z]{2,5}\d{2,3}-\d{3,4})/);
      if (numPattern) result.cardNumber = numPattern[1];
    }
  }
  
  return result;
}

/**
 * Main function.
 */
async function main() {
  console.log('=== hololive OCG Card Effects Scraper ===');
  console.log(`Reading official data from: ${OFFICIAL_DIR}`);
  console.log(`Output to: ${OUTPUT_FILE}`);
  console.log('');
  
  // Read all official JSON files
  let allFiles;
  try {
    allFiles = fs.readdirSync(OFFICIAL_DIR);
  } catch (err) {
    console.error(`Error reading directory ${OFFICIAL_DIR}: ${err.message}`);
    process.exit(1);
  }
  
  // Filter for JSON files excluding meta and progress
  const jsonFiles = allFiles.filter(f => 
    f.endsWith('.json') && 
    !f.startsWith('_') && 
    f !== 'all-cards.json' && 
    f !== 'all-new-cards.json'
  );
  
  console.log(`Found ${jsonFiles.length} official data files.`);
  
  // Collect all cards with their IDs
  const cards = [];
  const seenIds = new Set();
  
  for (const file of jsonFiles) {
    const filePath = path.join(OFFICIAL_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        for (const card of data) {
          if (card.id && !seenIds.has(card.id)) {
            seenIds.add(card.id);
            cards.push({
              id: card.id,
              cardNumber: card.cardNumber || '',
              cardType: card.cardType || '',
              name: card.name || '',
              source: file,
            });
          }
        }
      }
    } catch (err) {
      console.error(`  Warning: Could not read ${file}: ${err.message}`);
    }
  }
  
  console.log(`Collected ${cards.length} unique cards to process.`);
  console.log('');
  
  // Process cards
  const results = {};
  let processed = 0;
  let errors = 0;
  let skipped = 0;
  const total = cards.length;
  
  for (const card of cards) {
    processed++;
    const url = BASE_URL + card.id;
    
    process.stdout.write(`  [${processed}/${total}] ID=${card.id} ${card.cardNumber || card.name} ... `);
    
    try {
      const html = await fetchUrl(url);
      
      if (!html || html.length < 500) {
        process.stdout.write('SKIPPED (empty response)\n');
        skipped++;
        continue;
      }
      
      const parsed = parseCardPage(html, card.id, card);
      
      // Only save if we have useful data
      if (parsed.cardNumber || parsed.type || Object.keys(parsed.skills).length > 0) {
        results[parsed.cardNumber || card.cardNumber || `id_${card.id}`] = parsed;
        process.stdout.write('OK\n');
      } else {
        process.stdout.write('SKIPPED (no data extracted)\n');
        skipped++;
      }
    } catch (err) {
      process.stdout.write(`ERROR: ${err.message}\n`);
      errors++;
    }
    
    // Rate limiting
    if (processed < total) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }
  }
  
  console.log('');
  console.log('=== Results ===');
  console.log(`  Total: ${total}`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Successfully extracted: ${Object.keys(results).length}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Skipped: ${skipped}`);
  
  // Write output
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Sort results by card number for consistency
  const sortedResults = {};
  const keys = Object.keys(results).sort();
  for (const key of keys) {
    sortedResults[key] = results[key];
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedResults, null, 2), 'utf8');
  console.log(`\nOutput written to: ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
  
  // Show first entry
  const firstKey = Object.keys(sortedResults)[0];
  if (firstKey) {
    console.log('\n=== First entry (sample) ===');
    console.log(JSON.stringify(sortedResults[firstKey], null, 2));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});