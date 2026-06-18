/**
 * Native platform storage for scan session persistence.
 * Uses AsyncStorage on iOS/Android.
 *
 * This file is only loaded on native platforms (platform-specific extension).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export default AsyncStorage;