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
import BookCover from "../../components/BookCover";
import Logo from "../assets/LOGO.svg";
import Icon from "../../core/Icon";
import api from "../../store/api";
import { useAuthorFollowStore } from "../../store/useAuthorFollowStore";
import { useSignUpStore } from "../../store/useSignUpStore";

const BLACKLISTED_BOOK_TERMS = [
  "magazine",
  "periodical",
  "issue #",
  "journal of",
  "proceedings of",
  "bulletin",
  "pamphlet",
  "brochure",
  "catalogue",
  "catalog",
  "almanac",
  "directory",
  "summary of",
  "study guide",
  "sparknotes",
  "cliffnotes",
  "cliffsnotes",
  "workbook",
  "coloring book",
  "activity book",
  "box set",
  "boxset",
  "dictionary",
  "encyclopedia",
];

const INVALID_AUTHORS = new Set([
  "unknown author",
  "unknown",
  "anonymous",
  "various",
  "various authors",
  "editors",
  "magazine",
  "periodical",
  "n/a",
]);

function isRealBookItem(raw: any): boolean {
  if (!raw || !raw.title || typeof raw.title !== "string") return false;
  const titleLower = raw.title.trim().toLowerCase();
  if (!titleLower) return false;
  for (const term of BLACKLISTED_BOOK_TERMS) {
    if (titleLower.includes(term)) return false;
  }

  const cover = (raw.cover_image || raw.cover_url || raw.cover || "").trim();
  if (
    !cover ||
    !cover.startsWith("http") ||
    cover.toLowerCase().includes("placeholder") ||
    cover.toLowerCase().includes("no-cover") ||
    cover.toLowerCase().includes("default_avatar")
  ) {
    return false;
  }

  const authorsList: string[] = Array.isArray(raw.authors)
    ? raw.authors
    : raw.author
    ? [raw.author]
    : [];
  const validAuthors = authorsList
    .map((a) => String(a || "").trim())
    .filter((a) => a.length > 0 && !INVALID_AUTHORS.has(a.toLowerCase()));

  if (validAuthors.length === 0) return false;
  return true;
}

