/**
 * @project Reedo
 * @module DuolingoFire
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-14
 */
import React, { useEffect, useRef } from "react";
import { View, Animated, Easing, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient, Circle, G } from "react-native-svg";

interface DuolingoFireProps {
  size?: number;
  isActive?: boolean;
}

export default function DuolingoFire({ size = 120, isActive = true }: DuolingoFireProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flameWobble = useRef(new Animated.Value(0)).current;
  const innerPulse = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const sparkAnim1 = useRef(new Animated.Value(0)).current;
  const sparkAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Breathing pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.98,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Subtle flame sway
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameWobble, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(flameWobble, {
            toValue: -1,
            duration: 1300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Inner flame flutter
      Animated.loop(
        Animated.sequence([
          Animated.timing(innerPulse, {
            toValue: 1.12,
            duration: 650,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(innerPulse, {
            toValue: 0.92,
            duration: 750,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Background aura glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.85,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.35,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Floating sparks
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkAnim1, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(sparkAnim2, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(sparkAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      flameWobble.setValue(0);
      innerPulse.setValue(1);
      glowAnim.setValue(0.15);
      sparkAnim1.setValue(0);
      sparkAnim2.setValue(0);
    }
  }, [isActive]);

  const rotation = flameWobble.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-3deg", "3deg"],
  });

  const spark1TranslateY = sparkAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -38],
  });
  const spark1Opacity = sparkAnim1.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 0.8, 0],
  });

  const spark2TranslateY = sparkAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -42],
  });
  const spark2Opacity = sparkAnim2.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 0.8, 0],
  });

  // Scale ratios based on target size
  const scale = size / 100;

  return (
    <View style={[{ width: size, height: size * 1.15, alignItems: "center", justifyContent: "center" }]}>
      {/* Outer ambient glow */}
      {isActive && (
        <Animated.View
          style={[
            styles.glowCircle,
            {
              width: size * 1.3,
              height: size * 1.3,
              borderRadius: (size * 1.3) / 2,
              opacity: glowAnim,
            },
          ]}
        />
      )}

      {/* Floating Sparks */}
      {isActive && (
        <>
          <Animated.View
            style={[
              styles.spark,
              {
                left: size * 0.25,
                top: size * 0.35,
                opacity: spark1Opacity,
                transform: [{ translateY: spark1TranslateY }, { translateX: -4 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.spark,
              {
                right: size * 0.24,
                top: size * 0.38,
                opacity: spark2Opacity,
                transform: [{ translateY: spark2TranslateY }, { translateX: 6 }],
              },
            ]}
          />
        </>
      )}

      {/* Animated Flame Container */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }, { rotate: rotation }],
        }}
      >
        <Svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
          <Defs>
            {/* Active Vibrant Flame Gradients */}
            <LinearGradient id="fireOuterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FF4B2B" />
              <Stop offset="50%" stopColor="#FF416C" />
              <Stop offset="100%" stopColor="#FF7A00" />
            </LinearGradient>

            <LinearGradient id="fireMidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FF7A00" />
              <Stop offset="65%" stopColor="#FFA800" />
              <Stop offset="100%" stopColor="#FFC727" />
            </LinearGradient>

            <LinearGradient id="fireInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF275" />
              <Stop offset="100%" stopColor="#FFFFFF" />
            </LinearGradient>

            {/* Inactive Dormant Gradients */}
            <LinearGradient id="dormantOuterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#A8A29E" />
              <Stop offset="100%" stopColor="#78716C" />
            </LinearGradient>

            <LinearGradient id="dormantInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#D6D3D1" />
              <Stop offset="100%" stopColor="#A8A29E" />
            </LinearGradient>
          </Defs>

          {/* Outer Main Flame */}
          <Path
            d="M50 4 C50 4 66 22 66 38 C66 45 62 50 58 54 C66 49 76 56 76 68 C76 86 64 104 50 104 C36 104 24 86 24 68 C24 53 34 44 42 38 C48 33 46 20 50 4 Z"
            fill={isActive ? "url(#fireOuterGrad)" : "url(#dormantOuterGrad)"}
          />

          {/* Side Flame Tendril (Right Accent) */}
          <Path
            d="M55 48 C68 46 80 58 80 72 C80 84 72 95 62 100 C73 93 76 82 74 72 C72 63 64 54 55 48 Z"
            fill={isActive ? "#FF3B30" : "#6E6863"}
            opacity={0.65}
          />

          {/* Middle Warm Flame */}
          <Path
            d="M50 28 C50 28 60 42 60 56 C60 62 57 66 54 70 C60 67 65 72 65 80 C65 92 56 100 50 100 C44 100 35 92 35 80 C35 70 41 64 45 60 C49 56 48 40 50 28 Z"
            fill={isActive ? "url(#fireMidGrad)" : "url(#dormantInnerGrad)"}
          />

          {/* Inner Core Bright Flame */}
          <Path
            d="M50 52 C50 52 56 62 56 72 C56 78 52 82 50 86 C48 82 44 78 44 72 C44 62 50 52 50 52 Z"
            fill={isActive ? "url(#fireInnerGrad)" : "#E7E5E4"}
            opacity={isActive ? 0.95 : 0.7}
          />

          {/* Playful Duolingo-style Face Eyes (when active) */}
          {isActive ? (
            <G>
              {/* Left Eye */}
              <Circle cx="44" cy="68" r="3.2" fill="#212842" />
              <Circle cx="43" cy="67" r="1.1" fill="#FFFFFF" />

              {/* Right Eye */}
              <Circle cx="56" cy="68" r="3.2" fill="#212842" />
              <Circle cx="55" cy="67" r="1.1" fill="#FFFFFF" />

              {/* Cheerful Smile */}
              <Path
                d="M47 75 C48.5 77.5 51.5 77.5 53 75"
                stroke="#212842"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </G>
          ) : (
            <G opacity={0.6}>
              {/* Sleeping Eyes (- -) */}
              <Path
                d="M41 70 C43 71.5 45 71.5 47 70"
                stroke="#57534E"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M53 70 C55 71.5 57 71.5 59 70"
                stroke="#57534E"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowCircle: {
    position: "absolute",
    backgroundColor: "rgba(255, 122, 0, 0.22)",
  },
  spark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFB800",
    shadowColor: "#FF7A00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
});
