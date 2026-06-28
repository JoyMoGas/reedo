import React from "react";
import { Text, View } from "react-native";

export default function ReadingPulse() {
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
            {[
              { day: "M", height: 28, active: false },
              { day: "T", height: 42, active: false },
              { day: "W", height: 60, active: true },
              { day: "T", height: 18, active: false },
              { day: "F", height: 35, active: false },
              { day: "S", height: 85, active: true },
              { day: "S", height: 12, active: false },
            ].map((item, index) => (
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
  )
}
