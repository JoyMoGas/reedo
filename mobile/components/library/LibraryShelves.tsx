import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../../core/Icon";
import BookCover from "../BookCover";
import { Avatar } from "../Avatar";
import { useQuery } from "@tanstack/react-query";
import api from "../../store/api";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useAuthStore } from "../../store/useAuthStore";

export default function LibraryShelves() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore(state => state.user);
  const shelves = useLibraryStore((state) => state.shelves);

  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const { data: friendsList = [] } = useQuery({
    queryKey: ['friends', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await api.get(`api/social/friends/${currentUser.id}/`);
      return response.data;
    },
    enabled: !!currentUser?.id,
  });

  const currentlyReading = userBooksData.filter((ub: any) => ub.status === 'CURRENTLY_READING');
  const readLater = userBooksData.filter((ub: any) => ub.status === 'READ_LATER');

  // We assume no saved echoes for now since there's no endpoint provided, we'll keep an empty array
  // If user actually has echoes, they would go here.
  const savedEchoes: any[] = []; 

  const getBookCount = (shelfId: string, localCount: number) => {
    if (!userBooksData.length) return localCount;
    if (shelfId === 'default-currently-reading') return currentlyReading.length;
    if (shelfId === 'default-read-later') return readLater.length;
    if (shelfId === 'default-already-read') return userBooksData.filter((ub: any) => ub.status === 'COMPLETED').length;
    return localCount;
  };

  return (
    <ScrollView 
      className="flex-1 px-6" 
      contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Currently Reading */}
      {currentlyReading.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-[#8E8B82] text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "PublicSans-Bold" }}>THE UNFINISHED PATH</Text>
              <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>Currently{"\n"}Reading</Text>
            </View>
            <Text className="text-[#8E8B82] text-xs text-right leading-tight" style={{ fontFamily: "PublicSans-Bold" }}>{currentlyReading.length} ACTIVE{"\n"}BOOKS</Text>
          </View>

          <View className="gap-4">
            {currentlyReading.slice(0, 3).map((book: any, idx: number) => (
              <TouchableOpacity 
                key={idx} 
                onPress={() => {
                  Alert.alert(
                    "Reading Actions",
                    book.title,
                    [
                      {
                        text: "Book Details",
                        onPress: () => router.push({ pathname: "/BookDetails", params: { bookId: book.book_id, bookName: book.title } })
                      },
                      {
                        text: "Immersion Mode",
                        onPress: () => router.push({
                          pathname: "/ImmersionSetup",
                          params: {
                            userbookId: book.id,
                            bookId: book.book_id,
                            title: book.title,
                            author: book.authors ? book.authors.join(", ") : "",
                            cover: book.cover_image,
                            pagesRead: (book.current_page || 0).toString(),
                            pagesTotal: (book.total_pages || 100).toString(),
                          }
                        })
                      },
                      {
                        text: "Update Progress",
                        onPress: () => router.push({ 
                          pathname: "/UpdateProgress", 
                          params: { 
                            userbookId: book.id, 
                            bookId: book.book_id,
                            title: book.title,
                            author: book.authors ? book.authors.join(", ") : "",
                            cover: book.cover_image,
                            pagesRead: (book.current_page || 0).toString(),
                            pagesTotal: (book.total_pages || 100).toString(),
                          } 
                        })
                      },
                      { text: "Cancel", style: "cancel" }
                    ]
                  );
                }}
                className="w-full bg-[#FDF8F0] rounded-2xl p-4 flex-row shadow-sm border border-[#F5EEDF]"
              >
                <BookCover uri={book.cover_image} className="w-[70px] h-[105px] rounded-md mr-4 shadow-sm" />
                <View className="flex-1 justify-center">
                  <Text className="text-[#212842] text-lg mb-1 leading-tight" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={1}>{book.title}</Text>
                  <Text className="text-[#625E52] text-sm mb-4" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>{book.authors?.join(", ")}</Text>
                  <View className="flex-row justify-between items-center mb-1.5">
                    <Text className="text-[10px] text-[#8E8B82] tracking-wide" style={{ fontFamily: "PublicSans-Bold" }}>{book.current_page || 0} / {book.total_pages || 100} PAGES</Text>
                    <Text className="text-[10px] text-[#8E8B82]" style={{ fontFamily: "PublicSans-Bold" }}>{Math.round(book.progress_percentage || 0)}%</Text>
                  </View>
                  <View className="w-full h-1 bg-[#EBE7DF] rounded-full overflow-hidden">
                    <View className="h-full bg-[#212842] rounded-full" style={{ width: `${Math.round(book.progress_percentage || 0)}%` }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Collections */}
      <View className="mb-10 mt-4">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text className="text-[#8E8B82] text-xs tracking-widest uppercase mb-1" style={{ fontFamily: "PublicSans-Bold" }}>COLLECTIONS</Text>
            <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>My Shelves</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/NewShelf')} className="flex-row items-center gap-1 pb-1">
            <Text className="text-[#212842] text-xs tracking-widest" style={{ fontFamily: "PublicSans-Bold" }}>CREATE NEW</Text>
            <Icon name="plus" size={12} color="#212842" />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between gap-y-4">
          {shelves.map((shelf, idx) => (
            <TouchableOpacity key={shelf.id} onPress={() => router.push(`/shelf/${shelf.id}`)} className="w-[48%] bg-[#FDF8F0] p-4 rounded-2xl border border-[#F5EEDF] shadow-sm">
              <View className="flex-row justify-between items-start mb-6">
                <Icon name={shelf.icon || "library"} size={20} color="#212842" />
                <Icon name="lockOpen" size={14} color="#8E8B82" />
              </View>
              <Text className="text-[#212842] text-lg mb-1 leading-tight h-10" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={2}>{shelf.name}</Text>
              <Text className="text-[#8E8B82] text-[10px] uppercase" style={{ fontFamily: "PublicSans-Bold" }}>{getBookCount(shelf.id, shelf.bookCount)} BOOKS</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Read Later */}
      {readLater.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>Read Later</Text>
            <TouchableOpacity className="pb-1" onPress={() => router.push('/shelf/default-read-later')}>
              <Text className="text-[#8E8B82] text-xs tracking-widest border-b border-[#8E8B82]" style={{ fontFamily: "PublicSans-Bold" }}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-6">
            {readLater.slice(0, 3).map((book: any, idx: number) => (
              <View key={idx} className="flex-row items-center">
                <BookCover uri={book.cover_image} className="w-[50px] h-[75px] rounded-sm mr-4 shadow-sm bg-[#EAE2D5]" />
                <View className="flex-1">
                  <Text className="text-[#212842] text-base mb-1" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={1}>{book.title}</Text>
                  <Text className="text-[#625E52] text-sm" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>{book.authors?.join(", ")}</Text>
                </View>
                <TouchableOpacity className="p-2">
                  <Icon name="dotsY" size={20} color="#8E8B82" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Saved Echoes */}
      {savedEchoes.length > 0 && (
        <View className="mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>Saved Echoes</Text>
            <TouchableOpacity className="pb-1">
              <Text className="text-[#8E8B82] text-xs tracking-widest border-b border-[#8E8B82]" style={{ fontFamily: "PublicSans-Bold" }}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
            {savedEchoes.map((echo, idx) => (
              <View key={idx} className="w-[280px] bg-[#FDF8F0] p-5 rounded-2xl border border-[#F5EEDF] mr-4 shadow-sm">
                <Icon name="quote" size={24} color="#E4A834" style={{ marginBottom: 8 }} />
                <Text className="text-[#212842] text-sm mb-6 leading-relaxed" style={{ fontFamily: "PublicSans-Regular" }}>
                  {echo.quote}
                </Text>
                <View className="flex-row items-center">
                  <Avatar uri={echo.avatar} username={echo.author} size={24} />
                  <Text className="text-[#8E8B82] text-xs ml-2" style={{ fontFamily: "PublicSans-Regular" }}>{echo.author} • 2d ago</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Following */}
      {friendsList.length > 0 && (
        <View className="mb-10 border-t border-[#EAE2D5] pt-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-[#212842] text-2xl" style={{ fontFamily: "Newsreader-Medium" }}>Following</Text>
            <Text className="text-[#8E8B82] text-xs tracking-widest pb-1" style={{ fontFamily: "PublicSans-Bold" }}>{friendsList.length} TOTAL</Text>
          </View>
          <View className="flex-row gap-6 flex-wrap mt-2">
            {friendsList.slice(0, 10).map((friend: any, idx: number) => {
              const friendUser = friend.requester.id === currentUser?.id ? friend.receiver : friend.requester;
              return (
                <TouchableOpacity 
                  key={idx} 
                  className="items-center w-16"
                  onPress={() => router.push({ pathname: '/ReaderProfile', params: { userId: friendUser.id, username: friendUser.username, fullName: friendUser.full_name, avatar: friendUser.thumbnail } })}
                >
                  <Avatar uri={friendUser.thumbnail} username={friendUser.username} size={64} />
                  <Text className="text-[#212842] text-xs text-center leading-tight mt-2" style={{ fontFamily: "PublicSans-Bold" }} numberOfLines={2}>
                    {friendUser.full_name || friendUser.username}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
      
    </ScrollView>
  );
}
