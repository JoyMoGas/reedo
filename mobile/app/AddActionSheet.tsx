import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Pressable, PanResponder } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "../core/Icon";

const { height } = Dimensions.get("window");

export default function AddActionSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 0 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          close();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: false, // Spring with PanResponder often requires non-native driver
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const close = (onCloseComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
      if (onCloseComplete) {
        setTimeout(onCloseComplete, 100);
      }
    });
  };

  const actions = [
    {
      id: "reflection",
      title: "Share a reflection",
      description: "Draft a nuanced thought or quote from your latest read.",
      icon: "fileEdit",
      onPress: () => close(() => router.push("/NewEcho")),
    },
    {
      id: "inscribe",
      title: "Inscribe a new book",
      description: "Find a title and add it to your currently reading or shelves.",
      icon: "bookSearch",
      onPress: () => close(() => router.push("/(tabs)/discover")),
    },
    {
      id: "rate",
      title: "Rate a masterpiece",
      description: "Assign stars and leave a review for a book you've finished.",
      icon: "starOutline",
      onPress: () => close(() => router.push("/RateMasterpiece")),
    },
    {
      id: "curate",
      title: "Curate a collection",
      description: "Organize thematic gathers or create a new shelf for your volumes.",
      icon: "officeShelf",
      onPress: () => close(() => router.push("/NewShelf")),
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)", opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>LIBRARY ACTIONS</Text>
          <Text style={styles.title}>Expand the Archive</Text>

          <View style={styles.actionList}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                activeOpacity={0.7}
                onPress={action.onPress}
              >
                <View style={styles.iconContainer}>
                  <Icon name={action.icon} size={24} color="#5C5E69" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </View>
                <Icon name="chevronRight" size={20} color="#EBE7DF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#EBE7DF",
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: "PublicSans-Bold",
    color: "#8E8B82",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Newsreader-Bold",
    color: "#212842",
    marginBottom: 24,
  },
  actionList: {
    gap: 24,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontFamily: "Newsreader-Bold",
    color: "#212842",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: "PublicSans-Regular",
    color: "#8E8B82",
    lineHeight: 20,
  },
});
