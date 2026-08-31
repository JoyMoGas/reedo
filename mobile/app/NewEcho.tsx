/**
 * @project Reedo
 * @module NewEcho
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 */
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Switch, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Icon from '../core/Icon';
import { useEchoDraftStore } from '../store/useEchoDraftStore';
import BookCover from '../components/BookCover';
import NoCover from './assets/NoCover.svg';
import { useMutation } from '@tanstack/react-query';
import api from '../store/api';
import { queryClient } from '../store/queryClient';

export default function NewEchoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const content = useEchoDraftStore(state => state.content);
  const setContent = useEchoDraftStore(state => state.setContent);
  const taggedBook = useEchoDraftStore(state => state.taggedBook);
  const containsSpoilers = useEchoDraftStore(state => state.containsSpoilers);
  const setContainsSpoilers = useEchoDraftStore(state => state.setContainsSpoilers);
  const resetDraft = useEchoDraftStore(state => state.resetDraft);

  useEffect(() => {
    return () => {
    };
  }, []);

  const createEchoMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        content: content.trim(),
        shared_book_id: taggedBook ? taggedBook.bookId : null,
        is_spoiler: containsSpoilers
      };
      const response = await api.post('/api/social/echoes/', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['echoes'] });
      resetDraft();
      router.back();
    },
    onError: (error: any) => {
      Alert.alert("Error", error.response?.data?.detail || "Failed to publish echo.");
    }
  });

  const handlePublish = () => {
    if (!content.trim() && !taggedBook) {
      Alert.alert("Cannot Publish", "Please add some thoughts or tag a book to publish an echo.");
      return;
    }
    createEchoMutation.mutate();
  };

  const handleClose = () => {
    if (content.trim() || taggedBook) {
      Alert.alert("Discard Echo?", "Are you sure you want to discard your draft?", [
        { text: "Keep Editing", style: "cancel" },
        { 
          text: "Discard", 
          style: "destructive", 
          onPress: () => {
            resetDraft();
            router.back();
          } 
        }
      ]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={handleClose} className="mr-3 p-2 -ml-2">
              <Icon name="arrowLeft" size={24} color="#212842" />
            </TouchableOpacity>
            <Text className="text-3xl text-[#212842]" style={{ fontFamily: 'Newsreader-Bold' }}>
              New Echo
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} className="p-2 -mr-2">
            <Icon name="cancel" size={24} color="#212842" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          
          {/* Tagged Book Display */}
          {taggedBook && (
            <View className="bg-[#F5EEDF] rounded-2xl p-4 flex-row items-center mb-8 relative">
              <View className="shadow-sm">
                {taggedBook.coverUrl ? (
                  <BookCover uri={taggedBook.coverUrl} style={{ width: 64, height: 96, borderRadius: 4 }} />
                ) : (
                  <NoCover width={64} height={96} style={{ borderRadius: 4 }} />
                )}
              </View>
              <View className="flex-1 ml-4 justify-center pr-8">
                <Text className="text-xs text-[#8A8A8E] tracking-widest uppercase mb-1" style={{ fontFamily: 'PublicSans-Bold' }}>
                  TAGGED BOOK
                </Text>
                <Text className="text-xl text-[#212842] mb-1" style={{ fontFamily: 'Newsreader-Bold' }} numberOfLines={2}>
                  {taggedBook.title}
                </Text>
                <Text className="text-sm text-[#76767E]" style={{ fontFamily: 'PublicSans-Italic' }} numberOfLines={1}>
                  {taggedBook.author}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/TagBook')}
                className="absolute top-4 right-4 p-2 bg-[#EBE7DF] rounded-full"
              >
                <Icon name="pen" size={16} color="#212842" />
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-xs text-[#8A8A8E] tracking-widest uppercase mb-3" style={{ fontFamily: 'PublicSans-Bold' }}>
            CAPTURE YOUR LITERARY REFLECTION
          </Text>

          {/* Text Area */}
          <View className="flex-row">
            <View className="w-[3px] bg-[#EBE7DF] rounded-full mr-4" />
            <TextInput
              className="flex-1 text-xl text-[#212842] min-h-[150px]"
              style={{ fontFamily: 'PublicSans-Regular', textAlignVertical: 'top' }}
              placeholder="What resonates with you today?"
              placeholderTextColor="#A8AAB2"
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
            />
          </View>
          
          <View className="h-6" />

          {/* Action Buttons */}
          <View className="gap-3 mb-8">
            {!taggedBook && (
              <TouchableOpacity 
                onPress={() => router.push('/TagBook')}
                className="bg-[#F5EEDF] rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-[#EBE7DF] rounded-lg items-center justify-center mr-4">
                    <Icon name="bookSearch" size={20} color="#5C5E69" />
                  </View>
                  <View>
                    <Text className="text-[10px] text-[#8A8A8E] tracking-widest uppercase mb-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                      INSPIRATION
                    </Text>
                    <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                      TAG A BOOK
                    </Text>
                  </View>
                </View>
                <Icon name="chevronRight" size={20} color="#C3BEAF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity className="bg-[#F5EEDF] rounded-xl p-4 flex-row items-center justify-between opacity-70">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-[#EBE7DF] rounded-lg items-center justify-center mr-4">
                  <Icon name="users" size={20} color="#5C5E69" />
                </View>
                <View>
                  <Text className="text-[10px] text-[#8A8A8E] tracking-widest uppercase mb-0.5" style={{ fontFamily: 'PublicSans-Bold' }}>
                    COMMUNITY
                  </Text>
                  <Text className="text-base text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                    MENTION A READER
                  </Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color="#C3BEAF" />
            </TouchableOpacity>
          </View>

          {/* Spoilers Toggle */}
          <View className="flex-row items-center justify-center mb-8">
            <Text className="text-xs text-[#8A8A8E] tracking-widest uppercase mr-3" style={{ fontFamily: 'PublicSans-Bold' }}>
              CONTAINS SPOILERS
            </Text>
            <Switch
              trackColor={{ false: "#EBE7DF", true: "#C95F44" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#EBE7DF"
              onValueChange={setContainsSpoilers}
              value={containsSpoilers}
            />
          </View>

          {/* Submit Actions */}
          <TouchableOpacity 
            onPress={handlePublish}
            disabled={createEchoMutation.isPending}
            className="w-full bg-[#212842] py-4 rounded-3xl items-center justify-center mb-4"
          >
            {createEchoMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
                PUBLISH ECHO
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleClose}
            className="w-full py-4 items-center justify-center"
          >
            <Text className="text-[#8A8A8E] text-base tracking-wide" style={{ fontFamily: 'PublicSans-Bold' }}>
              MAYBE LATER
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
