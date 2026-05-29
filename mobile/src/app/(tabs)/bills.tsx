import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, Plus, Menu, Search, TrendingUp, ClipboardList, Clock, FileText } from 'lucide-react-native';
import PagerView from '@/components/common/PagerView';
import { useInquiries } from '@/hooks/useInquiries';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';
import { useResponsive } from '@/hooks/useResponsive';
import { DraggableFAB } from '@/components/common/DraggableFAB';

type FilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'UDHAARI' | 'GRADE';

const BG = '#F3FAFF';
const GREEN = '#00450D';
const BORDER = '#E5E7EB';
const BLUE_CHIP = '#DBF1FE';
const AMBER = '#FFB300';

function BillCard({ item, onPress, isSmall }: { item: Inquiry; onPress: () => void; isSmall: boolean }) {
  const isConfirmed = item.status === 'CONFIRMED';
  const isCancelled = item.status === 'CANCELLED';
  const statusDisplay = isConfirmed ? 'AUTHORIZED / अधिकृत' : isCancelled ? 'CANCELLED / रद्द' : 'PENDING / शेष';

  const statusBg = isConfirmed ? '#E8F5E9' : isCancelled ? '#FFEBEE' : '#FFF8E1';
  const statusColor = isConfirmed ? '#166534' : isCancelled ? '#991B1B' : '#854D0E';

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
            #{item.slipNumber} • {item.customerName || 'Cash'}
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
}

