import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from "../core/Icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../store/api";

const STAR_LABELS: Record<number, string> = {
  0: "Select a rating",
  1: "Not for me",
  2: "It was okay",
  3: "I liked it",
  4: "Really good",
  5: "A Masterpiece",
};

export default function PostReview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    bookId: string; 
    bookName?: string; 
    author?: string; 
    cover?: string; 
    reviewId?: string; 
    initialRating?: string; 
    initialComment?: string;
    initialSpoiler?: string;
  }>();
  
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(params.initialRating ? parseInt(params.initialRating) : 0);
  const [comment, setComment] = useState(params.initialComment || "");
  const [isSpoiler, setIsSpoiler] = useState(params.initialSpoiler === "true");

  const isEditing = !!params.reviewId;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        rating,
        comment,
        is_spoiler: isSpoiler,
      };

      if (isEditing) {
        const { data } = await api.put(`api/social/reviews/${params.reviewId}/`, payload);
        return data;
      } else {
        const { data } = await api.post(`api/social/books/${params.bookId}/reviews/`, payload);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", params.bookId] });
      router.back();
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F9F7F2]" edges={["top", "left", "right"]}>
      {/* Modal Handle & Header */}
      <View className="items-center pt-2 pb-1">
        <View className="w-12 h-1 bg-[#D9D9D9] rounded-full" />
      </View>
      <View className="w-full flex-row justify-between items-center px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-2 -ml-2">
          <Text className="text-base text-[#8E8B82]" style={{ fontFamily: "PublicSans-Regular" }}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text className="text-xl text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }}>
          {isEditing ? "Edit Verdict" : "The Verdict"}
        </Text>
        <View className="w-14" /> {/* Spacer for centering */}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}>
          
          {/* Book Context */}
          <View className="flex-row items-center bg-[#FFF] rounded-2xl p-4 shadow-sm mb-8 border border-[#EBE7DF]">
            {params.cover ? (
              <Image source={{ uri: params.cover }} className="w-12 h-16 rounded-md bg-[#EBE7DF]" resizeMode="cover" />
            ) : (
              <View className="w-12 h-16 rounded-md bg-[#EBE7DF] items-center justify-center">
                <Icon name="bookOpen" size={20} color="#8E8B82" />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text className="text-base text-[#212842] mb-1" style={{ fontFamily: "PublicSans-Bold" }} numberOfLines={2}>
                {params.bookName || "Unknown Book"}
              </Text>
              <Text className="text-sm text-[#8E8B82]" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>
                {params.author || "Unknown Author"}
              </Text>
            </View>
          </View>

          {/* Star Rating Section */}
          <View className="items-center mb-10">
            <View className="flex-row gap-4 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setRating(star)} 
                  activeOpacity={0.7}
                >
                  <Icon 
                    name={star <= rating ? "star" : "starOutline"} 
                    size={42} 
                    color={star <= rating ? "#C95F44" : "#EBE7DF"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text 
              className={`text-base ${rating > 0 ? "text-[#C95F44]" : "text-[#A9A695]"}`} 
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {STAR_LABELS[rating]}
            </Text>
          </View>

          {/* Review Input */}
          <View className="w-full bg-[#FFF] rounded-2xl p-5 shadow-sm border border-[#EBE7DF] mb-6">
            <TextInput
              className="w-full text-base text-[#212842] leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular", minHeight: 180 }}
              placeholder="What did you think of the book? Be honest, be literary, be you."
              placeholderTextColor="#A9A695"
              multiline
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
            <Text className="text-right text-xs text-[#A9A695] mt-2" style={{ fontFamily: "PublicSans-Regular" }}>
              {comment.length} chars
            </Text>
          </View>

          {/* Spoiler Toggle */}
          <View className="w-full flex-row items-center justify-between bg-[#FFF] rounded-2xl p-4 px-5 shadow-sm border border-[#EBE7DF]">
            <View className="flex-row items-center gap-3">
              <Icon name="eyeClosedSolid" size={20} color={isSpoiler ? "#C95F44" : "#A9A695"} />
              <Text className="text-base text-[#212842]" style={{ fontFamily: "PublicSans-Regular" }}>
                Contains Spoilers
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#EBE7DF", true: "#C95F44" }}
              thumbColor="#FFF"
              ios_backgroundColor="#EBE7DF"
              onValueChange={setIsSpoiler}
              value={isSpoiler}
            />
          </View>
        </ScrollView>

        {/* Floating Post Button */}
        <View className="absolute bottom-0 w-full p-6 bg-[#F9F7F2]">
          <TouchableOpacity
            className={`w-full rounded-full py-4 items-center flex-row justify-center ${(rating === 0 || comment.trim() === "" || saveMutation.isPending) ? "bg-[#EBE7DF]" : "bg-[#212842]"}`}
            onPress={() => saveMutation.mutate()}
            disabled={rating === 0 || comment.trim() === "" || saveMutation.isPending}
            activeOpacity={0.8}
          >
            {saveMutation.isPending ? (
              <Text className="text-[#8E8B82] text-lg" style={{ fontFamily: "PublicSans-Bold" }}>
                POSTING...
              </Text>
            ) : (
              <>
                <Text className={`${(rating === 0 || comment.trim() === "") ? "text-[#8E8B82]" : "text-[#FFF]"} text-lg mr-2`} style={{ fontFamily: "PublicSans-Bold" }}>
                  POST VERDICT
                </Text>
                <Icon name="quillWrite" size={20} color={(rating === 0 || comment.trim() === "") ? "#8E8B82" : "#FFF"} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
