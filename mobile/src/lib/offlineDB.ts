import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, set, keys, del, clear } from 'idb-keyval';

/**
 * Unified storage wrapper for Mandibook Pro.
 * Mobile: Uses AsyncStorage
 * Web: Uses idb-keyval (IndexedDB) for larger storage capacities
 */
export const Storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return set(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },

  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      const val = await get(key);
      return val ? String(val) : null;
    }
    return AsyncStorage.getItem(key);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return del(key);
    }
    return AsyncStorage.removeItem(key);
  },

  getAllKeys: async (): Promise<readonly string[]> => {
    if (Platform.OS === 'web') {
      const k = await keys();
      return k.map(String);
    }
    return AsyncStorage.getAllKeys();
  },

  clear: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      return clear();
    }
    return AsyncStorage.clear();
  }
};
