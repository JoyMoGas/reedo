import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Icon from "../../core/Icon";

export default function DailyQuest() {
  return (
    <View className="w-full bg-[#FCF3E0] rounded-2xl p-5 mt-6 flex-row items-center justify-between">
      <View className="flex-col flex-1 mr-4">
        <Text
          className="text-2xl text-[#212842]"
          style={{ fontFamily: "Newsreader-Bold" }}
        >
          Daily Literary Quest
        </Text>
        <Text
          className="text-base text-[#76767E] mt-1"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Read 10 pages today
        </Text>
        <View className="flex-row items-center bg-[#F0E4CA] py-1.5 px-3 rounded-full self-start mt-3 gap-1.5">
          <Icon name="starCircle" size={16} color="#212842" />
          <Text
            className="text-xs text-[#212842]"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            +50 Honor Points
          </Text>
        </View>
      </View>

      {/* Circular Progress Indicator */}
      <View
        className="items-center justify-center"
        style={{ width: 80, height: 80 }}
      >
        <Svg width={80} height={80}>
          {/* Track Circle */}
          <Circle
            cx={40}
            cy={40}
            r={36}
            stroke="#EAE2D5"
            strokeWidth={5}
            fill="transparent"
          />
          {/* Progress Circle */}
          <Circle
            cx={40}
            cy={40}
            r={36}
            stroke="#212842"
            strokeWidth={5}
            fill="transparent"
            strokeDasharray={226.19}
            strokeDashoffset={226.19 - 0.7 * 226.19}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </Svg>
        <View
          style={StyleSheet.absoluteFill}
          className="items-center justify-center"
        >
          <Text
            style={{ fontFamily: "Newsreader-Bold", fontSize: 20 }}
            className="text-[#212842] mt-0.5"
          >
            7/10
          </Text>
        </View>
      </View>
    </View>
  );
}
