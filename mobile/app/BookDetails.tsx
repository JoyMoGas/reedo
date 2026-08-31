/**
 * @project Reedo
 * @module BookDetails
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-04
 */
import BookCover from "../components/BookCover";
import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, Switch, Linking, StyleSheet, TouchableWithoutFeedback, Animated, Dimensions, PanResponder } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import NoCover from "./assets/NoCover.svg";
import Icon from "../core/Icon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/api";
import { ReviewItem } from "../components/book/ReviewItem";
import { useAuthStore } from "../store/useAuthStore";

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
  } = useLocalSearchParams<BookDetailProps>();
  const router = useRouter();
  const width = 180;
  const height = 270;
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [globalShowSpoilers, setGlobalShowSpoilers] = useState(false);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [externalLink, setExternalLink] = useState<string | null>(null);
  
  const { height: screenHeight } = Dimensions.get("window");
  const translateY = React.useRef(new Animated.Value(screenHeight)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

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
          <View className="w-full flex-row items-center justify-between mt-8">
            <TouchableOpacity
              className={`w-full rounded-2xl py-4 mt-2 flex-row justify-center items-center bg-[#212842]`}
            >
              <Icon name="plus" size={24} color="#FFFFFF" />
              <Text
                className="text-[#FFFFFF] text-center text-xl ml-5 py-2"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                INSCRIBE TO MY ARCHIVE
              </Text>
            </TouchableOpacity>
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
});

export default BookDetails;
