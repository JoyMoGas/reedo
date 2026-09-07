/**
 * @project Reedo
 * @module BookDetails
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-04
 */
import BookCover from "../components/BookCover";
import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, TouchableWithoutFeedback, Animated, Dimensions, PanResponder, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import NoCover from "./assets/NoCover.svg";
import Icon from "../core/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/api";
import { ReviewItem } from "../components/book/ReviewItem";
import { useAuthStore } from "../store/useAuthStore";
import { useLibraryStore } from "../store/useLibraryStore";

interface BookDetailProps {
  bookId?: string;
  bookName?: string;
  author?: string;
  cover?: string;
  genres?: string;
  totalPages?: string;
  averageRating?: string;
  addedCount?: string;
  description?: string;
}

function BookDetails() {
  const {
    bookId,
    bookName,
    author,
    cover,
    genres,
    totalPages,
    averageRating,
    addedCount,
    description,
  } = useLocalSearchParams() as unknown as BookDetailProps;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const width = 180;
  const height = 270;
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [globalShowSpoilers, setGlobalShowSpoilers] = useState(false);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  const [archiveSheetOpen, setArchiveSheetOpen] = useState(false);
  const [addingToShelf, setAddingToShelf] = useState<string | null>(null);

  // Shelves from store
  const shelves = useLibraryStore((state) => state.shelves);

  const { height: screenHeight } = Dimensions.get("window");
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  // Separate animated values for the archive sheet
  const archiveTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const archiveOpacity = useRef(new Animated.Value(0)).current;

  const openLinkModal = (link: string) => {
    setExternalLink(link);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeLinkModal = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: screenHeight, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setExternalLink(null);
    });
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          closeLinkModal();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Fetch user's current library to detect if book is already added
  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    },
  });

  const existingUserBook = useMemo(() => {
    return userBooksData.find((ub: any) => ub.book_id === bookId) || null;
  }, [userBooksData, bookId]);

  const openArchiveSheet = () => {
    setArchiveSheetOpen(true);
    Animated.parallel([
      Animated.timing(archiveTranslateY, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(archiveOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  };

  const closeArchiveSheet = () => {
    Animated.parallel([
      Animated.timing(archiveTranslateY, { toValue: screenHeight, duration: 260, useNativeDriver: true }),
      Animated.timing(archiveOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => setArchiveSheetOpen(false));
  };

  const archivePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 0 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) archiveTranslateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.5) {
          closeArchiveSheet();
        } else {
          Animated.spring(archiveTranslateY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleAddToShelf = async (status: string, shelfLabel: string) => {
    if (!bookId) return;
    setAddingToShelf(status);
    try {
      await api.post("api/books/userbook/", { book_id: bookId, status });
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      closeArchiveSheet();
    } catch (error) {
      // If already exists, it might just update — invalidate anyway
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      closeArchiveSheet();
    } finally {
      setAddingToShelf(null);
    }
  };

  const getFormattedShelvedCount = () => {
    let rawCount = bookStats?.shelved_count;
    if (rawCount === undefined && addedCount) {
      rawCount = Number(addedCount);
    }
    if (!rawCount) return "0";
    if (rawCount >= 1000) {
      return `${(rawCount / 1000).toFixed(1)}k`;
    }
    return rawCount.toString();
  };

  const { data: bookStats } = useQuery({
    queryKey: ["bookStats", bookId],
    queryFn: async () => {
      if (!bookId) return null;
      const { data } = await api.get(`api/books/${bookId}/stats/`);
      return data;
    },
    enabled: !!bookId,
  });

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ["reviews", bookId],
    queryFn: async () => {
      if (!bookId) return [];
      const { data } = await api.get(`api/social/books/${bookId}/reviews/`);
      return data;
    },
    enabled: !!bookId,
  });

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];
    if (filterRating !== null) {
      result = result.filter((r: any) => r.rating === filterRating);
    }
    result.sort((a: any, b: any) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'highest') {
        return b.rating - a.rating;
      }
      if (sortBy === 'lowest') {
        return a.rating - b.rating;
      }
      return 0;
    });
    return result;
  }, [reviews, sortBy, filterRating]);

  const likeMutation = useMutation({
    mutationFn: async ({ reviewId, isLiked }: { reviewId: string, isLiked: boolean }) => {
      if (isLiked) {
        await api.delete(`api/social/reviews/${reviewId}/like/`);
      } else {
        await api.post(`api/social/reviews/${reviewId}/like/`);
      }
    },
    onMutate: async ({ reviewId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["reviews", bookId] });
      const previousReviews = queryClient.getQueryData(["reviews", bookId]);
      queryClient.setQueryData(["reviews", bookId], (old: any) => {
        if (!old) return old;
        return old.map((r: any) => 
          r.id === reviewId ? { ...r, is_liked: !isLiked, likes_count: isLiked ? r.likes_count - 1 : r.likes_count + 1 } : r
        );
      });
      return { previousReviews };
    },
    onError: (err, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(["reviews", bookId], context.previousReviews);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", bookId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`api/social/reviews/${reviewId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", bookId] });
    },
  });

  const getStoreLinks = (isbn: string, title: string) => {
    const encodedTitle = encodeURIComponent(title);
    return {
      amazon: `https://www.amazon.com/s?k=${isbn || encodedTitle}&tag=TU_TAG_AFILIADO`,
      bookshop: `https://bookshop.org/search?keywords=${isbn || encodedTitle}`,
      google: `https://play.google.com/store/search?q=${encodedTitle}&c=books`,
    };
  };

  const storeLinks = getStoreLinks("", bookName || "");

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      {/* Custom Header */}
      <View className="w-full flex-row justify-between items-center px-6 py-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2"
          activeOpacity={0.7}
        >
          <Icon name="arrowLeft" size={24} color="#212842" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2 -mr-2" activeOpacity={0.7}>
          <Icon name="share" size={24} color="#212842" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 40,
        }}
      >
        <View>
          <View className="w-full items-center mb-6">
            <View
              className="rounded-xl overflow-hidden bg-[#FCF3E0]"
              style={{ width, height }}
            >
              {cover ? (
                <BookCover
                  uri={cover }
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <NoCover width={width} height={height} />
              )}
            </View>
          </View>
          <View className="flex-col flex-1 w-full items-center px-4">
            <Text
              className="text-5xl text-[#212842] leading-none mb-2 text-center"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              {bookName}
            </Text>
            {author
              ? author.split(",").map((auth, index) => (
                  <Text
                    key={index}
                    className="text-xl text-[#76767E] text-center"
                    style={{ fontFamily: "PublicSans-Italic" }}
                  >
                    {auth.trim()}
                  </Text>
                ))
              : null}
          </View>
          <View className="flex-row flex-wrap justify-center gap-2 mt-6">
            {genres
              ? genres.split(",").map((genre: string, idx: number) => (
                  <View
                    key={idx}
                    className="bg-[#FCF3E0] px-3 py-1.5 rounded-full"
                  >
                    <Text
                      className="text-[#76767E] text-base font-medium"
                      style={{ fontFamily: "PublicSans-Regular" }}
                    >
                      {genre.trim()}
                    </Text>
                  </View>
                ))
              : null}
          </View>

          {/* Book Stats Section */}
          <View className="w-full flex-row justify-between items-center py-4 border-y border-[#EBE7DF] mt-8">
            <View className="flex-1 items-center justify-center py-4">
              <Text
                className="text-base text-[#8E8B82] uppercase tracking-wider font-bold mb-4"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                LENGTH
              </Text>
              <Text
                className="text-2xl text-[#212842]"
                style={{ fontFamily: "Newsreader-Bold" }}
              >
                {totalPages ? `${totalPages} pp.` : "N/A"}
              </Text>
            </View>

            <View className="w-[1px] h-10 bg-[#EBE7DF]" />

            <View className="flex-1 items-center justify-center">
              <Text
                className="text-base text-[#8E8B82] uppercase tracking-wider font-bold mb-4"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                RATING
              </Text>
              <View className="flex-row items-center justify-center gap-1">
                <Icon name="starOutline" size={24} color="#D8C395" />
                <Text
                  className="text-2xl text-[#212842]"
                  style={{ fontFamily: "Newsreader-Bold" }}
                >
                {bookStats?.average_rating
                  ? Number(bookStats.average_rating).toFixed(1)
                  : (averageRating && !isNaN(Number(averageRating)) 
                      ? Number(averageRating).toFixed(1) 
                      : "N/A")}
                </Text>
              </View>
            </View>

            <View className="w-[1px] h-10 bg-[#EBE7DF]" />

            <View className="flex-1 items-center justify-center">
              <Text
                className="text-base text-[#8E8B82] uppercase tracking-wider font-bold mb-4"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                SHELVED
              </Text>
              <Text
                className="text-2xl text-[#212842]"
                style={{ fontFamily: "Newsreader-Bold" }}
              >
                {getFormattedShelvedCount()}
              </Text>
            </View>
          </View>

          {/* Inscribe to Archive Section */}
          <View className="w-full mt-8">
            {existingUserBook ? (
              // Book already in library → show current shelf + update option
              <View className="w-full">
                <View className="w-full rounded-2xl py-4 px-6 flex-row items-center bg-[#EBE7DF]">
                  <Icon name="checkCircle" size={22} color="#4A7C59" />
                  <View className="flex-1 ml-4">
                    <Text style={{ fontFamily: "PublicSans-Bold" }} className="text-[#212842] text-base">
                      Already in your archive
                    </Text>
                    <Text style={{ fontFamily: "PublicSans-Regular" }} className="text-[#76767E] text-sm capitalize">
                      {existingUserBook.status?.replace(/_/g, ' ').toLowerCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={openArchiveSheet}
                    className="bg-[#212842] rounded-full px-4 py-2"
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontFamily: "PublicSans-Bold" }} className="text-white text-sm">Move</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={openArchiveSheet}
                className="w-full rounded-2xl py-5 mt-2 flex-row justify-center items-center bg-[#212842]"
                activeOpacity={0.85}
              >
                <Icon name="plus" size={24} color="#FFFFFF" />
                <Text
                  className="text-[#FFFFFF] text-center text-xl ml-5 py-1"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  INSCRIBE TO MY ARCHIVE
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View className="w-full mt-10">
          <Text className="text-xl font-bold text-[#76767E] tracking-widest mb-4">
            ACQUISITION
          </Text>

          <TouchableOpacity
            onPress={() => openLinkModal(storeLinks.amazon)}
            className={`w-full rounded-2xl py-4 px-6 mt-3 flex-row items-center bg-[#FCF3E0]`}
          >
            <Icon name="amazon" size={24} color="#212842" />
            <Text
              className="text-[#212842] text-xl ml-6 flex-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              AMAZON
            </Text>
            <Icon name="external" size={24} color="#212842" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLinkModal(storeLinks.bookshop)}
            className={`w-full rounded-2xl py-4 px-6 mt-3 flex-row items-center bg-[#FCF3E0]`}
          >
            <Icon name="bookshop" size={24} color="#212842" />
            <Text
              className="text-[#212842] text-xl ml-6 flex-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              BOOKSHOP
            </Text>
            <Icon name="external" size={24} color="#212842" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openLinkModal(storeLinks.google)}
            className={`w-full rounded-2xl py-4 px-6 mt-3 flex-row items-center bg-[#FCF3E0]`}
          >
            <Icon name="google" size={24} color="#212842" />
            <Text
              className="text-[#212842] text-xl ml-6 flex-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              GOOGLE
            </Text>
            <Icon name="external" size={24} color="#212842" />
          </TouchableOpacity>
        </View>

        <View className="w-full pt-16">
          <Text
            className="text-4xl text-[#212842]"
            style={{ fontFamily: "Newsreader-Bold" }}
          >
            Summary
          </Text>
          <Text
            className="text-lg text-[#212842] mb-2 pt-10 leading-relaxed"
            style={{ fontFamily: "PublicSans-Regular" }}
            numberOfLines={isSummaryExpanded ? undefined : 6}
          >
            {(() => {
              const cleanDesc = description 
                ? description.trim().replace(/^[^a-zA-Z0-9ÁÉÍÓÚáéíóúÑñÄËÏÖÜäëïöü]+/, "").trim() 
                : "";
              
              if (cleanDesc.length === 0) return null;
              
              return (
                <>
                  <Text
                    style={{
                      fontFamily: "Newsreader-Bold",
                      fontSize: 56,
                    }}
                  >
                    {cleanDesc.charAt(0)}
                  </Text>
                  {cleanDesc.slice(1)}
                </>
              );
            })()}
          </Text>

          {description && description.length > 200 && (
            <TouchableOpacity
              onPress={() => setIsSummaryExpanded(!isSummaryExpanded)}
              activeOpacity={0.7}
              className="mt-1 mb-4"
            >
              <Text
                className="text-base text-[#76767E] underline"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                {isSummaryExpanded ? "Read less" : "Read more"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reviews Section */}
        <View className="w-full pt-16">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-4xl text-[#212842]"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              The Final Verdict
            </Text>
            {reviews.length > 0 && (
              <TouchableOpacity 
                onPress={() => router.push({ pathname: "/PostReview", params: { bookId, bookName, author, cover } })}
                activeOpacity={0.7}
                className="flex-row items-center border border-[#EBE7DF] bg-[#FFF] shadow-sm px-4 py-2 rounded-full"
              >
                <Icon name="quillWrite" size={16} color="#212842" />
                <Text 
                  className="text-sm text-[#212842] ml-2 tracking-wide" 
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  WRITE
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filters Row */}
          {reviews.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              className="mb-6 flex-row"
              contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
            >
              {/* Sort By Chip */}
              <TouchableOpacity
                onPress={() => setSortBy(prev => prev === 'newest' ? 'highest' : prev === 'highest' ? 'lowest' : 'newest')}
                className="flex-row items-center bg-[#FCF3E0] px-4 py-2 rounded-full border border-[#EBE7DF]"
              >
                <Icon name="dotsY" size={16} color="#212842" />
                <Text className="text-sm text-[#212842] ml-2" style={{ fontFamily: "PublicSans-Bold" }}>
                  Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'highest' ? 'Highest Rating' : 'Lowest Rating'}
                </Text>
              </TouchableOpacity>

              {/* Spoiler Toggle Chip */}
              {reviews.some((r: any) => r.is_spoiler) && (
                <TouchableOpacity
                  onPress={() => setGlobalShowSpoilers(!globalShowSpoilers)}
                  className={`flex-row items-center px-4 py-2 rounded-full border border-[#EBE7DF] ${globalShowSpoilers ? 'bg-[#212842]' : 'bg-[#FCF3E0]'}`}
                >
                  <Icon name={globalShowSpoilers ? 'eyeOutline' : 'eyeClosedSolid'} size={16} color={globalShowSpoilers ? '#FFF' : '#212842'} />
                  <Text className={`text-sm ml-2 ${globalShowSpoilers ? 'text-[#FFF]' : 'text-[#212842]'}`} style={{ fontFamily: "PublicSans-Bold" }}>
                    Spoilers
                  </Text>
                </TouchableOpacity>
              )}

              {/* Rating Filters */}
              {[5, 4, 3, 2, 1].map(rating => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => setFilterRating(prev => prev === rating ? null : rating)}
                  className={`flex-row items-center px-4 py-2 rounded-full border border-[#EBE7DF] ${filterRating === rating ? 'bg-[#212842]' : 'bg-transparent'}`}
                >
                  <Text className={`text-sm ${filterRating === rating ? 'text-[#FFF]' : 'text-[#76767E]'}`} style={{ fontFamily: "PublicSans-Bold" }}>
                    {rating} ★
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {isLoadingReviews ? (
            <Text className="text-center text-[#8E8B82] mt-4" style={{ fontFamily: "PublicSans-Regular" }}>Loading reviews...</Text>
          ) : reviews.length === 0 ? (
            <View className="w-full bg-[#FCF3E0] rounded-2xl p-6 items-center">
              <Icon name="quillWrite" size={48} color="#C95F44" />
              <Text className="text-xl text-[#212842] text-center mt-4 mb-2" style={{ fontFamily: "Newsreader-Bold" }}>
                No reviews yet
              </Text>
              <Text className="text-[#8E8B82] text-center mb-6 leading-relaxed" style={{ fontFamily: "PublicSans-Regular" }}>
                Be the first to share your thoughts on this book. Leave your mark in the archive.
              </Text>
              <TouchableOpacity
                className="w-full rounded-full py-3 items-center border border-[#212842]"
                onPress={() => router.push({ pathname: "/PostReview", params: { bookId, bookName, author, cover } })}
                activeOpacity={0.7}
              >
                <Text className="text-[#212842] text-base" style={{ fontFamily: "PublicSans-Bold" }}>
                  Write a Review
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredAndSortedReviews.length === 0 ? (
            <View className="w-full bg-[#F9F7F2] rounded-2xl p-6 items-center border border-[#EBE7DF]">
              <Icon name="search" size={48} color="#D8C395" />
              <Text className="text-xl text-[#212842] text-center mt-4 mb-2" style={{ fontFamily: "Newsreader-Bold" }}>
                No reviews found
              </Text>
              <Text className="text-[#8E8B82] text-center mb-6 leading-relaxed" style={{ fontFamily: "PublicSans-Regular" }}>
                No one has left a review matching your selected filters.
              </Text>
              <TouchableOpacity
                className="px-6 py-2 rounded-full border border-[#212842]"
                onPress={() => setFilterRating(null)}
                activeOpacity={0.7}
              >
                <Text className="text-[#212842] text-sm" style={{ fontFamily: "PublicSans-Bold" }}>
                  Clear Rating Filter
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="w-full flex-col">
              {filteredAndSortedReviews.slice(0, visibleReviewsCount).map((review: any) => (
                <ReviewItem 
                  key={review.id} 
                  review={review} 
                  currentUserId={user?.id}
                  globalShowSpoilers={globalShowSpoilers}
                  onLike={(id, isLiked) => likeMutation.mutate({ reviewId: id, isLiked })}
                  onComment={(id) => router.push({ pathname: '/CommentsModal', params: { reviewId: id } })}
                  onEdit={(reviewData) => router.push({ pathname: "/PostReview", params: { bookId, bookName, author, cover, reviewId: reviewData.id, initialRating: reviewData.rating.toString(), initialComment: reviewData.comment, initialSpoiler: reviewData.is_spoiler ? "true" : "false" } })}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}

              {visibleReviewsCount < reviews.length ? (
                <TouchableOpacity
                  className="w-full py-4 mt-4 items-center justify-center border border-[#EBE7DF] rounded-xl bg-[#F9F7F2]"
                  onPress={() => setVisibleReviewsCount(prev => prev + 10)}
                  activeOpacity={0.7}
                >
                  <Text className="text-[#4A607A] text-base" style={{ fontFamily: "PublicSans-Bold" }}>
                    Load More Reviews ({reviews.length - visibleReviewsCount} remaining)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="w-full pt-6 pb-2 mt-4 items-center justify-center border-t border-[#EBE7DF]">
                  <Icon name="quillWrite" size={24} color="#D8C395" />
                  <Text className="text-[#8E8B82] text-sm text-center mt-3 tracking-wide" style={{ fontFamily: "PublicSans-Regular" }}>
                    THE ARCHIVES HAVE BEEN FULLY EXPLORED
                  </Text>
                  <Text className="text-[#8E8B82] text-xs text-center mt-1" style={{ fontFamily: "PublicSans-Regular" }}>
                    You have read all the thoughts left by others.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* External Link Modal */}
      {externalLink !== null && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeLinkModal} activeOpacity={1} />
          </Animated.View>
          <Animated.View 
            {...panResponder.panHandlers} 
            style={[styles.modalOverlay, { transform: [{ translateY }] }]} 
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>
                <View className="flex-row items-center justify-between border-b border-[#EBE7DF] pb-4 mb-5 mt-2">
                  <Text
                    style={{ fontFamily: "Newsreader-Bold" }}
                    className="text-3xl text-[#212842]"
                  >
                    Leaving App
                  </Text>
                  <TouchableOpacity
                    onPress={closeLinkModal}
                    className="p-2 rounded-full bg-[#EBE7DF]/50"
                  >
                    <Icon name="cancel" size={20} color="#212842" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="text-base text-[#76767E] mb-8 leading-relaxed"
                >
                  You are about to be redirected to an external website to acquire this book. Do you want to continue?
                </Text>
                <View className="flex-row gap-4">
                  <TouchableOpacity
                    onPress={closeLinkModal}
                    className="flex-1 py-4 items-center justify-center rounded-full bg-[#EBE7DF]"
                  >
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[#212842] text-base uppercase tracking-wider"
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (externalLink) {
                        Linking.openURL(externalLink);
                      }
                      closeLinkModal();
                    }}
                    className="flex-1 py-4 items-center justify-center rounded-full bg-[#212842]"
                  >
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[#FFF8F0] text-base uppercase tracking-wider"
                    >
                      Accept
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      )}

      {/* Inscribe to Archive Sheet */}
      {archiveSheetOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 200 }]} pointerEvents="box-none">
          {/* Backdrop */}
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: archiveOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeArchiveSheet} activeOpacity={1} />
          </Animated.View>

          {/* Sheet */}
          <Animated.View
            {...archivePanResponder.panHandlers}
            style={[styles.modalOverlay, { transform: [{ translateY: archiveTranslateY }] }]}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback>
              <View style={[styles.archiveSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                {/* Handle */}
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>

                {/* Header */}
                <View className="flex-row items-center justify-between mb-2 mt-1">
                  <Text style={{ fontFamily: "Newsreader-Bold" }} className="text-3xl text-[#212842]">
                    Add to Archive
                  </Text>
                  <TouchableOpacity onPress={closeArchiveSheet} className="p-2 rounded-full bg-[#EBE7DF]/60">
                    <Icon name="cancel" size={20} color="#212842" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontFamily: "PublicSans-Italic" }} className="text-sm text-[#9E9B92] mb-6">
                  {bookName}
                </Text>

                {/* ── Primary CTA: Currently Reading ── */}
                <TouchableOpacity
                  onPress={() => handleAddToShelf('CURRENTLY_READING', 'Currently Reading')}
                  activeOpacity={0.85}
                  disabled={addingToShelf !== null}
                  style={styles.primaryShelfBtn}
                >
                  {addingToShelf === 'CURRENTLY_READING' ? (
                    <ActivityIndicator size="small" color="#FFF8F0" />
                  ) : (
                    <>
                      <View style={styles.primaryShelfIcon}>
                        <Icon name="bookOpen" size={22} color="#212842" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={{ fontFamily: "PublicSans-Bold", fontSize: 16, color: "#FFF8F0" }}>
                          Currently Reading
                        </Text>
                        <Text style={{ fontFamily: "PublicSans-Regular", fontSize: 12, color: "rgba(255,248,240,0.65)", marginTop: 2 }}>
                          Start tracking your progress now
                        </Text>
                      </View>
                      <Icon name="arrowRight" size={18} color="rgba(255,248,240,0.6)" />
                    </>
                  )}
                </TouchableOpacity>

                {/* ── Other shelves divider ── */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OTHER SHELVES</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ── Shelf list ── */}
                <View style={{ gap: 8 }}>
                  {shelves
                    .filter((s) => s.id !== 'default-currently-reading')
                    .map((shelf) => {
                      const statusMap: Record<string, string> = {
                        'default-read-later': 'READ_LATER',
                        'default-already-read': 'COMPLETED',
                        'default-favorites': 'READ_LATER', // fallback; favorites are managed locally
                      };
                      const status = statusMap[shelf.id] || 'READ_LATER';
                      const isLoading = addingToShelf === status && shelf.id !== 'default-favorites';
                      const isFavorites = shelf.id === 'default-favorites';

                      return (
                        <TouchableOpacity
                          key={shelf.id}
                          onPress={() => !isFavorites && handleAddToShelf(status, shelf.name)}
                          activeOpacity={isFavorites ? 1 : 0.75}
                          disabled={addingToShelf !== null || isFavorites}
                          style={[styles.secondaryShelfBtn, isFavorites && { opacity: 0.45 }]}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#212842" />
                          ) : (
                            <>
                              <View
                                style={[
                                  styles.secondaryShelfIcon,
                                  { backgroundColor: (shelf.color || '#EBE7DF') + '22' },
                                ]}
                              >
                                <Icon name={shelf.icon || 'library'} size={20} color={shelf.color || '#5C5E69'} />
                              </View>
                              <Text style={{ fontFamily: "PublicSans-Bold", fontSize: 15, color: "#212842", flex: 1, marginLeft: 12 }}>
                                {shelf.name}
                              </Text>
                              {isFavorites ? (
                                <Text style={{ fontFamily: "PublicSans-Regular", fontSize: 11, color: "#9E9B92" }}>Managed locally</Text>
                              ) : (
                                <Icon name="arrowRight" size={16} color="#C0BDB4" />
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#EBE7DF",
    borderRadius: 2,
  },
  archiveSheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  primaryShelfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#212842",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryShelfIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F5DEB3",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryShelfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryShelfIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EBE7DF",
  },
  dividerText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "#B0ADA4",
    letterSpacing: 1.2,
    marginHorizontal: 12,
  },
});

export default BookDetails;
