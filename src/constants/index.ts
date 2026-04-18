export const APP_NAME = 'HoloHunter';
export const APP_VERSION = '1.0.0';

// hololive 卡牌類別
export const HOLO_CATEGORIES = [
  { id: 'hololive', name: 'hololive', icon: '🌸' },
  { id: 'holostars', name: 'holostars', icon: '⭐' },
  { id: 'inukomis', name: 'InuKomi', icon: '🐾' },
  { id: 'other', name: '其他', icon: '🎴' },
];

// 稀有度
export const RARITIES = [
  { id: 'N', name: 'N', color: '#6b7280' },
  { id: 'R', name: 'R', color: '#10b981' },
  { id: 'SR', name: 'SR', color: '#3b82f6' },
  { id: 'UR', name: 'UR', color: '#8b5cf6' },
  { id: 'SSR', name: 'SSR', color: '#f59e0b' },
];

// Currency options
export const CURRENCIES = [
  { code: 'TWD', symbol: 'NT$', name: '新台幣' },
  { code: 'JPY', symbol: '¥', name: '日圓' },
  { code: 'USD', symbol: '$', name: '美元' },
];

// 價格來源
export const PRICE_SOURCES = [
  {
    name: '遊々亭',
    baseUrl: 'https://yuyu-tei.jp',
    searchEndpoint: '/top/hocg/',
    enabled: true,
  },
  {
    name: 'Carousell',
    baseUrl: 'https://www.carousell.com.tw',
    searchEndpoint: '/search/',
    enabled: true,
  },
];

// Default settings
export const DEFAULT_SETTINGS = {
  defaultCategory: 'hololive' as string,
  preferredCurrency: 'TWD',
  notifications: true,
  theme: 'system' as 'light' | 'dark' | 'system',
};

// UI Constants
export const SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: '#1a1a2e',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
  },
};

// hololive 主題色 - 粉紅 + 深藍
export const COLORS = {
  primary: '#ff6b9d',      // hololive 粉紅
  primaryLight: '#ff8fb3',
  primaryDark: '#e0558a',
  secondary: '#6366f1',    // 藍紫色
  accent: '#f59e0b',       // 金色（SSR）
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#0f0f23',   // 深藍黑
  surface: '#1a1a2e',      // 深藍
  surfaceLight: '#252542',
  text: '#ffffff',
  textSecondary: '#a0aec0',
  border: '#2d3748',
  // hololive 成員代表色（常用）
  hololive: '#ff6b9d',
  holostars: '#4ecdc4',
  inukomis: '#f59e0b',
  // 稀有度顏色
  rarityN: '#6b7280',
  rarityR: '#10b981',
  raritySR: '#3b82f6',
  rarityUR: '#8b5cf6',
  raritySSR: '#f59e0b',
};
