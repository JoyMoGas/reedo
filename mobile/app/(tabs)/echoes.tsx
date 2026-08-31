/**
 * @project Reedo
 * @module echoes
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, FlatList, ActivityIndicator, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import EchoItem from "../../components/social/EchoItem";

export default function EchoesScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);
  const router = useRouter();

  useEffect(() => {
    setNavbarVisible(true);
  }, []);

  const { data: echoes = [], isLoading } = useQuery({
    queryKey: ['echoes'],
    queryFn: async () => {
      const res = await api.get('/api/social/echoes/');
      return res.data;
    }
  });

  const EmptyState = () => (
    <View className="flex-1 px-6 justify-center items-center mt-[-40px]">
      <View className="w-24 h-24 rounded-full bg-[#F5EEDF] items-center justify-center mb-6">
        <Icon name="chats" size={48} color="#212842" />
      </View>
      
      <Text className="text-3xl text-[#212842] text-center mb-3" style={{ fontFamily: 'Newsreader-Bold' }}>
        No echoes yet.
      </Text>
      
      <Text className="text-base text-[#5C5E69] text-center mb-10 leading-relaxed px-4" style={{ fontFamily: 'PublicSans-Regular' }}>
        The void is waiting for your voice. Share a reflection, a quote, or a thought about your latest read.
      </Text>

      <TouchableOpacity 
        onPress={() => router.push('/NewEcho')}
        className="w-full bg-[#212842] py-4 rounded-2xl items-center justify-center shadow-sm"
      >
        <Text className="text-white text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
          CREATE YOUR FIRST ECHO
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView 
      edges={["left", "right"]} 
      className="flex-1 bg-[#FFF8F0]"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between px-6 py-4 pb-2">
        <Text className="text-3xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }}>
          Echoes
        </Text>
        <Text className="text-[10px] text-[#8A8A8E] tracking-widest uppercase mt-2" style={{ fontFamily: 'PublicSans-Bold' }}>
          COMMUNITY
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#212842" />
        </View>
      ) : echoes.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={echoes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <EchoItem item={item} />}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      {echoes.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/NewEcho')}
          activeOpacity={0.8}
          className="absolute right-6 w-16 h-16 rounded-full bg-[#212842] items-center justify-center shadow-lg"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, bottom: insets.bottom + 90 }}
        >
          <Icon name="plus" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
