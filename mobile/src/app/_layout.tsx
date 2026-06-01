import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider, dehydrate, hydrate, onlineManager } from '@tanstack/react-query';
import { Platform, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider as RNKeyboardProvider } from 'react-native-keyboard-controller';
import { Storage as AsyncStorage } from '@/lib/offlineDB';
import NetInfo from '@react-native-community/netinfo';

// KeyboardProvider crashes silently on web — use a passthrough wrapper
function KeyboardProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS === 'web') return <>{children}</>;
  return <RNKeyboardProvider>{children}</RNKeyboardProvider>;
}
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { ShopProvider } from '@/context/ShopContext';
import { LaunchProvider, useLaunch } from '@/context/LaunchContext';
import { BillNotificationProvider } from '@/context/BillNotificationContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import OfflineBanner from '@/components/common/OfflineBanner';
import PWAInstallBanner from '@/components/common/PWAInstallBanner';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import React, { type ComponentType, useEffect, useState } from 'react';
import { Colors } from '@/lib/theme';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Analytics } from '@vercel/analytics/react';
import { patchAlertForWeb } from '@/utils/alertPolyfill';

// Patch Alert.alert for web — must run before any component renders
patchAlertForWeb();

(Text as any).defaultProps = {
  ...((Text as any).defaultProps ?? {}),
  maxFontSizeMultiplier: 1.12,
};
(TextInput as any).defaultProps = {
  ...((TextInput as any).defaultProps ?? {}),
  maxFontSizeMultiplier: 1.12,
};

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => { });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once on failure to prevent long loading hangs in low internet
      staleTime: 1000 * 60 * 5, // Keep cached data fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // Retain in cache for 24 hours to support offline hydration
      refetchOnWindowFocus: false, // Avoid refetching when focusing app
      refetchOnReconnect: 'always', // Auto-refetch when internet reconnects
    },
  },
});

// Configure React Query to use NetInfo for accurate online/offline detection
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!(state.isConnected && state.isInternetReachable !== false));
  });
});

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="trucks/register" options={{ headerShown: false }} />
        <Stack.Screen name="trucks/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="bills/new" options={{ headerShown: false }} />
        <Stack.Screen name="bills/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="slip/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="member-login" options={{ headerShown: false }} />
        <Stack.Screen name="access-choice" options={{ headerShown: false }} />
        <Stack.Screen name="admin-login" options={{ headerShown: false }} />
        <Stack.Screen name="firm-password" options={{ headerShown: false }} />
        <Stack.Screen name="member-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="member-trucks" options={{ headerShown: false }} />
        <Stack.Screen name="member-profile" options={{ headerShown: false }} />
        <Stack.Screen name="authorization" options={{ headerShown: false }} />
        <Stack.Screen name="buyers/index" options={{ headerShown: false }} />
        <Stack.Screen name="buyers/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-grades" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-charges" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-firm" options={{ headerShown: false }} />
        <Stack.Screen name="settings/team" options={{ headerShown: false }} />
        <Stack.Screen name="settings/change-pin" options={{ headerShown: false }} />
        <Stack.Screen name="owner/subscriptions" options={{ headerShown: false }} />
        <Stack.Screen name="trucks/edit-grades" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

function PersistentNavigationShell({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const pathname = usePathname();
  const { launchComplete, sessionHydrated } = useLaunch();
  const hideBottomNav =
    !sessionHydrated ||
    !launchComplete ||
    pathname === '/onboarding' ||
    pathname === '/member-login' ||
    pathname === '/access-choice' ||
    pathname === '/admin-login' ||
    pathname === '/owner/subscriptions' ||
    pathname === '/+not-found' ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/owner') ||
    (pathname.startsWith('/bills/') && pathname !== '/bills/new') ||
    pathname.startsWith('/slip/') ||
    pathname.startsWith('/authorization') ||
    pathname.startsWith('/buyers/') ||
    pathname.startsWith('/trucks/');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flex: 1 }}>
        <RootLayoutNav colorScheme={colorScheme} />
      </View>
      {hideBottomNav ? null : <BottomNavBar />}
    </View>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Register Service Worker for PWA
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }
  }, []);

  const [cacheHydrated, setCacheHydrated] = useState(false);

  // 1. Hydrate cache from AsyncStorage on startup
  useEffect(() => {
    async function loadCache() {
      try {
        const cachedString = await AsyncStorage.getItem('MANDIBOOK_QUERY_CACHE');
        if (cachedString) {
          const dehydratedState = JSON.parse(cachedString);
          hydrate(queryClient, dehydratedState);
        }
      } catch (error) {
        console.error('Error hydrating query cache:', error);
      } finally {
        setCacheHydrated(true);
      }
    }
    loadCache();
  }, []);

  // 2. Hide Splash screen only when both fonts and query cache are loaded
  useEffect(() => {
    if (!fontsLoaded || !cacheHydrated) return;
    SplashScreen.hideAsync().catch(() => { });
  }, [fontsLoaded, cacheHydrated]);

  // 3. Dehydrate and save cache on updates (with 1s debounce)
  useEffect(() => {
    if (!cacheHydrated) return;

    let saveTimeout: any;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Save cache on query success or updates
      if (event.type === 'updated' && event.action.type === 'success') {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          try {
            const dehydratedState = dehydrate(queryClient, {
              shouldDehydrateQuery: (query) => {
                // Only dehydrate successful queries that have data
                return query.state.status === 'success';
              },
            });
            await AsyncStorage.setItem('MANDIBOOK_QUERY_CACHE', JSON.stringify(dehydratedState));
          } catch (error) {
            console.error('Error saving query cache:', error);
          }
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(saveTimeout);
    };
  }, [cacheHydrated]);

  let FirstRunTutorialSafe: ComponentType | null = null;
  try {
    const tutorialModule = require('@/components/tutorial/FirstRunTutorial');
    if (typeof tutorialModule?.FirstRunTutorial === 'function') {
      FirstRunTutorialSafe = tutorialModule.FirstRunTutorial as ComponentType;
    }
  } catch {
    FirstRunTutorialSafe = null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#F0F4F0' }}>
          <SafeAreaProvider initialMetrics={Platform.OS === 'web' ? undefined : initialWindowMetrics}>
            <KeyboardProvider>
              <LaunchProvider>
                <ShopProvider>
                  <BillNotificationProvider>
                    <StatusBar style="dark" backgroundColor={Colors.background} translucent={false} />
                    <PWAInstallBanner />
                    <OfflineBanner />
                    <SubscriptionGate>
                      <PersistentNavigationShell colorScheme={colorScheme} />
                    </SubscriptionGate>
                    {FirstRunTutorialSafe ? <FirstRunTutorialSafe /> : null}
                    {Platform.OS === 'web' ? <Analytics /> : null}
                  </BillNotificationProvider>
                </ShopProvider>
              </LaunchProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
