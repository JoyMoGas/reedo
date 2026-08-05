import React, { useRef, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import api from "../store/api";
import Icon from "../core/Icon";
import NoCover from "./assets/NoCover.svg";

export default function NewlyArrivedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const currentYear = new Date().getFullYear();

  // Fetch newly arrived books reactively using react-query
  const { data: newlyArrivedBooks = [], isLoading, refetch } = useQuery({
    queryKey: ["newlyArrivedBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/newly-arrived/");
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors.join(", "),
        cover: b.cover_image || "",
        publishedDate: b.published_date,
      }));
    }
  });

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLoading]);

  const formatReleaseDate = (dateStr: string) => {
    if (!dateStr) return "NEW RELEASE";
    try {
      const date = new Date(dateStr);
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      if (isNaN(date.getTime())) return "NEW RELEASE";
      return `RELEASED ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return "NEW RELEASE";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]" edges={["top", "bottom"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#EBE7DF]">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-1 active:opacity-75"
        >
          <Icon name="chevronLeft" size={28} color="#212842" />
        </TouchableOpacity>
        <Text
          className="text-lg font-bold text-[#212842] tracking-wider uppercase"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          Newly Arrived
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#212842"
          />
        }
      >
        <View className="mb-6">
          <Text
            className="text-2xl font-bold text-[#212842]"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            The Publications of {currentYear}
          </Text>
          <Text
            className="text-sm text-[#76767E] mt-1"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            Explore the latest cataloged editions added to the platform this year.
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-col gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="flex-row items-center gap-4 w-full">
                <Animated.View
                  style={{ opacity: pulseAnim, width: 110, height: 165 }}
                  className="rounded-xl bg-[#FAF3E8]"
                />
                <View className="flex-1 flex-col gap-2">
                  <Animated.View style={{ opacity: pulseAnim, width: 120, height: 12 }} className="rounded bg-[#FAF3E8]" />
                  <Animated.View style={{ opacity: pulseAnim, width: 160, height: 20 }} className="rounded bg-[#FAF3E8]" />
                  <Animated.View style={{ opacity: pulseAnim, width: 90, height: 14 }} className="rounded bg-[#FAF3E8]" />
                  <Animated.View style={{ opacity: pulseAnim, width: 80, height: 35 }} className="rounded-full bg-[#FAF3E8]" />
                </View>
              </View>
            ))}
          </View>
        ) : newlyArrivedBooks.length === 0 ? (
          <View className="w-full bg-[#FCF3E0] rounded-xl p-8 items-center justify-center border border-dashed border-[#8E8B82] mt-4">
            <Text className="text-4xl mb-2">📚</Text>
            <Text
              className="text-[#212842] text-center text-lg font-bold mb-1"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              No new releases found for {currentYear}
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-6">
            {newlyArrivedBooks.map((book: any) => (
              <View key={book.id} className="flex-row items-center gap-5 w-full">
                {/* Left: Cover */}
                <View
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 5,
                    elevation: 3,
                  }}
                  className="bg-transparent rounded-xl"
                >
                  <View className="rounded-xl overflow-hidden bg-[#FCF3E0]">
                    {book.cover ? (
                      <Image
                        source={{ uri: book.cover }}
                        style={{ width: 110, height: 165 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <NoCover width={110} height={165} />
                    )}
                  </View>
                </View>

                {/* Right: Info Column */}
                <View className="flex-1 flex-col justify-center items-start">
                  <Text
                    className="text-[10px] text-[#8E8B82] uppercase tracking-wider font-bold"
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    {formatReleaseDate(book.publishedDate)}
                  </Text>
                  <Text
                    className="text-lg font-bold text-[#212842] mt-1 leading-tight"
                    style={{ fontFamily: "Newsreader-Bold" }}
                    numberOfLines={2}
                  >
                    {book.title}
                  </Text>
                  <Text
                    className="text-xs text-[#76767E] mt-1 font-medium"
                    style={{ fontFamily: "PublicSans-Italic" }}
                    numberOfLines={1}
                  >
                    {book.author}
                  </Text>
                  
                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="border border-[#212842] rounded-full px-6 py-2 mt-4 items-center justify-center bg-transparent"
                    onPress={() => console.log("Discover clicked:", book.title)}
                  >
                    <Text
                      className="text-[10px] font-bold text-[#212842] uppercase tracking-wider"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      DISCOVER
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
