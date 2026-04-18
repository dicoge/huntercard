import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoriteCard, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

// ============================================
// 本地存儲服務
// ============================================

const STORAGE_KEYS = {
  FAVORITES: '@cardhunter_favorites',
  SETTINGS: '@cardhunter_settings',
  SEARCH_HISTORY: '@cardhunter_search_history',
  CACHE: '@cardhunter_cache',
};

// ----------------------------------------
// 收藏功能
// ----------------------------------------
export async function getFavorites(): Promise<FavoriteCard[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Get favorites error:', error);
    return [];
  }
}

export async function addFavorite(cardId: string, notes?: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const exists = favorites.some(f => f.cardId === cardId);
    
    if (exists) return false;
    
    favorites.push({
      cardId,
      addedAt: new Date().toISOString(),
      notes,
    });
    
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return true;
  } catch (error) {
    console.error('Add favorite error:', error);
    return false;
  }
}

export async function removeFavorite(cardId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(f => f.cardId !== cardId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Remove favorite error:', error);
    return false;
  }
}

export async function isFavorite(cardId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.cardId === cardId);
}

// ----------------------------------------
// 設置功能
// ----------------------------------------
export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Get settings error:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<boolean> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Update settings error:', error);
    return false;
  }
}

// ----------------------------------------
// 搜索歷史
// ----------------------------------------
export async function getSearchHistory(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Get search history error:', error);
    return [];
  }
}

export async function addSearchHistory(query: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filtered = history.filter(h => h !== query);
    const updated = [query, ...filtered].slice(0, 20); // 最多保留20條
    await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
  } catch (error) {
    console.error('Add search history error:', error);
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  } catch (error) {
    console.error('Clear search history error:', error);
  }
}

// ----------------------------------------
// 快取功能
// ----------------------------------------
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = `${STORAGE_KEYS.CACHE}_${key}`;
    const data = await AsyncStorage.getItem(cacheKey);
    if (!data) return null;
    
    const { value, expiry } = JSON.parse(data);
    if (expiry && Date.now() > expiry) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    return value as T;
  } catch (error) {
    console.error('Get cache error:', error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlMinutes: number = 60): Promise<void> {
  try {
    const cacheKey = `${STORAGE_KEYS.CACHE}_${key}`;
    const data = {
      value,
      expiry: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : null,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error('Set cache error:', error);
  }
}

export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.CACHE));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Clear all cache error:', error);
  }
}
