/**
 * @project Reedo
 * @module StreakModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 */
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import { useStreakStore } from "../../store/useStreakStore";
import StreakGauge from "./StreakGauge";
import StreakCalendarView from "./StreakCalendarView";
import StreakMilestonesView from "./StreakMilestonesView";
import StreakRitualView from "./StreakRitualView";

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
}

type StreakTab = "calendar" | "milestones" | "ritual";

export default function StreakModal({ visible, onClose }: StreakModalProps) {
  const router = useRouter();
  const { data, isRecovering, recoverStreak } = useStreakStore();
  const [activeTab, setActiveTab] = useState<StreakTab>("calendar");

  const currentStreak = data?.current_streak ?? 0;
  const bestStreak = data?.best_streak ?? 0;
  const freezesAvailable = data?.freezes_available ?? 1;
  const isActiveToday = data?.is_active_today ?? false;
  const canRecover = data?.can_recover ?? false;
  const previousStreak = data?.previous_streak ?? 0;

  const getNextMilestoneNum = (streak: number) => {
    if (streak < 3) return 3;
    if (streak < 7) return 7;
    if (streak < 10) return 10;
    if (streak < 30) return 30;
    if (streak < 100) return 100;
    return 365;
  };
  const nextMilestone = getNextMilestoneNum(currentStreak);

  const handleRecoverWithFreeze = async () => {
    if (freezesAvailable < 1) {
      Alert.alert(
        "No Ink Blots Available",
        "You have no streak protectors available at the moment."
      );
      return;
    }
    const success = await recoverStreak("FREEZE");
    if (success) {
      Alert.alert("Streak Restored!", "Your streak has been restored with an Ink Blot.");
    }
  };

  const handleStartReading = () => {
    onClose();
    router.push("/ImmersionSetup");
  };

  const handleShareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${currentStreak}-day reading streak on Reedo! 📚✨ The ink still flows. Join me and forge your own literary archive.`,
      });
    } catch (e) {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Top Bar with Brand & Close */}
          <View style={styles.headerRow}>
            <View style={styles.flamePill}>
              <Icon name="fireSolid" size={16} color="#FF5A36" />
              <Text style={styles.flamePillText}>{currentStreak}</Text>
            </View>

            <Text style={styles.brandTitle}>REEDO</Text>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Icon name="cancel" size={20} color="#5C5E69" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("calendar")}
              style={[styles.tabButton, activeTab === "calendar" && styles.tabButtonActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabButtonText, activeTab === "calendar" && styles.tabButtonTextActive]}
              >
                My Streak
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("milestones")}
              style={[styles.tabButton, activeTab === "milestones" && styles.tabButtonActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "milestones" && styles.tabButtonTextActive,
                ]}
              >
                Milestones
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab("ritual")}
              style={[styles.tabButton, activeTab === "ritual" && styles.tabButtonActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabButtonText, activeTab === "ritual" && styles.tabButtonTextActive]}
              >
                The Ritual
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scroll Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Streak Recovery Alert */}
            {canRecover && previousStreak > 0 && (
              <View style={styles.recoveryCard}>
                <View style={styles.recoveryHeader}>
                  <Icon name="stars" size={20} color="#D97706" />
                  <Text style={styles.recoveryTitle}>Restore your {previousStreak}-day streak!</Text>
                </View>
                <Text style={styles.recoveryDescription}>
                  Complete an immersion challenge or use an Ink Blot:
                </Text>

                <View style={styles.recoveryActions}>
                  <TouchableOpacity
                    style={styles.recoveryChallengeBtn}
                    onPress={handleStartReading}
                    activeOpacity={0.85}
                  >
                    <Icon name="eyeOutline" size={16} color="#212842" />
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
                          Use 1 Ink Blot ({freezesAvailable} avail.)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === "calendar" && (
              <>
                <StreakGauge
                  currentStreak={currentStreak}
                  nextMilestone={nextMilestone}
                  isActiveToday={isActiveToday}
                />
                <StreakCalendarView
                  calendarHistory={data?.calendar_history || {}}
                  currentStreak={currentStreak}
                  bestStreak={bestStreak}
                  freezesAvailable={freezesAvailable}
                  isActiveToday={isActiveToday}
                  onGoToMilestones={() => setActiveTab("milestones")}
                  onStartReading={handleStartReading}
                  onShareStreak={handleShareStreak}
                />
              </>
            )}

            {activeTab === "milestones" && (
              <>
                <StreakGauge
                  currentStreak={currentStreak}
                  nextMilestone={nextMilestone}
                  isActiveToday={isActiveToday}
                />
                <StreakMilestonesView
                  currentStreak={currentStreak}
                  bestStreak={bestStreak}
                  freezesAvailable={freezesAvailable}
                  onStartReading={handleStartReading}
                  onShareMilestone={handleShareStreak}
                />
              </>
            )}

            {activeTab === "ritual" && (
              <StreakRitualView
                onBackToCalendar={() => setActiveTab("calendar")}
                onStartReading={handleStartReading}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 40, 66, 0.45)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "92%",
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  flamePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE3D3",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  flamePillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#212842",
  },
  brandTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
    letterSpacing: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FAF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FAF3E8",
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 3,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EBE7DF",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#212842",
  },
  tabButtonText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11.5,
    color: "#78716C",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  recoveryCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
  },
  recoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  recoveryTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#92400E",
  },
  recoveryDescription: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "#78350F",
    lineHeight: 17,
    marginBottom: 10,
  },
  recoveryActions: {
    gap: 8,
  },
  recoveryChallengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingVertical: 10,
    borderRadius: 10,
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
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  recoveryFreezeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#FFFFFF",
  },
});
