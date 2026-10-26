/**
 * @project Reedo
 * @module LibraryHonors
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-25
 * @description Dynamic Hall of Honors & Achievements showcase for the reader's library.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../../core/Icon";
import { Avatar } from "../Avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../store/api";
import { useAuthStore } from "../../store/useAuthStore";
import { useStreakStore } from "../../store/useStreakStore";
import { useHonorToastStore } from "../../store/useHonorToastStore";
import { useSyncQueueStore } from "../../store/useSyncQueueStore";
import { useRouter } from "expo-router";
import { CHRONICLE_ITEMS, ChronicleItem, ChronicleUserStats } from "../../constants/chronicles";

export default function LibraryHonors() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const setPinnedBadgesInStore = useAuthStore((state) => state.setPinnedBadges);
  const streakData = useStreakStore((state) => state.data);

  // 1. Fetch User Books to compute live reading achievements
  const { data: userBooksData = [] } = useQuery({
    queryKey: ["userBooks"],
    queryFn: async () => {
      const response = await api.get("api/books/userbook/");
      return response.data;
    },
  });

  // 2. Compute dynamic stats
  const currentStreak = streakData?.current_streak ?? currentUser?.streak_days ?? 0;
  const bestStreak = streakData?.best_streak ?? currentUser?.streak_days ?? 0;

  const userStats = useMemo<ChronicleUserStats>(() => {
    const books = Array.isArray(userBooksData) ? userBooksData : [];
    const completedBooks = books.filter((ub: any) => ub.status === "COMPLETED").length;
    const booksCount = books.length;
    const pagesRead = books.reduce((acc: number, ub: any) => acc + (ub.current_page || 0), 0);
    const hoursRead = Math.floor((currentUser?.total_reading_time_seconds || 0) / 3600);

    return {
      currentStreak,
      bestStreak,
      booksCount,
      completedBooks,
      pagesRead,
      hoursRead,
    };
  }, [userBooksData, currentUser, currentStreak, bestStreak]);

  // 3. Compute real badges dynamically
  const evaluatedBadges = useMemo(() => {
    return CHRONICLE_ITEMS.map((item) => {
      const isUnlocked = item.computeUnlocked(userStats);
      const progress = item.computeProgress(userStats);
      return {
        ...item,
        isUnlocked,
        progress,
      };
    });
  }, [userStats]);

  const unlockedBadges = useMemo(() => {
    return evaluatedBadges.filter((b) => b.isUnlocked);
  }, [evaluatedBadges]);

  // 4. Hall of Honors: Active 3 pinned badges
  const activePinnedIds = useMemo(() => {
    if (
      currentUser?.pinned_badges &&
      Array.isArray(currentUser.pinned_badges) &&
      currentUser.pinned_badges.length > 0
    ) {
      return currentUser.pinned_badges.slice(0, 3);
    }
    // Default to the first 3 unlocked badges if user hasn't explicitly customized yet
    return unlockedBadges.slice(0, 3).map((b) => b.id);
  }, [currentUser?.pinned_badges, unlockedBadges]);

  const pinnedBadges = useMemo(() => {
    return activePinnedIds
      .map((id) => evaluatedBadges.find((b) => b.id === id))
      .filter(Boolean) as (ChronicleItem & { isUnlocked: boolean; progress: number })[];
  }, [activePinnedIds, evaluatedBadges]);

  // Modals state
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedForPin, setSelectedForPin] = useState<string[]>([]);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [selectedBadgeDetail, setSelectedBadgeDetail] = useState<
    (ChronicleItem & { isUnlocked: boolean; progress: number }) | null
  >(null);

  const openCustomizeModal = () => {
    setSelectedForPin([...activePinnedIds]);
    setIsCustomizeOpen(true);
  };

  const handleTogglePinInModal = (badgeId: string) => {
    if (selectedForPin.includes(badgeId)) {
      setSelectedForPin(selectedForPin.filter((id) => id !== badgeId));
    } else {
      if (selectedForPin.length >= 3) {
        Alert.alert(
          "Showcase Limit",
          "You can choose up to 3 honors for your Hall of Honors. Tap a selected honor to replace it."
        );
        return;
      }
      setSelectedForPin([...selectedForPin, badgeId]);
    }
  };

  const handleSavePinnedBadges = async () => {
    // 1. Optimistic update in auth store
    setPinnedBadgesInStore(selectedForPin);
    setIsCustomizeOpen(false);

    useHonorToastStore.getState().showToast({
      points: 0,
      title: "Hall of Honors Updated",
      message: "Your profile showcase has been successfully saved!",
    });

    // 2. Persistent outbox queue
    useSyncQueueStore.getState().enqueue({
      type: "PIN_HONORS",
      endpoint: "api/users/profile/pinned-badges/",
      method: "POST",
      payload: {
        pinned_badges: selectedForPin,
      },
      title: "Hall of Honors Showcase",
      queryKeysToInvalidate: [["currentUser"]],
    });
  };

  // 5. Friends Leaderboard
  const { data: rawFriends = [] } = useQuery({
    queryKey: ["friends", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const response = await api.get(`api/social/friends/${currentUser.id}/`);
        const raw = response.data;
        return Array.isArray(raw)
          ? raw
          : raw?.results && Array.isArray(raw.results)
          ? raw.results
          : [];
      } catch (err) {
        console.warn("Failed to fetch friends in LibraryHonors:", err);
        return [];
      }
    },
    enabled: !!currentUser?.id,
  });
  const friendsList = Array.isArray(rawFriends) ? rawFriends : [];

  const leaderboard = [
    {
      id: currentUser?.id,
      name: "You",
      points: currentUser?.honor_points || 0,
      avatar: currentUser?.thumbnail,
      isSelf: true,
      username: currentUser?.username || "",
    },
    ...friendsList
      .map((friend: any) => {
        if (!friend) return null;
        const friendUser =
          friend.requester && friend.requester.id === currentUser?.id
            ? friend.receiver
            : friend.requester;
        if (!friendUser) return null;
        return {
          id: friendUser.id,
          name: friendUser.full_name || friendUser.username || "Reader",
          points: friendUser.honor_points || 0,
          avatar: friendUser.thumbnail,
          isSelf: false,
          username: friendUser.username,
        };
      })
      .filter(Boolean),
  ].sort((a: any, b: any) => (b?.points || 0) - (a?.points || 0));

  return (
    <ScrollView
      className="flex-1 px-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingTop: 10 }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* ── Hall of Honors Card ────────────────────────────────────── */}
      <View className="w-full bg-[#212842] rounded-[32px] p-6 mb-10 overflow-hidden relative shadow-md">
        <View className="absolute right-[-20] top-0 opacity-10">
          <Icon name="library" size={200} color="#FFF" />
        </View>

        <View className="flex-row justify-between items-start mb-1">
          <Text
            className="text-[#A8AAB2] text-[10px] tracking-widest uppercase"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            DISTINGUISHED ACHIEVEMENTS
          </Text>
          <TouchableOpacity
            onPress={openCustomizeModal}
            className="flex-row items-center bg-white/10 px-3 py-1 rounded-full gap-1"
            activeOpacity={0.75}
          >
            <Icon name="editOutline" size={13} color="#F5DEB3" />
            <Text
              className="text-[#F5DEB3] text-[9px] tracking-widest uppercase"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              CUSTOMIZE
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          className="text-white text-3xl mb-8"
          style={{ fontFamily: "Newsreader-Medium" }}
        >
          Hall of Honors
        </Text>

        {/* 3 Interactive Slots */}
        <View className="flex-row justify-between items-center">
          {[0, 1, 2].map((slotIndex) => {
            const badge = pinnedBadges[slotIndex];
            if (badge) {
              return (
                <TouchableOpacity
                  key={`pinned-${badge.id}-${slotIndex}`}
                  onPress={() => setSelectedBadgeDetail(badge)}
                  className="items-center w-1/3 px-1"
                  activeOpacity={0.8}
                >
                  <View className="w-16 h-16 rounded-full items-center justify-center mb-2 shadow-sm bg-[#F5DEB3]">
                    <Icon name={badge.icon} size={28} color="#212842" />
                  </View>
                  <Text
                    className="text-white text-[9px] tracking-wider uppercase text-center"
                    style={{ fontFamily: "PublicSans-Bold" }}
                    numberOfLines={1}
                  >
                    {badge.title}
                  </Text>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={`empty-slot-${slotIndex}`}
                onPress={openCustomizeModal}
                className="items-center w-1/3 px-1"
                activeOpacity={0.8}
              >
                <View className="w-16 h-16 rounded-full border border-dashed border-[#8E8B82] items-center justify-center mb-2">
                  <Icon name="plus" size={22} color="#8E8B82" />
                </View>
                <Text
                  className="text-[#8E8B82] text-[9px] tracking-wider uppercase text-center"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  PIN HONOR
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Real Achievements Section ──────────────────────────────── */}
      <View className="mb-10">
        <View className="flex-row justify-between items-end mb-4">
          <View>
            <Text
              className="text-[#212842] text-2xl"
              style={{ fontFamily: "Newsreader-Medium" }}
            >
              Achievements
            </Text>
            <Text
              className="text-[#8E8B82] text-xs mt-1"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Honors earned through dedication and literary habit.
            </Text>
          </View>
          <Text
            className="text-[#212842] text-[10px] tracking-widest uppercase text-right leading-tight pb-1"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            {unlockedBadges.length} / {evaluatedBadges.length}
            {"\n"}UNLOCKED
          </Text>
        </View>

        {/* Dynamic Badges Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {evaluatedBadges.map((item) => {
            const isPinned = activePinnedIds.includes(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedBadgeDetail(item)}
                activeOpacity={0.85}
                className={`w-[48%] p-4 rounded-2xl border shadow-sm items-center relative ${
                  item.isUnlocked
                    ? "bg-[#FDF8F0] border-[#E8CAA4]"
                    : "bg-[#F9F6F0] border-[#EFE9DD]"
                }`}
              >
                {/* Pinned Marker */}
                {isPinned && item.isUnlocked && (
                  <View className="absolute top-2 right-2 bg-[#212842] px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <Icon name="stars" size={9} color="#F5DEB3" />
                    <Text
                      className="text-[#F5DEB3] text-[7px]"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      PINNED
                    </Text>
                  </View>
                )}

                <View
                  className={`w-14 h-14 rounded-full items-center justify-center mb-3 shadow-xs ${
                    item.isUnlocked
                      ? "bg-[#F5DEB3]"
                      : "border border-dashed border-[#D6D1C4] bg-white/40"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    size={24}
                    color={item.isUnlocked ? "#212842" : "#A8AAB2"}
                  />
                </View>

                <Text
                  className={`text-sm mb-1 text-center ${
                    item.isUnlocked ? "text-[#212842]" : "text-[#76767E]"
                  }`}
                  style={{ fontFamily: "Newsreader-Bold" }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                <Text
                  className="text-[#8E8B82] text-[10px] text-center mb-2.5 leading-tight"
                  style={{ fontFamily: "PublicSans-Regular" }}
                  numberOfLines={2}
                >
                  {item.requirement}
                </Text>

                {/* Progress bar or Unlocked pill */}
                {item.isUnlocked ? (
                  <View className="bg-[#EBF4ED] px-2.5 py-1 rounded-full flex-row items-center gap-1">
                    <Icon name="checkCircle" size={11} color="#4A7C59" />
                    <Text
                      className="text-[#4A7C59] text-[8px] tracking-wider uppercase"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      UNLOCKED
                    </Text>
                  </View>
                ) : (
                  <View className="w-full">
                    <View className="w-full h-1.5 bg-[#EAE2D5] rounded-full overflow-hidden">
                      <View
                        className="h-full bg-[#C95F44] rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </View>
                    <Text
                      className="text-[#8E8B82] text-[8px] text-right mt-1"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {item.progress}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Friends Leaderboard ────────────────────────────────────── */}
      <View className="mb-10">
        <Text
          className="text-[#212842] text-2xl mb-4"
          style={{ fontFamily: "Newsreader-Medium" }}
        >
          Friends Leaderboard
        </Text>

        <View className="gap-2">
          {leaderboard.map((user, idx) => {
            const isTop = idx === 0;
            if (user.isSelf) {
              return (
                <View
                  key={user.id}
                  className="bg-[#212842] rounded-xl p-4 flex-row items-center shadow-md"
                >
                  <Text
                    className="text-white text-xl w-6 italic mr-2"
                    style={{ fontFamily: "Newsreader-Medium" }}
                  >
                    {idx + 1}
                  </Text>
                  <Avatar
                    uri={user.avatar}
                    username={user.name}
                    size={40}
                    className="mr-3 border border-white/20"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-white text-base leading-tight"
                      style={{ fontFamily: "Newsreader-Bold" }}
                    >
                      You
                    </Text>
                    <Text
                      className="text-[#A8AAB2] text-[8px] tracking-widest uppercase"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      {(user?.points || 0).toLocaleString()} HONOR POINTS
                    </Text>
                  </View>
                  <View className="bg-[#F5DEB3] px-3 py-1 rounded-full">
                    <Text
                      className="text-[#212842] text-[8px] tracking-widest uppercase"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      MASTER
                    </Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={user.id}
                className="bg-[#FDF8F0] rounded-xl p-4 flex-row items-center border border-[#F5EEDF] shadow-sm"
                onPress={() =>
                  router.push({
                    pathname: "/ReaderProfile",
                    params: {
                      userId: user.id,
                      username: user.username,
                      fullName: user.name,
                      avatar: user.avatar,
                    },
                  })
                }
              >
                <Text
                  className="text-[#212842] text-xl w-6 italic mr-2"
                  style={{ fontFamily: "Newsreader-Medium" }}
                >
                  {idx + 1}
                </Text>
                <Avatar
                  uri={user.avatar}
                  username={user.name}
                  size={40}
                  className="mr-3 border border-[#F5EEDF]"
                />
                <View className="flex-1">
                  <Text
                    className="text-[#212842] text-base leading-tight"
                    style={{ fontFamily: "Newsreader-Bold" }}
                  >
                    {user.name}
                  </Text>
                  <Text
                    className="text-[#8E8B82] text-[8px] tracking-widest uppercase"
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    {(user?.points || 0).toLocaleString()} HONOR POINTS
                  </Text>
                </View>
                {isTop && <Icon name="medalStarAlt" size={24} color="#F5DEB3" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Modal 1: Customize Hall of Honors ───────────────────────── */}
      <Modal
        visible={isCustomizeOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCustomizeOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setIsCustomizeOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: "#FFF8F0",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
              paddingBottom: Math.max(insets.bottom, 24),
              maxHeight: "85%",
            }}
          >
            {/* Pill */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#D6D1C4",
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            <View className="flex-row justify-between items-center mb-1">
              <Text
                className="text-2xl text-[#212842]"
                style={{ fontFamily: "Newsreader-Bold" }}
              >
                Customize Hall of Honors
              </Text>
              <TouchableOpacity onPress={() => setIsCustomizeOpen(false)}>
                <Icon name="cancel" size={22} color="#212842" />
              </TouchableOpacity>
            </View>

            <Text
              className="text-xs text-[#8E8B82] mb-5 leading-normal"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Select up to 3 unlocked honors to showcase at the top of your library and to fellow readers visiting your public profile.
            </Text>

            {/* Selection Counter */}
            <View className="flex-row items-center justify-between bg-[#F5EEDF] py-2.5 px-4 rounded-xl mb-4">
              <Text
                className="text-xs text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Showcased: {selectedForPin.length} / 3 Honors
              </Text>
              <Text
                className="text-[10px] text-[#8E8B82] uppercase tracking-wider"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Tap to toggle
              </Text>
            </View>

            {/* List of Unlocked Honors */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {unlockedBadges.length === 0 ? (
                <View className="py-12 items-center px-4">
                  <Icon name="medalStarAlt" size={44} color="#D6D1C4" />
                  <Text
                    className="text-base text-[#212842] mt-3 text-center"
                    style={{ fontFamily: "Newsreader-Bold" }}
                  >
                    No Honors Unlocked Yet
                  </Text>
                  <Text
                    className="text-xs text-[#8E8B82] text-center mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    Keep up your reading streak and complete books to earn honors you can display here!
                  </Text>
                </View>
              ) : (
                unlockedBadges.map((badge) => {
                  const isSelected = selectedForPin.includes(badge.id);

                  return (
                    <TouchableOpacity
                      key={badge.id}
                      onPress={() => handleTogglePinInModal(badge.id)}
                      activeOpacity={0.75}
                      className={`flex-row items-center p-3.5 rounded-2xl mb-2.5 border ${
                        isSelected
                          ? "bg-[#FAF0E4] border-[#E4A834]"
                          : "bg-white border-[#EBE7DF]"
                      }`}
                    >
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                          isSelected ? "bg-[#F5DEB3]" : "bg-[#F5EEDF]"
                        }`}
                      >
                        <Icon name={badge.icon} size={22} color="#212842" />
                      </View>

                      <View className="flex-1 mr-2">
                        <Text
                          className="text-base text-[#212842] leading-tight"
                          style={{ fontFamily: "Newsreader-Bold" }}
                        >
                          {badge.title}
                        </Text>
                        <Text
                          className="text-xs text-[#8E8B82] mt-0.5"
                          style={{ fontFamily: "PublicSans-Regular" }}
                          numberOfLines={1}
                        >
                          {badge.description}
                        </Text>
                      </View>

                      {/* Selection Indicator */}
                      <View
                        className={`w-7 h-7 rounded-full items-center justify-center ${
                          isSelected
                            ? "bg-[#212842]"
                            : "border border-[#D6D1C4] bg-transparent"
                        }`}
                      >
                        {isSelected && <Icon name="checkCircle" size={16} color="#FFF8F0" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSavePinnedBadges}
              disabled={isSavingPins}
              className="bg-[#212842] py-4 rounded-full items-center justify-center mt-4 shadow-sm"
              activeOpacity={0.85}
            >
              {isSavingPins ? (
                <ActivityIndicator size="small" color="#FFF8F0" />
              ) : (
                <Text
                  className="text-[#FFF8F0] text-base"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  Save Hall of Honors
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal 2: Badge Detail View ──────────────────────────────── */}
      <Modal
        visible={!!selectedBadgeDetail}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedBadgeDetail(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
          activeOpacity={1}
          onPress={() => setSelectedBadgeDetail(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: "#FFF8F0",
              borderRadius: 28,
              padding: 26,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#EBE7DF",
            }}
          >
            {/* Medallion */}
            <View
              className={`w-20 h-20 rounded-full items-center justify-center mb-4 shadow-md ${
                selectedBadgeDetail?.isUnlocked ? "bg-[#F5DEB3]" : "bg-[#EAE2D5]"
              }`}
            >
              <Icon
                name={selectedBadgeDetail?.icon || "stars"}
                size={36}
                color={selectedBadgeDetail?.isUnlocked ? "#212842" : "#8A8A8E"}
              />
            </View>

            <Text
              className="text-2xl text-[#212842] text-center mb-1"
              style={{ fontFamily: "Newsreader-Bold" }}
            >
              {selectedBadgeDetail?.title}
            </Text>

            <View className="bg-[#FAF0E4] px-3 py-1 rounded-full mb-3">
              <Text
                className="text-[9px] text-[#C95F44] tracking-widest uppercase"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                {selectedBadgeDetail?.category} HONOR
              </Text>
            </View>

            <Text
              className="text-sm text-[#76767E] text-center mb-4 leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              {selectedBadgeDetail?.description}
            </Text>

            {/* Requirement Card */}
            <View className="w-full bg-[#F5EEDF] p-3.5 rounded-xl mb-4">
              <Text
                className="text-[10px] text-[#8E8B82] uppercase tracking-wider mb-1"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Requirement
              </Text>
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Regular" }}
              >
                {selectedBadgeDetail?.requirement}
              </Text>
            </View>

            {/* Reward */}
            <View className="w-full bg-[#FAF0E4] p-3.5 rounded-xl mb-5 flex-row items-center gap-2">
              <Icon name="medalStarFilled" size={18} color="#E4A834" />
              <View className="flex-1">
                <Text
                  className="text-[9px] text-[#8E8B82] uppercase tracking-wider"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  Honor Reward
                </Text>
                <Text
                  className="text-xs text-[#212842]"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  {selectedBadgeDetail?.reward}
                </Text>
              </View>
            </View>

            {/* Status or Pin action */}
            {selectedBadgeDetail?.isUnlocked ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedBadgeDetail(null);
                  openCustomizeModal();
                }}
                className="w-full bg-[#212842] py-3.5 rounded-full items-center mb-2"
                activeOpacity={0.85}
              >
                <Text
                  className="text-[#FFF8F0] text-sm"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  {activePinnedIds.includes(selectedBadgeDetail.id)
                    ? "Pinned in Hall of Honors"
                    : "Pin to Hall of Honors"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="w-full bg-[#EAE2D5] py-3 rounded-full items-center mb-2">
                <Text
                  className="text-[#76767E] text-xs"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  Progress: {selectedBadgeDetail?.progress}%
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setSelectedBadgeDetail(null)}
              className="py-2"
            >
              <Text
                className="text-xs text-[#8E8B82]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
