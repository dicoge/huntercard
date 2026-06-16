/**
 * 卡牌識別服務
 * Card Recognition Service
 * 
 * 用於識別掃描的卡牌並返回價格資訊
 * 資料來源：database.json（統一資料庫）
 */

// ── 類型定義 ──

export interface CardInfo {
  id: string;
  name: string;
  cardNumber: string;
  type: string;
  rarity: string;
  series: string;
  sellPrice: number | null;  // null = 無交易記錄
  yuyuName: string;
  color: string;
  imageUrl: string;
}

export interface RecognitionResult {
  success: boolean;
  card?: CardInfo;
  suggestions?: CardInfo[];
  error?: string;
}

// ── 資料庫快取 ──

interface DatabaseRecord {
  id: string;
  name: string;
  type: string;
  rarity: string;
  series: string;
  sellPrice: number | null;
  yuyuName: string;
  color: string;
  localImage?: string;
  officialImage?: string;
  [key: string]: any;
}

interface DatabaseSchema {
  cards: Record<string, DatabaseRecord>;
  totalCards: number;
  lastUpdated: string;
}

let cachedDb: CardInfo[] | null = null;
let dbFetchPromise: Promise<CardInfo[]> | null = null;

/**
 * 載入 database.json 並轉換為 CardInfo 陣列
 */
export async function loadAllCards(): Promise<CardInfo[]> {
  if (cachedDb) return cachedDb;
  if (dbFetchPromise) return dbFetchPromise;

  dbFetchPromise = (async () => {
    try {
      const res = await fetch('/data/database.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const db: DatabaseSchema = await res.json();
      const cards = db.cards || {};
      
      const result: CardInfo[] = Object.values(cards).map(c => ({
        id: (c as any).cardNumber || c.id || '',
        name: c.name || '',
        cardNumber: (c as any).cardNumber || c.id || '',
        type: c.type || '',
        rarity: c.rarity || '',
        series: c.series || '',
        sellPrice: c.sellPrice != null && c.sellPrice > 0 ? c.sellPrice : null,
        yuyuName: c.yuyuName || '',
        color: c.color || '',
        imageUrl: c.officialImage || c.localImage || '',
      }));

      cachedDb = result;
      return result;
    } catch (e: any) {
      console.error('[cardRecognition] Failed to load database:', e.message);
      dbFetchPromise = null;
      return [];
    }
  })();

  return dbFetchPromise;
}

// ── 文字相似度 ──

/**
 * 計算兩個字符串的相似度 (Levenshtein 距離)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '');
  const s2 = str2.toLowerCase().replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '');

  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}

/**
 * 從名稱中提取關鍵字
 */
function extractKeywords(name: string): string[] {
  const cleanName = name.replace(/[（(][^)）]*[)）]/g, '');
  return cleanName.split(/[\s　]+/).filter(k => k.length > 0);
}

/**
 * 檢查關鍵字是否匹配
 */
function keywordsMatch(cardKeywords: string[], searchKeywords: string[]): number {
  let matches = 0;
  for (const search of searchKeywords) {
    for (const card of cardKeywords) {
      if (card.includes(search) || search.includes(card)) {
        matches++;
        break;
      }
    }
  }
  return searchKeywords.length > 0 ? matches / searchKeywords.length : 0;
}

// ── 主辨識邏輯 ──

/**
 * 識別卡牌（通過文字搜索）
 * @param searchText - 從 OCR 或用戶輸入的文字
 * @returns 識別結果
 */
export async function recognizeCard(searchText: string): Promise<RecognitionResult> {
  if (!searchText || searchText.trim().length === 0) {
    return { success: false, error: '請輸入搜尋文字' };
  }

  const allCards = await loadAllCards();
  if (allCards.length === 0) {
    return { success: false, error: '資料庫載入失敗' };
  }

  const query = searchText.trim();

  // 1. 精確匹配卡號 (大小寫不敏感)
  const exactIdMatch = allCards.find(c => c.id.toLowerCase() === query.toLowerCase());
  if (exactIdMatch) {
    return { success: true, card: exactIdMatch };
  }

  // 2. 名稱完全匹配
  const exactNameMatch = allCards.find(c => c.name === query);
  if (exactNameMatch) {
    return { success: true, card: exactNameMatch };
  }

  // 3. 卡號前綴匹配 (如 "hBP04" 匹配所有 hBP04 系列)
  const idPrefixMatch = allCards.filter(c => c.id.toLowerCase().startsWith(query.toLowerCase()));
  if (idPrefixMatch.length === 1) {
    return { success: true, card: idPrefixMatch[0] };
  }
  if (idPrefixMatch.length > 1) {
    return {
      success: true,
      card: idPrefixMatch[0],
      suggestions: idPrefixMatch.slice(1, 4),
    };
  }

  // 4. 名稱包含匹配
  const queryLower = query.toLowerCase();
  const containsMatch = allCards.filter(c => c.name.toLowerCase().includes(queryLower));
  if (containsMatch.length === 1) {
    return { success: true, card: containsMatch[0] };
  }
  if (containsMatch.length > 1) {
    return {
      success: true,
      card: containsMatch[0],
      suggestions: containsMatch.slice(1, 4),
    };
  }

  // 5. 模糊相似度匹配
  const searchKeywords = extractKeywords(query);
  const scoredCards = allCards.map(card => {
    const cardKeywords = extractKeywords(card.name);
    const keywordScore = keywordsMatch(cardKeywords, searchKeywords);
    const similarityScore = Math.max(
      ...searchKeywords.map(search =>
        Math.max(...cardKeywords.map(c => calculateSimilarity(search, c))),
      ),
    );
    const totalScore = keywordScore * 0.5 + similarityScore * 0.5;
    return { card, score: totalScore };
  });

  scoredCards.sort((a, b) => b.score - a.score);
  const topResult = scoredCards[0];

  if (topResult && topResult.score > 0.3) {
    return {
      success: true,
      card: topResult.card,
      suggestions: scoredCards.slice(1, 4).map(s => s.card).filter(Boolean),
    };
  }

  return {
    success: false,
    error: '找不到匹配的卡牌',
    suggestions: scoredCards.slice(0, 5).map(s => s.card).filter(Boolean),
  };
}

/**
 * 根據卡牌 ID 獲取價格
 */
export async function getCardPrice(cardId: string): Promise<number | null> {
  const allCards = await loadAllCards();
  const card = allCards.find(c => c.id === cardId);
  return card?.sellPrice ?? null;
}

/**
 * 搜尋卡牌
 */
export async function searchCards(query: string, limit: number = 10): Promise<CardInfo[]> {
  const allCards = await loadAllCards();
  const queryLower = query.toLowerCase();

  return allCards
    .filter(card =>
      card.name.toLowerCase().includes(queryLower) ||
      card.id.toLowerCase().includes(queryLower) ||
      card.series.toLowerCase().includes(queryLower),
    )
    .slice(0, limit);
}

export default {
  recognizeCard,
  getCardPrice,
  searchCards,
  loadAllCards,
};