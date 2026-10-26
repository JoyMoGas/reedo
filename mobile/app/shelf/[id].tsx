/**
 * @project Reedo
 * @module [id]
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useStreakStore } from '../../store/useStreakStore';
import { useProgressStore } from '../../store/useProgressStore';
import Icon from '../../core/Icon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../store/api';
import { useSyncQueueStore } from '../../store/useSyncQueueStore';
import BookCover from '../../components/BookCover';
import NoCover from '../assets/NoCover.svg';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function ShelfViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedBookForMenu, setSelectedBookForMenu] = useState<any>(null);
  
  const shelf = useLibraryStore((state) => 
    state.shelves.find(s => s.id === id)
  );
  const removeBookFromShelf = useLibraryStore((state) => state.removeBookFromShelf);

  const { data: userBooksData = [], isLoading } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const handleChangeShelf = ({ bookId, status }: { bookId: string; status: string }) => {
    const localDate = new Date().toLocaleDateString("en-CA");

    // 1. Optimistic progress for completed
    if (status === "COMPLETED") {
      const found = shelfBooks.find((b: any) => b.bookId === bookId);
      if (found) {
        const total = found.pagesTotal || 100;
        const read = found.pagesRead || 0;
        const diff = Math.max(0, total - read);
        if (diff > 0) {
          useProgressStore.getState().addPagesRead(diff);
        }
      }
    }

    // 2. Optimistic userBooks cache update
    queryClient.setQueryData(["userBooks"], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((ub: any) => {
        if (String(ub.book_id) === String(bookId) || String(ub.id) === String(bookId)) {
          return {
            ...ub,
            status,
            current_page: status === "COMPLETED" ? ub.book_id?.total_pages || 100 : ub.current_page,
            progress_percentage: status === "COMPLETED" ? 100 : ub.progress_percentage,
          };
        }
        return ub;
      });
    });

    // 3. Persistent outbox enqueue
    useSyncQueueStore.getState().enqueue({
      type: "UPDATE_PROGRESS",
      endpoint: "api/books/userbook/",
      method: "PATCH",
      payload: {
        book_id: bookId,
        status,
        client_date: localDate,
      },
      title: "Shelf Status Update",
      queryKeysToInvalidate: [["userBooks"]],
    });

    setSelectedBookForMenu(null);
  };

  const handleReread = (bookId: string) => {
    const localDate = new Date().toLocaleDateString("en-CA");

    // 1. Optimistic userBooks update
    queryClient.setQueryData(["userBooks"], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((ub: any) => {
        if (String(ub.book_id) === String(bookId) || String(ub.id) === String(bookId)) {
          return {
            ...ub,
            status: "READING",
            current_page: 0,
            progress_percentage: 0,
          };
        }
        return ub;
      });
    });

    // 2. Persistent outbox enqueue
    useSyncQueueStore.getState().enqueue({
      type: "UPDATE_PROGRESS",
      endpoint: "api/books/userbook/",
      method: "PATCH",
      payload: {
        book_id: bookId,
        action: "REREAD",
        client_date: localDate,
      },
      title: "Reread Book",
      queryKeysToInvalidate: [["userBooks"]],
    });

    setSelectedBookForMenu(null);
    Alert.alert(
      "Ready to read again!",
      "The book has been restarted in your Currently Reading library for a fresh read."
    );
  };

  const handleRemoveBook = (bookId: string) => {
    // 1. Optimistic userBooks filter
    queryClient.setQueryData(["userBooks"], (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.filter((ub: any) => String(ub.book_id) !== String(bookId) && String(ub.id) !== String(bookId));
    });

    if (shelf?.id && !shelf.id.startsWith("default-")) {
      removeBookFromShelf(shelf.id, bookId);
    }

    // 2. Persistent outbox enqueue
    useSyncQueueStore.getState().enqueue({
      type: "ADD_TO_LIBRARY",
      endpoint: "api/books/userbook/",
      method: "DELETE",
      payload: { book_id: bookId },
      title: "Remove from Library",
      queryKeysToInvalidate: [["userBooks"]],
    });

    setSelectedBookForMenu(null);
  };

  const shelfBooks = useMemo(() => {
    if (!userBooksData.length || !shelf) return [];
    
    let filtered = [];
    if (shelf.id === 'default-currently-reading') {
      filtered = userBooksData.filter((ub: any) => ub.status === 'CURRENTLY_READING');
    } else if (shelf.id === 'default-read-later') {
      filtered = userBooksData.filter((ub: any) => ub.status === 'READ_LATER');
    } else if (shelf.id === 'default-already-read') {
      filtered = userBooksData.filter((ub: any) => ub.status === 'COMPLETED');
    } else if (shelf.bookIds && shelf.bookIds.length > 0) {
      filtered = userBooksData.filter((ub: any) => 
        shelf.bookIds?.includes(String(ub.book_id)) || shelf.bookIds?.includes(String(ub.id))
      );
    } else {
      return [];
    }

    return filtered.map((ub: any) => ({
      id: ub.id,
      bookId: ub.book_id,
      title: ub.title,
      author: ub.authors?.join(", ") || "Unknown Author",
      coverUrl: ub.cover_image || "",
      pagesRead: ub.current_page || 0,
      pagesTotal: ub.total_pages || 100,
      progress: Math.round(ub.progress_percentage || 0),
      genres: ub.genres ? ub.genres.join(",") : "",
      description: ub.synopsis || "",
      averageRating: ub.rating || ub.average_rating || "",
      status: ub.status,
      startedAt: ub.started_at,
      finishedAt: ub.finished_at,
      readingTimeSeconds: ub.reading_time_seconds || 0,
      readCount: ub.read_count || (ub.status === 'COMPLETED' ? 1 : 0),
    }));
  }, [userBooksData, shelf]);

  if (!shelf) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF8F0] items-center justify-center">
        <Text className="text-xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }}>Shelf not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-4 bg-[#EBE7DF] rounded-full">
          <Text style={{ fontFamily: 'PublicSans-Bold' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderBookItem = ({ item }: { item: any }) => (
    <View className="flex-row mb-6 items-center">
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: "/BookDetails",
            params: { 
              bookId: item.bookId, 
              bookName: item.title, 
              author: item.author, 
              cover: item.coverUrl, 
              genres: item.genres,
              totalPages: item.pagesTotal ? item.pagesTotal.toString() : "",
              description: item.description,
              averageRating: item.averageRating ? item.averageRating.toString() : "",
            }
          });
        }}
        className="flex-row flex-1"
      >
        <View className="shadow-sm rounded-md" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}>
          {item.coverUrl ? (
            <BookCover uri={item.coverUrl} style={{ width: 80, height: 120, borderRadius: 6 }} resizeMode="cover" />
          ) : (
            <NoCover width={80} height={120} style={{ borderRadius: 6 }} />
          )}
        </View>
        <View className="flex-1 ml-4 justify-center pr-2">
          <Text className="text-xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="text-sm text-[#76767E] mt-1" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
            by {item.author}
          </Text>
          
          {shelf.id === 'default-currently-reading' && (
            <View className="mt-3 pr-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs text-[#76767E]" style={{ fontFamily: "PublicSans-Bold" }}>
                  {item.progress}%
                </Text>
              </View>
              <View className="w-full h-1 bg-[#EBE7DF] rounded-full overflow-hidden">
                <View style={{ width: `${item.progress}%` }} className="h-full bg-[#212842] rounded-full" />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Options Button */}
      <TouchableOpacity 
        onPress={() => setSelectedBookForMenu(item)}
        className="p-3"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="dotsY" size={20} color="#76767E" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#FFF8F0]">
      {/* Dynamic Header based on Shelf Color */}
      <View 
        style={{ 
          backgroundColor: shelf.color || '#212842',
          paddingTop: insets.top,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          overflow: 'hidden',
          zIndex: 10
        }}
        className="pb-8 shadow-sm relative"
      >
        {/* Decorative Background Icon */}
        <View className="absolute inset-0 opacity-10 flex items-center justify-center top-10">
           <Icon name={shelf.icon || 'library'} size={200} color="#FFFFFF" />
        </View>

        <View className="flex-row items-center px-6 pt-4 mb-6">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-4"
          >
            <Icon name="arrowLeft" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xs text-white/70 tracking-widest uppercase mb-1" style={{ fontFamily: 'PublicSans-Bold' }}>
              {shelf.isPrivate ? 'Private Archive' : 'Public Archive'}
            </Text>
            <Text className="text-3xl text-white" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={1}>
              {shelf.name}
            </Text>
          </View>
        </View>
        
        <View className="px-6">
          <Text className="text-white/80 leading-relaxed text-sm" style={{ fontFamily: 'PublicSans-Regular' }}>
            {shelf.description}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#212842" />
          </View>
        ) : shelfBooks.length > 0 ? (
          <FlatList
            data={shelfBooks}
            keyExtractor={(item) => item.id}
            renderItem={renderBookItem}
            contentContainerStyle={{ padding: 24, paddingTop: 32, paddingBottom: insets.bottom + 40 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 px-6 items-center justify-center mt-[-40px]">
            <View className="w-24 h-24 rounded-full bg-[#F5EEDF] items-center justify-center mb-6">
              <Icon name="bookOpen" size={48} color="#212842" />
            </View>
            
            <Text className="text-3xl text-[#212842] text-center mb-3" style={{ fontFamily: 'Newsreader-Bold' }}>
              This shelf awaits its{'\n'}first masterpiece.
            </Text>
            
            <Text className="text-base text-[#5C5E69] text-center mb-10 leading-relaxed px-4" style={{ fontFamily: 'PublicSans-Regular' }}>
              Every great collection begins with a single page. Venture out and discover new worlds to curate your perfect archive.
            </Text>

            <TouchableOpacity 
              onPress={() => router.push('/(tabs)/discover')}
              className="w-full bg-[#212842] py-4 rounded-2xl items-center justify-center shadow-sm"
            >
              <Text className="text-white text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
                EXPLORE DISCOVERIES
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={selectedBookForMenu !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBookForMenu(null)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedBookForMenu(null)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            className="bg-[#FFF8F0] rounded-t-3xl px-6 pb-10 pt-5 shadow-2xl max-h-[85%]"
          >
            {/* Drag Handle */}
            <View className="w-12 h-1.5 bg-[#D9D4C7] rounded-full self-center mb-4" />
            
            {/* Book Preview Header */}
            <View className="flex-row items-center mb-4 pb-3 border-b border-[#EBE7DF]">
              <View className="shadow-sm rounded-md mr-3" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 }}>
                {selectedBookForMenu?.coverUrl ? (
                  <BookCover uri={selectedBookForMenu.coverUrl} style={{ width: 44, height: 64, borderRadius: 5 }} resizeMode="cover" />
                ) : (
                  <NoCover width={44} height={64} style={{ borderRadius: 5 }} />
                )}
              </View>
              <View className="flex-1 justify-center pr-1">
                <Text className="text-lg text-[#212842] leading-tight" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={2}>
                  {selectedBookForMenu?.title}
                </Text>
                <Text className="text-xs text-[#76767E] mt-0.5" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
                  by {selectedBookForMenu?.author}
                </Text>

                {/* Status Chip */}
                <View className="flex-row items-center mt-1.5">
                  {selectedBookForMenu?.status === 'COMPLETED' ? (
                    <View className="flex-row items-center bg-[#EBF4ED] px-2.5 py-0.5 rounded-full">
                      <Icon name="checkCircle" size={12} color="#4A7C59" />
                      <Text className="text-[11px] text-[#4A7C59] ml-1" style={{ fontFamily: 'PublicSans-Bold' }}>
                        Completed
                      </Text>
                    </View>
                  ) : selectedBookForMenu?.status === 'CURRENTLY_READING' ? (
                    <View className="flex-row items-center bg-[#EFEBE3] px-2.5 py-0.5 rounded-full">
                      <Icon name="bookOpen" size={12} color="#212842" />
                      <Text className="text-[11px] text-[#212842] ml-1" style={{ fontFamily: 'PublicSans-Bold' }}>
                        {selectedBookForMenu?.progress}% completed
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center bg-[#EFEBE3] px-2.5 py-0.5 rounded-full">
                      <Icon name="bookmarkOutline" size={12} color="#76767E" />
                      <Text className="text-[11px] text-[#76767E] ml-1" style={{ fontFamily: 'PublicSans-Bold' }}>
                        Read Later
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Reading Stats Card (Shown for completed books or books with reading history) */}
            {(selectedBookForMenu?.status === 'COMPLETED' || selectedBookForMenu?.readingTimeSeconds > 0 || selectedBookForMenu?.startedAt) && (
              <View className="bg-[#FAF3E8] border border-[#EBE7DF] rounded-2xl p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Icon name="bookClockOutline" size={16} color="#76767E" />
                  <Text className="text-[11px] text-[#76767E] uppercase tracking-wider ml-1.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                    Reading History
                  </Text>
                </View>

                <View className="flex-row justify-between mb-2.5">
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] text-[#76767E] uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Started
                    </Text>
                    <Text className="text-sm text-[#212842] mt-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                      {formatDate(selectedBookForMenu?.startedAt)}
                    </Text>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-[10px] text-[#76767E] uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Finished
                    </Text>
                    <Text className="text-sm text-[#212842] mt-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                      {selectedBookForMenu?.status === 'COMPLETED' ? formatDate(selectedBookForMenu?.finishedAt) : 'In progress'}
                    </Text>
                  </View>
                </View>

                <View className="h-[1px] bg-[#EBE7DF] my-1" />

                <View className="flex-row justify-between mt-1.5">
                  <View className="flex-1 mr-2">
                    <Text className="text-[10px] text-[#76767E] uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Reading Time
                    </Text>
                    <Text className="text-sm text-[#212842] mt-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                      {formatReadingTime(selectedBookForMenu?.readingTimeSeconds)}
                    </Text>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-[10px] text-[#76767E] uppercase" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Times Read
                    </Text>
                    <Text className="text-sm text-[#4A7C59] mt-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                      {formatReadCount(selectedBookForMenu?.readCount)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Dynamic Actions based on current shelf or book status */}
            <View className="gap-1">
              {/* Option: Volver a leer (Read again) - Primary action for completed books */}
              {selectedBookForMenu?.status === 'COMPLETED' && (
                <TouchableOpacity 
                  className="flex-row items-center py-3.5 border-b border-[#EBE7DF]"
                  onPress={() => handleReread(selectedBookForMenu.bookId)}
                >
                  <View className="w-10 h-10 rounded-full bg-[#EFEBE3] items-center justify-center mr-3">
                    <Icon name="reloadTime" size={20} color="#212842" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Read again
                    </Text>
                    <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Regular' }}>
                      Restart at page 1 while preserving past reading logs
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Update Progress (for Currently Reading) */}
              {selectedBookForMenu?.status === 'CURRENTLY_READING' && (
                <TouchableOpacity 
                  className="flex-row items-center py-3.5 border-b border-[#EBE7DF]"
                  onPress={() => {
                    const book = selectedBookForMenu;
                    setSelectedBookForMenu(null);
                    router.push({
                      pathname: "/UpdateProgress",
                      params: {
                        userbookId: book.id,
                        bookId: book.bookId,
                        title: book.title,
                        author: book.author,
                        cover: book.coverUrl,
                        pagesRead: book.pagesRead.toString(),
                        pagesTotal: book.pagesTotal.toString(),
                        startedAt: book.startedAt || '',
                        finishedAt: book.finishedAt || '',
                        readingTimeSeconds: (book.readingTimeSeconds || 0).toString(),
                        readCount: (book.readCount || 0).toString(),
                      }
                    });
                  }}
                >
                  <View className="w-10 h-10 rounded-full bg-[#EFEBE3] items-center justify-center mr-3">
                    <Icon name="fileEdit" size={20} color="#212842" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Update progress
                    </Text>
                    <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Regular' }}>
                      {selectedBookForMenu.pagesRead} of {selectedBookForMenu.pagesTotal} pages ({selectedBookForMenu.progress}%)
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Start Reading (for Read Later) */}
              {selectedBookForMenu?.status === 'READ_LATER' && (
                <TouchableOpacity 
                  className="flex-row items-center py-3.5 border-b border-[#EBE7DF]"
                  onPress={() => handleChangeShelf({ bookId: selectedBookForMenu.bookId, status: 'CURRENTLY_READING' })}
                >
                  <View className="w-10 h-10 rounded-full bg-[#EFEBE3] items-center justify-center mr-3">
                    <Icon name="bookOpen" size={20} color="#212842" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Start reading
                    </Text>
                    <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Regular' }}>
                      Move to books you are currently reading
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Mark as Completed (for non-completed books) */}
              {selectedBookForMenu?.status !== 'COMPLETED' && (
                <TouchableOpacity 
                  className="flex-row items-center py-3.5 border-b border-[#EBE7DF]"
                  onPress={() => handleChangeShelf({ bookId: selectedBookForMenu.bookId, status: 'COMPLETED' })}
                >
                  <View className="w-10 h-10 rounded-full bg-[#EBF4ED] items-center justify-center mr-3">
                    <Icon name="checkCircle" size={20} color="#4A7C59" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-[#4A7C59]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Mark as completed
                    </Text>
                    <Text className="text-xs text-[#76767E]" style={{ fontFamily: 'PublicSans-Regular' }}>
                      Move to your completed books archive
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Move to Read Later (if not already there) */}
              {selectedBookForMenu?.status !== 'READ_LATER' && (
                <TouchableOpacity 
                  className="flex-row items-center py-3.5 border-b border-[#EBE7DF]"
                  onPress={() => handleChangeShelf({ bookId: selectedBookForMenu.bookId, status: 'READ_LATER' })}
                >
                  <View className="w-10 h-10 rounded-full bg-[#EFEBE3] items-center justify-center mr-3">
                    <Icon name="bookmarkOutline" size={20} color="#212842" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      Move to Read Later
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Option: Remove from Library */}
              <TouchableOpacity 
                className="flex-row items-center py-3.5"
                onPress={() => {
                  Alert.alert(
                    "Remove from library",
                    "Are you sure you want to remove this book from your library? Your progress will be lost.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Remove", 
                        style: "destructive",
                        onPress: () => handleRemoveBook(selectedBookForMenu.bookId) 
                      }
                    ]
                  );
                }}
              >
                <View className="w-10 h-10 rounded-full bg-[#FAECE8] items-center justify-center mr-3">
                  <Icon name="cancel" size={20} color="#C95F44" />
                </View>
                <View className="flex-1">
                  <Text className="text-base text-[#C95F44]" style={{ fontFamily: 'PublicSans-Bold' }}>
                    Remove from library
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
