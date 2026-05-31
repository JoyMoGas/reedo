import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Text, View, TouchableOpacity } from "react-native";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";

import Logo from "./assets/LOGO.svg";
import PresentImage from "./assets/PresentImage.svg";

import { SafeAreaView } from "react-native-safe-area-context";
import { useSignUpStore } from "../store/useSignUpStore";

export default function WelcomeScreen() {
  const router = useRouter();
  const { reset } = useSignUpStore();

  useEffect(() => {
    reset();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#FFF8F0] justify-start pt-10 px-4">
      <View className="flex-col items-center justify-center w-full px-5">
        <Logo width={70} height={70} />
        <Text
          className="text-[26px] text-[#212842] text-center"
          style={{ fontFamily: "Newsreader-Bold" }}
        >
          REEDO
        </Text>
      </View>

      <View className="flex-col items-center justify-center w-full px-5 mt-6">
        <PresentImage width={350} height={350} />
        <Text
          className="text-5xl text-[#212842] text-center mt-5"
          style={{ fontFamily: "Newsreader-Italic" }}
        >
          The silence of a shared{"\n"}story
        </Text>
      </View>

      {/* Sección de la descripción corta */}
      <View className="flex-col items-center justify-center w-full px-5 mt-8">
        <Text
          className="text-xl text-[#5C5E69] text-center"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          A quiet archive for your thoughts,{"\n"}curated for the intentional
          reader.
        </Text>
      </View>

      {/* Botón: Crear Cuenta (Registro Step 1) */}
      <TouchableOpacity 
        className="w-full bg-[#212842] rounded-full py-3 mt-10"
        onPress={() => router.push("/(auth)/signin")}
      >
        <View className="flex-col items-center justify-center w-full my-3">
          <Text
            className="text-[#FFFFFF] text-center text-2xl"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            Open First Chapter
          </Text>
        </View>
      </TouchableOpacity>

      {/* Enlace: Ir a Login */}
      <View className="flex-col items-center justify-center w-full mt-10">
        <Text
          className="text-xl text-[#5C5E69] text-center"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Already have an account?{" "}
          <Text
            className="text-[#212842]"
            style={{ fontFamily: "PublicSans-Bold" }}
            onPress={() => router.push("/(auth)/login")}
          >
            Login
          </Text>
        </Text>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
