/**
 * @project Reedo
 * @module StreakCalendar
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-14
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "../../core/Icon";
import { CalendarDayInfo } from "../../store/useStreakStore";

interface StreakCalendarProps {
  calendarHistory?: Record<string, CalendarDayInfo>;
  currentStreak: number;
  bestStreak: number;
  freezesAvailable: number;
  isActiveToday: boolean;
}

export default function StreakCalendar({
  calendarHistory = {},
  currentStreak,
  bestStreak,
  freezesAvailable,
  isActiveToday,
}: StreakCalendarProps) {
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA");

  // Generate current week or last 14 days view
  // Let's generate a 14-day strip (last 13 days + today) or current month view
  // A two-week rolling window is extremely readable on mobile!
  const daysList: { dateStr: string; dayNum: number; dayLabel: string; isToday: boolean }[] = [];
  const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA");
    daysList.push({
      dateStr,
      dayNum: d.getDate(),
      dayLabel: DAY_LABELS[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }

  return (
    <View style={styles.container}>
      {/* Header with Stats Chips */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Icon name="fireSolid" size={16} color="#FF5A36" />
          </View>
          <View>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Racha actual</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: "#FEF3C7" }]}>
            <Icon name="stars" size={16} color="#D97706" />
          </View>
          <View>
            <Text style={styles.statValue}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Mejor racha</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: "#E0F2FE" }]}>
            <Icon name="snowflake" size={16} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.statValue}>{freezesAvailable}</Text>
            <Text style={styles.statLabel}>Protectores</Text>
          </View>
        </View>
      </View>

      {/* Calendar Grid Title */}
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>Últimas dos semanas</Text>
        <Text style={styles.legendText}>
          {isActiveToday ? "🔥 Racha al día" : "⏳ Hoy pendiente"}
        </Text>
      </View>

      {/* 14-day grid: 2 rows of 7 days */}
      <View style={styles.gridContainer}>
        {daysList.map((item) => {
          const dayData = calendarHistory[item.dateStr];
          const hasActiveStreak = dayData?.status === "ACTIVE";
          const isFrozen = dayData?.status === "FROZEN";
          const isRecovered = dayData?.status === "RECOVERED";

          let badgeBg = "#F4EFE6";
          let textColor = "#78716C";
          let borderColor = "transparent";

          if (item.isToday) {
            borderColor = isActiveToday ? "#FF5A36" : "#E2DCD2";
            badgeBg = isActiveToday ? "#FF5A36" : "#FAF3E8";
            textColor = isActiveToday ? "#FFFFFF" : "#212842";
          } else if (hasActiveStreak) {
            badgeBg = "#FF6B4A";
            textColor = "#FFFFFF";
          } else if (isFrozen) {
            badgeBg = "#38BDF8";
            textColor = "#FFFFFF";
          } else if (isRecovered) {
            badgeBg = "#F59E0B";
            textColor = "#FFFFFF";
          }

          return (
            <View key={item.dateStr} style={styles.dayCol}>
              <Text style={styles.dayLabelText}>{item.dayLabel}</Text>
              <View
                style={[
                  styles.dayCircle,
                  {
                    backgroundColor: badgeBg,
                    borderColor,
                    borderWidth: item.isToday ? 2 : 0,
                  },
                ]}
              >
                {hasActiveStreak || (item.isToday && isActiveToday) ? (
                  <Icon name="fireSolid" size={16} color="#FFFFFF" />
                ) : isFrozen ? (
                  <Icon name="snowflake" size={15} color="#FFFFFF" />
                ) : isRecovered ? (
                  <Icon name="stars" size={15} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.dayNumText, { color: textColor }]}>
                    {item.dayNum}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend key */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FF6B4A" }]} />
          <Text style={styles.legendLabel}>Día activo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#38BDF8" }]} />
          <Text style={styles.legendLabel}>Protector usado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendLabel}>Recuperado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FAF3E8",
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#EBE7DF",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF8F0",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#EFE9DF",
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 15,
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: "PublicSans-Regular",
    color: "#78716C",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 14,
    fontFamily: "PublicSans-Bold",
    color: "#212842",
  },
  legendText: {
    fontSize: 11,
    fontFamily: "PublicSans-Bold",
    color: "#FF5A36",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  dayCol: {
    width: "13.2%",
    alignItems: "center",
    gap: 4,
  },
  dayLabelText: {
    fontSize: 10,
    fontFamily: "PublicSans-Regular",
    color: "#8E8B82",
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumText: {
    fontSize: 12,
    fontFamily: "PublicSans-Bold",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EBE7DF",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: "PublicSans-Regular",
    color: "#78716C",
  },
});
