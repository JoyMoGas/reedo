/**
 * @project Reedo
 * @module useStreakStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-14
 */
import { create } from "zustand";
import api from "./api";
import { useAuthStore } from "./useAuthStore";

export interface CalendarDayInfo {
  date: string;
  status: "ACTIVE" | "FROZEN" | "RECOVERED";
  activities: string[];
}

export interface StreakData {
  current_streak: number;
  best_streak: number;
  is_active_today: boolean;
  last_activity_date: string | null;
  freezes_available: number;
  can_recover: boolean;
  previous_streak: number;
  broken_date: string | null;
  today_activities: string[];
  calendar_history: Record<string, CalendarDayInfo>;
}

interface StreakState {
  data: StreakData | null;
  isLoading: boolean;
  isRecovering: boolean;
  isModalOpen: boolean;
  isCelebrationOpen: boolean;
  setModalOpen: (open: boolean) => void;
  setCelebrationOpen: (open: boolean) => void;
  triggerCelebration: () => void;
  fetchStreak: () => Promise<void>;
  recoverStreak: (method: "IMMERSION" | "FREEZE", challengeMetadata?: Record<string, any>) => Promise<boolean>;
  claimFreeze: (reason?: string) => Promise<boolean>;
  syncFromLocalAction: (streakPayload?: any) => void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  data: null,
  isLoading: false,
  isRecovering: false,
  isModalOpen: false,
  isCelebrationOpen: false,

  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setCelebrationOpen: (isCelebrationOpen) => set({ isCelebrationOpen }),
  triggerCelebration: () => set({ isCelebrationOpen: true }),

  fetchStreak: async () => {
    set({ isLoading: true });
    try {
      const localDate = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
      const response = await api.get(`api/users/streak/?date=${localDate}`);
      const data: StreakData = response.data;

      set({ data, isLoading: false });

      // Keep AuthStore user.streak_days in lockstep
      if (typeof data.current_streak === "number") {
        useAuthStore.getState().updateStreakDays(data.current_streak);
      }
    } catch (error) {
      console.warn("Failed to fetch streak data:", error);
      set({ isLoading: false });
    }
  },

  recoverStreak: async (method: "IMMERSION" | "FREEZE", challengeMetadata?: Record<string, any>) => {
    set({ isRecovering: true });
    try {
      const localDate = new Date().toLocaleDateString("en-CA");
      const response = await api.post("api/users/streak/recover/", {
        method,
        client_date: localDate,
        metadata: challengeMetadata || {},
      });

      if (response.data?.success) {
        // Refetch complete streak and user
        await get().fetchStreak();
        await useAuthStore.getState().fetchUser();
        set({ isRecovering: false, isCelebrationOpen: true });
        return true;
      }
      set({ isRecovering: false });
      return false;
    } catch (error) {
      console.error("Streak recovery failed:", error);
      set({ isRecovering: false });
      return false;
    }
  },

  claimFreeze: async (reason = "Earned Reward") => {
    try {
      const response = await api.post("api/users/streak/claim-freeze/", { reason });
      if (response.data?.success) {
        await get().fetchStreak();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to claim freeze:", error);
      return false;
    }
  },

  syncFromLocalAction: (streakPayload) => {
    if (!streakPayload) return;
    const current = get().data;
    const todayStr = new Date().toLocaleDateString("en-CA");

    const wasActive = current?.is_active_today ?? false;
    const isNowActive = streakPayload.is_active_today ?? true;
    const streakIncreased = typeof streakPayload.current_streak === "number" && !!current && streakPayload.current_streak > current.current_streak;

    // The streak is newly activated if extended/incremented, or today was not active before, or streak increased
    const shouldCelebrate =
      streakPayload.extended === true ||
      streakPayload.streak_incremented === true ||
      (!wasActive && isNowActive) ||
      streakIncreased;

    const updatedHistory = current?.calendar_history ? { ...current.calendar_history } : {};
    const existingToday = updatedHistory[todayStr] || {
      date: todayStr,
      status: "ACTIVE" as const,
      activities: [],
    };

    const updatedTodayActivities = Array.from(
      new Set([...(current?.today_activities || []), streakPayload.activity_type].filter(Boolean))
    );

    updatedHistory[todayStr] = {
      ...existingToday,
      status: "ACTIVE",
      activities: Array.from(new Set([...existingToday.activities, streakPayload.activity_type].filter(Boolean))),
    };

    const nextStreak = typeof streakPayload.current_streak === "number"
      ? streakPayload.current_streak
      : (current?.current_streak ?? 1);
    const nextBest = typeof streakPayload.best_streak === "number"
      ? streakPayload.best_streak
      : Math.max(current?.best_streak ?? nextStreak, nextStreak);

    set({
      data: {
        current_streak: nextStreak,
        best_streak: nextBest,
        is_active_today: true,
        last_activity_date: todayStr,
        freezes_available: streakPayload.freezes_available ?? current?.freezes_available ?? 1,
        can_recover: false,
        previous_streak: 0,
        broken_date: null,
        today_activities: updatedTodayActivities,
        calendar_history: updatedHistory,
      },
    });

    useAuthStore.getState().updateStreakDays(nextStreak);

    if (shouldCelebrate) {
      // Small timeout to allow dismissing navigation modals to unmount cleanly
      // preventing modal presentation collisions on iOS and Android
      setTimeout(() => {
        set({ isCelebrationOpen: true });
      }, 450);
    }

    // Refresh streak in background to guarantee full sync
    get().fetchStreak();
  },
}));
