import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Logo from "../assets/LOGO.svg";
import Icon from "../../core/Icon";
import api from "../../store/api";
import { useSignUpStore } from "../../store/useSignUpStore";

interface GenreItem {
  id: string;
  name: string;
  category: string;
}

const FALLBACK_CURATED_GENRES: GenreItem[] = [
  { id: "Literary Fiction", name: "Literary Fiction", category: "Fiction" },
  { id: "Classic Literature", name: "Classic Literature", category: "Fiction" },
  { id: "Contemporary Fiction", name: "Contemporary Fiction", category: "Fiction" },
  { id: "Historical Fiction", name: "Historical Fiction", category: "Fiction" },
  { id: "Science Fiction", name: "Science Fiction", category: "Speculative" },
  { id: "Fantasy", name: "Fantasy", category: "Speculative" },
  { id: "Dystopian", name: "Dystopian", category: "Speculative" },
  { id: "Magical Realism", name: "Magical Realism", category: "Speculative" },
  { id: "Mystery & Thriller", name: "Mystery & Thriller", category: "Suspense" },
  { id: "Crime & Noir", name: "Crime & Noir", category: "Suspense" },
  { id: "Horror & Gothic", name: "Horror & Gothic", category: "Suspense" },
  { id: "Romance", name: "Romance", category: "Fiction" },
  { id: "Adventure", name: "Adventure", category: "Fiction" },
  { id: "Young Adult", name: "Young Adult", category: "Fiction" },
  { id: "Philosophy", name: "Philosophy", category: "Non-Fiction" },
  { id: "Psychology", name: "Psychology", category: "Non-Fiction" },
  { id: "History", name: "History", category: "Non-Fiction" },
  { id: "Biography & Memoir", name: "Biography & Memoir", category: "Non-Fiction" },
  { id: "Self-Help", name: "Self-Help", category: "Non-Fiction" },
  { id: "Science & Nature", name: "Science & Nature", category: "Non-Fiction" },
  { id: "Business & Economics", name: "Business & Economics", category: "Non-Fiction" },
  { id: "Poetry", name: "Poetry", category: "Literature" },
  { id: "Essays & Criticism", name: "Essays & Criticism", category: "Literature" },
  { id: "Mythology & Folklore", name: "Mythology & Folklore", category: "Literature" },
  { id: "Art & Architecture", name: "Art & Architecture", category: "Culture" },
  { id: "Politics & Society", name: "Politics & Society", category: "Non-Fiction" },
  { id: "True Crime", name: "True Crime", category: "Non-Fiction" },
  { id: "Humor & Satire", name: "Humor & Satire", category: "Fiction" },
];

