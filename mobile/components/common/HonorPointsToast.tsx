/**
 * @project Reedo
 * @module HonorPointsToast
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-25
 * @description Elegant floating banner notification that auto-dismisses after awarding Honor Points.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHonorToastStore } from "../../store/useHonorToastStore";
import Icon from "../../core/Icon";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HonorPointsToast() {
  const insets = useSafeAreaInsets();
  const { visible, points, title, message, hideToast } = useHonorToastStore();

  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 10,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -160,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.92,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, insets.top]);

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={hideToast}
        style={styles.card}
      >
        {/* Glow / Medallion Accent */}
        <View style={styles.badgeWrap}>
          <Icon name="medalStarFilled" size={26} color="#212842" />
        </View>

        <View style={styles.textCol}>
          {points > 0 ? (
            <View style={styles.pointsRow}>
              <Text style={styles.pointsText}>+{points} HONOR POINTS</Text>
              <Icon name="stars" size={13} color="#F5DEB3" />
            </View>
          ) : null}
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {message ? (
            <Text style={styles.messageText} numberOfLines={1}>
              {message}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity onPress={hideToast} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="cancel" size={16} color="rgba(255, 248, 240, 0.45)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#212842",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "rgba(245, 222, 179, 0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 14,
  },
  badgeWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F5DEB3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#F5DEB3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  pointsText: {
    fontFamily: "PublicSans-Bold",
    fontSize: 11,
    color: "#F5DEB3",
    letterSpacing: 1.2,
  },
  titleText: {
    fontFamily: "Newsreader-Bold",
    fontSize: 17,
    color: "#FFF8F0",
    lineHeight: 20,
  },
  messageText: {
    fontFamily: "PublicSans-Regular",
    fontSize: 12,
    color: "rgba(255, 248, 240, 0.75)",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 8,
  },
});