export default function BillsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentHPad, isSmall } = useResponsive();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { inquiries, pending, confirmed, udhaari, loading } = useInquiries();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [query, setQuery] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const pagerRef = React.useRef<PagerView>(null);
  const FILTER_TABS: FilterTab[] = ['ALL', 'PENDING', 'CONFIRMED', 'UDHAARI', 'GRADE'];
  const filterIndex = (tab: FilterTab) => {
    const index = FILTER_TABS.indexOf(tab);
    return index >= 0 ? index : 0;
  };

  useEffect(() => {
    if (filter === 'PENDING' || filter === 'CONFIRMED' || filter === 'UDHAARI' || filter === 'ALL') {
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
      : activeFilter === 'PENDING' ? searchedBills.filter(b => b.status === 'PENDING')
        : activeFilter === 'CONFIRMED' ? searchedBills.filter(b => b.status === 'CONFIRMED')
          : activeFilter === 'GRADE' ? searchedBills
            : searchedBills.filter(b => b.paymentMode === 'UDHAARI');

  const gradeGroups = Object.values(
    filteredBills.reduce<Record<string, { grade: string; totalQty: number; totalAmount: number; rows: Inquiry[] }>>((acc, bill) => {
      const label = bill.gradeName || bill.grade || 'Ungraded';
      if (!acc[label]) acc[label] = { grade: label, totalQty: 0, totalAmount: 0, rows: [] };
      acc[label].totalQty += bill.totalWeight;
      acc[label].totalAmount += bill.netAmount;
      acc[label].rows.push(bill);
      return acc;
    }, {})
  );

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

  const handleAdd = () => router.push('/bills/new');

  const renderHeader = () => (
    <View style={{ backgroundColor: BG, paddingBottom: Spacing.md, paddingHorizontal: Math.max(16, contentHPad) }}>
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
            { id: 'PENDING', label: 'Pending', count: pending.length },
            { id: 'CONFIRMED', label: 'Auth\'d', count: confirmed.length },
            { id: 'UDHAARI', label: 'Udhaari', count: udhaari.length },
            { id: 'GRADE', label: 'Grade', count: 0 }
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

      {/* Summary Cards */}
      <View style={{ flexDirection: 'row', gap: isSmall ? 8 : Spacing.md, marginBottom: Spacing.lg }}>
        <View style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: isSmall ? Spacing.sm : Spacing.md,
          borderWidth: 1,
          borderColor: BORDER,
          minHeight: isSmall ? 102 : 122,
          overflow: 'hidden',
        }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: isSmall ? FontSize.sm : FontSize.md, color: '#1F2937', marginBottom: isSmall ? Spacing.md : Spacing.lg }}>Total Sales / कुल बिक्री</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: isSmall ? 20 : 24, fontWeight: '800', color: GREEN }}>₹{toIndianCurrency(totalSales).replace('₹', '')}</Text>
            <TrendingUp size={isSmall ? 20 : 22} color={GREEN} />
          </View>
        </View>

        <View style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: isSmall ? Spacing.sm : Spacing.md,
          borderWidth: 1,
          borderColor: BORDER,
          minHeight: isSmall ? 102 : 122,
          overflow: 'hidden',
        }}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: isSmall ? FontSize.sm : FontSize.md, color: '#1F2937', marginBottom: isSmall ? Spacing.md : Spacing.lg }}>Pending / शेष</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: isSmall ? 26 : 30, fontWeight: '800', color: '#8A5A00' }}>{String(pending.length).padStart(2, '0')}</Text>
            <ClipboardList size={isSmall ? 20 : 22} color={AMBER} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'left', 'right']}>
      {/* Top App Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: contentHPad,
        minHeight: 56,
        backgroundColor: BG,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}>
        <Pressable hitSlop={10} onPress={() => router.push('/settings' as any)}>
          <Menu size={24} color={GREEN} />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', fontSize: isSmall ? FontSize.md : FontSize.lg, fontWeight: '800', color: GREEN }}>
          Bills / बिल
        </Text>
        <Pressable hitSlop={10} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          {/* Placeholder for balance/layout alignment with left icon */}
          <Search size={24} color="#111827" opacity={0} />
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
              if (tabStatus === 'GRADE') {
                return (
                  <View key={index} style={{ flex: 1 }}>
                    <FlatList
                      testID="grade-wise-bills-list"
                      data={gradeGroups}
                      keyExtractor={(group) => group.grade}
                      contentContainerStyle={{ paddingBottom: 100 }}
                      showsVerticalScrollIndicator={false}
                      renderItem={({ item }) => {
                        const expanded = expandedGrades[item.grade] ?? false;
                        return (
                          <View style={{
                            marginHorizontal: Math.max(16, contentHPad),
                            marginBottom: Spacing.sm,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: BORDER,
                            borderRadius: Radius.sm,
                            padding: Spacing.sm,
                          }}>
                            <Pressable
                              testID={`grade-group-${item.grade}`}
                              onPress={() => setExpandedGrades((prev) => ({ ...prev, [item.grade]: !expanded }))}
                              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                            >
                              {expanded ? <ChevronDown size={18} color="#111827" /> : <ChevronRight size={18} color="#111827" />}
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#111827' }}>{item.grade}</Text>
                                <Text style={{ fontSize: FontSize.xs, color: '#4B5563' }}>
                                  {item.rows.length} bills · {item.totalQty.toFixed(0)} kg
                                </Text>
                              </View>
                              <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: GREEN }}>
                                {toIndianCurrency(item.totalAmount)}
                              </Text>
                            </Pressable>
                            {expanded ? (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm }}>
                                {item.rows.map((bill) => (
                                  <Pressable
                                    key={bill.id}
                                    onPress={() => openBill(bill)}
                                    style={{
                                      width: '48%',
                                      minHeight: 72,
                                      borderWidth: 1,
                                      borderColor: BORDER,
                                      borderRadius: Radius.sm,
                                      padding: 10,
                                      backgroundColor: '#F8FAFC'
                                    }}
                                  >
                                    <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#111827' }}>#{bill.slipNumber} {bill.customerName || 'Cash'}</Text>
                                    <Text style={{ fontSize: FontSize.xs, color: '#4B5563', marginTop: 4 }}>{bill.totalWeight} kg · ₹{bill.ratePerKg}/kg</Text>
                                    <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: GREEN, marginTop: 4 }}>{toIndianCurrency(bill.netAmount)}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        );
                      }}
                    />
                  </View>
                );
              }

              const pageBills =
                tabStatus === 'ALL' ? searchedBills
                  : tabStatus === 'PENDING' ? searchedBills.filter(b => b.status === 'PENDING')
                    : tabStatus === 'CONFIRMED' ? searchedBills.filter(b => b.status === 'CONFIRMED')
                      : searchedBills.filter(b => b.paymentMode === 'UDHAARI');

              return (
                <View key={index} style={{ flex: 1 }}>
                  <FlatList
                    testID={`bills-list-${tabStatus}`}
                    data={pageBills.slice(0, 50)}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => <BillCard item={item} onPress={() => openBill(item)} isSmall={isSmall} />}
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
    </SafeAreaView>
  );
}
