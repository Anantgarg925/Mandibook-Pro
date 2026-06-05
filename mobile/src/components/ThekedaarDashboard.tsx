import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LogOut, CheckCircle, Clock } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import { useResponsive } from '@/hooks/useResponsive';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';
import PagerView from '@/components/common/PagerView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';
import { resetToRoute } from '@/utils/navigation';

export function ThekedaarDashboard({ memberName }: { memberName: string }) {
  const { inquiries } = useInquiries();
  const { shop } = useShop();
  const { contentHPad, isSmall } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'PENDING' | 'DELIVERED'>('PENDING');
  const pagerRef = React.useRef<PagerView>(null);

  const pendingBills = inquiries.filter(i => i.status === 'PENDING');
  const deliveredBills = inquiries.filter(i => i.status === 'DELIVERED');

  const logout = async () => {
    await AsyncStorage.removeItem(APP_SESSION_KEY);
    await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
    resetToRoute(router, '/access-choice' as any);
  };

  const renderBillCard = ({ item }: { item: Inquiry }) => {
    const isDelivered = item.status === 'DELIVERED';
    return (
      <Pressable
        onPress={() => router.push(`/bills/${item.id}` as any)}
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: FontSize.sm, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
              #{item.slipNumber} • {item.customerName || item.paymentMode || 'Cash'}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: '#4B5563' }}>
              {item.truckNumber || 'No Truck'} | {item.grade}
            </Text>
          </View>
          <View style={{
            backgroundColor: isDelivered ? '#DBEAFE' : '#FFF8E1',
            paddingHorizontal: 7,
            paddingVertical: 4,
            borderRadius: 16,
            alignItems: 'center',
            minWidth: 70,
          }}>
            <Text numberOfLines={1} style={{ fontSize: 9, fontWeight: '700', color: isDelivered ? '#1D4ED8' : '#854D0E' }}>
              {isDelivered ? 'DELIVERED' : 'PENDING'}
            </Text>
          </View>
        </View>
        <View style={{ height: 0.8, backgroundColor: '#E5E7EB', marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Clock size={12} color="#4B5563" />
            <Text style={{ fontSize: 11, color: '#4B5563', marginLeft: 4 }}>
              {item.sacks} bags • {Math.round(item.totalWeight)} kg
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#111827', fontWeight: '600' }}>
            {toIndianCurrency(item.netAmount)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F3FAFF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#00450D', paddingTop: Math.max(insets.top, 10), paddingHorizontal: Math.max(Spacing.md, contentHPad), paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#00450D' }}>
                {memberName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>
                {shop?.firmName || 'MandiBook Pro'}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 }}>
                {toIndianDate(getCurrentBusinessDate().getTime())} • THEKEDAAR
              </Text>
            </View>
          </View>
          <Pressable onPress={logout} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: Math.max(Spacing.md, contentHPad), paddingTop: Spacing.md, paddingBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#e6f6ff', borderRadius: 14, padding: 4 }}>
          {([
            { id: 'PENDING', label: 'Pending Delivery', count: pendingBills.length },
            { id: 'DELIVERED', label: 'Delivered', count: deliveredBills.length }
          ] as const).map((tab, idx) => {
            const active = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => {
                  setActiveTab(tab.id);
                  pagerRef.current?.setPage(idx);
                }}
                style={{
                  flex: 1, height: 44, alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, backgroundColor: active ? '#00450D' : 'transparent',
                  flexDirection: 'row', gap: 6
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '600', color: active ? '#FFF' : '#64748B' }}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={{ backgroundColor: active ? '#FFF' : '#E0F2FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#00450D' : '#1E3A8A' }}>{tab.count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position === 0 ? 'PENDING' : 'DELIVERED')}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            data={pendingBills}
            keyExtractor={i => i.id}
            renderItem={renderBillCard}
            contentContainerStyle={{ paddingHorizontal: Math.max(Spacing.md, contentHPad), paddingBottom: 100 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B', fontWeight: '600' }}>No pending deliveries</Text>}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FlatList
            data={deliveredBills}
            keyExtractor={i => i.id}
            renderItem={renderBillCard}
            contentContainerStyle={{ paddingHorizontal: Math.max(Spacing.md, contentHPad), paddingBottom: 100 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B', fontWeight: '600' }}>No delivered bills yet</Text>}
          />
        </View>
      </PagerView>
    </View>
  );
}
