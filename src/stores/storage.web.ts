/**
 * Web platform storage for scan session persistence.
 * Uses localStorage since @react-native-async-storage/async-storage
 * is missing the internal `./hooks` module in npm v2.2.0.
 *
 * This file is only loaded on web (platform-specific extension).
 */

const webStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export default webStorage;