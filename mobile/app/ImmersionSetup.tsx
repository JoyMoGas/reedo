/**
 * @project Reedo
 * @module ImmersionSetup
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
  Animated,
  Dimensions,
  PanResponder,
  Keyboard,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Icon from "../core/Icon";
import BookCover from "../components/BookCover";
import NoCover from "./assets/NoCover.svg";

type SessionMode = "timed" | "infinite";

export default function ImmersionSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: screenHeight } = Dimensions.get("window");

  const params = useLocalSearchParams<{
    userbookId: string;
    bookId: string;
    title: string;
    author: string;
    cover: string;
    pagesRead: string;
    pagesTotal: string;
  }>();

  const [mode, setMode] = useState<SessionMode>("timed");
  const [minutes, setMinutes] = useState(25);
  const [minutesText, setMinutesText] = useState("25");

  // Sheet dismiss animation
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
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderGrant: () => sheetTranslateY.stopAnimation(),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) sheetTranslateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.6) {
          dismissSheet();
        } else {
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

  const clampMinutes = (v: number) => Math.min(Math.max(v, 1), 999);

  const addMinutes = (delta: number) => {
    const base = parseInt(minutesText, 10);
    const baseVal = isNaN(base) ? minutes : clampMinutes(base);
    const next = clampMinutes(baseVal + delta);
    setMinutes(next);
    setMinutesText(next.toString());
  };

  const commitMinutesText = () => {
    const parsed = parseInt(minutesText, 10);
    if (!isNaN(parsed)) {
      const clamped = clampMinutes(parsed);
      setMinutes(clamped);
      setMinutesText(clamped.toString());
    } else {
      setMinutesText(minutes.toString());
    }
    Keyboard.dismiss();
  };

  const handleBeginSession = () => {
    Keyboard.dismiss();
    const parsed = parseInt(minutesText, 10);
    const finalMinutes = !isNaN(parsed) ? clampMinutes(parsed) : minutes;

    router.replace({
      pathname: "/ImmersionSession",
      params: {
        mode,
        minutes: finalMinutes.toString(),
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

  const quickChips = [15, 30, 45, 50];

  return (
    <View style={styles.root}>
      {/* Tap outside to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={dismissSheet}
      />

      <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          {/* Drag pill */}
          <View {...sheetPanResponder.panHandlers} style={styles.pillArea}>
            <View style={styles.pill} />
          </View>

          {/* Book mini row */}
          <View style={styles.bookRow}>
            <View style={styles.coverShadow}>
              {params.cover ? (
                <BookCover
                  uri={params.cover}
                  style={{ width: 40, height: 60, borderRadius: 5 }}
                  resizeMode="cover"
                />
              ) : (
                <NoCover width={40} height={60} style={{ borderRadius: 5 }} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
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
            style={[styles.backBtn, { top: insets.top + 14 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrowLeft" size={20} color="#5C5E69" />
          </TouchableOpacity>

          {/* Heading */}
          <Text style={styles.heading}>Prepare for Immersion</Text>
          <Text style={styles.subheading}>
            Silence the world. This space is for you and the written word.
          </Text>

          {/* ── TIMED ESCAPE ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMode("timed")}
            style={[styles.sectionCard, mode === "timed" && styles.sectionCardActive]}
          >
            <View style={styles.sectionHeader}>
              <Icon name="hourglass" size={20} color={mode === "timed" ? "#212842" : "#9E9B92"} />
              <Text style={[styles.sectionTitle, mode === "timed" && styles.sectionTitleActive]}>
                Timed Escape
              </Text>
            </View>

            {/* Minutes input */}
            <View style={styles.minutesRow}>
              <TextInput
                style={[styles.minutesInput, mode !== "timed" && { opacity: 0.4 }]}
                value={minutesText}
                onChangeText={(t) => { if (/^\d*$/.test(t)) setMinutesText(t); }}
                onBlur={commitMinutesText}
                onSubmitEditing={commitMinutesText}
                keyboardType="number-pad"
                returnKeyType="done"
                selectTextOnFocus
                maxLength={3}
                editable={mode === "timed"}
              />
              <Text style={[styles.minutesLabel, mode !== "timed" && { opacity: 0.4 }]}>
                MINUTES
              </Text>
            </View>

            {/* Quick chips */}
            <View style={styles.chipsRow}>
              {quickChips.map((n) => {
                const isActive = mode === "timed" && minutes === n;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => {
                      setMode("timed");
                      setMinutes(n);
                      setMinutesText(n.toString());
                    }}
                    style={[styles.chip, isActive && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      +{n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>

          {/* ── INFINITY JOURNEY ── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMode("infinite")}
            style={[
              styles.sectionCard,
              styles.infiniteCard,
              mode === "infinite" && styles.sectionCardActive,
            ]}
          >
            <View style={styles.infiniteIconWrap}>
              <Icon name="infinity" size={26} color="#212842" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.sectionTitle, mode === "infinite" && styles.sectionTitleActive]}>
                Infinity Journey
              </Text>
              <Text style={styles.infiniteSubtitle}>
                Read without a clock, just presence.
              </Text>
            </View>
            <View style={[styles.radioCircle, mode === "infinite" && styles.radioCircleActive]}>
              {mode === "infinite" && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>

          {/* Begin Session */}
          <TouchableOpacity
            onPress={handleBeginSession}
            style={styles.ctaBtn}
            activeOpacity={0.87}
          >
            <Text style={styles.ctaBtnText}>Begin Session</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(33,40,66,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
  pillArea: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D6D1C4",
  },
  backBtn: {
    position: "absolute",
    left: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EBE7DF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingLeft: 46,
  },
  coverShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  bookTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 15,
    color: "#212842",
  },
  bookAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 12,
    color: "#76767E",
    marginTop: 1,
  },
  heading: {
    fontFamily: "Newsreader-Bold",
    fontSize: 28,
    color: "#212842",
    marginBottom: 4,
  },
  subheading: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#9E9B92",
    marginBottom: 20,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: "#F5EEDF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  sectionCardActive: {
    borderColor: "#212842",
    backgroundColor: "#FCF3E0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 15,
    color: "#9E9B92",
  },
  sectionTitleActive: {
    color: "#212842",
  },
  minutesRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 14,
    gap: 10,
  },
  minutesInput: {
    fontFamily: "Newsreader-Bold",
    fontSize: 56,
    color: "#212842",
    padding: 0,
    minWidth: 80,
    textAlign: "left",
  },
  minutesLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#9E9B92",
    letterSpacing: 1,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: "#D6D1C4",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#212842",
    borderColor: "#212842",
  },
  chipText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#5C5E69",
  },
  chipTextActive: {
    color: "#FFF8F0",
  },
  infiniteCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  infiniteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F5DEB3",
    alignItems: "center",
    justifyContent: "center",
  },
  infiniteSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "#9E9B92",
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D6D1C4",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#212842",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#212842",
  },
  ctaBtn: {
    backgroundColor: "#212842",
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 16,
    color: "#FFF8F0",
    letterSpacing: 0.4,
  },
});
