import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../core/Icon";
import { Avatar } from "../Avatar";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useRouter } from "expo-router";

export default function LibraryHonors() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore(state => state.user);

  const { data: friendsList = [] } = useQuery({
    queryKey: ['friends', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`api/social/friends/${currentUser.id}/`);
      return response.data;
    },
    enabled: !!currentUser?.id,
  });

  // Calculate Leaderboard
  const leaderboard = [
    {
      id: currentUser?.id,
      name: "You",
      points: currentUser?.honor_points || 0,
      avatar: currentUser?.thumbnail,
      isSelf: true,
    },
    ...friendsList.map((friend: any) => {
      const friendUser = friend.requester.id === currentUser?.id ? friend.receiver : friend.requester;
      return {
        id: friendUser.id,
        name: friendUser.full_name || friendUser.username,
        points: friendUser.honor_points || 0,
        avatar: friendUser.thumbnail,
        isSelf: false,
        username: friendUser.username,
      };
    })
  ].sort((a, b) => b.points - a.points);

  const streakActive = (currentUser?.streak_days || 0) >= 30;

  return (
    <ScrollView 
      className="flex-1 px-6" 
      contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hall of Honors Card */}
      <View className="w-full bg-[#212842] rounded-[32px] p-6 mb-10 overflow-hidden relative shadow-md">
        <View className="absolute right-[-20] top-0 opacity-10">
           <Icon name="library" size={200} color="#FFF" />
        </View>
        <Text className="text-[#A8AAB2] text-[10px] tracking-widest uppercase mb-1" style={{ fontFamily: "PublicSans-Bold" }}>DISTINGUISHED ACHIEVEMENTS</Text>
        <Text className="text-white text-3xl mb-8" style={{ fontFamily: "Newsreader-Medium" }}>Hall of Honors</Text>
        
        <View className="flex-row flex-wrap gap-y-6">
          <View className="items-center w-1/3">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-2 shadow-sm ${streakActive ? 'bg-[#F5DEB3]' : 'bg-[#3A3F58]'}`}>
              <Icon name="stars" size={28} color={streakActive ? "#212842" : "#8A8A8E"} />
            </View>
            <Text className="text-white text-[8px] tracking-widest uppercase text-center px-1" style={{ fontFamily: "PublicSans-Bold" }}>30 DAY STREAK</Text>
          </View>
          <View className="items-center w-1/3">
            <View className="w-16 h-16 rounded-full bg-[#C2C9EC] items-center justify-center mb-2 shadow-sm">
              <Icon name="medalStarFilled" size={28} color="#212842" />
            </View>
            <Text className="text-white text-[8px] tracking-widest uppercase" style={{ fontFamily: "PublicSans-Bold" }}>50 BOOKS</Text>
          </View>
          <View className="items-center w-1/3">
            <View className="w-16 h-16 rounded-full border border-dashed border-[#8E8B82] items-center justify-center mb-2">
              <Icon name="plus" size={20} color="#8E8B82" />
            </View>
            <Text className="text-[#8E8B82] text-[8px] tracking-widest uppercase" style={{ fontFamily: "PublicSans-Bold" }}>PIN BADGE</Text>
          </View>
        </View>
      </View>

      {/* Achievements */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>Achievements</Text>
            <Text className="text-[#8E8B82] text-xs mt-1" style={{ fontFamily: "PublicSans-Regular" }}>Refining the art of the literary{"\n"}mind.</Text>
          </View>
          <Text className="text-[#212842] text-[10px] tracking-widest uppercase text-right leading-tight pb-1" style={{ fontFamily: "PublicSans-Bold" }}>14 / 42{"\n"}UNLOCKED</Text>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          {[
            { title: "First Folio", desc: "Finish your first curated volume", icon: "bookOpen", active: true },
            { title: "Marginaliaist", desc: "Write 50 insightful book annotations.", icon: "editNote", active: true },
            { title: "Bibliophile", desc: "Maintain a library of over 100 titles.", icon: "lockOpen", active: false },
            { title: "Night Owl", desc: "Read past midnight for 5 consecutive nights.", icon: "moonFilled", active: false },
          ].map((item, idx) => (
            <View key={idx} className="w-[48%] bg-[#FDF8F0] p-4 rounded-2xl border border-[#F5EEDF] shadow-sm items-center">
              <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${item.active ? 'bg-[#F5DEB3]' : 'border border-dashed border-[#D9D9D9]'}`}>
                <Icon name={item.icon} size={20} color={item.active ? "#212842" : "#D9D9D9"} />
              </View>
              <Text className="text-[#212842] text-sm mb-1 text-center" style={{ fontFamily: "Newsreader-Bold" }}>{item.title}</Text>
              <Text className="text-[#8E8B82] text-[10px] text-center" style={{ fontFamily: "PublicSans-Regular" }}>{item.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Friends Leaderboard */}
      <View className="mb-10">
        <Text className="text-[#212842] text-2xl mb-4" style={{ fontFamily: "Newsreader-Medium" }}>Friends Leaderboard</Text>
        
        <View className="gap-2">
          {leaderboard.map((user, idx) => {
            const isTop = idx === 0;
            if (user.isSelf) {
              return (
                <View key={user.id} className="bg-[#212842] rounded-xl p-4 flex-row items-center shadow-md">
                  <Text className="text-white text-xl w-6 italic mr-2" style={{ fontFamily: "Newsreader-Medium" }}>{idx + 1}</Text>
                  <Avatar uri={user.avatar} username={user.name} size={40} className="mr-3 border border-white/20" />
                  <View className="flex-1">
                    <Text className="text-white text-base leading-tight" style={{ fontFamily: "Newsreader-Bold" }}>You</Text>
                    <Text className="text-[#A8AAB2] text-[8px] tracking-widest uppercase" style={{ fontFamily: "PublicSans-Bold" }}>{user.points.toLocaleString()} HONOR POINTS</Text>
                  </View>
                  <View className="bg-[#F5DEB3] px-3 py-1 rounded-full">
                     <Text className="text-[#212842] text-[8px] tracking-widest uppercase" style={{ fontFamily: "PublicSans-Bold" }}>MASTER</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity 
                key={user.id} 
                className="bg-[#FDF8F0] rounded-xl p-4 flex-row items-center border border-[#F5EEDF] shadow-sm"
                onPress={() => router.push({ pathname: '/ReaderProfile', params: { userId: user.id, username: user.username, fullName: user.name, avatar: user.avatar } })}
              >
                <Text className="text-[#212842] text-xl w-6 italic mr-2" style={{ fontFamily: "Newsreader-Medium" }}>{idx + 1}</Text>
                <Avatar uri={user.avatar} username={user.name} size={40} className="mr-3 border border-[#F5EEDF]" />
                <View className="flex-1">
                  <Text className="text-[#212842] text-base leading-tight" style={{ fontFamily: "Newsreader-Bold" }}>{user.name}</Text>
                  <Text className="text-[#8E8B82] text-[8px] tracking-widest uppercase" style={{ fontFamily: "PublicSans-Bold" }}>{user.points.toLocaleString()} HONOR POINTS</Text>
                </View>
                {isTop && <Icon name="medalStarAlt" size={24} color="#F5DEB3" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}
