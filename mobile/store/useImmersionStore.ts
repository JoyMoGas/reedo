import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedSession {
  mode: "timed" | "infinite";
  minutes: string;
  userbookId: string;
  bookId: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: string;
  pagesTotal: string;
  totalSeconds: number;
  elapsed: number;
  expectedTime: number | null;
  isPaused: boolean;
}

interface ImmersionState {
  activeSession: SavedSession | null;
  saveSession: (session: SavedSession) => void;
  clearSession: () => void;
}

export const useImmersionStore = create<ImmersionState>()(
  persist(
    (set) => ({
      activeSession: null,
      saveSession: (session) => set({ activeSession: session }),
      clearSession: () => set({ activeSession: null }),
    }),
    {
      name: 'immersion-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
