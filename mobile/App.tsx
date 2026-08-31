/**
 * @project Reedo
 * @module App
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-21
 */
import { Text, TouchableOpacity, View } from "react-native";
import { useFonts } from "expo-font";

import Logo from "./app/assets/LOGO.svg";
import PresentImage from "./app/assets/PresentImage.svg";

import { SafeAreaView } from "react-native-safe-area-context";

export default function App() {
  const [fontsLoaded] = useFonts({
    "Newsreader-Italic": require("./app/assets/fonts/Newsreader/static/Newsreader_36pt-Italic.ttf"),
    "Newsreader-Regular": require("./app/assets/fonts/Newsreader/static/Newsreader_36pt-Regular.ttf"),
    "Newsreader-Bold": require("./app/assets/fonts/Newsreader/static/Newsreader_14pt-Bold.ttf"),

    "PublicSans-Regular": require("./app/assets/fonts/Public_Sans/static/PublicSans-Regular.ttf"),
    "PublicSans-Bold": require("./app/assets/fonts/Public_Sans/static/PublicSans-Bold.ttf"),
  });

  if (!fontsLoaded) return null;

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

      <View className="flex-col items-center justify-center w-full px-5">
        <PresentImage width={350} height={350} />
        <Text
          className="text-5xl text-[#212842] text-center mt-5"
          style={{ fontFamily: "Newsreader-Italic" }}
        >
          The silence of a shared{"\n"}story
        </Text>
      </View>

      <View className="flex-col items-center justify-center w-full px-5 mt-10">
        <Text
          className="text-xl text-[#5C5E69] text-center"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          A quiet archive for your thoughts,{"\n"}curated for the intentional
          reader.
        </Text>
      </View>

      <TouchableOpacity className="w-full bg-[#212842] rounded-full py-3 mt-10">
        <View className="flex-col items-center justify-center w-full my-3">
          <Text
            className="text-[#FFFFFF] text-center text-2xl"
            style={{ fontFamily: "PublicSans-Bold" }}
          >
            Open First Chapter
          </Text>
        </View>
      </TouchableOpacity>

      <View className="flex-col items-center justify-center w-full mt-10">
        <Text
          className="text-xl text-[#5C5E69] text-center"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Already have an account?{" "}
          <Text
            className="text-[#212842]"
            style={{ fontFamily: "PublicSans-Bold" }}
            onPress={() => console.log("Navigate to Login")}
          >
            Login
          </Text>
        </Text>
      </View>
      

    </SafeAreaView>
  );
}
