import React, { useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

interface AvatarProps {
  uri?: string | null;
  fullName?: string;
  username?: string;
  size?: number;
}

const colors = [
  "#E57A7A", // Rose/Rust (Matches App Logout/Accent)
  "#212842", // Primary Navy
  "#E2A96B", // Warm Gold
  "#639A88", // Sage Green
  "#4A607A", // Slate Blue
  "#5C5E69", // Cool Gray
  "#A9A695", // Warm Muted Gray
];

const getAvatarColor = (name: string) => {
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (fullName?: string, username?: string) => {
  const nameToUse = fullName?.trim() || username?.trim() || "";
  if (!nameToUse) return "U";

  const parts = nameToUse.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  fullName,
  username,
  size = 96,
}) => {
  const [hasError, setHasError] = useState(false);
  const nameToUse = fullName || username || "";
  const initials = getInitials(fullName, username);
  const backgroundColor = getAvatarColor(nameToUse);

  const showImage = uri && !hasError;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showImage ? "#EBE7DF" : backgroundColor,
        },
      ]}
      className="shadow-sm items-center justify-center border border-[#EBE7DF]"
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setHasError(true)}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.38,
              fontFamily: "PublicSans-Bold",
            },
          ]}
          className="text-white text-center leading-none"
        >
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});
