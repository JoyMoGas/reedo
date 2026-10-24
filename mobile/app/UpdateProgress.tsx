/**
 * @project Reedo
 * @module UpdateProgress
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-09-06
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  TextInput,
  Keyboard,
  PanResponder,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useProgressStore } from "../store/useProgressStore";
import { useStreakStore } from "../store/useStreakStore";
import Icon from "../core/Icon";
import BookCover from "../components/BookCover";
import NoCover from "./assets/NoCover.svg";
import api from "../store/api";

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
};

const formatReadingTime = (totalSeconds: number = 0) => {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const formatReadCount = (count: number = 0) => {
  if (count <= 1) return "1 time";
  return `${count} times`;
};

export default function UpdateProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{
    userbookId: string;
    bookId: string;
    title: string;
    author: string;
    cover: string;
    pagesRead: string;
    pagesTotal: string;
    startedAt?: string;
    finishedAt?: string;
    readingTimeSeconds?: string;
    readCount?: string;
  }>();

  const totalPages = parseInt(params.pagesTotal || "100", 10) || 100;
  const initialPages = parseInt(params.pagesRead || "0", 10) || 0;

  const [currentPage, setCurrentPage] = useState(initialPages);
  const [inputText, setInputText] = useState(initialPages.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRereading, setIsRereading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Fetch current userbook data to get precise live reading stats
  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    },
  });

  const currentUb = userBooksData.find(
    (ub: any) => String(ub.book_id) === String(params.bookId) || String(ub.id) === String(params.userbookId)
  );

  const startedAt = currentUb?.started_at || params.startedAt || null;
  const finishedAtToday = new Date().toLocaleDateString("en-CA");
  const readingTimeSeconds = currentUb?.reading_time_seconds || parseInt(params.readingTimeSeconds || "0", 10) || 0;
  const currentReadCount = currentUb?.read_count || parseInt(params.readCount || "0", 10) || 0;
  const nextReadCount = currentReadCount + 1;

  // Animation for the percentage text bump
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Sheet drag-to-dismiss
  const { height: screenHeight } = Dimensions.get("window");
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  const dismissSheet = () => {
    Keyboard.dismiss();
    Animated.timing(sheetTranslateY, {
      toValue: screenHeight,
      duration: 260,
      useNativeDriver: true,
    }).start(() => router.back());
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      // Only capture vertical downward drags
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetTranslateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 140 || gs.vy > 0.6) {
          dismissSheet();
        } else {
          // Spring back to original position
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const clamp = (val: number) => Math.min(Math.max(val, 0), totalPages);

  const triggerBump = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.18,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const updatePage = (delta: number) => {
    // Use the live inputText as the base so any typed-but-not-committed
    // value is respected before applying the delta
    const base = parseInt(inputText, 10);
    const baseValue = isNaN(base) ? currentPage : clamp(base);
    const next = clamp(baseValue + delta);
    if (next !== baseValue) triggerBump();
    setCurrentPage(next);
    setInputText(next.toString());
    if (next >= totalPages && totalPages > 0) {
      setShowCompletionModal(true);
    }
  };

  // Called when the user finishes typing a number manually
  const commitInputText = () => {
    const parsed = parseInt(inputText, 10);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed);
      setCurrentPage(clamped);
      setInputText(clamped.toString());
      if (clamped !== currentPage) triggerBump();
      if (clamped >= totalPages && totalPages > 0) {
        setShowCompletionModal(true);
      }
    } else {
      // Reset to current value if input is invalid
      setInputText(currentPage.toString());
    }
    Keyboard.dismiss();
  };

  const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  const handleUpdateProgress = async () => {
    // Commit any pending typed value before saving
    const base = parseInt(inputText, 10);
    const pageToSave = isNaN(base) ? currentPage : clamp(base);
    setCurrentPage(pageToSave);
    setInputText(pageToSave.toString());
    Keyboard.dismiss();

    if (pageToSave >= totalPages && totalPages > 0) {
      setShowCompletionModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const localDate = new Date().toLocaleDateString("en-CA");
      // PATCH api/books/userbook/ with book_id + current_page in body
      const res = await api.patch("api/books/userbook/", {
        book_id: params.bookId,
        current_page: pageToSave,
        client_date: localDate,
      });
      
      const originalPages = parseInt(params.pagesRead as string || "0", 10);
      const diff = pageToSave - originalPages;
      if (diff > 0) {
        useProgressStore.getState().addPagesRead(diff);
      }

      if (res.data?.streak) {
        useStreakStore.getState().syncFromLocalAction(res.data.streak);
      } else {
        useStreakStore.getState().fetchStreak();
      }

      await queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      await queryClient.refetchQueries({ queryKey: ["userBooks"] });
      router.navigate("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Error", "Could not update your progress. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkCompleted = () => {
    setCurrentPage(totalPages);
    setInputText(totalPages.toString());
    setShowCompletionModal(true);
  };

  const handleConfirmCompletion = async () => {
    setIsCompleting(true);
    try {
      const localDate = new Date().toLocaleDateString("en-CA");
      const res = await api.patch("api/books/userbook/", {
        book_id: params.bookId,
        status: "COMPLETED",
        current_page: totalPages,
        client_date: localDate,
      });

      const originalPages = parseInt((params.pagesRead as string) || "0", 10);
      const diff = totalPages - originalPages;
      if (diff > 0) {
        useProgressStore.getState().addPagesRead(diff);
      }

      if (res.data?.streak) {
        useStreakStore.getState().syncFromLocalAction(res.data.streak);
      } else {
        useStreakStore.getState().fetchStreak();
      }

      await queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      await queryClient.refetchQueries({ queryKey: ["userBooks"] });
      setShowCompletionModal(false);
      router.navigate("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", "Could not mark as completed. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReread = async () => {
    setIsRereading(true);
    try {
      const localDate = new Date().toLocaleDateString("en-CA");
      const res = await api.patch("api/books/userbook/", {
        book_id: params.bookId,
        action: "REREAD",
        from_completion: true,
        client_date: localDate,
      });

      const originalPages = parseInt((params.pagesRead as string) || "0", 10);
      const diff = totalPages - originalPages;
      if (diff > 0) {
        useProgressStore.getState().addPagesRead(diff);
      }

      if (res.data?.streak) {
        useStreakStore.getState().syncFromLocalAction(res.data.streak);
      } else {
        useStreakStore.getState().fetchStreak();
      }

      await queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      await queryClient.refetchQueries({ queryKey: ["userBooks"] });
      setShowCompletionModal(false);
      Alert.alert(
        "Ready to read again!",
        "Your reading has been recorded as completed and the book has restarted at page 1."
      );
      router.navigate("/(tabs)/home");
    } catch (error) {
      Alert.alert("Error", "Could not restart reading session. Please try again.");
    } finally {
      setIsRereading(false);
    }
  };

  const quickChips = [5, 10, 20, 50];

  return (
    <View style={styles.root}>
      {/* Tap-outside backdrop → dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={dismissSheet}
      />

      {/* Sheet with drag-to-dismiss */}
      <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          {/* Drag pill area — pan responder captures swipe-down gestures */}
          <View {...sheetPanResponder.panHandlers} style={styles.pillArea}>
            <View style={styles.pill} />
          </View>

          {/* Book info row */}
          <View style={styles.bookRow}>
            <View style={styles.coverShadow}>
              {params.cover ? (
                <BookCover
                  uri={params.cover}
                  style={{ width: 48, height: 72, borderRadius: 6 }}
                  resizeMode="cover"
                />
              ) : (
                <NoCover width={48} height={72} style={{ borderRadius: 6 }} />
              )}
            </View>
            <View style={styles.bookMeta}>
              <Text style={styles.bookTitle} numberOfLines={1}>
                {params.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {params.author}
              </Text>
            </View>
          </View>

          {/* Back button */}
          <TouchableOpacity
            onPress={dismissSheet}
            style={[styles.backBtn, { top: insets.top + 16 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrowLeft" size={22} color="#5C5E69" />
          </TouchableOpacity>

          {/* Main heading */}
          <Text style={styles.heading}>Chronicling your Journey</Text>
          <Text style={styles.label}>AT WHAT POINT OF THE NARRATIVE DO YOU FIND YOURSELF?</Text>

          {/* Page counter */}
          <View style={styles.counterRow}>
            <TouchableOpacity
              onPress={() => updatePage(-1)}
              style={styles.counterBtn}
              activeOpacity={0.7}
            >
              <Icon name="minus" size={24} color="#212842" />
            </TouchableOpacity>

            <View style={styles.counterCenter}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TextInput
                  style={styles.counterValue}
                  value={inputText}
                  onChangeText={(txt) => {
                    // Allow only digits while typing
                    if (/^\d*$/.test(txt)) setInputText(txt);
                  }}
                  onBlur={commitInputText}
                  onSubmitEditing={commitInputText}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                  maxLength={5}
                />
              </Animated.View>
              <View style={styles.counterDivider} />
              <Text style={styles.counterTotal}>{totalPages} pages</Text>
            </View>

            <TouchableOpacity
              onPress={() => updatePage(1)}
              style={styles.counterBtn}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={24} color="#212842" />
            </TouchableOpacity>
          </View>

          {/* Quick add chips */}
          <View style={styles.chipsRow}>
            {quickChips.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => updatePage(n)}
                style={styles.chip}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>+{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress hint */}
          <Text style={styles.progressHint}>
            This will mark{" "}
            <Text style={styles.progressHintBold}>{percentage}% of the volume</Text>{" "}
            conquered
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: `${percentage}%` as any },
              ]}
            />
          </View>

          {/* Mark as Completed shortcut */}
          <TouchableOpacity
            onPress={handleMarkCompleted}
            style={styles.completedBtn}
            activeOpacity={0.75}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color="#4A7C59" />
            ) : (
              <>
                <Icon name="checkCircle" size={18} color="#4A7C59" />
                <Text style={styles.completedBtnText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleUpdateProgress}
            style={[styles.ctaBtn, isSaving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF8F0" />
            ) : (
              <Text style={styles.ctaBtnText}>Update My Legacy</Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 100% Completion Bottom Sheet Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCompletionModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalSheet}
          >
            {/* Drag Handle */}
            <View style={styles.modalPill} />

            {/* Achievement Icon / Badge */}
            <View style={styles.modalBadge}>
              <Icon name="checkCircle" size={32} color="#4A7C59" />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.modalTitle}>Volume Conquered!</Text>
            <Text style={styles.modalSubtitle}>
              You have reached 100% of this work. The book will be marked as completed in your personal archive.
            </Text>

            {/* Reading Journey Summary Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeaderRow}>
                <Icon name="bookClockOutline" size={16} color="#76767E" />
                <Text style={styles.statsHeaderTitle}>READING JOURNEY SUMMARY</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>STARTED</Text>
                  <Text style={styles.statValue}>{formatDate(startedAt)}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>FINISHED</Text>
                  <Text style={styles.statValue}>{formatDate(finishedAtToday)}</Text>
                </View>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>TIME READ</Text>
                  <Text style={styles.statValue}>{formatReadingTime(readingTimeSeconds)}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>TIMES READ</Text>
                  <Text style={[styles.statValue, { color: '#4A7C59' }]}>
                    {formatReadCount(nextReadCount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Primary Action: Marcar como Completado */}
            <TouchableOpacity
              onPress={handleConfirmCompletion}
              style={styles.confirmCompletedBtn}
              activeOpacity={0.85}
              disabled={isCompleting || isRereading}
            >
              {isCompleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="checkCircle" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmCompletedBtnText}>Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary Action: Volver a leer */}
            <TouchableOpacity
              onPress={handleReread}
              style={styles.rereadBtn}
              activeOpacity={0.85}
              disabled={isCompleting || isRereading}
            >
              {isRereading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="reloadTime" size={20} color="#FFFFFF" />
                  <Text style={styles.rereadBtnText}>Read Again</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel / Keep Editing */}
            <TouchableOpacity
              onPress={() => setShowCompletionModal(false)}
              style={styles.cancelModalBtn}
              activeOpacity={0.7}
              disabled={isCompleting || isRereading}
            >
              <Text style={styles.cancelModalBtnText}>Keep editing progress</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(33,40,66,0.35)",
    justifyContent: "flex-end",
  },
  topBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
  },
  sheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  pillArea: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D6D1C4",
  },
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EBE7DF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    paddingLeft: 48, // space for back button
  },
  coverShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bookMeta: {
    flex: 1,
    marginLeft: 14,
  },
  bookTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 18,
    color: "#212842",
    marginBottom: 2,
  },
  bookAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 13,
    color: "#76767E",
  },
  heading: {
    fontFamily: "Newsreader-Bold",
    fontSize: 30,
    color: "#212842",
    marginBottom: 6,
  },
  label: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#9E9B92",
    letterSpacing: 0.8,
    marginBottom: 32,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#D6D1C4",
    backgroundColor: "#F5EEDF",
    alignItems: "center",
    justifyContent: "center",
  },
  counterCenter: {
    alignItems: "center",
    marginHorizontal: 28,
  },
  counterValue: {
    fontFamily: "Newsreader-Bold",
    fontSize: 72,
    color: "#212842",
    lineHeight: 80,
    textAlign: "center",
    minWidth: 120,
    padding: 0,
  },
  counterDivider: {
    width: 80,
    height: 1.5,
    backgroundColor: "#D6D1C4",
    marginVertical: 4,
  },
  counterTotal: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "#9E9B92",
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: "#D6D1C4",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  chipText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#5C5E69",
  },
  progressHint: {
    fontFamily: "PublicSans-Italic",
    fontSize: 13,
    color: "#9E9B92",
    textAlign: "center",
    marginBottom: 10,
  },
  progressHintBold: {
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#EBE7DF",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 28,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#212842",
    borderRadius: 999,
  },
  completedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#4A7C59",
    backgroundColor: "transparent",
    marginBottom: 14,
  },
  completedBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#4A7C59",
  },
  ctaBtn: {
    backgroundColor: "#212842",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 4,
  },
  ctaBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#FFF8F0",
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D6D1C4",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EBF4ED",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    color: "#212842",
    fontFamily: "Newsreader-Bold",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#76767E",
    fontFamily: "PublicSans-Regular",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  statsCard: {
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE7DF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statsHeaderTitle: {
    fontSize: 11,
    color: "#76767E",
    fontFamily: "PublicSans-Bold",
    letterSpacing: 1,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: "#76767E",
    fontFamily: "PublicSans-Bold",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    color: "#212842",
    fontFamily: "PublicSans-Bold",
    marginTop: 2,
  },
  statsDivider: {
    height: 1,
    backgroundColor: "#EBE7DF",
    marginVertical: 10,
  },
  confirmCompletedBtn: {
    backgroundColor: "#4A7C59",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#4A7C59",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmCompletedBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "PublicSans-Bold",
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  rereadBtn: {
    backgroundColor: "#212842",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  rereadBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "PublicSans-Bold",
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  cancelModalBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalBtnText: {
    color: "#76767E",
    fontSize: 14,
    fontFamily: "PublicSans-Bold",
  },
});
