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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";
import Icon from "../../core/Icon";
import api from "../../store/api";

interface TrendingBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const componentsToLoad = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("All Collections");

  const [books, setBooks] = useState<TrendingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const [savedBookIds, setSavedBookIds] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<TrendingBook[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const carouselRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

  useEffect(() => {
    setNavbarVisible(true);
    
    // Fetch user's library on mount to mark added books
    const fetchUserBooks = async () => {
      try {
        const userBooksRes = await api.get("api/books/userbook/");
        const savedIds = new Set<string>(userBooksRes.data.map((ub: any) => ub.book_id));
        setSavedBookIds(savedIds);
      } catch (authError) {
        // Silent catch
      }
    };
    fetchUserBooks();
  }, []);

  useEffect(() => {
    const fetchTrendingBooks = async () => {
      setLoading(true);
      try {
        const response = await api.get("api/books/suggestions/");
        const mapped = response.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.authors.join(", "),
          cover: b.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop",
        }));
        setBooks(mapped);
      } catch (error) {
        console.error("Error fetching trending books:", error);
      } finally {
        setLoading(false);
        handleLoadEnd();
      }
    };
    fetchTrendingBooks();
  }, [refreshTrigger]);

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

  // Debounced search trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearchLoading(true);
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
        setSearchResults(mapped);
      } catch (error) {
        console.error("Error searching books:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleAddToLibrary = async (bookId: string) => {
    try {
      await api.post("api/books/userbook/", { book_id: bookId, status: "READ_LATER" });
      setSavedBookIds((prev) => {
        const next = new Set(prev);
        next.add(bookId);
        return next;
      });
    } catch (error) {
      console.error("Error saving book to library:", error);
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
    componentsToLoad.current = 1; // Trending section
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLoadEnd = () => {
    if (refreshing) {
      componentsToLoad.current -= 1;
      if (componentsToLoad.current <= 0) {
        setRefreshing(false);
      }
    }
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
              <Text 
                className="text-xl font-bold text-[#76767E] tracking-widest mb-4"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                SEARCH RESULTS
              </Text>
              
              {searchLoading ? (
                <View className="py-20 justify-center items-center w-full">
                  <ActivityIndicator size="small" color="#212842" />
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
                    className="text-[#76767E] text-center text-sm mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    Try searching for another title, author, or ISBN.
                  </Text>
                </View>
              ) : (
                <View className="w-full flex-col gap-5 mt-2 mb-8">
                  {searchResults.map((book) => (
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
                        <Image
                          source={{ uri: book.cover }}
                          style={{ width: 70, height: 105 }}
                          resizeMode="cover"
                        />
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
                          <View className="flex-row items-center justify-center bg-[#FAF3E8] border border-[#212842] py-2 px-3.5 rounded-full">
                            <Icon name="checkCircle" size={18} color="#212842" />
                            <Text
                              style={{ fontFamily: "PublicSans-Bold" }}
                              className="text-[#212842] text-xs pl-1.5"
                            >
                              In Library
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            className="flex-row items-center justify-center bg-[#212842] py-2 px-3.5 rounded-full"
                            onPress={() => handleAddToLibrary(book.id)}
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
                </View>
              )}
            </View>
          ) : (
            /* Discover Home Screen View */
            <>
              {/* Trending on Reedo */}
              <View className="w-full mt-4 mb-6">
                <View className="flex-row justify-between items-center w-full mb-4">
                  <Text className="text-xl font-bold text-[#76767E] tracking-widest"
                  style={{ fontFamily: "PublicSans-Bold" }}>
                    TRENDING ON REEDO
                  </Text>
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
                  <View className="py-20 justify-center items-center w-full">
                    <ActivityIndicator size="small" color="#212842" />
                  </View>
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
                  >
                    {books.map((book) => (
                      <TouchableOpacity
                        key={book.id}
                        className="mr-6 flex-col"
                        activeOpacity={0.8}
                      >
                        <View
                          style={{
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            elevation: 4,
                          }}
                          className="bg-transparent mb-3 rounded-xl"
                        >
                          <View className="rounded-xl overflow-hidden bg-[#FCF3E0]">
                            <Image
                              source={{ uri: book.cover }}
                              style={{ width: 120, height: 180 }}
                              resizeMode="cover"
                            />
                          </View>
                        </View>
                        <Text
                          numberOfLines={1}
                          className="text-base font-bold text-[#212842] uppercase"
                          style={{ fontFamily: "PublicSans-Bold", width: 120 }}
                        >
                          {book.title}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="text-xs text-[#8E8B82] uppercase mt-1"
                          style={{ fontFamily: "PublicSans-Regular", width: 120 }}
                        >
                          {book.author}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
