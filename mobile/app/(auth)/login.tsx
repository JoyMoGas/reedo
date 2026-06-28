import React, { useState, useRef } from "react";
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import { useAuthStore } from "../../store/useAuthStore";
import api from "../../store/api";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  // Underline focus animated values
  const identifierFocusAnim = useRef(new Animated.Value(0)).current;
  const passwordFocusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const identifierLineWidth = identifierFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const passwordLineWidth = passwordFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const handleLogin = async () => {
    setErrors({});
    let hasLocalError = false;
    const localErrors: typeof errors = {};

    if (!identifier.trim()) {
      localErrors.identifier = "Please enter your email or username.";
      hasLocalError = true;
    }
    if (!password) {
      localErrors.password = "Please enter your password.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("api/users/signin/", {
        username: identifier.trim(),
        password,
      });
      const { tokens, user: userProfile } = response.data;
      
      // Save access token and user locally/globally
      await login(tokens.access, userProfile);
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = "Login failed.";
      if (errorData) {
        if (typeof errorData === "string") {
          errMsg = errorData;
        } else if (errorData.error) {
          errMsg = errorData.error;
        } else {
          // Check for field-specific errors
          const newErrors: typeof errors = {};
          let hasFieldErrors = false;
          if (errorData.username) {
            newErrors.identifier = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
            hasFieldErrors = true;
          }
          if (errorData.password) {
            newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
            hasFieldErrors = true;
          }
          if (hasFieldErrors) {
            setErrors(newErrors);
            setIsLoading(false);
            return;
          }

          errMsg = Object.keys(errorData)
            .map((key) => `${key}: ${JSON.stringify(errorData[key])}`)
            .join("\n");
        }
      }
      
      if (error.response?.status === 401) {
        setErrors({ general: "Invalid credentials. Please verify your email/username and password." });
      } else if (!error.response) {
        setErrors({ general: "Unable to connect to server. Please check your internet connection." });
      } else {
        setErrors({ general: errMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0] justify-between">

      {/* Top Navigation Header (Fixed) */}
      <View>
        <View className="flex-row items-center justify-between w-full px-6 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-start justify-center"
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

          {/* Empty spacer to align the logo to the center */}
          <View className="w-10" />
        </View>

        {/* Pinned Divider Line */}
        <View className="w-full h-[1px] bg-[#EBE7DF]" />
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
              Resume my{"\n"}journey
            </Text>
            <Text
              className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Enter the archive of your thoughts.
            </Text>

            {/* General Error Alert Banner */}
            {errors.general && (
              <View className="mt-6 p-4 rounded-2xl bg-[#FFF5F5] border border-[#FAD2D2] flex-row items-center">
                <Text className="text-xl mr-3">⚠️</Text>
                <Text
                  className="flex-1 text-[#C53030] text-sm"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  {errors.general}
                </Text>
              </View>
            )}

            {/* Input Form Fields */}
            <View className="mt-10">
              {/* Email / Username Input */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-1">
                  <Text
                    className={`text-xs tracking-widest uppercase ${errors.identifier ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    EMAIL / USERNAME
                  </Text>
                </View>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    className="w-full text-xl py-2 text-[#212842]"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="curator@reedo.com"
                    placeholderTextColor="#C5C2BA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("identifier");
                      animateFocus(identifierFocusAnim, 1);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      animateFocus(identifierFocusAnim, 0);
                    }}
                    value={identifier}
                    onChangeText={(val) => {
                      setIdentifier(val);
                      if (errors.identifier) setErrors(prev => ({ ...prev, identifier: undefined }));
                    }}
                    editable={!isLoading}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.identifier ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: identifierLineWidth,
                      height: 2,
                      backgroundColor: errors.identifier ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.identifier && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.identifier}
                  </Text>
                )}
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-1">
                  <Text
                    className={`text-xs tracking-widest uppercase ${errors.password ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    PASSWORD
                  </Text>
                  <TouchableOpacity activeOpacity={0.7} disabled={isLoading}>
                    <Text
                      className="text-[10px] text-[#212842] font-bold tracking-wide"
                      style={{ fontFamily: "PublicSans-Bold" }}
                    >
                      FORGOT PASSWORD?
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="w-full relative pb-[2px]">
                  <View className="flex-row items-center w-full">
                    <TextInput
                      ref={passwordRef}
                      className="flex-1 text-xl py-2 text-[#212842]"
                      style={{ fontFamily: "Newsreader-Italic" }}
                      placeholder="••••••"
                      placeholderTextColor="#C5C2BA"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      onFocus={() => {
                        setFocusedField("password");
                        animateFocus(passwordFocusAnim, 1);
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        animateFocus(passwordFocusAnim, 0);
                      }}
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                      }}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="pl-3 py-2"
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Text
                        className="text-lg font-bold"
                        style={{ color: showPassword ? "#212842" : "#C5C2BA" }}
                      >
                        👁
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.password ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: passwordLineWidth,
                      height: 2,
                      backgroundColor: errors.password ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.password && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.password}
                  </Text>
                )}
              </View>
            </View>
          </View>

        </ScrollView>

        {/* Pinned Footer (Always visible at the bottom) */}
        <View className="px-6 bg-[#FFF8F0] pb-6 pt-2 border-t border-[#EBE7DF]">
          {/* Login Button */}
          <TouchableOpacity
            className={`w-full rounded-full py-4 mt-2 flex-row justify-center items-center ${isLoading ? "bg-[#5C5E69]" : "bg-[#212842]"}`}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                className="text-[#FFFFFF] text-center text-lg mr-2"
                style={{ fontFamily: "PublicSans-Bold" }}
              >
                Access my archive
              </Text>
            )}
          </TouchableOpacity>

          {/* Link to sign up */}
          <View className="flex-row justify-center w-full mt-4">
            <Text
              className="text-sm text-[#5C5E69] text-center"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              New to the collection?{" "}
              <Text
                className="text-[#212842] font-bold"
                style={{ fontFamily: "PublicSans-Bold" }}
                onPress={() => router.push("/(auth)/signin")}
              >
                Sign up
              </Text>
            </Text>
          </View>

          {/* Horizontal Line with Logo Divider */}
          <View className="flex-row items-center w-full mt-6 mb-1">
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
            <View className="mx-4">
              <Logo width={24} height={24} />
            </View>
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
