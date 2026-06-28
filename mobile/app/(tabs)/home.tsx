import React, { useRef, useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStore } from "../../store/useAuthStore";
import { Avatar } from "../../components/Avatar";
import { useUIStore } from "../../store/useUIStore";
import Svg, { Circle } from "react-native-svg";

import mockData from "../../assets/data/mockData.json";
import Icon from "../../core/Icon";
import KeepReading from "../../components/home/KeepReading";
import DiscoverNext from "../../components/home/DiscoverNext";
import DailyQuest from "../../components/home/DailyQuest";
import ReadingPulse from "../../components/home/ReadingPulse";
import FriendsJourneys from "../../components/home/FriendsJourneys";
import CommunityEchoes from "../../components/home/CommunityEchoes";

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const componentsToLoad = useRef(0);

  useEffect(() => {
    setNavbarVisible(true);
  }, []);

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const diff = currentOffset - lastScrollY.current;

    if (Math.abs(diff) > scrollThreshold) {
      if (currentOffset <= 0) {
        setNavbarVisible(true);
      } else if (diff > 0) {
        setNavbarVisible(false);
      } else {
        setNavbarVisible(true);
      }
      lastScrollY.current = currentOffset;
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    componentsToLoad.current = 2; // KeepReading and DiscoverNext
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLoadEnd = () => {
    if (refreshing) {
      componentsToLoad.current -= 1;
      if (componentsToLoad.current <= 0) {
        setRefreshing(false);
      }
    }
  };

  return (
    <SafeAreaView 
      edges={["left", "right"]} 
      className="flex-1 bg-[#FFF8F0]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 60 + 16,
          paddingBottom: insets.bottom + 86 + 40,
        }}
        scrollIndicatorInsets={{
          top: insets.top + 60,
          bottom: insets.bottom + 86,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#212842"]}
            tintColor="#212842"
            progressViewOffset={refreshing ? insets.top + 10 : insets.top + 30}
          />
        }
      >
        {refreshing && <View style={{ height: 30 }} />}

        {/* Keep Reading Section */}
        <KeepReading refreshTrigger={refreshTrigger} onLoadEnd={handleLoadEnd} />

        {/* Discover Carousel Section */}
        <DiscoverNext refreshTrigger={refreshTrigger} onLoadEnd={handleLoadEnd} />

        {/* Daily Literary Quest Section */}
        <DailyQuest />

        {/* The Reading Pulse Section */}
        <ReadingPulse />

        {/* Friends Journeys Carousel Section */}
        <FriendsJourneys />

        {/* Community Echoes Section */}
        <CommunityEchoes />

      </ScrollView>
    </SafeAreaView>
  );
}
