// @@iconify-code-gen
import React from "react";
import { Iconify } from "react-native-iconify";
import iconMap from "./iconify.json";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 24, color = "#212842", style }: IconProps) {
  const iconifyName = (iconMap as Record<string, string>)[name];

  if (!iconifyName) {
    console.warn(`Icon name "${name}" does not exist in iconify.json`);
    return <Iconify icon="fa6-solid:circle-question" size={size} color={color} style={style} />;
  }

  return <Iconify icon={iconifyName} size={size} color={color} style={style} />;
}
