import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card, SearchFilters } from '../types';

/**
 * HoloHunter App Store
 * 統一狀態管理 - 取代散落在各組件的 useState
 */
export interface HoloStore {
  // ===== 搜尋狀態 =====
  searchQuery: string;
  searchResults: Card[];
  searchFilters: SearchFilters;
  isSearching: boolean;
  searchError: string | null;
  
  // ===== 收藏狀態 =====
  favorites: Card[];
  recentViews: Card[];
  
  // ===== 掃描狀態 =====
  lastScannedCard: Card | null;
  scanHistory: Card[];
  
  // ===== UI 狀態 =====
  isLoading: boolean;
  activeTab: string;
  
  // ===== 設定 =====
  theme: 'dark' | 'light';
  priceSource: 'yuyu' | 'traditional';
  
  // ===== 搜尋 Actions =====
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Card[]) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setIsSearching: (loading: boolean) => void;
  setSearchError: (error: string | null) => void;
  clearSearch: () => void;
  
  // ===== 收藏 Actions =====
  addFavorite: (card: Card) => void;
  removeFavorite: (cardId: string) => void;
  isFavorite: (cardId: string) => boolean;
  addRecentView: (card: Card) => void;
  clearRecentViews: () => void;
  
  // ===== 掃描 Actions =====
  setLastScannedCard: (card: Card | null) => void;
  addToScanHistory: (card: Card) => void;
  clearScanHistory: () => void;
  
  // ===== UI Actions =====
  setIsLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  
  // ===== 設定 Actions =====
  setTheme: (theme: 'dark' | 'light') => void;
  setPriceSource: (source: 'yuyu' | 'traditional') => void;
}

export const useHoloStore = create<HoloStore>((set, get) => ({
  // ===== 初始狀態 =====
  searchQuery: '',
  searchResults: [],
  searchFilters: {},
  isSearching: false,
  searchError: null,
  
  favorites: [],
  recentViews: [],
  
  lastScannedCard: null,
  scanHistory: [],
  
  isLoading: false,
  activeTab: 'home',
  
  theme: 'dark',
  priceSource: 'yuyu',
  
  // ===== 搜尋 Actions =====
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  setSearchError: (error) => set({ searchError: error }),
  clearSearch: () => set({ 
    searchQuery: '', 
    searchResults: [], 
    searchError: null 
  }),
  
  // ===== 收藏 Actions =====
  addFavorite: (card) => set((state) => ({
    favorites: state.favorites.some(f => f.id === card.id)
      ? state.favorites
      : [...state.favorites, card]
  })),
  removeFavorite: (cardId) => set((state) => ({
    favorites: state.favorites.filter(f => f.id !== cardId)
  })),
  isFavorite: (cardId) => get().favorites.some(f => f.id === cardId),
  addRecentView: (card) => set((state) => {
    const filtered = state.recentViews.filter(c => c.id !== card.id);
    return {
      recentViews: [card, ...filtered].slice(0, 20)
    };
  }),
  clearRecentViews: () => set({ recentViews: [] }),
  
  // ===== 掃描 Actions =====
  setLastScannedCard: (card) => set({ lastScannedCard: card }),
  addToScanHistory: (card) => set((state) => ({
    scanHistory: [card, ...state.scanHistory].slice(0, 50)
  })),
  clearScanHistory: () => set({ scanHistory: [] }),
  
  // ===== UI Actions =====
  setIsLoading: (loading) => set({ isLoading: loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // ===== 設定 Actions =====
  setTheme: (theme) => set({ theme }),
  setPriceSource: (source) => set({ priceSource: source }),
}));

// ===== 持久化 Middleware =====
// 帶持久化的 Store 版本
export const useHoloStorePersisted = create<HoloStore>()(
  persist(
    (set, get) => ({
      // ===== 初始狀態 =====
      searchQuery: '',
      searchResults: [],
      searchFilters: {},
      isSearching: false,
      searchError: null,
      
      favorites: [],
      recentViews: [],
      
      lastScannedCard: null,
      scanHistory: [],
      
      isLoading: false,
      activeTab: 'home',
      
      theme: 'dark',
      priceSource: 'yuyu',
      
      // ===== 搜尋 Actions =====
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchFilters: (filters) => set({ searchFilters: filters }),
      setIsSearching: (loading) => set({ isSearching: loading }),
      setSearchError: (error) => set({ searchError: error }),
      clearSearch: () => set({ 
        searchQuery: '', 
        searchResults: [], 
        searchError: null 
      }),
      
      // ===== 收藏 Actions =====
      addFavorite: (card) => set((state) => ({
        favorites: state.favorites.some(f => f.id === card.id)
          ? state.favorites
          : [...state.favorites, card]
      })),
      removeFavorite: (cardId) => set((state) => ({
        favorites: state.favorites.filter(f => f.id !== cardId)
      })),
      isFavorite: (cardId) => get().favorites.some(f => f.id === cardId),
      addRecentView: (card) => set((state) => {
        const filtered = state.recentViews.filter(c => c.id !== card.id);
        return {
          recentViews: [card, ...filtered].slice(0, 20)
        };
      }),
      clearRecentViews: () => set({ recentViews: [] }),
      
      // ===== 掃描 Actions =====
      setLastScannedCard: (card) => set({ lastScannedCard: card }),
      addToScanHistory: (card) => set((state) => ({
        scanHistory: [card, ...state.scanHistory].slice(0, 50)
      })),
      clearScanHistory: () => set({ scanHistory: [] }),
      
      // ===== UI Actions =====
      setIsLoading: (loading) => set({ isLoading: loading }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // ===== 設定 Actions =====
      setTheme: (theme) => set({ theme }),
      setPriceSource: (source) => set({ priceSource: source }),
    }),
    {
      name: 'holohunter-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        recentViews: state.recentViews,
        scanHistory: state.scanHistory,
        theme: state.theme,
        priceSource: state.priceSource,
      }),
    }
  )
);