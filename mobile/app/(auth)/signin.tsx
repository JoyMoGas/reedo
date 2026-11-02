import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import api from "../../store/api";
import { useSignUpStore } from "../../store/useSignUpStore";

export default function SignInStep1Screen() {
  const router = useRouter();
  const {
    full_name: storedFullName,
    username: storedUsername,
    setStep1,
  } = useSignUpStore();

  const [fullName, setFullName] = useState(storedFullName || "");
  const [username, setUsername] = useState(storedUsername || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUsernameManual, setIsUsernameManual] = useState(false);
  const [focusedField, setFocusedField] = useState<"fullName" | "username" | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; username?: string }>({});

  const usernameRef = useRef<TextInput>(null);
  const generateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(18)).current;
  const fadeForm = useRef(new Animated.Value(0)).current;
  const slideForm = useRef(new Animated.Value(22)).current;
  const fadeFooter = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeHeader, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(slideHeader, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeForm, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(slideForm, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fadeFooter, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
      }
    };
  }, [fadeFooter, fadeForm, fadeHeader, slideForm, slideHeader]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleFullNameChange = (text: string) => {
    setFullName(text);
    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));

    if (!isUsernameManual) {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
      }

      if (!text.trim()) {
        setUsername("");
        return;
      }

      generateTimeoutRef.current = setTimeout(async () => {
        try {
          setIsGenerating(true);
          const response = await api.post("api/users/generate-username/", {
            full_name: text.trim(),
          });
          if (response.data?.username) {
            setUsername(response.data.username);
          }
        } catch (e) {
          console.warn("Failed to auto-generate unique username:", e);
        } finally {
          setIsGenerating(false);
        }
      }, 450);
    }
  };

  const handleUsernameChange = (text: string) => {
    const cleaned = text.replace(/^@/, "").replace(/\s+/g, "").toLowerCase();
    setUsername(cleaned);
    if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));

    if (cleaned.length > 0) {
      setIsUsernameManual(true);
    } else {
      setIsUsernameManual(false);
      if (fullName.trim()) {
        if (generateTimeoutRef.current) clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = setTimeout(async () => {
          try {
            setIsGenerating(true);
            const response = await api.post("api/users/generate-username/", {
              full_name: fullName.trim(),
            });
            if (response.data?.username) {
              setUsername(response.data.username);
            }
          } catch (e) {
            console.warn("Failed to auto-generate unique username:", e);
          } finally {
            setIsGenerating(false);
          }
        }, 450);
      }
    }
  };

  const handleContinue = async () => {
    setErrors({});
    let hasLocalError = false;
    const localErrors: typeof errors = {};

    if (!fullName.trim()) {
      localErrors.fullName = "Please enter your full name.";
      hasLocalError = true;
    }
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) {
      localErrors.username = "Please choose a unique @username.";
      hasLocalError = true;
    } else if (cleanUsername.length < 3) {
      localErrors.username = "Username must be at least 3 characters long.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("api/users/check-username/", {
        username: cleanUsername,
      });

      if (response.data?.exists) {
        setErrors({
          username: "This username is already taken. Try adding numbers or initials.",
        });
        triggerShake();
        setIsLoading(false);
        return;
      }

      setStep1(fullName.trim(), cleanUsername);
      router.push("/(auth)/birthday");
    } catch (error) {
      console.warn("Failed to check username availability:", error);
      setStep1(fullName.trim(), cleanUsername);
      router.push("/(auth)/birthday");
    } finally {
      setIsLoading(false);
    }
  };

  const isReady = fullName.trim().length > 0 && username.trim().length >= 3;

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
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                disabled={isLoading}
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
                  Step 1 of 6
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
                disabled={isLoading}
                activeOpacity={0.75}
                className="px-3.5 py-2 rounded-full bg-[#FAF3E8] border border-[#E6DACB]"
              >
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#C95F44] text-xs"
                >
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View className="w-full h-1.5 bg-[#EDE3D5] rounded-full overflow-hidden mb-2">
              <View className="w-1/6 h-full bg-[#C95F44] rounded-full" />
            </View>
          </View>

          {/* Main Scrollable Content */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <Animated.View
              style={{
                opacity: fadeHeader,
                transform: [{ translateY: slideHeader }],
              }}
              className="mb-6"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[11px] tracking-[2px] text-[#C95F44] uppercase mb-1.5"
              >
                Reader Profile
              </Text>
              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[34px] text-[#212842] leading-[40px] mb-2"
              >
                How should we{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  introduce you?
                </Text>
              </Text>
              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[15px] text-[#5A6075] leading-[22px]"
              >
                Tell us your name and choose a unique @username. Your handle appears on your bookshelves and community echoes.
              </Text>
            </Animated.View>

            {/* Form Inputs */}
            <Animated.View
              style={{
                opacity: fadeForm,
                transform: [{ translateY: slideForm }, { translateX: shakeAnim }],
              }}
              className="w-full"
            >
              {/* Full Name Field */}
              <View className="mb-5">
                <View className="flex-row justify-between items-center mb-2">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase ${
                      errors.fullName ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Your Full Name
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82]"
                  >
                    Displayed on your profile
                  </Text>
                </View>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.fullName
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "fullName"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="quillWrite"
                    size={18}
                    color={
                      errors.fullName
                        ? "#C94444"
                        : focusedField === "fullName"
                        ? "#212842"
                        : "#8E8B82"
                    }
                  />
                  <TextInput
                    value={fullName}
                    onChangeText={handleFullNameChange}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Julian Vance"
                    placeholderTextColor="#A9A49A"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => usernameRef.current?.focus()}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                  {fullName.length > 0 && !isLoading && (
                    <TouchableOpacity
                      onPress={() => {
                        setFullName("");
                        if (!isUsernameManual) setUsername("");
                      }}
                    >
                      <Icon name="cancel" size={16} color="#9A968E" />
                    </TouchableOpacity>
                  )}
                </View>

                {errors.fullName && (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.fullName}
                  </Text>
                )}
              </View>

              {/* Username Field */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase ${
                      errors.username ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Unique Handle (@username)
                  </Text>
                  {isGenerating ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#C95F44" />
                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className="text-[11px] text-[#C95F44] ml-1.5"
                      >
                        Suggesting...
                      </Text>
                    </View>
                  ) : username.trim().length > 0 ? (
                    <View className="px-2.5 py-0.5 rounded-full bg-[#C95F44]/12">
                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className="text-[10px] text-[#C95F44]"
                      >
                        {isUsernameManual ? "Custom handle" : "Auto-suggested"}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.username
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "username"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-base ${
                      errors.username ? "text-[#C94444]" : "text-[#C95F44]"
                    }`}
                  >
                    @
                  </Text>
                  <TextInput
                    ref={usernameRef}
                    value={username}
                    onChangeText={handleUsernameChange}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="julian_reads"
                    placeholderTextColor="#A9A49A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-1.5"
                  />
                </View>

                {errors.username ? (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.username}
                  </Text>
                ) : (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#64748B] mt-2 leading-[18px]"
                  >
                    We automatically suggest an available handle from your name, or you can type your own.
                  </Text>
                )}
              </View>

              {/* Live Profile Preview Card */}
              {isReady && (
                <View className="mt-2 bg-[#FAF3E8] border border-[#E6DACB] rounded-2xl p-4 flex-row items-center">
                  <View className="w-11 h-11 rounded-full bg-[#212842] items-center justify-center mr-3.5">
                    <Text
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-lg text-[#FFF8F0]"
                    >
                      {fullName.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text
                        style={{ fontFamily: "PublicSans-Bold" }}
                        className="text-sm text-[#212842]"
                        numberOfLines={1}
                      >
                        {fullName.trim()}
                      </Text>
                      <View className="ml-1.5">
                        <Icon name="sealCheck" size={14} color="#C95F44" />
                      </View>
                    </View>
                    <Text
                      style={{ fontFamily: "PublicSans-Regular" }}
                      className="text-xs text-[#C95F44]"
                      numberOfLines={1}
                    >
                      @{username.trim()}
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-[#F0E6D8]">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[10px] text-[#5A6075]"
                    >
                      Preview
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Streamlined Pinned Bottom Bar */}
          <Animated.View
            style={{ opacity: fadeFooter }}
            className="px-6 pt-3 pb-5 bg-[#FFF8F0] border-t border-[#EDE3D5]"
          >
            <TouchableOpacity
              onPress={handleContinue}
              disabled={isLoading || isGenerating}
              activeOpacity={0.85}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                isLoading || isGenerating ? "bg-[#212842]/70" : "bg-[#212842]"
              }`}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#FFF8F0" size="small" />
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-[#FFF8F0] text-[15px] ml-2.5"
                  >
                    Checking @username...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
                  >
                    Continue to Step 2
                  </Text>
                  <Icon name="arrowRight" size={16} color="#FFF8F0" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
