/**
 * @project Reedo
 * @module EchoSkeleton
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-11-01
 */
import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

interface EchoSkeletonProps {
  count?: number;
}

export default function EchoSkeleton({ count = 3 }: EchoSkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View className="flex-col w-full">
      {Array.from({ length: count }).map((_, idx) => {
        const showBookCard = idx % 2 === 0;
        return (
          <View
            key={idx}
            className="py-5 border-b border-[#EAE2D5] flex-col"
          >
            {/* User Info Row */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#E8DFC8",
                  }}
                />
                <View className="flex-row items-center gap-2 flex-1">
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      width: 110,
                      height: 15,
                      borderRadius: 4,
                      backgroundColor: "#E8DFC8",
                    }}
                  />
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      width: 68,
                      height: 12,
                      borderRadius: 4,
                      backgroundColor: "#EFE8DA",
                    }}
                  />
                </View>
              </View>
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: "#EFE8DA",
                }}
              />
            </View>

            {/* Echo Content Lines */}
            <View className="mt-3.5 mb-4 gap-2">
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: "96%",
                  height: 14,
                  borderRadius: 4,
                  backgroundColor: "#E8DFC8",
                }}
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: "84%",
                  height: 14,
                  borderRadius: 4,
                  backgroundColor: "#E8DFC8",
                }}
              />
              {idx % 2 === 1 && (
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    width: "58%",
                    height: 14,
                    borderRadius: 4,
                    backgroundColor: "#EFE8DA",
                  }}
                />
              )}
            </View>

            {/* Tagged Book Card Skeleton */}
            {showBookCard && (
              <View className="bg-[#F5EEDF] border border-[#EBE7DF] rounded-xl p-3 flex-row items-center mb-4">
                <Animated.View
                  style={{
                    opacity: pulseAnim,
                    width: 42,
                    height: 64,
                    borderRadius: 4,
                    backgroundColor: "#E2D9C5",
                  }}
                />
                <View className="flex-1 ml-3.5 justify-center gap-1.5">
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      width: 72,
                      height: 10,
                      borderRadius: 3,
                      backgroundColor: "#E8DFC8",
                    }}
                  />
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      width: "75%",
                      height: 14,
                      borderRadius: 4,
                      backgroundColor: "#E2D9C5",
                    }}
                  />
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      width: "48%",
                      height: 11,
                      borderRadius: 4,
                      backgroundColor: "#E8DFC8",
                    }}
                  />
                </View>
              </View>
            )}

            {/* Interaction Bar Skeleton */}
            <View className="flex-row items-center gap-6 mt-1">
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 44,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#E8DFC8",
                }}
              />
              <Animated.View
                style={{
                  opacity: pulseAnim,
                  width: 44,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#E8DFC8",
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

