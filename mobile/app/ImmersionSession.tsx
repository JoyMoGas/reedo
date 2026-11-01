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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Icon from "../core/Icon";
import BookCover from "../components/BookCover";
import NoCover from "./assets/NoCover.svg";
import api from "../store/api";
import { useImmersionStore } from "../store/useImmersionStore";
import { useStreakStore } from "../store/useStreakStore";
import { queryClient } from "../store/queryClient";
import InterruptedSessionModal from "../components/immersion/InterruptedSessionModal";
import { useHonorToastStore } from "../store/useHonorToastStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSyncQueueStore } from "../store/useSyncQueueStore";
import {
  useReadingNotesStore,
  formatImmersionTimestamp,
} from "../store/useReadingNotesStore";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
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
    isRecoveryChallenge?: string;
    // Resume params
    isResume?: string;
    totalSeconds?: string;
    elapsed?: string;
    expectedTime?: string;
    isPaused?: string;
  }>();

  const mode = params.mode ?? "timed";
  const [totalSeconds, setTotalSeconds] = useState(() => 
    params.isResume === "true" && params.totalSeconds ? parseInt(params.totalSeconds, 10) : (parseInt(params.minutes || "25", 10) || 25) * 60
  );

  const [elapsed, setElapsed] = useState(() => 
    params.isResume === "true" && params.elapsed ? parseInt(params.elapsed, 10) : 0
  );
  const [isPaused, setIsPaused] = useState(() => 
    params.isResume === "true" && params.isPaused === "true"
  );
  const [noteVisible, setNoteVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notePageText, setNotePageText] = useState(() => {
    const initialPage = parseInt(params.pagesRead || "0", 10);
    return initialPage > 0 ? String(initialPage) : "";
  });
  const [noteError, setNoteError] = useState<string | null>(null);
  const [latestSessionPage, setLatestSessionPage] = useState(() =>
    Math.max(0, parseInt(params.pagesRead || "0", 10) || 0)
  );
  const [sessionNotesCount, setSessionNotesCount] = useState(0);
  const [noteSavedBanner, setNoteSavedBanner] = useState<{
    page: number;
    timeLabel: string;
  } | null>(null);
  const noteBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addReadingNote = useReadingNotesStore((state) => state.addNote);
  const [isFinishing, setIsFinishing] = useState(false);
  const isFinishedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expectedTimeRef = useRef<number | null>(
    params.isResume === "true" && params.expectedTime && params.expectedTime !== "null"
      ? parseInt(params.expectedTime, 10)
      : null
  );

  const saveSession = useImmersionStore(state => state.saveSession);
  const clearSession = useImmersionStore(state => state.clearSession);

  const remaining = totalSeconds - elapsed;
  const isCompleted = mode === "timed" && remaining <= 0;

  const openNoteModal = () => {
    setNoteError(null);
    if (!notePageText && latestSessionPage > 0) {
      setNotePageText(String(latestSessionPage));
    }
    setNoteVisible(true);
  };

  const handleSaveNote = () => {
    const parsedPage = parseInt(notePageText.trim(), 10);
    const maxPages = parseInt(params.pagesTotal || "0", 10);

    if (!notePageText.trim() || isNaN(parsedPage) || parsedPage <= 0) {
      setNoteError("Please enter the page number you are currently on.");
      return;
    }
    if (maxPages > 0 && parsedPage > maxPages) {
      setNoteError(`Page number cannot exceed ${maxPages} total pages.`);
      return;
    }
    if (!noteText.trim()) {
      setNoteError("Please write your note before saving.");
      return;
    }

    const capturedSeconds = elapsed;
    addReadingNote({
      bookId: String(params.bookId || params.userbookId || ""),
      userbookId: params.userbookId ? String(params.userbookId) : undefined,
      bookTitle: params.title || "Untitled Book",
      bookAuthor: params.author || "Unknown Author",
      bookCover: params.cover || undefined,
      pageNumber: parsedPage,
      immersionSeconds: capturedSeconds,
      content: noteText.trim(),
    });

    if (parsedPage > latestSessionPage) {
      setLatestSessionPage(parsedPage);
    }
    setNotePageText(String(parsedPage));
    setNoteText("");
    setNoteError(null);
    setNoteVisible(false);
    setSessionNotesCount((prev) => prev + 1);

    if (noteBannerTimerRef.current) {
      clearTimeout(noteBannerTimerRef.current);
    }
    setNoteSavedBanner({
      page: parsedPage,
      timeLabel: formatImmersionTimestamp(capturedSeconds),
    });
    noteBannerTimerRef.current = setTimeout(() => {
      setNoteSavedBanner(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (noteBannerTimerRef.current) {
        clearTimeout(noteBannerTimerRef.current);
      }
    };
  }, []);

  const goToUpdateProgress = async () => {
    if (isFinishing) return;
    setIsFinishing(true);

    // Stop timer interval immediately and flag as finished
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isFinishedRef.current = true;
    clearSession();

    // Log reading time to backend with outbox queue
    if (elapsed > 0) {
      const localDate = new Date().toLocaleDateString("en-CA");
      const points = elapsed >= 180 ? Math.max(1, Math.floor(elapsed / 180)) : 0;

      // 1. Optimistic points and user reading time
      if (points > 0) {
        useHonorToastStore.getState().showToast({
          points,
          title: "Immersion Concluded",
          message: `+${points} Honor Points for focused reading!`,
        });
      }

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().addReadingTime(elapsed);
        if (points > 0) {
          useAuthStore.getState().setUser({
            ...useAuthStore.getState().user!,
            honor_points: (currentUser.honor_points || 0) + points,
          });
        }
      }

      // 2. If this was a Streak Recovery Challenge (or user can recover and completed >= 10m), trigger streak recovery
      const canRecoverStreak = useStreakStore.getState().data?.can_recover;
      if (params.isRecoveryChallenge === "true" || (canRecoverStreak && elapsed >= 600)) {
        useStreakStore
          .getState()
          .recoverStreak("IMMERSION", {
            book_id: params.bookId,
            session_seconds: elapsed,
          })
          .catch(() => {});
      }

      // 3. Enqueue persistent outbox request
      useSyncQueueStore.getState().enqueue({
        type: "IMMERSION_SESSION",
        endpoint: "api/books/userbook/",
        method: "PATCH",
        payload: {
          book_id: params.bookId,
          session_seconds: elapsed,
          client_date: localDate,
        },
        title: "Immersion Session",
        queryKeysToInvalidate: [
          ["userBooks"],
          ["currentUser"],
          ["profileDetail", currentUser?.id],
        ],
      });
    }

    setSessionModalVisible(false);
    setIsFinishing(false);

    router.replace({
      pathname: "/UpdateProgress",
      params: {
        userbookId: params.userbookId,
        bookId: params.bookId,
        title: params.title,
        author: params.author,
        cover: params.cover,
        pagesRead: String(
          Math.max(
            latestSessionPage,
            parseInt(params.pagesRead || "0", 10) || 0
          )
        ),
        pagesTotal: params.pagesTotal,
        fromImmersion: "true",
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
    
    if (expectedTimeRef.current === null) {
      expectedTimeRef.current = Date.now();
    }
    
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - expectedTimeRef.current!;
      const secondsPassed = Math.floor(deltaMs / 1000);
      
      if (secondsPassed > 0) {
        expectedTimeRef.current! += secondsPassed * 1000;
        
        setElapsed((prev) => {
          const nextElapsed = prev + secondsPassed;
          if (mode === "timed" && nextElapsed >= totalSeconds) {
            clearInterval(intervalRef.current!);
            return totalSeconds;
          }
          return nextElapsed;
        });
      }
    }, 1000);
  }, [mode, totalSeconds]);

  useEffect(() => {
    if (!isPaused) {
      startInterval();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isFinishedRef.current) return;
    if (elapsed > 0 || isPaused) {
      saveSession({
        mode,
        minutes: params.minutes || "25",
        userbookId: params.userbookId,
        bookId: params.bookId,
        title: params.title,
        author: params.author,
        cover: params.cover,
        pagesRead: params.pagesRead,
        pagesTotal: params.pagesTotal,
        totalSeconds,
        elapsed,
        expectedTime: expectedTimeRef.current,
        isPaused,
      });
    }
  }, [elapsed, isPaused, totalSeconds, mode, saveSession]);

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionModalConfig, setSessionModalConfig] = useState<{
    title: string;
    subtitle: string;
    timeReadText?: string;
    badgeType: "interrupted" | "warning" | "completed";
    primaryButtonText: string;
    primaryButtonIcon: string;
    onPrimaryAction: () => void;
    secondaryButtonText?: string;
    secondaryButtonIcon?: string;
    onSecondaryAction?: () => void;
    discardButtonText?: string;
    onDiscardAction?: () => void;
  }>({
    title: "",
    subtitle: "",
    timeReadText: "",
    badgeType: "interrupted",
    primaryButtonText: "Save & Update Progress",
    primaryButtonIcon: "checkCircle",
    onPrimaryAction: () => {},
  });

  useEffect(() => {
    if (isCompleted) {
      const minutesRead = Math.floor(totalSeconds / 60);
      setSessionModalConfig({
        title: "Session Complete! 📖",
        subtitle: `Well done, Reader! You fulfilled your ${minutesRead}-minute immersion goal.`,
        timeReadText: `${minutesRead}m reading goal completed`,
        badgeType: "completed",
        primaryButtonText: "Finish & Update Progress",
        primaryButtonIcon: "checkCircle",
        onPrimaryAction: () => {
          goToUpdateProgress();
        },
        secondaryButtonText: "+15 Minutes",
        secondaryButtonIcon: "plus",
        onSecondaryAction: () => {
          setSessionModalVisible(false);
          addTime(15);
        },
        discardButtonText: "+30 Minutes",
        onDiscardAction: () => {
          setSessionModalVisible(false);
          addTime(30);
        },
      });
      setSessionModalVisible(true);
    }
  }, [isCompleted]);

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      expectedTimeRef.current = Date.now();
      startInterval();
    } else {
      setIsPaused(true);
      expectedTimeRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  // ── Confirm exit ─────────────────────────────────────────────────────────
  const confirmExit = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    setSessionModalConfig({
      title: "Exit Reading Session?",
      subtitle: "Your immersion session was interrupted. Would you like to save your reading time or continue reading?",
      timeReadText: `${m}m ${s}s read`,
      badgeType: "interrupted",
      primaryButtonText: "Save & Update Progress",
      primaryButtonIcon: "checkCircle",
      onPrimaryAction: () => {
        goToUpdateProgress();
      },
      secondaryButtonText: "Resume Session",
      secondaryButtonIcon: "reloadTime",
      onSecondaryAction: () => {
        setSessionModalVisible(false);
        if (!isPaused) startInterval();
      },
      discardButtonText: "Exit without Saving",
      onDiscardAction: () => {
        isFinishedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSessionModalVisible(false);
        clearSession();
        router.back();
      },
    });
    setSessionModalVisible(true);
  };

  const confirmFinishEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    setSessionModalConfig({
      title: "Finish Session Early?",
      subtitle: `You have completed ${m}m ${s}s of focused reading. Ready to log your page progress?`,
      timeReadText: `${m}m ${s}s read`,
      badgeType: "warning",
      primaryButtonText: "Save & Update Progress",
      primaryButtonIcon: "checkCircle",
      onPrimaryAction: () => {
        goToUpdateProgress();
      },
      secondaryButtonText: "Continue Reading",
      secondaryButtonIcon: "reloadTime",
      onSecondaryAction: () => {
        setSessionModalVisible(false);
        if (!isPaused) startInterval();
      },
      discardButtonText: "Discard Session",
      onDiscardAction: () => {
        isFinishedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSessionModalVisible(false);
        clearSession();
        router.back();
      },
    });
    setSessionModalVisible(true);
  };

  const confirmStopInfinite = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    setSessionModalConfig({
      title: "Conclude Reading Session?",
      subtitle: `You have immersed for ${formatStopwatch(elapsed)}. Would you like to record your reading time?`,
      timeReadText: `${m}m ${s}s read`,
      badgeType: "warning",
      primaryButtonText: "Save & Update Progress",
      primaryButtonIcon: "checkCircle",
      onPrimaryAction: () => {
        goToUpdateProgress();
      },
      secondaryButtonText: "Keep Going",
      secondaryButtonIcon: "reloadTime",
      onSecondaryAction: () => {
        setSessionModalVisible(false);
        if (!isPaused) startInterval();
      },
      discardButtonText: "Discard Session",
      onDiscardAction: () => {
        isFinishedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSessionModalVisible(false);
        clearSession();
        router.back();
      },
    });
    setSessionModalVisible(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const progress = mode === "timed" ? elapsed / totalSeconds : 0;
  const displayTime =
    mode === "timed" ? formatCountdown(Math.max(0, remaining)) : formatStopwatch(elapsed);
  const hasHours = displayTime.length > 5;

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
                <Text
                  style={[
                    styles.timeText,
                    hasHours && styles.timeTextHours,
                    isPaused && styles.timeTextPaused,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {displayTime}
                </Text>
                <View style={styles.remainingRow}>
                  <Icon name="moonLineDuotone" size={12} color="rgba(255,248,240,0.45)" />
                  <Text style={styles.remainingLabel}>
                    {isPaused ? "PAUSED" : "TIME REMAINING"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.infiniteTimerWrap}>
            <PulseRing />
            <View style={styles.infiniteCenter}>
              <Text
                style={[
                  styles.timeText,
                  hasHours && styles.timeTextHours,
                  isPaused && styles.timeTextPaused,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
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
        <Icon name={isPaused ? "playOutline" : "pause"} size={20} color="#212842" />
        <Text style={styles.pauseBtnText}>
          {isPaused ? "Resume Session" : "Pause Session"}
        </Text>
      </TouchableOpacity>

      {/* Add Note */}
      <TouchableOpacity
        onPress={openNoteModal}
        style={styles.noteBtn}
        activeOpacity={0.75}
      >
        <Icon name="pen" size={15} color="rgba(255,248,240,0.55)" />
        <Text style={styles.noteBtnText}>
          {sessionNotesCount > 0 ? `ADD NOTE (${sessionNotesCount})` : "ADD NOTE"}
        </Text>
      </TouchableOpacity>

      {/* Visual Confirmation Banner when a Note is Added */}
      {noteSavedBanner && (
        <View style={styles.noteSavedToast}>
          <Icon name="checkCircle" size={16} color="#4A7C59" />
          <Text style={styles.noteSavedToastText}>
            Note saved on Page {noteSavedBanner.page} • {noteSavedBanner.timeLabel}
          </Text>
        </View>
      )}

      {/* Finish Early / Stop */}
      <TouchableOpacity
        onPress={mode === "timed" ? confirmFinishEarly : confirmStopInfinite}
        activeOpacity={0.75}
        disabled={isFinishing}
        style={[styles.finishBtn, isFinishing && { opacity: 0.6 }]}
      >
        {isFinishing ? (
          <ActivityIndicator size="small" color="#FFF8F0" />
        ) : (
          <Text style={styles.finishEarlyText}>
            {mode === "timed" ? "FINISH & SAVE SESSION" : "END SESSION & LOG READING"}
          </Text>
        )}
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
              <Text style={styles.noteHeading}>Add a Reading Note</Text>
              <TouchableOpacity onPress={() => setNoteVisible(false)}>
                <Icon name="cancel" size={20} color="#212842" />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteSubheading}>
              Enter the page you are on and capture your thoughts at this moment.
            </Text>

            {/* Page Number & Immersion Time Row */}
            <View style={styles.noteMetaRow}>
              <View style={styles.notePageFieldWrap}>
                <Text style={styles.noteFieldLabel}>CURRENT PAGE *</Text>
                <View style={styles.notePageInputBox}>
                  <Icon name="bookOpen" size={16} color="#212842" />
                  <TextInput
                    style={styles.notePageInput}
                    keyboardType="number-pad"
                    placeholder="Page #"
                    placeholderTextColor="#9E9B92"
                    value={notePageText}
                    onChangeText={(val) => {
                      setNotePageText(val.replace(/[^0-9]/g, ""));
                      if (noteError) setNoteError(null);
                    }}
                    maxLength={6}
                  />
                  {params.pagesTotal && parseInt(params.pagesTotal, 10) > 0 ? (
                    <Text style={styles.notePageTotalText}>
                      / {params.pagesTotal}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.noteTimeBadgeWrap}>
                <Text style={styles.noteFieldLabel}>IMMERSION TIME</Text>
                <View style={styles.noteTimeBadge}>
                  <Icon name="hourglass" size={14} color="#C95F44" />
                  <Text style={styles.noteTimeBadgeText}>
                    {formatImmersionTimestamp(elapsed)}
                  </Text>
                </View>
              </View>
            </View>

            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="Write your note for this page..."
              placeholderTextColor="#C0BDB4"
              value={noteText}
              onChangeText={(val) => {
                setNoteText(val);
                if (noteError) setNoteError(null);
              }}
              maxLength={1000}
            />

            {noteError ? (
              <Text style={styles.noteErrorText}>{noteError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={handleSaveNote}
              style={styles.noteSaveBtn}
              activeOpacity={0.85}
            >
              <Icon name="checkCircle" size={18} color="#FFF8F0" />
              <Text style={styles.noteSaveBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Interrupted / Exit / Completion Custom Modal ── */}
      <InterruptedSessionModal
        visible={sessionModalVisible}
        title={sessionModalConfig.title}
        subtitle={sessionModalConfig.subtitle}
        bookTitle={params.title}
        bookAuthor={params.author}
        bookCover={params.cover}
        timeReadText={sessionModalConfig.timeReadText}
        badgeType={sessionModalConfig.badgeType}
        primaryButtonText={sessionModalConfig.primaryButtonText}
        primaryButtonIcon={sessionModalConfig.primaryButtonIcon}
        onPrimaryAction={sessionModalConfig.onPrimaryAction}
        secondaryButtonText={sessionModalConfig.secondaryButtonText}
        secondaryButtonIcon={sessionModalConfig.secondaryButtonIcon}
        onSecondaryAction={sessionModalConfig.onSecondaryAction}
        discardButtonText={sessionModalConfig.discardButtonText}
        onDiscardAction={sessionModalConfig.onDiscardAction}
        onClose={sessionModalConfig.onSecondaryAction}
        isSaving={isFinishing}
      />
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
    paddingHorizontal: 22,
  },
  timeText: {
    fontFamily: "Newsreader-Bold",
    fontSize: 52,
    color: "#FFF8F0",
    textAlign: "center",
    maxWidth: RING_SIZE - 44,
  },
  timeTextHours: {
    fontSize: 36,
    letterSpacing: -0.5,
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
    justifyContent: "center",
    width: RING_SIZE - 36,
    paddingHorizontal: 8,
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
  noteSavedToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 238, 223, 0.96)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  noteSavedToastText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#212842",
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 240, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 248, 240, 0.18)",
    minHeight: 40,
  },
  finishEarlyText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    color: "#FFF8F0",
    letterSpacing: 1.2,
    textAlign: "center",
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
  noteMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 14,
  },
  notePageFieldWrap: {
    flex: 1,
  },
  noteFieldLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "#9E9B92",
    letterSpacing: 1,
    marginBottom: 6,
  },
  notePageInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#E8E3D5",
    gap: 8,
  },
  notePageInput: {
    flex: 1,
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#212842",
    paddingVertical: 0,
  },
  notePageTotalText: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#9E9B92",
  },
  noteTimeBadgeWrap: {
    minWidth: 118,
  },
  noteTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#E8E3D5",
    gap: 6,
  },
  noteTimeBadgeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#212842",
  },
  noteInput: {
    backgroundColor: "#F5EEDF",
    borderRadius: 14,
    padding: 16,
    fontFamily: "PublicSans-Regular",
    fontSize: 15,
    color: "#212842",
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E3D5",
  },
  noteErrorText: {
    fontFamily: "PublicSans-Medium",
    fontSize: 12,
    color: "#C95F44",
    marginBottom: 12,
  },
  noteSaveBtn: {
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#212842",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  noteSaveBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#FFF8F0",
  },
});
