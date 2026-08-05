import React from "react";
import { View, Text, ScrollView, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import NoCover from "./assets/NoCover.svg";

interface BookDetailProps {
  bookId?: string;
  bookName?: string;
  author?: string;
  cover?: string;
}

function BookDetails() {
  const { bookName, author, cover } = useLocalSearchParams<BookDetailProps>();
  const width = 180;
  const height = 270;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default BookDetails;
