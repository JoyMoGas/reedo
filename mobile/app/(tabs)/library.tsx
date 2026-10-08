import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUIStore } from "../../store/useUIStore";
import LibraryShelves from "../../components/library/LibraryShelves";
import LibraryProgress from "../../components/library/LibraryProgress";
import LibraryHonors from "../../components/library/LibraryHonors";

type TabOption = "Shelves" | "Progress" | "Honors";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const setNavbarVisible = useUIStore((state) => state.setNavbarVisible);
  const [activeTab, setActiveTab] = useState<TabOption>("Shelves");

  useEffect(() => {
    setNavbarVisible(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF8F0', paddingTop: insets.top + 60 }}>
      {/* Top Tabs */}
      <View className="flex-row items-center px-6 mt-4 mb-2">
        {(["Shelves", "Progress", "Honors"] as TabOption[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="mr-6 pb-2"
              style={{
                borderBottomWidth: isActive ? 2 : 0,
                borderBottomColor: "#212842",
              }}
            >
              <Text
                className={`text-sm ${isActive ? "text-[#212842]" : "text-[#8E8B82]"}`}
                style={{ fontFamily: isActive ? "PublicSans-Bold" : "PublicSans-Regular" }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {activeTab === "Shelves" && <LibraryShelves />}
        {activeTab === "Progress" && <LibraryProgress />}
        {activeTab === "Honors" && <LibraryHonors />}
      </View>
    </View>
  );
}
