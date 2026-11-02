/**
 * @project Reedo
 * @module DiscoverNext
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useRef, useState, useEffect, useMemo } from "react";
import { Text, View, TouchableOpacity, Image, ScrollView, Animated } from "react-native";
import * as SecureStore from "expo-secure-store";
import api from "../../store/api";
import Icon from "../../core/Icon";
import NoCover from "../../app/assets/NoCover.svg";
import { useQuery } from "@tanstack/react-query";
import BookCard from "../BookCard";
import { useLibraryStore } from "../../store/useLibraryStore";
import {
  useAuthorFollowStore,
  buildRecommendationSignals,
  rankBooksByRecommendationSignals,
} from "../../store/useAuthorFollowStore";

interface DiscoverBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  genres?: string;
  totalPages?: string;
  averageRating?: string;
  description?: string;
}

interface DiscoverNextProps {
  refreshTrigger?: number;
  onLoadEnd?: () => void;
}

export default function DiscoverNext({ refreshTrigger = 0, onLoadEnd }: DiscoverNextProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollViewRef = useRef<any>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const shelves = useLibraryStore((state) => state.shelves);
  const followedAuthors = useAuthorFollowStore((state) => state.followedAuthors);
  const recentSearches = useAuthorFollowStore((state) => state.recentSearches);
  const likedBookSignals = useAuthorFollowStore((state) => state.likedBookSignals);

  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      try {
        const response = await api.get("api/books/userbook/");
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
  });

  const recSignals = useMemo(
    () =>
      buildRecommendationSignals(
        userBooksData,
        shelves,
        followedAuthors,
        recentSearches,
        likedBookSignals
      ),
    [userBooksData, shelves, followedAuthors, recentSearches, likedBookSignals]
  );

  // React Query fetch definition
  const { data: rawBooks = [], isLoading: loading, refetch } = useQuery({
    queryKey: [
      "discoverBooks",
      recSignals.followedAuthorNames.slice(0, 3).join(","),
      recSignals.recentSearches.slice(0, 2).join(","),
    ],
    queryFn: async () => {
      // 1. Read keep IDs from secure store
      const keptIdsStr = await SecureStore.getItemAsync("discover_keep_ids");
      const keptIds = keptIdsStr ? keptIdsStr.split(",") : [];

      // 2. Query discover endpoint with personalization signals & kept IDs
      const response = await api.get("api/books/discover/", {
        params: {
          keep: keptIds.join(","),
          followed_authors: recSignals.followedAuthorNames.slice(0, 5).join(","),
          saved_authors: recSignals.savedAndLikedAuthorNames.slice(0, 5).join(","),
          liked_genres: recSignals.preferredGenres.slice(0, 5).join(","),
          recent_searches: recSignals.recentSearches.slice(0, 4).join(","),
        },
      });

      const mapBook = (b: any): DiscoverBook => ({
        id: String(b.id || b.book_id),
        title: b.title,
        author: Array.isArray(b.authors)
          ? b.authors.join(", ")
          : b.author || "Unknown Author",
        cover: b.cover_image || b.cover_url || "",
        genres: Array.isArray(b.genres) ? b.genres.join(",") : b.genres || "",
        totalPages: b.total_pages ? b.total_pages.toString() : "",
        averageRating: b.average_rating ? b.average_rating.toString() : "",
        description: b.synopsis || b.description || "",
      });

      let fetchedBooks: DiscoverBook[] = (response.data || []).map(mapBook);

      // 2b. Also fetch books by top followed author or recent search to ensure personalization even if backend cache hit
      const seedQuery =
        recSignals.followedAuthorNames[0] ||
        recSignals.recentSearches[0] ||
        recSignals.savedAndLikedAuthorNames[0];
      if (seedQuery) {
        try {
          const searchResp = await api.get("api/books/search/", {
            params: { q: seedQuery },
          });
          const extraBooks: DiscoverBook[] = (searchResp.data || [])
            .slice(0, 5)
            .map(mapBook);
          const existingIds = new Set(fetchedBooks.map((fb) => fb.id));
          for (const eb of extraBooks) {
            if (eb.cover && !existingIds.has(eb.id)) {
              existingIds.add(eb.id);
              fetchedBooks.unshift(eb);
            }
          }
        } catch {}
      }

      // 3. Keep the first 5 IDs for subsequent cold starts
      const firstFiveIds = fetchedBooks.slice(0, 5).map((b: any) => b.id);
      await SecureStore.setItemAsync("discover_keep_ids", firstFiveIds.join(","));

      return fetchedBooks;
    },
  });

  const books = useMemo(() => {
    const unSaved = rawBooks.filter(
      (b) => !recSignals.excludedBookIds.has(String(b.id))
    );
    const pool = unSaved.length >= 4 ? unSaved : rawBooks;
    return rankBooksByRecommendationSignals(pool, recSignals);
  }, [rawBooks, recSignals]);

  useEffect(() => {
    if (loading) {
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
  }, [loading]);

  // Support manual pull-to-refresh triggered from parent page
  useEffect(() => {
    const handleRefresh = async () => {
      if (refreshTrigger > 0) {
        // Clear stored IDs on explicit refresh
        await SecureStore.deleteItemAsync("discover_keep_ids");
        await refetch();
      }
    };
    handleRefresh();
  }, [refreshTrigger]);

  // Propagate load end to parent scroll list coordinator
  useEffect(() => {
    if (!loading && onLoadEnd) {
      onLoadEnd();
    }
  }, [loading]);

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

  const handleScroll = (event: any) => {
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
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: Math.max(0, scrollXRef.current - 288),
        animated: true,
      });
    }
  };

  const handleNextPress = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: scrollXRef.current + 288,
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <View className="w-full mt-10">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest mb-4"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          DISCOVER YOUR NEXT READ
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="mr-6 flex-col">
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 120,
                  height: 180,
                  backgroundColor: "#FAF3E8",
                }}
                className="mb-3 rounded-xl"
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 90,
                  height: 16,
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded mb-2"
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 60,
                  height: 12,
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="w-full mt-10">
      <View className="flex-row justify-between items-center w-full mb-4">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          DISCOVER YOUR NEXT READ
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

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        className="w-full"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
      >
        {books.map((book: any) => (
          <BookCard
            key={book.id}
            id={book.id}
            title={book.title}
            author={book.author}
            cover={book.cover}
            genres={book.genres}
            totalPages={book.totalPages}
            averageRating={book.averageRating}
            description={book.description}
          />
        ))}
      </ScrollView>
    </View>
  );
}
