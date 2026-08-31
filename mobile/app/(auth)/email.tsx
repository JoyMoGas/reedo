/**
 * @project Reedo
 * @module email
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
import { useAuthStore } from "../../store/useAuthStore";
import api from "../../store/api";
import { useSignUpStore } from "../../store/useSignUpStore";

export default function SignInStep6Screen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { email: storedEmail, setStep6 } = useSignUpStore();

  const [email, setEmail] = useState(storedEmail || "");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; repeatPassword?: string; general?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const repeatPasswordRef = useRef<TextInput>(null);

  // Underline focus animated values
  const emailFocusAnim = useRef(new Animated.Value(0)).current;
  const passwordFocusAnim = useRef(new Animated.Value(0)).current;
  const repeatPasswordFocusAnim = useRef(new Animated.Value(0)).current;

  const animateFocus = (anim: Animated.Value, toValue: number) => {
    Animated.timing(anim, {
      toValue,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const emailLineWidth = emailFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const passwordLineWidth = passwordFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const repeatPasswordLineWidth = repeatPasswordFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // Animated values
  const progressAnim = useRef(new Animated.Value(5 / 6)).current;
  const dotTransition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Top progress bar: from 5/6 (step 5) to 6/6 (step 6 - 100%)
    Animated.timing(progressAnim, {
      toValue: 6 / 6,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bottom dots: transitioning active pill from dot 5 to dot 6
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

  const dot5Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 8],
  });

  const dot6Width = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const dot5Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#212842", "#EBE7DF"],
  });

  const dot6Color = dotTransition.interpolate({
    inputRange: [0, 1],
    outputRange: ["#EBE7DF", "#212842"],
  });

  const handleFinalize = async () => {
    setErrors({});
    let hasLocalError = false;
    const localErrors: typeof errors = {};

    if (!email.trim()) {
      localErrors.email = "Please enter your email.";
      hasLocalError = true;
    }
    if (!password) {
      localErrors.password = "Please enter your master password.";
      hasLocalError = true;
    }
    if (!repeatPassword) {
      localErrors.repeatPassword = "Please repeat your password.";
      hasLocalError = true;
    }
    if (password && repeatPassword && password !== repeatPassword) {
      localErrors.repeatPassword = "Passwords do not match.";
      hasLocalError = true;
    }

    if (hasLocalError) {
      setErrors(localErrors);
      return;
    }

    setIsLoading(true);

    try {
      const checkResponse = await api.post("api/users/check-email/", {
        email: email.trim(),
      });
      if (checkResponse.data?.exists) {
        setErrors({ email: "This email is already in use. Please choose another." });
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.warn("Failed to check email availability:", error);
      // Fallback: proceed to signup if server or connection issues occur during this auxiliary check
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
      
      // Save onboarding favorite books to UserBook shelf in Supabase BEFORE logging in (to prevent race conditions with navigation redirect)
      if (signUpState.favorite_books.length > 0) {
        try {
          for (const book of signUpState.favorite_books) {
            const raw = book.rawBook;
            await api.post("api/books/userbook/", 
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
                genres: raw?.genres
              },
              { headers: { Authorization: `Bearer ${tokens.access}` } }
            );
          }
        } catch (bookError) {
          console.error("Failed to save onboarding books:", bookError);
        }
      }

      // Save access token and user locally/globally (this will trigger navigation redirect)
      await login(tokens.access, userProfile);

      signUpState.reset();
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = "Registration failed.";
      if (errorData) {
        if (typeof errorData === "string") {
          errMsg = errorData;
        } else if (errorData.error) {
          errMsg = errorData.error;
        } else {
          // Check for field-specific errors
          const newErrors: typeof errors = {};
          let hasFieldErrors = false;
          
          if (errorData.email) {
            newErrors.email = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
            hasFieldErrors = true;
          }
          if (errorData.username) {
            newErrors.general = `Username: ${Array.isArray(errorData.username) ? errorData.username[0] : errorData.username}`;
            hasFieldErrors = true;
          }
          if (errorData.password) {
            newErrors.password = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
            hasFieldErrors = true;
          }
          if (errorData.password_confirm) {
            newErrors.repeatPassword = Array.isArray(errorData.password_confirm) ? errorData.password_confirm[0] : errorData.password_confirm;
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
      setErrors({ general: errMsg });
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
              Secure your{"\n"}archive
            </Text>
            <Text
              className="text-base text-[#5C5E69] text-start mt-4 leading-relaxed"
              style={{ fontFamily: "PublicSans-Regular" }}
            >
              Your thoughts are the most personal artifacts you possess. To preserve the sanctity of your digital curation, we require a unique master key that ensures your archive remains yours alone.
            </Text>

            {/* General Error Banner */}
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
              {/* Email Address Input */}
              <View className="mb-6">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 ${errors.email ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  EMAIL ADDRESS
                </Text>
                <View className="w-full relative pb-[2px]">
                  <TextInput
                    ref={emailRef}
                    className="w-full text-xl py-2 text-[#212842]"
                    style={{ fontFamily: "Newsreader-Italic" }}
                    placeholder="curator@reedo.com"
                    placeholderTextColor="#C5C2BA"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => {
                      setFocusedField("email");
                      animateFocus(emailFocusAnim, 1);
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      animateFocus(emailFocusAnim, 0);
                    }}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setStep6(val.trim());
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    editable={!isLoading}
                  />
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.email ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: emailLineWidth,
                      height: 2,
                      backgroundColor: errors.email ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.email && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.email}
                  </Text>
                )}
              </View>

              {/* Master Password Input */}
              <View className="mb-6">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 ${errors.password ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  MASTER PASSWORD
                </Text>
                <View className="w-full relative pb-[2px]">
                  <View className="flex-row items-center w-full">
                    <TextInput
                      ref={passwordRef}
                      className="flex-1 text-xl py-2 text-[#212842]"
                      style={{ fontFamily: "Newsreader-Italic" }}
                      placeholder="•••••••"
                      placeholderTextColor="#C5C2BA"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => repeatPasswordRef.current?.focus()}
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

              {/* Repeat Password Input */}
              <View className="mb-6">
                <Text
                  className={`text-xs tracking-widest uppercase mb-1 ${errors.repeatPassword ? "text-[#E57A7A]" : "text-[#8E8B82]"}`}
                  style={{ fontFamily: "PublicSans-Bold" }}
                >
                  REPEAT PASSWORD
                </Text>
                <View className="w-full relative pb-[2px]">
                  <View className="flex-row items-center w-full">
                    <TextInput
                      ref={repeatPasswordRef}
                      className="flex-1 text-xl py-2 text-[#212842]"
                      style={{ fontFamily: "Newsreader-Italic" }}
                      placeholder="•••••••"
                      placeholderTextColor="#C5C2BA"
                      secureTextEntry={!showRepeatPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleFinalize}
                      onFocus={() => {
                        setFocusedField("repeatPassword");
                        animateFocus(repeatPasswordFocusAnim, 1);
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                        animateFocus(repeatPasswordFocusAnim, 0);
                      }}
                      value={repeatPassword}
                      onChangeText={(val) => {
                        setRepeatPassword(val);
                        if (errors.repeatPassword) setErrors(prev => ({ ...prev, repeatPassword: undefined }));
                      }}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                      className="pl-3 py-2"
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      <Text
                        className="text-lg font-bold"
                        style={{ color: showRepeatPassword ? "#212842" : "#C5C2BA" }}
                      >
                        👁
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {/* Background Line */}
                  <View className={`absolute bottom-0 left-0 w-full h-[1px] ${errors.repeatPassword ? "bg-[#F5C2C2]" : "bg-[#E5E0D8]"}`} />
                  {/* Animated Active Line */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: repeatPasswordLineWidth,
                      height: 2,
                      backgroundColor: errors.repeatPassword ? "#E57A7A" : "#212842",
                    }}
                  />
                </View>
                {errors.repeatPassword && (
                  <Text
                    className="text-[#E57A7A] text-xs mt-1"
                    style={{ fontFamily: "PublicSans-Regular" }}
                  >
                    {errors.repeatPassword}
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

        {/* Pinned Footer (Always visible at the bottom) */}
        <View className="px-6 bg-[#FFF8F0] pb-6 pt-2 border-t border-[#EBE7DF]">
          {/* Finalize Button */}
          <TouchableOpacity
            className={`w-full rounded-full py-4 mt-2 flex-row justify-center items-center ${isLoading ? "bg-[#5C5E69]" : "bg-[#212842]"}`}
            onPress={handleFinalize}
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
                Publish Profile
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal Documents Links */}
          <View className="flex-row justify-between w-full mt-3 px-2">
            <TouchableOpacity activeOpacity={0.7}>
              <Text
                className="text-[10px] text-[#5C5E69] font-bold tracking-wider"
                style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}
              >
                PRIVACY POLICY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text
                className="text-[10px] text-[#5C5E69] font-bold tracking-wider"
                style={{ fontFamily: "PublicSans-Bold", textDecorationLine: "underline" }}
              >
                TERMS OF CURATION
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Line with Logo Divider */}
          <View className="flex-row items-center w-full mt-3">
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
            <View className="mx-4">
              <Logo width={24} height={24} />
            </View>
            <View className="flex-1 h-[1px] bg-[#EBE7DF]" />
          </View>

          {/* Step Counter & Animated Indicators */}
          <View className="flex-row justify-between items-center w-full mt-2.5">
            <Text
              className="text-xs text-[#8E8B82]"
              style={{ fontFamily: "PublicSans-Bold" }}
            >
              STEP 6 OF 6
            </Text>
            <View className="flex-row items-center">
              {/* Inactive Dots 1, 2, 3, 4 */}
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#EBE7DF] mx-1" />

              {/* Animated Dot 5 (Step 5 Active -> Inactive) */}
              <Animated.View
                style={{
                  width: dot5Width,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot5Color,
                  marginHorizontal: 4,
                }}
              />

              {/* Animated Dot 6 (Step 6 Inactive -> Active) */}
              <Animated.View
                style={{
                  width: dot6Width,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot6Color,
                  marginHorizontal: 4,
                }}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
