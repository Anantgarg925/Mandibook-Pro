import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Pencil, Share2, FileText } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianWeight, toIndianDate, toIndianCurrency } from '@/lib/formatters';
import type { Truck, GradeInventory } from '@/types/truck';
import type { Inquiry } from '@/types/inquiry';

type BillTab = 'all' | 'confirmed';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#7e5700',
  CONFIRMED: Colors.primary,
  CANCELLED: '#B71C1C',
};

const STATUS_BG: Record<string, string> = {
  PENDING: '#FFF3E0',
  CONFIRMED: '#E8F5E9',
  CANCELLED: '#FFEBEE',
  UDHAARI: '#FFEBEE',
};

export default function TruckDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const [tab, setTab] = useState<BillTab>('all');

  const { data: truck } = useQuery({
    queryKey: ['truck', shop?.shopId, id],
    queryFn: () => api.get<Truck>(`/api/trucks/${id}?shopId=${shop!.shopId}`),
    enabled: !!shop?.shopId && !!id,
    refetchInterval: 10000,
  });

  const { data: truckBills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['inquiries', shop?.shopId, 'truck', id],
    queryFn: () => api.get<Inquiry[]>(`/api/inquiries?shopId=${shop!.shopId}&truckId=${id}`),
    enabled: !!shop?.shopId && !!id,
    refetchInterval: 10000,
  });

  if (!truck) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}
        edges={['top']}
      >
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const totalConfirmed = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg, 0);
  const totalProvisional = truck.gradeInventory.reduce((s, g) => s + g.provisionalKg, 0);
  const inventoryTotalKg = truck.gradeInventory.reduce((s, g) => s + g.totalKg, 0);
  const totalKg = Math.max(truck.totalKg, inventoryTotalKg);
  const isActive = truck.status === 'ACTIVE';

  const confirmedPct = totalKg > 0 ? Math.min(totalConfirmed / totalKg, 1) : 0;
  const provisionalPct = totalKg > 0 ? Math.min(totalProvisional / totalKg, 1 - confirmedPct) : 0;
  const availableKg = Math.max(0, totalKg - totalConfirmed - totalProvisional);
  const availablePct = totalKg > 0 ? Math.max(0, 1 - confirmedPct - provisionalPct) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <Pressable testID="back-from-detail" onPress={() => router.back()} style={{ padding: 4, marginRight: Spacing.sm }}>
          <ArrowLeft size={22} color="#1a3c20" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#1a3c20', letterSpacing: Platform.OS === 'android' ? 0 : 0.3 }}>
            {truck.truckNumber}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: '#64748B', marginTop: 1 }}>
            {truck.senderName}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Share.share({ message: `Truck: ${truck.truckNumber}\nSender: ${truck.senderName}\nCHL: ${truck.chlNumber}` })
          }
          style={{ padding: 8, marginRight: 4 }}
        >
          <Share2 size={20} color="#64748B" />
        </Pressable>
        <Pressable
          testID="edit-grades-button"
          onPress={() => router.push({ pathname: '/trucks/edit-grades', params: { truckId: id } })}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: Radius.round,
            backgroundColor: pressed ? '#E8F5E9' : '#F0F4F0',
          })}
        >
          <Pencil size={14} color={Colors.primary} />
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary }}>
            Edit Grades
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Card */}
        <View
          style={{
            margin: Spacing.md,
            backgroundColor: '#FFFFFF',
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: Spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: Spacing.sm }}>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: '#64748B', marginBottom: 2 }}>Consignment</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                  #{truck.chlNumber || '—'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: FontSize.xs, color: '#64748B', marginBottom: 2 }}>Date / तिथि</Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                  {toIndianDate(truck.date)}
                </Text>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: Radius.md,
                backgroundColor: '#E8F5E9',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, letterSpacing: Platform.OS === 'android' ? 0 : 0.2 }}>
                {isActive ? 'Active' : 'Closed'}
              </Text>
              <Text style={{ fontSize: 10, color: Colors.primary, marginTop: 1 }}>
                {isActive ? 'सक्रिय' : 'बंद'}
              </Text>
            </View>
          </View>
        </View>

        {/* Inventory Status Section */}
        <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
              Inventory Status / स्टॉक स्थिति
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: FontSize.xs, color: '#64748B' }}>Total Load</Text>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary }}>
                {toIndianWeight(totalKg)}
              </Text>
            </View>
          </View>

          {/* Segmented progress bar */}
          <View
            style={{
              height: 56,
              borderRadius: 12,
              overflow: 'hidden',
              flexDirection: 'row',
              backgroundColor: '#c7dde9',
            }}
          >
            {confirmedPct > 0 ? (
              <View
                style={{
                  flex: confirmedPct,
                  minWidth: confirmedPct > 0 ? 4 : 0,
                  backgroundColor: Colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                {confirmedPct >= 0.12 ? (
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                    {toIndianWeight(totalConfirmed)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {provisionalPct > 0 ? (
              <View
                style={{
                  flex: provisionalPct,
                  minWidth: provisionalPct > 0 ? 4 : 0,
                  backgroundColor: '#7e5700',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                {provisionalPct >= 0.12 ? (
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                    {toIndianWeight(totalProvisional)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {availablePct > 0 ? (
              <View
                style={{
                  flex: availablePct,
                  backgroundColor: '#c7dde9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                {availablePct >= 0.12 ? (
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#41493e' }} numberOfLines={1}>
                    {toIndianWeight(availableKg)}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: 4 }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>Confirmed</Text>
              </View>
              <Text style={{ fontSize: 9, color: '#64748B' }}>पुष्टि की गई बिक्री</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7e5700' }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>Provisional</Text>
              </View>
              <Text style={{ fontSize: 9, color: '#64748B' }}>अनंतिम</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#c7dde9' }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>Available</Text>
              </View>
              <Text style={{ fontSize: 9, color: '#64748B' }}>उपलब्ध</Text>
            </View>
          </View>
        </View>

        {/* Grade Table */}
        <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.lg }}>
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: Platform.OS === 'android' ? 0 : 1.2,
              marginBottom: Spacing.sm,
            }}
          >
            Stock by Grade / ग्रेड के अनुसार स्टॉक
          </Text>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              overflow: 'hidden',
            }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View>
                {/* Table header */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#f3faff',
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                  }}
                >
                  {[
                    { label: 'Grade', width: 90, align: 'left' as const },
                    { label: 'Total', width: 90, align: 'right' as const },
                    { label: 'Conf.', width: 90, align: 'right' as const },
                    { label: 'Prov.', width: 90, align: 'right' as const },
                    { label: 'Avail.', width: 90, align: 'right' as const },
                  ].map((col) => (
                    <Text
                      key={col.label}
                      style={{
                        width: col.width,
                        fontSize: FontSize.xs,
                        fontWeight: '700',
                        color: '#64748B',
                        textAlign: col.align,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      {col.label}
                    </Text>
                  ))}
                </View>

                {truck.gradeInventory.map((g, i) => {
                  const left = g.totalKg - g.confirmedKg - g.provisionalKg;
                  return (
                    <GradeRow
                      key={g.code}
                      grade={g}
                      left={left}
                      isLast={i === truck.gradeInventory.length - 1}
                    />
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Bills Section */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          {/* Tab pills */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#e6f6ff',
              borderRadius: Radius.lg,
              padding: 4,
              marginBottom: Spacing.md,
            }}
          >
            {([
              ['all', 'सभी बिल', 'All Bills'],
              ['confirmed', 'कन्फर्म', 'Confirmed'],
            ] as [BillTab, string, string][]).map(([key, hindi, english]) => (
              <Pressable
                key={key}
                testID={`tab-${key}`}
                onPress={() => setTab(key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: Radius.md,
                  backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
                  shadowColor: tab === key ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: tab === key ? 0.1 : 0,
                  shadowRadius: 3,
                  elevation: tab === key ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                    color: tab === key ? Colors.primary : '#64748B',
                  }}
                >
                  {english}
                </Text>
                <Text style={{ fontSize: 10, color: tab === key ? Colors.primary : '#94A3B8', marginTop: 1 }}>
                  {hindi}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Bill list */}
          {billsLoading ? (
            <ActivityIndicator testID="truck-bills-loading" color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : (() => {
            const filtered =
              tab === 'confirmed'
                ? truckBills.filter((b) => b.status === 'CONFIRMED')
                : truckBills;

            if (filtered.length === 0) {
              return (
                <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                  <FileText size={40} color={Colors.border} />
                  <Text style={{ fontSize: FontSize.sm, color: '#64748B', marginTop: Spacing.sm }}>
                    {tab === 'all' ? 'No bills yet' : 'No confirmed bills'}
                  </Text>
                </View>
              );
            }

            return (
              <View style={{ gap: Spacing.sm }}>
                {filtered.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onPress={() => router.push(`/bills/${bill.id}` as any)}
                  />
                ))}
              </View>
            );
          })()}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="new-inquiry-fab"
        onPress={() => router.push({ pathname: '/bills/new', params: { truckId: id } })}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24 + insets.bottom,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        })}
      >
        <Plus size={28} color="#FFF" strokeWidth={2.5} />
      </Pressable>
    </SafeAreaView>
  );
}

function GradeRow({
  grade,
  left,
  isLast,
}: {
  grade: GradeInventory;
  left: number;
  isLast: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: Spacing.sm,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
      }}
    >
      <View style={{ width: 90 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{grade.code}</Text>
        <Text style={{ fontSize: 10, color: '#64748B' }} numberOfLines={1}>{grade.name}</Text>
      </View>
      <Text style={{ width: 90, fontSize: FontSize.sm, color: Colors.text, textAlign: 'right' }}>
        {toIndianWeight(grade.totalKg)}
      </Text>
      <Text style={{ width: 90, fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700', textAlign: 'right' }}>
        {toIndianWeight(grade.confirmedKg)}
      </Text>
      <Text style={{ width: 90, fontSize: FontSize.sm, color: '#7e5700', fontWeight: '700', textAlign: 'right' }}>
        {toIndianWeight(grade.provisionalKg)}
      </Text>
      <View
        style={{
          width: 90,
          backgroundColor: '#E8F5E9',
          borderRadius: Radius.sm,
          paddingVertical: 3,
          paddingHorizontal: 6,
          alignItems: 'flex-end',
        }}
      >
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary }}>
          {toIndianWeight(left)}
        </Text>
      </View>
    </View>
  );
}

function BillCard({ bill, onPress }: { bill: Inquiry; onPress: () => void }) {
  return (
    <Pressable
      testID={`truck-bill-${bill.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
      })}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#dbf1fe',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <FileText size={24} color={Colors.primary} />
      </View>

      {/* Center info */}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
            {bill.customerName}
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: Radius.round,
              backgroundColor: STATUS_BG[bill.status] ?? '#F5F5F5',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[bill.status] ?? '#64748B' }}>
              {bill.status === 'CONFIRMED' ? 'CONFIRMED' : bill.status === 'PENDING' ? 'PENDING' : bill.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: FontSize.xs, color: '#64748B' }}>
          Bill #{bill.slipNumber} · {bill.grade}
        </Text>
      </View>

      {/* Right: amount + bags */}
      <View style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
        {bill.netAmount > 0 ? (
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
            {toIndianCurrency(bill.netAmount)}
          </Text>
        ) : null}
        <Text style={{ fontSize: FontSize.xs, color: '#94A3B8' }}>
          {bill.sacks} bags · {bill.grade}
        </Text>
      </View>
    </Pressable>
  );
}
