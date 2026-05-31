import React, { useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Menu, Truck as TruckIcon, TrendingUp, ClipboardList, Plus, Search } from 'lucide-react-native';
import PagerView from '@/components/common/PagerView';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import TruckCard from '@/components/truck/TruckCard';
import { SkeletonTable } from '@/components/common/SkeletonLoader';
import { FontSize, Spacing, Radius } from '@/lib/theme';
import type { Truck } from '@/types/truck';
import { useResponsive } from '@/hooks/useResponsive';
import { useShop } from '@/context/ShopContext';
import { DraggableFAB } from '@/components/common/DraggableFAB';

const BG = '#F3FAFF';
const GREEN = '#00450D';
const BORDER = '#E5E7EB';
const BLUE_CHIP = '#DBF1FE';
const AMBER = '#FFB300';

export default function TrucksScreen() {
  const { shop } = useShop();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentHPad, isSmall } = useResponsive();
  const { trucks, loading } = useTodayTrucks();
  const [filter, setFilter] = useState('ALL');
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ ALL: true });
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const pagerRef = React.useRef<PagerView>(null);
  const FILTER_TABS = ['ALL', 'ARRIVED', 'UNLOADING'];

  const handleAdd = () => router.push('/trucks/register');
  const handlePress = useCallback((truck: Truck) => router.push(`/trucks/${truck.id}`), [router]);

  const renderItem = useCallback(({ item }: { item: Truck }) => (
    <TruckCard truck={item} onPress={() => handlePress(item)} />
  ), [handlePress]);

  const stats = trucks.reduce(
    (acc, truck) => {
      const sold = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0);
      if (truck.status === 'CLOSED' || sold >= truck.totalKg) acc.completed += 1;
      else if (sold > 0) acc.unloading += 1;
      else acc.arrived += 1;
      acc.active += truck.status === 'ACTIVE' ? 1 : 0;
      acc.remainingKg += Math.max(0, truck.totalKg - sold);
      return acc;
    },
    { active: 0, arrived: 0, unloading: 0, completed: 0, remainingKg: 0 }
  );

  const filteredTrucks = trucks.filter((truck) => {
    const sold = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0);
    const status =
      truck.status === 'CLOSED' || sold >= truck.totalKg
        ? 'COMPLETED'
        : sold > 0
          ? 'UNLOADING'
          : 'ARRIVED';
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      truck.truckNumber.toLowerCase().includes(q) ||
      truck.senderName.toLowerCase().includes(q) ||
      truck.chlNumber.toLowerCase().includes(q);
    const matchesFilter = filter === 'ALL' || filter === status;
    return matchesQuery && matchesFilter;
  });

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
          borderColor: '#E5E7EB',
          paddingHorizontal: Spacing.md,
          minHeight: 48
        }}>
          <TruckIcon size={20} color="#717A6D" />
          <TextInput
            ref={searchInputRef}
            style={{ flex: 1, marginLeft: 12, fontSize: isSmall ? 14 : 16, color: '#111827' }}
            placeholder="Search truck number... / गाड़ी नंबर खोजें"
            placeholderTextColor="#6B7280"
            value={query}
            onChangeText={setQuery}
          />
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
           {[
             { id: 'ALL', label: 'All' },
             { id: 'ARRIVED', label: 'Arrived' },
             { id: 'UNLOADING', label: 'Unloading' }
           ].map((tab, index) => {
             const active = filter === tab.id;
             return (
               <Pressable
                 key={tab.id}
                 onPress={() => {
                   setFilter(tab.id);
                   setVisitedTabs((prev) => ({ ...prev, [tab.id]: true }));
                   pagerRef.current?.setPage(index);
                 }}
                style={{
                  flex: 1,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: active ? GREEN : 'transparent',
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: active ? '700' : '400',
                  color: active ? '#ffffff' : '#64748B',
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Summary Cards - Horizontal Scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: Spacing.md, paddingRight: Spacing.md }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: Spacing.sm,
            borderWidth: 1,
            borderColor: BORDER,
            minHeight: 86,
            width: 150,
            overflow: 'hidden',
          }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: FontSize.xs, color: '#1F2937', marginBottom: Spacing.sm }}>Active / चालू</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: GREEN }}>{String(stats.active).padStart(2, '0')}</Text>
              <TrendingUp size={18} color={GREEN} />
            </View>
          </View>

          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: Spacing.sm,
            borderWidth: 1,
            borderColor: BORDER,
            minHeight: 86,
            width: 150,
            overflow: 'hidden',
          }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: FontSize.xs, color: '#1F2937', marginBottom: Spacing.sm }}>Pending / शेष</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#8A5A00' }}>{String(stats.unloading + stats.arrived).padStart(2, '0')}</Text>
              <ClipboardList size={18} color={AMBER} />
            </View>
          </View>
        </View>
      </ScrollView>
      </View>

      {/* Section Title */}
      <View>
        <Text style={{ fontSize: FontSize.md, color: '#111827', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0 }}>
          LIVE TRACKING / लाइव ट्रैकिंग
        </Text>
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
        paddingVertical: 14,
        minHeight: 56,
        backgroundColor: GREEN,
        borderBottomWidth: 0,
      }}>
        <Pressable hitSlop={10} onPress={() => router.push('/settings' as any)}>
          <Menu size={24} color="#FFFFFF" />
        </Pressable>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, textAlign: 'center', fontSize: isSmall ? FontSize.md : FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Trucks / गाड़ियाँ
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => searchInputRef.current?.focus()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Search size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <SkeletonTable rows={3} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={(e) => {
              const tab = FILTER_TABS[e.nativeEvent.position];
              setFilter(tab);
              setVisitedTabs((prev) => ({ ...prev, [tab]: true }));
            }}
          >
            {FILTER_TABS.map((tabStatus, index) => {
              const isVisited = visitedTabs[tabStatus];
              if (!isVisited) {
                return <View key={index} style={{ flex: 1 }} />;
              }

              const pageTrucks = trucks.filter((truck) => {
                const sold = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0);
                const status =
                  truck.status === 'CLOSED' || sold >= truck.totalKg
                    ? 'COMPLETED'
                    : sold > 0
                      ? 'UNLOADING'
                      : 'ARRIVED';
                const q = query.trim().toLowerCase();
                const matchesQuery =
                  !q ||
                  truck.truckNumber.toLowerCase().includes(q) ||
                  truck.senderName.toLowerCase().includes(q) ||
                  truck.chlNumber.toLowerCase().includes(q);
                const matchesFilter = tabStatus === 'ALL' || tabStatus === status;
                return matchesQuery && matchesFilter;
              });

              return (
                <View key={index} style={{ flex: 1 }}>
                  <FlatList
                    testID={`truck-list-${tabStatus}`}
                    data={pageTrucks.slice(0, 50)}
                    keyExtractor={(t) => t.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: Spacing.md, paddingHorizontal: 0, backgroundColor: BG }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                        <TruckIcon size={44} color="#9CA3AF" />
                        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#111827', marginTop: 12 }}>
                          No trucks found
                        </Text>
                        <Text style={{ fontSize: FontSize.sm, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                          Add a new truck or clear the search/filter.
                        </Text>
                        <Pressable
                          onPress={handleAdd}
                          style={{
                            marginTop: 16,
                            backgroundColor: '#0A4A1C',
                            paddingVertical: 12,
                            paddingHorizontal: 18,
                            borderRadius: 24,
                          }}
                        >
                          <Text style={{ color: '#FFF', fontSize: FontSize.sm, fontWeight: '700' }}>Register New Truck</Text>
                        </Pressable>
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
        testID="new-truck-fab"
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
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' }}>Register New</Text>
            <Text style={{ color: '#DFF4FF', fontSize: 10, fontWeight: '600' }}>नई गाड़ी जोड़ें</Text>
          </View>
        </View>
      </DraggableFAB>
    </SafeAreaView>
  );
}
