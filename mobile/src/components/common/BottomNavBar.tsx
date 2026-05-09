import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, FileText, Truck, BarChart2, Settings } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '/' },
  { key: 'bills', label: 'Bills', icon: FileText, path: '/bills' },
  { key: 'trucks', label: 'Trucks', icon: Truck, path: '/trucks' },
  { key: 'reports', label: 'Reports', icon: BarChart2, path: '/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
] as const;

export function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const getActiveKey = (): string => {
    if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports';
    if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings';
    if (pathname.startsWith('/bills')) return 'bills';
    if (pathname.startsWith('/trucks')) return 'trucks';
    return 'home';
  };

  const activeKey = getActiveKey();

  return (
    <View
      testID="bottom-nav-bar"
      style={{
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingBottom: insets.bottom,
        height: 60 + insets.bottom,
        elevation: 10,
      }}
    >
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeKey === tab.key;
        return (
          <Pressable
            key={tab.key}
            testID={`bottom-nav-${tab.key}`}
            onPress={() => {
              if (!isActive) {
                router.navigate(tab.path as any);
              }
            }}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon size={22} color={isActive ? Colors.primary : Colors.textSecond} />
            <Text
              style={{
                fontSize: 10,
                fontWeight: isActive ? '700' : '400',
                color: isActive ? Colors.primary : Colors.textSecond,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
