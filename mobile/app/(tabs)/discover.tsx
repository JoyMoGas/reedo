import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Animated,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";
import Icon from "../../core/Icon";
import api from "../../store/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NoCover from "../assets/NoCover.svg";
import { Avatar } from "../../components/Avatar";
import { useRouter } from "expo-router";
import BookCard from "../../components/BookCard";

interface TrendingBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  rawBook?: any;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterValue, setFilterValue] = useState("All Collections");
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Retrieve user books reactively using react-query
  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const savedBookIds = React.useMemo(() => {
    return new Set<string>(userBooksData.map((ub: any) => ub.book_id));
  }, [userBooksData]);

  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  const carouselRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

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

  useEffect(() => {
    setNavbarVisible(true);
  }, []);

  // Debounce logic for search query
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

  // Fetch trending books reactively using react-query
  const { data: books = [], isLoading: loading, refetch: refetchTrending } = useQuery({
    queryKey: ["trendingBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/trending/");
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors.join(", "),
        cover: b.cover_image || "",
      }));
    }
  });

  // Fetch search results reactively using react-query
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

  const toggleConnect = (userId: string) => {
    setConnectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Fetch recommended fellow readers reactively using react-query
  const { data: recommendedReaders = [] } = useQuery({
    queryKey: ["recommendedReaders"],
    queryFn: async () => {
      const response = await api.get("api/users/suggestions/");
      return response.data;
    }
  });

  // Fetch newly arrived books reactively using react-query
  const { data: newlyArrivedBooks = [], isLoading: newlyArrivedLoading } = useQuery({
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

  // Fetch hidden gems reactively using react-query
  const { data: hiddenGemsBooks = [], isLoading: hiddenGemsLoading } = useQuery({
    queryKey: ["hiddenGemsBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/hidden-gems/");
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors ? b.authors.join(", ") : "Unknown Author",
        cover: b.cover_image || "",
        publishedDate: b.published_date,
      }));
    }
  });

  // Fetch author spotlight reactively using react-query
  const { data: authorSpotlight = [] } = useQuery({
    queryKey: ["authorSpotlight"],
    queryFn: async () => {
      const response = await api.get("api/books/author-spotlight/");
      return response.data;
    }
  });

  // Fetch based on history books reactively using react-query
  const { data: basedOnHistory } = useQuery({
    queryKey: ["basedOnHistory"],
    queryFn: async () => {
      const response = await api.get("api/books/based-on-history/");
      return response.data;
    }
  });

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

  const updateScrollState = () => {
    const contentWidth = contentWidthRef.current;
    const layoutWidth = layoutWidthRef.current;
    const scrollX = scrollXRef.current;

    const canScroll = contentWidth > layoutWidth;
    const isAtStart = scrollX <= 5;
    const isAtEnd = scrollX + layoutWidth >= contentWidth - 5;

    setCanScrollLeft(canScroll && !isAtStart);
    setCanScrollRight(canScroll && !isAtEnd);
  };

  const handleCarouselScroll = (event: any) => {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
    layoutWidthRef.current = event.nativeEvent.layoutMeasurement.width;
    contentWidthRef.current = event.nativeEvent.contentSize.width;
    updateScrollState();
  };

  const handleContentSizeChange = (w: number, h: number) => {
    contentWidthRef.current = w;
    updateScrollState();
  };

  const handleLayout = (event: any) => {
    layoutWidthRef.current = event.nativeEvent.layout.width;
    updateScrollState();
  };

  const handlePrevPress = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        x: Math.max(0, scrollXRef.current - 288),
        animated: true,
      });
    }
  };

  const handleNextPress = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        x: scrollXRef.current + 288,
        animated: true,
      });
    }
  };

  const handleAddToLibrary = async (book: TrendingBook) => {
    try {
      const raw = book.rawBook;
      await api.post("api/books/userbook/", {
        book_id: book.id,
        status: "READ_LATER",
        title: raw?.title || book.title,
        authors: raw?.authors || [book.author],
        cover_image: raw?.cover_image || book.cover,
        synopsis: raw?.synopsis,
        total_pages: raw?.total_pages,
        isbn: raw?.isbn,
        average_rating: raw?.average_rating,
        genres: raw?.genres
      });
      
      // Invalidate cache immediately after adding
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });

      Alert.alert(
        "Book Added",
        "Would you like to add this book to your 'Currently Reading' list?",
        [
          {
            text: "No, read later",
            style: "cancel"
          },
          {
            text: "Yes, start reading",
            onPress: async () => {
              try {
                await api.post("api/books/userbook/", {
                  book_id: book.id,
                  status: "CURRENTLY_READING"
                });
                // Invalidate cache again for status update
                queryClient.invalidateQueries({ queryKey: ["userBooks"] });
              } catch (err) {
                console.error("Error setting status to Currently Reading:", err);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error saving book to library:", error);
    }
  };

  const handleRemoveFromLibrary = async (bookId: string) => {
    try {
      await api.delete("api/books/userbook/", {
        data: { book_id: bookId }
      });
      // Invalidate cache to reflect changes immediately
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
    } catch (error) {
      console.error("Error removing book from library:", error);
    }
  };

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const diff = currentOffset - lastScrollY.current;

    if (Math.abs(diff) > scrollThreshold) {
      if (currentOffset <= 0) {
        setNavbarVisible(true);
      } else if (diff > 0) {
        setNavbarVisible(false);
      } else {
        setNavbarVisible(true);
      }
      lastScrollY.current = currentOffset;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refetchTrending().finally(() => {
      setRefreshing(false);
    });
  };



  return (
    <SafeAreaView
      edges={["left", "right"]}
      className="flex-1 bg-[#FFF8F0]"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 60 + 16,
          paddingBottom: insets.bottom + 86 + 40,
        }}
        scrollIndicatorInsets={{
          top: insets.top + 60,
          bottom: insets.bottom + 86,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#212842"]}
            tintColor="#212842"
            progressViewOffset={refreshing ? insets.top + 10 : insets.top + 30}
          />
        }
      >
        {refreshing && <View style={{ height: 30 }} />}

        {/* Search Bar */}
        <View className="flex-col items-center justify-center w-full">
          <View className="flex-row items-center w-full bg-[#FAF3E8] rounded-full px-4 py-3 mt-6 mb-6">
            <Icon name="search" size={26} color="#76767E" />
            <TextInput
              className="flex-1 text-base text-[#212842] ml-2"
              style={{ fontFamily: "PublicSans-Regular" }}
              placeholder="Find your next thought..."
              placeholderTextColor="#C5C2BA"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
                <Icon name="cancel" size={20} color="#76767E" />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim().length > 0 ? (
            /* Search Results View */
            <View className="w-full">
              <View className="flex-row justify-between items-center w-full mb-4">
                <Text 
                  className="text-xl font-bold text-[#76767E] tracking-widest"
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
              
              {searchLoading ? (
                <View className="w-full flex-col gap-5 mt-2 mb-8">
                  {[1, 2, 3].map((i) => (
                    <View 
                      key={i} 
                      className="flex-row items-center w-full bg-[#FCF3E0] rounded-xl p-4"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3.84,
                        elevation: 2,
                      }}
                    >
                      <Animated.View
                        style={{
                          opacity: pulseAnim,
                          width: 70,
                          height: 105,
                          backgroundColor: "#FAF3E8",
                        }}
                        className="rounded-lg"
                      />
                      <View className="flex-1 ml-4 justify-center pr-2">
                        <Animated.View
                          style={{
                            opacity: pulseAnim,
                            height: 18,
                            width: "70%",
                            backgroundColor: "#FAF3E8",
                          }}
                          className="rounded mb-2"
                        />
                        <Animated.View
                          style={{
                            opacity: pulseAnim,
                            height: 14,
                            width: "40%",
                            backgroundColor: "#FAF3E8",
                          }}
                          className="rounded"
                        />
                      </View>
                      <Animated.View
                        style={{
                          opacity: pulseAnim,
                          width: 80,
                          height: 34,
                          backgroundColor: "#FAF3E8",
                        }}
                        className="rounded-full"
                      />
                    </View>
                  ))}
                </View>
              ) : searchResults.length === 0 ? (
                <View className="py-20 items-center justify-center w-full">
                  <Text className="text-3xl mb-2">🔍</Text>
                  <Text
                    className="text-[#212842] text-center text-lg font-bold mb-1"
                    style={{ fontFamily: "Newsreader-Bold" }}
                  >
                    No books found
                  </Text>
                  <Text
                    className="text-[#76767E] text-center text-sm mt-1 mb-6"
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
                      <Icon name="search" size={18} color="white" />
                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className="text-white text-xs pl-1.5"
                      >
                        Advanced Search
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View className="w-full flex-col gap-5 mt-2 mb-8">
                  {searchResults.map((book: any) => (
                    <View 
                      key={book.id} 
                      className="flex-row items-center w-full bg-[#FCF3E0] rounded-xl p-4"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3.84,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                        className="rounded-lg overflow-hidden"
                      >
                        {book.cover ? (
                          <Image
                            source={{ uri: book.cover }}
                            style={{ width: 70, height: 105 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <NoCover width={70} height={105} />
                        )}
                      </View>

                      <View className="flex-1 ml-4 justify-center pr-2">
                        <Text
                          numberOfLines={2}
                          className="text-lg font-bold text-[#212842]"
                          style={{ fontFamily: "PublicSans-Bold" }}
                        >
                          {book.title}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="text-sm text-[#625E52] mt-1"
                          style={{ fontFamily: "PublicSans-Italic" }}
                        >
                          by {book.author}
                        </Text>
                      </View>

                      <View className="justify-center">
                        {savedBookIds.has(book.id) ? (
                          <TouchableOpacity
                            className="flex-row items-center justify-center bg-[#FAF3E8] border border-[#212842] py-2 px-3.5 rounded-full"
                            onPress={() => handleRemoveFromLibrary(book.id)}
                            activeOpacity={0.8}
                          >
                            <Icon name="checkCircle" size={18} color="#212842" />
                            <Text
                              style={{ fontFamily: "PublicSans-Bold" }}
                              className="text-[#212842] text-xs pl-1.5"
                            >
                              In Library
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            className="flex-row items-center justify-center bg-[#212842] py-2 px-3.5 rounded-full"
                            onPress={() => handleAddToLibrary(book)}
                            activeOpacity={0.8}
                          >
                            <Icon name="libraryOutline" size={18} color="white" />
                            <Text
                              style={{ fontFamily: "PublicSans-Bold" }}
                              className="text-white text-xs pl-1.5"
                            >
                              Add
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}

                  {!isAdvancedSearch && (
                    <TouchableOpacity
                      className="flex-row items-center justify-center bg-[#FAF3E8] border border-dashed border-[#212842] py-4 px-4 rounded-xl mt-2"
                      onPress={handleAdvancedSearch}
                      activeOpacity={0.8}
                    >
                      <Icon name="search" size={22} color="#212842" />
                      <View className="ml-3 flex-1">
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
                      <Icon name="chevronRight" size={20} color="#212842" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            /* Discover Home Screen View */
            <>
              {/* The Weekly Top 10 */}
              <View className="w-full mt-4 mb-6">
                <View className="flex-row justify-between items-center w-full mb-4">
                  <View className="flex-col">
                    <Text className="text-xl font-bold text-[#76767E] tracking-widest"
                      style={{ fontFamily: "PublicSans-Bold" }}>
                      THE WEEKLY TOP 10
                    </Text>
                    <Text className="text-xs text-[#8E8B82] uppercase mt-0.5"
                      style={{ fontFamily: "PublicSans-Regular" }}>
                      Most cataloged and debated pages this week
                    </Text>
                  </View>
                  <View className="flex-row gap-4">
                    <TouchableOpacity 
                      className="p-1" 
                      onPress={handlePrevPress}
                      disabled={!canScrollLeft}
                    >
                      <Icon 
                        name="chevronLeft" 
                        size={24} 
                        color={canScrollLeft ? "#76767E" : "#D2CFC7"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-1" 
                      onPress={handleNextPress}
                      disabled={!canScrollRight}
                    >
                      <Icon 
                        name="chevronRight" 
                        size={24} 
                        color={canScrollRight ? "#76767E" : "#D2CFC7"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {loading ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={{ flexDirection: "row", width: 175, height: 195, position: "relative" }} className="mr-4">
                        {/* Skeleton Number */}
                        <Animated.View
                          style={{
                            opacity: pulseAnim,
                            width: 50,
                            height: 100,
                            backgroundColor: "#FAF3E8",
                            borderRadius: 10,
                            position: "absolute",
                            left: 5,
                            bottom: 10,
                          }}
                        />
                        {/* Skeleton Cover */}
                        <Animated.View
                          style={{
                            opacity: pulseAnim,
                            width: 110,
                            height: 165,
                            backgroundColor: "#FAF3E8",
                            position: "absolute",
                            left: 55,
                            top: 5,
                          }}
                          className="rounded-xl"
                        />
                      </View>
                    ))}
                  </ScrollView>
                ) : books.length === 0 ? (
                  <View className="w-full bg-[#FCF3E0] rounded-xl p-6 items-center justify-center border border-dashed border-[#8E8B82] mt-4">
                    <Text className="text-3xl mb-2">📚</Text>
                    <Text
                      className="text-[#212842] text-center text-lg font-bold mb-1"
                      style={{ fontFamily: "Newsreader-Bold" }}
                    >
                      No trending books yet
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    ref={carouselRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="w-full"
                    onScroll={handleCarouselScroll}
                    scrollEventThrottle={16}
                    onContentSizeChange={handleContentSizeChange}
                    onLayout={handleLayout}
                    contentContainerStyle={{ paddingVertical: 10, paddingRight: 20 }}
                  >
                    {books.map((book: any, index: number) => (
                      <View key={book.id} style={{ flexDirection: "row", width: 175, height: 195, position: "relative" }}>
                        {/* Huge outline-style serif number */}
                        <Text
                          style={{
                            fontFamily: "Newsreader-Italic",
                            fontSize: 120,
                            color: "#FFF8F0",
                            textShadowColor: "#212842",
                            textShadowOffset: { width: 1.5, height: 1.5 },
                            textShadowRadius: 3,
                            position: "absolute",
                            left: 0,
                            bottom: -20,
                            zIndex: 1,
                          }}
                        >
                          {index + 1}
                        </Text>

                        {/* Overlapping Book Cover Card */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={{
                            position: "absolute",
                            left: 55,
                            top: 5,
                            zIndex: 10,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.18,
                            shadowRadius: 8,
                            elevation: 5,
                          }}
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
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Newly Arrived */}
              <View className="w-full mt-6 mb-6">
                <View className="flex-row justify-between items-center w-full mb-4">
                  <Text className="text-xl font-bold text-[#76767E] tracking-widest"
                    style={{ fontFamily: "PublicSans-Bold" }}>
                    NEWLY ARRIVED
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push("/newly-arrived")}
                    className="flex-row items-center gap-1"
                  >
                    <Text
                      className="text-xs font-bold text-[#212842] uppercase tracking-wider"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      See All
                    </Text>
                    <Icon name="chevronRight" size={16} color="#212842" />
                  </TouchableOpacity>
                </View>

                {newlyArrivedLoading ? (
                  <View className="flex-col gap-6">
                    {[1, 2, 3].map((i) => (
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
                ) : (
                  <View className="flex-col gap-6">
                    {newlyArrivedBooks.slice(0, 4).map((book: any) => (
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
              </View>

              {/* The Hidden Gems */}
              <View className="w-full mt-4 mb-8">
                <View
                  style={{
                    backgroundColor: "#212842",
                    borderRadius: 24,
                    padding: 24,
                    overflow: "hidden",
                    shadowColor: "#212842",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                  className="w-full flex-col justify-between"
                >
                  <Text
                    className="text-3xl font-bold text-[#FFF8F0] mb-3 leading-tight"
                    style={{ fontFamily: "Newsreader-Bold" }}
                  >
                    The Hidden Gems
                  </Text>
                  <Text
                    className="text-sm text-[#D2CFC7] mb-6 leading-relaxed"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    Discover masterpieces that have quietly shaped the literary landscape, curated by our senior editors and historians.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push("/hidden-gems")}
                    style={{ backgroundColor: "#FAF3E8", alignSelf: "flex-start" }}
                    className="rounded-full py-3.5 px-6 items-center justify-center"
                  >
                    <Text
                      className="text-xs font-bold text-[#212842] uppercase tracking-wider"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      EXPLORE ARCHIVE
                    </Text>
                  </TouchableOpacity>

                  {/* Overlapping Book Covers */}
                  <View className="flex-row justify-center items-center mt-8 mb-2 w-full">
                    {hiddenGemsLoading ? (
                      <View className="flex-row gap-4 items-center justify-center">
                        <Animated.View
                          style={{ opacity: pulseAnim, width: 115, height: 170, transform: [{ rotate: "-6deg" }], backgroundColor: "#323B5C" }}
                          className="rounded-xl"
                        />
                        <Animated.View
                          style={{ opacity: pulseAnim, width: 115, height: 170, transform: [{ rotate: "4deg" }], backgroundColor: "#323B5C" }}
                          className="rounded-xl"
                        />
                      </View>
                    ) : (
                      <View className="flex-row items-center justify-center" style={{ width: "100%", height: 180 }}>
                        {/* Left Book Cover */}
                        {hiddenGemsBooks[0] && (
                          <View
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: -4, height: 8 },
                              shadowOpacity: 0.35,
                              shadowRadius: 10,
                              elevation: 8,
                              transform: [{ rotate: "-7deg" }, { translateX: 10 }, { translateY: 4 }],
                              zIndex: 1,
                            }}
                            className="rounded-xl overflow-hidden bg-[#FCF3E0]"
                          >
                            {hiddenGemsBooks[0].cover ? (
                              <Image
                                source={{ uri: hiddenGemsBooks[0].cover }}
                                style={{ width: 115, height: 170 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <NoCover width={115} height={170} />
                            )}
                          </View>
                        )}

                        {/* Right Book Cover */}
                        {hiddenGemsBooks[1] ? (
                          <View
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: 4, height: 8 },
                              shadowOpacity: 0.35,
                              shadowRadius: 10,
                              elevation: 8,
                              transform: [{ rotate: "5deg" }, { translateX: -10 }, { translateY: -4 }],
                              zIndex: 2,
                            }}
                            className="rounded-xl overflow-hidden bg-[#FCF3E0]"
                          >
                            {hiddenGemsBooks[1].cover ? (
                              <Image
                                source={{ uri: hiddenGemsBooks[1].cover }}
                                style={{ width: 115, height: 170 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <NoCover width={115} height={170} />
                            )}
                          </View>
                        ) : hiddenGemsBooks[0] ? (
                          <View
                            style={{
                              shadowColor: "#000",
                              shadowOffset: { width: 4, height: 8 },
                              shadowOpacity: 0.35,
                              shadowRadius: 10,
                              elevation: 8,
                              transform: [{ rotate: "5deg" }, { translateX: -10 }, { translateY: -4 }],
                              zIndex: 2,
                            }}
                            className="rounded-xl overflow-hidden bg-[#FCF3E0]"
                          >
                            <NoCover width={115} height={170} />
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Author Spotlight */}
              {authorSpotlight && authorSpotlight.length > 0 && (
                <View className="w-full mt-4 mb-6">
                  <Text
                    className="text-xl font-bold text-[#76767E] tracking-widest mb-3"
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    AUTHOR SPOTLIGHT
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="w-full"
                    contentContainerStyle={{ paddingVertical: 4, gap: 16 }}
                  >
                    {authorSpotlight.map((author: any) => (
                      <View
                        key={author.id}
                        style={{
                          width: 320,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 24,
                          padding: 22,
                          borderColor: "#EBE7DF",
                          borderWidth: 1,
                          shadowColor: "#212842",
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.08,
                          shadowRadius: 12,
                          elevation: 4,
                        }}
                        className="flex-col justify-between"
                      >
                        <View>
                          <Text
                            className="text-2xl font-bold text-[#212842] mb-1 leading-tight"
                            style={{ fontFamily: "Newsreader-Bold" }}
                          >
                            {author.headline || "Master of Storytelling"}
                          </Text>
                          <Text
                            className="text-xs text-[#76767E] mb-5"
                            style={{ fontFamily: "PublicSans-Italic" }}
                          >
                            {author.reason || "Recommended for you"}
                          </Text>

                          <View className="flex-row items-center gap-4">
                            {/* Left: Initials Circle instead of image */}
                            <View
                              style={{
                                width: 95,
                                height: 95,
                                borderRadius: 48,
                                backgroundColor: "#FAF3E8",
                                borderColor: "#EBE7DF",
                                borderWidth: 1,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.06,
                                shadowRadius: 4,
                                elevation: 2,
                              }}
                              className="items-center justify-center"
                            >
                              <Text
                                className="text-2xl font-bold text-[#8A7C5C] tracking-wider"
                                style={{ fontFamily: "Newsreader-Bold" }}
                              >
                                {author.initials || "A.S."}
                              </Text>
                            </View>

                            {/* Right Info */}
                            <View className="flex-1 flex-col justify-center">
                              <Text
                                className="text-lg font-bold text-[#212842] mb-0.5"
                                style={{ fontFamily: "Newsreader-Bold" }}
                              >
                                {author.name}
                              </Text>
                              <Text
                                className="text-[10px] font-bold text-[#8A7C5C] uppercase tracking-wider mb-2"
                                style={{ fontFamily: "PublicSans-Bold" }}
                              >
                                {author.tag || "Literary Excellence"}
                              </Text>
                              <Text
                                className="text-xs text-[#76767E] leading-relaxed"
                                style={{ fontFamily: "PublicSans-Regular" }}
                                numberOfLines={3}
                              >
                                {author.description || "Renowned author whose remarkable storytelling has left a lasting imprint on the literary world."}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => router.push("/(auth)/authors")}
                          style={{ alignSelf: "flex-start" }}
                          className="border border-[#212842] rounded-full py-2 px-5 mt-5 items-center justify-center bg-transparent"
                        >
                          <Text
                            className="text-[10px] font-bold text-[#212842] uppercase tracking-wider"
                            style={{ fontFamily: "PublicSans-Bold" }}
                          >
                            VIEW CATALOG
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Meet Fellow Readers */}
              <View className="w-full mt-4 mb-6">
                <View className="flex-col justify-between items-start w-full mb-4">
                  <Text className="text-xl font-bold text-[#76767E] tracking-widest"
                    style={{ fontFamily: "PublicSans-Bold" }}>
                    MEET FELLOW READERS
                  </Text>
                  <Text className="text-lg text-[#625E52]" style={{ fontFamily: "PublicSans-Italic" }}>
                    Connect with minds that mirror you
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="w-full"
                  contentContainerStyle={{ paddingVertical: 10 }}
                >
                  {recommendedReaders.map((reader: any) => {
                    const isConnected = connectedUserIds.has(reader.id);
                    return (
                      <View
                        key={reader.id}
                        className="bg-white rounded-2xl p-5 mr-4 w-[240px]"
                        style={{
                          shadowColor: "#212842",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.06,
                          shadowRadius: 10,
                          elevation: 3,
                          borderWidth: 1,
                          borderColor: "#EBE7DF",
                        }}
                      >
                        {/* Header info */}
                        <View className="flex-row items-center">
                          <Avatar
                            uri={reader.avatar}
                            fullName={reader.fullName}
                            username={reader.username}
                            size={48}
                          />
                          <View className="ml-3 flex-1">
                            <Text
                              className="text-base font-bold text-[#212842] leading-tight"
                              style={{ fontFamily: "Newsreader-Bold" }}
                              numberOfLines={1}
                            >
                              {reader.fullName}
                            </Text>
                            <Text
                              className="text-xs text-[#76767E] mt-0.5"
                              style={{ fontFamily: "PublicSans-Regular" }}
                              numberOfLines={1}
                            >
                              @{reader.username}
                            </Text>
                          </View>
                        </View>

                        {/* Relation tag */}
                        <View
                          className="flex-row items-center rounded-lg px-2.5 py-1.5 mt-4 bg-[#FAF3E8]"
                          style={{ alignSelf: "flex-start" }}
                        >
                          <Icon name="bookOpen" size={14} color="#8A7C5C" />
                          <Text
                            className="text-[10px] text-[#8A7C5C] font-bold uppercase ml-1.5"
                            style={{ fontFamily: "PublicSans-Bold" }}
                          >
                            {reader.relation}
                          </Text>
                        </View>

                        {/* Connect Button */}
                        <TouchableOpacity
                          onPress={() => toggleConnect(reader.id)}
                          className={`w-full py-3 rounded-full mt-4 items-center justify-center ${
                            isConnected ? "bg-transparent border border-[#212842]" : "bg-[#212842]"
                          }`}
                          activeOpacity={0.8}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              isConnected ? "text-[#212842]" : "text-white"
                            }`}
                            style={{ fontFamily: "PublicSans-Bold" }}
                          >
                            {isConnected ? "CONNECTED" : "CONNECT"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Based on Your History */}
              {basedOnHistory && basedOnHistory.books && basedOnHistory.books.length > 0 && (
                <View className="w-full mt-6 mb-10">
                  <View className="flex-col justify-between items-start w-full mb-4">
                    <Text
                      className="text-xl font-bold text-[#76767E] tracking-widest mb-1"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      BASED ON YOUR HISTORY
                    </Text>
                    <Text
                      className="text-2xl font-bold text-[#212842] mb-1"
                      style={{ fontFamily: "Newsreader-Bold" }}
                    >
                      {basedOnHistory.section_title || "More from Victorian England"}
                    </Text>
                    <Text
                      className="text-sm text-[#625E52]"
                      style={{ fontFamily: "PublicSans-Italic" }}
                    >
                      {basedOnHistory.reason_subtitle || "Because you explored classic literature"}
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="w-full"
                    contentContainerStyle={{ paddingVertical: 10, gap: 16 }}
                  >
                    {basedOnHistory.books.map((book: any) => (
                      <BookCard
                        key={book.id}
                        id={book.id}
                        title={book.title}
                        author={book.authors && book.authors.length > 0 ? book.authors.join(", ") : "Unknown Author"}
                        cover={book.cover_image}
                        width={130}
                        height={195}
                        titleLines={2}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
