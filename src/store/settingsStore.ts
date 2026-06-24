/**
 * Settings Store (Zustand + persistent)
 *
 * Global app settings for language, currency, and display preferences.
 * Persisted via platform-specific storage (localStorage / AsyncStorage).
 *
 * Usage:
 *   const { preferredCurrency, preferredLanguage, setCurrency, setLanguage } = useSettingsStore();
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import platformStorage from '../stores/storage';

export type CurrencyCode = 'TWD' | 'JPY' | 'USD';
export type LanguageCode = 'zh' | 'ja';

interface SettingsState {
  /** Preferred display currency (default: TWD) */
  preferredCurrency: CurrencyCode;
  /** Preferred display language (default: zh) */
  preferredLanguage: LanguageCode;

  // Actions
  setCurrency: (currency: CurrencyCode) => void;
  setLanguage: (language: LanguageCode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredCurrency: 'TWD',
      preferredLanguage: 'zh',

      setCurrency: (currency) => set({ preferredCurrency: currency }),
      setLanguage: (language) => set({ preferredLanguage: language }),
    }),
    {
      name: 'hunterCard-settings',
      storage: createJSONStorage(() => platformStorage),
    }
  )
);
