/**
 * @project Reedo
 * @module _layout
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import { useEffect, useState } from 'react';
import '../global.css';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';

import { useAuthStore } from '../store/useAuthStore';
import { useWebSocketStore } from '../store/useWebSocketStore';
import { ActivityIndicator, View, LogBox, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Logo from './assets/LOGO.svg';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../store/queryClient';

// Suppress all React Native and Expo development warnings on-screen
LogBox.ignoreAllLogs();

// Intercept and filter out known library-level terminal warning dumps in development
if (__DEV__) {
  const ignoredPatterns = [
    "Can't perform a React state update on a component that hasn't mounted yet",
    "Can't perform a React state update on an unmounted component",
    "Require cycle:",
  ];

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    if (ignoredPatterns.some(pattern => message.includes(pattern))) return;
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
    if (ignoredPatterns.some(pattern => message.includes(pattern))) return;
    originalError(...args);
  };
}

// Keep the splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading: isAuthLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const [isNavigationResolved, setIsNavigationResolved] = useState(false);

  // Load all custom fonts dynamically from app/assets/fonts for global app availability
  const [fontsLoaded, fontError] = useFonts({
    'Newsreader-Regular': require('./assets/fonts/Newsreader/static/Newsreader_36pt-Regular.ttf'),
    'Newsreader-Bold': require('./assets/fonts/Newsreader/static/Newsreader_14pt-Bold.ttf'),
    'Newsreader-Italic': require('./assets/fonts/Newsreader/static/Newsreader_36pt-Italic.ttf'),
    'PublicSans-Regular': require('./assets/fonts/Public_Sans/static/PublicSans-Regular.ttf'),
    'PublicSans-Bold': require('./assets/fonts/Public_Sans/static/PublicSans-Bold.ttf'),
    'PublicSans-Italic': require('./assets/fonts/Public_Sans/static/PublicSans-Italic.ttf'),
  });

  const checkSession = useAuthStore((state) => state.checkSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const connectWs = useWebSocketStore((state) => state.connect);
  const disconnectWs = useWebSocketStore((state) => state.disconnect);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connectWs();
    } else {
      disconnectWs();
    }
  }, [isAuthenticated]);

  // Hide the native splash screen as soon as fonts are loaded so our custom React-based splash screen is revealed
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Wait until both fonts and authentication state are loaded,
    // and the Expo Router navigation tree is fully initialized.
    if (!fontsLoaded || isAuthLoading || !navigationState?.key) return;

    const inAuthGroup = segments.some((segment) => segment.includes('(auth)'));
    const isAtWelcome = !segments[0] || segments[0] === 'index';

    const timer = setTimeout(() => {
      if (!isAuthenticated && !inAuthGroup && !isAtWelcome) {
        // Redirect unauthenticated users trying to access protected screens back to Welcome
        router.replace('/');
      } else if (isAuthenticated && (inAuthGroup || isAtWelcome)) {
        // Redirect authenticated users trying to access login/signup/welcome screens to the home screen
        router.replace('/(tabs)/home');
      } else {
        // Already on the correct screen, resolve navigation to hide splash screen
        setIsNavigationResolved(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading, fontsLoaded, segments, navigationState?.key]);

  // While loading fonts/session or waiting for navigation to redirect, show the splash screen
  if (!isNavigationResolved) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FFF8F0]">
        <View className="flex-col items-center justify-center">
          <Logo width={80} height={80} />
          <Text
            className="text-[30px] text-[#212842] text-center mt-3"
            style={{ fontFamily: fontsLoaded ? "Newsreader-Bold" : "System" }}
          >
            REEDO
          </Text>
        </View>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="PostReview" options={{ presentation: 'modal' }} />
        <Stack.Screen name="NewShelf" options={{ presentation: 'modal' }} />
        <Stack.Screen name="NewEcho" options={{ presentation: 'modal' }} />
        <Stack.Screen name="TagBook" options={{ presentation: 'modal' }} />
        <Stack.Screen name="ReaderProfile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="FriendJourneyModal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="Notifications" />
        <Stack.Screen name="CommentsModal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="RateMasterpiece" options={{ presentation: 'modal' }} />
        <Stack.Screen name="AddActionSheet" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
