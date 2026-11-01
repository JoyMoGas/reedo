/**
 * @project Reedo
 * @module ImmersionSetup
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-09-06
 */
import React, { useState, useRef, useMemo } from "react";
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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Icon from "../core/Icon";
import BookCover from "../components/BookCover";
import NoCover from "./assets/NoCover.svg";
import api from "../store/api";

type SessionMode = "timed" | "infinite";

interface SelectedImmersionBook {
  userbookId: string;
  bookId: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: string;
  pagesTotal: string;
  status?: string;
}

export default function ImmersionSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height: screenHeight } = Dimensions.get("window");

  const params = useLocalSearchParams<{
    userbookId?: string;
    bookId?: string;
    title?: string;
    author?: string;
    cover?: string;
    pagesRead?: string;
    pagesTotal?: string;
    initialMinutes?: string;
    isRecoveryChallenge?: string;
  }>();

  const isRecoveryChallenge = params.isRecoveryChallenge === "true";
  const defaultMinutes = params.initialMinutes
    ? Math.max(1, parseInt(params.initialMinutes, 10) || 10)
    : isRecoveryChallenge
    ? 10
    : 25;

  const hasInitialBook = Boolean(params.bookId && params.title);

  const [selectedBook, setSelectedBook] = useState<SelectedImmersionBook | null>(() =>
    hasInitialBook
      ? {
          userbookId: params.userbookId || "",
          bookId: params.bookId || "",
          title: params.title || "Untitled",
          author: params.author || "Unknown Author",
          cover: params.cover || "",
          pagesRead: params.pagesRead || "0",
          pagesTotal: params.pagesTotal || "100",
        }
      : null
  );
  const [isPickingBook, setIsPickingBook] = useState<boolean>(!hasInitialBook);
  const [bookSearchQuery, setBookSearchQuery] = useState("");

  const [mode, setMode] = useState<SessionMode>("timed");
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [minutesText, setMinutesText] = useState(defaultMinutes.toString());
  const [selectMinutesOnFocus, setSelectMinutesOnFocus] = useState(true);

  // Fetch user's library books for book selection step
  const { data: userBooksData = [], isLoading: isLoadingBooks } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    },
  });

  const libraryBooks = useMemo(() => {
    const list = Array.isArray(userBooksData) ? userBooksData : [];
    const mapped: SelectedImmersionBook[] = list.map((ub: any) => {
      const rawAuthors = ub.authors ?? ub.book_details?.authors;
      const authorStr = Array.isArray(rawAuthors)
        ? rawAuthors.join(", ")
        : typeof rawAuthors === "string" && rawAuthors
        ? rawAuthors
        : ub.author || ub.book_details?.author || "Unknown Author";

      return {
        userbookId: String(ub.id || ""),
        bookId: String(ub.book_id || ub.book_details?.id || ""),
        title: ub.title || ub.book_details?.title || "Untitled",
        author: authorStr,
        cover: ub.cover_image || ub.book_details?.cover_image || "",
        pagesRead: String(ub.current_page || 0),
        pagesTotal: String(ub.total_pages || ub.book_details?.total_pages || 100),
        status: ub.status || "READ_LATER",
      };
    });

    // Sort priority: CURRENTLY_READING -> READ_LATER -> COMPLETED -> others
    const priority = (status?: string) => {
      if (status === "CURRENTLY_READING") return 0;
      if (status === "READ_LATER") return 1;
      if (status === "COMPLETED") return 2;
      return 3;
    };

    const sorted = [...mapped].sort((a, b) => priority(a.status) - priority(b.status));

    if (!bookSearchQuery.trim()) return sorted;
    const q = bookSearchQuery.toLowerCase().trim();
    return sorted.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }, [userBooksData, bookSearchQuery]);

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

  const handleSelectBookForImmersion = (book: SelectedImmersionBook) => {
    Keyboard.dismiss();
    setSelectedBook(book);
    setIsPickingBook(false);
  };

  const handleBeginSession = () => {
    Keyboard.dismiss();
    if (!selectedBook || !selectedBook.bookId) {
      setIsPickingBook(true);
      return;
    }

    const parsed = parseInt(minutesText, 10);
    const finalMinutes = !isNaN(parsed) ? clampMinutes(parsed) : minutes;

    router.replace({
      pathname: "/ImmersionSession",
      params: {
        mode,
        minutes: finalMinutes.toString(),
        userbookId: selectedBook.userbookId,
        bookId: selectedBook.bookId,
        title: selectedBook.title,
        author: selectedBook.author,
        cover: selectedBook.cover,
        pagesRead: selectedBook.pagesRead,
        pagesTotal: selectedBook.pagesTotal,
        ...(isRecoveryChallenge ? { isRecoveryChallenge: "true" } : {}),
      },
    });
  };

  const quickChips = isRecoveryChallenge ? [10, 15, 30, 45] : [15, 30, 45, 50];

  const getStatusLabel = (status?: string) => {
    if (status === "CURRENTLY_READING") return "READING NOW";
    if (status === "READ_LATER") return "READ LATER";
    if (status === "COMPLETED") return "COMPLETED";
    return "LIBRARY";
  };

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

          {isPickingBook || !selectedBook ? (
            /* ── STEP 1: CHOOSE BOOK FOR IMMERSION ── */
            <View>
              <View style={styles.pickerHeaderRow}>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedBook) {
                      setIsPickingBook(false);
                    } else {
                      dismissSheet();
                    }
                  }}
                  style={styles.pickerBackBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="arrowLeft" size={20} color="#5C5E69" />
                </TouchableOpacity>

                {isRecoveryChallenge && (
                  <View style={styles.recoveryBadge}>
                    <Icon name="fireSolid" size={14} color="#D97706" />
                    <Text style={styles.recoveryBadgeText}>10-MIN RECOVERY CHALLENGE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heading}>
                {isRecoveryChallenge ? "Restore Your Streak" : "Choose Your Reading"}
              </Text>
              <Text style={styles.subheading}>
                {isRecoveryChallenge
                  ? "Select which book from your library you will read for 10 minutes to restore your streak."
                  : "Select the book from your library that you want to immerse yourself in today."}
              </Text>

              {/* Search filter when user has books */}
              {Array.isArray(userBooksData) && userBooksData.length > 3 && (
                <View style={styles.searchBar}>
                  <Icon name="search" size={18} color="#8E8B82" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Filter your library..."
                    placeholderTextColor="#9E9B92"
                    value={bookSearchQuery}
                    onChangeText={setBookSearchQuery}
                  />
                  {bookSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setBookSearchQuery("")}>
                      <Icon name="cancel" size={16} color="#8E8B82" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {isLoadingBooks ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator size="large" color="#212842" />
                  <Text style={styles.emptySubtitle}>Opening your library...</Text>
                </View>
              ) : libraryBooks.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIconBox}>
                    <Icon name="bookOpenPageVariantOutline" size={30} color="#212842" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {bookSearchQuery.trim() ? "No matching books" : "Your library is empty"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {bookSearchQuery.trim()
                      ? "Try searching with a different title or author."
                      : "Add a book to your library first so you can track your reading sessions and progress."}
                  </Text>
                  {!bookSearchQuery.trim() && (
                    <TouchableOpacity
                      onPress={() => {
                        router.back();
                        setTimeout(() => router.push("/(tabs)/discover"), 150);
                      }}
                      style={styles.exploreBtn}
                      activeOpacity={0.85}
                    >
                      <Icon name="compass" size={18} color="#FFF8F0" />
                      <Text style={styles.exploreBtnText}>Explore Books</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <ScrollView
                  style={styles.bookListScroll}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {libraryBooks.map((item) => {
                    const isCurrentlyReading = item.status === "CURRENTLY_READING";
                    return (
                      <TouchableOpacity
                        key={item.userbookId || item.bookId}
                        onPress={() => handleSelectBookForImmersion(item)}
                        activeOpacity={0.82}
                        style={[
                          styles.bookOptionCard,
                          isCurrentlyReading && styles.bookOptionCardActive,
                        ]}
                      >
                        <View style={styles.coverShadow}>
                          {item.cover ? (
                            <BookCover
                              uri={item.cover}
                              style={{ width: 48, height: 72, borderRadius: 6 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <NoCover width={48} height={72} style={{ borderRadius: 6 }} />
                          )}
                        </View>

                        <View style={styles.bookOptionInfo}>
                          <View style={styles.bookOptionBadgeRow}>
                            <View
                              style={[
                                styles.statusPill,
                                isCurrentlyReading && styles.statusPillReading,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  isCurrentlyReading && styles.statusPillTextReading,
                                ]}
                              >
                                {getStatusLabel(item.status)}
                              </Text>
                            </View>
                            <Text style={styles.bookOptionPages}>
                              {item.pagesRead}/{item.pagesTotal} pp.
                            </Text>
                          </View>

                          <Text style={styles.bookOptionTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.bookOptionAuthor} numberOfLines={1}>
                            by {item.author}
                          </Text>
                        </View>

                        <View style={styles.selectArrowCircle}>
                          <Icon name="chevronRight" size={18} color="#212842" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : (
            /* ── STEP 2: CONFIGURE IMMERSION TIMER ── */
            <View>
              {/* Back button */}
              <TouchableOpacity
                onPress={dismissSheet}
                style={styles.backBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="arrowLeft" size={20} color="#5C5E69" />
              </TouchableOpacity>

              {/* Book mini row with "Change" button */}
              <View style={styles.bookRow}>
                <View style={styles.coverShadow}>
                  {selectedBook.cover ? (
                    <BookCover
                      uri={selectedBook.cover}
                      style={{ width: 40, height: 60, borderRadius: 5 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <NoCover width={40} height={60} style={{ borderRadius: 5 }} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {selectedBook.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {selectedBook.author}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPickingBook(true)}
                  style={styles.changeBookBtn}
                  activeOpacity={0.75}
                >
                  <Text style={styles.changeBookBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {isRecoveryChallenge && (
                <View style={[styles.recoveryBadge, { alignSelf: "flex-start", marginBottom: 10 }]}>
                  <Icon name="fireSolid" size={14} color="#D97706" />
                  <Text style={styles.recoveryBadgeText}>
                    10-MINUTE STREAK RECOVERY CHALLENGE
                  </Text>
                </View>
              )}

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
                    onChangeText={(t) => {
                      if (selectMinutesOnFocus) setSelectMinutesOnFocus(false);
                      if (/^\d*$/.test(t)) setMinutesText(t);
                    }}
                    onFocus={() => setSelectMinutesOnFocus(false)}
                    onBlur={() => {
                      commitMinutesText();
                      setSelectMinutesOnFocus(true);
                    }}
                    onSubmitEditing={commitMinutesText}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    selectTextOnFocus={selectMinutesOnFocus}
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
            </View>
          )}
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
    left: 0,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EBE7DF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pickerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EBE7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  recoveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  recoveryBadgeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10.5,
    color: "#92400E",
    letterSpacing: 0.5,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingLeft: 48,
  },
  changeBookBtn: {
    backgroundColor: "#EBE7DF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  changeBookBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11.5,
    color: "#212842",
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
    marginBottom: 16,
    lineHeight: 18,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EBE7DF",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PublicSans-Regular",
    fontSize: 14,
    color: "#212842",
    padding: 0,
  },
  bookListScroll: {
    maxHeight: 360,
  },
  bookOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EBE7DF",
  },
  bookOptionCardActive: {
    backgroundColor: "#FCF3E0",
    borderColor: "#212842",
  },
  bookOptionInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  bookOptionBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusPill: {
    backgroundColor: "#EBE7DF",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusPillReading: {
    backgroundColor: "#212842",
  },
  statusPillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 9.5,
    color: "#5C5E69",
    letterSpacing: 0.5,
  },
  statusPillTextReading: {
    color: "#FFF8F0",
  },
  bookOptionPages: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10.5,
    color: "#8E8B82",
  },
  bookOptionTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 16,
    color: "#212842",
  },
  bookOptionAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 12.5,
    color: "#76767E",
    marginTop: 2,
  },
  selectArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EBE7DF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F5EEDF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 20,
    color: "#212842",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#76767E",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#212842",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 999,
    gap: 8,
  },
  exploreBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#FFF8F0",
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
