import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  BackHandler,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Share2, FileText } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { supabase, mapTruck, mapInquiry, mapTruckGradeEntry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianWeight, toIndianDate, toIndianCurrency } from '@/lib/formatters';
import { useMemberMode } from '@/hooks/useMemberMode';
import { archiveQueryOptions } from '@/lib/queryOptions';
import { makeReferenceSlipNumber, mapEntriesToSlipRows, ReferenceSlipCard } from '@/utils/referenceSlip';
import type { Inquiry } from '@/types/inquiry';
import type { TruckGradeEntry } from '@/types/truck';

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
  const queryClient = useQueryClient();
  const isMemberMode = useMemberMode();
  const [tab, setTab] = useState<BillTab>('all');
  const [godownModalVisible, setGodownModalVisible] = useState(false);
  const [godownKg, setGodownKg] = useState('');
  const [wastageKg, setWastageKg] = useState('');
  const [wastageReason, setWastageReason] = useState('');
  const referenceSlipRef = useRef<View>(null);

  const openBill = (bill: Inquiry) => {
    if (bill.status === 'CONFIRMED') {
      router.push(`/slip/${bill.id}` as any);
      return;
    }
    if (bill.status === 'PENDING') {
      if (isMemberMode) {
        router.push(`/bills/${bill.id}` as any);
        return;
      }
      router.push({ pathname: '/authorization', params: { id: bill.id } } as any);
      return;
    }
    router.push(`/bills/${bill.id}` as any);
  };

  const goBack = () => {
    if (isMemberMode) {
      router.replace('/member-trucks' as any);
      return;
    }
    router.replace('/(tabs)/trucks' as any);
  };

  useEffect(() => {
    if (isMemberMode === undefined) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace((isMemberMode ? '/member-trucks' : '/(tabs)/trucks') as any);
      return true;
    });
    return () => subscription.remove();
  }, [isMemberMode, router]);

  const { data: truck } = useQuery({
    queryKey: ['truck', shop?.shopId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('id', id)
        .eq('shop_id', shop!.shopId)
        .single();
      if (error) throw new Error(error.message);
      return mapTruck(data as Record<string, unknown>);
    },
    enabled: !!shop?.shopId && !!id,
    ...archiveQueryOptions,
  });

  const { data: truckBills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['inquiries', shop?.shopId, 'truck', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('truck_id', id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapInquiry(r as Record<string, unknown>)) as Inquiry[];
    },
    enabled: !!shop?.shopId && !!id,
    ...archiveQueryOptions,
  });

  const { data: truckGradeEntries = [] } = useQuery({
    queryKey: ['truck-grade-entries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('truck_grade_entries')
        .select('*')
        .eq('truck_id', id)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapTruckGradeEntry(r as Record<string, unknown>)) as TruckGradeEntry[];
    },
    enabled: !!id,
    ...archiveQueryOptions,
  });

  const moveToGodownMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !truck) return;
      const rows = truckBills.filter((bill) => bill.status !== 'CANCELLED');
      const soldKg = rows.reduce((s, bill) => s + bill.totalWeight, 0);
      const currentAvailableKg = Math.max(0, truck.totalKg - soldKg - (truck.wastageKg || 0));
      const godownWeight = parseFloat(godownKg) || 0;
      const lossWeight = parseFloat(wastageKg) || 0;
      if (truck.status !== 'ACTIVE' || truck.isGodown) return;
      if (godownWeight <= 0) throw new Error('Enter godown weight.');
      if (godownWeight + lossWeight > currentAvailableKg) {
        throw new Error('Godown + loss cannot be more than remaining stock.');
      }
      if (Math.abs(godownWeight + lossWeight - currentAvailableKg) > 0.01) {
        throw new Error('Godown + loss must match the remaining stock.');
      }
      const now = Date.now();
      const shortDate = new Date(now).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const label = `Godown - ${shop.commodity} - ${shortDate}`;
      const { error: insertError } = await supabase.from('trucks').insert({
        shop_id: shop.shopId,
        truck_number: label,
        sender_name: truck.senderName || 'Godown',
        sender_code: truck.senderCode || 'GODOWN',
        chl_number: truck.chlNumber || '',
        total_kg: godownWeight,
        freight_amount: 0,
        grade_inventory: truck.gradeInventory,
        is_godown: true,
        godown_date: now,
        source_truck_id: truck.id,
        source_agent_name: truck.sourceAgentName || '',
        source_agent_phone: truck.sourceAgentPhone || '',
        status: 'ACTIVE',
        date: now,
        created_at: now,
      });
      if (insertError) throw new Error(insertError.message);

      const { error: updateError } = await supabase
        .from('trucks')
        .update({
          status: 'CLOSED',
          wastage_kg: (truck.wastageKg || 0) + lossWeight,
          wastage_reason: wastageReason.trim(),
          gate_out_time: now,
        })
        .eq('id', truck.id)
        .eq('shop_id', shop.shopId);
      if (updateError) throw new Error(updateError.message);
    },
    onSuccess: () => {
      setGodownModalVisible(false);
      setGodownKg('');
      setWastageKg('');
      setWastageReason('');
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['truck', shop?.shopId, id] });
    },
    onError: (error) => {
      Alert.alert('Godown entry failed', error instanceof Error ? error.message : 'Please check the weights and try again.');
    },
  });

  const shareReferenceSlip = async () => {
    if (!referenceSlipRef.current) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Reference slip sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(referenceSlipRef, { format: 'jpg', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
        dialogTitle: 'Share reference slip',
      });
    } catch {
      Alert.alert('Reference Slip', 'Could not create the reference slip image.');
    }
  };

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

  const billRows = truckBills.filter((bill) => bill.status !== 'CANCELLED');
  const totalConfirmed = billRows
    .filter((bill) => bill.status === 'CONFIRMED')
    .reduce((s, bill) => s + bill.totalWeight, 0);
  const totalProvisional = billRows
    .filter((bill) => bill.status === 'PENDING')
    .reduce((s, bill) => s + bill.totalWeight, 0);
  const totalKg = truck.totalKg;
  const isActive = truck.status === 'ACTIVE';
  const referenceSlipNumber = truck.referenceSlipNumber ?? makeReferenceSlipNumber(new Date(truck.createdAt));
  const slipStatus = truckBills.some((bill) => bill.slipStatus === 'authorized' || bill.status === 'CONFIRMED') ? 'authorized' : 'draft';

  const confirmedPct = totalKg > 0 ? Math.min(totalConfirmed / totalKg, 1) : 0;
  const provisionalPct = totalKg > 0 ? Math.min(totalProvisional / totalKg, 1 - confirmedPct) : 0;
  const wastageTotal = truck.wastageKg || 0;
  const availableKg = Math.max(0, totalKg - totalConfirmed - totalProvisional - wastageTotal);
  const wastagePct = totalKg > 0 ? Math.min(wastageTotal / totalKg, 1 - confirmedPct - provisionalPct) : 0;
  const availablePct = totalKg > 0 ? Math.max(0, 1 - confirmedPct - provisionalPct - wastagePct) : 0;
  const gradeRows = (shop?.grades ?? truck.gradeInventory).map((grade) => {
    const rows = billRows.filter((bill) => bill.grade === grade.code);
    return {
      code: grade.code,
      name: grade.name,
      sacks: rows.reduce((s, bill) => s + bill.sacks, 0),
      confirmedKg: rows
        .filter((bill) => bill.status === 'CONFIRMED')
        .reduce((s, bill) => s + bill.totalWeight, 0),
      provisionalKg: rows
        .filter((bill) => bill.status === 'PENDING')
        .reduce((s, bill) => s + bill.totalWeight, 0),
    };
  }).filter((row) => row.sacks > 0 || row.confirmedKg > 0 || row.provisionalKg > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: 14,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="back-from-detail" onPress={goBack} style={{ padding: 4, marginRight: Spacing.sm }}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#FFFFFF', letterSpacing: Platform.OS === 'android' ? 0 : 0.3 }}>
            {truck.truckNumber}
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.8)', marginTop: 1 }}>
            {truck.senderName}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Share.share({ message: `Truck: ${truck.truckNumber}\nSender: ${truck.senderName}\nCHL: ${truck.chlNumber}` })
          }
          style={{ padding: 8, marginRight: 4 }}
        >
          <Share2 size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Card */}
        <View
          style={{
            marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
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
            {wastagePct > 0 ? (
              <View
                style={{
                  flex: wastagePct,
                  minWidth: wastagePct > 0 ? 4 : 0,
                  backgroundColor: '#B71C1C',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                {wastagePct >= 0.12 ? (
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                    {toIndianWeight(wastageTotal)}
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
            <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#B71C1C' }} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>Loss</Text>
              </View>
              <Text style={{ fontSize: 9, color: '#64748B' }}>खराब/सूखा</Text>
            </View>
          </View>
          {wastageTotal > 0 ? (
            <Text style={{ fontSize: FontSize.xs, color: Colors.warning, marginTop: Spacing.sm }}>
              Loss excluded from godown: {toIndianWeight(wastageTotal)}
              {truck.wastageReason ? ` - ${truck.wastageReason}` : ''}
            </Text>
          ) : null}
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
            Sold by Grade / ग्रेड के अनुसार बिक्री
          </Text>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
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
                    { label: 'Sacks', width: 90, align: 'right' as const },
                    { label: 'Conf.', width: 90, align: 'right' as const },
                    { label: 'Pend.', width: 90, align: 'right' as const },
                    { label: 'Sold', width: 90, align: 'right' as const },
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

                {gradeRows.length === 0 ? (
                  <View style={{ padding: Spacing.md }}>
                    <Text style={{ fontSize: FontSize.sm, color: '#64748B' }}>No bills yet for this truck.</Text>
                  </View>
                ) : gradeRows.map((g, i) => {
                  const sold = g.confirmedKg + g.provisionalKg;
                  return (
                    <GradeRow
                      key={g.code}
                      grade={g}
                      sold={sold}
                      isLast={i === gradeRows.length - 1}
                    />
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        {truckGradeEntries.length > 0 ? (
          <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: Spacing.sm }}>
              Grade-wise Weight Breakdown
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {truckGradeEntries.map((entry) => (
                <View key={entry.id} style={{ width: '48%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, backgroundColor: '#FFFFFF' }}>
                  <Text style={{ fontSize: FontSize.xs, color: '#64748B' }}>Grade</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: Colors.text }}>{entry.gradeLabel}</Text>
                  <Text style={{ fontSize: FontSize.xs, color: '#64748B', marginTop: 4 }}>Weight</Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: Colors.primary }}>{toIndianWeight(entry.weightKg)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {availableKg > 0 && !truck.isGodown && truck.status === 'ACTIVE' ? (
          <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.lg }}>
            <Pressable
              testID="move-to-godown"
              onPress={() => {
                setGodownKg(String(Math.round(availableKg * 100) / 100));
                setWastageKg('');
                setWastageReason('');
                setGodownModalVisible(true);
              }}
              disabled={moveToGodownMutation.isPending}
              style={{ minHeight: 48, borderRadius: 8, backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: '#FFF' }}>
                Move to Godown / खराब वजन घटाकर
              </Text>
            </Pressable>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 6 }}>
              Remaining before loss: {toIndianWeight(availableKg)}. Enter actual godown and rotten/dry loss next.
            </Text>
          </View>
        ) : null}

        {/* Bills Section */}
        <View style={{ paddingHorizontal: Spacing.md }}>
          {/* Tab pills */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#e6f6ff',
              borderRadius: 14,
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
                  borderRadius: 12,
                  backgroundColor: tab === key ? '#FFFFFF' : 'transparent',
                  shadowColor: tab === key ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: tab === key ? 0.05 : 0,
                  shadowRadius: 3,
                  elevation: tab === key ? 1 : 0,
                  borderWidth: tab === key ? 1 : 0,
                  borderColor: tab === key ? '#E5E7EB' : 'transparent',
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
              <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
                {filtered.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onPress={() => openBill(bill)}
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
          bottom: 40 + insets.bottom,
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
      <View style={{ position: 'absolute', left: -1200, top: 0 }}>
        <View ref={referenceSlipRef} collapsable={false}>
          <ReferenceSlipCard
            shop={shop}
            slipNumber={referenceSlipNumber}
            generatedAt={truck.createdAt}
            itemName={shop?.commodity ?? 'Item'}
            truckNumber={truck.truckNumber}
            totalKg={truck.totalKg}
            gradeRows={mapEntriesToSlipRows(truckGradeEntries)}
            status={slipStatus}
          />
        </View>
      </View>

      <Modal
        visible={godownModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGodownModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.md, paddingBottom: insets.bottom + Spacing.md }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.text }}>Move Stock to Godown</Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
              Remaining stock: {toIndianWeight(availableKg)} = godown weight + loss weight
            </Text>

            <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond, marginTop: Spacing.md, marginBottom: 6 }}>
              Actual godown weight (kg)
            </Text>
            <TextInput
              testID="godown-kg-input"
              style={{ height: 52, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text }}
              value={godownKg}
              onChangeText={setGodownKg}
              keyboardType="decimal-pad"
              placeholder="e.g. 220"
              placeholderTextColor={Colors.textSecond}
            />

            <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond, marginTop: Spacing.md, marginBottom: 6 }}>
              Rotten / dry / shortage loss (kg)
            </Text>
            <TextInput
              testID="godown-wastage-input"
              style={{ height: 52, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, fontSize: FontSize.md, color: Colors.text }}
              value={wastageKg}
              onChangeText={(value) => {
                setWastageKg(value);
                const loss = parseFloat(value) || 0;
                setGodownKg(String(Math.max(0, Math.round((availableKg - loss) * 100) / 100)));
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textSecond}
            />

            <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond, marginTop: Spacing.md, marginBottom: 6 }}>
              Loss reason
            </Text>
            <TextInput
              testID="godown-wastage-reason"
              style={{ minHeight: 52, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: Colors.text }}
              value={wastageReason}
              onChangeText={setWastageReason}
              placeholder="Drying, rotten fruit, shortage..."
              placeholderTextColor={Colors.textSecond}
            />

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => setGodownModalVisible(false)}
                style={{ flex: 1, minHeight: 52, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: Colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="confirm-move-to-godown"
                onPress={() => moveToGodownMutation.mutate()}
                disabled={moveToGodownMutation.isPending}
                style={{ flex: 1, minHeight: 52, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', opacity: moveToGodownMutation.isPending ? 0.7 : 1 }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: '#FFFFFF' }}>
                  {moveToGodownMutation.isPending ? 'Saving...' : 'Create Godown'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function GradeRow({
  grade,
  sold,
  isLast,
}: {
  grade: {
    code: string;
    name: string;
    sacks: number;
    confirmedKg: number;
    provisionalKg: number;
  };
  sold: number;
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
        {grade.sacks}
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
          {toIndianWeight(sold)}
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
        borderRadius: 14,
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
