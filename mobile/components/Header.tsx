import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/useAuthStore";
import { Avatar } from "./Avatar";
import { User, BookOpen, Settings, LogOut } from "lucide-react-native";
import Icon from "../core/Icon";
import { useRouter } from "expo-router";

export const Header = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    router.push(path as any);
  };

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
        {/* Left: Honor Points Counter */}
        <View className="flex-1 flex-row items-center justify-start">
          <View className="flex-row items-center gap-1.5 py-2">
            <Icon name="medalStarFilled" size={20} color="#D4AF37" />
            <Text
              className="text-sm text-[#212842]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {user?.honor_points ?? 0}
            </Text>
          </View>
        </View>

        {/* Center: Logo */}
        <View className="flex-row items-center justify-center">
          <Text
            style={{ fontFamily: "Newsreader-Bold" }}
            className="text-2xl text-[#212842] tracking-wider"
          >
            REEDO
          </Text>
        </View>

        {/* Right: Streak & Profile Picture */}
        <View className="flex-1 flex-row items-center justify-end gap-3">
          {/* Streak Counter */}
          <View className="flex-row items-center gap-1">
            <Icon name="fireSolid" size={20} color="#E57A7A" />
            <Text
              className="text-sm text-[#212842]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {user?.streak_days ?? 0}
            </Text>
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
                console.log("Profile clicked");
              }}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-[#EBE7DF]/45"
            >
              <User size={18} color="#212842" />
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Perfil / Profile
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
                Mi Biblioteca
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                console.log("Settings clicked");
              }}
              className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-lg active:bg-[#EBE7DF]/45"
            >
              <Settings size={18} color="#212842" />
              <Text
                className="text-sm text-[#212842]"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Ajustes / Settings
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
                Logout / Salir
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
});
