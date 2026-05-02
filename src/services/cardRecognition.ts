/**
 * 卡牌識別服務
 * Card Recognition Service
 * 
 * 用於識別掃描的卡牌並返回價格資訊
 */

import yuyuPrices from '../../data/yuyu-prices/yuyu-prices.json';

export interface CardInfo {
  id: string;
  name: string;
  sellPrice: number;
  timestamp: string;
}

export interface RecognitionResult {
  success: boolean;
  card?: CardInfo;
  suggestions?: CardInfo[];
  error?: string;
}

/**
 * 載入所有卡牌數據
 */
export function loadAllCards(): CardInfo[] {
  const cards: CardInfo[] = [];
  const prices = yuyuPrices.prices as Record<string, { sellPrice: number; name: string; timestamp: string }>;
  
  for (const [id, data] of Object.entries(prices)) {
    cards.push({
      id,
      name: data.name,
      sellPrice: data.sellPrice,
      timestamp: data.timestamp,
    });
  }
  
  return cards;
}

/**
 * 計算兩個字符串的相似度 (Levenshtein 距離)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '');
  const s2 = str2.toLowerCase().replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '');
  
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
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
  // 移除括號內容 (並行/簽名等)
  const cleanName = name.replace(/[（(][^)）]*[)）]/g, '');
  // 分割為關鍵字
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
  return matches / searchKeywords.length;
}

/**
 * 識別卡牌（通過文字搜索）
 * @param searchText - 從 OCR 或用戶輸入的文字
 * @returns 識別結果
 */
export function recognizeCard(searchText: string): RecognitionResult {
  if (!searchText || searchText.trim().length === 0) {
    return { success: false, error: '請輸入搜尋文字' };
  }
  
  const allCards = loadAllCards();
  const searchKeywords = extractKeywords(searchText);
  
  if (searchKeywords.length === 0) {
    return { success: false, error: '無效的搜尋文字' };
  }
  
  // 首先嘗試精確匹配卡ID (如 hBP04-001)
  const exactIdMatch = allCards.find(card => 
    card.id.toLowerCase() === searchText.toLowerCase()
  );
  
  if (exactIdMatch) {
    return { success: true, card: exactIdMatch };
  }
  
  // 嘗試名稱完全匹配
  const exactNameMatch = allCards.find(card => 
    card.name === searchText
  );
  
  if (exactNameMatch) {
    return { success: true, card: exactNameMatch };
  }
  
  // 計算所有卡牌的匹配分數
  const scoredCards = allCards.map(card => {
    const cardKeywords = extractKeywords(card.name);
    
    // 關鍵字匹配
    const keywordScore = keywordsMatch(cardKeywords, searchKeywords);
    
    // 相似度匹配
    const similarityScore = Math.max(
      ...searchKeywords.map(search => 
        Math.max(...cardKeywords.map(card => calculateSimilarity(search, card)))
      )
    );
    
    // 部分匹配 (名稱包含搜索詞)
    const containsScore = searchKeywords.some(search => 
      card.name.toLowerCase().includes(search.toLowerCase())
    ) ? 0.5 : 0;
    
    // 日文漢字匹配
    const kanjiMatch = searchKeywords.some(search => {
      // 嘗試匹配日文漢字
      for (const cardKeyword of cardKeywords) {
        if (search.length >= 2) {
          let matchCount = 0;
          for (let i = 0; i < search.length - 1; i++) {
            if (cardKeyword.includes(search[i])) matchCount++;
          }
          if (matchCount >= search.length - 1) return true;
        }
      }
      return false;
    }) ? 0.3 : 0;
    
    const totalScore = keywordScore * 0.4 + similarityScore * 0.3 + containsScore * 0.2 + kanjiMatch * 0.1;
    
    return { card, score: totalScore };
  });
  
  // 按分數排序
  scoredCards.sort((a, b) => b.score - a.score);
  
  // 取最高分的結果
  const topResult = scoredCards[0];
  
  if (topResult && topResult.score > 0.3) {
    return { 
      success: true, 
      card: topResult.card,
      suggestions: scoredCards.slice(1, 4).map(s => s.card).filter(Boolean)
    };
  }
  
  // 沒有找到匹配
  return { 
    success: false, 
    error: '找不到匹配的卡牌',
    suggestions: scoredCards.slice(0, 5).map(s => s.card).filter(Boolean)
  };
}

/**
 * 根據卡牌 ID 獲取價格
 */
export function getCardPrice(cardId: string): CardInfo | null {
  const allCards = loadAllCards();
  return allCards.find(card => card.id === cardId) || null;
}

/**
 * 搜尋卡牌
 */
export function searchCards(query: string, limit: number = 10): CardInfo[] {
  const allCards = loadAllCards();
  const queryLower = query.toLowerCase();
  
  const results = allCards
    .filter(card => 
      card.name.toLowerCase().includes(queryLower) ||
      card.id.toLowerCase().includes(queryLower)
    )
    .sort((a, b) => b.sellPrice - a.sellPrice)
    .slice(0, limit);
  
  return results;
}

export default {
  recognizeCard,
  getCardPrice,
  searchCards,
  loadAllCards,
};