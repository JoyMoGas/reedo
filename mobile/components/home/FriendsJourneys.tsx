import React, { useRef, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import mockData from "../../assets/data/mockData.json";
import Icon from "../../core/Icon";
import { Avatar } from "../Avatar";

export default function FriendsJourneys() {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);
  const contentWidthRef = useRef(0);
  const layoutWidthRef = useRef(0);
  const scrollXRef = useRef(0);

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

  return (
    <View className="w-full mt-10">
      <View className="flex-row justify-between items-center w-full mb-4">
        <Text
          className="text-xl font-bold text-[#76767E] tracking-widest"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          FRIENDS’ JOURNEYS
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
        {mockData.books.map((book) => (
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
                  source={{ uri: book.coverUrl }}
                  style={{ width: 120, height: 180 }}
                  resizeMode="cover"
                />
              </View>
              <View
                style={{ width: 49, height: 49 }}
                className="bg-[#FFFFFF] rounded-full absolute -bottom-3 -right-1 justify-center items-center"
              >
                <Avatar
                  uri={""}
                  fullName={book?.author}
                  username={book?.author}
                  size={45}
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
