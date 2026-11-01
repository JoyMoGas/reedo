import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import { Avatar } from "../Avatar";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useAuthStore } from "../../store/useAuthStore";
import ReadingActionsModal from "./ReadingActionsModal";
import BookNotesModal, { BookNotesTarget } from "./BookNotesModal";
import {
  useReadingNotesStore,
  filterNotesForBook,
  formatImmersionTimestamp,
} from "../../store/useReadingNotesStore";

export default function LibraryShelves() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const shelves = useLibraryStore((state) => state.shelves);
  const allNotes = useReadingNotesStore((state) => state.notes);
  const [selectedActionBook, setSelectedActionBook] = useState<any | null>(
    null
  );
  const [selectedNotesBook, setSelectedNotesBook] =
    useState<BookNotesTarget | null>(null);

  const { data: rawUserBooks = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      try {
        const response = await api.get("api/books/userbook/");
        const raw = response.data;
        return Array.isArray(raw)
          ? raw
          : raw?.results && Array.isArray(raw.results)
          ? raw.results
          : [];
      } catch (err) {
        console.warn("Failed to fetch user books:", err);
        return [];
      }
    },
  });
  const userBooksData = Array.isArray(rawUserBooks) ? rawUserBooks : [];

  const { data: rawFriends = [] } = useQuery({
    queryKey: ["friends", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const response = await api.get(
          `api/social/friends/${currentUser.id}/`
        );
        const raw = response.data;
        return Array.isArray(raw)
          ? raw
          : raw?.results && Array.isArray(raw.results)
          ? raw.results
          : [];
      } catch (err) {
        console.warn("Failed to fetch friends:", err);
        return [];
      }
    },
    enabled: !!currentUser?.id,
  });
  const friendsList = Array.isArray(rawFriends) ? rawFriends : [];

  const currentlyReading = userBooksData.filter(
    (ub: any) => ub.status === "CURRENTLY_READING"
  );
  const completedBooks = userBooksData.filter(
    (ub: any) => ub.status === "COMPLETED"
  );
  const readLater = userBooksData.filter(
    (ub: any) => ub.status === "READ_LATER"
  );

  // Books from Currently Reading & Already Read that have notes (plus any recent notes)
  const booksWithNotes = useMemo(() => {
    const activeAndCompleted = [...currentlyReading, ...completedBooks];
    const matchedIds = new Set<string>();
    const list: Array<{
      bookId: string;
      userbookId?: string;
      title: string;
      author: string;
      cover?: string;
      statusLabel: string;
      notesCount: number;
      latestNote: (typeof allNotes)[0];
    }> = [];

    for (const ub of activeAndCompleted) {
      const bId = String(ub.book_id || ub.id || "");
      const uId = String(ub.id || "");
      const notesForBook = filterNotesForBook(allNotes, bId, uId, ub.title);
      if (notesForBook.length > 0) {
        for (const n of notesForBook) matchedIds.add(n.id);
        list.push({
          bookId: bId,
          userbookId: uId,
          title: ub.title || "Untitled Book",
          author: Array.isArray(ub.authors)
            ? ub.authors.join(", ")
            : ub.author || "Unknown Author",
          cover: ub.cover_image || ub.cover,
          statusLabel:
            ub.status === "COMPLETED" ? "ALREADY READ" : "CURRENTLY READING",
          notesCount: notesForBook.length,
          latestNote: notesForBook[0],
        });
      }
    }

    // Also include any notes whose book isn't yet in userBooksData cache
    const remainingByBook = new Map<string, typeof allNotes>();
    for (const n of allNotes) {
      if (matchedIds.has(n.id)) continue;
      const key = n.bookId || n.userbookId || n.bookTitle;
      const existing = remainingByBook.get(key) || [];
      existing.push(n);
      remainingByBook.set(key, existing);
    }
    remainingByBook.forEach((notesGroup) => {
      const first = notesGroup[0];
      list.push({
        bookId: first.bookId,
        userbookId: first.userbookId,
        title: first.bookTitle,
        author: first.bookAuthor,
        cover: first.bookCover,
        statusLabel: "READING NOTE",
        notesCount: notesGroup.length,
        latestNote: first,
      });
    });

    return list;
  }, [currentlyReading, completedBooks, allNotes]);

  const openNotesForBook = (book: any) => {
    setSelectedNotesBook({
      bookId: String(book.book_id || book.bookId || book.id || ""),
      userbookId: book.id ? String(book.id) : book.userbookId,
      title: book.title || "Untitled Book",
      author: Array.isArray(book.authors)
        ? book.authors.join(", ")
        : book.author || "Unknown Author",
      cover: book.cover_image || book.cover,
    });
  };

  const getBookCount = (shelfId: string, localCount: number) => {
    if (shelfId === "default-currently-reading") return currentlyReading.length;
    if (shelfId === "default-read-later") return readLater.length;
    if (shelfId === "default-already-read") return completedBooks.length;
    const found = shelves.find((s) => s.id === shelfId);
    if (found?.bookIds) return found.bookIds.length;
    return localCount;
  };

  return (
    <ScrollView
      className="flex-1 px-6"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 100,
        paddingTop: 10,
      }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text
                className="text-[#8E8B82] text-xs tracking-widest uppercase mb-1"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                THE UNFINISHED PATH
              </Text>
              <Text
                className="text-[#212842] text-2xl"
                style={{ fontFamily: "Newsreader-Medium" }}
              >
                Currently{"\n"}Reading
              </Text>
            </View>
            <Text
              className="text-[#8E8B82] text-xs text-right leading-tight"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {currentlyReading.length} ACTIVE{"\n"}BOOKS
            </Text>
          </View>

          <View className="gap-4">
            {currentlyReading.slice(0, 3).map((book: any, idx: number) => {
              const bookNotes = filterNotesForBook(
                allNotes,
                book.book_id || book.id,
                book.id,
                book.title
              );
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedActionBook(book)}
                  activeOpacity={0.8}
                  className="w-full bg-[#FDF8F0] rounded-2xl p-4 flex-row shadow-sm border border-[#F5EEDF]"
                >
                  <BookCover
                    uri={book.cover_image}
                    className="w-[70px] h-[105px] rounded-md mr-4 shadow-sm"
                  />
                  <View className="flex-1 justify-center">
                    <Text
                      className="text-[#212842] text-lg mb-1 leading-tight"
                      style={{ fontFamily: "Newsreader-Bold" }}
                      numberOfLines={1}
                    >
                      {book.title}
                    </Text>
                    <Text
                      className="text-[#625E52] text-sm mb-3"
                      style={{ fontFamily: "PublicSans-Italic" }}
                      numberOfLines={1}
                    >
                      {Array.isArray(book.authors)
                        ? book.authors.join(", ")
                        : book.author || ""}
                    </Text>
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text
                        className="text-[10px] text-[#8E8B82] tracking-wide"
                        style={{ fontFamily: "PublicSans-Bold" }}
                      >
                        {book.current_page || 0} / {book.total_pages || 100}{" "}
                        PAGES
                      </Text>
                      <Text
                        className="text-[10px] text-[#8E8B82]"
                        style={{ fontFamily: "PublicSans-Bold" }}
                      >
                        {Math.round(book.progress_percentage || 0)}%
                      </Text>
                    </View>
                    <View className="w-full h-1 bg-[#EBE7DF] rounded-full overflow-hidden">
                      <View
                        className="h-full bg-[#212842] rounded-full"
                        style={{
                          width: `${Math.round(book.progress_percentage || 0)}%`,
                        }}
                      />
                    </View>

                    {/* Quick Notes button for Currently Reading book */}
                    <View className="flex-row items-center mt-2.5">
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          openNotesForBook(book);
                        }}
                        className="flex-row items-center bg-[#F5EEDF] px-2.5 py-1 rounded-full border border-[#E8E3D5]"
                        activeOpacity={0.75}
                      >
                        <Icon name="notepadText" size={12} color="#C95F44" />
                        <Text
                          className="text-[10px] text-[#212842] ml-1.5"
                          style={{ fontFamily: "PublicSans-Bold" }}
                        >
                          {bookNotes.length > 0
                            ? `NOTES (${bookNotes.length})`
                            : "VIEW NOTES"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Collections */}
      <View className="mb-10 mt-4">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text
              className="text-[#8E8B82] text-xs tracking-widest uppercase mb-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              COLLECTIONS
            </Text>
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              My Shelves
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/NewShelf")}
            className="flex-row items-center gap-1 pb-1"
          >
            <Text
              className="text-[#212842] text-xs tracking-widest"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              CREATE NEW
            </Text>
            <Icon name="plus" size={12} color="#212842" />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          {shelves.map((shelf) => (
            <TouchableOpacity
              key={shelf.id}
              onPress={() => router.push(`/shelf/${shelf.id}`)}
              className="w-[48%] bg-[#FDF8F0] p-4 rounded-2xl border border-[#F5EEDF] shadow-sm"
            >
              <View className="flex-row justify-between items-start mb-6">
                <Icon
                  name={shelf.icon || "library"}
                  size={20}
                  color="#212842"
                />
                <Icon name="lockOpen" size={14} color="#8E8B82" />
              </View>
              <Text
                className="text-[#212842] text-lg mb-1 leading-tight h-10"
                style={{ fontFamily: "Newsreader-Bold" }}
                numberOfLines={2}
              >
                {shelf.name}
              </Text>
              <Text
                className="text-[#8E8B82] text-[10px] uppercase"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                {getBookCount(shelf.id, shelf.bookCount)} BOOKS
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reading Notes Section (for Currently Reading & Already Read books) */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text
              className="text-[#8E8B82] text-xs tracking-widest uppercase mb-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              IMMERSION ARCHIVE
            </Text>
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              Reading Notes
            </Text>
          </View>
          <Text
            className="text-[#8E8B82] text-xs pb-1"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            {allNotes.length} {allNotes.length === 1 ? "NOTE" : "NOTES"}
          </Text>
        </View>

        {booksWithNotes.length === 0 ? (
          <View className="bg-[#FDF8F0] rounded-2xl p-5 border border-[#F5EEDF] items-center">
            <Icon name="notepadText" size={26} color="#9E9B92" />
            <Text
              className="text-[#212842] text-base mt-2 mb-1"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              No Reading Notes Yet
            </Text>
            <Text
              className="text-[#8E8B82] text-xs text-center leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Notes you capture during Immersion Mode (with page number &
              session timestamp) for your reading and completed books will
              appear here.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="overflow-visible"
          >
            {booksWithNotes.map((item, idx) => (
              <TouchableOpacity
                key={`${item.bookId}-${idx}`}
                onPress={() =>
                  setSelectedNotesBook({
                    bookId: item.bookId,
                    userbookId: item.userbookId,
                    title: item.title,
                    author: item.author,
                    cover: item.cover,
                  })
                }
                activeOpacity={0.85}
                className="w-[285px] bg-[#FDF8F0] p-4 rounded-2xl border border-[#F5EEDF] mr-4 shadow-sm"
              >
                <View className="flex-row items-center mb-3">
                  <BookCover
                    uri={item.cover}
                    className="w-[40px] h-[60px] rounded mr-3 bg-[#EAE2D5]"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-[9px] text-[#C95F44] tracking-widest uppercase mb-0.5"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {item.statusLabel}
                    </Text>
                    <Text
                      className="text-[#212842] text-base leading-tight"
                      style={{ fontFamily: "Newsreader-Bold" }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-[#625E52] text-xs"
                      style={{ fontFamily: "PublicSans-Italic" }}
                      numberOfLines={1}
                    >
                      {item.author}
                    </Text>
                  </View>
                </View>

                {/* Latest Note Preview */}
                <View className="bg-[#F5EEDF] rounded-xl p-3 mb-2.5 border border-[#E8E3D5]">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center bg-[#212842] px-2 py-0.5 rounded-full">
                      <Icon name="bookOpen" size={10} color="#FFF8F0" />
                      <Text
                        className="text-[10px] text-[#FFF8F0] ml-1"
                        style={{ fontFamily: "PublicSans-Bold" }}
                      >
                        PAGE {item.latestNote.pageNumber}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Icon name="hourglass" size={11} color="#C95F44" />
                      <Text
                        className="text-[10px] text-[#C95F44] ml-1"
                        style={{ fontFamily: "PublicSans-Bold" }}
                      >
                        {formatImmersionTimestamp(
                          item.latestNote.immersionSeconds
                        )}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="text-[#212842] text-xs leading-relaxed"
                    style={{ fontFamily: "PublicSans-Regular" }}
                    numberOfLines={2}
                  >
                    {item.latestNote.content}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-[10px] text-[#8E8B82] uppercase tracking-wider"
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    {item.notesCount}{" "}
                    {item.notesCount === 1 ? "NOTE SAVED" : "NOTES SAVED"}
                  </Text>
                  <View className="flex-row items-center">
                    <Text
                      className="text-[11px] text-[#212842] mr-1"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      View all
                    </Text>
                    <Icon name="chevronRight" size={13} color="#212842" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Read Later */}
      {readLater.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              Read Later
            </Text>
            <TouchableOpacity
              className="pb-1"
              onPress={() => router.push("/shelf/default-read-later")}
            >
              <Text
                className="text-[#8E8B82] text-xs tracking-widest border-b border-[#8E8B82]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                VIEW ALL
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-6">
            {readLater.slice(0, 3).map((book: any, idx: number) => (
              <View key={idx} className="flex-row items-center">
                <BookCover
                  uri={book.cover_image}
                  className="w-[50px] h-[75px] rounded-sm mr-4 shadow-sm bg-[#EAE2D5]"
                />
                <View className="flex-1">
                  <Text
                    className="text-[#212842] text-base mb-1"
                    style={{ fontFamily: "Newsreader-Bold" }}
                    numberOfLines={1}
                  >
                    {book.title}
                  </Text>
                  <Text
                    className="text-[#625E52] text-sm"
                    style={{ fontFamily: "PublicSans-Italic" }}
                    numberOfLines={1}
                  >
                    {Array.isArray(book.authors)
                      ? book.authors.join(", ")
                      : book.author || ""}
                  </Text>
                </View>
                <TouchableOpacity className="p-2">
                  <Icon name="dotsY" size={20} color="#8E8B82" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Following */}
      {friendsList.length > 0 && (
        <View className="mb-10 border-t border-[#EAE2D5] pt-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              Following
            </Text>
            <Text
              className="text-[#8E8B82] text-xs tracking-widest pb-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {friendsList.length} TOTAL
            </Text>
          </View>
          <View className="flex-row gap-6 flex-wrap mt-2">
            {friendsList.slice(0, 10).map((friend: any, idx: number) => {
              const friendUser =
                friend.requester.id === currentUser?.id
                  ? friend.receiver
                  : friend.requester;
              return (
                <TouchableOpacity
                  key={idx}
                  className="items-center w-16"
                  onPress={() =>
                    router.push({
                      pathname: "/ReaderProfile",
                      params: {
                        userId: friendUser.id,
                        username: friendUser.username,
                        fullName: friendUser.full_name,
                        avatar: friendUser.thumbnail,
                      },
                    })
                  }
                >
                  <Avatar
                    uri={friendUser.thumbnail}
                    username={friendUser.username}
                    size={64}
                  />
                  <Text
                    className="text-[#212842] text-xs text-center leading-tight mt-2"
                    style={{ fontFamily: "PublicSans-Bold" }}
                    numberOfLines={2}
                  >
                    {friendUser.full_name || friendUser.username}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Custom Reading Actions Bottom Sheet Modal */}
      <ReadingActionsModal
        visible={!!selectedActionBook}
        book={selectedActionBook}
        onClose={() => setSelectedActionBook(null)}
        onOpenNotes={(book) => openNotesForBook(book)}
      />

      {/* Reading Notes Modal */}
      <BookNotesModal
        visible={!!selectedNotesBook}
        book={selectedNotesBook}
        onClose={() => setSelectedNotesBook(null)}
      />
    </ScrollView>
  );
}
