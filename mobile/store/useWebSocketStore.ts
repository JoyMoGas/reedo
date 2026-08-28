import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { useNotificationsStore } from "./useNotificationsStore";
import { queryClient } from "./queryClient";

const WS_URL = process.env.EXPO_PUBLIC_API_URL?.replace('http', 'ws') || 'ws://10.0.2.2';
const WS_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  ws: null,
  isConnected: false,

  connect: () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    // Avoid multiple connections
    if (get().ws) return;

    const wsUrl = `${WS_URL}:${WS_PORT}/ws/notifications/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket Connected");
      set({ isConnected: true });
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("WS Message received:", data);

        if (data.type === "FRIEND_REQUEST_RECEIVED") {
          useNotificationsStore.getState().setHasUnreadNotifications(true);
          queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
        } else if (data.type === "FRIEND_REQUEST_ACCEPTED") {
          useNotificationsStore.getState().setHasUnreadNotifications(true);
          queryClient.invalidateQueries({ queryKey: ["friends"] });
          queryClient.invalidateQueries({ queryKey: ["friendStatus"] });
        } else if (data.type === "FRIEND_REQUEST_REJECTED") {
          queryClient.invalidateQueries({ queryKey: ["friendStatus"] });
        } else if (data.type === "ECHO_LIKE" || data.type === "REVIEW_LIKE") {
          useNotificationsStore.getState().setHasUnreadNotifications(true);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
        
        // Always invalidate general notifications
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onerror = (e) => {
      console.error("WebSocket Error:", e);
    };

    ws.onclose = () => {
      console.log("WebSocket Disconnected");
      set({ ws: null, isConnected: false });
      
      // Basic reconnect logic if still authenticated
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          get().connect();
        }
      }, 5000);
    };

    set({ ws });
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false });
    }
  },
}));
