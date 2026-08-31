/**
 * @project Reedo
 * @module signin
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "../assets/LOGO.svg";
import { useSignUpStore } from "../../store/useSignUpStore";
import api from "../../store/api";

export default function SignInStep1Screen() {
  const router = useRouter();
  const { full_name: storedFullName, username: storedUsername, setStep1 } = useSignUpStore();

  const [fullName, setFullName] = useState(storedFullName || "");
  const [username, setUsername] = useState(storedUsername || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; username?: string }>({});

  const [isUsernameManual, setIsUsernameManual] = useState(false);
  const generateTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
      }
    };
  }, []);

  const handleContinue = async () => {
    setErrors({});
    let hasLocalError = false;
    const localErrors: typeof errors = {};

    if (!fullName.trim()) {
      localErrors.fullName = "Please enter your full name.";
      hasLocalError = true;
    }
    const cleanUsername = username.trim();
    if (!username.trim()) {
      localErrors.username = "Please enter a unique username.";
      hasLocalError = true;
    } else if (cleanUsername.length < 3) {
      localErrors.username = "Username must be at least 3 characters long.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("api/users/check-username/", {
        username: cleanUsername,
      });
      
      if (response.data?.exists) {
        setErrors({ username: "This username is already taken. Please choose another." });
        setIsLoading(false);
        return;
      }

      setStep1(fullName.trim(), cleanUsername);
      router.push("/(auth)/birthday");
    } catch (error) {
      console.warn("Failed to check username availability:", error);
      // Fallback: Proceed even if request fails due to offline/server state
      setStep1(fullName.trim(), cleanUsername);
      router.push("/(auth)/birthday");
    } finally {
      setIsLoading(false);
    }
  };

  // Underline focus animated values
  const fullNameFocusAnim = useRef(new Animated.Value(0)).current;
  const usernameFocusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const fullNameLineWidth = fullNameFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const usernameLineWidth = usernameFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

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

        {/* Progress Bar (Step 1 of 6) */}
        <View className="w-full h-[2px] bg-[#EBE7DF]">
          <View className="w-1/6 h-full bg-[#212842]" />
        </View>
      </View>

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
              Define your{"\n"}Literary Identity
            </Text>
            <Text
              className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Your identity is the spine of your digital archive. This name will grace your curated collections and mark every thought you share with the world.
            </Text>

            {/* Input Form Fields */}
            <View className="mt-10">
              {/* Full Name Input */}
              <View className="mb-6">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 ${errors.fullName ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  FULL NAME
                </Text>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    className="w-full text-xl py-2 text-[#212842]"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="E.g., Julian Thorne"
                    placeholderTextColor="#C5C2BA"
                    onFocus={() => animateFocus(fullNameFocusAnim, 1)}
                    onBlur={() => animateFocus(fullNameFocusAnim, 0)}
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));

                      if (!isUsernameManual) {
                        // Instant local generation for immediate visual feedback
                        const localUsername = val
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "_")
                          .replace(/^_+|_+$/g, "");
                        
                        setUsername(localUsername);

                        if (generateTimeoutRef.current) {
                          clearTimeout(generateTimeoutRef.current);
                        }

                        if (val.trim()) {
                          generateTimeoutRef.current = setTimeout(async () => {
                            try {
                              const response = await api.post("api/users/generate-username/", {
                                fullname: val.trim(),
                              });
                              if (response.data?.username && !isUsernameManual) {
                                setUsername(response.data.username);
                              }
                            } catch (e) {
                              console.warn("Failed to auto-generate unique username:", e);
                            }
                          }, 500);
                        } else {
                          setUsername("");
                        }
                      }
                    }}
                    editable={!isLoading}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.fullName ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: fullNameLineWidth,
                      height: 2,
                      backgroundColor: errors.fullName ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.fullName && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.fullName}
                  </Text>
                )}
              </View>

              {/* Username Input */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-1">
                  <Text
                    className={`text-xs tracking-widest uppercase ${errors.username ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                    style={{ fontFamily: "PublicSans-Bold" }}
                  >
                    USERNAME
                  </Text>
                  <Text
                    className="text-[10px] text-[#C5C2BA] italic"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    Unique Identifier
                  </Text>
                </View>
                <View className="flex-row items-center w-full relative pb-[2px]">
                  <Text
                    className="text-xl py-2 text-[#212842] mr-1"
                    style={{ fontFamily: "Newsreader-Italic" }}
                  >
                    @
                  </Text>
                  <TextInput
                    className="flex-1 text-xl py-2 text-[#212842]"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="curator_j"
                    placeholderTextColor="#C5C2BA"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => animateFocus(usernameFocusAnim, 1)}
                    onBlur={() => animateFocus(usernameFocusAnim, 0)}
                    value={username}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/@/g, "").replace(/\s+/g, "").toLowerCase();
                      setUsername(cleaned);
                      if (errors.username) setErrors(prev => ({ ...prev, username: undefined }));

                      if (cleaned.length > 0) {
                        setIsUsernameManual(true);
                      } else {
                        setIsUsernameManual(false);
                        // Reset and auto-regenerate immediately from current fullName if cleared
                        if (fullName.trim()) {
                          const localUsername = fullName
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "_")
                            .replace(/^_+|_+$/g, "");
                          
                          setUsername(localUsername);

                          if (generateTimeoutRef.current) {
                            clearTimeout(generateTimeoutRef.current);
                          }
                          generateTimeoutRef.current = setTimeout(async () => {
                            try {
                              const response = await api.post("api/users/generate-username/", {
                                fullname: fullName.trim(),
                              });
                              if (response.data?.username) {
                                setUsername(response.data.username);
                              }
                            } catch (e) {
                              console.warn("Failed to auto-generate unique username:", e);
                            }
                          }, 500);
                        }
                      }
                    }}
                    editable={!isLoading}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.username ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: usernameLineWidth,
                      height: 2,
                      backgroundColor: errors.username ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.username && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.username}
                  </Text>
                )}
              </View>
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
          </View>

        </ScrollView>

        {/* Footer Elements (Button, Quote, Logo Divider, Step Indicator) */}
        <View className="px-6 bg-[#FFF8F0] pb-6 pt-2 border-t border-[#EBE7DF]">
          {/* Continue Journey Button */}
          <TouchableOpacity
            className={`w-full rounded-full py-4 mt-2 flex-row justify-center items-center ${isLoading ? "bg-[#5C5E69]" : "bg-[#212842]"}`}
            onPress={handleContinue}
            activeOpacity={0.9}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text
                  className="text-[#FFFFFF] text-center text-lg mr-2"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  Begin My Story
                </Text>
                <Text
                  className="text-[#FFFFFF] text-lg font-bold"
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  {" >"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Quote */}
          <Text
            className="text-[#A9A695] text-center text-sm italic mt-4"
            style={{ fontFamily: "Newsreader-Italic" }}
          >
            "Words are a footprint in the archive of time"
          </Text>

          {/* Horizontal Line with Logo Divider */}
          <View className="flex-row items-center w-full mt-4">
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
            <View className="mx-4">
              <Logo width={28} height={28} />
            </View>
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
          </View>

          {/* Step Counter & Indicators */}
          <View className="flex-row justify-between items-center w-full mt-3 mb-1">
            <Text
              className="text-xs text-[#8E8B82]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              STEP 1 OF 6
            </Text>
            <View className="flex-row items-center">
              {/* Active Pill for Step 1 */}
              <View className="w-5 h-2 rounded-full bg-[#212842] mx-1" />
              {/* Inactive Dots for Steps 2 to 6 */}
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
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

