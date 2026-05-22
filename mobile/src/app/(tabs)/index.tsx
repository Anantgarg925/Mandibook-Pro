import { type ReactNode, useEffect, useRef, useState, memo, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Animated,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLaunch } from '@/context/LaunchContext';
import { Bell, Plus, Search, Settings, Truck, ChevronRight, LogOut } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import { SplashScreenView } from '@/components/SplashScreenView';
import { LaunchView } from '@/components/LaunchView';
import { AdminPinView } from '@/components/AdminPinView';
import { DraggableFAB } from '@/components/common/DraggableFAB';
import { useBillNotifications } from '@/context/BillNotificationContext';
import { useResponsive } from '@/hooks/useResponsive';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { mapShop, supabase } from '@/lib/supabase';
import { resetToRoute } from '@/utils/navigation';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#604100',
  CONFIRMED: '#0C5216',
  CANCELLED: Colors.danger,
};

const STATUS_BG: Record<string, string> = {
  PENDING: '#FFDEAC',
  CONFIRMED: '#ACF4A4',
  CANCELLED: '#FFEBEE',
  UDHAARI: '#FFEBEE',
};

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

function SectionCard({ children }: { children: ReactNode }) {
  const { contentHPad } = useResponsive();
  return (
    <View
      style={{
        marginHorizontal: contentHPad,
        marginTop: Spacing.md,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: Spacing.md,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

function MetricCard({
  label,
  value,
  sub,
  amber,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  amber?: boolean;
  onPress?: () => void;
}) {
  const { isSmall } = useResponsive();
  const content = (
    <>
      <Text
        style={{
          fontSize: FontSize.sm,
          color: amber ? UI.secondary : UI.muted,
          marginBottom: Spacing.sm,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.7}
        style={{
          fontSize: FontSize.xl,
          fontWeight: '800',
          color: amber ? UI.secondary : UI.text,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={{
            fontSize: FontSize.xs,
            color: amber ? UI.secondary : UI.muted,
            marginTop: 2,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </>
  );

  const cardStyle = {
    flex: 1,
    minHeight: isSmall ? 92 : 104,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: isSmall ? Spacing.sm : Spacing.md,
    borderWidth: 1,
    borderColor: amber ? '#FFBA38' : '#E5E7EB',
    justifyContent: 'center',
    overflow: 'hidden',
  } as const;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { flex: 1 },
          pressed && { opacity: 0.86, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={cardStyle}>{content}</View>
      </Pressable>
    );
  }

  return (
    <View style={cardStyle}>{content}</View>
  );
}

const TruckCard = memo(function TruckCard({ truck, onPress }: { truck: any; onPress: () => void }) {
  const totalKg: number = truck.totalKg;
  const confirmedKg: number = truck.gradeInventory.reduce(
    (s: number, g: any) => s + g.confirmedKg,
    0
  );
  const provisionalKg: number = truck.gradeInventory.reduce(
    (s: number, g: any) => s + g.provisionalKg,
    0
  );
  const availableKg = Math.max(0, totalKg - confirmedKg - provisionalKg);
  const soldPct = totalKg > 0 ? Math.round(((confirmedKg + provisionalKg) / totalKg) * 100) : 0;

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View style={{
          backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
          borderRadius: 14,
          padding: Spacing.md,
          marginBottom: Spacing.sm,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
        }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: Radius.lg,
                  backgroundColor: UI.surfaceHigh,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck size={24} color={UI.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: FontSize.md,
                    fontWeight: '800',
                    color: UI.text,
                  }}
                  numberOfLines={1}
                >
                  {truck.truckNumber}
                </Text>
                <Text
                  style={{ fontSize: FontSize.sm, color: UI.muted, marginTop: 2 }}
                  numberOfLines={1}
                >
                  Sender: {truck.senderName}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: UI.text }}>
                {Math.round(availableKg).toLocaleString('en-IN')} kg
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: UI.muted }}>Available</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: 10, color: UI.muted, fontWeight: '800' }}>SOLD INVENTORY</Text>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: UI.muted }}>{soldPct}%</Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: UI.surfaceLow,
                borderRadius: Radius.round,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 8,
                  width: `${soldPct}%`,
                  backgroundColor: UI.primary,
                  borderRadius: Radius.round,
                }}
              />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
});

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const BillRow = memo(function BillRow({
  item,
  onPress,
}: {
  item: Inquiry;
  onPress: () => void;
}) {
  const initials = getInitials(item.customerName);
  return (
    <Pressable
      testID={`bill-row-${item.id}`}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.sm,
          backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 14,
          overflow: 'hidden',
          gap: Spacing.sm,
        }}>
          {/* Avatar */}
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: Radius.lg,
              backgroundColor: UI.surfaceHigh,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: UI.primary }}>
              {initials}
            </Text>
          </View>

          {/* Center */}
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: FontSize.sm, fontWeight: '800', color: UI.text }}
              numberOfLines={1}
            >
              {item.customerName}
            </Text>
            <Text
              style={{ fontSize: FontSize.xs, color: UI.muted, marginTop: 2 }}
              numberOfLines={1}
            >
              Grade: {item.gradeName || item.grade} {'\u2022'} Qty: {Math.round(item.totalWeight || item.sacks)}kg
            </Text>
          </View>

          {/* Right */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: Radius.round,
                backgroundColor: STATUS_BG[item.status] ?? '#F5F5F5',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: STATUS_COLOR[item.status] ?? Colors.textSecond,
                }}
              >
                {item.status === 'CONFIRMED' ? 'PAID' : item.status}
              </Text>
            </View>
            {item.netAmount > 0 ? (
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: UI.text }}>
                {toIndianCurrency(item.netAmount)}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
});