export default function SignInStep3Screen() {
  const router = useRouter();
  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const setFavoriteGenres = useSignUpStore((state) => state.setFavoriteGenres);

  const [selectedGenres, setSelectedGenres] = useState<string[]>(favoriteGenres || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const progressAnim = useRef(new Animated.Value(2 / 6)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 3 / 6,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

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
  }, [progressAnim, pulseAnim]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: genres = [], isLoading: loading } = useQuery({
    queryKey: ["onboardingGenres", debouncedQuery],
    queryFn: async () => {
      try {
        const response = await api.get("api/books/genres/", {
          params: debouncedQuery ? { q: debouncedQuery } : {},
        });
        if (Array.isArray(response.data) && response.data.length > 0) {
          return response.data.map((g: any) => ({
            id: String(g.id),
            name: g.genre,
            category: g.category || "Book Filter",
          }));
        }
      } catch (err) {
        console.warn("Using fallback genre filters:", err);
      }

      if (!debouncedQuery) return FALLBACK_CURATED_GENRES;
      const q = debouncedQuery.toLowerCase();
      return FALLBACK_CURATED_GENRES.filter(
        (g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
      );
    },
  });

  const isSearching = searchQuery.trim().length > 0 && searchQuery.trim() !== debouncedQuery;
  const showSkeleton = loading || isSearching;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    setFavoriteGenres(selectedGenres);
    router.push("/(auth)/authors");
  };

  const handleSkip = () => {
    setFavoriteGenres([]);
    router.push("/(auth)/authors");
  };

  const count = selectedGenres.length;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-between">
          {/* Top Bar + Progress Indicator */}
          <View className="px-6 pt-3">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-full bg-[#FAF3E8] items-center justify-center"
              >
                <Icon name="arrowLeft" size={18} color="#212842" />
              </TouchableOpacity>

              <View className="flex-row items-center px-3.5 py-1.5 rounded-full bg-[#FAF3E8]">
                <Logo width={16} height={16} />
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] tracking-[1.5px] text-[#212842] uppercase ml-2"
                >
                  Step 3 of 6
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSkip}
                activeOpacity={0.75}
                className="px-3.5 py-2 rounded-full bg-[#FAF3E8]"
              >
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#5A6075] text-xs"
                >
                  Skip
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-1.5 bg-[#EDE3D5] rounded-full overflow-hidden mb-2">
              <Animated.View
                style={{ width: progressWidth }}
                className="h-full bg-[#C95F44] rounded-full"
              />
            </View>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] tracking-[2px] text-[#C95F44] uppercase"
                >
                  Reading Taste
                </Text>
                <View
                  className={`px-3 py-1 rounded-full ${
                    count > 0 ? "bg-[#212842]" : "bg-[#FAF3E8]"
                  }`}
                >
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-[11px] ${
                      count > 0 ? "text-[#FFF8F0]" : "text-[#5A6075]"
                    }`}
                  >
                    {count} selected
                  </Text>
                </View>
              </View>

              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[32px] text-[#212842] leading-[38px] mb-2"
              >
                What genres do you{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  enjoy reading?
                </Text>
              </Text>

              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[14px] text-[#5A6075] leading-[21px] mb-5"
              >
                Select the literary genres and subjects you enjoy. We use these filters to curate real books and authors for your library.
              </Text>

              {/* Soft Borderless Search Bar (matches Discover screen) */}
              <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-2.5">
                <Icon name="search" size={20} color="#76767E" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search genres or topics (e.g. Sci-Fi, Philosophy)..."
                  placeholderTextColor="#B5B1A8"
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="flex-1 text-sm text-[#212842] py-1.5 ml-2.5"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                    <Icon name="cancel" size={18} color="#76767E" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Soft Borderless Skeleton Loader vs Clean Genre Cards */}
            {showSkeleton ? (
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                  <View
                    key={item}
                    style={{ width: "48%" }}
                    className="mb-3.5 p-4 rounded-2xl bg-[#FAF3E8]"
                  >
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: 58,
                        height: 9,
                        backgroundColor: "#EFE7D6",
                      }}
                      className="rounded mb-3"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "80%",
                        height: 16,
                        backgroundColor: "#EFE7D6",
                      }}
                      className="rounded mb-1.5"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "45%",
                        height: 12,
                        backgroundColor: "#F4EDE0",
                      }}
                      className="rounded"
                    />
                  </View>
                ))}
              </View>
            ) : genres.length === 0 ? (
              <View className="py-14 items-center justify-center bg-[#FAF3E8] rounded-2xl px-6">
                <Text
                  style={{ fontFamily: "Newsreader-Bold" }}
                  className="text-lg text-[#212842] mb-1"
                >
                  No matching genres found
                </Text>
                <Text
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="text-xs text-[#76767E] text-center"
                >
                  Try searching with a broader literary genre or subject name.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {genres.map((genre: GenreItem) => {
                  const isSelected = selectedGenres.includes(genre.id);
                  return (
                    <TouchableOpacity
                      key={genre.id}
                      onPress={() => toggleGenre(genre.id)}
                      activeOpacity={0.8}
                      style={{ width: "48%" }}
                      className={`mb-3.5 p-4 rounded-2xl justify-between ${
                        isSelected ? "bg-[#212842]" : "bg-[#FAF3E8]"
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <Text
                          style={{ fontFamily: "PublicSans-Bold" }}
                          className={`text-[9px] tracking-[1.4px] uppercase ${
                            isSelected ? "text-[#E8A598]" : "text-[#C95F44]"
                          }`}
                          numberOfLines={1}
                        >
                          {genre.category}
                        </Text>

                        <View
                          className={`w-4 h-4 rounded-full items-center justify-center ${
                            isSelected ? "bg-[#C95F44]" : "bg-[#EDE5D8]"
                          }`}
                        >
                          {isSelected && (
                            <View className="w-1.5 h-1.5 rounded-full bg-[#FFF8F0]" />
                          )}
                        </View>
                      </View>

                      <Text
                        style={{ fontFamily: "Newsreader-Bold" }}
                        className={`text-[17px] leading-[21px] ${
                          isSelected ? "text-[#FFF8F0]" : "text-[#212842]"
                        }`}
                        numberOfLines={2}
                      >
                        {genre.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Streamlined Pinned Bottom Bar */}
          <View className="px-6 pt-3 pb-5 bg-[#FFF8F0]">
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.85}
              className="bg-[#212842] w-full py-4 rounded-2xl flex-row items-center justify-center shadow-sm mb-2"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
              >
                {count > 0
                  ? `Continue with ${count} ${count === 1 ? "Genre" : "Genres"}`
                  : "Continue to Step 4"}
              </Text>
              <Icon name="arrowRight" size={16} color="#FFF8F0" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              className="py-1 items-center"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-xs text-[#76767E]"
              >
                Skip genre selection for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
