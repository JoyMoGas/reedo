/**
 * @project Reedo
 * @module DailyQuest
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-06-27
 */
import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from "react-native";
import { Circle, Svg } from "react-native-svg";
import Icon from "../../core/Icon";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useProgressStore } from "../../store/useProgressStore";
import { useAuthStore } from "../../store/useAuthStore";
import api from "../../store/api";

export default function DailyQuest() {
  const { dailyReadingGoal, setDailyReadingGoal } = useSettingsStore();
  const { pagesReadToday, questClaimed, claimQuest, resetIfNewDay } = useProgressStore();
  const { user, fetchUser } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editGoal, setEditGoal] = useState(dailyReadingGoal.toString());
  const [isClaiming, setIsClaiming] = useState(false);

  React.useEffect(() => {
    resetIfNewDay();
  }, [resetIfNewDay]);

  const honorPointsReward = Math.max(50, dailyReadingGoal * 5); // 5 points per page, min 50
  
  const progress = Math.min(pagesReadToday / dailyReadingGoal, 1);
  const isGoalMet = pagesReadToday >= dailyReadingGoal;
  
  const handleSaveGoal = () => {
    const newGoal = parseInt(editGoal, 10);
    if (isNaN(newGoal) || newGoal < 10) {
      Alert.alert("Invalid Goal", "Minimum daily reading goal is 10 pages.");
      return;
    }
    setDailyReadingGoal(newGoal);
    setIsEditing(false);
  };

  const handleClaim = async () => {
    if (questClaimed || !isGoalMet || isClaiming) return;
    setIsClaiming(true);
    try {
      await api.post('api/users/claim-quest/', { points: honorPointsReward });
      claimQuest();
      if (fetchUser) fetchUser(); // Update honor points in UI
    } catch (error) {
      Alert.alert("Error", "Could not claim your reward.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <View className="w-full bg-[#FCF3E0] rounded-2xl p-5 mt-6 flex-row items-center justify-between">
      <View className="flex-col flex-1 mr-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl text-[#212842]" style={{ fontFamily: "Newsreader-Bold" }}>
            Daily Literary Quest
          </Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} className="p-1">
            <Icon name="editOutline" size={18} color="#A8AAB2" />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View className="flex-row items-center mt-1 bg-white rounded-lg px-3 py-1 border border-[#EBE7DF]">
            <TextInput 
              value={editGoal}
              onChangeText={setEditGoal}
              keyboardType="number-pad"
              className="flex-1 text-[#212842] py-1"
              style={{ fontFamily: "PublicSans-Regular" }}
              autoFocus
            />
            <TouchableOpacity onPress={handleSaveGoal}>
              <Text className="text-[#C95F44] font-bold">Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-base text-[#76767E] mt-1" style={{ fontFamily: "PublicSans-Regular" }}>
            Read {dailyReadingGoal} pages today
          </Text>
        )}
        <TouchableOpacity 
          onPress={handleClaim}
          disabled={!isGoalMet || questClaimed || isClaiming}
          className={`flex-row items-center py-1.5 px-3 rounded-full self-start mt-3 gap-1.5 ${
            questClaimed ? 'bg-[#EAE2D5]' : isGoalMet ? 'bg-[#C95F44]' : 'bg-[#F0E4CA]'
          }`}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Icon name={questClaimed ? "checkCircle" : "starCircle"} size={16} color={isGoalMet && !questClaimed ? "#FFFFFF" : "#212842"} />
          )}
          <Text
            className="text-xs"
            style={{ 
              fontFamily: "PublicSans-Bold", 
              color: isGoalMet && !questClaimed ? "#FFFFFF" : "#212842" 
            }}
          >
            {questClaimed ? "Claimed!" : `+${honorPointsReward} Honor Points`}
          </Text>
        </TouchableOpacity>
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
            stroke={isGoalMet ? "#C95F44" : "#212842"}
            strokeWidth={5}
            fill="transparent"
            strokeDasharray={226.19}
            strokeDashoffset={226.19 - progress * 226.19}
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
            {pagesReadToday}/{dailyReadingGoal}
          </Text>
        </View>
      </View>
    </View>
  );
}
