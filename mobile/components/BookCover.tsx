import React, { useState } from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import NoCover from "../app/assets/NoCover.svg";

interface BookCoverProps {
  uri?: string | null;
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ImageStyle>;
  className?: string;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}

export default function BookCover({ uri, width = 115, height = 170, style, className, resizeMode = "cover" }: BookCoverProps) {
  const [error, setError] = useState(false);

  if (!uri || error || uri.trim() === "") {
    return <NoCover width={width as number} height={height as number} />;
  }

  return (
    <Image
      source={{ uri }}
      style={[{ width, height }, style]}
      className={className}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
}
