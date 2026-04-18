import { useEffect, useState } from 'react';
import { HoloCard, SearchResult, SearchQuery } from '../types/hololive';
import { holoSearchService } from '../services/holoSearchService';

// ----------------------------------------
// 搜尋 Hook
// ----------------------------------------
export function useHoloSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const search = async (query: SearchQuery) => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResult = await holoSearchService.search(query);
      setResult(searchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, search };
}

// ----------------------------------------
// 單張卡牌 Hook
// ----------------------------------------
export function useHoloCard(cardNumber: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<HoloCard | null>(null);

  useEffect(() => {
    if (!cardNumber) return;
    
    const fetchCard = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await holoSearchService.searchByCardNumber(cardNumber);
        setCard(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查詢失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [cardNumber]);

  return { loading, error, card };
}

// ----------------------------------------
// 熱門卡牌 Hook
// ----------------------------------------
export function usePopularCards(limit: number = 10) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<HoloCard[]>([]);

  useEffect(() => {
    const fetchPopular = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await holoSearchService.getPopularCards(limit);
        setCards(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查詢失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchPopular();
  }, [limit]);

  return { loading, error, cards };
}

// ----------------------------------------
// 所有卡牌 Hook（用於首頁）
// ----------------------------------------
export function useAllCards() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<HoloCard[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await holoSearchService.getAllCards();
        setCards(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : '查詢失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { loading, error, cards };
}
