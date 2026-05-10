import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/lib/useColorScheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ShopProvider } from '@/context/ShopContext';
import { LaunchProvider } from '@/context/LaunchContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
        <Stack.Screen name="authorization" options={{ headerShown: false }} />
        <Stack.Screen name="buyers" options={{ headerShown: false }} />
        <Stack.Screen name="buyers/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-grades" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-charges" options={{ headerShown: false }} />
        <Stack.Screen name="settings/edit-firm" options={{ headerShown: false }} />
        <Stack.Screen name="settings/team" options={{ headerShown: false }} />
        <Stack.Screen name="settings/change-pin" options={{ headerShown: false }} />
        <Stack.Screen name="trucks/edit-grades" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}



export default function RootLayout() {
  const colorScheme = useColorScheme();
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <LaunchProvider>
              <ShopProvider>
                <StatusBar style="light" />
                <RootLayoutNav colorScheme={colorScheme} />
              </ShopProvider>
            </LaunchProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}