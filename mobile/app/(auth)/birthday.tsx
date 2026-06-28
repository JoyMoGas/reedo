import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import { useSignUpStore } from "../../store/useSignUpStore";

export default function SignInStep2Screen() {
  const router = useRouter();
  const { birth_date: storedBirthDate, setStep2 } = useSignUpStore();

  // Parse stored date "YYYY-MM-DD"
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Underline focus animated values
  const dayFocusAnim = useRef(new Animated.Value(0)).current;
  const monthFocusAnim = useRef(new Animated.Value(0)).current;
  const yearFocusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const dayLineWidth = dayFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const monthLineWidth = monthFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const yearLineWidth = yearFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Animated values
  const progressAnim = useRef(new Animated.Value(1 / 6)).current;
  const dotTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top progress bar animation: from 1/6 (step 1) to 2/6 (step 2)
    Animated.timing(progressAnim, {
      toValue: 2 / 6,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bottom dots animation: transitioning active pill from dot 1 to dot 2
    Animated.timing(dotTransition, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const dot1Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 8],
  });

  const dot2Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const dot1Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#212842", "#EBE7DF"],
  });

  const dot2Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EBE7DF", "#212842"],
  });

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


  const handleContinuePress = (isSkip = false) => {
    setErrors({});
    let birthDate = "2000-01-01";
    if (!isSkip) {
      if (!day || !month || !year) {
        setErrors({ date: "Please enter a complete and valid date or skip." });
        return;
      }
      const paddedDay = day.padStart(2, "0");
      const paddedMonth = month.padStart(2, "0");
      const paddedYear = year.padStart(4, "2000");
      
      const dNum = parseInt(paddedDay);
      const mNum = parseInt(paddedMonth);
      const yNum = parseInt(paddedYear);
      
      if (dNum < 1 || dNum > 31 || mNum < 1 || mNum > 12 || yNum < 1900 || yNum > new Date().getFullYear()) {
        setErrors({ date: "Please enter a realistic date." });
        return;
      }
      
      birthDate = `${paddedYear}-${paddedMonth}-${paddedDay}`;
    }
    setStep2(birthDate);
    router.push("/(auth)/genres");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0] justify-between">

      {/* Top Navigation Header */}
      <View>
        <View className="flex-row items-center justify-between w-full px-6 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-16 h-10 items-start justify-center"
            activeOpacity={0.7}
          >
            <Text
              className="text-[#212842] text-2xl font-bold"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {"<"}
            </Text>
          </TouchableOpacity>

          <Logo width={36} height={36} />

          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="w-16 h-10 items-end justify-center"
            activeOpacity={0.7}
          >
            <Text
              className="text-[#212842] text-sm"
              style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Animated Progress Bar */}
        <View className="w-full h-[2px] bg-[#EBE7DF]">
          <Animated.View
            style={{ width: progressWidth }}
            className="h-full bg-[#212842]"
          />
        </View>
      </View>

      {/* Main content wrapped in KeyboardAvoidingView for premium UX */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6 pt-8"
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title & Subtitle */}
          <View>
            <Text
              className="text-[#212842] text-start leading-tight"
              style={{ fontFamily: "Newsreader-Bold", fontSize: 36 }}
            >
              When did your{"\n"}story begin?
            </Text>
            <Text
              className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Your birth date helps us curate an archive that honors the era of your life.
            </Text>

            {/* Birthday Input Fields in 3 columns */}
            <View className="flex-row justify-between w-full mt-10">
              {/* Day Column */}
              <View className="w-[26%]">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 text-center ${errors.date ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  DAY
                </Text>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    ref={dayRef}
                    className="w-full text-xl py-2 text-[#212842] text-center"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="DD"
                    placeholderTextColor="#C5C2BA"
                    keyboardType="number-pad"
                    maxLength={2}
                    onFocus={() => {
                      setFocusedField("day");
                      animateFocus(dayFocusAnim, 1);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      animateFocus(dayFocusAnim, 0);
                      if (day && day.length === 1) {
                        setDay(day.padStart(2, "0"));
                      }
                    }}
                    value={day}
                    onChangeText={handleDayChange}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.date ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: dayLineWidth,
                      height: 2,
                      backgroundColor: errors.date ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
              </View>

              {/* Month Column */}
              <View className="w-[26%]">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 text-center ${errors.date ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  MONTH
                </Text>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    ref={monthRef}
                    className="w-full text-xl py-2 text-[#212842] text-center"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="MM"
                    placeholderTextColor="#C5C2BA"
                    keyboardType="number-pad"
                    maxLength={2}
                    onFocus={() => {
                      setFocusedField("month");
                      animateFocus(monthFocusAnim, 1);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      animateFocus(monthFocusAnim, 0);
                      if (month && month.length === 1) {
                        setMonth(month.padStart(2, "0"));
                      }
                    }}
                    value={month}
                    onChangeText={handleMonthChange}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.date ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: monthLineWidth,
                      height: 2,
                      backgroundColor: errors.date ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
              </View>

              {/* Year Column */}
              <View className="w-[36%]">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 text-center ${errors.date ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  YEAR
                </Text>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    ref={yearRef}
                    className="w-full text-xl py-2 text-[#212842] text-center"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="YYYY"
                    placeholderTextColor="#C5C2BA"
                    keyboardType="number-pad"
                    maxLength={4}
                    onFocus={() => {
                      setFocusedField("year");
                      animateFocus(yearFocusAnim, 1);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      animateFocus(yearFocusAnim, 0);
                    }}
                    value={year}
                    onChangeText={handleYearChange}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.date ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: yearLineWidth,
                      height: 2,
                      backgroundColor: errors.date ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
              </View>
            </View>

            {errors.date && (
              <Text
                className="text-[#E57A7A] text-sm text-center mt-6"
                style={{ fontFamily: "PublicSans-Regular" }}
              >
                {errors.date}
              </Text>
            )}
          </View>

          {/* Cozy and welcoming UX Login Shortcut */}
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="mt-8 py-2 w-full justify-center items-center flex-row"
            activeOpacity={0.7}
          >
            <Text className="text-[#5C5E69] text-sm" style={{ fontFamily: "PublicSans-Regular" }}>
              Already curating?{" "}
              <Text className="text-[#212842]" style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}>
                Access your archive
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer Elements */}
        <View className="px-6 bg-[#FFF8F0] pb-6 pt-2 border-t border-[#EBE7DF]">
          {/* Continue Journey Button */}
          <TouchableOpacity
            className="w-full bg-[#212842] rounded-full py-4 mt-2 flex-row justify-center items-center"
            onPress={() => handleContinuePress(false)}
            activeOpacity={0.9}
          >
            <Text
              className="text-[#FFFFFF] text-center text-lg mr-2"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              Turn the Page
            </Text>
            <Text
              className="text-[#FFFFFF] text-lg font-bold"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              {" >"}
            </Text>
          </TouchableOpacity>

          {/* Skip Option / Chronicle Later */}
          <TouchableOpacity
            className="mt-3 py-1"
            onPress={() => handleContinuePress(true)}
            activeOpacity={0.7}
          >
            <Text
              className="text-[#5C5E69] text-center text-sm"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              I'll add this date to my chronicle later
            </Text>
          </TouchableOpacity>

          {/* Quote */}
          <Text
            className="text-[#A9A695] text-center text-xs italic mt-4"
            style={{ fontFamily: "Newsreader-Italic" }}
          >
            "Your archive isn't just data; it's a living record of your existence within the tapestry of time."
          </Text>

          {/* Horizontal Line with Logo Divider */}
          <View className="flex-row items-center w-full mt-4">
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
            <View className="mx-4">
              <Logo width={28} height={28} />
            </View>
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
          </View>

          {/* Step Counter & Animated Indicators */}
          <View className="flex-row justify-between items-center w-full mt-3 mb-1">
            <Text
              className="text-xs text-[#8E8B82]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              STEP 2 OF 6
            </Text>
            <View className="flex-row items-center">
              {/* Animated Dot 1 (Shrinking from active to inactive) */}
              <Animated.View
                style={{
                  width: dot1Width,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot1Color,
                  marginHorizontal: 4,
                }}
              />
              {/* Animated Dot 2 (Expanding from inactive to active) */}
              <Animated.View
                style={{
                  width: dot2Width,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot2Color,
                  marginHorizontal: 4,
                }}
              />
              {/* Inactive Dots for Steps 3 to 6 */}
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
