import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuthStore } from "../../store/useAuthStore";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    identifier?: string;
    password?: string;
    general?: string;
  }>({});

  const passwordRef = useRef<TextInput>(null);

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

  const handleForgotPassword = () => {
    Alert.alert(
      "Need help signing in?",
      "You can sign in using either the email address or the @username associated with your Reedo account. Make sure your password matches the exact capitalization you used when registering.",
      [{ text: "Got it", style: "default" }]
    );
  };

  const handleLogin = async () => {
    setErrors({});
    const cleanIdentifier = identifier.trim().replace(/^@/, "");
    const localErrors: typeof errors = {};
    let hasLocalError = false;

    if (!cleanIdentifier) {
      localErrors.identifier = "Please enter your email address or @username.";
      hasLocalError = true;
    }
    if (!password) {
      localErrors.password = "Please enter your account password.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("api/users/signin/", {
        username: cleanIdentifier,
        password,
      });
      const { tokens, user: userProfile } = response.data;
      await login(tokens.access, userProfile);
    } catch (error: any) {
      triggerShake();
      const errorData = error.response?.data;
      let errMsg = "Sign in failed. Please check your credentials.";

      if (errorData) {
        if (typeof errorData === "string") {
          errMsg = errorData;
        } else if (errorData.error) {
          errMsg = errorData.error;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else {
          const newErrors: typeof errors = {};
          let hasFieldErrors = false;
          if (errorData.username) {
            newErrors.identifier = Array.isArray(errorData.username)
              ? errorData.username[0]
              : errorData.username;
            hasFieldErrors = true;
          }
          if (errorData.password) {
            newErrors.password = Array.isArray(errorData.password)
              ? errorData.password[0]
              : errorData.password;
            hasFieldErrors = true;
          }
          if (hasFieldErrors) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
          }
        }
      }

      if (error.response?.status === 401) {
        setErrors({
          general:
            "Incorrect email/username or password. Please double-check your credentials and try again.",
        });
      } else if (!error.response) {
        setErrors({
          general:
            "Unable to connect to the Reedo server. Please check your internet connection.",
        });
      } else {
        setErrors({ general: errMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
          className="px-6 pt-3 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            {/* Top Navigation Bar */}
            <View className="flex-row justify-between items-center mb-6">
              <TouchableOpacity
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                disabled={isLoading}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-full bg-[#FAF3E8] border border-[#E6DACB] items-center justify-center"
              >
                <Icon name="arrowLeft" size={18} color="#212842" />
              </TouchableOpacity>

              <View className="flex-row items-center px-3.5 py-1.5 rounded-full bg-[#FAF3E8] border border-[#E6DACB]">
                <Logo width={18} height={18} />
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] tracking-[1.5px] uppercase text-[#212842] ml-2"
                >
                  Reedo Account
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/signin")}
                disabled={isLoading}
                activeOpacity={0.75}
                className="px-3.5 py-2 rounded-full bg-[#C95F44]/12"
              >
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#C95F44] text-xs"
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Header Section */}
            <Animated.View
              style={{
                opacity: fadeHeader,
                transform: [{ translateY: slideHeader }],
              }}
              className="mb-6"
            >
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 rounded-full bg-[#C95F44] mr-2" />
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] tracking-[2px] text-[#C95F44] uppercase"
                >
                  Welcome Back
                </Text>
              </View>

              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[36px] text-[#212842] leading-[42px] mb-2.5"
              >
                Sign in to your{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  library
                </Text>
              </Text>

              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[15px] text-[#5A6075] leading-[22px]"
              >
                Enter your email address or @username and password to sync your bookshelves, reading streaks, and immersion notes.
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
              {/* General Error Banner */}
              {errors.general && (
                <View className="bg-[#FDF2F0] border border-[#E8B4B4] rounded-2xl p-4 mb-5 flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-[#C94444]/15 items-center justify-center mr-3 mt-0.5">
                    <Icon name="cancel" size={14} color="#C94444" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[#9E2A2B] text-xs uppercase tracking-wider mb-0.5"
                    >
                      Unable to sign in
                    </Text>
                    <Text
                      style={{ fontFamily: "PublicSans-Regular" }}
                      className="text-[#9E2A2B] text-[13px] leading-[19px]"
                    >
                      {errors.general}
                    </Text>
                  </View>
                </View>
              )}

              {/* Email or Username Field */}
              <View className="mb-5">
                <View className="flex-row justify-between items-center mb-2">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase ${
                      errors.identifier ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Email or Username
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82]"
                  >
                    e.g. reader@email.com or @alex
                  </Text>
                </View>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.identifier
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "identifier"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="people"
                    size={18}
                    color={
                      errors.identifier
                        ? "#C94444"
                        : focusedField === "identifier"
                        ? "#212842"
                        : "#8E8B82"
                    }
                  />
                  <TextInput
                    value={identifier}
                    onChangeText={(text) => {
                      setIdentifier(text);
                      if (errors.identifier || errors.general) setErrors({});
                    }}
                    onFocus={() => setFocusedField("identifier")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your email or @username"
                    placeholderTextColor="#A9A49A"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                  {identifier.length > 0 && !isLoading && (
                    <TouchableOpacity
                      onPress={() => {
                        setIdentifier("");
                        if (errors.identifier || errors.general) setErrors({});
                      }}
                    >
                      <Icon name="cancel" size={16} color="#9A968E" />
                    </TouchableOpacity>
                  )}
                </View>

                {errors.identifier && (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.identifier}
                  </Text>
                )}
              </View>

              {/* Password Field */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-2">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-xs tracking-[1px] uppercase ${
                      errors.password ? "text-[#C94444]" : "text-[#212842]"
                    }`}
                  >
                    Password
                  </Text>
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-xs text-[#C95F44]"
                    >
                      Trouble signing in?
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.password
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "password"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="lockOpen"
                    size={18}
                    color={
                      errors.password
                        ? "#C94444"
                        : focusedField === "password"
                        ? "#212842"
                        : "#8E8B82"
                    }
                  />
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password || errors.general) setErrors({});
                    }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    placeholderTextColor="#A9A49A"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                    className="pl-2 py-2"
                    disabled={isLoading}
                  >
                    <Icon
                      name={showPassword ? "eyeOutline" : "eyeClosedSolid"}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                {errors.password ? (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.password}
                  </Text>
                ) : (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[11px] text-[#8E8B82] mt-1.5 px-1"
                  >
                    Passwords are case-sensitive. Tap the eye icon to verify what you typed.
                  </Text>
                )}
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                  isLoading ? "bg-[#212842]/75" : "bg-[#212842]"
                }`}
              >
                {isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#FFF8F0" size="small" />
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[#FFF8F0] text-[15px] ml-2.5"
                    >
                      Signing in...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
                    >
                      Sign In
                    </Text>
                    <Icon name="arrowRight" size={16} color="#FFF8F0" />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Bottom Create Account Card */}
          <Animated.View style={{ opacity: fadeFooter }} className="mt-8">
            <View className="bg-[#FAF3E8] border border-[#E6DACB] rounded-2xl p-4 flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-sm text-[#212842] mb-0.5"
                >
                  New to Reedo?
                </Text>
                <Text
                  style={{ fontFamily: "PublicSans-Regular" }}
                  className="text-xs text-[#5A6075] leading-[17px]"
                >
                  Create your free account in less than a minute and personalize your book recommendations.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/signin")}
                disabled={isLoading}
                activeOpacity={0.8}
                className="px-4 py-2.5 rounded-xl bg-[#C95F44] flex-row items-center"
              >
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-xs text-[#FFF8F0] mr-1"
                >
                  Create Account
                </Text>
                <Icon name="chevronRight" size={15} color="#FFF8F0" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
