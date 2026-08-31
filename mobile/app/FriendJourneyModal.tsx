/**
 * @project Reedo
 * @module FriendJourneyModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../core/Icon';
import { Avatar } from '../components/Avatar';

function formatDate(dateString: string) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FriendJourneyModal() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const userId = params.userId as string;
  const username = params.username as string || 'unknown';
  const fullName = params.fullName as string || 'Unknown';
  const avatar = params.avatar as string;
  const bookTitle = params.bookTitle as string;
  const bookCover = params.bookCover as string;
  const progressPercentage = params.progressPercentage ? parseFloat(params.progressPercentage as string) : 0;
  const startedAt = params.startedAt as string;
  const lastReadAt = params.lastReadAt as string;

  return (
    <SafeAreaView 
      edges={['top', 'bottom']}
      className="flex-1 bg-[#FFF8F0]"
    >
      <ScrollView className="flex-1 px-6">
        {/* Header Actions */}
        <View className="flex-row justify-between items-center py-4 mt-2">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center bg-[#F5EEDF] rounded-full"
          >
            <Icon name="x" size={24} color="#212842" />
          </TouchableOpacity>
          <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
            Reading Journey
          </Text>
          <View className="w-10 h-10" />
        </View>

        {/* User Info */}
        <View className="items-center mt-6">
          <Avatar
            uri={avatar}
            fullName={fullName}
            username={username}
            size={80}
          />
          <Text className="text-2xl text-[#212842] mt-4 text-center" style={{ fontFamily: 'Newsreader-Medium' }}>
            {fullName}
          </Text>
          <Text className="text-sm text-[#8A8A8E] mt-1 text-center" style={{ fontFamily: 'PublicSans-Regular' }}>
            @{username}
          </Text>
        </View>

        {/* Book Info */}
        <View className="bg-[#F5EEDF] rounded-3xl p-5 mt-8 items-center border border-[#EBE7DF]">
          {bookCover ? (
            <Image 
              source={{ uri: bookCover }} 
              style={{ width: 80, height: 120, borderRadius: 8 }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-20 h-32 bg-[#EBE7DF] rounded-lg items-center justify-center">
              <Icon name="bookOpen" size={32} color="#8A8A8E" />
            </View>
          )}
          
          <Text className="text-lg text-[#212842] mt-4 text-center px-4" style={{ fontFamily: 'Newsreader-Medium' }} numberOfLines={2}>
            {bookTitle}
          </Text>

          {/* Progress Bar */}
          <View className="w-full mt-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-[#76767E]" style={{ fontFamily: 'PublicSans-Bold' }}>
                Progress
              </Text>
              <Text className="text-sm text-[#C95F44]" style={{ fontFamily: 'PublicSans-Bold' }}>
                {Math.round(progressPercentage)}%
              </Text>
            </View>
            <View className="h-2 w-full bg-[#EAE2D5] rounded-full overflow-hidden">
              <View 
                className="h-full bg-[#C95F44] rounded-full" 
                style={{ width: `${progressPercentage}%` }} 
              />
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mt-6 gap-4">
          <View className="flex-1 bg-white p-4 rounded-2xl border border-[#EAE2D5] items-center">
            <Icon name="calendar" size={24} color="#76767E" />
            <Text className="text-xs text-[#8A8A8E] mt-2 text-center" style={{ fontFamily: 'PublicSans-Regular' }}>
              Started on
            </Text>
            <Text className="text-sm text-[#212842] mt-1 text-center" style={{ fontFamily: 'PublicSans-Bold' }}>
              {formatDate(startedAt)}
            </Text>
          </View>

          <View className="flex-1 bg-white p-4 rounded-2xl border border-[#EAE2D5] items-center">
            <Icon name="bookOpen" size={24} color="#76767E" />
            <Text className="text-xs text-[#8A8A8E] mt-2 text-center" style={{ fontFamily: 'PublicSans-Regular' }}>
              Last updated
            </Text>
            <Text className="text-sm text-[#212842] mt-1 text-center" style={{ fontFamily: 'PublicSans-Bold' }}>
              {formatDate(lastReadAt)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          className="mt-8 bg-[#212842] py-4 rounded-2xl items-center"
          onPress={() => {
            router.back();
            router.push({ pathname: '/ReaderProfile', params: { userId, username, fullName, avatar } });
          }}
        >
          <Text className="text-white text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
            VIEW FULL PROFILE
          </Text>
        </TouchableOpacity>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
