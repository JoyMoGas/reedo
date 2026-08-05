import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import api from "../../store/api";
import { useSignUpStore } from "../../store/useSignUpStore";
import { useQuery } from "@tanstack/react-query";

const genreSymbols: { [key: string]: string } = {
  "fiction": "📖",
  "fantasy": "✨",
  "science": "🚀",
  "computers": "💻",
  "history": "🏛️",
  "biography": "👤",
  "mystery": "🔍",
  "poetry": "✒️",
  "business": "💼",
  "self-help": "🧠",
  "romance": "💖",
  "classic": "📚",
};

const getSymbol = (name: string) => {
  const norm = name.toLowerCase();
  for (const key in genreSymbols) {
    if (norm.includes(key)) {
      return genreSymbols[key];
    }
  }
  return "📚";
};

export default function SignInStep3Screen() {
  const router = useRouter();
  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const setFavoriteGenres = useSignUpStore((state) => state.setFavoriteGenres);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(favoriteGenres);

  const { data: genres = [], isLoading: loading } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const response = await api.get("api/books/genres/");
      return response.data.map((g: any) => ({
        id: g.id,
        name: g.genre,
        symbol: getSymbol(g.genre)
      }));
    }
  });

  // Animated values
  const progressAnim = useRef(new Animated.Value(2 / 6)).current;
  const dotTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top progress bar animation: from 2/6 (step 2) to 3/6 (step 3)
    Animated.timing(progressAnim, {
      toValue: 3 / 6,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bottom dots animation: transitioning active pill from dot 2 to dot 3
    Animated.timing(dotTransition, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  // Pre-select some genres once loaded, only if we don't have any selected yet
  useEffect(() => {
    if (genres.length > 0 && selectedGenres.length === 0) {
      const preselected = genres
        .filter((g: any) => 
          g.name.toLowerCase().includes("fiction") || 
          g.name.toLowerCase().includes("fantasy") || 
          g.name.toLowerCase().includes("history") ||
          g.name.toLowerCase().includes("science")
        )
        .map((g: any) => g.id);
      setSelectedGenres(preselected.slice(0, 3));
    }
  }, [genres]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const dot2Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 8],
  });

  const dot3Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const dot2Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#212842", "#EBE7DF"],
  });

  const dot3Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EBE7DF", "#212842"],
  });

  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== id));
    } else {
      setSelectedGenres([...selectedGenres, id]);
    }
  };

  const handleContinue = () => {
    // Guardar en el store y avanzar a autores
    setFavoriteGenres(selectedGenres);
    router.push("/(auth)/authors");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">

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
          Your Literary{"\n"}Landscape
        </Text>
        <Text
          className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Select at least three to curate your first private collection. This will define the initial textures of your personal archive.
        </Text>

        {/* Grid Layout of Genre Cards */}
        {loading ? (
          <View className="py-20 justify-center items-center">
            <ActivityIndicator size="large" color="#212842" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between w-full mt-8">
            {genres.map((genre: any) => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <TouchableOpacity
                  key={genre.id}
                  onPress={() => toggleGenre(genre.id)}
                  className={`w-[47%] h-36 rounded-2xl mb-4 items-center justify-center relative border-2 ${
                    isSelected
                      ? "bg-[#FFF8F0] border-[#212842]"
                      : "bg-[#FAF3E8] border-transparent"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className="text-3xl mb-3">{genre.symbol}</Text>
                  <Text
                    className="text-[#212842] text-center text-lg"
                    style={{ fontFamily: "Newsreader-Bold" }}
                  >
                    {genre.name}
                  </Text>

                  {/* Checkbox Badge */}
                  {isSelected && (
                    <View className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#212842] items-center justify-center">
                      <Text className="text-[#FFF8F0] text-[10px] font-bold">✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
            className="text-[#212842] text-center text-xl italic leading-snug"
            style={{ fontFamily: "Newsreader-Italic" }}
          >
            "A library is not a luxury but one of the necessities of life."
          </Text>
          <Text
            className="text-[#8E8B82] text-center text-[10px] uppercase tracking-widest mt-1"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            — Henry Ward Beecher
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
            Define My Taste
          </Text>
          <Text
            className="text-[#FFFFFF] text-lg font-bold"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            {" >"}
          </Text>
        </TouchableOpacity>

        {/* Skip / Random option */}
        <TouchableOpacity
          className="mt-3 py-1"
          onPress={handleContinue}
          activeOpacity={0.7}
        >
          <Text
            className="text-[#5C5E69] text-center text-sm"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            Surprise me with any landscape
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
            STEP 3 OF 6
          </Text>
          <View className="flex-row items-center">
            {/* Inactive Dot 1 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />

            {/* Animated Dot 2 (Step 2 Active -> Inactive) */}
            <Animated.View
              style={{
                width: dot2Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot2Color,
                marginHorizontal: 4,
              }}
            />

            {/* Animated Dot 3 (Step 3 Inactive -> Active) */}
            <Animated.View
              style={{
                width: dot3Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot3Color,
                marginHorizontal: 4,
              }}
            />

            {/* Inactive Dots for Steps 4 to 6 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
