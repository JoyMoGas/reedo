import { useEffect } from 'react';
import '../global.css';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';

import { useAuthStore } from '../store/useAuthStore';
import { ActivityIndicator, View, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

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
  const { isAuthenticated, isLoading: isAuthLoading, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Load all custom fonts dynamically from app/assets/fonts for global app availability
  const [fontsLoaded, fontError] = useFonts({
    'Newsreader-Regular': require('./assets/fonts/Newsreader/static/Newsreader_36pt-Regular.ttf'),
    'Newsreader-Bold': require('./assets/fonts/Newsreader/static/Newsreader_14pt-Bold.ttf'),
    'Newsreader-Italic': require('./assets/fonts/Newsreader/static/Newsreader_36pt-Italic.ttf'),
    'PublicSans-Regular': require('./assets/fonts/Public_Sans/static/PublicSans-Regular.ttf'),
    'PublicSans-Bold': require('./assets/fonts/Public_Sans/static/PublicSans-Bold.ttf'),
  });

  useEffect(() => {
    checkSession();
  }, []);

  // Hide the splash screen when both fonts and session state are resolved
  useEffect(() => {
    if ((fontsLoaded || fontError) && !isAuthLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isAuthLoading]);

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
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading, fontsLoaded, segments, navigationState?.key]);

  // While loading initial fonts or authenticating, keep showing the loading state
  if (!fontsLoaded || isAuthLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#10b981" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
