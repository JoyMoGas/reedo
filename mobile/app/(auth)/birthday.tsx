import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import Icon from "../../core/Icon";
import { useSignUpStore } from "../../store/useSignUpStore";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function SignInStep2Screen() {
  const router = useRouter();
  const { birth_date: storedBirthDate, setStep2 } = useSignUpStore();

  const getInitialDateParts = () => {
    if (storedBirthDate && storedBirthDate !== "2000-01-01") {
      const parts = storedBirthDate.split("-");
      if (parts.length === 3) {
        return { year: parts[0], month: parts[1], day: parts[2] };
      }
    }
    return { year: "", month: "", day: "" };
  };

  const initialParts = getInitialDateParts();
  const [day, setDay] = useState(initialParts.day);
  const [month, setMonth] = useState(initialParts.month);
  const [year, setYear] = useState(initialParts.year);
  const [errors, setErrors] = useState<{ date?: string }>({});
  const [focusedField, setFocusedField] = useState<"day" | "month" | "year" | null>(null);

  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Animations
  const progressAnim = useRef(new Animated.Value(1 / 6)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 2 / 6,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDayChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setDay(cleaned);
    if (errors.date) setErrors({});
    if (cleaned.length === 2) {
      monthRef.current?.focus();
    }
  };

  const handleMonthChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setMonth(cleaned);
    if (errors.date) setErrors({});
    if (cleaned.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setYear(cleaned);
    if (errors.date) setErrors({});
  };

  const formattedPreview = useMemo(() => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (!d || !m || !y || year.length < 4) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > currentYear) return null;
    const daysInMonth = new Date(y, m, 0).getDate();
    if (d > daysInMonth) return null;
    return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
  }, [day, month, year]);

  const handleContinuePress = (isSkip = false) => {
    setErrors({});
    let birthDate = "2000-01-01";

    if (!isSkip) {
      if (!day || !month || !year) {
        setErrors({
          date: "Please enter your complete birth date (Day, Month, and Year), or tap 'Skip' below.",
        });
        triggerShake();
        return;
      }

      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");
      const dNum = parseInt(paddedDay, 10);
      const mNum = parseInt(paddedMonth, 10);
      const yNum = parseInt(year, 10);
      const currentYear = new Date().getFullYear();

      if (year.length < 4 || yNum < 1900 || yNum > currentYear) {
        setErrors({
          date: `Please enter a valid 4-digit year between 1900 and ${currentYear}.`,
        });
        triggerShake();
        return;
      }

      if (mNum < 1 || mNum > 12) {
        setErrors({ date: "Month must be between 01 and 12." });
        triggerShake();
        return;
      }

      const daysInMonth = new Date(yNum, mNum, 0).getDate();
      if (dNum < 1 || dNum > daysInMonth) {
        setErrors({
          date: `${MONTH_NAMES[mNum - 1]} ${yNum} has ${daysInMonth} days. Please check the day entered.`,
        });
        triggerShake();
        return;
      }

      birthDate = `${yNum}-${paddedMonth}-${paddedDay}`;
    }

    setStep2(birthDate);
    router.push("/(auth)/genres");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-between">
          {/* Top Bar + Progress Indicator */}
          <View className="px-6 pt-3">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-full bg-[#FAF3E8] border border-[#E6DACB] items-center justify-center"
              >
                <Icon name="arrowLeft" size={18} color="#212842" />
              </TouchableOpacity>

              <View className="flex-row items-center px-3 py-1.5 rounded-full bg-[#FAF3E8] border border-[#E6DACB]">
                <Logo width={16} height={16} />
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] tracking-[1.5px] text-[#212842] uppercase ml-2"
                >
                  Step 2 of 6
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleContinuePress(true)}
                activeOpacity={0.75}
                className="px-3.5 py-2 rounded-full bg-[#FAF3E8] border border-[#E6DACB]"
              >
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#5A6075] text-xs"
                >
                  Skip
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-1.5 bg-[#EDE3D5] rounded-full overflow-hidden mb-2">
              <Animated.View
                style={{ width: progressWidth }}
                className="h-full bg-[#C95F44] rounded-full"
              />
            </View>
          </View>

          {/* Main Scrollable Content */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View className="mb-6">
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[11px] tracking-[2px] text-[#C95F44] uppercase mb-1.5"
              >
                Personal Milestones
              </Text>
              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[34px] text-[#212842] leading-[40px] mb-2"
              >
                When is your{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  birthday?
                </Text>
              </Text>
              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[15px] text-[#5A6075] leading-[22px]"
              >
                Your birth date stays private and helps us tailor age-appropriate book recommendations and celebrate your annual reading milestones.
              </Text>
            </View>

            {/* Date Inputs */}
            <Animated.View
              style={{ transform: [{ translateX: shakeAnim }] }}
              className="w-full"
            >
              {errors.date && (
                <View className="bg-[#FDF2F0] border border-[#E8B4B4] rounded-2xl p-4 mb-5 flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-[#C94444]/15 items-center justify-center mr-3 mt-0.5">
                    <Icon name="cancel" size={14} color="#C94444" />
                  </View>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[#9E2A2B] text-xs flex-1 leading-5"
                  >
                    {errors.date}
                  </Text>
                </View>
              )}

              {/* Day / Month / Year Cards */}
              <View className="flex-row justify-between gap-3 mb-5">
                {/* Day */}
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase mb-2 ${
                      errors.date ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Day
                  </Text>
                  <View
                    className={`rounded-2xl border px-3 py-1 items-center ${
                      errors.date
                        ? "bg-[#FDF2F0] border-[#C94444]"
                        : focusedField === "day"
                        ? "bg-white border-[#212842]"
                        : "bg-[#FAF3E8] border-[#E6DACB]"
                    }`}
                  >
                    <TextInput
                      value={day}
                      onChangeText={handleDayChange}
                      onFocus={() => setFocusedField("day")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="DD"
                      placeholderTextColor="#B5B0A6"
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="next"
                      onSubmitEditing={() => monthRef.current?.focus()}
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-2xl text-[#212842] py-3.5 text-center w-full"
                    />
                  </View>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82] text-center mt-1.5"
                  >
                    01 – 31
                  </Text>
                </View>

                {/* Month */}
                <View className="flex-1">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase mb-2 ${
                      errors.date ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Month
                  </Text>
                  <View
                    className={`rounded-2xl border px-3 py-1 items-center ${
                      errors.date
                        ? "bg-[#FDF2F0] border-[#C94444]"
                        : focusedField === "month"
                        ? "bg-white border-[#212842]"
                        : "bg-[#FAF3E8] border-[#E6DACB]"
                    }`}
                  >
                    <TextInput
                      ref={monthRef}
                      value={month}
                      onChangeText={handleMonthChange}
                      onFocus={() => setFocusedField("month")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="MM"
                      placeholderTextColor="#B5B0A6"
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="next"
                      onSubmitEditing={() => yearRef.current?.focus()}
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-2xl text-[#212842] py-3.5 text-center w-full"
                    />
                  </View>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82] text-center mt-1.5"
                  >
                    01 – 12
                  </Text>
                </View>

                {/* Year */}
                <View className="flex-[1.35]">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase mb-2 ${
                      errors.date ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Year
                  </Text>
                  <View
                    className={`rounded-2xl border px-3 py-1 items-center ${
                      errors.date
                        ? "bg-[#FDF2F0] border-[#C94444]"
                        : focusedField === "year"
                        ? "bg-white border-[#212842]"
                        : "bg-[#FAF3E8] border-[#E6DACB]"
                    }`}
                  >
                    <TextInput
                      ref={yearRef}
                      value={year}
                      onChangeText={handleYearChange}
                      onFocus={() => setFocusedField("year")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="YYYY"
                      placeholderTextColor="#B5B0A6"
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                      onSubmitEditing={() => handleContinuePress(false)}
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-2xl text-[#212842] py-3.5 text-center w-full"
                    />
                  </View>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82] text-center mt-1.5"
                  >
                    4 digits
                  </Text>
                </View>
              </View>

              {/* Live Date Preview or Privacy Card */}
              {formattedPreview ? (
                <View className="bg-[#FAF3E8] border border-[#C95F44]/35 rounded-2xl p-4 flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#C95F44]/15 items-center justify-center mr-3.5">
                    <Icon name="calendarCheck" size={20} color="#C95F44" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[11px] uppercase tracking-wider text-[#C95F44]"
                    >
                      Selected Birth Date
                    </Text>
                    <Text
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-lg text-[#212842] mt-0.5"
                    >
                      {formattedPreview}
                    </Text>
                  </View>
                  <Icon name="checkCircle" size={20} color="#C95F44" />
                </View>
              ) : (
                <View className="bg-[#FAF3E8] border border-[#E6DACB] rounded-2xl p-4 flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#EDE3D5] items-center justify-center mr-3.5">
                    <Icon name="calendarDays" size={18} color="#212842" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-xs text-[#212842] mb-0.5"
                    >
                      Private by default
                    </Text>
                    <Text
                      style={{ fontFamily: "PublicSans-Regular" }}
                      className="text-xs text-[#5A6075] leading-[17px]"
                    >
                      Your birthday is never displayed publicly on your profile. You can also skip this step if you prefer.
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Streamlined Pinned Bottom Bar */}
          <View className="px-6 pt-3 pb-5 bg-[#FFF8F0] border-t border-[#EDE3D5]">
            <TouchableOpacity
              onPress={() => handleContinuePress(false)}
              activeOpacity={0.85}
              className="bg-[#212842] w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md mb-2.5"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
              >
                Continue to Step 3
              </Text>
              <Icon name="arrowRight" size={16} color="#FFF8F0" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleContinuePress(true)}
              activeOpacity={0.7}
              className="py-1.5 items-center"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-xs text-[#64748B]"
              >
                Skip this step for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