function StaticIndicator() {
  // ✅ Static indicator instead of infinite animation loop
  return (
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' }} />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { access } = useLocalSearchParams<{ access?: string }>();
  const insets = useSafeAreaInsets();
  const { contentHPad, isSmall } = useResponsive();
  const { launchComplete, setLaunchComplete } = useLaunch();
  const { shop, loading: shopLoading, cacheShop } = useShop();
  const { unreadCount } = useBillNotifications();
  const { inquiries, pending, confirmed, loading: billsLoading } = useInquiries();
  const { trucks } = useTodayTrucks();
  const [search, setSearch] = useState('');
  const [splashGone, setSplashGone] = useState(launchComplete);
  const [minTimeElapsed, setMinTimeElapsed] = useState(launchComplete);
  const [launchVisible, setLaunchVisible] = useState(false);
  const [launchGone, setLaunchGone] = useState(launchComplete);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinGone, setPinGone] = useState(true);
  const previousLaunchComplete = useRef(launchComplete);

  const openBill = (bill: Inquiry) => {
    if (bill.status === 'CONFIRMED') {
      router.push(`/slip/${bill.id}` as any);
      return;
    }
    if (bill.status === 'PENDING') {
      router.push({ pathname: '/authorization', params: { id: bill.id } } as any);
      return;
    }
    router.push(`/bills/${bill.id}` as any);
  };

  const logoutAdmin = async () => {
    await AsyncStorage.removeItem(APP_SESSION_KEY);
    await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
    setLaunchComplete(false);
    resetToRoute(router, '/(tabs)' as any);
  };

  useEffect(() => {
    if (launchComplete) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, [launchComplete]);

  useEffect(() => {
    if (previousLaunchComplete.current && !launchComplete) {
      setSplashGone(true);
      setMinTimeElapsed(true);
      setLaunchVisible(true);
      setLaunchGone(false);
      setPinVisible(false);
      setPinGone(true);
    }
    previousLaunchComplete.current = launchComplete;
  }, [launchComplete]);

  useEffect(() => {
    if (access !== 'choose' || !shop || launchComplete) return;
    setLaunchComplete(false);
    setSplashGone(true);
    setMinTimeElapsed(true);
    setPinVisible(false);
    setPinGone(true);
    setLaunchVisible(true);
    setLaunchGone(false);
  }, [access, launchComplete, shop, setLaunchComplete]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pinVisible) {
        setPinVisible(false);
        setLaunchVisible(true);
        setLaunchGone(false);
        setLaunchComplete(false);
        return true;
      }
      if (!launchComplete && launchVisible) {
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [launchComplete, launchVisible, pinVisible, setLaunchComplete]);

  const todaySale = useMemo(() => confirmed.reduce((s, i) => s + i.grossAmount, 0), [confirmed]);
  const totalStock = useMemo(() => trucks.reduce(
    (sum, t) => {
      const soldKg = t.gradeInventory.reduce(
        (s: number, g: any) => s + g.confirmedKg + g.provisionalKg,
        0
      );
      return sum + Math.max(0, t.totalKg - soldKg);
    },
    0
  ), [trucks]);

  const initials = useMemo(() =>
    shop?.firmName
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() ?? '',
    [shop?.firmName]
  );

  const filteredBills = useMemo(() =>
    search
      ? inquiries.filter(
        (i) =>
          i.customerName.toLowerCase().includes(search.toLowerCase()) ||
          i.slipNumber.toString().includes(search)
      )
      : inquiries.slice(0, 30),
    [inquiries, search]
  );

  const visibleTrucks = useMemo(() => trucks.slice(0, 3), [trucks]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: UI.background }} edges={['top', 'left', 'right']}>
      <FlatList
        testID="home-feed"
        data={[]}
        keyExtractor={(_, index) => String(index)}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
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
                  justifyContent: 'space-between',
                }}
              >
                {/* Left: avatar + firm info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                  <View
                    style={{
                      width: isSmall ? 42 : 48,
                      height: isSmall ? 42 : 48,
                      borderRadius: isSmall ? 21 : 24,
                      backgroundColor: '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FontSize.sm,
                        fontWeight: '800',
                        color: UI.primary,
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: isSmall ? FontSize.md : FontSize.lg,
                        fontWeight: '800',
                        color: '#FFFFFF',
                      }}
                    >
                      {shop?.firmName ?? ''}
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
                      {toIndianDate(getCurrentBusinessDate().getTime())} {'\u2022'} ADMIN
                    </Text>
                  </View>
                </View>

                {/* Right actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    testID="notifications-nav-btn"
                    onPress={() => router.push('/notifications' as any)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bell size={23} color="#FFFFFF" />
                    {unreadCount > 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 5,
                          right: 5,
                          minWidth: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: '#D92D20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    testID="settings-nav-btn"
                    onPress={() => router.push('/settings' as any)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Settings size={24} color="#FFFFFF" />
                  </Pressable>
                  <Pressable
                    testID="admin-dashboard-logout-btn"
                    onPress={logoutAdmin}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <LogOut size={21} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>

            <SectionCard>
              {/* ── Search bar ── */}
              <View
                style={{
                  marginBottom: Spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: Radius.md,
                  paddingHorizontal: Spacing.md,
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  gap: Spacing.sm,
                }}
              >
                <Search size={20} color={UI.muted} />
                <TextInput
                  testID="home-search"
                  placeholder="Search bills or customers..."
                  placeholderTextColor={UI.muted}
                  value={search}
                  onChangeText={setSearch}
                  style={{
                    flex: 1,
                    fontSize: FontSize.md,
                    color: Colors.text,
                    paddingVertical: 6,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  }}
                />
              </View>

              {/* ── Metric cards (2x2 grid) ── */}
              <View style={{ flexDirection: 'row', marginBottom: Spacing.sm, gap: isSmall ? 6 : Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Today's Total Sale"
                    value={toIndianCurrency(todaySale)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Confirmed Bills"
                    value={String(confirmed.length)}
                    onPress={() => router.push({
                      pathname: '/(tabs)/bills',
                      params: { filter: 'CONFIRMED' },
                    } as any)}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: isSmall ? 6 : Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Pending Auth"
                    value={String(pending.length)}
                    amber
                    onPress={() => router.push('/authorization' as any)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Stock Remaining"
                    value={`${Math.round(totalStock).toLocaleString('en-IN')} kg`}
                  />
                </View>
              </View>

            </SectionCard>

            {/* ── Today's Trucks (vertical cards) ── */}
            {trucks.length > 0 ? (
              <SectionCard>
                {/* Section header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: Spacing.md,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: FontSize.lg,
                        fontWeight: '800',
                        color: UI.text,
                      }}
                    >
                      Today's Trucks
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: UI.muted }}>
                      आज की गाड़ियाँ
                    </Text>
                  </View>
                  <Pressable
                    testID="view-all-trucks"
                    onPress={() => router.push('/(tabs)/trucks' as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  >
                    <Text
                      style={{
                        fontSize: FontSize.sm,
                        color: UI.primary,
                        fontWeight: '800',
                      }}
                    >
                      View All
                    </Text>
                    <ChevronRight size={14} color={UI.primary} />
                  </Pressable>
                </View>

                {/* Vertical truck cards */}
                {visibleTrucks.map((t) => (
                  <TruckCard
                    key={t.id}
                    truck={t}
                    onPress={() => router.push(`/trucks/${t.id}` as any)}
                  />
                ))}

                {trucks.length > 3 ? (
                  <Pressable
                    onPress={() => router.push('/(tabs)/trucks' as any)}
                    style={{
                      paddingVertical: Spacing.sm,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FontSize.xs,
                        color: Colors.primary,
                        fontWeight: '700',
                      }}
                    >
                      + {trucks.length - 3} more trucks — View All
                    </Text>
                  </Pressable>
                ) : null}
              </SectionCard>
            ) : null}

            {/* ── Live Bill Feed header ── */}
            <SectionCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: Spacing.md,
                }}
              >
                <View>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: UI.text }}>
                    Live Bill Feed
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: UI.muted }}>
                    लाइव बिल
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Pressable
                    testID="buyers-nav-btn"
                    onPress={() => router.push('/buyers' as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                  >
                    <Text
                      style={{
                        fontSize: FontSize.xs,
                        color: UI.primary,
                        fontWeight: '700',
                      }}
                    >
                      Buyers
                    </Text>
                    <ChevronRight size={14} color={UI.primary} />
                  </Pressable>
                  <StaticIndicator />
                </View>
              </View>

              {billsLoading ? (
                <ActivityIndicator
                  testID="bills-loading"
                  color={Colors.primary}
                  style={{ marginVertical: Spacing.lg }}
                />
              ) : filteredBills.length > 0 ? (
                filteredBills.map((item) => (
                  <BillRow
                    key={item.id}
                    item={item}
                    onPress={() => openBill(item)}
                  />
                ))
              ) : (
                <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                    आज कोई बिल नहीं
                  </Text>
                </View>
              )}
            </SectionCard>
          </View>
        }
        ListFooterComponent={<View style={{ height: 96 + insets.bottom }} />}
      />

      {launchComplete && shop ? (
        <DraggableFAB
          testID="new-bill-fab"
          onPress={() => router.push('/bills/new' as any)}
          initialBottom={8}
          initialRight={16}
        >
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: UI.primary,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderRadius: 30,
            gap: Spacing.sm,
          }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' }}>New Bill</Text>
              <Text style={{ color: '#DFF4FF', fontSize: 10, fontWeight: '600' }}>नया बिल</Text>
            </View>
          </View>
        </DraggableFAB>
      ) : null}

      {!splashGone && (
        <SplashScreenView
          visible={shopLoading || !minTimeElapsed}
          onHide={() => {
            setSplashGone(true);
            if (shop) {
              setTimeout(() => setLaunchVisible(true), 0);
            } else {
              router.replace('/onboarding');
            }
          }}
        />
      )}

      {!launchGone && launchVisible ? (
        <LaunchView
          visible={launchVisible}
          shopName={shop?.firmName ?? ''}
          shopCity={shop?.city ?? ''}
          onHide={() => setLaunchGone(true)}
          onAdminPress={() => {
            setLaunchGone(true);
            // If shop is cached locally, use PIN verification
            // Otherwise, navigate to admin login to find shop
            if (shop?.shopId) {
              setPinGone(false);
              setPinVisible(true);
            } else {
              router.push('/admin-login' as any);
            }
          }}
          onMemberPress={() => {
            setLaunchGone(true);
            router.push('/member-login' as any);
          }}
        />
      ) : null}

      {!pinGone ? (
        <AdminPinView
          visible={pinVisible}
          onVerifyPin={async (pin) => {
            if (!shop?.phone1) return false;
            const { data, error } = await supabase.rpc('verify_member_login', {
              p_phone: shop.phone1.replace(/\D/g, ''),
              p_pin: pin,
            });
            if (error || !data) return false;
            const payload = data as {
              shop?: Record<string, unknown>;
              member?: { id?: string; name?: string; phone?: string; role?: string };
              is_admin?: boolean;
              session_token?: string;
            };
            if (payload.is_admin !== true || !payload.shop || !payload.session_token) return false;
            await cacheShop(mapShop(payload.shop));
            await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
            await AsyncStorage.setItem(APP_SESSION_KEY, JSON.stringify({
              id: payload.member?.id ?? 'admin-member',
              name: payload.member?.name ?? shop.ownerName,
              phone: payload.member?.phone ?? shop.phone1,
              role: payload.member?.role ?? 'ADMIN',
              sessionToken: payload.session_token,
            }));
            return true;
          }}
          onHide={() => setPinGone(true)}
          onSuccess={() => {
            setLaunchGone(true);
            setLaunchComplete(true);
            setPinVisible(false);
          }}
          onCancel={() => {
            setPinVisible(false);
            setLaunchVisible(true);
            setLaunchGone(false);
            setLaunchComplete(false);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}
