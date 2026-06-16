# Fix Yuyu-tei URL & Price Display for No-Price Cards

## Background
Two bugs found in the hunterCard app:

## Task 1: Fix yuyu-tei URL format
**Current (wrong):** `https://yuyu-tei.jp/top/hocg/?s=hBP08-002`
**Correct:** `https://yuyu-tei.jp/sell/hocg/s/search?search_word=hBP08-002`

### Files to modify:
1. `src/screens/CardDetailScreen.tsx` — line 99 (the `yuyuUrl` constant)
2. `src/screens/SearchResultsScreen.tsx` — line 178 (the `yuyuUrl` in the searchCards mapping function)

### What to do:
- Replace the URL format in both files with the correct one
- The card ID should be URL-encoded via `encodeURIComponent(id)`

## Task 2: Remove estimated prices — show "暫無資料" instead
**Current (wrong):** `CardDetailScreen.tsx` has a `priceEstimate` table (lines 14-19) that guesses prices by rarity. When a card has no actual yuyu-tei price, it shows an estimated price instead.

**Correct:** If a card has no actual yuyu-tei price data (`card.yuyuPrice` is null/0), show "暫無資料" instead of any estimated/guessed price.

### File to modify:
1. `src/screens/CardDetailScreen.tsx`

### What to do:
1. **Remove** the `priceEstimate` table (lines 14-19) and all logic referencing it
2. **Simplify** the price section: if `hasActualPrice` is false, show "暫無資料" — don't show any estimated price, range, or "預估價格" badge
3. Keep the yuyu URL button ("查看遊々亭即時價格") working with the corrected URL, even when there's no price data
4. The `hasNoPrice` / `noPriceText` logic already exists at lines 144-145 — just make sure it's the ONLY path for cards without prices (no fallback to estimates)

### Verification:
- `npx tsc --noEmit` must pass with zero errors
- Test on a card that has NO price (e.g. hBP08-001 — a new series card without yuyu data) → should show "暫無資料"
- Test on a card that HAS a price → should show the real price as before
- The yuyu button link should open `https://yuyu-tei.jp/sell/hocg/s/search?search_word=<cardId>`