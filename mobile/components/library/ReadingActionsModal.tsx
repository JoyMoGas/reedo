/**
 * @project Reedo
 * @module ReadingActionsModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-21
 * @description Custom, non-native bottom sheet modal for reading actions on currently reading books.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import NoCover from "../../app/assets/NoCover.svg";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ReadingActionsModalProps {
  visible: boolean;
  book: any | null;
  onClose: () => void;
}

export default function ReadingActionsModal({
  visible,
  book,
  onClose,
}: ReadingActionsModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      backdropAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT * 0.5);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT * 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible && !book) return null;

  const title = book?.title || "Book Actions";
  const author = Array.isArray(book?.authors)
    ? book.authors.join(", ")
    : book?.authors || "Unknown Author";
  const coverUri = book?.cover_image || book?.cover;
  const currentPage = book?.current_page || 0;
  const totalPages = book?.total_pages || 100;
  const progressPercent = Math.round(book?.progress_percentage || (totalPages > 0 ? (currentPage / totalPages) * 100 : 0));

  const handleBookDetails = () => {
    if (!book) return;
    handleDismiss();
    const authorStr = Array.isArray(book.authors)
      ? book.authors.join(", ")
      : (book.authors || "");
    const genreStr = Array.isArray(book.genres)
      ? book.genres.join(", ")
      : (book.genres || "");

    router.push({
      pathname: "/BookDetails",
      params: {
        bookId: book.book_id || book.id,
        id: book.book_id || book.id,
        bookName: book.title,
        author: authorStr,
        cover: book.cover_image,
        genres: genreStr,
        totalPages: (book.total_pages || 0).toString(),
        averageRating: (book.average_rating || 0).toString(),
        description: book.synopsis || book.description || "",
      },
    } as any);
  };

  const handleImmersionMode = () => {
    if (!book) return;
    handleDismiss();
    router.push({
      pathname: "/ImmersionSetup",
      params: {
        userbookId: book.id,
        bookId: book.book_id || book.id,
        title: book.title,
        author: Array.isArray(book.authors) ? book.authors.join(", ") : (book.authors || ""),
        cover: book.cover_image,
        pagesRead: (book.current_page || 0).toString(),
        pagesTotal: (book.total_pages || 100).toString(),
      },
    } as any);
  };

  const handleUpdateProgress = () => {
    if (!book) return;
    handleDismiss();
    router.push({
      pathname: "/UpdateProgress",
      params: {
        userbookId: book.id,
        bookId: book.book_id || book.id,
        title: book.title,
        author: Array.isArray(book.authors) ? book.authors.join(", ") : (book.authors || ""),
        cover: book.cover_image,
        pagesRead: (book.current_page || 0).toString(),
        pagesTotal: (book.total_pages || 100).toString(),
      },
    } as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalRoot}>
        {/* Animated backdrop with tap to close */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Animated Custom Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 12,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Grab Handle */}
          <View style={styles.grabHandleWrapper}>
            <View style={styles.grabHandle} />
          </View>

          {/* Header Row: Title & Close Button */}
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>READING ACTIONS</Text>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close reading actions"
            >
              <Icon name="cancel" size={18} color="#76767E" />
            </TouchableOpacity>
          </View>

          {/* Book Preview Card */}
          <View style={styles.bookPreviewCard}>
            <View style={styles.coverShadow}>
              {coverUri ? (
                <BookCover
                  uri={coverUri}
                  style={{ width: 52, height: 78, borderRadius: 5 }}
                  resizeMode="cover"
                />
              ) : (
                <NoCover width={52} height={78} style={{ borderRadius: 5 }} />
              )}
            </View>
            <View style={styles.bookInfoCol}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {author}
              </Text>
              {/* Progress Bar */}
              <View style={styles.progressRow}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(0, progressPercent))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercentText}>{progressPercent}%</Text>
              </View>
            </View>
          </View>

          {/* Actions List */}
          <View style={styles.actionsList}>
            {/* 1. Update Progress */}
            <TouchableOpacity
              onPress={handleUpdateProgress}
              style={styles.actionItem}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#FAF0E4" }]}>
                <Icon name="editNote" size={22} color="#C95F44" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Update Progress</Text>
                <Text style={styles.actionSubtitle}>
                  Log pages read or mark chapter completed
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color="#A8AAB2" />
            </TouchableOpacity>

            {/* 2. Immersion Mode */}
            <TouchableOpacity
              onPress={handleImmersionMode}
              style={styles.actionItem}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#EBE7DF" }]}>
                <Icon name="hourglass" size={20} color="#212842" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Immersion Mode</Text>
                <Text style={styles.actionSubtitle}>
                  Distraction-free reading session with timer
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color="#A8AAB2" />
            </TouchableOpacity>

            {/* 3. Book Details */}
            <TouchableOpacity
              onPress={handleBookDetails}
              style={styles.actionItem}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#F0EAE1" }]}>
                <Icon name="bookOpen" size={20} color="#212842" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Book Details & Summary</Text>
                <Text style={styles.actionSubtitle}>
                  Synopsis, community reflections & archive stats
                </Text>
              </View>
              <Icon name="chevronRight" size={18} color="#A8AAB2" />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.cancelBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(18, 20, 29, 0.55)",
  },
  sheetContainer: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: "#EBE7DF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  grabHandleWrapper: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 8,
  },
  grabHandle: {
    width: 44,
    height: 4.5,
    backgroundColor: "#D9D4C7",
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  headerLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#8E8B82",
    textTransform: "uppercase",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "#F3ECE1",
  },
  bookPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EBE3D5",
    marginBottom: 18,
  },
  coverShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  bookInfoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  bookTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 17,
    color: "#212842",
    marginBottom: 2,
    lineHeight: 22,
  },
  bookAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 13,
    color: "#76767E",
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#E2DBD0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C95F44",
    borderRadius: 3,
  },
  progressPercentText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#8E8B82",
  },
  actionsList: {
    gap: 10,
    marginBottom: 16,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EBE7DF",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 15,
    color: "#212842",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "#8E8B82",
  },
  cancelBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F3ECE1",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cancelBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#5C5E69",
    letterSpacing: 0.3,
  },
});
