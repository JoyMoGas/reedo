/**
 * @project Reedo
 * @module secureStorage
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-30
 */
import * as SecureStore from 'expo-secure-store';
import { StateStorage } from 'zustand/middleware';

export const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(name);
      return value || null;
    } catch (error) {
      console.error(`Failed to get item ${name} from SecureStore:`, error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error(`Failed to set item ${name} in SecureStore:`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error(`Failed to delete item ${name} from SecureStore:`, error);
    }
  },
};
