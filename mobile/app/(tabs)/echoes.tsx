import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";

export default function EchoesScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);

  useEffect(() => {
    setNavbarVisible(true);
  }, []);

  return (
    <SafeAreaView 
      edges={["left", "right"]} 
      className="flex-1 bg-[#FFF8F0] px-6"
      style={{ paddingTop: insets.top + 60, paddingBottom: insets.bottom + 86, justifyContent: "center", alignItems: "center" }}
    >
      <View className="flex-col items-center justify-center w-full px-5">
        <Text
          className="text-4xl text-[#212842] text-center"
          style={{ fontFamily: "Newsreader-Bold" }}
        >
          Echoes
        </Text>
        
        <Text
          className="text-xl text-[#5C5E69] text-center mt-5 leading-relaxed"
          style={{ fontFamily: "PublicSans-Regular" }}
        >
          Resonances of thoughts. Read, share, and reflect upon notes and reviews posted by other curators.
        </Text>
      </View>
    </SafeAreaView>
  );
}
