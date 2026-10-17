/**
 * @project Reedo
 * @module StreakMilestonesView
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 * @description Scalable, data-driven view for reading milestones, chronicle rewards, and honors.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import Icon from "../../core/Icon";
import {
  CHRONICLE_ITEMS,
  ChronicleCategory,
  ChronicleItem,
  ChronicleUserStats,
} from "../../constants/chronicles";

interface StreakMilestonesViewProps {
  currentStreak: number;
  bestStreak: number;
  freezesAvailable: number;
  booksCount?: number;
  completedBooks?: number;
  onStartReading: () => void;
  onShareMilestone: () => void;
}

const CATEGORY_TABS: { key: ChronicleCategory; label: string }[] = [
  { key: "all", label: "All Chronicles" },
  { key: "streak", label: "Streak Rituals" },
  { key: "ritual", label: "Night Rituals" },
  { key: "reading", label: "Archive Honors" },
];

export default function StreakMilestonesView({
  currentStreak,
  bestStreak,
  freezesAvailable,
  booksCount = 0,
  completedBooks = 0,
  onStartReading,
  onShareMilestone,
}: StreakMilestonesViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ChronicleCategory>("all");

  const userStats: ChronicleUserStats = {
    currentStreak,
    bestStreak,
    booksCount,
    completedBooks,
    hoursRead: Math.floor(currentStreak * 0.5),
    annotationsCount: Math.min(50, currentStreak * 2),
  };

  // Determine next milestone
  const getNextMilestone = (streak: number) => {
    if (streak < 3) return { target: 3, name: "First Sparks", daysLeft: 3 - streak, start: 0 };
    if (streak < 7) return { target: 7, name: "Week of Focus", daysLeft: 7 - streak, start: 3 };
    if (streak < 10) return { target: 10, name: "Scribe's Persistence", daysLeft: 10 - streak, start: 7 };
    if (streak < 30) return { target: 30, name: "Midnight Scholar", daysLeft: 30 - streak, start: 10 };
    if (streak < 100) return { target: 100, name: "Centurion Reader", daysLeft: 100 - streak, start: 30 };
    return { target: 365, name: "The Eternal Reader", daysLeft: 365 - streak, start: 100 };
  };

  const milestone = getNextMilestone(currentStreak);

  // Calculate progress bar percent
  const range = Math.max(1, milestone.target - milestone.start);
  const done = Math.max(0, currentStreak - milestone.start);
  const progressPercent = Math.min(100, Math.max(8, Math.round((done / range) * 100)));

  // Filter chronicles
  const filteredChronicles = CHRONICLE_ITEMS.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  const unlockedCount = CHRONICLE_ITEMS.filter((i) => i.computeUnlocked(userStats)).length;

  return (
    <View style={styles.container}>
      {/* Upcoming Reward Card (Figma Style) */}
      <View style={styles.upcomingCard}>
        <Text style={styles.upcomingLabel}>UPCOMING REWARD</Text>

        <View style={styles.rewardContentRow}>
          <View style={styles.badgeSquare}>
            <Icon name="quillWrite" size={26} color="#212842" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardTitle}>{milestone.name}</Text>
            <Text style={styles.rewardDesc}>
              {milestone.daysLeft} day{milestone.daysLeft === 1 ? "" : "s"} away from your next major
              insignia and a new Ink Blot protector.
            </Text>
          </View>
        </View>

        {/* Progress Bar with End Labels */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.progressLabelsRow}>
            <Text style={styles.progressLabelText}>{currentStreak} DAYS</Text>
            <Text style={styles.progressLabelText}>{milestone.target} DAYS</Text>
          </View>
        </View>
      </View>

      {/* Two Side-by-Side Milestone Quick Cards */}
      <View style={styles.quickCardsRow}>
        {/* Next Milestone */}
        <View style={styles.quickCard}>
          <View style={styles.quickIconCircle}>
            <Icon name="calendarDays" size={18} color="#212842" />
          </View>
          <Text style={styles.quickCardLabel}>NEXT MILESTONE</Text>
          <Text style={styles.quickCardValue}>{milestone.target} Days</Text>
        </View>

        {/* Streak Protectors */}
        <View style={styles.quickCard}>
          <View style={[styles.quickIconCircle, { backgroundColor: "#E0F2FE" }]}>
            <Icon name="snowflake" size={18} color="#0284C7" />
          </View>
          <Text style={styles.quickCardLabel}>STREAK FROZEN</Text>
          <Text style={styles.quickCardValue}>{freezesAvailable}/3</Text>
        </View>
      </View>

      {/* Scalable Chronicle Rewards Section */}
      <View style={styles.chronicleSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Icon name="sealCheck" size={20} color="#212842" />
            <Text style={styles.sectionTitle}>Chronicle Rewards</Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {unlockedCount} / {CHRONICLE_ITEMS.length} UNLOCKED
            </Text>
          </View>
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedCategory(tab.key)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dynamic Chronicle Cards */}
        <View style={styles.chroniclesList}>
          {filteredChronicles.map((item) => {
            const isUnlocked = item.computeUnlocked(userStats);
            const progress = item.computeProgress(userStats);

            return (
              <View
                key={item.id}
                style={[
                  styles.chronicleCardBase,
                  item.theme === "navy" && styles.themeNavyCard,
                  item.theme === "gold" && styles.themeGoldCard,
                  item.theme === "parchment" && styles.themeParchmentCard,
                  item.theme === "ember" && styles.themeEmberCard,
                  item.theme === "emerald" && styles.themeEmeraldCard,
                ]}
              >
                {/* Watermark Icon */}
                {item.watermarkIcon && (
                  <View style={styles.watermarkContainer}>
                    <Icon
                      name={item.watermarkIcon}
                      size={90}
                      color={
                        item.theme === "navy"
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(33, 40, 66, 0.04)"
                      }
                    />
                  </View>
                )}

                {/* Card Header: Title + Icon */}
                <View style={styles.chronicleCardHeader}>
                  <Text
                    style={[
                      styles.chronicleTitle,
                      item.theme === "navy"
                        ? styles.titleLight
                        : styles.titleDark,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={[
                      styles.chronicleIconCircle,
                      item.theme === "navy"
                        ? styles.iconCircleNavy
                        : styles.iconCircleLight,
                    ]}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={item.theme === "navy" ? "#F5DEB3" : "#212842"}
                    />
                  </View>
                </View>

                {/* Description */}
                <Text
                  style={[
                    styles.chronicleDesc,
                    item.theme === "navy" ? styles.descLight : styles.descDark,
                  ]}
                >
                  {item.description}
                </Text>

                {/* Progress Bar (if in progress and not yet unlocked) */}
                {!isUnlocked && progress > 0 && (
                  <View style={styles.chronicleProgressWrapper}>
                    <View style={styles.chronicleProgressTrack}>
                      <View
                        style={[
                          styles.chronicleProgressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor:
                              item.theme === "navy" ? "#F59E0B" : "#212842",
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.chronicleProgressText,
                        item.theme === "navy" ? styles.descLight : styles.descDark,
                      ]}
                    >
                      {progress}% achieved
                    </Text>
                  </View>
                )}

                {/* Card Footer: Reward & Status Pill */}
                <View style={styles.chronicleCardFooter}>
                  <View style={styles.rewardTag}>
                    <Icon
                      name="stars"
                      size={12}
                      color={item.theme === "navy" ? "#FDE68A" : "#D97706"}
                    />
                    <Text
                      style={[
                        styles.rewardTagText,
                        item.theme === "navy" ? styles.descLight : styles.descDark,
                      ]}
                      numberOfLines={1}
                    >
                      {item.reward}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isUnlocked
                        ? styles.statusPillUnlocked
                        : progress > 0
                        ? styles.statusPillProgress
                        : styles.statusPillLocked,
                    ]}
                  >
                    {isUnlocked && (
                      <Icon name="checkCircle" size={11} color="#15803D" />
                    )}
                    <Text
                      style={[
                        styles.statusPillText,
                        isUnlocked
                          ? styles.statusTextUnlocked
                          : progress > 0
                          ? styles.statusTextProgress
                          : styles.statusTextLocked,
                      ]}
                    >
                      {isUnlocked
                        ? "UNLOCKED"
                        : progress > 0
                        ? "IN PROGRESS"
                        : "LOCKED"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={onStartReading}
          style={styles.primaryJourneyBtn}
          activeOpacity={0.88}
        >
          <Icon name="bookOpen" size={18} color="#FFFFFF" />
          <Text style={styles.primaryJourneyText}>CONTINUE MY JOURNEY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShareMilestone}
          style={styles.secondaryShareBtn}
          activeOpacity={0.8}
        >
          <Icon name="share" size={17} color="#212842" />
          <Text style={styles.secondaryShareText}>SHARE THIS MILESTONE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  upcomingCard: {
    backgroundColor: "#FAF3E8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  upcomingLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    color: "#8C827A",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  rewardContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  badgeSquare: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#FCE7AC",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 20,
    color: "#212842",
    marginBottom: 3,
  },
  rewardDesc: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12.5,
    color: "#6B655B",
    lineHeight: 18,
  },
  progressBarWrapper: {
    gap: 6,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E8E2D5",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#212842",
    borderRadius: 4,
  },
  progressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabelText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    letterSpacing: 0.6,
    color: "#8C827A",
  },
  quickCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    flex: 1,
    backgroundColor: "#F7F2EA",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 14,
    alignItems: "center",
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFEAE0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickCardLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 9.5,
    letterSpacing: 1,
    color: "#8C827A",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  quickCardValue: {
    fontFamily: "Newsreader-Bold",
    fontSize: 20,
    color: "#212842",
    includeFontPadding: false,
  },
  chronicleSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
  },
  counterBadge: {
    backgroundColor: "#EFEAE0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterBadgeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 9.5,
    color: "#4A453E",
    letterSpacing: 0.6,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE3D3",
  },
  categoryPillSelected: {
    backgroundColor: "#212842",
    borderColor: "#212842",
  },
  categoryPillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#6B655B",
  },
  categoryPillTextSelected: {
    color: "#FFFFFF",
  },
  chroniclesList: {
    gap: 12,
  },
  chronicleCardBase: {
    borderRadius: 20,
    padding: 18,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  themeNavyCard: {
    backgroundColor: "#212842",
    borderColor: "#2D3759",
  },
  themeGoldCard: {
    backgroundColor: "#FCE7AC",
    borderColor: "#F5D67D",
  },
  themeParchmentCard: {
    backgroundColor: "#FAF3E8",
    borderColor: "#EBE3D3",
  },
  themeEmberCard: {
    backgroundColor: "#FFF0EB",
    borderColor: "#FCD8CC",
  },
  themeEmeraldCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#D1FAE5",
  },
  watermarkContainer: {
    position: "absolute",
    right: -10,
    bottom: -10,
  },
  chronicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  chronicleTitle: {
    fontFamily: "Newsreader-Bold",
    fontStyle: "italic",
    fontSize: 21,
    flex: 1,
    paddingRight: 8,
  },
  titleLight: {
    color: "#FFFFFF",
  },
  titleDark: {
    color: "#212842",
  },
  chronicleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleNavy: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  iconCircleLight: {
    backgroundColor: "rgba(33, 40, 66, 0.08)",
  },
  chronicleDesc: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  descLight: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  descDark: {
    color: "#5C5E69",
  },
  chronicleProgressWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  chronicleProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
  },
  chronicleProgressFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  chronicleProgressText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
  },
  chronicleCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rewardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  rewardTagText: {
    fontFamily: "PublicSans-Medium",
    fontSize: 11,
    flex: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillUnlocked: {
    backgroundColor: "#DCFCE7",
  },
  statusPillProgress: {
    backgroundColor: "rgba(33, 40, 66, 0.08)",
  },
  statusPillLocked: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  statusPillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statusTextUnlocked: {
    color: "#15803D",
  },
  statusTextProgress: {
    color: "#212842",
  },
  statusTextLocked: {
    color: "#8C827A",
  },
  actionButtons: {
    gap: 12,
  },
  primaryJourneyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#212842",
    borderRadius: 30,
    paddingVertical: 15,
    gap: 8,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryJourneyText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  secondaryShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    paddingVertical: 12,
    gap: 8,
  },
  secondaryShareText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    letterSpacing: 1,
    color: "#212842",
    textTransform: "uppercase",
  },
});
