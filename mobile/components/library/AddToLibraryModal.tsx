/**
 * @project Reedo
 * @module AddToLibraryModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-24
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useLibraryStore, Shelf } from "../../store/useLibraryStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useStreakStore } from "../../store/useStreakStore";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import NoCover from "../../app/assets/NoCover.svg";
import api from "../../store/api";
import { useSyncQueueStore } from "../../store/useSyncQueueStore";

export interface BookToAdd {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  totalPages?: number | string;
  rawBook?: any;
}

interface AddToLibraryModalProps {
  visible: boolean;
  book: BookToAdd | null;
  onClose: () => void;
  onSuccess?: (shelfId: string, shelfName: string) => void;
}

export default function AddToLibraryModal({
  visible,
  book,
  onClose,
  onSuccess,
}: AddToLibraryModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shelves = useLibraryStore((state) => state.shelves);
  const addBookToShelf = useLibraryStore((state) => state.addBookToShelf);

  const [savingShelfId, setSavingShelfId] = useState<string | null>(null);
  const [savedShelfInfo, setSavedShelfInfo] = useState<{ id: string; name: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!book) return null;

  const handleClose = () => {
    setShowSuccess(false);
    setSavedShelfInfo(null);
    setSavingShelfId(null);
    onClose();
  };

  const handleSaveToShelf = async (shelfId: string, shelfName: string, statusChoice: string = "READ_LATER") => {
    setSavingShelfId(shelfId);
    const raw = book.rawBook;
    const authors = raw?.authors
      ? raw.authors
      : book.author
      ? [book.author]
      : [];

    const rawPages = raw?.total_pages || raw?.page_count || book.totalPages || 0;
    const parsedPages =
      typeof rawPages === "number" ? rawPages : parseInt(rawPages as string, 10);
    const totalPages = isNaN(parsedPages) || parsedPages <= 0 ? 100 : parsedPages;
    const localDate = new Date().toLocaleDateString("en-CA");

    // 1. Optimistic progress
    if (statusChoice === "COMPLETED") {
      useProgressStore.getState().addPagesRead(totalPages);
    }

    // 2. Custom shelf registration
    const isCustom = !shelfId.startsWith("default-");
    if (isCustom) {
      addBookToShelf(shelfId, book.id);
    }

    // 3. Optimistic userBooks cache update
    queryClient.setQueryData(["userBooks"], (old: any) => {
      const list = Array.isArray(old) ? old : [];
      const existingIndex = list.findIndex(
        (ub: any) => String(ub.book_id) === String(book.id)
      );
      const newUb = {
        id: `temp_${Date.now()}`,
        book_id: book.id,
        status: statusChoice,
        current_page: statusChoice === "COMPLETED" ? totalPages : 0,
        progress_percentage: statusChoice === "COMPLETED" ? 100 : 0,
        book_details: {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_image: book.cover,
          total_pages: totalPages,
        },
      };
      if (existingIndex >= 0) {
        const copy = [...list];
        copy[existingIndex] = { ...copy[existingIndex], ...newUb };
        return copy;
      }
      return [...list, newUb];
    });

    // 4. Enqueue to persistent outbox
    useSyncQueueStore.getState().enqueue({
      type: "ADD_TO_LIBRARY",
      endpoint: "api/books/userbook/",
      method: "POST",
      payload: {
        book_id: book.id,
        status: statusChoice,
        title: raw?.title || book.title,
        authors: authors,
        cover_image: raw?.cover_image || raw?.cover_url || book.cover,
        synopsis: raw?.synopsis || raw?.description,
        total_pages: totalPages,
        current_page: statusChoice === "COMPLETED" ? totalPages : 0,
        isbn: raw?.isbn,
        average_rating: raw?.average_rating,
        genres: raw?.genres || raw?.categories,
        client_date: localDate,
      },
      title: `Add ${book.title} to Library`,
      queryKeysToInvalidate: [["userBooks"]],
    });

    setSavedShelfInfo({ id: shelfId, name: shelfName });
    setShowSuccess(true);
    if (onSuccess) onSuccess(shelfId, shelfName);
    setSavingShelfId(null);
  };

  const handleCreateNewShelf = () => {
    handleClose();
    router.push({
      pathname: "/NewShelf",
      params: {
        autoAddBookId: book.id,
        autoAddBookTitle: book.title,
        autoAddBookAuthor: book.author || "",
        autoAddBookCover: book.cover || "",
      },
    });
  };

  const handleNavigateToShelf = () => {
    const targetShelfId = savedShelfInfo?.id;
    handleClose();
    if (targetShelfId) {
      router.push(`/shelf/${targetShelfId}`);
    } else {
      router.push("/(tabs)/home");
    }
  };

  const customShelves = shelves.filter((s) => !s.isDefault);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Top Pill Handle */}
          <View style={styles.pill} />

          {showSuccess ? (
            /* ──────────────── Stage 2: Custom "Book Added" Confirmation ──────────────── */
            <View style={styles.successContainer}>
              <View style={styles.successBadge}>
                <Icon name="checkCircle" size={32} color="#4A7C59" />
              </View>

              <Text style={styles.successTitle}>Book Added!</Text>
              <Text style={styles.successSubtitle}>
                Successfully saved to your shelf{" "}
                <Text style={styles.successShelfHighlight}>
                  "{savedShelfInfo?.name}"
                </Text>
                .
              </Text>

              {/* Book Preview Card */}
              <View style={styles.bookPreviewCard}>
                <View style={styles.bookCoverWrap}>
                  {book.cover ? (
                    <BookCover
                      uri={book.cover}
                      style={{ width: 48, height: 70, borderRadius: 6 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <NoCover width={48} height={70} style={{ borderRadius: 6 }} />
                  )}
                </View>
                <View style={styles.bookPreviewMeta}>
                  <Text style={styles.bookPreviewTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookPreviewAuthor} numberOfLines={1}>
                    by {book.author || "Unknown Author"}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                onPress={handleNavigateToShelf}
                style={styles.primaryActionBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionBtnText}>View in library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                style={styles.secondaryActionBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryActionBtnText}>Keep exploring</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ──────────────── Stage 1: Choose Where to Save ──────────────── */
            <View>
              {/* Header with Book preview & Close */}
              <View style={styles.headerRow}>
                <View style={styles.headerBookPreview}>
                  <View style={styles.smallCoverWrap}>
                    {book.cover ? (
                      <BookCover
                        uri={book.cover}
                        style={{ width: 38, height: 56, borderRadius: 5 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <NoCover width={38} height={56} style={{ borderRadius: 5 }} />
                    )}
                  </View>
                  <View style={styles.headerBookMeta}>
                    <Text style={styles.headerBookTitle} numberOfLines={1}>
                      {book.title}
                    </Text>
                    <Text style={styles.headerBookAuthor} numberOfLines={1}>
                      by {book.author || "Unknown Author"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="cancel" size={20} color="#76767E" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetTitle}>Save to Library</Text>
              <Text style={styles.sheetSubtitle}>
                Choose the shelf where you want to add this work:
              </Text>

              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. Currently Reading */}
                <TouchableOpacity
                  onPress={() =>
                    handleSaveToShelf("default-currently-reading", "Currently Reading", "CURRENTLY_READING")
                  }
                  activeOpacity={0.85}
                  disabled={savingShelfId !== null}
                  style={styles.primaryShelfBtn}
                >
                  {savingShelfId === "default-currently-reading" ? (
                    <ActivityIndicator size="small" color="#FFF8F0" />
                  ) : (
                    <>
                      <View style={styles.primaryShelfIconBox}>
                        <Icon name="bookOpen" size={20} color="#212842" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.primaryShelfBtnTitle}>
                          Currently Reading
                        </Text>
                        <Text style={styles.primaryShelfBtnSub}>
                          Start tracking your progress now
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="rgba(255,248,240,0.6)" />
                    </>
                  )}
                </TouchableOpacity>

                {/* 2. Read Later */}
                <TouchableOpacity
                  onPress={() =>
                    handleSaveToShelf("default-read-later", "Read Later", "READ_LATER")
                  }
                  activeOpacity={0.8}
                  disabled={savingShelfId !== null}
                  style={styles.shelfCard}
                >
                  {savingShelfId === "default-read-later" ? (
                    <ActivityIndicator size="small" color="#212842" />
                  ) : (
                    <>
                      <View style={[styles.shelfIconBox, { backgroundColor: "#F5EEDF" }]}>
                        <Icon name="bookmarkOutline" size={20} color="#212842" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shelfCardTitle}>Read Later</Text>
                        <Text style={styles.shelfCardSub}>
                          Save to your future reading list
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#76767E" />
                    </>
                  )}
                </TouchableOpacity>

                {/* 3. Completed */}
                <TouchableOpacity
                  onPress={() =>
                    handleSaveToShelf("default-already-read", "Already Read", "COMPLETED")
                  }
                  activeOpacity={0.8}
                  disabled={savingShelfId !== null}
                  style={[styles.shelfCard, { backgroundColor: "#EBF4ED", borderColor: "#D5E8D8" }]}
                >
                  {savingShelfId === "default-already-read" ? (
                    <ActivityIndicator size="small" color="#4A7C59" />
                  ) : (
                    <>
                      <View style={[styles.shelfIconBox, { backgroundColor: "#D5E8D8" }]}>
                        <Icon name="checkCircle" size={20} color="#4A7C59" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shelfCardTitle, { color: "#4A7C59" }]}>
                          Completed
                        </Text>
                        <Text style={[styles.shelfCardSub, { color: "#4A7C59" }]}>
                          Mark as already read
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={18} color="#4A7C59" />
                    </>
                  )}
                </TouchableOpacity>

                {/* Custom Shelves Section */}
                {customShelves.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.sectionHeader}>YOUR COLLECTIONS</Text>
                    {customShelves.map((shelf) => (
                      <TouchableOpacity
                        key={shelf.id}
                        onPress={() =>
                          handleSaveToShelf(shelf.id, shelf.name, "READ_LATER")
                        }
                        activeOpacity={0.8}
                        disabled={savingShelfId !== null}
                        style={styles.shelfCard}
                      >
                        {savingShelfId === shelf.id ? (
                          <ActivityIndicator size="small" color="#212842" />
                        ) : (
                          <>
                            <View
                              style={[
                                styles.shelfIconBox,
                                { backgroundColor: (shelf.color || "#212842") + "22" },
                              ]}
                            >
                              <Icon
                                name={shelf.icon || "library"}
                                size={18}
                                color={shelf.color || "#212842"}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.shelfCardTitle}>{shelf.name}</Text>
                              <Text style={styles.shelfCardSub}>
                                Custom collection
                              </Text>
                            </View>
                            <Icon name="chevronRight" size={18} color="#76767E" />
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Quick Add Option: "+ Create new shelf" */}
                <TouchableOpacity
                  onPress={handleCreateNewShelf}
                  style={styles.createShelfBtn}
                  activeOpacity={0.75}
                >
                  <View style={styles.createShelfIconBox}>
                    <Icon name="plus" size={18} color="#212842" />
                  </View>
                  <Text style={styles.createShelfBtnText}>Create new shelf</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
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
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D6D1C4",
    alignSelf: "center",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EBE7DF",
  },
  headerBookPreview: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  smallCoverWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    marginRight: 12,
  },
  headerBookMeta: {
    flex: 1,
  },
  headerBookTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 16,
    color: "#212842",
  },
  headerBookAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 12,
    color: "#76767E",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFEBE3",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#76767E",
    marginBottom: 16,
  },
  primaryShelfBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#212842",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryShelfIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5DEB3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  primaryShelfBtnTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 15,
    color: "#FFF8F0",
  },
  primaryShelfBtnSub: {
    fontFamily: "PublicSans-Regular",
    fontSize: 11,
    color: "rgba(255, 248, 240, 0.7)",
    marginTop: 2,
  },
  shelfCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EBE7DF",
  },
  shelfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shelfCardTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#212842",
  },
  shelfCardSub: {
    fontFamily: "PublicSans-Regular",
    fontSize: 11,
    color: "#76767E",
    marginTop: 1,
  },
  sectionHeader: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "#8E8B82",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  createShelfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#212842",
    backgroundColor: "transparent",
    marginTop: 6,
    marginBottom: 8,
  },
  createShelfIconBox: {
    marginRight: 6,
  },
  createShelfBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 14,
    color: "#212842",
  },
  // Success state styles
  successContainer: {
    alignItems: "center",
    paddingTop: 8,
  },
  successBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EBF4ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 26,
    color: "#212842",
    textAlign: "center",
  },
  successSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 14,
    color: "#76767E",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 18,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  successShelfHighlight: {
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  bookPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#EBE7DF",
    borderRadius: 16,
    padding: 12,
    width: "100%",
    marginBottom: 20,
  },
  bookCoverWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 14,
  },
  bookPreviewMeta: {
    flex: 1,
  },
  bookPreviewTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 17,
    color: "#212842",
    lineHeight: 21,
  },
  bookPreviewAuthor: {
    fontFamily: "PublicSans-Italic",
    fontSize: 13,
    color: "#76767E",
    marginTop: 3,
  },
  primaryActionBtn: {
    width: "100%",
    backgroundColor: "#212842",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: "#FFF8F0",
    fontSize: 15,
    fontFamily: "PublicSans-Bold",
    letterSpacing: 0.5,
  },
  secondaryActionBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionBtnText: {
    color: "#76767E",
    fontSize: 14,
    fontFamily: "PublicSans-Bold",
  },
});
