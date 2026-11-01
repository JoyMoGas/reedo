import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import NoCover from "../../app/assets/NoCover.svg";
import {
  useReadingNotesStore,
  filterNotesForBook,
  formatImmersionTimestamp,
  ReadingNoteItem,
} from "../../store/useReadingNotesStore";

export interface BookNotesTarget {
  bookId?: string;
  userbookId?: string;
  title: string;
  author: string;
  cover?: string;
}

interface BookNotesModalProps {
  visible: boolean;
  onClose: () => void;
  book: BookNotesTarget | null;
}

function formatNoteDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function BookNotesModal({
  visible,
  onClose,
  book,
}: BookNotesModalProps) {
  const insets = useSafeAreaInsets();
  const allNotes = useReadingNotesStore((state) => state.notes);
  const deleteNote = useReadingNotesStore((state) => state.deleteNote);

  const bookNotes = useMemo(() => {
    if (!book) return [];
    return filterNotesForBook(
      allNotes,
      book.bookId,
      book.userbookId,
      book.title
    );
  }, [allNotes, book]);

  if (!book) return null;

  const confirmDelete = (note: ReadingNoteItem) => {
    Alert.alert(
      "Delete Note",
      `Remove your note from Page ${note.pageNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNote(note.id),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Icon name="notepadText" size={20} color="#C95F44" />
              <Text style={styles.headerTitle}>Reading Notes</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="cancel" size={20} color="#212842" />
            </TouchableOpacity>
          </View>

          {/* Book summary bar */}
          <View style={styles.bookInfoCard}>
            <View style={styles.coverBox}>
              {book.cover ? (
                <BookCover
                  uri={book.cover}
                  style={styles.coverImg}
                  resizeMode="cover"
                />
              ) : (
                <NoCover width={44} height={64} />
              )}
            </View>
            <View style={styles.bookMeta}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {book.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {book.author}
              </Text>
              <View style={styles.noteCountPill}>
                <Icon name="pen" size={11} color="#212842" />
                <Text style={styles.noteCountPillText}>
                  {bookNotes.length}{" "}
                  {bookNotes.length === 1 ? "note saved" : "notes saved"}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes List */}
          {bookNotes.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Icon name="notepadText" size={28} color="#9E9B92" />
              </View>
              <Text style={styles.emptyTitle}>No reading notes yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "ADD NOTE" during Immersion Mode to capture thoughts tied to
                your current page and session time.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.notesScroll}
              contentContainerStyle={styles.notesScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {bookNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteCardTop}>
                    <View style={styles.badgesRow}>
                      <View style={styles.pageBadge}>
                        <Icon name="bookOpen" size={12} color="#FFF8F0" />
                        <Text style={styles.pageBadgeText}>
                          PAGE {note.pageNumber}
                        </Text>
                      </View>
                      <View style={styles.timeBadge}>
                        <Icon name="hourglass" size={12} color="#C95F44" />
                        <Text style={styles.timeBadgeText}>
                          {formatImmersionTimestamp(note.immersionSeconds)} in
                          Immersion
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => confirmDelete(note)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="cancel" size={16} color="#9E9B92" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.noteContent}>{note.content}</Text>

                  <Text style={styles.noteDate}>
                    {formatNoteDate(note.createdAt)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(33, 40, 66, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    maxHeight: "84%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D6D1C4",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F5EEDF",
    alignItems: "center",
    justifyContent: "center",
  },
  bookInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5EEDF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E3D5",
  },
  coverBox: {
    width: 44,
    height: 64,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#EAE5D9",
    marginRight: 12,
  },
  coverImg: {
    width: 44,
    height: 64,
  },
  bookMeta: {
    flex: 1,
  },
  bookTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 16,
    color: "#212842",
    lineHeight: 20,
  },
  bookAuthor: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "#7B786F",
    marginTop: 2,
  },
  noteCountPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: "#E8E3D5",
  },
  noteCountPillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#212842",
  },
  notesScroll: {
    maxHeight: 420,
  },
  notesScrollContent: {
    paddingBottom: 12,
    gap: 12,
  },
  noteCard: {
    backgroundColor: "#F5EEDF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E3D5",
  },
  noteCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  pageBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#212842",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
  },
  pageBadgeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#FFF8F0",
    letterSpacing: 0.6,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8E3D5",
    gap: 5,
  },
  timeBadgeText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#C95F44",
  },
  noteContent: {
    fontFamily: "PublicSans-Regular",
    fontSize: 14,
    color: "#212842",
    lineHeight: 21,
    marginBottom: 8,
  },
  noteDate: {
    fontFamily: "PublicSans-Regular",
    fontSize: 11,
    color: "#9E9B92",
    textAlign: "right",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5EEDF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 18,
    color: "#212842",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13,
    color: "#9E9B92",
    textAlign: "center",
    lineHeight: 19,
  },
});

