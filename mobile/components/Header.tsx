import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Switch, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { useNotificationsStore } from "../store/useNotificationsStore";
import { Avatar } from "./Avatar";
import { User, BookOpen, Settings, LogOut, X } from "lucide-react-native";
import Icon from "../core/Icon";
import { useRouter, useSegments } from "expo-router";

export const Header = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { hasUnreadNotifications } = useNotificationsStore();
  const { 
    theme, 
    fontSize, 
    dailyReadingGoal, 
    immersionModeEnabled, 
    setTheme, 
    setFontSize, 
    setDailyReadingGoal, 
    setImmersionModeEnabled 
  } = useSettingsStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    router.push(path as any);
  };

  const incrementGoal = () => setDailyReadingGoal(dailyReadingGoal + 5);
  const decrementGoal = () => setDailyReadingGoal(Math.max(5, dailyReadingGoal - 5));

  const segments = useSegments();
  
  let headerTitle = "REEDO";
  if (segments[1] === "discover") headerTitle = "DISCOVER";
  else if (segments[1] === "library") headerTitle = "LIBRARY";
  else if (segments[1] === "echoes") headerTitle = "ECHOES";

  return (
    <>
      {/* Click-outside backdrop to dismiss the popover */}
      {isMenuOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        />
      )}

      <View
        style={{
          paddingTop: Math.max(insets.top, 12),
          position: "relative",
          zIndex: 100,
        }}
        className="bg-[#FFF8F0] border-b border-[#EBE7DF] px-5 pb-3 flex-row items-center justify-between"
      >
        {/* Left: Streak Counter */}
        <View className="flex-1 flex-row items-center justify-start">
          <View className="flex-row items-center gap-1.5 py-2">
            <Icon name="fireSolid" size={26} color="#E57A7A" />
            <Text
              className="text-base text-[#212842]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {user?.streak_days ?? 0}
            </Text>
          </View>
        </View>

        {/* Center: Logo / Title */}
        <View className="flex-row items-center justify-center">
          <Text
            style={{ fontFamily: "Newsreader-Bold" }}
            className="text-2xl text-[#212842] tracking-wider"
          >
            {headerTitle}
          </Text>
        </View>

        {/* Right: Notifications & Profile Picture */}
        <View className="flex-1 flex-row items-center justify-end gap-3">
          {/* Notification Bell */}
          <View className="relative">
            <TouchableOpacity
              onPress={() => router.push("/Notifications")}
              className="p-1 active:opacity-70"
              accessibilityLabel="Notifications"
              accessibilityRole="button"
            >
              <Icon name="notification" size={26} color="#212842" />
            </TouchableOpacity>
            {hasUnreadNotifications && (
              <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E57A7A] rounded-full border border-[#FFF8F0]" />
            )}
          </View>

          {/* Profile Picture */}
          <TouchableOpacity
            onPress={() => setIsMenuOpen(!isMenuOpen)}
            accessibilityLabel="Profile"
            accessibilityRole="button"
            className="active:opacity-80"
          >
            <Avatar
              uri={user?.thumbnail}
              fullName={user?.full_name}
              username={user?.username}
              size={36}
            />
          </TouchableOpacity>
        </View>

        {/* Popover Bubble Menu */}
        {isMenuOpen && (
          <View
            style={[
              styles.popover,
              {
                top: 50 + Math.max(insets.top, 12),
              },
            ]}
          >
            {/* Popover Triangle Tip */}
            <View style={styles.triangle} />

            {/* Profile Info Summary */}
            <View className="px-3 py-2 border-b border-[#EBE7DF] mb-1">
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
                numberOfLines={1}
              >
                {user?.full_name || "Intentional Reader"}
              </Text>
              <Text
                className="text-xs text-[#76767E]"
                style={{ fontFamily: "PublicSans-Regular" }}
                numberOfLines={1}
              >
                @{user?.username || "reader"}
              </Text>
            </View>

            {/* Menu Options */}
            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                if (user) {
                  router.push({
                    pathname: '/ReaderProfile',
                    params: {
                      userId: user.id,
                      username: user.username,
                      fullName: user.full_name,
                      avatar: user.thumbnail,
                      memberSince: user.member_since_formatted
                    }
                  });
                }
              }}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-[#EBE7DF]/45"
            >
              <User size={18} color="#212842" />
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNavigate("/(tabs)/library")}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-[#EBE7DF]/45"
            >
              <BookOpen size={18} color="#212842" />
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                My Library
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-[#EBE7DF]/45"
            >
              <Settings size={18} color="#212842" />
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Settings
              </Text>
            </TouchableOpacity>

            {/* Separator */}
            <View className="h-[1px] bg-[#EBE7DF] my-1" />

            {/* Logout Option */}
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-red-50"
            >
              <LogOut size={18} color="#E57A7A" />
              <Text
                className="text-sm text-[#E57A7A]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        visible={isSettingsOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-[#EBE7DF] pb-4 mb-5">
              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-2xl text-[#212842]"
              >
                Reading Settings
              </Text>
              <TouchableOpacity
                onPress={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full bg-[#EBE7DF]/50"
              >
                <X size={20} color="#212842" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Theme Preference */}
              <View className="mb-6">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-sm text-[#76767E] uppercase tracking-wider mb-3"
                >
                  Theme Landscape
                </Text>
                <View className="flex-row gap-3">
                  {(["light", "sepia", "dark"] as const).map((t) => {
                    const isSelected = theme === t;
                    const bgOptionColor =
                      t === "light" ? "#FFF8F0" : t === "sepia" ? "#FCF3E0" : "#212842";
                    const textOptionColor = t === "dark" ? "#FFF8F0" : "#212842";

                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setTheme(t)}
                        style={[
                          styles.themeCard,
                          { backgroundColor: bgOptionColor },
                          isSelected && styles.selectedCardBorder,
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontFamily: "Newsreader-Bold",
                            color: textOptionColor,
                          }}
                          className="text-base"
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Text className="text-[9px] text-[#FFF8F0] font-bold">✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Font Size Preference */}
              <View className="mb-6">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-sm text-[#76767E] uppercase tracking-wider mb-3"
                >
                  Typography Scale
                </Text>
                <View className="flex-row gap-2">
                  {(["small", "medium", "large", "extra-large"] as const).map((size) => {
                    const isSelected = fontSize === size;
                    const sizeLabel =
                      size === "small"
                        ? "A-"
                        : size === "medium"
                        ? "A"
                        : size === "large"
                        ? "A+"
                        : "A++";
                    return (
                      <TouchableOpacity
                        key={size}
                        onPress={() => setFontSize(size)}
                        className={`flex-1 items-center justify-center py-3.5 rounded-xl border-2 ${
                          isSelected
                            ? "bg-[#212842] border-[#212842]"
                            : "bg-[#FAF3E8] border-transparent"
                        }`}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{ fontFamily: "PublicSans-Bold" }}
                          className={`text-sm ${
                            isSelected ? "text-[#FFF8F0]" : "text-[#212842]"
                          }`}
                        >
                          {sizeLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Daily Literary Goal */}
              <View className="mb-6">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-sm text-[#76767E] uppercase tracking-wider mb-3"
                >
                  Daily Reading Goal
                </Text>
                <View className="flex-row items-center justify-between bg-[#FAF3E8] p-4 rounded-2xl">
                  <TouchableOpacity
                    onPress={decrementGoal}
                    className="w-10 h-10 rounded-full bg-[#EBE7DF] items-center justify-center active:opacity-70"
                  >
                    <Text className="text-xl text-[#212842] font-bold">-</Text>
                  </TouchableOpacity>
                  <View className="items-center">
                    <Text
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-2xl text-[#212842]"
                    >
                      {dailyReadingGoal}
                    </Text>
                    <Text
                      style={{ fontFamily: "PublicSans-Regular" }}
                      className="text-xs text-[#76767E] mt-0.5"
                    >
                      minutes per day
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={incrementGoal}
                    className="w-10 h-10 rounded-full bg-[#EBE7DF] items-center justify-center active:opacity-70"
                  >
                    <Text className="text-xl text-[#212842] font-bold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Immersion Mode */}
              <View className="flex-row items-center justify-between bg-[#FAF3E8] p-4 rounded-2xl mb-8">
                <View className="flex-1 pr-4">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-base text-[#212842]"
                  >
                    Immersion Mode
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#76767E] mt-0.5"
                  >
                    Fades navigational interfaces to expand textual focus.
                  </Text>
                </View>
                <Switch
                  value={immersionModeEnabled}
                  onValueChange={setImmersionModeEnabled}
                  trackColor={{ false: "#EBE7DF", true: "#212842" }}
                  thumbColor={immersionModeEnabled ? "#FFF8F0" : "#C5C2BA"}
                />
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              onPress={() => setIsSettingsOpen(false)}
              className="w-full bg-[#212842] rounded-full py-4 items-center justify-center mt-2"
              activeOpacity={0.9}
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#FFFFFF] text-base"
              >
                Apply Changes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 1500, // covers screen area
    width: "100%",
    backgroundColor: "transparent",
    zIndex: 90,
  },
  popover: {
    position: "absolute",
    right: 16,
    width: 190,
    backgroundColor: "#FCF3E0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EBE7DF",
    padding: 6,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 110,
  },
  triangle: {
    position: "absolute",
    top: -7,
    right: 16,
    width: 12,
    height: 12,
    backgroundColor: "#FCF3E0",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#EBE7DF",
    transform: [{ rotate: "45deg" }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(33, 40, 66, 0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  themeCard: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCardBorder: {
    borderColor: "#212842",
  },
  checkBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#212842",
    alignItems: "center",
    justifyContent: "center",
  },
});
