/**
 * @project Reedo
 * @module streak
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Icon from "../core/Icon";
import { Avatar } from "../components/Avatar";
import { useAuthStore } from "../store/useAuthStore";
import { useStreakStore } from "../store/useStreakStore";
import { useNotificationsStore } from "../store/useNotificationsStore";
import StreakGauge from "../components/streak/StreakGauge";
import StreakCalendarView from "../components/streak/StreakCalendarView";
import StreakMilestonesView from "../components/streak/StreakMilestonesView";
import StreakRitualView from "../components/streak/StreakRitualView";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  { key: "calendar", label: "My Streak" },
  { key: "milestones", label: "Milestones" },
  { key: "ritual", label: "The Ritual" },
] as const;

export default function StreakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { hasUnreadNotifications } = useNotificationsStore();
  const {
    data: streakData,
    isLoading,
    isRecovering,
    fetchStreak,
    recoverStreak,
    triggerCelebration,
  } = useStreakStore();

  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 28);
  const scrollRef = useRef<any>(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  const tabWidth = Math.max(0, (containerWidth - 8) / TABS.length);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const currentStreak = streakData?.current_streak ?? 0;
  const bestStreak = streakData?.best_streak ?? 0;
  const freezesAvailable = streakData?.freezes_available ?? 1;
  const isActiveToday = streakData?.is_active_today ?? false;
  const canRecover = streakData?.can_recover ?? false;
  const previousStreak = streakData?.previous_streak ?? 0;

  // Determine next milestone
  const getNextMilestoneNum = (streak: number) => {
    if (streak < 3) return 3;
    if (streak < 7) return 7;
    if (streak < 10) return 10;
    if (streak < 30) return 30;
    if (streak < 100) return 100;
    return 365;
  };
  const nextMilestone = getNextMilestoneNum(currentStreak);

  // Tab switching with synchronized slide animations
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

  // Recovery with freeze
  const handleRecoverWithFreeze = async () => {
    if (freezesAvailable < 1) {
      Alert.alert(
        "No Ink Blots Available",
        "You have no streak protectors available at the moment. Complete an immersion challenge to restore your streak."
      );
      return;
    }
    const success = await recoverStreak("FREEZE");
    if (success) {
      Alert.alert(
        "Streak Restored!",
        "Your literary streak has been successfully preserved with an Ink Blot."
      );
    }
  };

  // Recovery with challenge
  const handleStartImmersionChallenge = () => {
    router.push("/ImmersionSetup");
  };

  // Start reading CTA
  const handleStartReading = () => {
    router.push("/ImmersionSetup");
  };

  // Native share sheet
  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${currentStreak}-day reading streak on Reedo! 📚✨ The ink still flows. Join me and forge your own literary archive.`,
      });
    } catch (e) {
      // Ignored if user cancels share dialog
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Top Bar (Exact Figma Layout) */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <Icon name="arrowLeft" size={20} color="#212842" />
          </TouchableOpacity>

          {/* Flame pill badge (Tapping triggers celebration modal preview) */}
          <TouchableOpacity
            style={styles.flamePill}
            onPress={triggerCelebration}
            activeOpacity={0.7}
            accessibilityLabel="Celebrate streak"
          >
            <Icon name="fireSolid" size={17} color="#FF5A36" />
            <Text style={styles.flamePillText}>{currentStreak}</Text>
          </TouchableOpacity>
        </View>

        {/* Centered Brand Title */}
        <Text style={styles.brandTitle}>REEDO</Text>

        {/* Right Action Icons: Notification & Avatar */}
        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => router.push("/Notifications")}
            style={styles.bellBtn}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Icon name="notification" size={22} color="#212842" />
            {hasUnreadNotifications && <View style={styles.unreadDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ReaderProfile")}
            activeOpacity={0.8}
            accessibilityLabel="Profile"
          >
            <Avatar
              uri={user?.thumbnail}
              fullName={user?.full_name}
              username={user?.username}
              size={32}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Top Navigation Tabs with Smooth Sliding Pill Indicator */}
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
              <Text
                style={[
                  styles.segmentBtnText,
                  isSelected && styles.segmentBtnTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.85}
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
        {/* Page 0: My Streak */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Streak Recovery Alert (Visible if streak can be recovered) */}
            {canRecover && previousStreak > 0 && (
              <View style={styles.recoveryCard}>
                <View style={styles.recoveryHeader}>
                  <Icon name="stars" size={22} color="#D97706" />
                  <Text style={styles.recoveryTitle}>
                    Restore your {previousStreak}-day streak!
                  </Text>
                </View>
                <Text style={styles.recoveryDescription}>
                  Don't let your literary flame flicker out. You have two ways to restore your streak:
                </Text>

                <View style={styles.recoveryActions}>
                  <TouchableOpacity
                    style={styles.recoveryChallengeBtn}
                    onPress={handleStartImmersionChallenge}
                    activeOpacity={0.85}
                  >
                    <Icon name="eyeOutline" size={17} color="#212842" />
                    <Text style={styles.recoveryChallengeText}>
                      Immersion Challenge (10 min)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.recoveryFreezeBtn,
                      freezesAvailable < 1 && { opacity: 0.5 },
                    ]}
                    onPress={handleRecoverWithFreeze}
                    disabled={freezesAvailable < 1 || isRecovering}
                    activeOpacity={0.85}
                  >
                    {isRecovering ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Icon name="snowflake" size={15} color="#FFFFFF" />
                        <Text style={styles.recoveryFreezeText}>
                          Use 1 Ink Blot ({freezesAvailable} available)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <StreakGauge
              currentStreak={currentStreak}
              nextMilestone={nextMilestone}
              isActiveToday={isActiveToday}
              onPress={triggerCelebration}
            />

            <StreakCalendarView
              calendarHistory={streakData?.calendar_history || {}}
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              freezesAvailable={freezesAvailable}
              isActiveToday={isActiveToday}
              onGoToMilestones={() => handleSelectTab(1)}
              onStartReading={handleStartReading}
              onShareStreak={handleShareStreak}
            />
          </ScrollView>
        </View>

        {/* Page 1: Milestones & Rewards */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <StreakGauge
              currentStreak={currentStreak}
              nextMilestone={nextMilestone}
              isActiveToday={isActiveToday}
              onPress={triggerCelebration}
            />

            <StreakMilestonesView
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              freezesAvailable={freezesAvailable}
              onStartReading={handleStartReading}
              onShareMilestone={handleShareStreak}
            />
          </ScrollView>
        </View>

        {/* Page 2: The Ritual of Reading & FAQ */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <StreakRitualView
              onBackToCalendar={() => handleSelectTab(0)}
              onStartReading={handleStartReading}
            />
          </ScrollView>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EBE7DF",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF3E8",
  },
  flamePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE3D3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  flamePillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#212842",
  },
  brandTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 24,
    color: "#212842",
    letterSpacing: 2,
    textAlign: "center",
    flex: 1,
    includeFontPadding: false,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    flex: 1,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5A36",
  },
  segmentedTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FAF3E8",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    padding: 4,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#EBE7DF",
    position: "relative",
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: "#212842",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    backgroundColor: "transparent",
  },
  segmentBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    letterSpacing: 0.2,
    color: "#78716C",
    textAlign: "center",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  recoveryCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  recoveryTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#92400E",
  },
  recoveryDescription: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12.5,
    color: "#78350F",
    lineHeight: 18,
    marginBottom: 14,
  },
  recoveryActions: {
    gap: 8,
  },
  recoveryChallengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2DEC9",
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 10,
    gap: 6,
  },
  recoveryChallengeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#212842",
  },
  recoveryFreezeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0284C7",
    borderRadius: 25,
    paddingVertical: 10,
    gap: 6,
  },
  recoveryFreezeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
});
