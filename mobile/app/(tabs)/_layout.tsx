import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs, useRouter } from "expo-router";
import { Header } from "../../components/Header";
import Icon from "../../core/Icon";
import { useUIStore } from "../../store/useUIStore";

const getTabBarIcon = (routeName: string, isFocused: boolean): string => {
  switch (routeName) {
    case "home":
      return isFocused ? "home" : "homeOutline";
    case "discover":
      return isFocused ? "compass" : "compassOutline";
    case "add":
      return isFocused ? "plus" : "gridAddOutline";
    case "library":
      return isFocused ? "library" : "libraryOutline";
    case "echoes":
      return isFocused ? "chats" : "chat";
    default:
      return "star";
  }
};

function CustomTabBar({ state, descriptors, navigation, animValue }: { state: any; descriptors: any; navigation: any; animValue: Animated.Value }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [150, 0],
  });

  return (
    <Animated.View 
      style={[
        styles.tabBarContainer, 
        { 
          paddingBottom: Math.max(insets.bottom, 16), 
          paddingTop: 14,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          transform: [{ translateY: tabBarTranslateY }]
        }
      ]}
      className="bg-[#FFF8F0] border-t border-[#EBE7DF]"
    >
      <View className="flex-row justify-around items-center w-full px-2">
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            if (route.name === "add") {
              router.push("/AddActionSheet");
              return;
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const displayLabel = typeof label === "string" ? label : route.name;
          const iconName = getTabBarIcon(route.name, isFocused);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.8}
            >
              <Icon 
                name={iconName}
                size={32}
                color={isFocused ? "#212842" : "#8E8B82"}
              />
              
              
              
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isNavbarVisible = useUIStore((state) => state.isNavbarVisible);
  const animValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isNavbarVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isNavbarVisible]);

  const headerTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-(insets.top + 70), 0],
  });

  return (
    <View className="flex-1 bg-[#FFF8F0]">
      {/* Background container for the status bar (to prevent content from showing behind it on iOS/translucent screens) */}
      {insets.top > 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: "#FFF8F0",
            zIndex: 11,
          }}
        />
      )}

      <View style={StyleSheet.absoluteFill}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} animValue={animValue} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
            }}
          />
          <Tabs.Screen
            name="discover"
            options={{
              title: "Discover",
            }}
          />
          <Tabs.Screen
            name="add"
            options={{
              title: "Add",
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: "Library",
            }}
          />
          <Tabs.Screen
            name="echoes"
            options={{
              title: "Echoes",
            }}
          />
        </Tabs>
      </View>

      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <Header />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#212842",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 14,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  activeDotPlaceholder: {
    width: 5,
    height: 5,
    backgroundColor: "transparent",
  },
});
