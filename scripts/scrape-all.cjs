const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = "https://hololive-official-cardgame.com";

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 Chrome/120" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function getAllSeries() {
  const html = await fetchHtml(BASE + "/cardlist/");
  const seen = new Set();
  const series = [];
  const re = /expansion=([^&"]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const code = m[1];
    if (!seen.has(code)) {
      seen.add(code);
      series.push(code);
    }
  }
  return series;
}

function parseCards(html, defaultExpansion) {
  const cards = [];
  const liRe = /<li class="object-fit-img[^>]*>[\s\S]*?<\/li>/g;
  let li;
  while ((li = liRe.exec(html)) !== null) {
    const block = li[0];
    const idMatch = block.match(/[?&]id=(\d+)/);
    const expMatch = block.match(/[?&]expansion=([^&"]+)/);
    const srcMatch = block.match(/src="([^"]+)"/);
    const altMatch = block.match(/alt="([^"]+)"/);
    if (!idMatch || !srcMatch) continue;
    const imgFile = srcMatch[1].split("/").pop();
    const cardNumMatch = imgFile.match(/^([^_]+)_/);
    const rarityMatch = imgFile.match(/_([^.]+)\./);
    cards.push({
      id: idMatch[1],
      expansion: expMatch ? expMatch[1] : defaultExpansion,
      imageUrl: BASE + srcMatch[1],
      name: altMatch ? altMatch[1] : "",
      cardNumber: cardNumMatch ? cardNumMatch[1] : "",
      rarity: rarityMatch ? rarityMatch[1] : "",
    });
  }
  return cards;
}

async function scrapeExpansion(code) {
  const firstHtml = await fetchHtml(BASE + "/cardlist/cardsearch/?expansion=" + code);
  const maxPageMatch = firstHtml.match(/var max_page = (\d+)/);
  const maxPage = maxPageMatch ? parseInt(maxPageMatch[1]) : 1;
  const cards = parseCards(firstHtml, code);
  for (let p = 2; p <= maxPage; p++) {
    const url = BASE + "/cardlist/cardsearch_ex?expansion=" + code + "&view=image&page=" + p + "&t=" + Date.now();
    const html = await fetchHtml(url);
    cards.push(...parseCards(html, code));
    await new Promise(r => setTimeout(r, 150));
  }
  return cards;
}

async function main() {
  const outputDir = path.join(__dirname, "../data/official");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log("Fetching all series from website...");
  const allSeries = await getAllSeries();
  console.log("Found " + allSeries.length + " series: " + allSeries.join(", "));

  const allCards = [];
  let totalNew = 0;

  for (const code of allSeries) {
    const dataFile = path.join(outputDir, code + ".json");
    process.stdout.write("Scraping " + code + "... ");
    try {
      const cards = await scrapeExpansion(code);
      if (cards.length > 0) {
        fs.writeFileSync(dataFile, JSON.stringify(cards, null, 2));
        allCards.push(...cards);
        totalNew += cards.length;
        console.log(cards.length + " cards");
      } else {
        console.log("0 cards (skipped)");
      }
    } catch(e) {
      console.log("ERROR: " + e.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  fs.writeFileSync(path.join(outputDir, "all-cards.json"), JSON.stringify(allCards, null, 2));

  const meta = { updatedAt: new Date().toISOString(), totalCards: allCards.length, series: allSeries };
  fs.writeFileSync(path.join(outputDir, "_meta.json"), JSON.stringify(meta, null, 2));

  console.log("Done. Total: " + totalNew + " cards across " + allSeries.length + " series.");
}

main().catch(console.error);
