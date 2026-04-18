import { HoloCard, PriceInfo, SearchQuery, SearchResult } from '../types/hololive';
import hololiveCardsData from '../data/hololive-cards.json';

// ============================================
// hololive 卡牌查詢服務
// ============================================

class HoloSearchService {
  private cards: HoloCard[] = hololiveCardsData.cards;
  
  // 價格來源配置
  private priceSources = [
    {
      name: '遊々亭',
      baseUrl: 'https://yuyu-tei.jp',
      searchUrl: (cardNumber: string) => `https://yuyu-tei.jp/top/hocg/?s=${cardNumber}`,
      enabled: true,
    },
    {
      name: 'Carousell',
      baseUrl: 'https://www.carousell.com.tw',
      searchUrl: (cardNumber: string) => `https://www.carousell.com.tw/search/?q=${cardNumber}`,
      enabled: true,
    },
  ];

  // ----------------------------------------
  // 依卡號查詢（精確匹配）
  // ----------------------------------------
  async searchByCardNumber(cardNumber: string): Promise<HoloCard | null> {
    const normalized = cardNumber.toLowerCase().trim();
    
    const card = this.cards.find(c => 
      c.cardNumber.toLowerCase() === normalized
    );
    
    if (!card) return null;
    
    // 查詢價格
    const prices = await this.fetchPrices(card);
    
    return {
      ...card,
      prices,
    };
  }

  // ----------------------------------------
  // 綜合搜尋
  // ----------------------------------------
  async search(query: SearchQuery): Promise<SearchResult> {
    let results = [...this.cards];
    
    // 卡號查詢（精確或部分匹配）
    if (query.cardNumber) {
      const normalized = query.cardNumber.toLowerCase().trim();
      results = results.filter(card => 
        card.cardNumber.toLowerCase().includes(normalized)
      );
    }
    
    // 成員名稱查詢
    if (query.memberName) {
      const name = query.memberName.toLowerCase().trim();
      results = results.filter(card => 
        card.member.toLowerCase().includes(name) ||
        card.memberJp.toLowerCase().includes(name)
      );
    }
    
    // 系列篩選
    if (query.seriesCode) {
      results = results.filter(card => 
        card.seriesCode === query.seriesCode
      );
    }
    
    // 稀有度篩選
    if (query.rarity) {
      results = results.filter(card => 
        card.rarity === query.rarity
      );
    }
    
    // 關鍵字查詢（搜尋描述、成員等）
    if (query.keyword) {
      const keyword = query.keyword.toLowerCase().trim();
      results = results.filter(card => 
        card.description?.toLowerCase().includes(keyword) ||
        card.member.toLowerCase().includes(keyword) ||
        card.series.toLowerCase().includes(keyword)
      );
    }
    
    // 為結果添加價格資訊
    const cardsWithPrices = await Promise.all(
      results.map(card => this.addPricesToCard(card))
    );
    
    return {
      cards: cardsWithPrices,
      totalFound: cardsWithPrices.length,
      query,
      sources: this.priceSources.filter(s => s.enabled).map(s => s.name),
      hasPrices: cardsWithPrices.some(c => c.prices && c.prices.length > 0),
    };
  }

  // ----------------------------------------
  // 取得所有卡牌（用於首頁）
  // ----------------------------------------
  async getAllCards(): Promise<HoloCard[]> {
    return Promise.all(
      this.cards.map(card => this.addPricesToCard(card))
    );
  }

  // ----------------------------------------
  // 取得所有系列
  // ----------------------------------------
  getAllSeries() {
    return hololiveCardsData.series;
  }

  // ----------------------------------------
  // 取得所有成員
  // ----------------------------------------
  getAllMembers() {
    return hololiveCardsData.members;
  }

  // ----------------------------------------
  // 熱門卡牌（根據價格排序，最貴的在前面）
  // ----------------------------------------
  async getPopularCards(limit: number = 10): Promise<HoloCard[]> {
    // 先取得所有卡牌的價格
    const cardsWithPrices = await Promise.all(
      this.cards.map(card => this.addPricesToCard(card))
    );
    
    // 根據最高價格排序（最貴的在前面）
    const sorted = cardsWithPrices.sort((a, b) => {
      const maxPriceA = a.prices && a.prices.length > 0 ? Math.max(...a.prices.map(p => p.price)) : 0;
      const maxPriceB = b.prices && b.prices.length > 0 ? Math.max(...b.prices.map(p => p.price)) : 0;
      return maxPriceB - maxPriceA;
    });
    
    return sorted.slice(0, limit);
  }

  // ----------------------------------------
  // 價格查詢（模擬，實際需要爬蟲或 API）
  // ----------------------------------------
  private async fetchPrices(card: HoloCard): Promise<PriceInfo[]> {
    const prices: PriceInfo[] = [];
    
    // 這裡應該要爬蟲各個網站的價格
    // 目前先用模擬資料
    for (const source of this.priceSources) {
      if (source.enabled) {
        // 模擬價格（實際應該從網站抓取）
        const mockPrice = this.generateMockPrice(card);
        prices.push({
          source: source.name,
          price: mockPrice,
          currency: 'TWD',
          condition: '全新',
          url: source.searchUrl(card.cardNumber),
          lastUpdated: new Date().toISOString(),
          inStock: Math.random() > 0.3, // 模擬庫存狀態
        });
      }
    }
    
    return prices;
  }

  // ----------------------------------------
  // 模擬價格生成（之後替換為真實爬蟲）
  // ----------------------------------------
  private generateMockPrice(card: HoloCard): number {
    const rarityMultipliers: Record<string, number> = {
      'SSR': 5000,
      'UR': 3000,
      'SR': 1500,
      'R': 800,
      'N': 300,
    };
    
    const basePrice = rarityMultipliers[card.rarity] || 500;
    // 加入一些隨機波動
    const variance = (Math.random() - 0.5) * 0.4; // ±20%
    return Math.round(basePrice * (1 + variance));
  }

  // ----------------------------------------
  // 為單張卡牌添加價格
  // ----------------------------------------
  private async addPricesToCard(card: HoloCard): Promise<HoloCard> {
    const prices = await this.fetchPrices(card);
    return { ...card, prices };
  }
}

export const holoSearchService = new HoloSearchService();
