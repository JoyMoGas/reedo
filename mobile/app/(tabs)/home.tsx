/**
 * @project Reedo
 * @module home
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useRef, useEffect, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStore } from "../../store/useAuthStore";
import { Avatar } from "../../components/Avatar";
import { useUIStore } from "../../store/useUIStore";
import { useImmersionStore } from "../../store/useImmersionStore";
import api from "../../store/api";
import { useRouter } from "expo-router";
import { queryClient } from "../../store/queryClient";
import KeepReading from "../../components/home/KeepReading";
import DiscoverNext from "../../components/home/DiscoverNext";
import GlobalBookshelf from "../../components/home/GlobalBookshelf";
import DailyQuest from "../../components/home/DailyQuest";
import ReadingPulse from "../../components/home/ReadingPulse";
import FriendsJourneys from "../../components/home/FriendsJourneys";
import CommunityEchoes from "../../components/home/CommunityEchoes";

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const lastScrollY = useRef(0);
  const scrollThreshold = 10;
  const componentsToLoad = useRef(0);

  useEffect(() => {
    setNavbarVisible(true);
    
    // Check for unfinished immersion session
    const timeout = setTimeout(() => {
      const session = useImmersionStore.getState().activeSession;
      if (session) {
        let currentElapsed = session.elapsed;
        if (!session.isPaused && session.expectedTime) {
          currentElapsed += Math.floor((Date.now() - session.expectedTime) / 1000);
          if (session.mode === "timed" && currentElapsed > session.totalSeconds) {
            currentElapsed = session.totalSeconds;
          }
        }
        
        const m = Math.floor(currentElapsed / 60);
        const s = currentElapsed % 60;
        
        Alert.alert(
          "Unfinished Session",
          `You have an unfinished reading session for '${session.title}'. (${m}m ${s}s)\n\nWhat would you like to do?`,
          [
            { 
              text: "Discard", 
              style: "destructive", 
              onPress: () => useImmersionStore.getState().clearSession() 
            },
            { 
              text: "Save & Update", 
              onPress: async () => {
                useImmersionStore.getState().clearSession();
                try {
                  await api.patch("api/books/userbook/", {
                    book_id: session.bookId,
                    session_seconds: currentElapsed,
                  });
                  queryClient.invalidateQueries({ queryKey: ["userBooks"] });
                } catch(e) {}
                router.push({
                  pathname: "/UpdateProgress",
                  params: {
                    userbookId: session.userbookId,
                    bookId: session.bookId,
                    title: session.title,
                    author: session.author,
                    cover: session.cover,
                    pagesRead: session.pagesRead,
                    pagesTotal: session.pagesTotal,
                  },
                });
              }
            },
            { 
              text: "Resume", 
              style: "default", 
              onPress: () => {
                router.push({
                  pathname: "/ImmersionSession",
                  params: { 
                    ...session,
                    elapsed: currentElapsed.toString(),
                    isResume: "true" 
                  }
                });
              }
            }
          ]
        );
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
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
    componentsToLoad.current = 3; // KeepReading, DiscoverNext and GlobalBookshelf
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

        {/* Global Bookshelf Section */}
        <GlobalBookshelf refreshTrigger={refreshTrigger} onLoadEnd={handleLoadEnd} />

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
