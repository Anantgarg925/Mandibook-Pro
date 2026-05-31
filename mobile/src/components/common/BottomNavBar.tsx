import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Truck, FilePlus, BarChart2, User, ClipboardList, Users } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { useRouter as useExpoRouter, usePathname as useExpoPathname } from 'expo-router';
import { useMemberMode } from '@/hooks/useMemberMode';

const ADMIN_TABS = [
  { key: 'home',    labelEn: 'HOME',    labelHi: 'होम',     icon: Home,          path: '/' },
  { key: 'trucks',  labelEn: 'TRUCKS',  labelHi: 'ट्रक',     icon: Truck,         path: '/trucks' },
  { key: 'bills',   labelEn: 'BILLS',   labelHi: 'बिल',      icon: ClipboardList, path: '/bills' },
  { key: 'buyers',  labelEn: 'BUYERS',  labelHi: 'खरीदार',  icon: Users,         path: '/buyers' },
  { key: 'reports', labelEn: 'REPORTS', labelHi: 'रिपोर्ट',  icon: BarChart2,     path: '/reports' },
] as const;

const MEMBER_TABS = [
  { key: 'home', labelEn: 'HOME', labelHi: 'होम', icon: Home, path: '/member-dashboard' },
  { key: 'trucks', labelEn: 'TRUCKS', labelHi: 'ट्रक', icon: Truck, path: '/member-trucks' },
  { key: 'bills', labelEn: 'BILLS', labelHi: 'बिल', icon: ClipboardList, path: '/member-bills' },
  { key: 'profile', labelEn: 'PROFILE', labelHi: 'प्रोफाइल', icon: User, path: '/member-profile' },
] as const;

export function BottomNavBar() {
  const router = useExpoRouter();
  const pathname = useExpoPathname();
  const insets = useSafeAreaInsets();
  const isMemberMode = useMemberMode();
  const tabs = isMemberMode || pathname.startsWith('/member') ? MEMBER_TABS : ADMIN_TABS;

  const getActiveKey = (): string => {
    if (pathname === '/reports' || pathname.startsWith('/reports/')) return 'reports';
    if (pathname.startsWith('/bills') || pathname.startsWith('/member-bills')) return 'bills';
    if (pathname.startsWith('/buyers')) return 'buyers';
    if (pathname.startsWith('/member-profile')) return 'profile';
    if (pathname.startsWith('/member-trucks') || pathname.startsWith('/trucks')) return 'trucks';
    if (pathname === '/' || pathname === '/index' || pathname.startsWith('/member-dashboard')) return 'home';
    return '';
  };

  const activeKey = getActiveKey();

  return (
    <View
      testID="bottom-nav-bar"
      style={{
        flexDirection: 'row',
        backgroundColor: Colors.primary, // Green theme background
        borderTopWidth: 1,
        borderTopColor: '#0F3D18', // darker green edge
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
        justifyContent: 'space-evenly',
        alignItems: 'center',
        minHeight: 70 + insets.bottom,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      {tabs.map(tab => {
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => ({
              flex: 1,
              maxWidth: 85,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              minHeight: 56,
              borderRadius: Radius.lg,
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              opacity: pressed && !isActive ? 0.7 : 1,
            })}
          >
            <View style={{ marginBottom: 4 }}>
              <Icon size={24} color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
            </View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                textAlign: 'center',
                letterSpacing: 0,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {tab.labelEn} /
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontWeight: isActive ? '700' : '600',
                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                textAlign: 'center',
              }}
            >
              {tab.labelHi}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
