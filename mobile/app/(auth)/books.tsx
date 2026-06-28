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

export default function SignInStep5Screen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [suggestedBooks, setSuggestedBooks] = useState<{ id: string; title: string; author: string; cover: string }[]>([]);
  const [books, setBooks] = useState<{ id: string; title: string; author: string; cover: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const favoriteAuthors = useSignUpStore((state) => state.favorite_authors);
  const setFavoriteBooks = useSignUpStore((state) => state.setFavoriteBooks);

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

    // Fetch recommended books based on genres and authors
    const fetchSuggestedBooks = async () => {
      setLoading(true);
      try {
        const response = await api.get("api/books/suggestions/", {
          params: { 
            genres: favoriteGenres.join(","),
            authors: favoriteAuthors.join(",")
          }
        });
        const mapped = response.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.authors.join(", "),
          cover: b.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop",
        }));
        setSuggestedBooks(mapped);
        setBooks(mapped);
      } catch (error) {
        console.error("Error fetching book suggestions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestedBooks();
  }, [favoriteGenres, favoriteAuthors]);

  // Debounced search trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setBooks(suggestedBooks);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get("api/books/search/", {
          params: { q: searchQuery }
        });
        const mapped = response.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.authors.join(", "),
          cover: b.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop",
        }));
        setBooks(mapped);
      } catch (error) {
        console.error("Error searching books:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, suggestedBooks]);

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

  const toggleSelectBook = (id: string) => {
    if (selectedBooks.includes(id)) {
      setSelectedBooks(selectedBooks.filter((b) => b !== id));
    } else {
      setSelectedBooks([...selectedBooks, id]);
    }
  };

  const handleContinue = () => {
    // Save to Zustand and navigate to Step 6
    setFavoriteBooks(selectedBooks);
    router.push("/(auth)/email");
  };

  const filteredBooks = books;

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
        {loading ? (
          <View className="py-20 w-full justify-center items-center">
            <ActivityIndicator size="large" color="#212842" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between w-full mb-6">
            {filteredBooks.map((book) => {
              const isSelected = selectedBooks.includes(book.id);
              return (
                <TouchableOpacity
                  key={book.id}
                  onPress={() => toggleSelectBook(book.id)}
                  className="w-[47%] mb-6"
                  activeOpacity={0.8}
                >
                  {/* Book Cover Container */}
                  <View
                    className={`w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#FAF3E8] relative shadow-md border-2 ${
                      isSelected ? "border-[#212842]" : "border-transparent"
                    }`}
                  >
                    <Image
                      source={{ uri: book.cover }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />

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
