import React, { useRef, useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  PanResponder,
  Dimensions,
} from "react-native";
import api from "../../store/api";
import Icon from "../../core/Icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NoCover from "../../app/assets/NoCover.svg";
import { useRouter } from "expo-router";

const { width: screenWidth } = Dimensions.get("window");

interface KeepReadingBook {
  id: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  pagesRead: number;
  pagesTotal: number;
  progress: number;
  genres?: string;
  description?: string;
  averageRating?: string | number;
}

interface KeepReadingProps {
  refreshTrigger?: number;
  onLoadEnd?: () => void;
}

export default function KeepReading({ refreshTrigger = 0, onLoadEnd }: KeepReadingProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [panDirection, setPanDirection] = useState<"left" | "right" | null>(null);
  const [cardHeight, setCardHeight] = useState<number>(360);

  const { data: userBooksData = [], isLoading: queryLoading, refetch } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const loading = queryLoading;

  // Derived mapped & filtered list
  const books = React.useMemo(() => {
    const mapped = userBooksData.map((ub: any) => ({
      id: ub.id,
      bookId: ub.book_id,
      title: ub.title,
      author: ub.authors.join(", "),
      coverUrl: ub.cover_image || "",
      pagesRead: ub.current_page || 0,
      pagesTotal: ub.total_pages || 100,
      progress: Math.round(ub.progress_percentage || 0),
      genres: ub.genres ? ub.genres.join(",") : "",
      description: ub.synopsis || "",
      averageRating: ub.rating || ub.average_rating || "",
    }));

    let filtered = userBooksData
      .filter((ub: any) => ub.status === "CURRENTLY_READING")
      .map((ub: any) => mapped.find((m: any) => m.id === ub.id))
      .filter(Boolean);

    if (filtered.length === 0) {
      filtered = userBooksData
        .filter((ub: any) => ub.status === "READ_LATER")
        .map((ub: any) => mapped.find((m: any) => m.id === ub.id))
        .filter(Boolean);
    }
    return filtered;
  }, [userBooksData]);

  const activeBookIndexRef = useRef(activeBookIndex);
  const booksRef = useRef(books);
  const panDirectionRef = useRef(panDirection);

  useEffect(() => {
    activeBookIndexRef.current = activeBookIndex;
    booksRef.current = books;
    panDirectionRef.current = panDirection;
  }, [activeBookIndex, books, panDirection]);

  const currentBook = books[activeBookIndex];

  // Animated values for swipe and progress bar
  const [panXState, setPanXState] = useState(() => new Animated.Value(0));
  const panXRef = useRef(panXState);
  panXRef.current = panXState;
  const panX = panXState;
  
  const progressBarWidthAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        panXRef.current.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const currentDir = panDirectionRef.current;
        if (gestureState.dx > 10 && currentDir !== "right") {
          panDirectionRef.current = "right";
          setPanDirection("right");
        } else if (gestureState.dx < -10 && currentDir !== "left") {
          panDirectionRef.current = "left";
          setPanDirection("left");
        }
        panXRef.current.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const booksList = booksRef.current;
        const currentIndex = activeBookIndexRef.current;
        if (booksList.length <= 1) {
          Animated.spring(panXRef.current, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: false,
          }).start(() => {
            panDirectionRef.current = null;
            setPanDirection(null);
          });
          return;
        }
        const threshold = screenWidth * 0.22;
        if (gestureState.dx < -threshold || gestureState.vx < -0.6) {
          // Swipe Left (Next)
          Animated.timing(panXRef.current, {
            toValue: -screenWidth * 1.2,
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            setActiveBookIndex((currentIndex + 1) % booksList.length);
            setPanXState(new Animated.Value(0));
            panDirectionRef.current = null;
            setPanDirection(null);
          });
        } else if (gestureState.dx > threshold || gestureState.vx > 0.6) {
          // Swipe Right (Prev)
          Animated.timing(panXRef.current, {
            toValue: screenWidth * 1.2,
            duration: 220,
            useNativeDriver: false,
          }).start(() => {
            setActiveBookIndex(
              (currentIndex - 1 + booksList.length) % booksList.length
            );
            setPanXState(new Animated.Value(0));
            panDirectionRef.current = null;
            setPanDirection(null);
          });
        } else {
          // Spring back
          Animated.spring(panXRef.current, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: false,
          }).start(() => {
            panDirectionRef.current = null;
            setPanDirection(null);
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panXRef.current, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: false,
        }).start(() => {
          panDirectionRef.current = null;
          setPanDirection(null);
        });
      },
    })
  ).current;

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
  }, [loading, pulseAnim]);

  // Support manual pull-to-refresh
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch().finally(() => {
        if (onLoadEnd) onLoadEnd();
      });
    }
  }, [refreshTrigger, refetch, onLoadEnd]);

  useEffect(() => {
    if (!queryLoading && onLoadEnd) {
      onLoadEnd();
    }
  }, [queryLoading, onLoadEnd]);

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
  }, [currentBook, progressBarWidthAnim]);

  const handleRemoveBook = async (userbookId: string) => {
    try {
      await api.delete("api/books/userbook/", {
        data: { book_id: currentBook.bookId }
      });
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      setActiveBookIndex(0);
    } catch (error) {
      console.error("Error removing book from library:", error);
    }
  };

  const handleDotPress = (idx: number) => {
    if (idx === activeBookIndex || books.length <= 1) return;
    const direction = idx > activeBookIndex ? "left" : "right";
    panDirectionRef.current = direction;
    setPanDirection(direction);
    const targetX = direction === "left" ? -screenWidth * 1.2 : screenWidth * 1.2;
    Animated.timing(panXRef.current, {
      toValue: targetX,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      setActiveBookIndex(idx);
      setPanXState(new Animated.Value(0));
      panDirectionRef.current = null;
      setPanDirection(null);
    });
  };

  if (loading) {
    return (
      <View className="w-full">
        <View className="w-full items-center mb-1">
          <Text
            className="text-3xl text-[#212842] text-center"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            Your Reading Journey
          </Text>
          <View className="flex-row justify-center items-center gap-2 mt-2">
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#D6D1C4" }} />
            <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: "#EBE7DF" }} />
            <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: "#EBE7DF" }} />
          </View>
        </View>
        <View className="w-full bg-[#FCF3E0] rounded-xl p-4 mt-10">
          <View className="flex-row w-full">
            <Animated.View
              style={{
                opacity: pulseAnim,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.1,
                shadowRadius: 8.5,
                elevation: 6,
                transform: [{ rotate: "-8deg" }],
                marginTop: -48,
                width: 130,
                height: 195,
                backgroundColor: "#FAF3E8",
              }}
              className="rounded-md"
            />
            <View className="flex-col flex-1 ml-4 content-center justify-center h-48 gap-4">
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  height: 48,
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded-full w-full"
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  height: 48,
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded-full w-full"
              />
            </View>
          </View>
          
          <Animated.View
            style={{
              opacity: pulseAnim,
              height: 36,
              width: "70%",
              backgroundColor: "#FAF3E8",
            }}
            className="rounded mt-4"
          />
          <Animated.View
            style={{
              opacity: pulseAnim,
              height: 18,
              width: "40%",
              backgroundColor: "#FAF3E8",
            }}
            className="rounded mt-2"
          />
          
          <View className="w-full mt-4 mb-6">
            <View className="flex-row justify-between items-center mb-1.5">
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  height: 16,
                  width: "30%",
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded"
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  height: 16,
                  width: "10%",
                  backgroundColor: "#FAF3E8",
                }}
                className="rounded"
              />
            </View>
            <Animated.View
              style={{
                opacity: pulseAnim,
                height: 6,
                backgroundColor: "#FAF3E8",
              }}
              className="w-full rounded-full"
            />
          </View>
        </View>
      </View>
    );
  }

  // State: Empty shelf
  if (books.length === 0) {
    return (
      <View className="w-full">
        <View className="w-full items-center mb-3">
          <Text
            className="text-3xl text-[#212842] text-center"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            Your Reading Journey
          </Text>
        </View>
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

  const isRightDrag = panDirection === "right";
  const middleIndex = isRightDrag
    ? (activeBookIndex - 1 + books.length) % books.length
    : (activeBookIndex + 1) % books.length;
  const backIndex = isRightDrag
    ? (activeBookIndex - 2 + books.length) % books.length
    : (activeBookIndex + 2) % books.length;

  const incomingIndex = isRightDrag
    ? (activeBookIndex - Math.min(books.length, 3) + books.length) % books.length
    : (activeBookIndex + Math.min(books.length, 3)) % books.length;
  const incomingTop = books.length === 2 ? 62 : 48;
  const incomingLeft = books.length === 2 ? 10 : 0;
  const incomingBgColor = books.length === 2 ? "#DFDACB" : "#C3BEAF";
  const incomingZIndex = books.length === 2 ? 1 : 0;

  const swipeProgress = panX.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [1, 0, 1],
    extrapolate: "clamp",
  });

  const cardWidth = screenWidth - 48 - (books.length > 1 ? 20 : 10);

  const renderCardInner = (
    book: KeepReadingBook,
    contentOpacityAnim: any,
    isFront: boolean = false
  ) => {
    if (!book) return null;
    return (
      <TouchableOpacity 
        className="w-full"
        activeOpacity={0.9}
        onPress={() => {
          if (isFront) {
            router.push({
              pathname: "/BookDetails",
              params: { 
                bookId: book.bookId, 
                bookName: book.title, 
                author: book.author, 
                cover: book.coverUrl, 
                genres: book.genres,
                totalPages: book.pagesTotal ? book.pagesTotal.toString() : "",
                description: book.description,
                averageRating: book.averageRating ? book.averageRating.toString() : "",
              }
            });
          }
        }}
      >
        <View className="flex-row w-full">
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
            {book.coverUrl ? (
              <Image
                source={{ uri: book.coverUrl }}
                style={{ width: 130, height: 195 }}
                className="rounded-md"
                resizeMode="cover"
              />
            ) : (
              <NoCover width={130} height={195} style={{ borderRadius: 6 }} />
            )}
          </View>
          <Animated.View
            style={{
              opacity: contentOpacityAnim,
              flex: 1,
              marginLeft: 16,
              justifyContent: "center",
              height: 192,
              gap: 16,
            }}
          >
            <TouchableOpacity
              disabled={!isFront}
              className="flex-row items-center justify-center gap-2 rounded-full bg-[#212842] py-4 px-5"
            >
              <Icon name="bookOpenPageVariant" size={24} color="white" />
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-white text-base pl-3"
              >
                Update Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!isFront}
              className="flex-row items-center justify-center gap-2 rounded-full bg-transparent border-2 border-[#F0E7D5] py-4 px-5"
            >
              <Icon name="eyeOutline" size={24} color="#212842" />
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#212842] text-base pl-3"
              >
                Immersion Mode
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: contentOpacityAnim }}>
          <Text
            className="mt-4 text-4xl text-[#212842]"
            style={{ fontFamily: "Newsreader-Bold" }}
            numberOfLines={2}
          >
            {book.title}
          </Text>
          <Text
            className="text-lg text-[#625E52] mt-0.5"
            style={{ fontFamily: "PublicSans-Italic" }}
            numberOfLines={1}
          >
            by {book.author}
          </Text>
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacityAnim }} className="w-full mt-4 mb-6">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text
              className="text-base text-[#76767E]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {book.pagesRead} / {book.pagesTotal} PAGES
            </Text>
            <Text
              className="text-base text-[#76767E]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {book.progress}%
            </Text>
          </View>
          <View className="w-full h-1.5 bg-[#EBE7DF] rounded-full overflow-hidden">
            {isFront ? (
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
            ) : (
              <View
                style={{ width: `${book.progress}%` }}
                className="h-full bg-[#212842] rounded-full"
              />
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="w-full">
      <View className="w-full items-center mb-1">
        <Text
          className="text-3xl text-[#212842] text-center"
          style={{ fontFamily: "Newsreader-Bold" }}
        >
          Your Reading Journey
        </Text>
        {books.length > 1 && (
          <View className="flex-row justify-center items-center gap-2 mt-2">
            {books.map((_, idx) => {
              const isActive = idx === activeBookIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleDotPress(idx)}
                  activeOpacity={0.7}
                >
                  <Animated.View
                    style={{
                      width: isActive ? 10 : 8,
                      height: isActive ? 10 : 8,
                      borderRadius: 5,
                      backgroundColor: isActive ? "#212842" : "#D6D1C4",
                    }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ width: "100%", paddingTop: 48, paddingBottom: 28, position: "relative" }}>
        {/* Incoming Fade-in Card */}
        {books.length >= 2 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: incomingTop,
              left: incomingLeft,
              width: cardWidth,
              height: cardHeight,
              backgroundColor: incomingBgColor,
              borderRadius: 16,
              padding: 16,
              zIndex: incomingZIndex,
              opacity: swipeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            }}
          >
            {renderCardInner(books[incomingIndex], 0)}
          </Animated.View>
        )}

        {/* Back Card */}
        {books.length >= 3 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 48,
              left: 0,
              width: cardWidth,
              height: cardHeight,
              backgroundColor: swipeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["#C3BEAF", "#DFDACB"],
              }),
              borderRadius: 16,
              padding: 16,
              zIndex: 1,
              transform: [
                {
                  translateX: swipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 10],
                  }),
                },
                {
                  translateY: swipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 14],
                  }),
                },
              ],
            }}
          >
            {renderCardInner(books[backIndex], 0)}
          </Animated.View>
        )}

        {/* Middle Card */}
        {books.length >= 2 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 62,
              left: 10,
              width: cardWidth,
              height: cardHeight,
              backgroundColor: swipeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["#DFDACB", "#FCF3E0"],
              }),
              borderRadius: 16,
              padding: 16,
              zIndex: 2,
              transform: [
                {
                  translateX: swipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 10],
                  }),
                },
                {
                  translateY: swipeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 14],
                  }),
                },
              ],
            }}
          >
            {renderCardInner(books[middleIndex], swipeProgress)}
          </Animated.View>
        )}

        {/* Front Card */}
        <Animated.View
          {...(books.length > 1 ? panResponder.panHandlers : {})}
          onLayout={(e) => {
            if (
              e.nativeEvent.layout.height &&
              Math.abs(e.nativeEvent.layout.height - cardHeight) > 2
            ) {
              setCardHeight(e.nativeEvent.layout.height);
            }
          }}
          style={{
            position: "relative",
            top: books.length > 1 ? 28 : 14,
            left: books.length > 1 ? 20 : 5,
            width: cardWidth,
            backgroundColor: "#FCF3E0",
            borderRadius: 16,
            padding: 16,
            zIndex: 3,
            transform: [
              { translateX: panX },
              {
                rotate: panX.interpolate({
                  inputRange: [-screenWidth, 0, screenWidth],
                  outputRange: ["-10deg", "0deg", "10deg"],
                  extrapolate: "clamp",
                }),
              },
            ],
            opacity: panX.interpolate({
              inputRange: [-screenWidth * 0.85, 0, screenWidth * 0.85],
              outputRange: [0, 1, 0],
              extrapolate: "clamp",
            }),
          }}
        >
          {/* Absolute Positioned Remove Button */}
          <TouchableOpacity
            onPress={() => handleRemoveBook(currentBook.id)}
            activeOpacity={0.7}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              padding: 4,
              zIndex: 10,
            }}
          >
            <Icon name="cancel" size={20} color="#76767E" />
          </TouchableOpacity>

          {renderCardInner(currentBook, 1, true)}
        </Animated.View>
      </View>
    </View>
  );
}