/**
 * @project Reedo
 * @module ReviewItem
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-10
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Avatar } from "../Avatar";
import Icon from "../../core/Icon";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string | null;
}

interface Review {
  id: string;
  user: User;
  book_id: string;
  rating: number;
  comment: string;
  is_spoiler: boolean;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface ReviewItemProps {
  review: Review;
  currentUserId?: string;
  globalShowSpoilers?: boolean;
  onLike?: (id: string, isLiked: boolean) => void;
  onComment?: (id: string) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (id: string) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "1 DAY AGO";
  return `${diffDays} DAYS AGO`;
};

export const ReviewItem: React.FC<ReviewItemProps> = ({ review, currentUserId, globalShowSpoilers, onLike, onComment, onEdit, onDelete }) => {
  const [isSpoilerRevealed, setIsSpoilerRevealed] = useState(false);
  const hasFullName = review.user.first_name || review.user.last_name;
  const fullName = hasFullName 
    ? `${review.user.first_name || ''} ${review.user.last_name || ''}`.trim() 
    : review.user.username;
  const isMine = currentUserId === review.user.id;

  const showSpoiler = !review.is_spoiler || globalShowSpoilers || isSpoilerRevealed;

  return (
    <View className="w-full py-6 border-b border-[#EBE7DF]">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1 pr-4">
          <Avatar 
            uri={review.user.avatar} 
            fullName={fullName} 
            username={review.user.username} 
            size={40} 
          />
          <View className="ml-3 flex-1">
            <Text 
              className="text-base text-[#212842]" 
              style={{ fontFamily: "PublicSans-Bold" }}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            <Text 
              className="text-xs text-[#8E8B82] uppercase tracking-wider mt-0.5" 
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              {formatDate(review.created_at)}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Icon 
              key={star} 
              name="star" 
              size={16} 
              color={star <= review.rating ? "#C95F44" : "#EBE7DF"}
            />
          ))}
        </View>
      </View>

      {showSpoiler ? (
        <Text 
          className="text-[17px] text-[#4A4B57] leading-relaxed mb-4" 
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          {review.comment}
        </Text>
      ) : (
        <TouchableOpacity 
          className="w-full bg-[#EBE7DF] rounded-xl p-4 mb-4 items-center justify-center border border-[#D9D9D9]"
          onPress={() => setIsSpoilerRevealed(true)}
          activeOpacity={0.8}
        >
          <Icon name="eyeClosedSolid" size={24} color="#8E8B82" />
          <Text 
            className="text-sm text-[#4A4B57] mt-2 text-center" 
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            Contains Spoilers
          </Text>
          <Text 
            className="text-xs text-[#8E8B82] mt-1" 
            style={{ fontFamily: "PublicSans-Regular" }}
          >
            Tap to reveal review
          </Text>
        </TouchableOpacity>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-6">
          <TouchableOpacity 
            className="flex-row items-center gap-2"
            onPress={() => onLike?.(review.id, review.is_liked)}
            activeOpacity={0.7}
          >
            <Icon 
              name={review.is_liked ? "heartFilled" : "heart"} 
              size={20} 
              color={review.is_liked ? "#C95F44" : "#8E8B82"} 
            />
            <Text 
              className="text-base text-[#8E8B82]" 
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              {review.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center gap-2"
            onPress={() => onComment ? onComment(review.id) : undefined}
            activeOpacity={0.7}
          >
            <Icon name="comment" size={20} color="#8E8B82" />
            <Text 
              className="text-base text-[#8E8B82]" 
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              {review.comments_count}
            </Text>
          </TouchableOpacity>
        </View>

        {isMine && (
          <View className="flex-row items-center gap-4">
            <TouchableOpacity onPress={() => onEdit?.(review)} activeOpacity={0.7}>
              <Icon name="fileEdit" size={20} color="#8E8B82" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete?.(review.id)} activeOpacity={0.7}>
              <Icon name="cancel" size={20} color="#8E8B82" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
