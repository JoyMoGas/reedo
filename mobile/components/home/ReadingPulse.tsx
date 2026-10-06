/**
 * @project Reedo
 * @module ReadingPulse
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useProgressStore } from "../../store/useProgressStore";

export default function ReadingPulse() {
  const { history } = useProgressStore();

  const daysData = useMemo(() => {
    const today = new Date();
    const data = [];
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    let maxPages = 10; // base max to avoid division by zero
    
    // Find max pages in last 7 days to scale the graph
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const pages = history[dateStr] || 0;
      if (pages > maxPages) maxPages = pages;
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const pages = history[dateStr] || 0;
      
      const minHeight = 8;
      const maxHeight = 85;
      const height = minHeight + (pages / maxPages) * (maxHeight - minHeight);
      
      data.push({
        day: daysOfWeek[d.getDay()],
        height: height,
        active: pages > 0 || i === 0,
        pages: pages
      });
    }
    return data;
  }, [history]);

  return (
    <View className="w-full bg-[#FCF3E0] rounded-2xl p-5 mt-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text
          className="text-2xl text-[#212842]"
          style={{ fontFamily: "Newsreader-Bold" }}
        >
          The Reading Pulse
        </Text>
        <Text
          className="text-xs text-[#76767E] tracking-widest"
          style={{ fontFamily: "PublicSans-Bold" }}
        >
          LAST 7 DAYS
        </Text>
      </View>

      <View className="flex-row justify-between items-end px-1 h-24">
        {daysData.map((item, index) => (
          <View
            key={index}
            className="items-center flex-col gap-2"
            style={{ flex: 1 }}
          >
            <View
              style={{ height: item.height }}
              className={`w-8 rounded-t-md ${item.active ? "bg-[#212842]" : "bg-[#EAE2D5]"}`}
            />
            <Text
              className="text-xs text-[#8E8B82]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {item.day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
