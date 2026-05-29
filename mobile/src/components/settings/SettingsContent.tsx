import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Building2,
  Star,
  Banknote,
  Users,
  RefreshCw,
  Download,
  LogOut,
  TriangleAlert,
  ChevronRight,
  ArrowLeft,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useLaunch } from '@/context/LaunchContext';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY, IMPERSONATION_KEY } from '@/lib/session';
import { resetToRoute } from '@/utils/navigation';

const UI = {
  background: '#F3FAFF',
  border: '#C0C9BB',
  borderSoft: '#E2E8F0',
  text: '#071E27',
  muted: '#64748B',
  primary: '#00450D',
  primarySoft: '#ACF4A4',
  surfaceLow: '#E6F6FF',
  surfaceHigh: '#CFE6F2',
  secondary: '#7E5700',
} as const;

const OWNER_CONSOLE_ENABLED = process.env.EXPO_PUBLIC_OWNER_CONSOLE_ENABLED === 'true';

type SettingsItem = {
  icon: React.FC<{ size: number; color: string }>;
  label: string;
  subtitle: string;
  onPress: () => void;
  actionLabel?: string;
  danger?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  dangerIcon?: boolean;
};

function Section({ title, items }: { title: string; items: SettingsItem[] }) {
  const { contentHPad } = useResponsive();
  return (
    <View style={{ marginBottom: Spacing.xl }}>
      <Text
        style={{
          fontSize: FontSize.sm,
          fontWeight: '800',
          color: UI.muted,
          paddingHorizontal: Spacing.md,
          paddingVertical: 8,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 4,
          marginLeft: contentHPad,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
          marginHorizontal: contentHPad,
        }}
      >
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.label}
              testID={`settings-${item.label.toLowerCase().replace(/[\s/]+/g, '-')}`}
              onPress={item.onPress}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.md,
                paddingHorizontal: Spacing.lg,
                paddingVertical: 16,
                backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                borderBottomColor: '#E5E7EB',
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: item.dangerIcon ? '#FFEBEE' : UI.surfaceHigh,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={22} color={item.dangerIcon ? Colors.danger : UI.primary} />
              </View>
              
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text
                  style={{
                    fontSize: FontSize.md,
                    fontWeight: '800',
                    color: item.danger ? Colors.danger : UI.text,
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: FontSize.sm,
                    color: UI.muted,
                    fontWeight: '500',
                  }}
                >
                  {item.subtitle}
                </Text>
              </View>

              {item.showBadge ? (
                <View
                  style={{
                    backgroundColor: '#FFEBEE',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: Colors.danger, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                    {item.badgeText}
                  </Text>
                </View>
              ) : null}

              {item.actionLabel ? (
                <Pressable
                  testID={`settings-${item.label.toLowerCase().replace(/[\s/]+/g, '-')}-action`}
                  onPress={item.onPress}
                  style={({ pressed }) => ({
                    minWidth: 70,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: Radius.round,
                    backgroundColor: item.danger
                      ? pressed ? '#F9D6DA' : '#FFEBEE'
                      : pressed ? UI.surfaceLow : UI.surfaceHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Text
                    style={{
                      fontSize: FontSize.xs,
                      fontWeight: '800',
                      color: item.danger ? Colors.danger : UI.primary,
                      letterSpacing: 0.5,
                    }}
                  >
                    {item.actionLabel}
                  </Text>
                </Pressable>
              ) : null}

              {!item.actionLabel && (
                <ChevronRight size={20} color={item.danger ? Colors.danger : '#D1D5DB'} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsContent() {
  const router = useRouter();
  const { setLaunchComplete } = useLaunch();
  const { contentHPad } = useResponsive();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleResetToday = () => {
    setShowResetModal(true);
  };

  const handleAdminLogout = async () => {
    const wasImpersonating = await AsyncStorage.getItem(IMPERSONATION_KEY);
    await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
    await AsyncStorage.removeItem(APP_SESSION_KEY);
    await AsyncStorage.removeItem(IMPERSONATION_KEY);
    setLaunchComplete(false);
    if (wasImpersonating === 'true') {
      resetToRoute(router, { pathname: '/owner/subscriptions' } as any);
    } else {
      resetToRoute(router, { pathname: '/', params: { access: 'choose' } } as any);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.background }} edges={['top']}>
      {/* ── Header ── */}
      <View
        style={{
          backgroundColor: UI.primary,
          paddingHorizontal: contentHPad,
          paddingVertical: 14,
          borderBottomWidth: 0,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Pressable 
            onPress={() => router.back()} 
            style={({ pressed }) => ({ 
              marginRight: Spacing.sm, 
              padding: 8,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SettingsIcon color={UI.primary} size={22} />
            </View>
            <Pressable
              onLongPress={() => {
                if (OWNER_CONSOLE_ENABLED) {
                  router.push('/owner/subscriptions' as any);
                }
              }}
              delayLongPress={1200}
              style={{ flex: 1 }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: FontSize.lg,
                  fontWeight: '800',
                  color: '#FFFFFF',
                }}
              >
                Admin Panel
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: FontSize.xs,
                  color: 'rgba(255, 255, 255, 0.8)',
                  letterSpacing: 0,
                  fontWeight: '800',
                  marginTop: 3,
                }}
              >
                Manage firm & settings
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: Spacing.lg, paddingBottom: 100, maxWidth: 600, alignSelf: 'center' as const, width: '100%' }} showsVerticalScrollIndicator={false}>
        <Section
          title="FIRM / संस्था"
          items={[
            {
              icon: Building2,
              label: 'Firm Profile',
              subtitle: 'संस्था का प्रोफाइल',
              actionLabel: 'Edit',
              onPress: () => router.push('/settings/edit-firm' as any),
            },
            {
              icon: Star,
              label: 'Grades',
              subtitle: 'माल की ग्रेडिंग',
              actionLabel: 'Edit',
              onPress: () => router.push('/settings/edit-grades' as any),
            },
            {
              icon: Banknote,
              label: 'Charges',
              subtitle: 'शुल्क और खर्च',
              actionLabel: 'Edit',
              onPress: () => router.push('/settings/edit-charges' as any),
            },
          ]}
        />

        <Section
          title="TEAM / टीम"
          items={[
            {
              icon: Users,
              label: 'Team Members',
              subtitle: 'टीम के सदस्य',
              actionLabel: 'Manage',
              onPress: () => router.push('/settings/team' as any),
            },
            {
              icon: RefreshCw,
              label: 'Change PIN',
              subtitle: 'पिन बदलें',
              actionLabel: 'Change',
              onPress: () => router.push('/settings/change-pin' as any),
            },
          ]}
        />

        <Section
          title="DATA / डेटा"
          items={[
            {
              icon: Download,
              label: 'Export All',
              subtitle: 'सभी डेटा निर्यात करें',
              actionLabel: 'Export',
              onPress: () => {},
            },
            {
              icon: RefreshCw,
              dangerIcon: true,
              danger: true,
              showBadge: true,
              badgeText: 'CRITICAL',
              label: 'Reset Today',
              subtitle: 'आज का हिसाब मिटाएं',
              onPress: handleResetToday,
            },
          ]}
        />

        <Section
          title="SESSION / लॉगिन"
          items={[
            {
              icon: LogOut,
              dangerIcon: true,
              danger: true,
              label: 'Logout / Switch Panel',
              subtitle: 'Admin/member चुनने वाली स्क्रीन पर जाएं',
              actionLabel: 'Logout',
              onPress: handleAdminLogout,
            },
          ]}
        />
      </ScrollView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 30, 39, 0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: Spacing.xl,
              alignItems: 'center',
              width: '100%',
              maxWidth: 360,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 16,
            }}
          >
            <View style={{ 
              backgroundColor: '#FFEBEE', 
              width: 80, 
              height: 80, 
              borderRadius: 40, 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: Spacing.lg,
              borderWidth: 4,
              borderColor: '#FFE4E4'
            }}>
              <TriangleAlert size={40} color={Colors.danger} />
            </View>
            
            <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: UI.text, marginBottom: Spacing.sm }}>
              Reset Transactions?
            </Text>
            
            <Text style={{ fontSize: FontSize.md, color: UI.muted, textAlign: 'center', marginBottom: Spacing.md, lineHeight: 22 }}>
              This will permanently delete all entries for today. This action cannot be undone.
            </Text>
            
            <View style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: Spacing.xl, width: '100%' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.danger, textAlign: 'center' }}>
                क्या आप वाकई आज का सारा डेटा मिटाना चाहते हैं?
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', gap: Spacing.md, width: '100%' }}>
              <Pressable
                onPress={() => setShowResetModal(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: Radius.lg,
                  backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center'
                })}
              >
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: UI.muted }}>Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  Alert.alert('Done', "Today's data cleared.");
                  setShowResetModal(false);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: Radius.lg,
                  backgroundColor: pressed ? '#B71C1C' : Colors.danger,
                  alignItems: 'center',
                })}
              >
                <Text style={{ fontSize: FontSize.md, color: '#FFF', fontWeight: '800' }}>Reset All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
