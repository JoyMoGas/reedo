/**
 * @project Reedo
 * @module EchoItem
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useState } from "react";
import { Text, View, TouchableOpacity, Alert } from "react-native";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import NoCover from "../../app/assets/NoCover.svg";
import { Avatar } from "../Avatar";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../store/api";
import { useAuthStore } from "../../store/useAuthStore";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function EchoItem({ item }: { item: any }) {
  const [showSpoiler, setShowSpoiler] = useState(!item.is_spoiler);
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);
  
  const userFullName = item.user?.full_name || item.user?.username || 'Unknown';
  const username = item.user?.username || 'unknown';
  const userAvatar = item.user?.thumbnail || item.user?.profile_picture;
  const isOwner = currentUser?.id === item.user?.id;
  const memberSince = item.user?.member_since_formatted || 'Recently';

  const navigateToProfile = () => {
    router.push({ 
      pathname: '/ReaderProfile', 
      params: { 
        userId: item.user?.id,
        username,
        fullName: userFullName,
        avatar: userAvatar,
        memberSince
      } 
    });
  };

  // ... (useMutation code remains exactly the same) ...

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (item.is_liked) {
        await api.delete(`/api/social/echoes/${item.id}/like/`);
      } else {
        await api.post(`/api/social/echoes/${item.id}/like/`);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['echoes'] });
      const previousEchoes = queryClient.getQueryData(['echoes']);
      queryClient.setQueryData(['echoes'], (old: any) => {
        if (!old) return old;
        return old.map((echo: any) => {
          if (echo.id === item.id) {
            return {
              ...echo,
              is_liked: !echo.is_liked,
              likes_count: echo.is_liked ? echo.likes_count - 1 : echo.likes_count + 1,
            };
          }
          return echo;
        });
      });
      return { previousEchoes };
    },
    onError: (err, newTodo, context: any) => {
      if (context?.previousEchoes) {
        queryClient.setQueryData(['echoes'], context.previousEchoes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['echoes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/social/echoes/${item.id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['echoes'] });
    }
  });

  const handleOptions = () => {
    if (isOwner) {
      Alert.alert(
        "Options",
        "Manage your echo",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Edit", onPress: () => Alert.alert("Coming soon", "Editing will be available soon.") },
          { text: "Delete", style: "destructive", onPress: () => {
            Alert.alert("Delete Echo", "Are you sure you want to delete this echo? This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() }
            ]);
          }}
        ]
      );
    } else {
      Alert.alert(
        "Options",
        "Manage this content",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Follow", onPress: () => Alert.alert("Coming soon", "Following will be available soon.") },
          { text: "Report", style: "destructive", onPress: () => Alert.alert("Reported", "Thanks for keeping the community safe.") },
          { text: "Block", style: "destructive", onPress: () => Alert.alert("Blocked", "You won't see posts from this user anymore.") },
        ]
      );
    }
  };

  return (
    <View className="py-5 border-b border-[#EAE2D5] flex-col">
      {/* User Info */}
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={navigateToProfile}>
          <Avatar
            uri={userAvatar}
            fullName={userFullName}
            username={username}
            size={40}
          />
        </TouchableOpacity>
        
        <View className="flex-row items-baseline gap-1.5 flex-1 flex-wrap">
          <TouchableOpacity onPress={navigateToProfile}>
            <Text
              className="text-base text-[#212842]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {userFullName}
            </Text>
          </TouchableOpacity>
          <Text
            className="text-xs text-[#76767E]"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            @{username}
          </Text>
          <Text className="text-xs text-[#76767E]">•</Text>
          <Text
            className="text-xs text-[#76767E]"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            {formatTimeAgo(item.created_at)}
          </Text>
        </View>
        <TouchableOpacity className="p-2 -mr-2" onPress={handleOptions}>
          <Icon name="dotsY" size={20} color="#8A8A8E" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="mt-3">
        {!showSpoiler ? (
          <TouchableOpacity 
            onPress={() => setShowSpoiler(true)}
            className="bg-[#F5EEDF] border border-[#EBE7DF] rounded-xl p-4 items-center justify-center py-6 mb-4"
          >
            <Icon name="eyeClosedSolid" size={24} color="#C95F44" />
            <Text className="text-[#C95F44] text-sm tracking-widest mt-2" style={{ fontFamily: 'PublicSans-Bold' }}>
              CONTAINS SPOILERS
            </Text>
            <Text className="text-[#8A8A8E] text-xs mt-1" style={{ fontFamily: 'PublicSans-Regular' }}>
              Tap to reveal this reflection
            </Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-base text-[#212842] leading-relaxed mb-4" style={{ fontFamily: 'PublicSans-Regular' }}>
            {item.content}
          </Text>
        )}
      </View>

      {/* Shared Book */}
      {item.shared_book && (
        <View className="bg-[#F5EEDF] rounded-xl p-3 flex-row items-center mb-4 opacity-90">
          <View className="shadow-sm">
            {item.shared_book.cover_image ? (
              <BookCover uri={item.shared_book.cover_image} style={{ width: 40, height: 60, borderRadius: 4 }} />
            ) : (
              <NoCover width={40} height={60} style={{ borderRadius: 4 }} />
            )}
          </View>
          <View className="flex-1 ml-3 justify-center">
            <Text className="text-[10px] text-[#8A8A8E] tracking-widest uppercase mb-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
              TAGGED BOOK
            </Text>
            <Text className="text-base text-[#212842] mb-0.5" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={1}>
              {item.shared_book.title}
            </Text>
            <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
              {item.shared_book.authors?.map((a: any) => a.name || a).join(', ') || 'Unknown Author'}
            </Text>
          </View>
        </View>
      )}

      {/* Interaction Bar */}
      <View className="flex-row items-center gap-6 mt-1">
        <TouchableOpacity onPress={() => likeMutation.mutate()} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
          <Icon name={item.is_liked ? "heartFilled" : "heart"} size={24} color={item.is_liked ? "#E57A7A" : "#76767E"} />
          <Text className="text-sm" style={{ fontFamily: 'PublicSans-Bold', color: item.is_liked ? "#E57A7A" : "#76767E" }}>
            {item.likes_count}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center gap-1.5" 
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/CommentsModal', params: { echoId: item.id } })}
        >
          <Icon name="comment" size={24} color="#76767E" />
          <Text className="text-sm text-[#76767E]" style={{ fontFamily: 'PublicSans-Bold' }}>
            {item.comments_count}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
