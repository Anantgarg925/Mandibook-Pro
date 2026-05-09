import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Plus, Search, Bell, Settings, ChevronRight, Truck } from 'lucide-react-native';
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

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <View style={{
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
    }}>
      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.text }}>{value}</Text>
      {sub ? <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>{sub}</Text> : null}
    </View>
  );
}

function TruckChip({ truck, onPress }: { truck: any; onPress: () => void }) {
  const available = truck.gradeInventory.reduce(
    (s: number, g: any) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg), 0
  );
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#E8F5E9' : Colors.surface,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginRight: Spacing.sm,
        width: 160,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={14} color={Colors.primary} />
        </View>
        <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary }} numberOfLines={1}>
          {truck.truckNumber}
        </Text>
      </View>
      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }} numberOfLines={1}>{truck.senderName}</Text>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: 4 }}>
        {Math.round(available / 1000 * 10) / 10} t
      </Text>
      <Text style={{ fontSize: 10, color: Colors.textSecond }}>available</Text>
    </Pressable>
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
      <Text style={{ width: 52, fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond }}>
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
        <View style={{
          paddingHorizontal: 8, paddingVertical: 3,
          borderRadius: Radius.round,
          backgroundColor: STATUS_BG[item.status] ?? '#F5F5F5',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[item.status] ?? Colors.textSecond }}>
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
  const { inquiries, pending, confirmed, loading: billsLoading } = useInquiries();
  const { trucks } = useTodayTrucks();
  const [search, setSearch] = useState('');
  const [splashGone, setSplashGone] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [launchVisible, setLaunchVisible] = useState(false);
  const [launchGone, setLaunchGone] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinGone, setPinGone] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (shopLoading || !minTimeElapsed) return;
    SplashScreen.hideAsync();
    if (!shop) {
      setSplashGone(true);
      router.replace('/onboarding');
    }
  }, [shopLoading, minTimeElapsed, shop, router]);

  if (!shop && !shopLoading) return null;

  const todaySale = confirmed.reduce((s, i) => s + i.grossAmount, 0);
  const totalStock = trucks.reduce(
    (sum, t) => sum + t.gradeInventory.reduce(
      (s, g) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg), 0
    ), 0
  );

  const initials = shop?.firmName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '';

  const filteredBills = search
    ? inquiries.filter(i =>
        i.customerName.toLowerCase().includes(search.toLowerCase()) ||
        i.slipNumber.toString().includes(search)
      )
    : inquiries.slice(0, 30);

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
            {/* Header */}
            <View style={{
              backgroundColor: Colors.headerBg,
              paddingHorizontal: Spacing.md,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.lg,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
                  }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#FFF' }}>{initials}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#FFF' }}>{shop?.firmName}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>{toIndianDate(Date.now())}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable
                    testID="reports-nav-btn"
                    onPress={() => router.push('/reports' as any)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Bell size={18} color="#FFF" />
                  </Pressable>
                  <Pressable
                    testID="settings-nav-btn"
                    onPress={() => router.push('/settings' as any)}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Settings size={18} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Metric cards */}
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <MetricCard label="आज की बिक्री" value={toIndianCurrency(todaySale)} accent={Colors.success} />
                <MetricCard label="Confirmed" value={String(confirmed.length)} sub="bills" accent={Colors.info} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <MetricCard label="Pending" value={String(pending.length)} sub="awaiting" accent={Colors.warning} />
                <MetricCard label="Stock Left" value={`${Math.round(totalStock / 1000 * 10) / 10} t`} sub={`${trucks.length} trucks`} accent={Colors.primary} />
              </View>
            </View>

            {/* Search bar */}
            <View style={{
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
            }}>
              <Search size={16} color={Colors.textSecond} />
              <TextInput
                testID="home-search"
                placeholder="Search bills or buyer name..."
                placeholderTextColor={Colors.textSecond}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 6 }}
              />
            </View>

            {/* Today's Trucks section */}
            {trucks.length > 0 ? (
              <View style={{ marginTop: Spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>Today's Trucks</Text>
                  <Pressable testID="view-all-trucks" onPress={() => router.push('/(tabs)/trucks' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' }}>View All</Text>
                    <ChevronRight size={14} color={Colors.primary} />
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}
                  style={{ flexGrow: 0 }}
                >
                  {trucks.map(t => (
                    <TruckChip key={t.id} truck={t} onPress={() => router.push(`/trucks/${t.id}` as any)} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Live Bill Feed header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.xs }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>Live Bill Feed</Text>
              <Pressable testID="buyers-nav-btn" onPress={() => router.push('/buyers' as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' }}>Buyers</Text>
                <ChevronRight size={14} color={Colors.primary} />
              </Pressable>
            </View>

            {billsLoading ? (
              <ActivityIndicator testID="bills-loading" color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          billsLoading ? null : (
            <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📋</Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>आज कोई बिल नहीं</Text>
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
          bottom: 24,
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
          elevation: 6,
        })}
      >
        <Plus size={18} color="#FFF" strokeWidth={3} />
        <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '800' }}>नया बिल</Text>
      </Pressable>

      {!splashGone && (
        <SplashScreenView
          visible={shopLoading || !minTimeElapsed}
          onHide={() => {
            setSplashGone(true);
            if (shop) setLaunchVisible(true);
          }}
        />
      )}

      {(!launchGone && launchVisible) ? (
        <LaunchView
          visible={launchVisible}
          shopName={shop?.firmName ?? ''}
          onHide={() => setLaunchGone(true)}
          onAdminPress={() => { setPinGone(false); setPinVisible(true); }}
          onMemberPress={() => { setLaunchGone(true); router.push('/authorization' as any); }}
        />
      ) : null}

      {!pinGone ? (
        <AdminPinView
          visible={pinVisible}
          correctPin={shop?.adminPin ?? ''}
          onHide={() => setPinGone(true)}
          onSuccess={() => { setLaunchGone(true); setPinVisible(false); }}
          onCancel={() => setPinVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
