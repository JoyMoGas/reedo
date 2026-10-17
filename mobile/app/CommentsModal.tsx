/**
 * @project Reedo
 * @module CommentsModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-08-27
 * @description Comments modal with rock-solid keyboard avoidance, auto-scroll to latest comments, and safe-area adaptation.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ArrowUp } from 'lucide-react-native';
import api from '../store/api';
import Icon from '../core/Icon';
import { Avatar } from '../components/Avatar';
import { useAuthStore } from '../store/useAuthStore';

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export default function CommentsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { echoId, reviewId } = useLocalSearchParams<{ echoId?: string; reviewId?: string }>();
  const [commentText, setCommentText] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isEcho = !!echoId;
  const endpoint = isEcho ? `/api/social/echoes/${echoId}/comments/` : `/api/social/reviews/${reviewId}/comments/`;
  const queryKey = isEcho ? ['comments', 'echo', echoId] : ['comments', 'review', reviewId];

  // Listen for keyboard events to adjust spacing and scroll smoothly to latest content
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardOpen(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 120);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardOpen(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { data: rawComments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: !!(echoId || reviewId),
  });

  const comments = Array.isArray(rawComments) ? rawComments : (rawComments?.results || []);

  const postMutation = useMutation({
    mutationFn: async (text: string) => {
      const payload = { content: text };
      const res = await api.post(endpoint, payload);
      return res.data;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey });
      // Invalidate the parent queries to update comment counts
      if (isEcho) queryClient.invalidateQueries({ queryKey: ['echoes'] });
      if (!isEcho) queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    },
  });

  const handlePost = () => {
    if (!commentText.trim()) return;
    postMutation.mutate(commentText.trim());
  };

  return (
    <SafeAreaView 
      edges={['top']}
      className="flex-1 bg-[#FFF8F0]"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        className="flex-1"
      >
        {/* Header Actions */}
        <View className="flex-row justify-between items-center py-4 px-6 border-b border-[#EBE7DF]">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center bg-[#F5EEDF] rounded-full"
            activeOpacity={0.7}
            accessibilityLabel="Close comments"
          >
            <X size={20} color="#212842" />
          </TouchableOpacity>
          <Text className="text-lg text-[#212842]" style={{ fontFamily: 'Newsreader-Medium' }}>
            Comments
          </Text>
          <View className="w-10 h-10" />
        </View>

        {/* Comments List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-6 pt-4"
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#212842" className="mt-8" />
          ) : comments.length === 0 ? (
            <View className="items-center mt-12">
              <Icon name="comment" size={48} color="#D8C395" />
              <Text className="text-lg text-[#212842] mt-4" style={{ fontFamily: 'Newsreader-Bold' }}>
                No comments yet
              </Text>
              <Text className="text-sm text-[#8A8A8E] mt-2 text-center px-8" style={{ fontFamily: 'PublicSans-Regular' }}>
                Start the conversation by sharing your thoughts.
              </Text>
            </View>
          ) : (
            comments.map((comment: any) => {
              const u = comment.user;
              const avatar = u?.thumbnail || u?.profile_picture;
              const fullName = u?.full_name || u?.username;

              return (
                <View key={comment.id} className="flex-row mb-6">
                  <Avatar
                    uri={avatar}
                    fullName={fullName}
                    username={u?.username || ''}
                    size={36}
                  />
                  <View className="flex-1 ml-3 bg-[#F5EEDF] p-3 rounded-2xl rounded-tl-sm">
                    <View className="flex-row items-baseline justify-between mb-1">
                      <Text className="text-sm text-[#212842]" style={{ fontFamily: 'PublicSans-Bold' }}>
                        {fullName}
                      </Text>
                      <Text className="text-xs text-[#8A8A8E]" style={{ fontFamily: 'PublicSans-Regular' }}>
                        {formatTimeAgo(comment.created_at)}
                      </Text>
                    </View>
                    <Text className="text-[15px] text-[#4A4B57] leading-relaxed" style={{ fontFamily: 'PublicSans-Regular' }}>
                      {comment.content}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input Area (Guaranteed to float above keyboard on Android & iOS) */}
        <View 
          className="px-6 pt-3 border-t border-[#EBE7DF] bg-[#FFF8F0] flex-row items-end"
          style={{ paddingBottom: isKeyboardOpen ? 12 : Math.max(insets.bottom, 14) }}
        >
          <View className="flex-1 bg-white rounded-3xl min-h-[48px] max-h-[120px] border border-[#EAE2D5] px-4 py-3 justify-center">
            <TextInput
              placeholder="Write a comment..."
              placeholderTextColor="#8A8A8E"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              className="text-base text-[#212842] p-0 m-0"
              style={{ fontFamily: 'PublicSans-Regular', textAlignVertical: 'center' }}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 150);
              }}
            />
          </View>
          <TouchableOpacity 
            className={`w-12 h-12 rounded-full items-center justify-center ml-3 ${
              commentText.trim() ? 'bg-[#212842]' : 'bg-[#EBE7DF]'
            }`}
            onPress={handlePost}
            disabled={!commentText.trim() || postMutation.isPending}
            activeOpacity={0.8}
            accessibilityLabel="Send comment"
          >
            {postMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ArrowUp size={20} color={commentText.trim() ? "#FFF" : "#A1A1A5"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
