import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../core/Icon";
import { useNotificationsStore } from "../store/useNotificationsStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/api";
import { Avatar } from "../components/Avatar";

export default function Notifications() {
  const router = useRouter();
  const { markAsRead } = useNotificationsStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    markAsRead(); // Clear the red dot when entering the screen
  }, []);

  // Fetch pending friend requests
  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ["pendingFriendRequests"],
    queryFn: async () => {
      const response = await api.get("api/social/friends/pending/");
      return response.data;
    }
  });

  // Fetch all notifications
  const { data: notifications = [], isLoading: isNotificationsLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get("api/social/notifications/");
      return response.data;
    }
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`api/social/notifications/${id}/read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`api/social/friends/accept/${requestId}/`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate both pending requests and the friends list to update the UI everywhere
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: () => {
      Alert.alert("Error", "Could not accept request.");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`api/social/friends/reject/${requestId}/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingFriendRequests"] });
    }
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF8F0]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#EBE7DF]">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrowLeft" size={24} color="#212842" />
        </TouchableOpacity>
        <Text className="text-xl text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }}>
          Notifications
        </Text>
        <View style={{ width: 24 }} /> {/* Placeholder for balance */}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-sm text-[#8E8B82] uppercase tracking-widest mb-4" style={{ fontFamily: "PublicSans-Bold" }}>
          Friend Requests
        </Text>

        {isLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color="#212842" />
          </View>
        ) : pendingRequests.length === 0 ? (
          <View className="items-center justify-center py-10 opacity-60">
            <Icon name="notification" size={40} color="#8E8B82" />
            <Text className="text-base text-[#8E8B82] mt-4" style={{ fontFamily: "PublicSans-Regular" }}>
              You have no pending requests.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {pendingRequests.map((req: any) => {
              const isAccepting = acceptMutation.isPending && acceptMutation.variables === req.id;
              const isRejecting = rejectMutation.isPending && rejectMutation.variables === req.id;

              return (
                <View key={req.id} className="bg-[#F9F7F2] border border-[#EBE7DF] rounded-2xl p-4 flex-row items-center">
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/ReaderProfile", params: { userId: req.requester.id, username: req.requester.username, fullName: req.requester.full_name, avatar: req.requester.thumbnail } })}
                  >
                    <Avatar uri={req.requester.thumbnail} username={req.requester.username} size={48} />
                  </TouchableOpacity>

                  <View className="flex-1 ml-3">
                    <Text className="text-base text-[#212842]" style={{ fontFamily: "PublicSans-Bold" }}>
                      {req.requester.full_name || req.requester.username}
                    </Text>
                    <Text className="text-sm text-[#8E8B82]" style={{ fontFamily: "PublicSans-Regular" }}>
                      wants to connect
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                      onPress={() => rejectMutation.mutate(req.id)}
                      disabled={isAccepting || isRejecting}
                      className="w-10 h-10 rounded-full bg-[#EBE7DF] items-center justify-center"
                    >
                      {isRejecting ? (
                        <ActivityIndicator size="small" color="#212842" />
                      ) : (
                        <Icon name="x" size={18} color="#212842" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => acceptMutation.mutate(req.id)}
                      disabled={isAccepting || isRejecting}
                      className="w-10 h-10 rounded-full bg-[#212842] items-center justify-center"
                    >
                      {isAccepting ? (
                        <ActivityIndicator size="small" color="#FFF8F0" />
                      ) : (
                        <Icon name="check" size={18} color="#FFF8F0" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
        <Text className="text-sm text-[#8E8B82] uppercase tracking-widest mt-8 mb-4" style={{ fontFamily: "PublicSans-Bold" }}>
          Recent Activity
        </Text>

        {isNotificationsLoading ? (
          <View className="py-10 items-center justify-center">
            <ActivityIndicator size="small" color="#212842" />
          </View>
        ) : notifications.filter((n: any) => n.notification_type !== 'FRIEND_REQUEST').length === 0 ? (
          <View className="items-center justify-center py-10 opacity-60">
            <Text className="text-base text-[#8E8B82]" style={{ fontFamily: "PublicSans-Regular" }}>
              No recent activity.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {notifications
              .filter((n: any) => n.notification_type !== 'FRIEND_REQUEST')
              .map((notif: any) => {
                let iconName = "bell";
                let iconColor = "#8E8B82";
                if (notif.notification_type === 'ECHO_LIKE' || notif.notification_type === 'REVIEW_LIKE') {
                  iconName = "heart";
                  iconColor = "#C95F44";
                } else if (notif.notification_type === 'FRIEND_ACCEPT') {
                  iconName = "checkCircle";
                  iconColor = "#4CAF50";
                } else if (notif.notification_type === 'FRIEND_REJECT') {
                  iconName = "x";
                  iconColor = "#D32F2F";
                }

                return (
                  <TouchableOpacity
                    key={notif.id}
                    onPress={() => {
                      if (!notif.is_read) {
                        markNotificationReadMutation.mutate(notif.id);
                      }
                      if (notif.sender) {
                        router.push({
                          pathname: "/ReaderProfile",
                          params: { userId: notif.sender.id, username: notif.sender.username, fullName: notif.sender.full_name, avatar: notif.sender.avatar }
                        });
                      }
                    }}
                    className={`p-4 flex-row items-center rounded-2xl ${notif.is_read ? 'bg-transparent' : 'bg-[#F9F7F2] border border-[#EBE7DF]'}`}
                  >
                    <View className="w-12 h-12 bg-[#F5EEDF] rounded-full items-center justify-center relative">
                      <Icon name={iconName} size={20} color={iconColor} />
                      {!notif.is_read && (
                        <View className="absolute top-0 right-0 w-3 h-3 bg-[#C95F44] rounded-full border-2 border-[#F9F7F2]" />
                      )}
                    </View>
                    
                    <View className="flex-1 ml-4">
                      <Text className="text-base text-[#212842] leading-tight" style={{ fontFamily: notif.is_read ? "PublicSans-Regular" : "PublicSans-Bold" }}>
                        {notif.message}
                      </Text>
                      <Text className="text-xs text-[#8E8B82] mt-1" style={{ fontFamily: "PublicSans-Regular" }}>
                        {new Date(notif.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
