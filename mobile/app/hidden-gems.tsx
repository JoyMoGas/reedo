import BookCover from "../components/BookCover";
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

export default function HiddenGemsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Fetch hidden gems reactively using react-query
  const { data: hiddenGemsBooks = [], isLoading, refetch } = useQuery({
    queryKey: ["hiddenGemsBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/hidden-gems/");
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors ? b.authors.join(", ") : "Unknown Author",
        cover: b.cover_image || "",
        synopsis: b.synopsis || "",
        rating: b.average_rating ? Number(b.average_rating).toFixed(1) : "4.5",
        rawBook: b,
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
          Hidden Gems
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
            The Hidden Gems
          </Text>
          <Text
            className="text-sm text-[#76767E] mt-1 leading-relaxed"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            Discover masterpieces that have quietly shaped the literary landscape, curated by our senior editors and historians.
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
        ) : hiddenGemsBooks.length === 0 ? (
          <View className="w-full bg-[#FCF3E0] rounded-xl p-8 items-center justify-center border border-dashed border-[#8E8B82] mt-4">
            <Text className="text-4xl mb-2">💎</Text>
            <Text
              className="text-[#212842] text-center text-lg font-bold mb-1"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              No hidden gems found right now
            </Text>
          </View>
        ) : (
          <View className="flex-col gap-6">
            {hiddenGemsBooks.map((book: any) => (
              <View key={book.id} className="flex-row items-start gap-5 w-full">
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
                      <BookCover
                        uri={book.cover }
                        style={{ width: 110, height: 165 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <NoCover width={110} height={165} />
                    )}
                  </View>
                </View>

                {/* Right: Info Column */}
                <View className="flex-1 flex-col justify-center items-start py-1">
                  <View className="flex-row items-center rounded-md px-2 py-0.5 bg-[#FAF3E8] mb-1.5">
                    <Text
                      className="text-[10px] text-[#8A7C5C] uppercase tracking-wider font-bold"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      ★ {book.rating} · HIGHLY RATED
                    </Text>
                  </View>
                  <Text
                    className="text-lg font-bold text-[#212842] leading-tight"
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
                  {book.synopsis ? (
                    <Text
                      className="text-xs text-[#8E8B82] mt-2 leading-relaxed"
                      style={{ fontFamily: "PublicSans-Regular" }}
                      numberOfLines={2}
                    >
                      {book.synopsis}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    className="border border-[#212842] rounded-full px-6 py-2 mt-3 items-center justify-center bg-transparent"
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
