# Support Multiple Price Variants Per Card (Signed vs Unsigned/Parallel)

## Background
On yuyu-tei, the same card number can have multiple versions with vastly different prices:
- `hBP01-001 OUR 天音かなた(パラレル)` → ¥24,800 (signed/parallel)
- `hBP01-001 OSR 天音かなた` → ¥980 (normal)

The current scraper only keeps ONE price per card number (`seriesPrices[cardNum] = {...}`), overwriting the other version. This loses critical price data.

## Scope
Three layers need changes:

### Layer 1: Scraper (`scripts/build-database.js`)
**Current behavior:** Both `scrapeSeriesPage` (Puppeteer) and `scrapeSeriesPageWithFetch` (HTML fetch) use cardNum as a unique key:
```js
seriesPrices[cardNum] = {
  sellPrice: card.sellPrice,
  name: card.name,
  yuyuImage: card.yuyuImage,
  imageVersion: card.imageVersion,
  imageCid: card.imageCid,
  timestamp: new Date().toISOString(),
};
```

**Fix:** Change to store ALL entries per cardNum:
```js
seriesPrices[cardNum] = seriesPrices[cardNum] || [];
seriesPrices[cardNum].push({
  name: card.name,       // e.g. "天音かなた(パラレル)" or "天音かなた"
  sellPrice: card.sellPrice,
  rarity: card.rarity,   // e.g. "OUR", "OSR" — extract from the page if available
  yuyuImage: card.yuyuImage,
  imageVersion: card.imageVersion,
  imageCid: card.imageCid,
  timestamp: new Date().toISOString(),
});
```

Also update the `parseCardHtml` function in the same way.

### Layer 2: Database Build (`scripts/build-database.js` lines 614-633)
**Current:** Single `sellPrice` and `yuyuName` fields
**Fix:** Replace with a `prices` array:
```json
{
  "prices": [
    {"name": "天音かなた(パラレル)", "sellPrice": 24800, "yuyuImage": "..."},
    {"name": "天音かなた", "sellPrice": 980, "yuyuImage": "..."}
  ],
  "sellPrice": 980,         // Keep for backward compat: lowest price
  "yuyuName": "天音かなた",  // Keep: name of lowest-price variant
}
```

Keep `sellPrice` and `yuyuName` for backward compatibility (CardItem/other screens):
- `sellPrice` = lowest price from the array
- `yuyuName` = name of the lowest-price entry

### Layer 3: Frontend Display — `CardDetailScreen.tsx`
**Current:** Shows single price
**Fix:** When `card.prices` array has 2+ entries, show BOTH versions:
```
🏪 遊々亭
┌──────────────────────┐
│ 天音かなた(パラレル)   │
│ ¥24,800              │ ← Parallel/signed version
├──────────────────────┤
│ 天音かなた            │
│ ¥980                 │ ← Normal version
├──────────────────────┤
│ 🔍 查看遊々亭即時價格 → │
└──────────────────────┘
```

Logic:
- If prices array has 1 entry → show single price (current style)
- If prices array has 2+ entries → show list of version-name + price
- Always show "查看遊々亭即時價格" button
- Still use badge: "實際售價" / "暫無資料"

### Layer 4: Frontend — `CardItem.tsx`
**Current:** Shows min price from `card.prices` array OR fallback
**Fix:**
- If multiple variants exist, show the lowest price as before, but add a small indicator like `+ variants` or just keep current behavior (lowest price)
- The `prices` field on HoloCard will come from the API server, which already supports arrays — just verify it works

### Layer 5: Frontend — `SearchResultsScreen.tsx`
**Current:** Shows single `yuyuPrice` 
**Fix:** If `card.yuyuPrice` is the lowest variant, show it. Optionally add a tag like "+1" if there are multiple variants.

### Files to modify:
1. `scripts/build-database.js` — scraper + database builder (biggest change)
2. `src/screens/CardDetailScreen.tsx` — display multiple price variants
3. `src/screens/SearchResultsScreen.tsx` — update CardResult type + yuyuPrice handling

### Verification:
- `npx tsc --noEmit` must pass
- Run the scraper locally and verify hBP01-001 has BOTH ¥24,800 and ¥980 in its prices array
- Verify CardDetail shows both versions for cards with multiple variants
- Verify cards with single variant still display normally
