import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Pencil } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import InventoryBar from '@/components/truck/InventoryBar';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianWeight, toIndianDate, toIndianCurrency } from '@/lib/formatters';
import type { Truck, GradeInventory } from '@/types/truck';
import type { Inquiry } from '@/types/inquiry';

type BillTab = 'all' | 'confirmed';

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

export default function TruckDetailScreen() {
  const router = useRouter();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <Text style={{ color: Colors.textSecond }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const totalConfirmed = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg, 0);
  const totalProvisional = truck.gradeInventory.reduce((s, g) => s + g.provisionalKg, 0);
  const isActive = truck.status === 'ACTIVE';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable testID="back-from-detail" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.text, flex: 1, letterSpacing: 0.5 }}>
          {truck.truckNumber}
        </Text>
        <View
          style={{
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            borderRadius: Radius.round,
            backgroundColor: isActive ? '#E8F5E9' : '#F5F5F5',
          }}
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: isActive ? Colors.success : Colors.textSecond }}>
            {truck.status}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View
          style={{
            margin: Spacing.md,
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            padding: Spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md }}>
            <InfoCell label="Sender" value={truck.senderName} />
            <InfoCell label="CHL #" value={truck.chlNumber || '—'} />
            <InfoCell label="Date" value={toIndianDate(truck.date)} />
            <InfoCell label="Total" value={toIndianWeight(truck.totalKg)} />
          </View>

          {/* Large inventory bar */}
          <InventoryBar
            totalKg={truck.totalKg}
            confirmedKg={totalConfirmed}
            provisionalKg={totalProvisional}
          />
        </View>

        {/* Grade breakdown table */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.xs }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecond, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Grade Breakdown
          </Text>
          <Pressable
            testID="edit-grades-button"
            onPress={() => router.push({ pathname: '/trucks/edit-grades', params: { truckId: id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, borderRadius: Radius.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
          >
            <Pencil size={14} color={Colors.primary} />
            <Text style={{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' }}>Edit</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          <View style={{ paddingHorizontal: Spacing.md }}>
            {/* Table header */}
            <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: Colors.border }}>
              {['Grade', 'Total', 'Confirmed', 'Provisional', 'Left'].map((h) => (
                <Text
                  key={h}
                  style={{
                    width: h === 'Grade' ? 90 : 100,
                    fontSize: FontSize.xs,
                    fontWeight: '700',
                    color: Colors.textSecond,
                    textAlign: h === 'Grade' ? 'left' : 'right',
                  }}
                >
                  {h}
                </Text>
              ))}
            </View>

            {truck.gradeInventory.map((g) => {
              const left = g.totalKg - g.confirmedKg - g.provisionalKg;
              const pct = g.totalKg > 0 ? left / g.totalKg : 0;
              const leftColor =
                pct > 0.5 ? Colors.success : pct > 0.25 ? Colors.primary : Colors.danger;
              return (
                <GradeRow key={g.code} grade={g} left={left} leftColor={leftColor} />
              );
            })}
          </View>
        </ScrollView>

        {/* Bill tabs */}
        <View style={{ marginHorizontal: Spacing.md, marginTop: Spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: Colors.border,
              borderRadius: Radius.round,
              padding: 3,
              marginBottom: Spacing.md,
              alignSelf: 'flex-start',
            }}
          >
            {([['all', '📋 सभी बिल'], ['confirmed', '✅ कन्फर्म']] as [BillTab, string][]).map(([key, label]) => (
              <Pressable
                key={key}
                testID={`tab-${key}`}
                onPress={() => setTab(key)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.round,
                  backgroundColor: tab === key ? Colors.surface : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                    color: tab === key ? Colors.text : Colors.textSecond,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {billsLoading ? (
            <ActivityIndicator testID="truck-bills-loading" color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
          ) : (() => {
            const filtered = tab === 'confirmed'
              ? truckBills.filter((b) => b.status === 'CONFIRMED')
              : truckBills;
            if (filtered.length === 0) {
              return (
                <View testID="bills-empty" style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                  <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>📄</Text>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                    {tab === 'all' ? 'No bills yet' : 'No confirmed bills'}
                  </Text>
                </View>
              );
            }
            return (
              <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
                {filtered.map((bill, i) => (
                  <Pressable
                    key={bill.id}
                    testID={`truck-bill-${bill.id}`}
                    onPress={() => router.push(`/bills/${bill.id}` as any)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: Spacing.md,
                      backgroundColor: pressed ? Colors.background : Colors.surface,
                      borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.border,
                      gap: Spacing.sm,
                    })}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary }}>
                        {bill.customerName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }} numberOfLines={1}>
                        {bill.customerName}
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                        {bill.grade} · {bill.sacks} bags
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.round, backgroundColor: STATUS_BG[bill.status] ?? '#F5F5F5' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[bill.status] ?? Colors.textSecond }}>
                          {bill.status}
                        </Text>
                      </View>
                      {bill.netAmount > 0 ? (
                        <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.text }}>
                          {toIndianCurrency(bill.netAmount)}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
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
          bottom: 24,
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

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 80 }}>
      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{label}</Text>
      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{value}</Text>
    </View>
  );
}

function GradeRow({
  grade,
  left,
  leftColor,
}: {
  grade: GradeInventory;
  left: number;
  leftColor: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}
    >
      <View style={{ width: 90 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{grade.code}</Text>
        <Text style={{ fontSize: 10, color: Colors.textSecond }}>{grade.name}</Text>
      </View>
      <Text style={[cell, { color: Colors.text }]}>{toIndianWeight(grade.totalKg)}</Text>
      <Text style={[cell, { color: Colors.success }]}>{toIndianWeight(grade.confirmedKg)}</Text>
      <Text style={[cell, { color: Colors.warning }]}>{toIndianWeight(grade.provisionalKg)}</Text>
      <Text style={[cell, { color: leftColor, fontWeight: '700' }]}>{toIndianWeight(left)}</Text>
    </View>
  );
}

const cell = {
  width: 100,
  fontSize: FontSize.sm as number,
  textAlign: 'right' as const,
};
