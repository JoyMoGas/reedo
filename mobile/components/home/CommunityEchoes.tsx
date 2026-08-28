import React from "react";
import { Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import EchoItem from "../social/EchoItem";

export default function CommunityEchoes() {
  const router = useRouter();

  const { data: echoes = [], isLoading } = useQuery({
    queryKey: ['echoes'],
    queryFn: async () => {
      const res = await api.get('/api/social/echoes/');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <View className="w-full mt-10 items-center justify-center py-10">
        <ActivityIndicator size="small" color="#212842" />
      </View>
    );
  }

  if (echoes.length === 0) return null;

  // Take only the first 5 for the Home Feed
  const recentEchoes = echoes.slice(0, 5);

  return (
    <View className="w-full mt-10">
      <View className="flex-row justify-between items-center w-full mb-4">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          COMMUNITY ECHOES
        </Text>
        <TouchableOpacity 
          className="border-b border-[#76767E] pb-0.5"
          onPress={() => router.push('/(tabs)/echoes')}
        >
          <Text
            className="text-sm text-[#76767E]"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-col">
        {recentEchoes.map((post: any) => (
          <EchoItem key={post.id} item={post} />
        ))}
      </View>
    </View>
  );
}
