import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../store/useLibraryStore';
import Icon from '../../core/Icon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../store/api';
import BookCover from '../../components/BookCover';
import NoCover from '../assets/NoCover.svg';

export default function ShelfViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [selectedBookForMenu, setSelectedBookForMenu] = useState<any>(null);
  
  const shelf = useLibraryStore((state) => 
    state.shelves.find(s => s.id === id)
  );

  const { data: userBooksData = [], isLoading } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const changeShelfMutation = useMutation({
    mutationFn: async ({ bookId, status }: { bookId: string, status: string }) => {
      await api.post("api/books/userbook/", { book_id: bookId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      setSelectedBookForMenu(null);
    }
  });

  const removeBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      await api.delete("api/books/userbook/", { data: { book_id: bookId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBooks"] });
      setSelectedBookForMenu(null);
    }
  });

  const shelfBooks = useMemo(() => {
    if (!userBooksData.length || !shelf) return [];
    
    let filtered = [];
    if (shelf.id === 'default-currently-reading') {
      filtered = userBooksData.filter((ub: any) => ub.status === 'CURRENTLY_READING');
    } else if (shelf.id === 'default-read-later') {
      filtered = userBooksData.filter((ub: any) => ub.status === 'READ_LATER');
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
          className="flex-1 bg-black/40 justify-end"
          activeOpacity={1}
          onPress={() => setSelectedBookForMenu(null)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            className="bg-[#FFF8F0] rounded-t-3xl px-6 pb-10 pt-6 shadow-lg"
          >
            <View className="w-12 h-1.5 bg-[#EBE7DF] rounded-full self-center mb-6" />
            
            <Text className="text-xl text-[#212842] mb-6 text-center" style={{ fontFamily: 'Newsreader-Bold' }}>
              {selectedBookForMenu?.title}
            </Text>

            <View className="gap-2">
              {selectedBookForMenu?.status !== 'CURRENTLY_READING' && (
                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-[#EBE7DF]"
                  onPress={() => changeShelfMutation.mutate({ bookId: selectedBookForMenu.bookId, status: 'CURRENTLY_READING' })}
                >
                  <Icon name="bookOpen" size={20} color="#212842" />
                  <Text className="text-base text-[#212842] ml-4" style={{ fontFamily: 'PublicSans-Bold' }}>
                    Move to Currently Reading
                  </Text>
                </TouchableOpacity>
              )}

              {selectedBookForMenu?.status !== 'READ_LATER' && (
                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-[#EBE7DF]"
                  onPress={() => changeShelfMutation.mutate({ bookId: selectedBookForMenu.bookId, status: 'READ_LATER' })}
                >
                  <Icon name="bookmarkOutline" size={20} color="#212842" />
                  <Text className="text-base text-[#212842] ml-4" style={{ fontFamily: 'PublicSans-Bold' }}>
                    Move to Read Later
                  </Text>
                </TouchableOpacity>
              )}

              {selectedBookForMenu?.status !== 'COMPLETED' && (
                <TouchableOpacity 
                  className="flex-row items-center py-4 border-b border-[#EBE7DF]"
                  onPress={() => changeShelfMutation.mutate({ bookId: selectedBookForMenu.bookId, status: 'COMPLETED' })}
                >
                  <Icon name="checkCircle" size={20} color="#212842" />
                  <Text className="text-base text-[#212842] ml-4" style={{ fontFamily: 'PublicSans-Bold' }}>
                    Mark as Completed
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                className="flex-row items-center py-4"
                onPress={() => {
                  Alert.alert(
                    "Remove from Library",
                    "Are you sure you want to remove this book from your library? Your progress will be lost.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Remove", 
                        style: "destructive",
                        onPress: () => removeBookMutation.mutate(selectedBookForMenu.bookId) 
                      }
                    ]
                  );
                }}
              >
                <Icon name="cancel" size={20} color="#C95F44" />
                <Text className="text-base text-[#C95F44] ml-4" style={{ fontFamily: 'PublicSans-Bold' }}>
                  Remove from Library
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
