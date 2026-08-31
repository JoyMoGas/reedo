/**
 * @project Reedo
 * @module FriendsJourneys
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import BookCover from "../BookCover";
import { Avatar } from "../Avatar";

export default function FriendsJourneys() {
  const router = useRouter();

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['friends-journeys'],
    queryFn: async () => {
      const res = await api.get('/api/social/friends-journeys/');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <View className="w-full mt-10 items-center justify-center py-6">
        <ActivityIndicator size="small" color="#212842" />
      </View>
    );
  }

  // If no friends are reading, hide the section entirely to avoid empty space
  if (journeys.length === 0) return null;

  return (
    <View className="w-full mt-8">
      <Text
        className="text-xl font-bold text-[#212842] mb-4"
        style={{ fontFamily: "Newsreader-Medium" }}
      >
        Friends' Journeys
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="overflow-visible"
        contentContainerStyle={{ gap: 16 }}
      >
        {journeys.map((journey: any) => {
          const user = journey.user;
          const book = journey.book;
          const progress = journey.progress_percentage || 0;

          return (
            <View key={journey.id} className="items-center relative w-[100px]">
              <TouchableOpacity 
                activeOpacity={0.7} 
                className="w-[100px] shadow-sm items-center"
                onPress={() => router.push({ pathname: '/BookDetails', params: { id: book.id } })}
              >
                <BookCover uri={book.cover_image} style={{ width: 100, height: 150 }} />
                
                {/* Progress Bar inside cover layout for better integration */}
                <View className="w-full h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden mt-2">
                  <View 
                    className="h-full bg-[#C95F44] rounded-full" 
                    style={{ width: `${progress}%` }} 
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="absolute -top-3 -right-3 border-2 border-[#FFF8F0] rounded-full shadow-sm bg-[#FFF8F0]"
                onPress={() => router.push({
                  pathname: '/FriendJourneyModal',
                  params: {
                    userId: user.id,
                    username: user.username,
                    fullName: user.full_name,
                    avatar: user.thumbnail || user.profile_picture,
                    bookTitle: book.title,
                    bookCover: book.cover_image,
                    progressPercentage: progress,
                    startedAt: journey.started_at,
                    lastReadAt: journey.last_read_at
                  }
                })}
              >
                <Avatar
                  uri={user.thumbnail || user.profile_picture}
                  fullName={user.full_name || user.username}
                  username={user.username}
                  size={32}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
