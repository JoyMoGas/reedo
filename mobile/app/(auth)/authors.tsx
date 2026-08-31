/**
 * @project Reedo
 * @module authors
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import api from "../../store/api";
import { useSignUpStore } from "../../store/useSignUpStore";
import { useQuery } from "@tanstack/react-query";

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
  const [followedAuthors, setFollowedAuthors] = useState<string[]>(favoriteAuthors);

  // Animated values
  const progressAnim = useRef(new Animated.Value(3 / 6)).current;
  const dotTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top progress bar animation: from 3/6 (step 3) to 4/6 (step 4)
    Animated.timing(progressAnim, {
      toValue: 4 / 6,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bottom dots animation: transitioning active pill from dot 3 to dot 4
    Animated.timing(dotTransition, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  // Debounce search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Suggested authors query
  const { data: suggestedAuthors = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["suggestedAuthors", favoriteGenres],
    queryFn: async () => {
      const response = await api.get("api/books/authors/suggestions/", {
        params: { genres: favoriteGenres.join(",") }
      });
      return response.data.map((a: any) => ({
        id: a.id,
        name: a.name,
        role: "LITERARY VOICE",
        initials: getInitials(a.name),
        bg: getColorForName(a.name)
      }));
    },
  });

  // Author search query
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["authorsSearch", debouncedQuery],
    queryFn: async () => {
      const response = await api.get("api/books/authors/search/", {
        params: { q: debouncedQuery }
      });
      return response.data.map((a: any) => ({
        id: a.id,
        name: a.name,
        role: "SEARCH RESULT",
        initials: getInitials(a.name),
        bg: getColorForName(a.name)
      }));
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const loading = searchQuery.trim().length > 0 ? (debouncedQuery ? searchLoading : true) : suggestionsLoading;
  const filteredAuthors = searchQuery.trim().length > 0 ? (debouncedQuery ? searchResults : []) : suggestedAuthors;

  // Pre-select some initial author if suggestions are loaded and we have no selection
  useEffect(() => {
    if (suggestedAuthors.length > 0 && followedAuthors.length === 0) {
      setFollowedAuthors([suggestedAuthors[0].id]);
    }
  }, [suggestedAuthors]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const dot3Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 8],
  });

  const dot4Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const dot3Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#212842", "#EBE7DF"],
  });

  const dot4Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EBE7DF", "#212842"],
  });

  const toggleFollow = (id: string) => {
    if (followedAuthors.includes(id)) {
      setFollowedAuthors(followedAuthors.filter((a) => a !== id));
    } else {
      setFollowedAuthors([...followedAuthors, id]);
    }
  };

  const handleContinue = () => {
    // Save to Zustand and navigate to Step 5
    setFavoriteAuthors(followedAuthors);
    router.push("/(auth)/books");
  };



  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0] justify-between">

      {/* Top Navigation Header (Fixed) */}
      <View>
        <View className="flex-row items-center justify-between w-full px-6 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-16 h-10 items-start justify-center"
            activeOpacity={0.7}
          >
            <Text
              className="text-[#212842] text-2xl font-bold"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {"<"}
            </Text>
          </TouchableOpacity>

          <Logo width={36} height={36} />

          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="w-16 h-10 items-end justify-center"
            activeOpacity={0.7}
          >
            <Text
              className="text-[#212842] text-sm"
              style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Animated Progress Bar */}
        <View className="w-full h-[2px] bg-[#EBE7DF]">
          <Animated.View
            style={{ width: progressWidth }}
            className="h-full bg-[#212842]"
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        className="flex-1"
      >
        {/* Scrollable central content */}
        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
        {/* Header Title & Subtitle */}
        <Text
          className="text-[#212842] text-start leading-tight"
          style={{ fontFamily: "Newsreader-Bold", fontSize: 36 }}
        >
          Influential{"\n"}Authors
        </Text>
        <Text
          className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Follow at least three voices that guide your thoughts.
        </Text>

        {/* Search Bar Input */}
        <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-3 mt-6 mb-6">
          <Text className="text-[#8E8B82] mr-2 text-base">🔍</Text>
          <TextInput
            className="flex-1 text-base text-[#212842]"
            style={{ fontFamily: "PublicSans-Regular" }}
            placeholder="Search for author, poets, or critics..."
            placeholderTextColor="#C5C2BA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Grid Layout of Author Cards */}
        {loading ? (
          <View className="py-20 w-full justify-center items-center">
            <ActivityIndicator size="large" color="#212842" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between w-full">
            {filteredAuthors.map((author: any) => {
              const isFollowing = followedAuthors.includes(author.id);
              return (
                <View
                  key={author.id}
                  className="w-[47%] bg-[#FAF3E8] rounded-3xl p-3 mb-4 flex-col justify-between"
                >
                  <View>
                    {/* Initials as Profile Picture */}
                    <View
                      style={{ backgroundColor: author.bg }}
                      className="w-full aspect-square rounded-2xl items-center justify-center mb-3"
                    >
                      <Text
                        className="text-[#FFF8F0] text-3xl font-bold"
                        style={{ fontFamily: "Newsreader-Bold" }}
                      >
                        {author.initials}
                      </Text>
                    </View>

                    {/* Author Name */}
                    <Text
                      className="text-[#212842] text-lg leading-tight"
                      style={{ fontFamily: "Newsreader-Bold" }}
                    >
                      {author.name}
                    </Text>

                    {/* Role / Tagline */}
                    <Text
                      className="text-[9px] text-[#8E8B82] tracking-wider mt-1 uppercase"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {author.role}
                    </Text>
                  </View>

                  {/* Follow Button */}
                  <TouchableOpacity
                    onPress={() => toggleFollow(author.id)}
                    className={`w-full rounded-full py-2 mt-4 items-center justify-center ${
                      isFollowing ? "bg-[#212842]" : "bg-transparent border border-[#212842]"
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`text-sm ${
                        isFollowing ? "text-[#FFFFFF]" : "text-[#212842]"
                      }`}
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {isFollowing ? "✓ Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Cozy and welcoming UX Login Shortcut */}
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/login")}
          className="mt-8 py-2 w-full justify-center items-center flex-row"
          activeOpacity={0.7}
        >
          <Text className="text-[#5C5E69] text-sm" style={{ fontFamily: "PublicSans-Regular" }}>
            Already curating?{" "}
            <Text className="text-[#212842]" style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}>
              Access your archive
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Pinned Footer (Always visible at the bottom) */}
      <View className="px-6 bg-[#FFF8F0] pt-4 pb-4 border-t border-[#EBE7DF]">
        {/* Quote */}
        <View className="mb-4">
          <Text
            className="text-[#212842] text-center text-lg italic leading-snug"
            style={{ fontFamily: "Newsreader-Italic" }}
          >
            "A great book should leave you with many experiences, and slightly exhausted at the end. You live several lives while reading."
          </Text>
          <Text
            className="text-[#8E8B82] text-center text-[10px] uppercase tracking-widest mt-1"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            — William Styron
          </Text>
        </View>

        {/* Continue Journey Button */}
        <TouchableOpacity
          className="w-full bg-[#212842] rounded-full py-4 flex-row justify-center items-center"
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text
            className="text-[#FFFFFF] text-center text-lg mr-2"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            Follow My Guides
          </Text>
          <Text
            className="text-[#FFFFFF] text-lg font-bold"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            {" >"}
          </Text>
        </TouchableOpacity>

        {/* Skip option */}
        <TouchableOpacity
          className="mt-3 py-1"
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text
            className="text-[#5C5E69] text-center text-sm"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            I'll seek my mentors later
          </Text>
        </TouchableOpacity>

        {/* Horizontal Line with Logo Divider */}
        <View className="flex-row items-center w-full mt-4">
          <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
          <View className="mx-4">
            <Logo width={24} height={24} />
          </View>
          <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
        </View>

        {/* Step Counter & Animated Indicators */}
        <View className="flex-row justify-between items-center w-full mt-3">
          <Text
            className="text-xs text-[#8E8B82]"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            STEP 4 OF 6
          </Text>
          <View className="flex-row items-center">
            {/* Inactive Dots 1 and 2 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />

            {/* Animated Dot 3 (Step 3 Active -> Inactive) */}
            <Animated.View
              style={{
                width: dot3Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot3Color,
                marginHorizontal: 4,
              }}
            />

            {/* Animated Dot 4 (Step 4 Inactive -> Active) */}
            <Animated.View
              style={{
                width: dot4Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot4Color,
                marginHorizontal: 4,
              }}
            />

            {/* Inactive Dots 5 and 6 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}
