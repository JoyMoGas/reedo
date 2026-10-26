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
import { useSyncQueueStore } from "../../store/useSyncQueueStore";

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
    } as any);
  };

  const handleTaggedBookPress = () => {
    if (!item.shared_book) return;
    const book = item.shared_book;
    const authorStr = Array.isArray(book.authors)
      ? book.authors.map((a: any) => (typeof a === 'string' ? a : a.name || '')).filter(Boolean).join(', ')
      : (typeof book.authors === 'string' ? book.authors : 'Unknown Author');
    const genreStr = Array.isArray(book.genres)
      ? book.genres.map((g: any) => (typeof g === 'string' ? g : g.genre || '')).filter(Boolean).join(', ')
      : (typeof book.genres === 'string' ? book.genres : '');

    router.push({
      pathname: '/BookDetails',
      params: {
        bookId: book.id,
        id: book.id,
        bookName: book.title,
        author: authorStr,
        cover: book.cover_image || book.cover,
        genres: genreStr,
        totalPages: book.total_pages ? String(book.total_pages) : '',
        averageRating: book.average_rating ? String(book.average_rating) : '',
        description: book.synopsis || book.description || '',
      }
    } as any);
  };

  // ... (useMutation code remains exactly the same) ...

  const handleLikePress = () => {
    const isLiked = !!item.is_liked;
    const nextLiked = !isLiked;
    const nextCount = isLiked ? Math.max(0, item.likes_count - 1) : item.likes_count + 1;

    // Optimistically update cache
    queryClient.setQueryData(['echoes'], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((echo: any) => {
        if (echo.id === item.id) {
          return {
            ...echo,
            is_liked: nextLiked,
            likes_count: nextCount,
          };
        }
        return echo;
      });
    });

    // Enqueue to persistent outbox
    useSyncQueueStore.getState().enqueue({
      type: "LIKE_ECHO",
      endpoint: `/api/social/echoes/${item.id}/like/`,
      method: isLiked ? "DELETE" : "POST",
      title: isLiked ? "Unlike Echo" : "Like Echo",
      queryKeysToInvalidate: [['echoes']],
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (): Promise<void> => {
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

  const renderContentWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const usernameWithoutAt = part.substring(1);
        const mentionedUser = item.mentions?.find((m: any) => m.username === usernameWithoutAt);
        
        return (
          <Text 
            key={index} 
            style={{ fontFamily: 'PublicSans-Bold', color: '#C95F44' }}
            onPress={mentionedUser ? () => {
              router.push({ 
                pathname: '/ReaderProfile', 
                params: { 
                  userId: mentionedUser.id,
                  username: mentionedUser.username,
                  fullName: mentionedUser.full_name || mentionedUser.username,
                  avatar: mentionedUser.thumbnail
                } 
              } as any);
            } : undefined}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
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
            {renderContentWithMentions(item.content)}
          </Text>
        )}
      </View>

      {/* Shared Book */}
      {item.shared_book && (
        <TouchableOpacity 
          activeOpacity={0.75}
          onPress={handleTaggedBookPress}
          className="bg-[#F5EEDF] border border-[#EBE7DF] rounded-xl p-3 flex-row items-center mb-4 active:bg-[#EFE7D7]"
        >
          <View className="shadow-sm">
            {item.shared_book.cover_image ? (
              <BookCover uri={item.shared_book.cover_image} style={{ width: 42, height: 64, borderRadius: 4 }} />
            ) : (
              <NoCover width={42} height={64} style={{ borderRadius: 4 }} />
            )}
          </View>
          <View className="flex-1 ml-3.5 justify-center pr-2">
            <View className="flex-row items-center gap-1 mb-0.5">
              <Text className="text-[10px] text-[#C95F44] tracking-widest uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                TAGGED BOOK
              </Text>
            </View>
            <Text className="text-base text-[#212842] mb-0.5" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={1}>
              {item.shared_book.title}
            </Text>
            <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
              {item.shared_book.authors?.map((a: any) => a.name || a).join(', ') || 'Unknown Author'}
            </Text>
          </View>
          <View className="pr-1">
            <Icon name="chevronRight" size={18} color="#8A8A8E" />
          </View>
        </TouchableOpacity>
      )}

      {/* Interaction Bar */}
      <View className="flex-row items-center gap-6 mt-1">
        <TouchableOpacity onPress={handleLikePress} className="flex-row items-center gap-1.5" activeOpacity={0.7}>
          <Icon name={item.is_liked ? "heartFilled" : "heart"} size={24} color={item.is_liked ? "#E57A7A" : "#76767E"} />
          <Text className="text-sm" style={{ fontFamily: 'PublicSans-Bold', color: item.is_liked ? "#E57A7A" : "#76767E" }}>
            {item.likes_count}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-row items-center gap-1.5" 
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/CommentsModal', params: { echoId: item.id } } as any)}
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
