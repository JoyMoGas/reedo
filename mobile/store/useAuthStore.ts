/**
 * @project Reedo
 * @module useAuthStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "./queryClient";
import { useSignUpStore } from "./useSignUpStore";

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  thumbnail: string | null;
  honor_points: number;
  streak_days: number;
  total_reading_time_seconds?: number;
  member_since_formatted?: string;
  pinned_badges?: string[];
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateStreakDays: (days: number) => void;
  setPinnedBadges: (badges: string[]) => void;
  setUser: (user: UserProfile) => void;
  addReadingTime: (seconds: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token, user) => {
    set({ isLoading: true });
    try {
      await SecureStore.setItemAsync("token", token);
      await SecureStore.setItemAsync("user", JSON.stringify(user));
      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to login and save session:", error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
      
      // Clear React Query cache to prevent data leakage between user sessions
      queryClient.clear();

      // Reset signup draft state
      useSignUpStore.getState().reset();

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to delete session on logout:", error);
      set({ isLoading: false });
    }
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync("token");
      const userStr = await SecureStore.getItemAsync("user");
      
      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error("Failed to restore auth session:", error);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  fetchUser: async () => {
    try {
      const { default: api } = await import("./api");
      const response = await api.get("api/users/me/");
      if (response.data) {
        const currentUser = get().user;
        const updated = { ...currentUser, ...response.data };
        await SecureStore.setItemAsync("user", JSON.stringify(updated));
        set({ user: updated });
      }
    } catch (error) {
      console.warn("Failed to fetch current user profile:", error);
    }
  },

  updateStreakDays: (days: number) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, streak_days: days };
    set({ user: updated });
    SecureStore.setItemAsync("user", JSON.stringify(updated)).catch(() => {});
  },

  setPinnedBadges: (badges: string[]) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, pinned_badges: badges };
    set({ user: updated });
    SecureStore.setItemAsync("user", JSON.stringify(updated)).catch(() => {});
  },

  setUser: (user: UserProfile) => {
    set({ user });
    SecureStore.setItemAsync("user", JSON.stringify(user)).catch(() => {});
  },

  addReadingTime: (seconds: number) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      total_reading_time_seconds:
        (currentUser.total_reading_time_seconds || 0) + seconds,
    };
    set({ user: updated });
    SecureStore.setItemAsync("user", JSON.stringify(updated)).catch(() => {});
  },
}));

