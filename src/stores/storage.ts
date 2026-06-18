/**
 * Fallback storage module for TypeScript type resolution.
 * Metro resolves to storage.web.ts (web) or storage.native.ts (native).
 * This file exists only so tsc can find the module declaration.
 *
 * At runtime, Metro/platform-specific resolution takes over.
 */
import { StateStorage } from 'zustand/middleware';

declare const platformStorage: StateStorage;
export default platformStorage;