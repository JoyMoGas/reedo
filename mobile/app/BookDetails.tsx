import React, { useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, Switch } from "react-native";
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
                <Image
                  source={{ uri: cover }}
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

          {/* Global Spoiler Toggle */}
          {reviews.some((r: any) => r.is_spoiler) && (
            <View className="flex-row items-center justify-between bg-[#F9F7F2] p-3 rounded-xl mb-6 border border-[#EBE7DF]">
              <Text className="text-sm text-[#8E8B82]" style={{ fontFamily: "PublicSans-Bold" }}>
                SHOW ALL SPOILERS
              </Text>
              <Switch
                trackColor={{ false: "#EBE7DF", true: "#C95F44" }}
                thumbColor="#FFF"
                ios_backgroundColor="#EBE7DF"
                onValueChange={setGlobalShowSpoilers}
                value={globalShowSpoilers}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
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
          ) : (
            <View className="w-full flex-col">
              {reviews.slice(0, visibleReviewsCount).map((review: any) => (
                <ReviewItem 
                  key={review.id} 
                  review={review} 
                  currentUserId={user?.id}
                  globalShowSpoilers={globalShowSpoilers}
                  onLike={(id, isLiked) => likeMutation.mutate({ reviewId: id, isLiked })}
                  onComment={(id) => console.log("Comment on", id)}
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
    </SafeAreaView>
  );
}

export default BookDetails;
