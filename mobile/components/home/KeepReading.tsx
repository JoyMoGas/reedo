import React, { useRef, useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import api from "../../store/api";
import Icon from "../../core/Icon";

interface KeepReadingBook {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  pagesRead: number;
  pagesTotal: number;
  progress: number;
}

interface KeepReadingProps {
  refreshTrigger?: number;
  onLoadEnd?: () => void;
}

export default function KeepReading({ refreshTrigger = 0, onLoadEnd }: KeepReadingProps) {
  const [books, setBooks] = useState<KeepReadingBook[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentBook = books[activeBookIndex];

  // Animated values for transition
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;

  // Animated value for the progress bar width transition
  const progressBarWidthAnim = useRef(new Animated.Value(0)).current;

  // Fetch user's books from Supabase on mount
  useEffect(() => {
    const fetchUserBooks = async () => {
      try {
        const response = await api.get("api/books/userbook/");
        
        // Mapear los datos de UserBook recibidos de la API
        const mapped = response.data.map((ub: any) => ({
          id: ub.id,
          bookId: ub.book_id,
          title: ub.title,
          author: ub.authors.join(", "),
          coverUrl: ub.cover_image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400&auto=format&fit=crop",
          pagesRead: ub.current_page || 0,
          pagesTotal: ub.total_pages || 100,
          progress: Math.round(ub.progress_percentage || 0)
        }));

        // Filtrar: primero mostramos los que están leyendo (CURRENTLY_READING)
        let filtered = response.data
          .filter((ub: any) => ub.status === "CURRENTLY_READING")
          .map((ub: any) => mapped.find((m: any) => m.id === ub.id));

        // Si no está leyendo ninguno, mostramos los guardados para leer (READ_LATER)
        if (filtered.length === 0) {
          filtered = response.data
            .filter((ub: any) => ub.status === "READ_LATER")
            .map((ub: any) => mapped.find((m: any) => m.id === ub.id));
        }

        setBooks(filtered);
      } catch (error) {
        console.error("Error fetching user books for KeepReading:", error);
      } finally {
        setLoading(false);
        if (onLoadEnd) onLoadEnd();
      }
    };
    fetchUserBooks();
  }, [refreshTrigger]);

  // Update progress bar width animation when current book changes
  useEffect(() => {
    if (currentBook) {
      Animated.timing(progressBarWidthAnim, {
        toValue: currentBook.progress,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentBook]);

  const handlePrevBook = () => {
    if (books.length <= 1) return;
    const nextIndex =
      (activeBookIndex - 1 + books.length) % books.length;
    animateTransition(nextIndex, "prev");
  };

  const handleNextBook = () => {
    if (books.length <= 1) return;
    const nextIndex = (activeBookIndex + 1) % books.length;
    animateTransition(nextIndex, "next");
  };

  const animateTransition = (
    nextIndex: number,
    direction: "next" | "prev"
  ) => {
    const exitX = direction === "next" ? -60 : 60;
    const entryX = direction === "next" ? 60 : -60;

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: exitX,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveBookIndex(nextIndex);
      contentTranslateX.setValue(entryX);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  if (loading) {
    return (
      <View className="w-full py-10 justify-center items-center">
        <ActivityIndicator size="small" color="#212842" />
      </View>
    );
  }

  // State: Empty shelf
  if (books.length === 0) {
    return (
      <View className="w-full">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest mb-3"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          KEEP READING
        </Text>
        <View className="w-full bg-[#FCF3E0] rounded-xl p-6 items-center justify-center border border-dashed border-[#8E8B82] mt-4">
          <Text className="text-3xl mb-2">📚</Text>
          <Text
            className="text-[#212842] text-center text-lg font-bold mb-1"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            Start your journey
          </Text>
          <Text
            className="text-sm text-[#76767E] text-center"
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            You don't have any books on your shelf yet. Go to Discover or use the search bar to find and add your first book!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="w-full">
      <View className="flex-row justify-between items-center w-full mb-3">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          KEEP READING
        </Text>
        {books.length > 1 && (
          <View className="flex-row gap-4">
            <TouchableOpacity className="p-1" onPress={handlePrevBook}>
              <Icon name="chevronLeft" size={24} color="#76767E" />
            </TouchableOpacity>
            <TouchableOpacity className="p-1" onPress={handleNextBook}>
              <Icon name="chevronRight" size={24} color="#76767E" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="w-full bg-[#FCF3E0] rounded-xl p-4 mt-10">
        <View className="flex-row w-full">
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateX: contentTranslateX }],
            }}
          >
            <View
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.22,
                shadowRadius: 8.5,
                elevation: 6,
                transform: [{ rotate: "-8deg" }],
                marginTop: -48,
              }}
            >
              <Image
                source={{ uri: currentBook.coverUrl }}
                style={{ width: 130, height: 195 }}
                className="rounded-md"
                resizeMode="cover"
              />
            </View>
          </Animated.View>
          <View className="flex-col flex-1 ml-4 content-center justify-center h-48 gap-4">
            <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-full bg-[#212842] py-4 px-5">
              <Icon name="bookOpenPageVariant" size={24} color="white" />
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-white text-base pl-3"
              >
                Update Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-full bg-transparent border-2 border-[#F0E7D5] py-4 px-5">
              <Icon name="eyeOutline" size={24} color="#212842" />
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#212842] text-base  pl-3"
              >
                Immersion Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateX: contentTranslateX }],
          }}
        >
          <Text
            className="mt-4 text-4xl text-[#212842]"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            {currentBook.title}
          </Text>
          <Text
            className="text-lg text-[#625E52] mt-0.5"
            style={{ fontFamily: "PublicSans-Italic" }}
          >
            by {currentBook.author}
          </Text>
        </Animated.View>

        {/* Visual Progress Bar Section */}
        <View className="w-full mt-4 mb-6">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text
              className="text-base text-[#76767E]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {currentBook.pagesRead} / {currentBook.pagesTotal} PAGES
            </Text>
            <Text
              className="text-base text-[#76767E]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {currentBook.progress}%
            </Text>
          </View>
          <View className="w-full h-1.5 bg-[#EBE7DF] rounded-full overflow-hidden">
            <Animated.View
              style={{
                width: progressBarWidthAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                  extrapolate: "clamp",
                }),
              }}
              className="h-full bg-[#212842] rounded-full"
            />
          </View>
        </View>
      </View>
    </View>
  );
}