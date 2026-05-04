import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Plus, Users, BarChart2, Settings } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import type { Inquiry, InquiryStatus } from '@/types/inquiry';

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'UDHAARI';

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.danger,
};

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        padding: Spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: accent,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.text }}>{value}</Text>
      {sub ? (
        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>{sub}</Text>
      ) : null}
    </View>
  );
}

function BillRow({ item, onPress }: { item: Inquiry; onPress: () => void }) {
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
      })}
    >
      <Text
        style={{ width: 52, fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond }}
      >
        #{item.slipNumber}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
          {item.customerName}
        </Text>
        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
          {item.grade} · {item.sacks} bags
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: Radius.round,
            backgroundColor:
              item.status === 'CONFIRMED'
                ? '#E8F5E9'
                : item.status === 'PENDING'
                  ? '#FFF8E1'
                  : '#FFEBEE',
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

export default function HomeScreen() {
  const router = useRouter();
  const { shop, loading: shopLoading } = useShop();
  const { inquiries, pending, confirmed, udhaari, loading: billsLoading } = useInquiries();
  const { trucks } = useTodayTrucks();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  useEffect(() => {
    if (shopLoading) return;
    SplashScreen.hideAsync();
    if (!shop) router.replace('/onboarding');
  }, [shopLoading, shop, router]);

  if (shopLoading) {
    return (
      <View
        testID="home-loading"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}
      >
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!shop) return null;

  const todaySale = confirmed.reduce((s, i) => s + i.grossAmount, 0);
  const totalStock = trucks.reduce(
    (sum, t) =>
      sum +
      t.gradeInventory.reduce(
        (s, g) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg),
        0
      ),
    0
  );

  const filteredBills: Inquiry[] =
    activeFilter === 'ALL'
      ? inquiries
      : activeFilter === 'PENDING'
        ? pending
        : activeFilter === 'CONFIRMED'
          ? confirmed
          : udhaari;

  const FILTERS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'सभी', count: inquiries.length },
    { key: 'PENDING', label: 'Pending', count: pending.length },
    { key: 'CONFIRMED', label: 'Confirmed', count: confirmed.length },
    { key: 'UDHAARI', label: 'उधारी', count: udhaari.length },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <FlatList
        testID="home-feed"
        data={filteredBills.slice(0, 50)}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <BillRow item={item} onPress={() => router.push(`/bills/${item.id}`)} />
        )}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.md,
                paddingTop: Spacing.sm,
                paddingBottom: Spacing.xs,
              }}
            >
              <View>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
                  {shop.firmName}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                  {toIndianDate(Date.now())}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <Pressable
                  testID="reports-nav-btn"
                  onPress={() => router.push('/reports' as any)}
                  style={({ pressed }) => ({
                    width: 40, height: 40, borderRadius: Radius.round,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? Colors.border : Colors.surface,
                    borderWidth: 1, borderColor: Colors.border,
                  })}
                >
                  <BarChart2 size={20} color={Colors.primary} />
                </Pressable>
                <Pressable
                  testID="settings-nav-btn"
                  onPress={() => router.push('/settings' as any)}
                  style={({ pressed }) => ({
                    width: 40, height: 40, borderRadius: Radius.round,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? Colors.border : Colors.surface,
                    borderWidth: 1, borderColor: Colors.border,
                  })}
                >
                  <Settings size={20} color={Colors.textSecond} />
                </Pressable>
                <Pressable
                  testID="buyers-nav-btn"
                  onPress={() => router.push('/buyers' as any)}
                  style={({ pressed }) => ({
                    width: 40, height: 40, borderRadius: Radius.round,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? Colors.border : Colors.surface,
                    borderWidth: 1, borderColor: Colors.border,
                  })}
                >
                  <Users size={20} color={Colors.info} />
                </Pressable>
                <Pressable
                  testID="new-bill-fab"
                  onPress={() => router.push('/bills/new')}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? '#E55A00' : Colors.primary,
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    borderRadius: Radius.round,
                  })}
                >
                  <Plus size={16} color="#FFF" strokeWidth={3} />
                  <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>
                    नया बिल
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Metric cards 2×2 */}
            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.sm,
                paddingHorizontal: Spacing.md,
                marginTop: Spacing.sm,
              }}
            >
              <MetricCard
                label="Today's Sale"
                value={toIndianCurrency(todaySale)}
                accent={Colors.success}
              />
              <MetricCard
                label="Confirmed"
                value={String(confirmed.length)}
                sub="bills"
                accent={Colors.info}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                gap: Spacing.sm,
                paddingHorizontal: Spacing.md,
                marginTop: Spacing.sm,
                marginBottom: Spacing.md,
              }}
            >
              <MetricCard
                label="Pending"
                value={String(pending.length)}
                sub="awaiting"
                accent={Colors.warning}
              />
              <MetricCard
                label="Stock Left"
                value={`${Math.round(totalStock / 1000 * 10) / 10} t`}
                sub={`${trucks.length} trucks`}
                accent={Colors.primary}
              />
            </View>

            {/* Filter chips */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: Spacing.md,
                gap: Spacing.xs,
                marginBottom: Spacing.xs,
              }}
            >
              {FILTERS.map(({ key, label, count }) => (
                <Pressable
                  key={key}
                  testID={`filter-${key}`}
                  onPress={() => setActiveFilter(key)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: Spacing.sm,
                    borderRadius: Radius.round,
                    backgroundColor: activeFilter === key ? Colors.primary : Colors.surface,
                    borderWidth: 1,
                    borderColor: activeFilter === key ? Colors.primary : Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FontSize.xs,
                      fontWeight: '700',
                      color: activeFilter === key ? '#FFF' : Colors.textSecond,
                    }}
                  >
                    {label} {count > 0 ? `(${count})` : null}
                  </Text>
                </Pressable>
              ))}
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
            <View
              testID="bills-empty"
              style={{ alignItems: 'center', paddingVertical: 48 }}
            >
              <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📋</Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                {activeFilter === 'ALL' ? 'आज कोई बिल नहीं' : 'No bills in this filter'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
