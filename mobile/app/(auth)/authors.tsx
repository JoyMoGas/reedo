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
import { useAuthorFollowStore } from "../../store/useAuthorFollowStore";
import { useSignUpStore } from "../../store/useSignUpStore";

const colors = ["#C69A5C", "#697A5A", "#C86B4F", "#5C7C8A", "#8A7C5C", "#7C5C8A"];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getColorForName = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

export default function SignInStep4Screen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const favoriteAuthors = useSignUpStore((state) => state.favorite_authors);
  const setFavoriteAuthors = useSignUpStore((state) => state.setFavoriteAuthors);
  const syncFromServerAuthors = useAuthorFollowStore((state) => state.syncFromServerAuthors);

  const [followedAuthors, setFollowedAuthors] = useState<string[]>(favoriteAuthors || []);
  const [followedAuthorNames, setFollowedAuthorNames] = useState<Record<string, string>>({});

  const progressAnim = useRef(new Animated.Value(3 / 6)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 4 / 6,
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
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Suggested authors query
  const { data: suggestedAuthors = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["suggestedAuthors", favoriteGenres],
    queryFn: async () => {
      const response = await api.get("api/books/authors/suggestions/", {
        params: { genres: favoriteGenres.join(",") },
      });
      return response.data.map((a: any) => ({
        id: String(a.id),
        name: a.name,
        role: "RECOMMENDED VOICE",
        initials: getInitials(a.name),
        bg: getColorForName(a.name),
      }));
    },
  });

  // Author search query
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["authorsSearch", debouncedQuery],
    queryFn: async () => {
      const response = await api.get("api/books/authors/search/", {
        params: { q: debouncedQuery },
      });
      return response.data.map((a: any) => ({
        id: String(a.id),
        name: a.name,
        role: "SEARCH RESULT",
        initials: getInitials(a.name),
        bg: getColorForName(a.name),
      }));
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const loading =
    searchQuery.trim().length > 0
      ? debouncedQuery
        ? searchLoading
        : true
      : suggestionsLoading;
  const filteredAuthors =
    searchQuery.trim().length > 0
      ? debouncedQuery
        ? searchResults
        : []
      : suggestedAuthors;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const toggleFollow = (id: string, name: string) => {
    if (followedAuthors.includes(id)) {
      setFollowedAuthors(followedAuthors.filter((a) => a !== id));
    } else {
      setFollowedAuthors([...followedAuthors, id]);
      setFollowedAuthorNames((prev) => ({ ...prev, [id]: name }));
    }
  };

  const handleContinue = () => {
    setFavoriteAuthors(followedAuthors);
    const selectedAuthorObjects = followedAuthors
      .map((id) => ({
        id,
        name: followedAuthorNames[id] || "",
      }))
      .filter((a) => Boolean(a.name));
    if (selectedAuthorObjects.length > 0 && typeof syncFromServerAuthors === "function") {
      syncFromServerAuthors(selectedAuthorObjects);
    }
    router.push("/(auth)/books");
  };

  const handleSkip = () => {
    setFavoriteAuthors([]);
    router.push("/(auth)/books");
  };

  const count = followedAuthors.length;

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
                  Step 4 of 6
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
                  Literary Voices
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
                    {count} following
                  </Text>
                </View>
              </View>

              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[32px] text-[#212842] leading-[38px] mb-2"
              >
                Follow authors{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  you admire
                </Text>
              </Text>

              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[14px] text-[#5A6075] leading-[21px] mb-5"
              >
                We'll recommend books by the authors you follow and suggest related writers in similar genres.
              </Text>

              {/* Soft Borderless Search Bar */}
              <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-2.5">
                <Icon name="search" size={20} color="#76767E" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search any author (e.g. Borges, Woolf, Murakami)..."
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

            {/* Soft Borderless Skeleton Loader vs Authors Grid */}
            {loading ? (
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <View
                    key={item}
                    style={{ width: "48%" }}
                    className="mb-4 rounded-2xl p-4 items-center bg-[#FAF3E8]"
                  >
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        backgroundColor: "#EFE7D6",
                      }}
                      className="mb-3"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "75%",
                        height: 15,
                        backgroundColor: "#EFE7D6",
                      }}
                      className="rounded mb-2"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "50%",
                        height: 10,
                        backgroundColor: "#F4EDE0",
                      }}
                      className="rounded mb-4"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "100%",
                        height: 32,
                        backgroundColor: "#EFE7D6",
                      }}
                      className="rounded-full"
                    />
                  </View>
                ))}
              </View>
            ) : filteredAuthors.length === 0 ? (
              <View className="py-14 items-center justify-center bg-[#FAF3E8] rounded-2xl px-6">
                <Icon name="bookSearch" size={28} color="#94A3B8" />
                <Text
                  style={{ fontFamily: "Newsreader-Bold" }}
                  className="text-lg text-[#212842] mt-2 mb-1"
                >
                  No authors found
                </Text>
                <Text
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="text-xs text-[#76767E] text-center"
                >
                  Try searching with a different spelling or author name.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredAuthors.map((author: any) => {
                  const isFollowing = followedAuthors.includes(author.id);
                  return (
                    <TouchableOpacity
                      key={author.id}
                      onPress={() => toggleFollow(author.id, author.name)}
                      activeOpacity={0.85}
                      style={{ width: "48%" }}
                      className={`mb-4 rounded-2xl p-4 items-center ${
                        isFollowing ? "bg-[#212842]" : "bg-[#FAF3E8]"
                      }`}
                    >
                      {/* Avatar Circle */}
                      <View
                        style={{ backgroundColor: author.bg }}
                        className="w-16 h-16 rounded-full items-center justify-center mb-3"
                      >
                        <Text
                          style={{ fontFamily: "Newsreader-Bold" }}
                          className="text-[#FFF8F0] text-xl"
                        >
                          {author.initials}
                        </Text>
                      </View>

                      <Text
                        style={{ fontFamily: "Newsreader-Bold" }}
                        className={`text-center text-base leading-tight ${
                          isFollowing ? "text-[#FFF8F0]" : "text-[#212842]"
                        }`}
                        numberOfLines={2}
                      >
                        {author.name}
                      </Text>

                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className={`text-center text-[9px] tracking-[1.2px] uppercase mt-1 ${
                          isFollowing ? "text-[#E8A598]" : "text-[#C95F44]"
                        }`}
                      >
                        {author.role}
                      </Text>

                      <View
                        className={`w-full rounded-full py-2 mt-3.5 flex-row items-center justify-center ${
                          isFollowing ? "bg-[#C95F44]" : "bg-[#FFF8F0]"
                        }`}
                      >
                        <Icon
                          name={isFollowing ? "checkCircle" : "akarPlus"}
                          size={12}
                          color={isFollowing ? "#FFF8F0" : "#212842"}
                        />
                        <Text
                          style={{ fontFamily: "PublicSans-Bold" }}
                          className={`text-xs ml-1.5 ${
                            isFollowing ? "text-[#FFF8F0]" : "text-[#212842]"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </Text>
                      </View>
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
                  ? `Continue Following ${count} ${count === 1 ? "Author" : "Authors"}`
                  : "Continue to Step 5"}
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
                I'll follow authors later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
