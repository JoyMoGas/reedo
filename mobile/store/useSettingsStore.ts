import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "./secureStorage";

export interface SettingsState {
  theme: "light" | "dark" | "sepia";
  fontSize: "small" | "medium" | "large" | "extra-large";
  dailyReadingGoal: number; // in minutes
  immersionModeEnabled: boolean;
  setTheme: (theme: "light" | "dark" | "sepia") => void;
  setFontSize: (fontSize: "small" | "medium" | "large" | "extra-large") => void;
  setDailyReadingGoal: (goal: number) => void;
  setImmersionModeEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      fontSize: "medium",
      dailyReadingGoal: 20,
      immersionModeEnabled: false,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDailyReadingGoal: (dailyReadingGoal) => set({ dailyReadingGoal }),
      setImmersionModeEnabled: (immersionModeEnabled) => set({ immersionModeEnabled }),
    }),
    {
      name: "user-settings",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