export default function SignInStep5Screen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  const favoriteGenres = useSignUpStore((state) => state.favorite_genres);
  const favoriteAuthors = useSignUpStore((state) => state.favorite_authors);
  const favoriteBooks = useSignUpStore((state) => state.favorite_books);
  const setFavoriteBooks = useSignUpStore((state) => state.setFavoriteBooks);
  const recordBookSignal = useAuthorFollowStore((state) => state.recordBookSignal);

  const [selectedBooks, setSelectedBooks] = useState<any[]>(favoriteBooks || []);

  const progressAnim = useRef(new Animated.Value(4 / 6)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 5 / 6,
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
      setIsAdvancedSearch(false);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Suggested books query (filtered to real books only)
  const { data: suggestedBooks = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["suggestedBooks", favoriteGenres, favoriteAuthors],
    queryFn: async () => {
      const response = await api.get("api/books/suggestions/", {
        params: {
          genres: favoriteGenres.join(","),
          authors: favoriteAuthors.join(","),
        },
      });
      const list = Array.isArray(response.data) ? response.data : [];
      return list
        .filter(isRealBookItem)
        .map((b: any) => ({
          id: String(b.id),
          title: b.title,
          author: Array.isArray(b.authors)
            ? b.authors.join(", ")
            : b.author || "Unknown Author",
          cover: b.cover_image || b.cover_url || "",
          rawBook: b,
        }));
    },
  });

  // Book search query (filtered to real books only)
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["booksSearch", debouncedQuery, isAdvancedSearch],
    queryFn: async () => {
      const response = await api.get("api/books/search/", {
        params: {
          q: debouncedQuery,
          ...(isAdvancedSearch ? { advanced: "true" } : {}),
        },
      });
      const list = Array.isArray(response.data) ? response.data : [];
      return list
        .filter(isRealBookItem)
        .map((b: any) => ({
          id: String(b.id),
          title: b.title,
          author: Array.isArray(b.authors)
            ? b.authors.join(", ")
            : b.author || "Unknown Author",
          cover: b.cover_image || b.cover_url || "",
          rawBook: b,
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
  const filteredBooks =
    searchQuery.trim().length > 0
      ? debouncedQuery
        ? searchResults
        : []
      : suggestedBooks;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const toggleBook = (book: any) => {
    if (selectedBooks.some((b) => b.id === book.id)) {
      setSelectedBooks(selectedBooks.filter((b) => b.id !== book.id));
    } else {
      setSelectedBooks([...selectedBooks, book]);
    }
  };

  const handleContinue = () => {
    if (typeof recordBookSignal === "function") {
      selectedBooks.forEach((b) => {
        recordBookSignal({
          bookId: b.id,
          title: b.title,
          authors: b.rawBook?.authors || [b.author],
          genres: b.rawBook?.genres || [],
          weight: 2,
        });
      });
    }
    setFavoriteBooks(selectedBooks);
    router.push("/(auth)/email");
  };

  const handleSkip = () => {
    setFavoriteBooks([]);
    router.push("/(auth)/email");
  };

  const count = selectedBooks.length;

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
                  Step 5 of 6
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
                  First Bookshelf
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
                    {count} saved
                  </Text>
                </View>
              </View>

              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[32px] text-[#212842] leading-[38px] mb-2"
              >
                Seed your{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  library
                </Text>
              </Text>

              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[14px] text-[#5A6075] leading-[21px] mb-5"
              >
                Pick books you love or want to read next. We'll add them straight to your Read Later shelf and use them to sharpen your recommendations.
              </Text>

              {/* Soft Borderless Search Bar */}
              <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-2.5">
                <Icon name="search" size={20} color="#76767E" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search any book title or author..."
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

            {/* Soft Borderless Skeleton Loader (matches DiscoverNext) vs Clean Books Grid */}
            {loading ? (
              <View className="flex-row flex-wrap justify-between">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <View
                    key={item}
                    style={{ width: "48%" }}
                    className="mb-6 flex-col"
                  >
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "100%",
                        height: 224,
                        backgroundColor: "#FAF3E8",
                      }}
                      className="rounded-xl mb-3"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "78%",
                        height: 16,
                        backgroundColor: "#FAF3E8",
                      }}
                      className="rounded mb-2"
                    />
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: "52%",
                        height: 12,
                        backgroundColor: "#FAF3E8",
                      }}
                      className="rounded"
                    />
                  </View>
                ))}
              </View>
            ) : filteredBooks.length === 0 ? (
              <View className="py-14 items-center justify-center bg-[#FAF3E8] rounded-2xl px-6">
                <Icon name="bookSearch" size={28} color="#94A3B8" />
                <Text
                  style={{ fontFamily: "Newsreader-Bold" }}
                  className="text-lg text-[#212842] mt-2 mb-1"
                >
                  No books found
                </Text>
                <Text
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="text-xs text-[#76767E] text-center mb-4"
                >
                  Try searching with another title or tap below for extended search.
                </Text>
                {searchQuery.trim().length > 0 && !isAdvancedSearch && (
                  <TouchableOpacity
                    onPress={() => setIsAdvancedSearch(true)}
                    activeOpacity={0.8}
                    className="px-4 py-2.5 rounded-full bg-[#212842] flex-row items-center"
                  >
                    <Icon name="search" size={14} color="#FFF8F0" />
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-xs text-[#FFF8F0] ml-1.5"
                    >
                      Try Extended Book Search
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredBooks.map((book: any) => {
                  const isSelected = selectedBooks.some((b) => b.id === book.id);
                  return (
                    <TouchableOpacity
                      key={book.id}
                      onPress={() => toggleBook(book)}
                      activeOpacity={0.85}
                      style={{ width: "48%" }}
                      className="mb-6 flex-col"
                    >
                      {/* Borderless Book Cover with Soft App Shadow */}
                      <View
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.1,
                          shadowRadius: 8,
                          elevation: 4,
                        }}
                        className="w-full h-56 rounded-xl overflow-hidden bg-[#FAF3E8] mb-2.5 relative"
                      >
                        <BookCover
                          uri={book.cover}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />

                        {isSelected && (
                          <View className="absolute inset-0 bg-[#212842]/20" />
                        )}

                        <View
                          className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full flex-row items-center ${
                            isSelected ? "bg-[#212842]" : "bg-[#FFF8F0]/90"
                          }`}
                        >
                          <Icon
                            name={isSelected ? "checkCircle" : "bookmarkAdd"}
                            size={12}
                            color={isSelected ? "#FFF8F0" : "#212842"}
                          />
                          <Text
                            style={{ fontFamily: "PublicSans-Bold" }}
                            className={`text-[10px] ml-1 ${
                              isSelected ? "text-[#FFF8F0]" : "text-[#212842]"
                            }`}
                          >
                            {isSelected ? "Saved" : "Save"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={{ fontFamily: "Newsreader-Bold" }}
                        className="text-base text-[#212842] leading-tight"
                        numberOfLines={1}
                      >
                        {book.title}
                      </Text>

                      <Text
                        style={{ fontFamily: "PublicSans-Regular" }}
                        className="text-xs text-[#76767E] mt-0.5"
                        numberOfLines={1}
                      >
                        {book.author}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {searchQuery.trim().length > 0 && !isAdvancedSearch && (
                  <TouchableOpacity
                    className="flex-row items-center justify-between bg-[#FAF3E8] py-4 px-4 rounded-2xl mt-2 w-full"
                    onPress={() => setIsAdvancedSearch(true)}
                    activeOpacity={0.8}
                  >
                    <View className="w-9 h-9 rounded-full bg-[#212842]/10 items-center justify-center mr-3">
                      <Icon name="search" size={18} color="#212842" />
                    </View>
                    <View className="flex-1 mr-2">
                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className="text-[#212842] text-sm"
                      >
                        Can't find the book you're looking for?
                      </Text>
                      <Text
                        style={{ fontFamily: "PublicSans-Regular" }}
                        className="text-[#76767E] text-xs mt-0.5"
                      >
                        Tap to search the extended global catalog.
                      </Text>
                    </View>
                    <Icon name="chevronRight" size={18} color="#212842" />
                  </TouchableOpacity>
                )}
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
                  ? `Continue with ${count} ${count === 1 ? "Book" : "Books"}`
                  : "Continue to Final Step"}
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
                I'll add books to my library later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
