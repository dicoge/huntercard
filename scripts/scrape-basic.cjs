const https = require("https");
const fs = require("fs");
const path = require("path");

const SERIES = ["hBP04", "hBP05", "hBP06", "hBP07"];

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 Chrome/120" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
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
      imageUrl: "https://hololive-official-cardgame.com" + srcMatch[1],
      name: altMatch ? altMatch[1] : "",
      cardNumber: cardNumMatch ? cardNumMatch[1] : "",
      rarity: rarityMatch ? rarityMatch[1] : "",
    });
  }
  return cards;
}

async function getAllCards(code) {
  const base = "https://hololive-official-cardgame.com";
  const firstHtml = await fetchHtml(base + "/cardlist/cardsearch/?expansion=" + code);
  const maxPageMatch = firstHtml.match(/var max_page = (\d+)/);
  const maxPage = maxPageMatch ? parseInt(maxPageMatch[1]) : 1;
  console.log("  pages=" + maxPage);
  const cards = parseCards(firstHtml, code);
  for (let p = 2; p <= maxPage; p++) {
    const url = base + "/cardlist/cardsearch_ex?expansion=" + code + "&view=image&page=" + p + "&t=" + Date.now();
    const html = await fetchHtml(url);
    cards.push(...parseCards(html, code));
    await new Promise(r => setTimeout(r, 150));
  }
  return cards;
}

async function main() {
  console.log("Starting...");
  const outputDir = path.join(__dirname, "../data/official");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const all = [];
  for (const code of SERIES) {
    process.stdout.write("Scraping " + code + "... ");
    const cards = await getAllCards(code);
    all.push(...cards);
    fs.writeFileSync(path.join(outputDir, code + ".json"), JSON.stringify(cards, null, 2));
    console.log(cards.length + " cards");
  }
  fs.writeFileSync(path.join(outputDir, "all-new-cards.json"), JSON.stringify(all, null, 2));
  console.log("Done. Total: " + all.length + " cards");
}

main().catch(console.error);
