/**
 * @project Reedo
 * @module useUIStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import { create } from "zustand";

interface UIState {
  isNavbarVisible: boolean;
  setNavbarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isNavbarVisible: true,
  setNavbarVisible: (visible) => set({ isNavbarVisible: visible }),
}));
