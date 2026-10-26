/**
 * @project Reedo
 * @module useSyncQueueStore
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-25
 * @description Cold-start resilient offline outbox & mutation synchronization manager.
 * Stores pending creations, updates, and actions locally in AsyncStorage while the backend
 * sleeps or takes time to wake up, and safely drains them when the server becomes active.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import api from './api';
import { queryClient } from './queryClient';
import { useStreakStore } from './useStreakStore';
import { useAuthStore } from './useAuthStore';

const STORAGE_KEY = '@reedo_sync_outbox_v2';
const HEALTH_CHECK_TIMEOUT = 35000; // 35 seconds to allow cold boot on sleeping servers

export type MutationType =
  | 'POST_ECHO'
  | 'POST_REVIEW'
  | 'UPDATE_PROGRESS'
  | 'IMMERSION_SESSION'
  | 'ADD_TO_LIBRARY'
  | 'CREATE_SHELF'
  | 'CLAIM_QUEST'
  | 'PIN_HONORS'
  | 'LIKE_ECHO'
  | 'LIKE_REVIEW'
  | 'COMMENT'
  | 'GENERIC_MUTATION';

export interface QueuedMutation {
  id: string;
  type: MutationType;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  payload?: any;
  title: string;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  queryKeysToInvalidate?: (string | number | undefined)[][];
}

interface SyncQueueState {
  queue: QueuedMutation[];
  isSyncing: boolean;
  isServerSleeping: boolean;
  lastSyncCompletedAt: number | null;
  isInitialized: boolean;

  // Actions
  init: () => Promise<void>;
  enqueue: (item: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries' | 'status'>) => Promise<string>;
  remove: (id: string) => Promise<void>;
  processQueue: () => Promise<void>;
  wakeUpAndSync: () => Promise<boolean>;
  clearQueue: () => Promise<void>;
}

let isProcessingLock = false;
let wakeUpRetryTimer: ReturnType<typeof setTimeout> | null = null;

export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  queue: [],
  isSyncing: false,
  isServerSleeping: false,
  lastSyncCompletedAt: null,
  isInitialized: false,

  init: async () => {
    if (get().isInitialized) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: QueuedMutation[] = JSON.parse(raw);
        set({ queue: Array.isArray(parsed) ? parsed : [], isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch (e) {
      console.warn('[SyncQueue] Failed to load persisted outbox:', e);
      set({ isInitialized: true });
    }

    // Ping server and drain queue if pending items exist
    get().wakeUpAndSync();

    // Listen to app foregrounding to re-check queue and ping server
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        get().wakeUpAndSync();
      }
    });
  },

  enqueue: async (item) => {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newMutation: QueuedMutation = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    const currentQueue = get().queue;
    const updatedQueue = [...currentQueue, newMutation];
    set({ queue: updatedQueue });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));
    } catch (err) {
      console.warn('[SyncQueue] Error persisting new mutation:', err);
    }

    // Trigger queue processing non-blockingly
    setTimeout(() => {
      get().processQueue();
    }, 50);

    return id;
  },

  remove: async (id: string) => {
    const updatedQueue = get().queue.filter((m) => m.id !== id);
    set({ queue: updatedQueue });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue));
    } catch (err) {
      console.warn('[SyncQueue] Error removing item from outbox:', err);
    }
  },

  clearQueue: async () => {
    set({ queue: [], isSyncing: false, isServerSleeping: false });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[SyncQueue] Error clearing outbox:', err);
    }
  },

  wakeUpAndSync: async () => {
    try {
      // Ping the lightweight health check endpoint
      const response = await api.get('api/health/', {
        timeout: HEALTH_CHECK_TIMEOUT,
      });

      if (response.status === 200) {
        set({ isServerSleeping: false });
        if (wakeUpRetryTimer) {
          clearTimeout(wakeUpRetryTimer);
          wakeUpRetryTimer = null;
        }
        if (get().queue.length > 0) {
          get().processQueue();
        }
        return true;
      }
      return false;
    } catch (error: any) {
      // Server is asleep or warming up
      const isCold =
        error.code === 'ECONNABORTED' ||
        !error.response ||
        [502, 503, 504].includes(error.response?.status);

      if (isCold) {
        set({ isServerSleeping: true });
        // Schedule next gentle check in 12s if there are pending items
        if (!wakeUpRetryTimer && get().queue.length > 0) {
          wakeUpRetryTimer = setTimeout(() => {
            wakeUpRetryTimer = null;
            get().wakeUpAndSync();
          }, 12000);
        }
      }
      return false;
    }
  },

  processQueue: async () => {
    if (isProcessingLock) return;
    const { queue } = get();
    if (queue.length === 0) {
      set({ isSyncing: false });
      return;
    }

    isProcessingLock = true;
    set({ isSyncing: true });

    try {
      // Process mutations sequentially
      for (const item of [...get().queue]) {
        try {
          const res = await api.request({
            url: item.endpoint,
            method: item.method,
            data: item.payload,
            timeout: 18000,
          });

          // Successfully processed by backend!
          if (res.status >= 200 && res.status < 300) {
            // Remove from local persistent memory
            await get().remove(item.id);

            // Sync user streak if returned
            if (res.data?.streak) {
              useStreakStore.getState().syncFromLocalAction(res.data.streak);
            }

            // Sync user reading time & honor points if returned
            if (res.data?.total_user_reading_time_seconds !== undefined) {
              const currentUser = useAuthStore.getState().user;
              if (currentUser) {
                useAuthStore.getState().setUser({
                  ...currentUser,
                  total_reading_time_seconds: res.data.total_user_reading_time_seconds,
                  honor_points:
                    res.data?.total_honor_points !== undefined
                      ? res.data.total_honor_points
                      : currentUser.honor_points,
                });
              }
            } else if (res.data?.total_honor_points !== undefined) {
              const currentUser = useAuthStore.getState().user;
              if (currentUser) {
                useAuthStore.getState().setUser({
                  ...currentUser,
                  honor_points: res.data.total_honor_points,
                });
              }
            }

            // Invalidate relevant queries
            if (item.queryKeysToInvalidate && Array.isArray(item.queryKeysToInvalidate)) {
              for (const qk of item.queryKeysToInvalidate) {
                queryClient.invalidateQueries({ queryKey: qk });
              }
            }
          }
        } catch (itemError: any) {
          const status = itemError.response?.status;
          const isServerCold =
            itemError.code === 'ECONNABORTED' ||
            !itemError.response ||
            [502, 503, 504].includes(status);

          if (isServerCold) {
            // Server went to rest or is still warming up.
            // Retain item in local queue, mark server as sleeping, and break loop.
            set({ isServerSleeping: true, isSyncing: false });
            if (!wakeUpRetryTimer) {
              wakeUpRetryTimer = setTimeout(() => {
                wakeUpRetryTimer = null;
                get().wakeUpAndSync();
              }, 12000);
            }
            break;
          }

          // If client error 4xx (e.g. 400 Bad Request, duplicate, 404):
          // Increase retry counter or discard if it cannot be recovered
          console.warn(`[SyncQueue] Mutation ${item.id} (${item.type}) returned ${status}:`, itemError.response?.data);
          const nextRetries = item.retries + 1;
          if (nextRetries >= 3 || status === 404 || status === 400) {
            console.warn(`[SyncQueue] Discarding non-recoverable mutation ${item.id}`);
            await get().remove(item.id);
          } else {
            // Update retry count
            const updated = get().queue.map((m) =>
              m.id === item.id ? { ...m, retries: nextRetries } : m
            );
            set({ queue: updated });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
        }
      }

      // If all items were synced successfully
      if (get().queue.length === 0) {
        set({
          isSyncing: false,
          isServerSleeping: false,
          lastSyncCompletedAt: Date.now(),
        });
      }
    } finally {
      isProcessingLock = false;
      if (get().queue.length === 0) {
        set({ isSyncing: false });
      }
    }
  },
}));
