/**
 * @project Reedo
 * @module TagBook
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../core/Icon';
import { useQuery } from '@tanstack/react-query';
import api from '../store/api';
import BookCover from '../components/BookCover';
import NoCover from './assets/NoCover.svg';
import { useEchoDraftStore } from '../store/useEchoDraftStore';

export default function TagBookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  
  const setTaggedBook = useEchoDraftStore(state => state.setTaggedBook);

  // Fetch books from the user's library for recommendations
  const { data: userBooksData = [], isLoading } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const filteredBooks = useMemo(() => {
    let mapped = userBooksData.map((ub: any) => ({
      id: ub.id,
      bookId: ub.book_id,
      title: ub.title,
      author: ub.authors?.join(", ") || "Unknown Author",
      coverUrl: ub.cover_image || "",
    }));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      mapped = mapped.filter((b: any) => 
        b.title.toLowerCase().includes(query) || 
        b.author.toLowerCase().includes(query)
      );
    }
    
    // For recommendations, limit to top 5 if not searching
    return searchQuery.trim() ? mapped : mapped.slice(0, 5);
  }, [userBooksData, searchQuery]);

  const handleSelectBook = (book: any) => {
    setTaggedBook(book);
    router.back();
  };

  const renderBookItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center mb-6">
      <View className="shadow-sm bg-white rounded-md mr-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 }}>
        {item.coverUrl ? (
          <BookCover uri={item.coverUrl} style={{ width: 80, height: 120, borderRadius: 6 }} resizeMode="cover" />
        ) : (
          <NoCover width={80} height={120} style={{ borderRadius: 6 }} />
        )}
      </View>
      <View className="flex-1 justify-center pr-2">
        <Text className="text-xl text-[#212842] mb-1" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-sm text-[#76767E] mb-4" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
          {item.author}
        </Text>
        
        <TouchableOpacity 
          onPress={() => handleSelectBook(item)}
          className="bg-[#212842] rounded-full py-2 px-6 self-start flex-row items-center"
        >
          <Text className="text-white text-xs tracking-widest mr-2" style={{ fontFamily: 'PublicSans-Bold' }}>
            SELECT
          </Text>
          <Icon name="bookmarkOutline" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2">
            <Icon name="arrowLeft" size={24} color="#212842" />
          </TouchableOpacity>
          <View>
            <Text className="text-3xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }}>
              Tag a Book
            </Text>
            <Text className="text-[10px] text-[#8A8A8E] tracking-widest uppercase mt-1" style={{ fontFamily: 'PublicSans-Bold' }}>
              CREATING AN ECHO
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.back()} className="p-2 -mr-2">
          <Icon name="cancel" size={24} color="#212842" />
        </TouchableOpacity>
      </View>

      <View className="px-6 flex-1">
        {/* Search Bar */}
        <View className="bg-[#EBE7DF] rounded-2xl flex-row items-center px-4 py-3 mb-6">
          <Icon name="search" size={20} color="#8A8A8E" />
          <TextInput
            className="flex-1 ml-3 text-base text-[#212842]"
            style={{ fontFamily: 'PublicSans-Regular' }}
            placeholder="Search title, author or ISBN..."
            placeholderTextColor="#8A8A8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <Text className="text-xs text-[#8A8A8E] tracking-widest uppercase mb-4" style={{ fontFamily: 'PublicSans-Bold' }}>
          RECOMMENDED FOR YOUR REFLECTION
        </Text>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#212842" />
          </View>
        ) : (
          <FlatList
            data={filteredBooks}
            keyExtractor={item => item.id}
            renderItem={renderBookItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListFooterComponent={
              <View className="mt-4 mb-10 border-2 border-dashed border-[#C3BEAF] rounded-2xl p-6 items-center">
                <View className="w-10 h-10 bg-[#EBE7DF] rounded-xl items-center justify-center mb-4">
                  <Icon name="plus" size={24} color="#8A8A8E" />
                </View>
                <Text className="text-xl text-[#212842] text-center mb-2" style={{ fontFamily: 'Newsreader-Bold' }}>
                  Can't find your book?
                </Text>
                <Text className="text-sm text-[#76767E] text-center mb-6 leading-relaxed" style={{ fontFamily: 'PublicSans-Italic' }}>
                  Add the details manually to include it in your reflection archive.
                </Text>
                
                <TouchableOpacity className="flex-row items-center">
                  <Text className="text-[#5C5E69] text-xs tracking-widest uppercase mr-2" style={{ fontFamily: 'PublicSans-Bold' }}>
                    ADD MANUAL ENTRY
                  </Text>
                  <Icon name="arrowRight" size={14} color="#5C5E69" />
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
