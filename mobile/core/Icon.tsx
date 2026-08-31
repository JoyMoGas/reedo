/**
 * @project Reedo
 * @module Icon
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-12
 */
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
    console.warn(`Icon "${name}" not found in core/iconify.json`);
    return <Iconify icon="material-symbols:block" size={size} color={color} style={style} />;
  }

  return <Iconify icon={iconifyName} size={size} color={color} style={style} />;
}
