import React, { useRef, useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import api from "../../store/api";
import Icon from "../../core/Icon";

interface DiscoverBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

interface DiscoverNextProps {
  refreshTrigger?: number;
  onLoadEnd?: () => void;
}

export default function DiscoverNext({ refreshTrigger = 0, onLoadEnd }: DiscoverNextProps) {
  const [books, setBooks] = useState<DiscoverBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

  // Fetch discover books on mount
  useEffect(() => {
    const fetchDiscoverBooks = async () => {
      const isRefresh = refreshTrigger > 0;
      setLoading(true);
      try {
        let keptIds: string[] = [];
        if (!isRefresh) {
          // 1. Leer los IDs guardados del último reinicio
          const keptIdsStr = await SecureStore.getItemAsync("discover_keep_ids");
          keptIds = keptIdsStr ? keptIdsStr.split(",") : [];
        } else {
          // Si es un refresh explícito, borramos el caché para traer 10 libros nuevos
          await SecureStore.deleteItemAsync("discover_keep_ids");
        }

        // 2. Consultar al backend pasándole los IDs que queremos mantener (vaciado si es refresh)
        const response = await api.get("api/books/discover/", {
          params: { keep: keptIds.join(",") }
        });

        const fetchedBooks = response.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.authors.join(", "),
          cover: b.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop",
        }));

        setBooks(fetchedBooks);

        // 3. Conservar los IDs de los primeros 5 libros devueltos para el próximo reinicio
        const firstFiveIds = fetchedBooks.slice(0, 5).map((b: any) => b.id);
        await SecureStore.setItemAsync("discover_keep_ids", firstFiveIds.join(","));
      } catch (error) {
        console.error("Error fetching discover books:", error);
      } finally {
        setLoading(false);
        if (onLoadEnd) onLoadEnd();
      }
    };

    fetchDiscoverBooks();
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
        <View className="py-20 justify-center items-center">
          <ActivityIndicator size="small" color="#212842" />
        </View>
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
    </View>
  );
}
