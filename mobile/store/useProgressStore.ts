import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "./secureStorage";

export interface ProgressState {
  lastUpdatedDate: string; // YYYY-MM-DD
  pagesReadToday: number;
  questClaimed: boolean;
  history: Record<string, number>; // Maps YYYY-MM-DD to pages read
  addPagesRead: (pages: number) => void;
  claimQuest: () => void;
  resetIfNewDay: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lastUpdatedDate: new Date().toISOString().split("T")[0],
      pagesReadToday: 0,
      questClaimed: false,
      history: {},

      addPagesRead: (pages) => {
        get().resetIfNewDay();
        set((state) => {
          const today = new Date().toISOString().split("T")[0];
          const newTotal = state.pagesReadToday + pages;
          return { 
            pagesReadToday: newTotal,
            history: {
              ...state.history,
              [today]: newTotal
            }
          };
        });
      },

      claimQuest: () => set({ questClaimed: true }),

      resetIfNewDay: () => {
        const today = new Date().toISOString().split("T")[0];
        if (get().lastUpdatedDate !== today) {
          set((state) => ({
            lastUpdatedDate: today,
            pagesReadToday: 0,
            questClaimed: false,
            // Keep history intact
          }));
        }
      },
    }),
    {
      name: "user-progress",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
