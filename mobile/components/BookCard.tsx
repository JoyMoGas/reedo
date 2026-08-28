import BookCover from "../components/BookCover";
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import NoCover from '../app/assets/NoCover.svg';

export interface BookCardProps {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  genres?: string;
  totalPages?: string;
  averageRating?: string;
  addedCount?: string;
  description?: string;
  width?: number;
  height?: number;
  onPress?: () => void;
  showText?: boolean;
  titleLines?: number;
  containerClassName?: string;
}

export default function BookCard({
  id,
  title,
  author,
  cover,
  genres,
  totalPages,
  averageRating,
  addedCount,
  description,
  width = 120,
  height = 180,
  onPress,
  showText = true,
  titleLines = 1,
  containerClassName = "mr-6 flex-col items-start"
}: BookCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/BookDetails",
        params: { bookId: id, bookName: title, author: author, cover: cover, genres: genres, totalPages: totalPages, averageRating: averageRating, addedCount: addedCount, description: description }
      });
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{ width }}
      className={containerClassName}
    >
      <View
        className="bg-transparent mb-2 rounded-xl w-full"
      >
        <View className="rounded-xl overflow-hidden bg-[#FCF3E0]" style={{ width, height }}>
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
      {showText && (
        <>
          <Text
            numberOfLines={titleLines}
            className="text-sm font-bold text-[#212842] mt-1 leading-tight"
            style={{ fontFamily: "PublicSans-Bold", width }}
          >
            {title}
          </Text>
          {author && (
            <Text
              numberOfLines={1}
              className="text-xs text-[#76767E] mt-0.5"
              style={{ fontFamily: "PublicSans-Italic", width }}
            >
              {author}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
