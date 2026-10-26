/**
 * @project Reedo
 * @module NewShelf
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Icon from '../core/Icon';
import { useLibraryStore } from '../store/useLibraryStore';
import BookCover from '../components/BookCover';
import api from '../store/api';
import { useSyncQueueStore } from '../store/useSyncQueueStore';

const AESTHETIC_COLORS = [
  '#212842', // Navy
  '#4A2C2A', // Burgundy
  '#2C3E2C', // Forest Green
  '#3D3A30', // Olive/Charcoal
  '#4A4E69', // Indigo
];

export default function NewShelfScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const addShelf = useLibraryStore((state) => state.addShelf);

  const params = useLocalSearchParams<{
    autoAddBookId?: string;
    autoAddBookTitle?: string;
    autoAddBookAuthor?: string;
    autoAddBookCover?: string;
  }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(AESTHETIC_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdShelfId, setCreatedShelfId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);

    try {
      const newShelf = addShelf(
        {
          name: name.trim(),
          description: description.trim(),
          color,
          isPrivate,
        },
        params.autoAddBookId
      );

      if (params.autoAddBookId) {
        useSyncQueueStore.getState().enqueue({
          type: "ADD_TO_LIBRARY",
          endpoint: "api/books/userbook/",
          method: "POST",
          payload: {
            book_id: params.autoAddBookId,
            status: "READ_LATER",
            title: params.autoAddBookTitle,
            authors: params.autoAddBookAuthor ? [params.autoAddBookAuthor] : [],
            cover_image: params.autoAddBookCover,
          },
          title: `Add ${params.autoAddBookTitle || "Book"} to ${name.trim()}`,
          queryKeysToInvalidate: [["userBooks"]],
        });

        setCreatedShelfId(newShelf.id);
        setShowSuccessModal(true);
      } else {
        router.back();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-[#FFF8F0]" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
              <Icon name="arrowLeft" size={24} color="#212842" />
            </TouchableOpacity>
            <Text className="text-2xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }}>
              New Collection
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="p-2 -mr-2">
              <Icon name="cancel" size={24} color="#212842" />
            </TouchableOpacity>
          </View>

          {/* Auto-add Book Banner if requested */}
          {params.autoAddBookId && (
            <View className="bg-[#FAF3E8] border border-[#E8CAA4] rounded-2xl p-3.5 mb-6 flex-row items-center">
              {params.autoAddBookCover ? (
                <BookCover uri={params.autoAddBookCover} style={{ width: 38, height: 56, borderRadius: 5 }} resizeMode="cover" />
              ) : (
                <View className="w-[38px] h-[56px] bg-[#EBE7DF] rounded-md items-center justify-center">
                  <Icon name="bookmarkOutline" size={20} color="#212842" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Text className="text-[10px] text-[#76767E] uppercase tracking-wider" style={{ fontFamily: "PublicSans-Bold" }}>
                  WILL BE AUTOMATICALLY ADDED:
                </Text>
                <Text className="text-sm text-[#212842] mt-0.5" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={1}>
                  {params.autoAddBookTitle || "Selected book"}
                </Text>
                {params.autoAddBookAuthor ? (
                  <Text className="text-xs text-[#76767E]" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>
                    by {params.autoAddBookAuthor}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Preview Card */}
          <View 
            className="w-full aspect-square rounded-3xl p-6 justify-end shadow-md mb-6 relative overflow-hidden"
            style={{ backgroundColor: color }}
          >
            {/* Decorative background element simulating the radial lines in the mockup */}
            <View className="absolute inset-0 opacity-10 flex items-center justify-center">
               <Icon name="sun" size={250} color="#FFFFFF" />
            </View>
            <Text className="text-xs text-[#E8CAA4] tracking-widest uppercase mb-2 font-bold" style={{ fontFamily: 'PublicSans-Bold' }}>
              NEW COLLECTION
            </Text>
            <Text className="text-3xl text-white mb-2" style={{ fontFamily: 'Newsreader-Bold' }}>
              {name || 'Untitled Shelf'}
            </Text>
            <Text className="text-sm text-[#F0E6D2] leading-relaxed" style={{ fontFamily: 'PublicSans-Regular' }}>
              {description || 'Add a description to tell the story of this archive...'}
            </Text>
          </View>

          {/* Curator's Note */}
          <View className="bg-[#F5EEDF] rounded-2xl p-4 mb-8 border border-[#E8CAA4]">
            <Text className="text-[#212842] mb-1" style={{ fontFamily: 'Newsreader-Bold' }}>
              Curator's Note
            </Text>
            <Text className="text-[#5C5E69] text-sm italic leading-relaxed" style={{ fontFamily: 'PublicSans-Italic' }}>
              "A collection is not just a list of books, but a map of a mind's journey through ideas."
            </Text>
          </View>

          <Text className="text-4xl text-[#212842] mb-8 leading-tight" style={{ fontFamily: 'Newsreader-Bold' }}>
            Curate a{'\n'}Collection
          </Text>

          {/* Form */}
          <View className="mb-6">
            <Text className="text-xs text-[#5C5E69] tracking-widest uppercase mb-2" style={{ fontFamily: 'PublicSans-Bold' }}>
              SHELF NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Modern Existentialism"
              placeholderTextColor="#A0A0A0"
              className="text-xl text-[#212842] border-b border-[#E8CAA4] pb-2 mb-6"
              style={{ fontFamily: 'Newsreader-Regular' }}
            />

            <Text className="text-xs text-[#5C5E69] tracking-widest uppercase mb-2" style={{ fontFamily: 'PublicSans-Bold' }}>
              DESCRIPTION
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Define the mood or purpose of this shelf..."
              placeholderTextColor="#A0A0A0"
              multiline
              className="text-base text-[#212842] border-b border-[#E8CAA4] pb-2 min-h-[40px] mb-8"
              style={{ fontFamily: 'PublicSans-Regular' }}
            />

            <Text className="text-xs text-[#5C5E69] tracking-widest uppercase mb-4" style={{ fontFamily: 'PublicSans-Bold' }}>
              ARCHIVE AESTHETIC
            </Text>
            <View className="flex-row flex-wrap gap-4 mb-8">
              {AESTHETIC_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  className={`w-12 h-12 rounded-full border-[3px] items-center justify-center ${color === c ? 'border-[#E8CAA4]' : 'border-transparent'}`}
                >
                  <View className="w-10 h-10 rounded-full" style={{ backgroundColor: c }} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity className="w-12 h-12 rounded-full border border-[#D0D0D0] items-center justify-center bg-transparent">
                <Icon name="plus" size={20} color="#5C5E69" />
              </TouchableOpacity>
            </View>

            {/* Privacy Toggle */}
            <View className="bg-[#F5EEDF] rounded-2xl p-4 flex-row items-center justify-between mb-8 border border-[#E8CAA4]/50">
              <View className="flex-row items-center flex-1 mr-4">
                <Icon name="lockOpen" size={24} color="#212842" />
                <View className="flex-1 ml-3">
                  <Text className="text-[#212842] font-bold" style={{ fontFamily: 'PublicSans-Bold' }}>Privacy Level</Text>
                  <Text className="text-[#5C5E69] text-xs mt-1" style={{ fontFamily: 'PublicSans-Regular' }}>
                    {isPrivate ? 'This collection is hidden from the community.' : 'Public collections can be explored by the community.'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#D0D0D0', true: '#212842' }}
                thumbColor={'#FFF'}
                ios_backgroundColor="#D0D0D0"
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-6 py-4 flex-row items-center justify-between bg-[#FFF8F0] border-t border-[#E8CAA4]/30">
          <TouchableOpacity 
            onPress={handleCreate}
            disabled={!name.trim()}
            className={`flex-1 py-4 rounded-xl items-center justify-center mr-4 ${name.trim() ? 'bg-[#212842]' : 'bg-[#212842]/50'}`}
          >
            <Text className="text-white font-bold" style={{ fontFamily: 'PublicSans-Bold' }}>
              CREATE ARCHIVE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="px-4 py-4 items-center justify-center">
            <Text className="text-[#5C5E69] font-bold" style={{ fontFamily: 'PublicSans-Bold' }}>
              DISCARD
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Custom Book Added & Library Created Modal */}
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => router.back()}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => router.back()}
        >
          <TouchableOpacity activeOpacity={1} className="bg-[#FFF8F0] rounded-t-3xl px-6 pb-10 pt-5 shadow-2xl">
            <View className="w-12 h-1.5 bg-[#D9D4C7] rounded-full self-center mb-4" />

            <View className="w-14 h-14 rounded-full bg-[#EBF4ED] items-center justify-center self-center mb-3">
              <Icon name="checkCircle" size={32} color="#4A7C59" />
            </View>

            <Text className="text-2xl text-[#212842] text-center" style={{ fontFamily: "Newsreader-Bold" }}>
              Shelf Created!
            </Text>
            <Text className="text-sm text-[#76767E] text-center mt-1.5 mb-5 px-4 leading-relaxed" style={{ fontFamily: "PublicSans-Regular" }}>
              Successfully created shelf <Text style={{ fontFamily: "PublicSans-Bold", color: "#212842" }}>"{name.trim()}"</Text> and added your book to it.
            </Text>

            {/* Book Preview Card */}
            {params.autoAddBookId && (
              <View className="flex-row items-center bg-[#FAF3E8] border border-[#EBE7DF] rounded-2xl p-3.5 mb-6">
                {params.autoAddBookCover ? (
                  <BookCover uri={params.autoAddBookCover} style={{ width: 44, height: 64, borderRadius: 6 }} resizeMode="cover" />
                ) : (
                  <View className="w-11 h-16 bg-[#EBE7DF] rounded-md items-center justify-center">
                    <Icon name="bookmarkOutline" size={20} color="#212842" />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-base text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }} numberOfLines={1}>
                    {params.autoAddBookTitle}
                  </Text>
                  {params.autoAddBookAuthor ? (
                    <Text className="text-xs text-[#76767E] mt-0.5" style={{ fontFamily: "PublicSans-Italic" }} numberOfLines={1}>
                      by {params.autoAddBookAuthor}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                if (createdShelfId) {
                  router.replace(`/shelf/${createdShelfId}`);
                } else {
                  router.back();
                }
              }}
              className="w-full bg-[#212842] py-4 rounded-2xl items-center justify-center mb-3 shadow-sm"
              activeOpacity={0.85}
            >
              <Text className="text-white text-base font-bold" style={{ fontFamily: "PublicSans-Bold" }}>
                View in new shelf
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              className="w-full py-2.5 items-center justify-center"
              activeOpacity={0.7}
            >
              <Text className="text-[#76767E] text-sm font-bold" style={{ fontFamily: "PublicSans-Bold" }}>
                Done
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
