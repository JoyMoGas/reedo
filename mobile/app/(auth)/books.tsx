/**
 * @project Reedo
 * @module books
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import BookCover from "../../components/BookCover";
import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
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
import NoCover from "../assets/NoCover.svg";

export default function SignInStep5Screen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const favoriteAuthors = useSignUpStore((state) => state.favorite_authors);
  const favoriteBooks = useSignUpStore((state) => state.favorite_books);
  const setFavoriteBooks = useSignUpStore((state) => state.setFavoriteBooks);
  
  const [selectedBooks, setSelectedBooks] = useState<any[]>(favoriteBooks);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
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
  }, []);

  // Animated values
  const progressAnim = useRef(new Animated.Value(4 / 6)).current;
  const dotTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top progress bar animation: from 4/6 (step 4) to 5/6 (step 5)
    Animated.timing(progressAnim, {
      toValue: 5 / 6,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bottom dots animation: transitioning active pill from dot 4 to dot 5
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
      setIsAdvancedSearch(false);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch suggested books reactively using react-query
  const { data: suggestedBooks = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["suggestedBooks", favoriteGenres, favoriteAuthors],
    queryFn: async () => {
      const response = await api.get("api/books/suggestions/", {
        params: { 
          genres: favoriteGenres.join(","),
          authors: favoriteAuthors.join(",")
        }
      });
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors.join(", "),
        cover: b.cover_image || "",
      }));
    },
  });

  // Book search query
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["booksSearch", debouncedQuery, isAdvancedSearch],
    queryFn: async () => {
      const response = await api.get("api/books/search/", {
        params: { 
          q: debouncedQuery,
          ...(isAdvancedSearch ? { advanced: "true" } : {})
        }
      });
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors.join(", "),
        cover: b.cover_image || "",
        rawBook: b,
      }));
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const handleAdvancedSearch = () => {
    setIsAdvancedSearch(true);
  };

  const loading = searchQuery.trim().length > 0 ? (debouncedQuery ? searchLoading : true) : suggestionsLoading;
  const filteredBooks = searchQuery.trim().length > 0 ? (debouncedQuery ? searchResults : []) : suggestedBooks;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const dot4Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 8],
  });

  const dot5Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const dot4Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#212842", "#EBE7DF"],
  });

  const dot5Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EBE7DF", "#212842"],
  });

  const toggleSelectBook = (book: any) => {
    if (selectedBooks.some((b) => b.id === book.id)) {
      setSelectedBooks(selectedBooks.filter((b) => b.id !== book.id));
    } else {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const handleContinue = () => {
    // Save to Zustand and navigate to Step 6
    setFavoriteBooks(selectedBooks);
    router.push("/(auth)/email");
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
          What are you{"\n"}reading right{"\n"}now?
        </Text>
        <Text
          className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Sharing your current literary journey helps us curate an editorial experience that resonates with your specific tastes and intellectual curiosity.
        </Text>

        {/* Search Bar Input */}
        <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-3 mt-6 mb-6">
          <Text className="text-[#8E8B82] mr-2 text-base">🔍</Text>
          <TextInput
            className="flex-1 text-base text-[#212842]"
            style={{ fontFamily: "PublicSans-Regular" }}
            placeholder="Search by title, author, or ISBN..."
            placeholderTextColor="#C5C2BA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Grid Layout of Book Cards */}
        {searchQuery.trim().length > 0 && (
          <View className="flex-row justify-between items-center w-full mb-4">
            <Text 
              className="text-xs font-bold text-[#76767E] tracking-widest"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              SEARCH RESULTS
            </Text>
            {isAdvancedSearch && (
              <View className="bg-[#FAF3E8] border border-[#212842] px-2.5 py-1 rounded-full">
                <Text className="text-[#212842] text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: "PublicSans-Bold" }}>
                  Hardcover
                </Text>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <View className="flex-row flex-wrap justify-between w-full mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className="w-[47%] mb-6">
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    aspectRatio: 2/3,
                    backgroundColor: "#FAF3E8",
                  }}
                  className="w-full rounded-2xl"
                />
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    height: 16,
                    width: "80%",
                    backgroundColor: "#FAF3E8",
                  }}
                  className="rounded mt-2"
                />
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    height: 12,
                    width: "50%",
                    backgroundColor: "#FAF3E8",
                  }}
                  className="rounded mt-1"
                />
              </View>
            ))}
          </View>
        ) : searchQuery.trim().length > 0 && filteredBooks.length === 0 ? (
          <View className="py-12 items-center justify-center w-full">
            <Text className="text-3xl mb-2">🔍</Text>
            <Text
              className="text-[#212842] text-center text-lg font-bold mb-1"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              No books found
            </Text>
            <Text
              className="text-[#76767E] text-center text-sm mt-1 mb-6 px-4"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Try searching for another title, author, or ISBN.
            </Text>
            {!isAdvancedSearch && (
              <TouchableOpacity
                className="flex-row items-center justify-center bg-[#212842] py-2.5 px-5 rounded-full"
                onPress={handleAdvancedSearch}
                activeOpacity={0.8}
              >
                <Text className="text-[#FAF3E8] mr-1.5 text-xs">🔍</Text>
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-white text-xs"
                >
                  Advanced Search
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between w-full mb-6">
            {filteredBooks.map((book: any) => {
              const isSelected = selectedBooks.some((b) => b.id === book.id);
              return (
                <TouchableOpacity
                  key={book.id}
                  onPress={() => toggleSelectBook(book)}
                  className="w-[47%] mb-6"
                  activeOpacity={0.8}
                >
                  {/* Book Cover Container */}
                  <View
                    className={`w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#FAF3E8] relative shadow-md border-2 ${
                      isSelected ? "border-[#212842]" : "border-transparent"
                    }`}
                  >
                    {book.cover ? (
                      <BookCover
                        uri={book.cover }
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <NoCover width="100%" height="100%" />
                    )}

                    {/* Top-Right Checkbox Badge for Selected State */}
                    {isSelected && (
                      <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#212842] items-center justify-center shadow shadow-black">
                        <Text className="text-[#FFF8F0] text-[10px] font-bold">✓</Text>
                      </View>
                    )}
                  </View>

                  {/* Title */}
                  <Text
                    className="text-[#212842] text-sm leading-tight mt-1"
                    style={{ fontFamily: "PublicSans-Bold" }}
                    numberOfLines={2}
                  >
                    {book.title}
                  </Text>

                  {/* Author */}
                  <Text
                    className="text-[10px] text-[#8E8B82] mt-0.5 uppercase"
                    style={{ fontFamily: "PublicSans-Regular" }}
                    numberOfLines={1}
                  >
                    {book.author}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {searchQuery.trim().length > 0 && !isAdvancedSearch && (
              <TouchableOpacity
                className="flex-row items-center justify-center bg-[#FAF3E8] border border-dashed border-[#212842] py-4 px-4 rounded-xl mt-2 w-full"
                onPress={handleAdvancedSearch}
                activeOpacity={0.8}
              >
                <Text className="text-[#212842] mr-2 text-base">🔍</Text>
                <View className="ml-1 flex-1">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-[#212842] text-sm"
                  >
                    Can't find the book you are looking for?
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[#76767E] text-xs mt-0.5"
                  >
                    Try Advanced Search on Hardcover.
                  </Text>
                </View>
                <Text className="text-[#212842] text-base font-bold">&gt;</Text>
              </TouchableOpacity>
            )}
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
            Bookmark My Current Reads
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
            My current chapter is a mystery for now
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
            STEP 5 OF 6
          </Text>
          <View className="flex-row items-center">
            {/* Inactive Dots 1, 2, 3 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />

            {/* Animated Dot 4 (Step 4 Active -> Inactive) */}
            <Animated.View
              style={{
                width: dot4Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot4Color,
                marginHorizontal: 4,
              }}
            />

            {/* Animated Dot 5 (Step 5 Inactive -> Active) */}
            <Animated.View
              style={{
                width: dot5Width,
                height: 8,
                borderRadius: 4,
                backgroundColor: dot5Color,
                marginHorizontal: 4,
              }}
            />

            {/* Inactive Dot 6 */}
            <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}
