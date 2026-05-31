import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ChevronDown, ChevronRight, Plus, Search, TrendingUp, ClipboardList, Clock, FileText, User } from 'lucide-react-native';
import PagerView from '@/components/common/PagerView';
import { useInquiries } from '@/hooks/useInquiries';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import { useResponsive } from '@/hooks/useResponsive';
import { DraggableFAB } from '@/components/common/DraggableFAB';

import { useShop } from '@/context/ShopContext';
type FilterTab = 'ALL' | 'DELIVERED' | 'PENDING';

const BG = '#F3FAFF';
const GREEN = '#00450D';
const BORDER = '#E5E7EB';
const BLUE_CHIP = '#DBF1FE';
const AMBER = '#FFB300';

const BillCard = React.memo(function BillCard({ item, onPress, isSmall }: { item: Inquiry; onPress: () => void; isSmall: boolean }) {
  const isConfirmed = item.status === 'CONFIRMED';
  const isCancelled = item.status === 'CANCELLED';
  const isDelivered = item.status === 'DELIVERED';
  
  const statusDisplay = isConfirmed ? 'AUTHORIZED / अधिकृत' 
    : isCancelled ? 'CANCELLED / रद्द' 
    : isDelivered ? 'DELIVERED / दिया'
    : 'PENDING / शेष';

  const statusBg = isConfirmed ? '#E8F5E9' 
    : isCancelled ? '#FFEBEE' 
    : isDelivered ? '#DBEAFE'
    : '#FFF8E1';
    
  const statusColor = isConfirmed ? '#166534' 
    : isCancelled ? '#991B1B' 
    : isDelivered ? '#1D4ED8'
    : '#854D0E';

  return (
    <Pressable
      testID={`bill-card-${item.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
        marginHorizontal: 0,
        marginBottom: 10,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
      })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: FontSize.sm, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
            #{item.slipNumber} • {item.customerName || item.paymentMode || 'Cash'}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 11, color: '#4B5563' }}>
            {item.truckNumber || 'No Truck'} | {item.grade}
          </Text>
        </View>
        <View style={{
          backgroundColor: statusBg,
          paddingHorizontal: 7,
          paddingVertical: 4,
          borderRadius: 16,
          alignItems: 'center',
          minWidth: 70,
        }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 9, fontWeight: '700', color: statusColor }}>
            {statusDisplay.split(' / ')[0]}
          </Text>
        </View>
      </View>
      <View style={{ height: 0.8, backgroundColor: '#E5E7EB', marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Clock size={12} color="#4B5563" />
          <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 4, flexShrink: 1 }}>
            {item.sacks} bags • {Math.round(item.totalWeight).toLocaleString('en-IN')} kg
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: isConfirmed ? '#166534' : '#111827', fontWeight: '600', textAlign: 'right' }}>
          ₹ {toIndianCurrency(item.netAmount).replace('₹', '')}
        </Text>
      </View>
    </Pressable>
  );
});

export default function BillsScreen() {
  const { shop } = useShop();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentHPad, isSmall } = useResponsive();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { inquiries, pending, confirmed, udhaari, loading } = useInquiries();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [query, setQuery] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const pagerRef = React.useRef<PagerView>(null);
  const FILTER_TABS: FilterTab[] = ['ALL', 'DELIVERED', 'PENDING'];
  const filterIndex = (tab: FilterTab) => {
    const index = FILTER_TABS.indexOf(tab);
    return index >= 0 ? index : 0;
  };

  useEffect(() => {
    if (filter === 'PENDING' || filter === 'DELIVERED' || filter === 'ALL') {
      setActiveFilter(filter);
      requestAnimationFrame(() => {
        pagerRef.current?.setPage(filterIndex(filter));
      });
    }
  }, [filter]);

  const totalSales = confirmed.reduce((acc, bill) => acc + bill.netAmount, 0);

  const searchedBills = inquiries.filter((bill) => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      bill.slipNumber.toString().includes(q) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(q)) ||
      (bill.truckNumber && bill.truckNumber.toLowerCase().includes(q))
    );
  });

  const filteredBills =
    activeFilter === 'ALL' ? searchedBills
      : activeFilter === 'DELIVERED' ? searchedBills.filter(b => b.status === 'DELIVERED')
        : searchedBills.filter(b => b.status === 'PENDING');

  const gradeGroups = Object.values(
    filteredBills.reduce<Record<string, { grade: string; totalQty: number; totalAmount: number; rows: any[] }>>((acc, bill) => {
      const entries = (bill.chargeSnapshot as any)?.entries;
      const itemsToProcess = (entries && entries.length > 0) ? entries : [bill];

      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        const label = item.gradeName || item.grade || 'Ungraded';
        if (!acc[label]) acc[label] = { grade: label, totalQty: 0, totalAmount: 0, rows: [] };
        
        const itemWeight = item.totalWeight || 0;
        const itemAmount = item.grossAmount || item.netAmount || 0; // use gross if net isn't available on entry
        let itemRate = item.ratePerKg || 0;
        if (!itemRate && itemWeight > 0 && itemAmount > 0) {
          itemRate = Math.round(itemAmount / itemWeight);
        }

        acc[label].totalQty += itemWeight;
        acc[label].totalAmount += itemAmount;
        acc[label].rows.push({
          id: bill.id + '-' + (item.grade || 'unknown') + '-' + i,
          billId: bill.id,
          slipNumber: bill.slipNumber,
          customerName: bill.customerName,
          paymentMode: bill.paymentMode,
          totalWeight: itemWeight,
          ratePerKg: itemRate,
          netAmount: itemAmount,
          status: bill.status,
        });
      }
      return acc;
    }, {})
  );

  const openBillById = useCallback((id: string, status: string) => {
    router.push(`/bills/${id}` as any);
  }, [router]);

  const openBill = useCallback((bill: Inquiry) => {
    openBillById(bill.id, bill.status);
  }, [openBillById]);

  const renderItem = useCallback(({ item }: { item: Inquiry }) => (
    <BillCard item={item} onPress={() => openBill(item)} isSmall={isSmall} />
  ), [isSmall, openBill]);

  const handleAdd = () => router.push('/bills/new');

  const renderHeader = () => (
    <View style={{ backgroundColor: BG }}>
      <View style={{ paddingHorizontal: Math.max(16, contentHPad), paddingBottom: Spacing.md }}>
        {/* Search Bar */}
        <View style={{ paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: query ? '#2563EB' : BORDER,
          paddingHorizontal: Spacing.md,
          minHeight: 48
        }}>
          <Search size={20} color="#717A6D" />
          <TextInput
            style={{ flex: 1, marginLeft: 12, fontSize: isSmall ? 14 : 16, color: '#111827' }}
            placeholder="Search bills... / बिल खोजें"
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginRight: 4 }}>
              {searchedBills.length} {searchedBills.length === 1 ? 'result' : 'results'}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ paddingBottom: Spacing.md }}>
        <View style={{
          backgroundColor: '#e6f6ff',
          borderRadius: 14,
          padding: 4,
          flexDirection: 'row',
          overflow: 'visible',
        }}>
          {([
            { id: 'ALL', label: 'All', count: inquiries.length },
            { id: 'DELIVERED', label: 'Delivered', count: inquiries.filter(i => i.status === 'DELIVERED').length },
            { id: 'PENDING', label: 'Pending', count: inquiries.filter(i => i.status === 'PENDING').length }
          ] satisfies { id: FilterTab; label: string; count: number }[]).map((tab, index) => {
            const active = activeFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  setActiveFilter(tab.id);
                  pagerRef.current?.setPage(index);
                }}
                style={{
                  flex: 1,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: active ? GREEN : 'transparent',
                  flexDirection: 'row',
                  gap: 4
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: active ? '700' : '500',
                  color: active ? '#ffffff' : '#64748B',
                }}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={{ backgroundColor: active ? '#FFF' : '#E0F2FE', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: active ? GREEN : '#1E3A8A' }}>{tab.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ backgroundColor: GREEN }} edges={['top']} />
      {/* Top App Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: contentHPad,
        paddingVertical: 14,
        minHeight: 56,
        backgroundColor: GREEN,
        borderBottomWidth: 0,
      }}>
        <Pressable hitSlop={10} onPress={() => router.push('/member-profile' as any)}>
          <User size={24} color="#FFFFFF" />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', fontSize: isSmall ? FontSize.md : FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Bills / बिल
        </Text>
        <Pressable hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          {/* Placeholder for balance/layout alignment with left icon */}
          <Search size={24} color="#FFFFFF" opacity={0} />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <ActivityIndicator testID="bills-loading" color={GREEN} size="large" style={{ marginTop: 48 }} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={filterIndex(activeFilter)}
            onPageSelected={(e) => setActiveFilter(FILTER_TABS[e.nativeEvent.position])}
          >
            {FILTER_TABS.map((tabStatus, index) => {


              const pageBills =
                tabStatus === 'ALL' ? searchedBills
                  : tabStatus === 'DELIVERED' ? searchedBills.filter(b => b.status === 'DELIVERED')
                    : searchedBills.filter(b => b.status === 'PENDING');

              return (
                <View key={index} style={{ flex: 1 }}>
                  <FlatList
                    testID={`bills-list-${tabStatus}`}
                    data={pageBills.slice(0, 50)}
                    keyExtractor={(i) => i.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: Math.max(16, contentHPad) }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                        <FileText size={44} color="#9CA3AF" />
                        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#111827', marginTop: 12 }}>कोई बिल नहीं</Text>
                        <Text style={{ fontSize: FontSize.sm, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>No bills found for the selected filter.</Text>
                      </View>
                    }
                  />
                </View>
              );
            })}
          </PagerView>
        </View>
      )}

      {/* Floating Action Button */}
      <DraggableFAB
        testID="new-bill-fab"
        onPress={handleAdd}
        initialBottom={8}
        initialRight={16}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: GREEN,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 30,
          gap: Spacing.sm,
        }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={14} color="#FFFFFF" strokeWidth={3} />
          </View>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' }}>New Bill</Text>
            <Text style={{ color: '#DFF4FF', fontSize: 10, fontWeight: '600' }}>नया बिल</Text>
          </View>
        </View>
      </DraggableFAB>
    </View>
  );
}
