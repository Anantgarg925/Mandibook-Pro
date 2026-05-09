import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'UDHAARI';

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

function BillCard({ item, onPress }: { item: Inquiry; onPress: () => void }) {
  return (
    <Pressable
      testID={`bill-card-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? Colors.background : Colors.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        borderRadius: Radius.md,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        borderWidth: 1,
        borderColor: Colors.border,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 }}>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '700' }}>#{item.slipNumber}</Text>
            <View style={{
              paddingHorizontal: 8, paddingVertical: 2,
              borderRadius: Radius.round,
              backgroundColor: STATUS_BG[item.status] ?? '#F5F5F5',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[item.status] ?? Colors.textSecond }}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
            {item.customerName}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
            {item.grade} · {item.sacks} bags · {item.totalWeight} kg
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
            {toIndianCurrency(item.netAmount)}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
            ₹{item.ratePerKg}/kg
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function BillsScreen() {
  const router = useRouter();
  const { inquiries, pending, confirmed, udhaari, loading } = useInquiries();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const FILTERS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'सभी', count: inquiries.length },
    { key: 'PENDING', label: 'Pending', count: pending.length },
    { key: 'CONFIRMED', label: 'Confirmed', count: confirmed.length },
    { key: 'UDHAARI', label: 'उधारी', count: udhaari.length },
  ];

  const filteredBills: Inquiry[] =
    activeFilter === 'ALL' ? inquiries
    : activeFilter === 'PENDING' ? pending
    : activeFilter === 'CONFIRMED' ? confirmed
    : udhaari;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        backgroundColor: Colors.headerBg,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#FFF' }}>Pending Bills</Text>
            <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>पेंडिंग बिल ({inquiries.length})</Text>
          </View>
          <Pressable
            testID="new-bill-btn"
            onPress={() => router.push('/bills/new')}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
              paddingVertical: 8, paddingHorizontal: Spacing.md,
              borderRadius: Radius.round,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
            })}
          >
            <Plus size={16} color="#FFF" strokeWidth={3} />
            <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>नया बिल</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.xs,
      }}>
        {FILTERS.map(({ key, label, count }) => (
          <Pressable
            key={key}
            testID={`filter-${key}`}
            onPress={() => setActiveFilter(key)}
            style={{
              flex: 1,
              paddingVertical: Spacing.sm,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeFilter === key ? Colors.primary : 'transparent',
            }}
          >
            <Text style={{
              fontSize: FontSize.xs,
              fontWeight: activeFilter === key ? '700' : '400',
              color: activeFilter === key ? Colors.primary : Colors.textSecond,
            }}>
              {label}
            </Text>
            {count > 0 ? (
              <Text style={{
                fontSize: 10,
                color: activeFilter === key ? Colors.primary : Colors.textSecond,
                fontWeight: '700',
              }}>({count})</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator testID="bills-loading" color={Colors.primary} size="large" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          testID="bills-list"
          data={filteredBills.slice(0, 50)}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <BillCard item={item} onPress={() => router.push(`/bills/${item.id}`)} />
          )}
          contentContainerStyle={{ paddingTop: Spacing.md, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📋</Text>
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>कोई बिल नहीं</Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>No bills in this filter</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
