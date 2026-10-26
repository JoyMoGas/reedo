/**
 * @project Reedo
 * @module SyncStatusBanner
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-10-25
 * @description Subtle, elegant floating status pill indicating when mutations are saved locally
 * during backend sleep/inactivity and confirming when synchronization completes.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncQueueStore } from '../../store/useSyncQueueStore';
import Icon from '../../core/Icon';

export default function SyncStatusBanner() {
  const insets = useSafeAreaInsets();
  const { queue, isSyncing, isServerSleeping, lastSyncCompletedAt, wakeUpAndSync } =
    useSyncQueueStore();

  const [showSyncedSuccess, setShowSyncedSuccess] = useState(false);

  // Animated values
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spin animation for the loading/waking indicator
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isSyncing || (isServerSleeping && queue.length > 0)) {
      spinAnim.setValue(0);
      loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
    } else {
      spinAnim.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isSyncing, isServerSleeping, queue.length]);

  // Handle transient success flash when queue is drained
  useEffect(() => {
    if (
      queue.length === 0 &&
      lastSyncCompletedAt &&
      Date.now() - lastSyncCompletedAt < 3500
    ) {
      setShowSyncedSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncedSuccess(false);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [queue.length, lastSyncCompletedAt]);

  const isVisible = queue.length > 0 || isServerSleeping || showSyncedSuccess;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 6,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, insets.top]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });


  return (
    <Animated.View
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => wakeUpAndSync()}
        style={[
          styles.pill,
          showSyncedSuccess ? styles.pillSuccess : styles.pillPending,
        ]}
      >
        {showSyncedSuccess ? (
          <View style={styles.iconWrapSuccess}>
            <Icon name="sealCheck" size={14} color="#FFF8F0" />
          </View>
        ) : (
          <Animated.View
            style={[
              styles.iconWrapPending,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Icon name="sandClock" size={13} color="#F5DEB3" />
          </Animated.View>
        )}

        <View style={styles.textWrap}>
          {showSyncedSuccess ? (
            <Text style={styles.successTitle}>All changes synced with server</Text>
          ) : isServerSleeping ? (
            <Text style={styles.pendingTitle}>
              Server warming up • {queue.length} change{queue.length === 1 ? '' : 's'} saved locally
            </Text>
          ) : isSyncing ? (
            <Text style={styles.pendingTitle}>
              Syncing {queue.length} offline change{queue.length === 1 ? '' : 's'}...
            </Text>
          ) : (
            <Text style={styles.pendingTitle}>
              {queue.length} change{queue.length === 1 ? '' : 's'} queued locally
            </Text>
          )}
        </View>

        {!showSyncedSuccess && (
          <View style={styles.statusDot} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99998,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 8,
  },
  pillPending: {
    backgroundColor: '#212842',
    borderWidth: 1,
    borderColor: 'rgba(245, 222, 179, 0.4)',
  },
  pillSuccess: {
    backgroundColor: '#305C3D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconWrapPending: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSuccess: {
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 11,
    color: '#FFF8F0',
    letterSpacing: 0.2,
  },
  successTitle: {
    fontFamily: 'PublicSans-Bold',
    fontSize: 11,
    color: '#FFF8F0',
    letterSpacing: 0.2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E4A834',
    marginLeft: 9,
  },
});
