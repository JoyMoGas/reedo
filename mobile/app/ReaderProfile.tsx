/**
 * @project Reedo
 * @module ReaderProfile
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../core/Icon';
import { Avatar } from '../components/Avatar';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../store/api';
import { useNotificationsStore } from '../store/useNotificationsStore';

export default function ReaderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const currentUser = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const { setHasUnreadNotifications } = useNotificationsStore();

  const userId = params.userId as string;
  const username = params.username as string || 'unknown';
  const fullName = params.fullName as string || 'Unknown';
  const avatar = params.avatar as string;
  const memberSince = params.memberSince as string || 'Recently';

  const isSelf = currentUser?.id === userId;

  // 1. Fetch Friendship Status
  const { data: friendStatus = "NONE", isLoading: isStatusLoading } = useQuery({
    queryKey: ['friendStatus', userId],
    queryFn: async () => {
      const response = await api.get(`api/social/friends/status/${userId}/`);
      return response.data.status; // e.g. "NONE", "PENDING", "ACCEPTED"
    },
    enabled: !isSelf && !!userId,
  });

  // 2. Fetch Friends List for this profile
  const { data: friendsList = [], isLoading: isFriendsLoading } = useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      const response = await api.get(`api/social/friends/${userId}/`);
      return response.data;
    },
    enabled: !!userId,
  });

  // 3. Request Connection Mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`api/social/friends/request/`, { receiver_id: userId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.setQueryData(['friendStatus', userId], "PENDING");
    },
    onError: () => {
      Alert.alert("Error", "Could not send connection request.");
    }
  });

  // 4. Remove Connection Mutation
  const unfriendMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`api/social/friends/remove/${userId}/`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['friendStatus', userId], "NONE");
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends', currentUser?.id] });
    },
    onError: () => {
      Alert.alert("Error", "Could not remove friend.");
    }
  });

  const handleUnfriendPress = () => {
    Alert.alert(
      "Unfriend",
      `Are you sure you want to unfriend ${fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Unfriend", 
          style: "destructive", 
          onPress: () => unfriendMutation.mutate() 
        }
      ]
    );
  };

  const renderConnectButton = () => {
    if (isSelf) return null;

    if (isStatusLoading) {
      return (
        <View className="flex-1 bg-[#EBE7DF] py-4 rounded-2xl items-center shadow-sm">
          <ActivityIndicator size="small" color="#212842" />
        </View>
      );
    }

    if (friendStatus === "ACCEPTED") {
      return (
        <TouchableOpacity 
          className="flex-1 bg-[#EBE7DF] py-4 rounded-2xl flex-row justify-center items-center shadow-sm gap-2"
          onPress={handleUnfriendPress}
          disabled={unfriendMutation.isPending}
        >
          {unfriendMutation.isPending ? (
            <ActivityIndicator size="small" color="#212842" />
          ) : (
            <>
              <Icon name="checkCircle" size={20} color="#212842" />
              <Text className="text-[#212842] text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
                FRIENDS
              </Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    if (friendStatus === "PENDING") {
      return (
        <TouchableOpacity 
          className="flex-1 bg-[#FCF3E0] py-4 rounded-2xl flex-row justify-center items-center shadow-sm gap-2 border border-[#EBE7DF]"
          disabled
        >
          <Icon name="clock" size={20} color="#8E8B82" />
          <Text className="text-[#8E8B82] text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
            PENDING
          </Text>
        </TouchableOpacity>
      );
    }

    // Default: Not friends
    return (
      <TouchableOpacity 
        className="flex-1 bg-[#212842] py-4 rounded-2xl flex-row justify-center items-center shadow-sm gap-2"
        onPress={() => connectMutation.mutate()}
        disabled={connectMutation.isPending}
      >
        {connectMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Icon name="plus" size={20} color="#FFF" />
            <Text className="text-white text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
              CONNECT
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-[#FFF8F0]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Actions */}
        <View className="flex-row justify-between items-center px-4 py-2">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center bg-[#F5EEDF] rounded-full"
          >
            <Icon name="x" size={24} color="#212842" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View className="items-center px-6 mt-6">
          <Avatar
            uri={avatar}
            fullName={fullName}
            username={username}
            size={100}
          />
          
          <Text className="text-3xl text-[#212842] mt-4 text-center" style={{ fontFamily: 'Newsreader-Medium' }}>
            {fullName}
          </Text>
          
          <Text className="text-base text-[#8A8A8E] mt-1 text-center" style={{ fontFamily: 'PublicSans-Regular' }}>
            @{username}
          </Text>

          <View className="flex-row items-center mt-3 bg-[#F5EEDF] px-4 py-1.5 rounded-full">
            <Icon name="calendar" size={14} color="#C95F44" />
            <Text className="text-sm text-[#C95F44] ml-2 tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
              Joined {memberSince}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {!isSelf && (
          <View className="flex-row px-6 mt-8 gap-4">
            {renderConnectButton()}

            <TouchableOpacity 
              className="w-14 h-14 bg-[#F5EEDF] rounded-2xl items-center justify-center border border-[#EBE7DF]"
              onPress={() => Alert.alert("Report User", "Are you sure you want to report this user?", [
                { text: "Cancel", style: "cancel" },
                { text: "Report", style: "destructive", onPress: () => Alert.alert("Reported", "Thanks for keeping the community safe.") }
              ])}
            >
              <Icon name="flag" size={22} color="#212842" />
            </TouchableOpacity>

            <TouchableOpacity 
              className="w-14 h-14 bg-[#F5EEDF] rounded-2xl items-center justify-center border border-[#EBE7DF]"
              onPress={() => Alert.alert("Block User", "Are you sure you want to block this user?", [
                { text: "Cancel", style: "cancel" },
                { text: "Block", style: "destructive", onPress: () => Alert.alert("Blocked", "You won't see posts from this user anymore.") }
              ])}
            >
              <Icon name="ban" size={22} color="#C95F44" />
            </TouchableOpacity>
          </View>
        )}

        {/* Friends Section (Provisional) */}
        <View className="mt-12 px-6">
          <Text className="text-xl text-[#212842] mb-4" style={{ fontFamily: 'Newsreader-Bold' }}>
            Friends
          </Text>
          
          {isFriendsLoading ? (
            <ActivityIndicator size="small" color="#212842" className="self-start mt-2" />
          ) : friendsList.length === 0 ? (
            <Text className="text-base text-[#8E8B82]" style={{ fontFamily: 'PublicSans-Regular' }}>
              No friends to show yet.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row overflow-visible">
              {friendsList.map((friend: any) => {
                // Determine which user in the relationship is the friend (the one that isn't the profile owner)
                const friendUser = friend.requester.id === userId ? friend.receiver : friend.requester;
                return (
                  <TouchableOpacity 
                    key={friend.id}
                    className="items-center mr-6"
                    onPress={() => router.push({ pathname: '/ReaderProfile', params: { userId: friendUser.id, username: friendUser.username, fullName: friendUser.full_name, avatar: friendUser.thumbnail } })}
                  >
                    <Avatar uri={friendUser.thumbnail} username={friendUser.username} size={64} />
                    <Text className="text-sm text-[#212842] mt-2 text-center w-16" style={{ fontFamily: 'PublicSans-Bold' }} numberOfLines={1}>
                      {friendUser.full_name || friendUser.username}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Placeholder for future sections */}
        <View className="px-6 mt-12 mb-12 items-center">
          <Icon name="bookOpen" size={48} color="#EBE7DF" />
          <Text className="text-base text-[#8A8A8E] text-center mt-4" style={{ fontFamily: 'PublicSans-Regular' }}>
            More stats and favorite books coming soon.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
