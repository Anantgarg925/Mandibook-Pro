import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLaunch } from '@/context/LaunchContext';
import { Plus, Search, Bell, Truck, ChevronRight } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import { SplashScreenView } from '@/components/SplashScreenView';
import { LaunchView } from '@/components/LaunchView';
import { AdminPinView } from '@/components/AdminPinView';

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.danger,
};

const STATUS_BG: Record<string, string> = {
  PENDING: '#FFF3E0',
  CONFIRMED: '#E8F5E9',
  CANCELLED: '#FFEBEE',
  UDHAARI: '#FFEBEE',
};

function MetricCard({
  label,
  labelHindi,
  value,
  sub,
  amber,
}: {
  label: string;
  labelHindi?: string;
  value: string;
  sub?: string;
  amber?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: amber ? '#FFF8E1' : Colors.surface,
        borderRadius: Radius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: amber ? Colors.warning : Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text
        style={{
          fontSize: FontSize.xs,
          color: amber ? Colors.warning : Colors.textSecond,
          marginBottom: 2,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: Platform.OS === 'android' ? 0 : 0.4,
        }}
      >
        {label}
      </Text>
      {labelHindi ? (
        <Text
          style={{
            fontSize: 10,
            color: amber ? Colors.warning : Colors.textSecond,
            marginBottom: 6,
            opacity: 0.7,
          }}
        >
          {labelHindi}
        </Text>
      ) : (
        <View style={{ marginBottom: 6 }} />
      )}
      <Text
        style={{
          fontSize: FontSize.xl,
          fontWeight: '700',
          color: amber ? Colors.warning : Colors.text,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={{
            fontSize: FontSize.xs,
            color: amber ? Colors.warning : Colors.textSecond,
            marginTop: 2,
          }}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function TruckCard({ truck, onPress }: { truck: any; onPress: () => void }) {
  const totalKg: number = truck.gradeInventory.reduce(
    (s: number, g: any) => s + g.totalKg,
    0
  );
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F1F8F1' : Colors.surface,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      })}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: Radius.sm,
              backgroundColor: '#E8F5E9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Truck size={18} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: FontSize.sm,
                fontWeight: '700',
                color: Colors.text,
              }}
              numberOfLines={1}
            >
              {truck.truckNumber}
            </Text>
            <Text
              style={{ fontSize: FontSize.xs, color: Colors.textSecond }}
              numberOfLines={1}
            >
              {truck.senderName}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.primary }}>
            {Math.round((availableKg / 1000) * 10) / 10} t
          </Text>
          <Text style={{ fontSize: 10, color: Colors.textSecond }}>Available</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View>
        <View
          style={{
            height: 6,
            backgroundColor: '#f1f5f9',
            borderRadius: Radius.round,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 6,
              width: `${soldPct}%`,
              backgroundColor: Colors.primary,
              borderRadius: Radius.round,
            }}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: Colors.textSecond }}>Sold Inventory</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.text }}>{soldPct}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function BillRow({ item, onPress }: { item: Inquiry; onPress: () => void }) {
  const initials = getInitials(item.customerName);
  return (
    <Pressable
      testID={`bill-row-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        backgroundColor: pressed ? Colors.background : Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: Spacing.sm,
      })}
    >
      {/* Avatar */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary }}>
          {initials}
        </Text>
      </View>

      {/* Center */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}
          numberOfLines={1}
        >
          {item.customerName}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
          Grade: {item.grade} {'\u2022'} Qty: {item.sacks} bags
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
              fontWeight: '700',
              color: STATUS_COLOR[item.status] ?? Colors.textSecond,
            }}
          >
            {item.status}
          </Text>
        </View>
        {item.netAmount > 0 ? (
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.text }}>
            {toIndianCurrency(item.netAmount)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale, opacity]);

  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: '#EF4444',
          opacity,
          transform: [{ scale }],
        }}
      />
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#EF4444',
        }}
      />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { launchComplete, setLaunchComplete } = useLaunch();
  const { shop, loading: shopLoading } = useShop();
  const { inquiries, pending, confirmed, loading: billsLoading } = useInquiries();
  const { trucks } = useTodayTrucks();
  const [search, setSearch] = useState('');
  const [splashGone, setSplashGone] = useState(launchComplete);
  const [minTimeElapsed, setMinTimeElapsed] = useState(launchComplete);
  const [launchVisible, setLaunchVisible] = useState(false);
  const [launchGone, setLaunchGone] = useState(launchComplete);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinGone, setPinGone] = useState(true);

  useEffect(() => {
    if (launchComplete) return;
    const timer = setTimeout(() => setMinTimeElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const todaySale = confirmed.reduce((s, i) => s + i.grossAmount, 0);
  const totalStock = trucks.reduce(
    (sum, t) =>
      sum +
      t.gradeInventory.reduce(
        (s: number, g: any) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg),
        0
      ),
    0
  );

  const initials =
    shop?.firmName
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() ?? '';

  const filteredBills = search
    ? inquiries.filter(
        (i) =>
          i.customerName.toLowerCase().includes(search.toLowerCase()) ||
          i.slipNumber.toString().includes(search)
      )
    : inquiries.slice(0, 30);

  const visibleTrucks = trucks.slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <FlatList
        testID="home-feed"
        data={filteredBills}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <BillRow item={item} onPress={() => router.push(`/bills/${item.id}`)} />
        )}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Header ── */}
            <View
              style={{
                backgroundColor: Colors.surface,
                paddingHorizontal: Spacing.md,
                paddingTop: Spacing.sm,
                paddingBottom: Spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(232,245,233,0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: FontSize.sm,
                        fontWeight: '700',
                        color: Colors.primary,
                      }}
                    >
                      {initials}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        fontSize: FontSize.md,
                        fontWeight: '700',
                        color: Colors.text,
                      }}
                    >
                      {shop?.firmName ?? ''}
                    </Text>
                    <Text
                      style={{
                        fontSize: FontSize.xs,
                        color: Colors.textSecond,
                        textTransform: 'uppercase',
                        letterSpacing: Platform.OS === 'android' ? 0 : 0.5,
                      }}
                    >
                      {toIndianDate(Date.now())} {'\u2022'} ADMIN
                    </Text>
                  </View>
                </View>

                {/* Right: notifications */}
                <Pressable
                  testID="notifications-nav-btn"
                  onPress={() => router.push('/notifications' as any)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: Colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bell size={18} color={Colors.textSecond} />
                </Pressable>
              </View>
            </View>

            {/* ── Metric cards (2x2 grid) ── */}
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
              <View style={{ flexDirection: 'row', marginBottom: Spacing.sm }}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <MetricCard
                    label="Today's Total Sale"
                    labelHindi="आज की बिक्री"
                    value={toIndianCurrency(todaySale)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Confirmed Bills"
                    value={String(confirmed.length)}
                    sub="bills confirmed"
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <MetricCard
                    label="Pending Auth"
                    value={String(pending.length)}
                    sub="awaiting"
                    amber
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MetricCard
                    label="Stock Remaining"
                    value={`${Math.round((totalStock / 1000) * 10) / 10} t`}
                    sub={`${trucks.length} trucks`}
                  />
                </View>
              </View>
            </View>

            {/* ── Search bar ── */}
            <View
              style={{
                marginHorizontal: Spacing.md,
                marginTop: Spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.surface,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.sm,
                paddingVertical: Spacing.xs,
                borderWidth: 1,
                borderColor: Colors.border,
                gap: Spacing.xs,
              }}
            >
              <Search size={16} color={Colors.textSecond} />
              <TextInput
                testID="home-search"
                placeholder="Search bills or buyer name..."
                placeholderTextColor={Colors.textSecond}
                value={search}
                onChangeText={setSearch}
                style={{
                  flex: 1,
                  fontSize: FontSize.sm,
                  color: Colors.text,
                  paddingVertical: 6,
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                }}
              />
            </View>

            {/* ── Today's Trucks (vertical cards) ── */}
            {trucks.length > 0 ? (
              <View style={{ marginTop: Spacing.md }}>
                {/* Section header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: Spacing.md,
                    marginBottom: Spacing.sm,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: FontSize.md,
                        fontWeight: '700',
                        color: Colors.text,
                      }}
                    >
                      Today's Trucks
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
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
                        fontSize: FontSize.xs,
                        color: Colors.primary,
                        fontWeight: '700',
                      }}
                    >
                      View All
                    </Text>
                    <ChevronRight size={14} color={Colors.primary} />
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
                      marginHorizontal: Spacing.md,
                      marginBottom: Spacing.sm,
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
              </View>
            ) : null}

            {/* ── Live Bill Feed header ── */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.md,
                marginTop: Spacing.md,
                marginBottom: Spacing.xs,
              }}
            >
              <View>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
                  Live Bill Feed
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
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
                      color: Colors.primary,
                      fontWeight: '700',
                    }}
                  >
                    Buyers
                  </Text>
                  <ChevronRight size={14} color={Colors.primary} />
                </Pressable>
                <PulseDot />
              </View>
            </View>

            {billsLoading ? (
              <ActivityIndicator
                testID="bills-loading"
                color={Colors.primary}
                style={{ marginVertical: Spacing.lg }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          billsLoading ? null : (
            <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📋</Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                आज कोई बिल नहीं
              </Text>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />

      {/* FAB */}
      <Pressable
        testID="new-bill-fab"
        onPress={() => router.push('/bills/new')}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
          paddingVertical: 14,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radius.round,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 100,
        })}
      >
        <Plus size={18} color="#FFF" strokeWidth={3} />
        <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>नया बिल</Text>
      </Pressable>

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
          onHide={() => setLaunchGone(true)}
          onAdminPress={() => {
            setPinGone(false);
            setPinVisible(true);
          }}
          onMemberPress={() => {
            setLaunchGone(true);
            setLaunchComplete(true);
            router.push('/authorization' as any);
          }}
        />
      ) : null}

      {!pinGone ? (
        <AdminPinView
          visible={pinVisible}
          correctPin={shop?.adminPin ?? ''}
          onHide={() => setPinGone(true)}
          onSuccess={() => {
            setLaunchGone(true);
            setLaunchComplete(true);
            setPinVisible(false);
          }}
          onCancel={() => setPinVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
