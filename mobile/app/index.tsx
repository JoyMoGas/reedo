import React, { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "./assets/LOGO.svg";
import PresentImage from "./assets/PresentImage.svg";
import Icon from "../core/Icon";
import { useSignUpStore } from "../store/useSignUpStore";

const VALUE_PILLS = [
  { icon: "libraryOutline", label: "Personal Library" },
  { icon: "hourglass", label: "Immersion Timer" },
  { icon: "quillWrite", label: "Reading Notes & Echoes" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { reset } = useSignUpStore();

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Brand Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-2xl bg-[#FAF3E8] border border-[#E6DACB] items-center justify-center mr-3">
              <Logo width={28} height={28} />
            </View>
            <View>
              <Text
                style={{ fontFamily: "Newsreader-Bold" }}
                className="text-xl text-[#212842] tracking-tight"
              >
                REEDO
              </Text>
              <Text
                style={{ fontFamily: "PublicSans-Bold" }}
                className="text-[10px] tracking-[2px] uppercase text-[#C95F44]"
              >
                Reading Companion
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.75}
            className="px-4 py-2 rounded-full bg-[#FAF3E8] border border-[#E6DACB]"
          >
            <Text
              style={{ fontFamily: "PublicSans-Bold" }}
              className="text-xs text-[#212842]"
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center Hero Illustration & Editorial Pitch */}
        <View className="items-center my-4">
          <View className="w-full max-w-[300px] aspect-square rounded-[32px] bg-[#FAF3E8] border border-[#EDE3D5] items-center justify-center overflow-hidden shadow-sm mb-5">
            <PresentImage width={270} height={270} />
          </View>

          {/* Feature Pills */}
          <View className="flex-row flex-wrap items-center justify-center gap-2 mb-4">
            {VALUE_PILLS.map((pill) => (
              <View
                key={pill.label}
                className="flex-row items-center px-3 py-1.5 rounded-full bg-[#F5EEDF] border border-[#E6DACB]"
              >
                <Icon name={pill.icon} size={13} color="#C95F44" />
                <Text
                  style={{ fontFamily: "PublicSans-Bold" }}
                  className="text-[11px] text-[#3B4258] ml-1.5"
                >
                  {pill.label}
                </Text>
              </View>
            ))}
          </View>

          <Text
            style={{ fontFamily: "Newsreader-Bold" }}
            className="text-[36px] text-[#212842] text-center leading-[42px] mb-3"
          >
            Your reading life,{"\n"}
            <Text
              style={{ fontFamily: "Newsreader-Italic" }}
              className="text-[#C95F44]"
            >
              beautifully organized.
            </Text>
          </Text>

          <Text
            style={{ fontFamily: "PublicSans-Regular" }}
            className="text-[15px] text-[#5A6075] text-center leading-[22px] px-2"
          >
            Track the books you read, focus deeply with Immersion Mode, save page-by-page notes, and discover books tailored to the authors you love.
          </Text>
        </View>

        {/* Bottom Primary & Secondary Actions */}
        <View className="w-full pt-2">
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin")}
            activeOpacity={0.85}
            className="bg-[#212842] w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md mb-3"
          >
            <Text
              style={{ fontFamily: "PublicSans-Bold" }}
              className="text-[#FFF8F0] text-[15px] tracking-wide mr-2"
            >
              Get Started — Create Free Account
            </Text>
            <Icon name="arrowRight" size={16} color="#FFF8F0" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.75}
            className="bg-[#FAF3E8] border border-[#E2D6C5] w-full py-3.5 rounded-2xl flex-row items-center justify-center"
          >
            <Text
              style={{ fontFamily: "PublicSans-Regular" }}
              className="text-[#5A6075] text-sm"
            >
              Already have an account?{" "}
            </Text>
            <Text
              style={{ fontFamily: "PublicSans-Bold" }}
              className="text-[#C95F44] text-sm"
            >
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
