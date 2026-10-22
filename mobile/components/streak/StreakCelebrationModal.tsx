/**
 * @project Reedo
 * @module StreakCelebrationModal
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-16
 * @description Highly polished, animated celebratory modal triggered when a reading streak is activated or extended.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Share,
  Platform,
} from "react-native";
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Polygon,
  Rect,
} from "react-native-svg";
import { useStreakStore } from "../../store/useStreakStore";
import Icon from "../../core/Icon";
import { useRouter } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PARTICLES_COUNT = 16;
const PARTICLE_COLORS = [
  "#F59E0B", // Amber
  "#FF5A36", // Reedo Orange
  "#FCD34D", // Gold
  "#F43F5E", // Rose
  "#60A5FA", // Ink Blue
  "#34D399", // Emerald
  "#FDE68A", // Cream Yellow
];

interface ParticleData {
  id: number;
  color: string;
  size: number;
  shape: "circle" | "star" | "diamond";
  angle: number; // in radians
  distance: number; // travel radius
  delay: number;
}

export default function StreakCelebrationModal() {
  const router = useRouter();
  const { isCelebrationOpen, setCelebrationOpen, data } = useStreakStore();

  const currentStreak = data?.current_streak ?? 1;

  // Master animations
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.7)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const sunburstSpinAnim = useRef(new Animated.Value(0)).current;
  const flamePulseAnim = useRef(new Animated.Value(1)).current;
  const flameGlowAnim = useRef(new Animated.Value(0.8)).current;
  const badgeBounceAnim = useRef(new Animated.Value(0)).current;

  // Particles animation values
  const particlesAnim = useRef(
    Array.from({ length: PARTICLES_COUNT }, () => new Animated.Value(0))
  ).current;

  // Generate deterministic particle specs
  const particles = useRef<ParticleData[]>(
    Array.from({ length: PARTICLES_COUNT }, (_, i) => {
      const angle = (i / PARTICLES_COUNT) * 2 * Math.PI + (Math.sin(i * 99) * 0.3);
      return {
        id: i,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 6 + (i % 5) * 2.5,
        shape: i % 3 === 0 ? "star" : i % 3 === 1 ? "diamond" : "circle",
        angle,
        distance: 90 + ((i * 37) % 65),
        delay: (i * 45) % 350,
      };
    })
  ).current;

  // Next milestone calculation
  const getNextMilestone = (streak: number) => {
    if (streak < 3) return { target: 3, name: "First Sparks" };
    if (streak < 7) return { target: 7, name: "Week of Focus" };
    if (streak < 10) return { target: 10, name: "Scribe's Persistence" };
    if (streak < 30) return { target: 30, name: "Midnight Scholar" };
    if (streak < 100) return { target: 100, name: "Centurion Reader" };
    return { target: 365, name: "The Eternal Reader" };
  };

  const nextMilestone = getNextMilestone(currentStreak);
  const remainingDays = Math.max(1, nextMilestone.target - currentStreak);
  const progressRatio = Math.min(
    1,
    Math.max(0.1, currentStreak / nextMilestone.target)
  );

  useEffect(() => {
    if (isCelebrationOpen) {
      // 1. Reset all values
      backdropAnim.setValue(0);
      cardScaleAnim.setValue(0.7);
      cardOpacityAnim.setValue(0);
      sunburstSpinAnim.setValue(0);
      flamePulseAnim.setValue(1);
      flameGlowAnim.setValue(0.7);
      badgeBounceAnim.setValue(0);
      particlesAnim.forEach((p) => p.setValue(0));

      // 2. Entrance sequence
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(cardScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(badgeBounceAnim, {
          toValue: 1,
          delay: 200,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Continuous Sunburst Rotation
      const sunburstLoop = Animated.loop(
        Animated.timing(sunburstSpinAnim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      sunburstLoop.start();

      // 4. Living Flame Dance / Pulse
      const flameLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flamePulseAnim, {
            toValue: 1.08,
            duration: 750,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(flamePulseAnim, {
            toValue: 0.96,
            duration: 700,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      flameLoop.start();

      // 5. Flame Glow Breathe
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(flameGlowAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(flameGlowAnim, {
            toValue: 0.65,
            duration: 900,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();

      // 6. Particle burst with stagger & continuous loop
      const triggerParticles = () => {
        particlesAnim.forEach((anim, idx) => {
          anim.setValue(0);
          Animated.sequence([
            Animated.delay(particles[idx].delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1300 + (idx % 4) * 150,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished && isCelebrationOpen) {
              // gently re-loop single particle
              anim.setValue(0);
              Animated.timing(anim, {
                toValue: 1,
                duration: 1400 + (idx % 3) * 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }).start();
            }
          });
        });
      };
      triggerParticles();

      return () => {
        sunburstLoop.stop();
        flameLoop.stop();
        glowLoop.stop();
      };
    }
  }, [isCelebrationOpen]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardScaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCelebrationOpen(false);
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🔥 I just achieved a ${currentStreak}-day reading streak on Reedo! The ink still flows. Join me in archiving thoughts and classic literature! 📖✨`,
      });
    } catch (e) {
      // User cancelled share
    }
  };

  const handleViewStreakHub = () => {
    handleClose();
    setTimeout(() => {
      router.push('/streak' as any);
    }, 250);
  };

  if (!isCelebrationOpen) return null;

  const spinInterpolate = sunburstSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      visible={isCelebrationOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Celebratory Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: cardOpacityAnim,
              transform: [{ scale: cardScaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
            accessibilityLabel="Close celebration"
          >
            <Icon name="cancel" size={18} color="#A8AAB2" />
          </TouchableOpacity>

          {/* SVG Visual Stage: Sunburst Rays, Flame, Floating Particles */}
          <View style={styles.svgStage}>
            {/* 1. Rotating Sunburst Rays */}
            <Animated.View
              style={[
                styles.sunburstContainer,
                { transform: [{ rotate: spinInterpolate }] },
              ]}
              pointerEvents="none"
            >
              <Svg width={280} height={280} viewBox="0 0 280 280">
                <Defs>
                  <RadialGradient id="rayGrad" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                    <Stop offset="50%" stopColor="#EA580C" stopOpacity="0.25" />
                    <Stop offset="100%" stopColor="#D97706" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <G origin="140, 140">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const rot = (i * 360) / 16;
                    return (
                      <Polygon
                        key={i}
                        points="140,140 132,15 148,15"
                        fill="url(#rayGrad)"
                        transform={`rotate(${rot} 140 140)`}
                      />
                    );
                  })}
                </G>
              </Svg>
            </Animated.View>

            {/* 2. Floating Sparks & Confetti Particles */}
            {particles.map((p, idx) => {
              const anim = particlesAnim[idx];
              const cos = Math.cos(p.angle);
              const sin = Math.sin(p.angle);

              const translateX = anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, cos * p.distance],
              });
              const translateY = anim.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0, sin * p.distance * 0.7 - 10, sin * p.distance - 20],
              });
              const scale = anim.interpolate({
                inputRange: [0, 0.2, 0.7, 1],
                outputRange: [0, 1.2, 0.9, 0],
              });
              const opacity = anim.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 1, 0.8, 0],
              });

              return (
                <Animated.View
                  key={p.id}
                  style={[
                    styles.particleWrapper,
                    {
                      transform: [{ translateX }, { translateY }, { scale }],
                      opacity,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Svg width={p.size} height={p.size} viewBox="0 0 24 24">
                    {p.shape === "circle" ? (
                      <Circle cx="12" cy="12" r="10" fill={p.color} />
                    ) : p.shape === "diamond" ? (
                      <Polygon points="12,2 22,12 12,22 2,12" fill={p.color} />
                    ) : (
                      // Star shape
                      <Path
                        d="M12 2L15 9L22 9L16.5 13.5L18.5 21L12 16.5L5.5 21L7.5 13.5L2 9L9 9Z"
                        fill={p.color}
                      />
                    )}
                  </Svg>
                </Animated.View>
              );
            })}

            {/* 3. Glowing Ambient Disc Behind Flame */}
            <Animated.View
              style={[
                styles.glowDisc,
                {
                  opacity: flameGlowAnim,
                  transform: [{ scale: flameGlowAnim }],
                },
              ]}
              pointerEvents="none"
            >
              <Svg width={180} height={180} viewBox="0 0 180 180">
                <Defs>
                  <RadialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FF7A00" stopOpacity="0.6" />
                    <Stop offset="40%" stopColor="#EA580C" stopOpacity="0.3" />
                    <Stop offset="100%" stopColor="#FF4500" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="90" cy="90" r="90" fill="url(#coreGlow)" />
              </Svg>
            </Animated.View>

            {/* 4. Living Dancing Flame SVG with Open Book Pedestal */}
            <Animated.View
              style={[
                styles.flameContainer,
                {
                  transform: [
                    { scale: flamePulseAnim },
                    {
                      scaleY: flamePulseAnim.interpolate({
                        inputRange: [0.96, 1.08],
                        outputRange: [0.95, 1.05],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Svg width={120} height={130} viewBox="0 0 120 130">
                <Defs>
                  {/* Outer Flame Gradient */}
                  <LinearGradient id="outerFlame" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0%" stopColor="#DC2626" />
                    <Stop offset="45%" stopColor="#FF5A36" />
                    <Stop offset="100%" stopColor="#F59E0B" />
                  </LinearGradient>
                  {/* Core Flame Gradient */}
                  <LinearGradient id="innerFlame" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0%" stopColor="#F59E0B" />
                    <Stop offset="60%" stopColor="#FDE047" />
                    <Stop offset="100%" stopColor="#FFFFFF" />
                  </LinearGradient>
                  {/* Open Book Stand Gradient */}
                  <LinearGradient id="bookPedestal" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#1E293B" />
                    <Stop offset="50%" stopColor="#334155" />
                    <Stop offset="100%" stopColor="#1E293B" />
                  </LinearGradient>
                </Defs>

                {/* Outer Flame Body */}
                <Path
                  d="M60 4C60 4 78 28 80 48C81 58 76 66 76 72C76 78 81 83 82 89C84 100 75 110 60 110C45 110 36 100 38 89C39 83 44 78 44 72C44 66 39 58 40 48C42 28 60 4 60 4Z"
                  fill="url(#outerFlame)"
                />

                {/* Left Flutter Flare */}
                <Path
                  d="M48 65C48 65 34 76 34 90C34 101 42 108 52 109C44 103 42 94 45 86C47 80 52 74 48 65Z"
                  fill="#FF3815"
                  opacity={0.85}
                />

                {/* Right Flutter Flare */}
                <Path
                  d="M72 65C72 65 86 76 86 90C86 101 78 108 68 109C76 103 78 94 75 86C73 80 68 74 72 65Z"
                  fill="#F97316"
                  opacity={0.85}
                />

                {/* Inner White-Gold Hot Core */}
                <Path
                  d="M60 42C60 42 70 58 70 72C70 82 66 88 66 93C66 98 69 101 68 104C67 107 64 109 60 109C56 109 53 107 52 104C51 101 54 98 54 93C54 88 50 82 50 72C50 58 60 42 60 42Z"
                  fill="url(#innerFlame)"
                />

                {/* Open Book Pedestal symbolizing the reading ritual */}
                <Path
                  d="M32 114C42 110 52 112 60 115C68 112 78 110 88 114C90 115 90 118 87 119C77 122 67 121 60 118C53 121 43 122 33 119C30 118 30 115 32 114Z"
                  fill="url(#bookPedestal)"
                />
                <Path
                  d="M60 115V122"
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
          </View>

          {/* Glowing Streak Pill Badge */}
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                transform: [
                  {
                    scale: badgeBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.badgePill}>
              <Icon name="fireSolid" size={18} color="#FF5A36" />
              <Text style={styles.badgeText}>
                {currentStreak} {currentStreak === 1 ? "DAY" : "DAYS"} STREAK!
              </Text>
            </View>
          </Animated.View>

          {/* Celebratory Typography (Strictly English) */}
          <Text style={styles.headline}>The Ink Still Flows!</Text>
          <Text style={styles.subheadline}>
            You’ve honored your reading ritual for today. Another page turned in your literary journey.
          </Text>

          {/* Next Milestone Card */}
          <View style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <View style={styles.milestoneTitleRow}>
                <Icon name="stars" size={16} color="#F59E0B" />
                <Text style={styles.milestoneTitle}>
                  Next Milestone: {nextMilestone.name}
                </Text>
              </View>
              <Text style={styles.milestoneTarget}>
                {currentStreak}/{nextMilestone.target}
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(progressRatio * 100)}%` },
                ]}
              />
            </View>

            <Text style={styles.milestoneRemaining}>
              {remainingDays === 1
                ? "Only 1 day left to claim your next insignia!"
                : `${remainingDays} days remaining to claim your next insignia.`}
            </Text>
          </View>

          {/* Action CTAs */}
          <View style={styles.actionsContainer}>
            {/* Primary Action: Keep Reading / Continue */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Icon name="bookOpen" size={18} color="#0F172A" />
              <Text style={styles.primaryBtnText}>Keep The Momentum</Text>
            </TouchableOpacity>

            {/* View Full Streak Hub */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleViewStreakHub}
              activeOpacity={0.8}
            >
              <Icon name="fireSolid" size={16} color="#FF5A36" />
              <Text style={styles.secondaryBtnText}>View Streak Details</Text>
            </TouchableOpacity>

            {/* Share Achievement */}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 8 }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Icon name="share" size={16} color="#A8AAB2" />
              <Text style={[styles.secondaryBtnText, { color: "#A8AAB2" }]}>Share Achievement</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 14, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#16171F",
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(245, 158, 11, 0.35)",
    ...Platform.select({
      ios: {
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  closeBtn: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  svgStage: {
    width: 220,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: -8,
  },
  sunburstContainer: {
    position: "absolute",
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  particleWrapper: {
    position: "absolute",
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glowDisc: {
    position: "absolute",
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  flameContainer: {
    width: 120,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  badgeContainer: {
    marginTop: 10,
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 90, 54, 0.16)",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 90, 54, 0.4)",
    gap: 6,
  },
  badgeText: {
    color: "#FF7A59",
    fontSize: 12,
    fontFamily: "PublicSans-Bold",
    letterSpacing: 1.2,
  },
  headline: {
    color: "#FFF8F0",
    fontSize: 28,
    fontFamily: "Newsreader-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subheadline: {
    color: "#A8AAB2",
    fontSize: 13,
    fontFamily: "PublicSans-Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  milestoneCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 22,
  },
  milestoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  milestoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  milestoneTitle: {
    color: "#F3F0E6",
    fontSize: 12,
    fontFamily: "PublicSans-Bold",
  },
  milestoneTarget: {
    color: "#F59E0B",
    fontSize: 12,
    fontFamily: "PublicSans-Bold",
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  milestoneRemaining: {
    color: "#7E8291",
    fontSize: 11,
    fontFamily: "PublicSans-Regular",
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#F59E0B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryBtnText: {
    color: "#0F172A",
    fontSize: 14,
    fontFamily: "PublicSans-Bold",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  secondaryBtnText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontFamily: "PublicSans-Regular",
  },
});
