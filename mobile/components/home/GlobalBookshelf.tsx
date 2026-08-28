import BookCover from "../../components/BookCover";
import React, { useRef, useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Image, ScrollView, Animated } from "react-native";
import api from "../../store/api";
import Icon from "../../core/Icon";
import NoCover from "../../app/assets/NoCover.svg";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

interface GlobalBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

interface GlobalBookshelfProps {
  refreshTrigger?: number;
  onLoadEnd?: () => void;
}

export default function GlobalBookshelf({ refreshTrigger = 0, onLoadEnd }: GlobalBookshelfProps) {
  const router = useRouter();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // React Query fetch definition
  const { data: books = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["globalBookshelf"],
    queryFn: async () => {
      const response = await api.get("api/books/global-bookshelf/");
      return response.data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.authors.join(", "),
        cover: b.cover_image || "",
        addedCount: b.added_count || 0
      }));
    }
  });

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
    if (refreshTrigger > 0) {
      refetch();
    }
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
          THE GLOBAL BOOKSHELF
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

  if (books.length === 0) {
    return null;
  }

  return (
    <View className="w-full mt-10">
      <View className="flex-row justify-between items-center w-full mb-4">
        <View className="flex-col">
          <Text
            className="text-xl font-bold text-[#76767E] tracking-widest"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            THE GLOBAL BOOKSHELF
          </Text>
          <Text
            className="text-xs text-[#8E8B82] uppercase mt-0.5"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            Most cataloged books by fellow curators
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
          <TouchableOpacity
            key={book.id}
            className="mr-6 flex-col"
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: "/BookDetails",
              params: {
                bookId: book.id,
                bookName: book.title,
                author: book.author,
                cover: book.cover,
              }
            })}
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
                {book.cover ? (
                  <BookCover
                    uri={book.cover }
                    style={{ width: 120, height: 180 }}
                    resizeMode="cover"
                  />
                ) : (
                  <NoCover width={120} height={180} />
                )}
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
            <Text
              numberOfLines={1}
              className="text-[10px] text-[#8A7C5C] font-bold uppercase mt-1"
              style={{ fontFamily: "PublicSans-Bold", width: 120 }}
            >
              📖 {book.addedCount} {book.addedCount === 1 ? "save" : "saves"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
