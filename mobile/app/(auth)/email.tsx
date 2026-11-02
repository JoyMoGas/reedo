import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
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
import { useSignUpStore } from "../../store/useSignUpStore";

export default function SignInStep6Screen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const {
    email: storedEmail,
    full_name,
    username,
    favorite_genres,
    favorite_authors,
    favorite_books,
    setStep6,
  } = useSignUpStore();

  const [email, setEmail] = useState(storedEmail || "");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    repeatPassword?: string;
    general?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | "confirm" | null>(null);
  const [activeLegalModal, setActiveLegalModal] = useState<"terms" | "privacy" | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const repeatPasswordRef = useRef<TextInput>(null);

  const progressAnim = useRef(new Animated.Value(5 / 6)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
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

  const handleFinalize = async () => {
    setErrors({});
    let hasLocalError = false;
    const localErrors: typeof errors = {};

    if (!email.trim()) {
      localErrors.email = "Please enter your email address.";
      hasLocalError = true;
    }
    if (!password) {
      localErrors.password = "Please create a password for your account.";
      hasLocalError = true;
    } else if (password.length < 6) {
      localErrors.password = "Password must be at least 6 characters long.";
      hasLocalError = true;
    }
    if (!repeatPassword) {
      localErrors.repeatPassword = "Please confirm your password.";
      hasLocalError = true;
    }
    if (password && repeatPassword && password !== repeatPassword) {
      localErrors.repeatPassword = "Passwords do not match.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      triggerShake();
      return;
    }

    setIsLoading(true);
    setStep6(email.trim());

    try {
      const checkResponse = await api.post("api/users/check-email/", {
        email: email.trim(),
      });
      if (checkResponse.data?.exists) {
        setErrors({
          email: "This email is already registered. Please sign in or use another email.",
        });
        triggerShake();
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.warn("Failed to check email availability:", error);
    }

    const signUpState = useSignUpStore.getState();
    const payload = {
      email: email.trim(),
      username: signUpState.username,
      full_name: signUpState.full_name,
      birth_date: signUpState.birth_date,
      password: password,
      password_confirm: repeatPassword,
      favorite_genres: signUpState.favorite_genres,
      favorite_authors: signUpState.favorite_authors,
      random_genres: signUpState.favorite_genres.length === 0,
      random_authors: signUpState.favorite_authors.length === 0,
    };

    try {
      const response = await api.post("api/users/signup/", payload);
      const { tokens, user: userProfile } = response.data;

      if (signUpState.favorite_books.length > 0) {
        try {
          for (const book of signUpState.favorite_books) {
            const raw = book.rawBook;
            await api.post(
              "api/books/userbook/",
              {
                book_id: book.id,
                status: "READ_LATER",
                title: raw?.title || book.title,
                authors: raw?.authors || [book.author],
                cover_image: raw?.cover_image || book.cover,
                synopsis: raw?.synopsis,
                total_pages: raw?.total_pages,
                isbn: raw?.isbn,
                average_rating: raw?.average_rating,
                genres: raw?.genres,
              },
              { headers: { Authorization: `Bearer ${tokens.access}` } }
            );
          }
        } catch (bookError) {
          console.error("Failed to save onboarding books:", bookError);
        }
      }

      await login(tokens.access, userProfile);
      signUpState.reset();
    } catch (error: any) {
      triggerShake();
      const errorData = error.response?.data;
      let errMsg = "Registration failed. Please try again.";
      if (errorData) {
        if (typeof errorData === "string") {
          errMsg = errorData;
        } else if (errorData.error) {
          errMsg = errorData.error;
        } else {
          const newErrors: typeof errors = {};
          let hasFieldErrors = false;

          if (errorData.email) {
            newErrors.email = Array.isArray(errorData.email)
              ? errorData.email[0]
              : errorData.email;
            hasFieldErrors = true;
          }
          if (errorData.username) {
            newErrors.general = `Username: ${
              Array.isArray(errorData.username)
                ? errorData.username[0]
                : errorData.username
            }`;
            hasFieldErrors = true;
          }
          if (errorData.password) {
            newErrors.password = Array.isArray(errorData.password)
              ? errorData.password[0]
              : errorData.password;
            hasFieldErrors = true;
          }
          if (errorData.password_confirm) {
            newErrors.repeatPassword = Array.isArray(errorData.password_confirm)
              ? errorData.password_confirm[0]
              : errorData.password_confirm;
            hasFieldErrors = true;
          }

          if (hasFieldErrors) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
          }
        }
      }
      setErrors({ general: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const hasMinLength = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === repeatPassword;

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
                  Step 6 of 6
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
              <Animated.View
                style={{ width: progressWidth }}
                className="h-full bg-[#C95F44] rounded-full"
              />
            </View>
          </View>

          {/* Main Scrollable Content */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View className="mb-5">
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[11px] tracking-[2px] text-[#C95F44] uppercase mb-1.5"
              >
                Final Step
              </Text>
              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-[32px] text-[#212842] leading-[38px] mb-2"
              >
                Secure your{" "}
                <Text
                  style={{ fontFamily: "Newsreader-Italic" }}
                  className="text-[#C95F44]"
                >
                  Reedo account
                </Text>
              </Text>
              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-[14px] text-[#5A6075] leading-[21px]"
              >
                Enter your email address and create a password so your library, streaks, and reading notes stay backed up on any device.
              </Text>

              {/* Profile Setup Summary Card */}
              <View className="mt-4 bg-[#FAF3E8] border border-[#E6DACB] rounded-2xl p-3.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-full bg-[#212842] items-center justify-center mr-3">
                    <Text
                      style={{ fontFamily: "Newsreader-Bold" }}
                      className="text-sm text-[#FFF8F0]"
                    >
                      {(full_name || "R").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "PublicSans-Bold" }}
                      className="text-xs text-[#212842]"
                      numberOfLines={1}
                    >
                      {full_name || "New Reader"}{" "}
                      <Text
                        style={{ fontFamily: "PublicSans-Regular" }}
                        className="text-[#C95F44]"
                      >
                        @{username || "reader"}
                      </Text>
                    </Text>
                    <Text
                      style={{ fontFamily: "PublicSans-Regular" }}
                      className="text-[11px] text-[#64748B] mt-0.5"
                      numberOfLines={1}
                    >
                      {favorite_genres.length} genres • {favorite_authors.length} authors •{" "}
                      {favorite_books.length} books ready
                    </Text>
                  </View>
                </View>
                <Icon name="sealCheck" size={18} color="#C95F44" />
              </View>
            </View>

            {/* Form Inputs */}
            <Animated.View
              style={{ transform: [{ translateX: shakeAnim }] }}
              className="w-full"
            >
              {errors.general && (
                <View className="bg-[#FDF2F0] border border-[#E8B4B4] rounded-2xl p-3.5 mb-4 flex-row items-start">
                  <View className="w-5 h-5 rounded-full bg-[#C94444]/15 items-center justify-center mr-2.5 mt-0.5">
                    <Icon name="cancel" size={13} color="#C94444" />
                  </View>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-[#9E2A2B] text-xs flex-1 leading-5"
                  >
                    {errors.general}
                  </Text>
                </View>
              )}

              {/* Email Field */}
              <View className="mb-4">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className={`text-xs tracking-[1px] uppercase mb-1.5 ${
                    errors.email ? "text-[#C94444]" : "text-[#212842]"
                  }`}
                >
                  Email Address
                </Text>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.email
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "email"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="bookOpen"
                    size={17}
                    color={
                      errors.email
                        ? "#C94444"
                        : focusedField === "email"
                        ? "#212842"
                        : "#8E8B82"
                    }
                  />
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email || errors.general) setErrors({});
                    }}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="you@example.com"
                    placeholderTextColor="#A9A49A"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                </View>

                {errors.email && (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.email}
                  </Text>
                )}
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className={`text-xs tracking-[1px] uppercase mb-1.5 ${
                    errors.password ? "text-[#C94444]" : "text-[#212842]"
                  }`}
                >
                  Create Password
                </Text>

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
                    placeholder="At least 6 characters"
                    placeholderTextColor="#A9A49A"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => repeatPasswordRef.current?.focus()}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
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

                {errors.password && (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.password}
                  </Text>
                )}
              </View>

              {/* Confirm Password Field */}
              <View className="mb-4">
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className={`text-xs tracking-[1px] uppercase mb-1.5 ${
                    errors.repeatPassword ? "text-[#C94444]" : "text-[#212842]"
                  }`}
                >
                  Confirm Password
                </Text>

                <View
                  className={`flex-row items-center rounded-2xl px-4 py-1 border ${
                    errors.repeatPassword
                      ? "bg-[#FDF2F0] border-[#C94444]"
                      : focusedField === "confirm"
                      ? "bg-white border-[#212842]"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="lockOpen"
                    size={18}
                    color={
                      errors.repeatPassword
                        ? "#C94444"
                        : focusedField === "confirm"
                        ? "#212842"
                        : "#8E8B82"
                    }
                  />
                  <TextInput
                    ref={repeatPasswordRef}
                    value={repeatPassword}
                    onChangeText={(text) => {
                      setRepeatPassword(text);
                      if (errors.repeatPassword || errors.general) setErrors({});
                    }}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#A9A49A"
                    secureTextEntry={!showRepeatPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleFinalize}
                    editable={!isLoading}
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="flex-1 text-base text-[#212842] py-3.5 ml-3"
                  />
                  <TouchableOpacity
                    onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                    className="pl-2 py-2"
                    disabled={isLoading}
                  >
                    <Icon
                      name={showRepeatPassword ? "eyeOutline" : "eyeClosedSolid"}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                {errors.repeatPassword && (
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-xs text-[#C94444] mt-1.5 px-1"
                  >
                    {errors.repeatPassword}
                  </Text>
                )}
              </View>

              {/* Live Password Checklist Pills */}
              <View className="flex-row items-center gap-2 mb-4">
                <View
                  className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                    hasMinLength
                      ? "bg-[#16A34A]/10 border-[#16A34A]/30"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="checkCircle"
                    size={13}
                    color={hasMinLength ? "#16A34A" : "#9A968E"}
                  />
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-[11px] ml-1.5 ${
                      hasMinLength ? "text-[#15803D]" : "text-[#64748B]"
                    }`}
                  >
                    6+ characters
                  </Text>
                </View>

                <View
                  className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                    passwordsMatch
                      ? "bg-[#16A34A]/10 border-[#16A34A]/30"
                      : "bg-[#FAF3E8] border-[#E6DACB]"
                  }`}
                >
                  <Icon
                    name="checkCircle"
                    size={13}
                    color={passwordsMatch ? "#16A34A" : "#9A968E"}
                  />
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className={`text-[11px] ml-1.5 ${
                      passwordsMatch ? "text-[#15803D]" : "text-[#64748B]"
                    }`}
                  >
                    Passwords match
                  </Text>
                </View>
              </View>

              {/* Legal Notice */}
              <Text
                style={{ fontFamily: "PublicSans-Regular" }}
                className="text-xs text-[#64748B] leading-[18px] text-center px-2"
              >
                By creating your account, you agree to Reedo's{" "}
                <Text
                  onPress={() => setActiveLegalModal("terms")}
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#C95F44] underline"
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  onPress={() => setActiveLegalModal("privacy")}
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[#C95F44] underline"
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </Animated.View>
          </ScrollView>

          {/* Streamlined Pinned Bottom Bar */}
          <View className="px-6 pt-3 pb-5 bg-[#FFF8F0] border-t border-[#EDE3D5]">
            <TouchableOpacity
              onPress={handleFinalize}
              disabled={isLoading}
              activeOpacity={0.85}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                isLoading ? "bg-[#C95F44]/70" : "bg-[#C95F44]"
              }`}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#FFF8F0" size="small" />
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-[#FFF8F0] text-[15px] ml-2.5"
                  >
                    Creating your account...
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
                  >
                    Create My Free Account
                  </Text>
                  <Icon name="checkCircle" size={18} color="#FFF8F0" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Legal Modal */}
      <Modal
        visible={activeLegalModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveLegalModal(null)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-[#FFF8F0] rounded-t-3xl px-6 pt-6 pb-10 max-h-[82%] border-t border-[#E5DEC9]">
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#E5DEC9]">
              <View>
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[10px] tracking-[2px] text-[#C95F44] uppercase mb-1"
                >
                  Reedo Legal
                </Text>
                <Text
                  style={{ fontFamily: "Newsreader-Bold" }}
                  className="text-2xl text-[#212842]"
                >
                  {activeLegalModal === "terms" ? "Terms of Service" : "Privacy Policy"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveLegalModal(null)}
                className="w-9 h-9 rounded-full bg-[#FAF3E8] border border-[#E6DACB] items-center justify-center"
              >
                <Icon name="cancel" size={16} color="#212842" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-6">
              {activeLegalModal === "terms" ? (
                <View>
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-sm text-[#212842] mb-1"
                  >
                    1. Welcome to Reedo
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-sm text-[#5A6075] leading-6 mb-4"
                  >
                    By creating an account on Reedo, you agree to use the platform respectfully to organize your personal library, track reading sessions, and share constructive literary reflections ("Echoes").
                  </Text>

                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-sm text-[#212842] mb-1"
                  >
                    2. Your Content & Notes
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-sm text-[#5A6075] leading-6 mb-4"
                  >
                    You retain ownership of all reading notes, reviews, and echoes you create. Public echoes must respect community standards and remain free of harassment or spam.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-sm text-[#212842] mb-1"
                  >
                    1. Information We Collect
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-sm text-[#5A6075] leading-6 mb-4"
                  >
                    We collect your name, @username, email address, optional birth date, and reading preferences (favorite genres, followed authors, saved books, and reading progress) solely to deliver and personalize your Reedo experience.
                  </Text>

                  <Text
                    style={{ fontFamily: "PublicSans-Bold" }}
                    className="text-sm text-[#212842] mb-1"
                  >
                    2. How Your Data Powers Recommendations
                  </Text>
                  <Text
                    style={{ fontFamily: "PublicSans-Regular" }}
                    className="text-sm text-[#5A6075] leading-6 mb-4"
                  >
                    Your followed authors, searches, and saved books are used to recommend books and related authors inside the app. We never sell your personal information to third parties.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setActiveLegalModal(null)}
              activeOpacity={0.85}
              className="bg-[#212842] w-full py-4 rounded-2xl items-center shadow-sm"
            >
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[#FFF8F0] text-sm tracking-wide"
              >
                Got It
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
