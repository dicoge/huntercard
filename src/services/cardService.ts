import { Card, CardCategory, SearchResult, PriceInfo } from '../types';
import { API_SOURCES, CARD_CATEGORIES } from '../constants';

// ============================================
// カード検索サービス - 複数のTCG网站を統合
// ============================================

class CardService {
  private currency: string = 'TWD';

  setCurrency(currency: string) {
    this.currency = currency;
  }

  // ----------------------------------------
  // 神奇寶貝卡搜尋 (Pokemon TCG API)
  // ----------------------------------------
  async searchPokemonCard(query: string): Promise<Card[]> {
    try {
      // 使用 Pokemon TCG API (免费，无需认证)
      const response = await fetch(
        `${API_SOURCES.pokemonTcgApi.baseUrl}/cards?name=${encodeURIComponent(query)}&limit=20`
      );
      
      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      return (data.cards || []).map((card: any) => this.transformPokemonCard(card));
    } catch (error) {
      console.error('Pokemon search error:', error);
      return [];
    }
  }

  // ----------------------------------------
  // TCGPlayer 搜尋 (需要 API Key)
  // ----------------------------------------
  async searchTCGPlayer(query: string, category: CardCategory): Promise<Card[]> {
    const apiKey = API_SOURCES.tcgplayer.apiKey;
    
    if (!apiKey) {
      console.warn('TCGPlayer API key not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${API_SOURCES.tcgplayer.baseUrl}${API_SOURCES.tcgplayer.searchEndpoint}?`
        + new URLSearchParams({
          category: this.getCategoryId(category),
          productName: query,
          limit: '20',
        }),
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('TCGPlayer API request failed');
      
      const data = await response.json();
      
      return (data.results || []).map((product: any) => 
        this.transformTCGPlayerCard(product)
      );
    } catch (error) {
      console.error('TCGPlayer search error:', error);
      return [];
    }
  }

  // ----------------------------------------
  // 綜合搜尋 - 搜索所有可用来源
  // ----------------------------------------
  async searchAll(query: string, category?: CardCategory): Promise<SearchResult> {
    const results: Card[] = [];
    const sources: string[] = [];

    // 根据类别选择搜索策略
    if (!category || category === 'pokemon') {
      const pokemonResults = await this.searchPokemonCard(query);
      if (pokemonResults.length > 0) {
        results.push(...pokemonResults);
        sources.push(API_SOURCES.pokemonTcgApi.name);
      }
    }

    // 如果有 TCGPlayer API Key，也搜索 TCGPlayer
    if (API_SOURCES.tcgplayer.apiKey) {
      const tcgResults = await this.searchTCGPlayer(
        query, 
        category || 'pokemon'
      );
      if (tcgResults.length > 0) {
        results.push(...tcgResults);
        sources.push(API_SOURCES.tcgplayer.name);
      }
    }

    // 去重
    const uniqueCards = this.deduplicateCards(results);

    return {
      cards: uniqueCards,
      totalFound: uniqueCards.length,
      query,
      sources,
    };
  }

  // ----------------------------------------
  // 通過卡號搜索 (用於相機掃描)
  // ----------------------------------------
  async searchByCardNumber(cardNumber: string, setCode?: string): Promise<Card | null> {
    try {
      // 尝试从 Pokemon TCG API 搜索
      if (!setCode) {
        const response = await fetch(
          `${API_SOURCES.pokemonTcgApi.baseUrl}/cards?`
          + new URLSearchParams({ number: cardNumber })
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.cards && data.cards.length > 0) {
            return this.transformPokemonCard(data.cards[0]);
          }
        }
      }
      
      // 如果有设置代码，尝试精确匹配
      if (setCode) {
        const response = await fetch(
          `${API_SOURCES.pokemonTcgApi.baseUrl}/cards?`
          + new URLSearchParams({ number: cardNumber, setCode })
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.cards && data.cards.length > 0) {
            return this.transformPokemonCard(data.cards[0]);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Search by card number error:', error);
      return null;
    }
  }

  // ----------------------------------------
  // 獲取價格資訊
  // ----------------------------------------
  async getPriceInfo(cardId: string, source: string = 'tcgplayer'): Promise<PriceInfo | null> {
    const apiKey = API_SOURCES.tcgplayerPrice.apiKey;
    
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(
        `${API_SOURCES.tcgplayerPrice.baseUrl}${API_SOURCES.tcgplayerPrice.priceEndpoint}?`
        + new URLSearchParams({ productId: cardId }),
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Price API request failed');
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const priceData = data.results[0];
        return {
          marketPrice: priceData.marketPrice,
          sellPrice: priceData.lowPrice,
          buyPrice: priceData.highPrice,
          trend: this.calculateTrend(priceData),
          lastUpdated: new Date().toISOString(),
          source: API_SOURCES.tcgplayer.name,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get price error:', error);
      return null;
    }
  }

  // ----------------------------------------
  // 轉換函數
  // ----------------------------------------
  private transformPokemonCard(apiCard: any): Card {
    return {
      id: apiCard.id,
      name: apiCard.name,
      set: apiCard.setName,
      setCode: apiCard.setCode,
      rarity: apiCard.rarity,
      cardNumber: apiCard.number,
      imageUrl: apiCard.imageUrl,
      price: apiCard.price 
        ? {
            marketPrice: apiCard.price,
            lastUpdated: new Date().toISOString(),
            source: API_SOURCES.pokemonTcgApi.name,
          }
        : undefined,
      description: apiCard.description,
      artist: apiCard.artist,
      category: 'pokemon',
    };
  }

  private transformTCGPlayerCard(product: any): Card {
    return {
      id: String(product.productId),
      name: product.name,
      set: product.groupName,
      setCode: product.setId,
      rarity: product.rarity,
      cardNumber: product.extendedData?.cardNumber || '',
      imageUrl: product.imageUrl,
      category: 'pokemon', // 需要根据实际产品确定
    };
  }

  // ----------------------------------------
  // 工具函數
  // ----------------------------------------
  private getCategoryId(category: CardCategory): string {
    const categoryMap: Record<CardCategory, string> = {
      pokemon: '1',
      magic: '2',
      yugioh: '3',
      sports: '4',
      other: '5',
    };
    return categoryMap[category] || '1';
  }

  private deduplicateCards(cards: Card[]): Card[] {
    const seen = new Set<string>();
    return cards.filter(card => {
      const key = `${card.name}-${card.setCode}-${card.cardNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private calculateTrend(priceData: any): 'up' | 'down' | 'stable' {
    // 这里可以根据历史数据分析趋势
    // 目前返回 stable 作为默认值
    return 'stable';
  }
}

export const cardService = new CardService();
