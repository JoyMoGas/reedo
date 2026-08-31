/**
 * @project Reedo
 * @module library
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useEffect } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import { useUIStore } from "../../store/useUIStore";
import { useLibraryStore, defaultShelves } from "../../store/useLibraryStore";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);
  const shelves = useLibraryStore((state) => state.shelves);

  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const getBookCount = (shelfId: string, localCount: number) => {
    if (!userBooksData.length) return localCount;
    if (shelfId === 'default-currently-reading') {
      return userBooksData.filter((ub: any) => ub.status === 'CURRENTLY_READING').length;
    }
    if (shelfId === 'default-read-later') {
      return userBooksData.filter((ub: any) => ub.status === 'READ_LATER').length;
    }
    return localCount;
  };

  useEffect(() => {
    setNavbarVisible(true);
    // Ensure new default shelves are added for existing users
    const missingDefaults = defaultShelves.filter(
      ds => !shelves.some(s => s.id === ds.id)
    );
    if (missingDefaults.length > 0) {
      useLibraryStore.setState(state => ({
        shelves: [...missingDefaults, ...state.shelves]
      }));
    }
  }, [shelves]);

  return (
    <SafeAreaView 
      edges={["left", "right"]} 
      className="flex-1 bg-[#FFF8F0]"
    >
      <ScrollView 
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: insets.top + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Create New Shelf Button */}
        <TouchableOpacity 
          onPress={() => router.push('/NewShelf')}
          className="w-full bg-[#212842] rounded-3xl p-6 flex-row items-center shadow-sm mb-8"
        >
          <View className="w-16 h-16 rounded-full bg-[#F5DEB3] items-center justify-center mr-5">
            <Icon name="plus" size={32} color="#212842" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl text-white mb-1" style={{ fontFamily: 'Newsreader-Bold' }}>
              Create a New{'\n'}Shelf
            </Text>
            <Text className="text-sm text-[#A8AAB2]" style={{ fontFamily: 'PublicSans-Regular' }}>
              Start a new thematic{'\n'}collection
            </Text>
          </View>
        </TouchableOpacity>

        {/* Shelves List */}
        <View className="gap-4">
          {shelves.map((shelf) => (
            <TouchableOpacity 
              key={shelf.id}
              onPress={() => router.push(`/shelf/${shelf.id}`)}
              className="w-full bg-[#F5EEDF] rounded-2xl p-5 flex-row items-center"
            >
              <View className="w-12 h-12 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: '#EBE3D3' }}>
                <Icon 
                  name={shelf.icon || "library"} 
                  size={24} 
                  color="#5C5E69" 
                />
              </View>
              <View className="flex-1 justify-center">
                <Text className="text-xl text-[#212842] mb-1" style={{ fontFamily: 'Newsreader-Bold' }}>
                  {shelf.name}
                </Text>
                <Text className="text-xs text-[#8A8A8E] tracking-widest uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                  {getBookCount(shelf.id, shelf.bookCount)} BOOKS
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
