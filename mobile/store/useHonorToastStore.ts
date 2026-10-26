/**
 * @project Reedo
 * @module useHonorToastStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-25
 * @description Global state for auto-dismissing Honor Points celebration toasts.
 */
import { create } from 'zustand';

export interface HonorToastPayload {
  points: number;
  title?: string;
  message?: string;
}

interface HonorToastState {
  visible: boolean;
  points: number;
  title: string;
  message: string;
  showToast: (payload: HonorToastPayload) => void;
  hideToast: () => void;
}

let autoHideTimer: ReturnType<typeof setTimeout> | null = null;

export const useHonorToastStore = create<HonorToastState>((set) => ({
  visible: false,
  points: 0,
  title: "Honor Points Earned",
  message: "",
  showToast: ({ points, title = "Honor Points Earned", message = "" }) => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
    }
    set({
      visible: true,
      points,
      title,
      message,
    });
    autoHideTimer = setTimeout(() => {
      set({ visible: false });
    }, 3800);
  },
  hideToast: () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
    }
    set({ visible: false });
  },
}));
