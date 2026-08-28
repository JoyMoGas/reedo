import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "../core/Icon";
import { useLibraryStore } from "../store/useLibraryStore";
import { useQuery } from "@tanstack/react-query";
import api from "../store/api";

export default function RateMasterpiece() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shelves = useLibraryStore((state) => state.shelves);
  
  const [activeFilter, setActiveFilter] = useState("ALL BOOKS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Fetch real user books
  const { data: userBooksData = [], isLoading } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    }
  });

  const books = useMemo(() => {
    return userBooksData.map((ub: any) => ({
      id: ub.id,
      bookId: ub.book_id,
      title: ub.title,
      author: ub.authors ? ub.authors.join(", ") : "Unknown Author",
      cover: ub.cover_image || "",
      status: ub.status || "UNREAD",
      description: ub.synopsis || "",
      // Map standard statuses to match our shelves/filters roughly, or just use the raw status
      rawStatus: ub.status
    }));
  }, [userBooksData]);

  // Combine default filters and custom shelves for the picker
  const filterOptions = useMemo(() => {
    const defaultFilters = ["ALL BOOKS", "CURRENTLY READING", "READ LATER", "ALREADY READ"];
    const customShelves = shelves.filter(s => !s.isDefault).map(s => s.name.toUpperCase());
    return Array.from(new Set([...defaultFilters, ...customShelves]));
  }, [shelves]);

  const filteredBooks = useMemo(() => {
    let result = books;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b: any) => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== "ALL BOOKS") {
      // Very basic matching for mocked generic statuses vs custom shelf names
      // In a real app, userbook would have a shelf_id or list of shelves it belongs to.
      // Since we just have status or need to match by name, we'll do our best string match.
      const filterStr = activeFilter.replace(" ", "_");
      result = result.filter((b: any) => b.status.toUpperCase() === filterStr || b.status.toUpperCase() === activeFilter);
    }

    // Set the first one as featured if no search query
    if (result.length > 0 && !searchQuery.trim() && activeFilter === "ALL BOOKS") {
      result[0].featured = true;
    } else if (result.length > 0) {
      // clear featured flag for rest
      result.forEach((b: any) => b.featured = false);
    }

    return result;
  }, [books, searchQuery, activeFilter]);

  const handleBookSelect = (book: any) => {
    router.push({
      pathname: "/PostReview",
      params: {
        bookId: book.bookId || book.id,
        bookName: book.title,
        author: book.author,
        cover: book.cover,
      }
    });
  };

  const handleGlobalSearch = () => {
    router.dismiss();
    setTimeout(() => {
      router.push("/(tabs)/discover");
    }, 100);
  };

  const getStatusPill = (status: string) => {
    const text = status.replace(/_/g, " ");
    return (
      <View className="bg-[#EBE7DF] self-start px-3 py-1.5 rounded-full mt-2">
        <Text className="text-[10px] text-[#212842] uppercase tracking-widest" style={{ fontFamily: "PublicSans-Bold" }}>
          {text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#FFF8F0]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrowLeft" size={24} color="#212842" />
        </TouchableOpacity>
        <Text className="text-2xl text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }}>
          Rate a Masterpiece
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="cancel" size={24} color="#212842" />
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-2">
        <Text className="text-sm text-[#8E8B82] mb-6 leading-relaxed" style={{ fontFamily: "PublicSans-Regular" }}>
          Find a volume from your collection to immortalize your thoughts and curate your personal library.
        </Text>

        <View className="flex-row items-center gap-3 mb-2">
          {/* Search Bar */}
          <View className="flex-1 h-12 bg-[#EBE7DF] rounded-full flex-row items-center px-4">
            <Icon name="search" size={20} color="#8E8B82" />
            <TextInput
              className="flex-1 ml-2 text-[#212842]"
              style={{ fontFamily: "PublicSans-Regular", fontSize: 14 }}
              placeholder="Search library..."
              placeholderTextColor="#8E8B82"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {/* Filter Button */}
          <TouchableOpacity 
            className={`h-12 px-4 rounded-full flex-row items-center justify-center border ${activeFilter !== "ALL BOOKS" ? "border-[#212842] bg-[#212842]" : "border-[#EBE7DF] bg-[#F5EEDF]"}`}
            onPress={() => setIsFilterModalOpen(true)}
          >
            <Icon name="libraryOutline" size={20} color={activeFilter !== "ALL BOOKS" ? "#FFF" : "#212842"} />
            {activeFilter !== "ALL BOOKS" && (
              <View className="ml-2 bg-[#FFF] rounded-full w-2 h-2" />
            )}
          </TouchableOpacity>
        </View>

        {/* Global Search Prompt */}
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity 
            className="flex-row items-center bg-[#F5EEDF] p-3 rounded-xl mb-4 mt-2 border border-[#EBE7DF]"
            onPress={handleGlobalSearch}
          >
            <View className="w-8 h-8 rounded-full bg-[#EBE7DF] items-center justify-center mr-3">
              <Icon name="search" size={16} color="#C95F44" />
            </View>
            <Text className="flex-1 text-sm text-[#212842]" style={{ fontFamily: "PublicSans-Bold" }}>
              Search global database for "{searchQuery}"
            </Text>
            <Icon name="chevronRight" size={20} color="#8E8B82" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#C95F44" />
          </View>
        ) : filteredBooks.length === 0 ? (
          <View className="items-center py-10 opacity-70">
            <Icon name="libraryOutline" size={48} color="#8E8B82" />
            <Text className="text-[#8E8B82] mt-4 text-center" style={{ fontFamily: "PublicSans-Regular" }}>
              {searchQuery ? "No books found matching your search in your library." : "No books found in this shelf."}
            </Text>
            {searchQuery && (
              <TouchableOpacity onPress={handleGlobalSearch} className="mt-6 bg-[#212842] px-6 py-3 rounded-full">
                <Text className="text-white text-xs uppercase tracking-widest" style={{ fontFamily: "PublicSans-Bold" }}>
                  Search Global Database
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="gap-6 mt-4">
            {filteredBooks.map((book: any, index: number) => {
              if (book.featured) {
                return (
                  <View key={book.id} className="mb-6 items-center">
                    <View className="relative shadow-md mb-4 rounded-xl overflow-hidden" style={{ width: 220, height: 330, backgroundColor: "#EBE7DF" }}>
                      {book.cover ? (
                        <Image source={{ uri: book.cover }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View className="w-full h-full items-center justify-center bg-[#EBE7DF]">
                          <Icon name="bookOpen" size={48} color="#A9A695" />
                        </View>
                      )}
                      <View className="absolute bottom-2 right-2 bg-[#F5DEB3] px-3 py-1 rounded-sm rotate-[-3deg]">
                        <Text className="text-[10px] text-[#212842] uppercase tracking-widest" style={{ fontFamily: "PublicSans-Bold" }}>
                          {book.status.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="w-full text-left">
                      <Text className="text-sm text-[#8E8B82] mb-1" style={{ fontFamily: "PublicSans-Italic" }}>{book.author}</Text>
                      <Text className="text-xl text-[#212842] mb-2" style={{ fontFamily: "Newsreader-Bold" }}>{book.title}</Text>
                      {book.description ? (
                        <Text className="text-sm text-[#5C5E69] leading-tight mb-4" style={{ fontFamily: "PublicSans-Regular" }} numberOfLines={3}>
                          {book.description}
                        </Text>
                      ) : null}
                      <TouchableOpacity 
                        className="bg-[#212842] self-start px-6 py-3 rounded-full flex-row items-center gap-2 mt-2"
                        onPress={() => handleBookSelect(book)}
                      >
                        <Text className="text-xs text-[#FFF] uppercase tracking-widest" style={{ fontFamily: "PublicSans-Bold" }}>
                          RATE EXPERIENCE
                        </Text>
                        <Icon name="starOutline" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              return (
                <TouchableOpacity 
                  key={book.id} 
                  className="flex-row bg-[#F5EEDF] rounded-2xl p-3"
                  onPress={() => handleBookSelect(book)}
                >
                  {book.cover ? (
                    <Image source={{ uri: book.cover }} style={{ width: 80, height: 120, borderRadius: 8, backgroundColor: "#EBE7DF" }} />
                  ) : (
                    <View style={{ width: 80, height: 120, borderRadius: 8, backgroundColor: "#EBE7DF" }} className="items-center justify-center">
                      <Icon name="bookOpen" size={24} color="#A9A695" />
                    </View>
                  )}
                  <View className="flex-1 ml-4 py-2 justify-between">
                    <View>
                      <Text className="text-lg text-[#212842] mb-1" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={2}>{book.title}</Text>
                      <Text className="text-sm text-[#8E8B82]" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>{book.author}</Text>
                    </View>
                    {getStatusPill(book.status)}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter Selection Modal */}
      <Modal visible={isFilterModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setIsFilterModalOpen(false)} activeOpacity={1} />
          <View className="bg-[#FFF8F0] rounded-t-3xl pt-6 pb-10 px-6" style={{ paddingBottom: Math.max(insets.bottom, 40) }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }}>
                Filter by Shelf
              </Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <Icon name="cancel" size={24} color="#212842" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    setActiveFilter(option);
                    setIsFilterModalOpen(false);
                  }}
                  className="flex-row items-center justify-between py-4 border-b border-[#EBE7DF]"
                >
                  <Text 
                    className={`text-base ${activeFilter === option ? "text-[#C95F44]" : "text-[#212842]"}`} 
                    style={{ fontFamily: activeFilter === option ? "PublicSans-Bold" : "PublicSans-Regular" }}
                  >
                    {option}
                  </Text>
                  {activeFilter === option && <Icon name="checkCircle" size={20} color="#C95F44" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
