/**
 * @project Reedo
 * @module useNotificationsStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import { create } from 'zustand';

interface NotificationsState {
  hasUnreadNotifications: boolean;
  setHasUnreadNotifications: (value: boolean) => void;
  // This will be called when opening the Notifications screen
  markAsRead: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  hasUnreadNotifications: false, // Default to false, could be fetched on init in a real app
  setHasUnreadNotifications: (value) => set({ hasUnreadNotifications: value }),
  markAsRead: () => set({ hasUnreadNotifications: false }),
}));
