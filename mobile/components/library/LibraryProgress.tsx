import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import BookNotesModal, { BookNotesTarget } from "./BookNotesModal";
import {
  useReadingNotesStore,
  filterNotesForBook,
} from "../../store/useReadingNotesStore";

export default function LibraryProgress() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const allNotes = useReadingNotesStore((state) => state.notes);
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
        console.warn("Failed to fetch user books in LibraryProgress:", err);
        return [];
      }
    },
  });
  const userBooksData = Array.isArray(rawUserBooks) ? rawUserBooks : [];

  const completedBooks = userBooksData.filter(
    (ub: any) => ub?.status === "COMPLETED"
  );
  const readLater = userBooksData.filter(
    (ub: any) => ub?.status === "READ_LATER"
  );

  // Stats calculations
  const totalVolumes = userBooksData.length;
  const inkConsumed = userBooksData.reduce(
    (acc: number, book: any) => acc + (book.current_page || 0),
    0
  );
  const momentumSeconds = userBooksData.reduce(
    (acc: number, book: any) => acc + (book.reading_time_seconds || 0),
    0
  );
  const momentumHours = Math.floor(momentumSeconds / 3600);

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
      {/* Top Stats */}
      <View className="bg-[#FDF8F0] p-6 rounded-[24px] mb-4 border border-[#F5EEDF] shadow-sm">
        <Text
          className="text-[#8E8B82] text-[10px] tracking-widest uppercase mb-1"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          TOTAL VOLUMES
        </Text>
        <Text
          className="text-[#212842] text-4xl mb-2"
          style={{ fontFamily: "Newsreader-Medium" }}
        >
          {totalVolumes}
        </Text>
        <Text
          className="text-[#8E8B82] text-xs"
          style={{ fontFamily: "PublicSans-Italic" }}
        >
          Books carefully curated in your digital archive.
        </Text>
      </View>

      <View className="bg-[#212842] p-6 rounded-[24px] mb-4 shadow-sm">
        <Text
          className="text-[#8E8B82] text-[10px] tracking-widest uppercase mb-1"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          INK CONSUMED
        </Text>
        <Text
          className="text-white text-4xl mb-2"
          style={{ fontFamily: "Newsreader-Medium" }}
        >
          {inkConsumed.toLocaleString()}
        </Text>
        <Text
          className="text-[#A8AAB2] text-xs"
          style={{ fontFamily: "PublicSans-Italic" }}
        >
          Pages absorbed into memory this year.
        </Text>
      </View>

      <View className="bg-[#FDF8F0] p-6 rounded-[24px] mb-10 border border-[#F5EEDF] shadow-sm">
        <Text
          className="text-[#8E8B82] text-[10px] tracking-widest uppercase mb-1"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          MOMENTUM
        </Text>
        <Text
          className="text-[#212842] text-4xl mb-2"
          style={{ fontFamily: "Newsreader-Medium" }}
        >
          {momentumHours}
        </Text>
        <Text
          className="text-[#8E8B82] text-xs"
          style={{ fontFamily: "PublicSans-Italic" }}
        >
          Hours spent in quiet contemplation.
        </Text>
      </View>

      {/* The Finished Path */}
      {completedBooks.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text
                className="text-[#212842] text-2xl"
                style={{ fontFamily: "Newsreader-Medium" }}
              >
                The Finished{"\n"}Path
              </Text>
              <Text
                className="text-[#8E8B82] text-xs mt-1"
                style={{ fontFamily: "PublicSans-Regular" }}
              >
                Recently closed chapters and final{"\n"}thoughts
              </Text>
            </View>
            <TouchableOpacity
              className="pb-1"
              onPress={() => router.push("/shelf/default-already-read")}
            >
              <Text
                className="text-[#212842] text-[10px] tracking-widest uppercase text-right leading-tight"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                VIEW{"\n"}TIMELINE
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="overflow-visible"
          >
            {completedBooks.map((book: any, idx: number) => {
              const rating = book.rating || book.average_rating || 0;
              const bookNotes = filterNotesForBook(
                allNotes,
                book.book_id || book.id,
                book.id,
                book.title
              );
              const authorStr = Array.isArray(book.authors)
                ? book.authors.join(", ")
                : book.authors || book.author || "Unknown Author";

              return (
                <View key={idx} className="mr-4 w-[124px]">
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/BookDetails",
                        params: {
                          bookId: book.book_id,
                          id: book.book_id,
                          bookName: book.title,
                          author: authorStr,
                          cover: book.cover_image,
                          genres: Array.isArray(book.genres)
                            ? book.genres.join(", ")
                            : book.genres || "",
                          totalPages: (book.total_pages || 0).toString(),
                          averageRating: (book.average_rating || 0).toString(),
                          description: book.synopsis || "",
                        },
                      })
                    }
                  >
                    <View className="w-full h-[180px] rounded-lg mb-2 relative shadow-sm">
                      <BookCover
                        uri={book.cover_image}
                        className="w-full h-full rounded-lg bg-[#EAE2D5]"
                      />
                      <View className="absolute bottom-2 right-2 bg-[#212842] px-2 py-1 rounded-full">
                        <Text
                          className="text-white text-[8px] tracking-widest"
                          style={{ fontFamily: "PublicSans-Bold" }}
                        >
                          DONE
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-[#212842] text-[10px] uppercase tracking-wide leading-tight mb-1 h-6"
                      style={{ fontFamily: "PublicSans-Bold" }}
                      numberOfLines={2}
                    >
                      {book.title}
                    </Text>
                    <View className="flex-row mb-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name={star <= rating ? "star" : "starOutline"}
                          size={12}
                          color={star <= rating ? "#C95F44" : "#D9D9D9"}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setSelectedNotesBook({
                        bookId: String(book.book_id || book.id || ""),
                        userbookId: book.id ? String(book.id) : undefined,
                        title: book.title || "Untitled Book",
                        author: authorStr,
                        cover: book.cover_image,
                      })
                    }
                    className="flex-row items-center justify-center bg-[#F5EEDF] py-1 px-2 rounded-full border border-[#E8E3D5]"
                    activeOpacity={0.75}
                  >
                    <Icon name="notepadText" size={11} color="#C95F44" />
                    <Text
                      className="text-[9px] text-[#212842] ml-1"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {bookNotes.length > 0
                        ? `NOTES (${bookNotes.length})`
                        : "NOTES"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Read Later */}
      {readLater.length > 0 && (
        <View className="mb-8">
          <View className="flex-row justify-between items-end mb-4">
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              Read Later
            </Text>
            <Text
              className="text-[#8E8B82] text-[10px] tracking-widest uppercase pb-1"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {readLater.length} VOLUMES QUEUED
            </Text>
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
                    className="text-[#8E8B82] text-[10px]"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {Array.isArray(book.genres)
                      ? book.genres.join(", ")
                      : book.genres || "Book"}{" "}
                    - {book.total_pages || "?"} pages
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

      <TouchableOpacity
        onPress={() => router.push("/shelf/default-read-later")}
        className="w-full border border-[#EAE2D5] rounded-full py-4 items-center"
      >
        <Text
          className="text-[#8E8B82] text-xs tracking-widest uppercase"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          EXPLORE ARCHIVED WISHLIST
        </Text>
      </TouchableOpacity>

      <BookNotesModal
        visible={!!selectedNotesBook}
        book={selectedNotesBook}
        onClose={() => setSelectedNotesBook(null)}
      />
    </ScrollView>
  );
}
