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
  member_since_formatted?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
}));

