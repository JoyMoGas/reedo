/**
 * @project Reedo
 * @module NewShelf
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../core/Icon';
import { useLibraryStore } from '../store/useLibraryStore';

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
  const addShelf = useLibraryStore((state) => state.addShelf);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(AESTHETIC_COLORS[0]);
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    
    addShelf({
      name: name.trim(),
      description: description.trim(),
      color,
      isPrivate,
    });
    router.back();
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
    </SafeAreaView>
  );
}
