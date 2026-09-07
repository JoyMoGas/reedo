/**
 * @project Reedo
 * @module ImmersionSession
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-09-06
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Icon from "../core/Icon";
import BookCover from "../components/BookCover";
import NoCover from "./assets/NoCover.svg";
import api from "../store/api";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Circular Progress ─────────────────────────────────────────────────────

const RING_SIZE = 220;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface RingProps {
  progress: number; // 0..1 (filled fraction)
}

function CircularRing({ progress }: RingProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = CIRCUMFERENCE * (1 - clampedProgress);

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: "-90deg" }] }}>
      {/* Track */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="rgba(255,248,240,0.10)"
        strokeWidth={STROKE_WIDTH}
        fill="none"
      />
      {/* Progress */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="#F5DEB3"
        strokeWidth={STROKE_WIDTH}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Infinite Pulse Ring ───────────────────────────────────────────────────

function PulseRing() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
      ]}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ImmersionSessionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{
    mode: "timed" | "infinite";
    minutes: string;
    userbookId: string;
    bookId: string;
    title: string;
    author: string;
    cover: string;
    pagesRead: string;
    pagesTotal: string;
  }>();

  const mode = params.mode ?? "timed";
  const [totalSeconds, setTotalSeconds] = useState((parseInt(params.minutes || "25", 10) || 25) * 60);

  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = totalSeconds - elapsed;
  const isCompleted = mode === "timed" && remaining <= 0;

  const goToUpdateProgress = async () => {
    // Log reading time to backend
    if (elapsed > 0) {
      try {
        await api.patch("api/books/userbook/", {
          book_id: params.bookId,
          session_seconds: elapsed,
        });
      } catch (error) {
        console.warn("Could not save reading time", error);
      }
    }

    router.push({
      pathname: "/UpdateProgress",
      params: {
        userbookId: params.userbookId,
        bookId: params.bookId,
        title: params.title,
        author: params.author,
        cover: params.cover,
        pagesRead: params.pagesRead,
        pagesTotal: params.pagesTotal,
      },
    });
  };

  const addTime = (minutesToAdd: number) => {
    setTotalSeconds(prev => prev + minutesToAdd * 60);
    startInterval();
  };

  // ── Timer logic ──────────────────────────────────────────────────────────
  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (mode === "timed" && prev + 1 >= totalSeconds) {
          clearInterval(intervalRef.current!);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);
  }, [mode, totalSeconds]);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isCompleted) {
      Alert.alert(
        "Session Complete! 📖",
        `You read for ${Math.floor(totalSeconds / 60)} minutes. Well done, Reader.`,
        [
          { text: "+15 Minutes", onPress: () => addTime(15), style: "cancel" },
          { text: "+30 Minutes", onPress: () => addTime(30) },
          { text: "Finish & Update Progress", onPress: goToUpdateProgress, style: "default" }
        ]
      );
    }
  }, [isCompleted]);

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      startInterval();
    } else {
      setIsPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  // ── Confirm exit ─────────────────────────────────────────────────────────
  const confirmExit = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    Alert.alert(
      "Exit Session?",
      "Would you like to save your reading time and update your progress?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            if (!isPaused) startInterval();
          },
        },
        {
          text: "Exit without Saving",
          style: "destructive",
          onPress: () => router.back(),
        },
        {
          text: "Save & Update Progress",
          style: "default",
          onPress: goToUpdateProgress,
        },
      ]
    );
  };

  const confirmFinishEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    Alert.alert(
      "Finish Early?",
      `You've read for ${elapsedMin}m ${elapsedSec}s.`,
      [
        {
          text: "Continue Reading",
          style: "cancel",
          onPress: () => {
            if (!isPaused) startInterval();
          },
        },
        {
          text: "Update Progress",
          onPress: goToUpdateProgress,
        },
      ]
    );
  };

  const confirmStopInfinite = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    Alert.alert(
      "Stop Session?",
      `Total time: ${formatStopwatch(elapsed)}`,
      [
        {
          text: "Keep Going",
          style: "cancel",
          onPress: () => {
            if (!isPaused) startInterval();
          },
        },
        {
          text: "Update Progress",
          onPress: goToUpdateProgress,
        },
      ]
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const progress = mode === "timed" ? elapsed / totalSeconds : 0;
  const displayTime =
    mode === "timed" ? formatCountdown(Math.max(0, remaining)) : formatStopwatch(elapsed);

  return (
    <View style={styles.root}>
      {/* Close button */}
      <TouchableOpacity
        onPress={confirmExit}
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon name="cancel" size={22} color="#FFF8F0" />
      </TouchableOpacity>

      {/* Book cover */}
      <View style={styles.coverWrap}>
        {params.cover ? (
          <BookCover
            uri={params.cover}
            style={{ width: 80, height: 118, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <NoCover width={80} height={118} style={{ borderRadius: 8 }} />
        )}
      </View>

      {/* Book title */}
      <Text style={styles.focusLabel}>Focusing on</Text>
      <Text style={styles.bookTitle} numberOfLines={2}>
        '{params.title}'
      </Text>

      {/* Timer / Stopwatch visual */}
      <View style={styles.timerWrap}>
        {mode === "timed" ? (
          <View style={styles.ringContainer}>
            <CircularRing progress={progress} />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.ringCenter}>
                <Text style={[styles.timeText, isPaused && styles.timeTextPaused]}>
                  {displayTime}
                </Text>
                <View style={styles.remainingRow}>
                  <Icon name="moon" size={12} color="rgba(255,248,240,0.45)" />
                  <Text style={styles.remainingLabel}>
                    {isPaused ? "PAUSED" : "MINUTES REMAINING"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.infiniteTimerWrap}>
            <PulseRing />
            <View style={styles.infiniteCenter}>
              <Text style={[styles.timeText, isPaused && styles.timeTextPaused]}>
                {displayTime}
              </Text>
              <Text style={styles.remainingLabel}>
                {isPaused ? "PAUSED" : "TIME ELAPSED"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Pause / Resume */}
      <TouchableOpacity
        onPress={togglePause}
        style={styles.pauseBtn}
        activeOpacity={0.85}
      >
        <Icon name={isPaused ? "play" : "pause"} size={20} color="#212842" />
        <Text style={styles.pauseBtnText}>
          {isPaused ? "Resume Session" : "Pause Session"}
        </Text>
      </TouchableOpacity>

      {/* Add Note */}
      <TouchableOpacity
        onPress={() => setNoteVisible(true)}
        style={styles.noteBtn}
        activeOpacity={0.75}
      >
        <Icon name="pencil" size={15} color="rgba(255,248,240,0.55)" />
        <Text style={styles.noteBtnText}>ADD NOTE</Text>
      </TouchableOpacity>

      {/* Finish Early / Stop */}
      <TouchableOpacity
        onPress={mode === "timed" ? confirmFinishEarly : confirmStopInfinite}
        activeOpacity={0.7}
        style={{ marginTop: 14, paddingVertical: 6 }}
      >
        <Text style={styles.finishEarlyText}>
          {mode === "timed" ? "FINISH EARLY" : "STOP SESSION"}
        </Text>
      </TouchableOpacity>

      {/* ── Add Note Modal ── */}
      <Modal
        visible={noteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.noteModalRoot}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setNoteVisible(false)}
          />
          <View style={[styles.noteSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.noteHandle} />
            <View style={styles.noteHeader}>
              <Text style={styles.noteHeading}>Add a Note</Text>
              <TouchableOpacity onPress={() => setNoteVisible(false)}>
                <Icon name="cancel" size={20} color="#212842" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteSubheading}>
              Capture your thoughts at this moment.
            </Text>
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="Write your thoughts here..."
              placeholderTextColor="#C0BDB4"
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={() => {
                // TODO: persist note via API
                setNoteText("");
                setNoteVisible(false);
              }}
              style={styles.noteSaveBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.noteSaveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const { width: SCREEN_W } = Dimensions.get("window");

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#212842",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  closeBtn: {
    position: "absolute",
    right: 22,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,248,240,0.10)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  coverWrap: {
    marginTop: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  focusLabel: {
    fontFamily: "PublicSans-Regular",
    fontSize: 14,
    color: "rgba(255,248,240,0.5)",
    marginTop: 20,
    textAlign: "center",
  },
  bookTitle: {
    fontFamily: "Newsreader-BoldItalic",
    fontSize: 22,
    color: "#FFF8F0",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 30,
    maxWidth: SCREEN_W - 80,
  },
  timerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  // Timed ring
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontFamily: "Newsreader-Bold",
    fontSize: 52,
    color: "#FFF8F0",
    textAlign: "center",
  },
  timeTextPaused: {
    opacity: 0.5,
  },
  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  remainingLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "rgba(255,248,240,0.4)",
    letterSpacing: 1.2,
  },
  // Infinite ring
  infiniteTimerWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: RING_SIZE - 20,
    height: RING_SIZE - 20,
    borderRadius: (RING_SIZE - 20) / 2,
    borderWidth: 2.5,
    borderColor: "rgba(245,222,179,0.3)",
  },
  infiniteCenter: {
    alignItems: "center",
  },
  // Buttons
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 999,
    paddingHorizontal: 36,
    paddingVertical: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  pauseBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#212842",
  },
  noteBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,248,240,0.18)",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 11,
    marginTop: 12,
    gap: 8,
  },
  noteBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "rgba(255,248,240,0.55)",
    letterSpacing: 1.2,
  },
  finishEarlyText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "rgba(255,248,240,0.35)",
    letterSpacing: 1.4,
    textDecorationLine: "underline",
  },
  // Note Modal
  noteModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  noteSheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 14,
  },
  noteHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D6D1C4",
    alignSelf: "center",
    marginBottom: 18,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noteHeading: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
  },
  noteSubheading: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#9E9B92",
    marginBottom: 14,
  },
  noteInput: {
    backgroundColor: "#F5EEDF",
    borderRadius: 14,
    padding: 16,
    fontFamily: "PublicSans-Regular",
    fontSize: 15,
    color: "#212842",
    minHeight: 130,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  noteSaveBtn: {
    backgroundColor: "#212842",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  noteSaveBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#FFF8F0",
  },
});
