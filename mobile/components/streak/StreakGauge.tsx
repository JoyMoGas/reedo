/**
 * @project Reedo
 * @module StreakGauge
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Icon from "../../core/Icon";

interface StreakGaugeProps {
  currentStreak: number;
  nextMilestone: number;
  isActiveToday: boolean;
  onPress?: () => void;
}

export default function StreakGauge({
  currentStreak,
  nextMilestone,
  isActiveToday,
  onPress,
}: StreakGaugeProps) {
  // SVG Circle parameters
  const size = 180;
  const strokeWidth = 9;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate ratio towards next milestone
  const prevMilestone = currentStreak >= 10 ? 10 : currentStreak >= 7 ? 7 : 0;
  const denominator = Math.max(1, nextMilestone - prevMilestone);
  const numerator = Math.max(0, currentStreak - prevMilestone);
  const progressRatio = Math.min(1, Math.max(0.08, numerator / denominator));

  // Stroke dashoffset: circumference - (circumference * progressRatio)
  const strokeDashoffset = circumference - circumference * progressRatio;

  // Dynamic literary copy based on streak
  const getLiteraryHeadline = () => {
    if (currentStreak === 0) return "Ignite the First Spark";
    if (currentStreak < 3) return "The Habit Takes Root";
    if (currentStreak < 7) return "Your Literary Momentum";
    if (currentStreak < 14) return "The Ink Still Flows";
    if (currentStreak < 30) return "Scholar's Discipline";
    return "Legend of the Archive";
  };

  const getLiterarySubtitle = () => {
    const daysLeft = Math.max(1, nextMilestone - currentStreak);
    if (!isActiveToday) {
      return `You have a ${currentStreak}-day streak at stake. Dedicate a few minutes today to keep the ink flowing.`;
    }
    if (currentStreak === 0) {
      return "Every great library begins with a single page. Read today to start your streak.";
    }
    return `${currentStreak} consecutive days of literary immersion. ${daysLeft} day${
      daysLeft === 1 ? "" : "s"
    } away from reaching your ${nextMilestone}-day milestone.`;
  };

  return (
    <View style={styles.container}>
      {/* Circular Progress Gauge */}
      <TouchableOpacity
        style={styles.gaugeWrapper}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
        disabled={!onPress}
      >
        <Svg width={size} height={size} style={styles.svg}>
          <Defs>
            <LinearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#212842" />
              <Stop offset="100%" stopColor="#323C61" />
            </LinearGradient>
            <LinearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF5A36" />
              <Stop offset="100%" stopColor="#E03F1B" />
            </LinearGradient>
          </Defs>

          {/* Background Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E8E2D5"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Foreground Progress Arc */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isActiveToday ? "url(#activeGradient)" : "url(#streakGradient)"}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center Content */}
        <View style={styles.centerContent}>
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.towardsLabel}>TOWARDS {nextMilestone}</Text>
          <Text style={styles.daysStreakLabel}>
            {currentStreak === 1 ? "DAY STREAK" : "DAYS STREAK"}
          </Text>
        </View>

        {/* Floating Capsule Badge Overlapping Bottom Arc (as in Figma) */}
        <View style={styles.floatingPill}>
          <Icon
            name={isActiveToday ? "fireSolid" : "hourglass"}
            size={12}
            color={isActiveToday ? "#FFFFFF" : "#78716C"}
          />
          <Text style={[styles.floatingPillText, isActiveToday && styles.floatingPillTextActive]}>
            {isActiveToday ? "ACTIVE TODAY" : "PENDING TODAY"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Literary Motivation Copy */}
      <View style={styles.copyContainer}>
        <Text style={styles.literaryTitle}>{getLiteraryHeadline()}</Text>
        <Text style={styles.literarySubtitle}>{getLiterarySubtitle()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 14,
    paddingBottom: 18,
  },
  gaugeWrapper: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  streakNumber: {
    fontFamily: "Newsreader-Bold",
    fontSize: 54,
    color: "#212842",
    lineHeight: 58,
    includeFontPadding: false,
    textAlign: "center",
  },
  towardsLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "#8C827A",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: -2,
    includeFontPadding: false,
  },
  daysStreakLabel: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#212842",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 2,
    includeFontPadding: false,
  },
  floatingPill: {
    position: "absolute",
    bottom: -8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4EFE6",
    borderColor: "#E2DCD2",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  floatingPillText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 10,
    color: "#5C5E69",
    letterSpacing: 0.8,
  },
  floatingPillTextActive: {
    color: "#FF5A36",
  },
  copyContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 24,
  },
  literaryTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 24,
    fontStyle: "italic",
    color: "#212842",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  literarySubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 13.5,
    color: "#6B655B",
    textAlign: "center",
    lineHeight: 20,
  },
});
