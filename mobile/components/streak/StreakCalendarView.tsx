/**
 * @project Reedo
 * @module StreakCalendarView
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "../../core/Icon";
import { CalendarDayInfo } from "../../store/useStreakStore";

interface StreakCalendarViewProps {
  calendarHistory?: Record<string, CalendarDayInfo>;
  currentStreak: number;
  bestStreak: number;
  freezesAvailable: number;
  isActiveToday: boolean;
  onGoToMilestones: () => void;
  onStartReading: () => void;
  onShareStreak: () => void;
}

export default function StreakCalendarView({
  calendarHistory = {},
  currentStreak,
  bestStreak,
  freezesAvailable,
  isActiveToday,
  onGoToMilestones,
  onStartReading,
  onShareStreak,
}: StreakCalendarViewProps) {
  // Calendar month state
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar grid
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonthView = today.getFullYear() === year && today.getMonth() === month;
  const todayDayNum = isCurrentMonthView ? today.getDate() : -1;
  const todayStr = today.toLocaleDateString("en-CA");

  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  // Build grid cells (rows of 7)
  const cells: Array<{
    dayNum: number | null;
    dateStr: string | null;
    isToday: boolean;
    isActive: boolean;
    isFrozen: boolean;
    isRecovered: boolean;
  }> = [];

  // Blank days before the 1st
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({
      dayNum: null,
      dateStr: null,
      isToday: false,
      isActive: false,
      isFrozen: false,
      isRecovered: false,
    });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = d.toLocaleDateString("en-CA");
    const dayData = calendarHistory[dateStr];
    const isToday = isCurrentMonthView && day === todayDayNum;

    const isActive = dayData?.status === "ACTIVE" || (isToday && isActiveToday);
    const isFrozen = dayData?.status === "FROZEN";
    const isRecovered = dayData?.status === "RECOVERED";

    cells.push({
      dayNum: day,
      dateStr,
      isToday,
      isActive,
      isFrozen,
      isRecovered,
    });
  }

  // Group cells into weeks
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Calendar Card Container */}
      <View style={styles.calendarCard}>
        {/* Month Navigation Header */}
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>
            {monthNames[month]} {year}
          </Text>
          <View style={styles.navControls}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navButton}
              activeOpacity={0.7}
              accessibilityLabel="Previous month"
            >
              <Icon name="chevronLeft" size={18} color="#212842" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navButton}
              activeOpacity={0.7}
              accessibilityLabel="Next month"
            >
              <Icon name="chevronRight" size={18} color="#212842" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weekday Row */}
        <View style={styles.weekdaysRow}>
          {weekdays.map((wd, i) => (
            <Text key={i} style={styles.weekdayText}>
              {wd}
            </Text>
          ))}
        </View>

        {/* Days Grid with Connected Streak Capsule Highlights */}
        <View style={styles.gridContainer}>
          {weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {week.map((cell, cellIdx) => {
                if (!cell.dayNum) {
                  return <View key={cellIdx} style={styles.dayCellEmpty} />;
                }

                // Check contiguous streak connection for background pill
                const prevCell = cellIdx > 0 ? week[cellIdx - 1] : null;
                const nextCell = cellIdx < 6 ? week[cellIdx + 1] : null;
                const isConnectedLeft = cell.isActive && !!prevCell?.isActive;
                const isConnectedRight = cell.isActive && !!nextCell?.isActive;
                const hasConnection = isConnectedLeft || isConnectedRight;

                return (
                  <View key={cellIdx} style={styles.dayCellWrapper}>
                    {/* Continuous streak connector background (only if connected to adjacent day) */}
                    {cell.isActive && hasConnection && (
                      <View
                        style={[
                          styles.streakConnectorBg,
                          isConnectedLeft && isConnectedRight && { left: 0, right: 0 },
                          isConnectedLeft && !isConnectedRight && { left: 0, right: "50%" },
                          !isConnectedLeft && isConnectedRight && { left: "50%", right: 0 },
                        ]}
                      />
                    )}

                    {/* Day circle */}
                    <View
                      style={[
                        styles.dayCircle,
                        cell.isToday && !cell.isActive && styles.todayCircle,
                        cell.isToday && cell.isActive && styles.todayActiveCircle,
                        !cell.isToday && cell.isActive && styles.activeDayCircle,
                        cell.isFrozen && styles.frozenCircle,
                        cell.isRecovered && styles.recoveredCircle,
                      ]}
                    >
                      {cell.isFrozen ? (
                        <Icon name="snowflake" size={13} color="#0284C7" />
                      ) : cell.isToday && cell.isActive ? (
                        <Text style={styles.todayActiveText}>{cell.dayNum}</Text>
                      ) : (
                        <Text
                          style={[
                            styles.dayNumText,
                            cell.isActive && styles.activeDayText,
                            cell.isToday && styles.todayText,
                          ]}
                        >
                          {cell.dayNum}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Streak Summary Info Cards (Figma Style) */}
      <View style={styles.statsList}>
        {/* Current Streak */}
        <View style={styles.statRowCard}>
          <View style={styles.statRowLeft}>
            <View style={styles.statIconBadge}>
              <Icon name="fireSolid" size={16} color="#FF5A36" />
            </View>
            <Text style={styles.statRowTitle}>CURRENT STREAK</Text>
          </View>
          <Text style={styles.statRowValue}>{currentStreak} Days</Text>
        </View>

        {/* Longest Streak */}
        <View style={styles.statRowCard}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconBadge, { backgroundColor: "#FEF3C7" }]}>
              <Icon name="stars" size={16} color="#D97706" />
            </View>
            <Text style={styles.statRowTitle}>LONGEST STREAK</Text>
          </View>
          <Text style={styles.statRowValue}>{bestStreak} Days</Text>
        </View>

        {/* Streak Freezes (Ink Blots) */}
        <View style={styles.statRowCard}>
          <View style={styles.statRowLeft}>
            <View style={[styles.statIconBadge, { backgroundColor: "#E0F2FE" }]}>
              <Icon name="snowflake" size={16} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.statRowTitle}>STREAK FREEZES (INK BLOTS)</Text>
              <Text style={styles.statRowSubtitle}>
                {freezesAvailable > 0
                  ? "Available for missed days"
                  : "No freezes currently available"}
              </Text>
            </View>
          </View>
          <Text style={styles.statRowValue}>{freezesAvailable}/3</Text>
        </View>
      </View>

      {/* Action CTAs (UI/UX Recommended based on habit retention) */}
      <View style={styles.ctaContainer}>
        {!isActiveToday ? (
          <>
            <TouchableOpacity
              onPress={onStartReading}
              style={styles.primaryBtn}
              activeOpacity={0.88}
            >
              <Icon name="bookOpen" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>CONTINUE READING TODAY</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onGoToMilestones}
              style={styles.secondaryBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>VIEW STREAK DETAILS & REWARDS</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={onGoToMilestones}
              style={styles.primaryBtn}
              activeOpacity={0.88}
            >
              <Icon name="stars" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>VIEW STREAK DETAILS & REWARDS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onShareStreak}
              style={styles.secondaryBtn}
              activeOpacity={0.8}
            >
              <Icon name="share" size={16} color="#212842" />
              <Text style={styles.secondaryBtnText}>SHARE THIS MILESTONE</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  calendarCard: {
    backgroundColor: "#FAF3E8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  monthTitle: {
    fontFamily: "Newsreader-Bold",
    fontSize: 22,
    color: "#212842",
    includeFontPadding: false,
  },
  navControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFEAE0",
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "PublicSans-Bold",
    fontSize: 10.5,
    color: "#8C827A",
    letterSpacing: 0.5,
  },
  gridContainer: {
    gap: 6,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayCellWrapper: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayCellEmpty: {
    flex: 1,
    height: 38,
  },
  streakConnectorBg: {
    position: "absolute",
    top: 5,
    bottom: 5,
    backgroundColor: "#E8DFC8",
    zIndex: 1,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    backgroundColor: "transparent",
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: "#212842",
    backgroundColor: "transparent",
  },
  todayActiveCircle: {
    backgroundColor: "#212842",
    borderWidth: 0,
  },
  activeDayCircle: {
    backgroundColor: "#EFE8DA",
  },
  frozenCircle: {
    backgroundColor: "#E0F2FE",
  },
  recoveredCircle: {
    backgroundColor: "#FEF3C7",
  },
  dayNumText: {
    fontFamily: "PublicSans-Medium",
    fontSize: 13,
    color: "#4A453E",
    includeFontPadding: false,
  },
  activeDayText: {
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  todayText: {
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  todayActiveText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    color: "#FFFFFF",
    includeFontPadding: false,
  },
  statsList: {
    gap: 10,
    marginBottom: 20,
  },
  statRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F2EA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBE3D3",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  statRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFE4DE",
    alignItems: "center",
    justifyContent: "center",
  },
  statRowTitle: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    letterSpacing: 0.8,
    color: "#4A453E",
    textTransform: "uppercase",
  },
  statRowSubtitle: {
    fontFamily: "PublicSans-Regular",
    fontSize: 11.5,
    color: "#8C827A",
    marginTop: 1,
  },
  statRowValue: {
    fontFamily: "Newsreader-Bold",
    fontSize: 18,
    color: "#212842",
    includeFontPadding: false,
  },
  ctaContainer: {
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#212842",
    borderRadius: 30,
    paddingVertical: 15,
    gap: 8,
    shadowColor: "#212842",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 13,
    letterSpacing: 1.2,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF3E8",
    borderWidth: 1,
    borderColor: "#E2DCD2",
    borderRadius: 30,
    paddingVertical: 13,
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 12,
    letterSpacing: 1,
    color: "#212842",
    textTransform: "uppercase",
  },
});
