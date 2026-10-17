/**
 * @project Reedo
 * @module LibraryScreen
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 * @description Library screen with smooth sliding indicator tabs and horizontal page transitions.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";
import Icon from "../../core/Icon";
import LibraryShelves from "../../components/library/LibraryShelves";
import LibraryProgress from "../../components/library/LibraryProgress";
import LibraryHonors from "../../components/library/LibraryHonors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { key: "shelves", label: "Shelves", icon: "libraryOutline" },
  { key: "progress", label: "Progress", icon: "stars" },
  { key: "honors", label: "Honors", icon: "medalStarAlt" },
] as const;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);

  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 40);
  const scrollRef = useRef<any>(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabWidth = Math.max(0, (containerWidth - 6) / TABS.length);

  useEffect(() => {
    setNavbarVisible(true);
  }, [setNavbarVisible]);

  // Synchronized tab switching with spring physics
  const handleSelectTab = (index: number) => {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      friction: 8,
      tension: 75,
      useNativeDriver: true,
    }).start();
  };

  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < TABS.length) {
      setActiveIndex(index);
      Animated.spring(tabIndicatorAnim, {
        toValue: index,
        friction: 8,
        tension: 75,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 60 }]}>
      {/* Segmented Top Navigation Tabs with Smooth Sliding Pill */}
      <View
        style={styles.segmentedTabsContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setContainerWidth(w);
        }}
      >
        {/* Animated Sliding Background Pill */}
        <Animated.View
          style={[
            styles.slidingPill,
            {
              width: tabWidth,
              transform: [
                {
                  translateX: tabIndicatorAnim.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, tabWidth, tabWidth * 2],
                  }),
                },
              ],
            },
          ]}
        />

        {TABS.map((tab, idx) => {
          const isSelected = activeIndex === idx;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleSelectTab(idx)}
              style={styles.segmentBtn}
              activeOpacity={0.85}
            >
              <Icon
                name={tab.icon}
                size={15}
                color={isSelected ? "#FFFFFF" : "#78716C"}
              />
              <Text
                style={[
                  styles.segmentBtnText,
                  isSelected && styles.segmentBtnTextActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Sliding Content Pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Page 0: Shelves */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <LibraryShelves />
        </View>

        {/* Page 1: Progress */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <LibraryProgress />
        </View>

        {/* Page 2: Honors */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <LibraryHonors />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF8F0",
  },
  segmentedTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FAF3E8",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 3,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#EBE7DF",
    position: "relative",
  },
  slidingPill: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: "#212842",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
    zIndex: 2,
    backgroundColor: "transparent",
  },
  segmentBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12.5,
    color: "#78716C",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
});
