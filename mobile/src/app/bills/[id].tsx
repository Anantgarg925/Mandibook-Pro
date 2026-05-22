import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Pencil } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase, mapInquiry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate, toIndianWeight } from '@/lib/formatters';
import { useMemberMode } from '@/hooks/useMemberMode';
import { archiveQueryOptions } from '@/lib/queryOptions';

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.danger,
};

export default function BillDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const isMemberMode = useMemberMode();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (isMemberMode) {
      router.replace('/member-dashboard' as any);
      return;
    }
    router.replace('/(tabs)/bills' as any);
  };

  useEffect(() => {
    if (isMemberMode === undefined) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace((isMemberMode ? '/member-dashboard' : '/(tabs)/bills') as any);
      return true;
    });
    return () => subscription.remove();
  }, [isMemberMode, router]);

  const { data: inquiry } = useQuery({
    queryKey: ['inquiry', shop?.shopId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .eq('shop_id', shop!.shopId)
        .single();
      if (error) throw new Error(error.message);
      return mapInquiry(data as Record<string, unknown>);
    },
    enabled: !!shop?.shopId && !!id,
    ...archiveQueryOptions,
  });

  useEffect(() => {
    if (!inquiry || isMemberMode === undefined || isMemberMode) return;
    if (inquiry.status === 'CONFIRMED') {
      router.replace(`/slip/${inquiry.id}` as any);
    } else if (inquiry.status === 'PENDING') {
      router.replace({ pathname: '/authorization', params: { id: inquiry.id } } as any);
    }
  }, [inquiry, isMemberMode, router]);

  if (!inquiry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff', alignItems: 'center', justifyContent: 'center' }} edges={['top', 'left', 'right']}>
        <Text style={{ color: Colors.textSecond }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLOR[inquiry.status] ?? Colors.textSecond;
  const isReferenceSlip = inquiry.status !== 'CONFIRMED';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'left', 'right']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="back-from-bill-detail" onPress={goBack} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: '#FFFFFF' }}>
          Slip #{inquiry.slipNumber}
        </Text>
        <View
          style={{
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            borderRadius: Radius.round,
            backgroundColor: inquiry.status === 'CONFIRMED' ? 'rgba(255, 255, 255, 0.2)' : inquiry.status === 'PENDING' ? '#FFF8E1' : '#FFEBEE',
          }}
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: inquiry.status === 'CONFIRMED' ? '#FFFFFF' : statusColor }}>
            {inquiry.status}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.md }} showsVerticalScrollIndicator={false}>
        {/* Main card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: Spacing.md,
            marginBottom: Spacing.md,
          }}
        >
          <Row label="Customer" value={inquiry.customerName} />
          {inquiry.customerPhone ? <Row label="Phone" value={inquiry.customerPhone} /> : null}
          <Row label="Truck" value={inquiry.truckNumber} />
          <Row label="Date" value={toIndianDate(inquiry.date)} />
          <Row label="Payment" value={inquiry.paymentMode} />
          {inquiry.upiRef ? <Row label="UPI Ref" value={inquiry.upiRef} /> : null}
        </View>

        {/* Grade & Weight */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: Spacing.md,
            marginBottom: Spacing.md,
          }}
        >
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm }}>
            {inquiry.grade} — {inquiry.gradeName}
          </Text>
          <Row label="Sacks" value={String(inquiry.sacks)} />
          <Row label="Weight/Sack" value={`${inquiry.weightPerSack} kg`} />
          <Row label="Total Weight" value={toIndianWeight(inquiry.totalWeight)} />
        </View>

        {/* Financial breakdown */}
        {inquiry.ratePerKg > 0 ? (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderLeftWidth: 4,
              borderLeftColor: Colors.success,
              padding: Spacing.md,
              marginBottom: Spacing.md,
            }}
          >
            <Row label="Rate" value={`₹${inquiry.ratePerKg}/kg`} />
            <Row label="Gross" value={toIndianCurrency(inquiry.grossAmount)} />
            <Row label="APMC" value={`−${toIndianCurrency(inquiry.apmcAmount)}`} valueColor={Colors.danger} />
            <Row label="Bardana" value={`−${toIndianCurrency(inquiry.bardanaAmount)}`} valueColor={Colors.danger} />
            {inquiry.cartageAmount > 0 ? (
              <Row label="Cartage" value={`−${toIndianCurrency(inquiry.cartageAmount)}`} valueColor={Colors.danger} />
            ) : null}
            <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs }} />
            <Row label="Net Amount" value={toIndianCurrency(inquiry.netAmount)} bold />
          </View>
        ) : null}
        {isReferenceSlip ? (
          <View style={{ backgroundColor: '#FFF8E1', borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: '#FBBF24' }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: '#7E5700' }}>
              Reference slip only
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: '#7E5700', marginTop: 4 }}>
              This is pending authorization and is not a final bill.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Action buttons */}
      <View
        style={{
          gap: Spacing.xs,
          padding: Spacing.md,
          paddingBottom: Math.max(Spacing.md, insets.bottom + Spacing.sm),
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        }}
      >
        {isMemberMode === true && inquiry.status === 'PENDING' ? (
          <Pressable
            testID="edit-bill-button"
            onPress={() => router.push(`/bills/edit/${id}` as any)}
          >
            {({ pressed }) => (
              <View style={{
                height: 52,
                borderRadius: Radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: pressed ? '#0A3B8A' : Colors.info,
              }}>
                <Pencil size={18} color="#FFF" />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}
                >
                  Edit Bill / बिल संपादित करें
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
        <Pressable
          testID="view-slip-button"
          onPress={() => router.push(`/slip/${id}` as any)}
        >
          {({ pressed }) => (
            <View style={{
              height: 52,
              borderRadius: Radius.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
            }}>
              <FileText size={18} color="#FFF" />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}
              >
                {isReferenceSlip ? 'View Reference Slip / संदर्भ पर्ची' : 'View Authorized Bill / अधिकृत बिल'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  valueColor,
  bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>{label}</Text>
      <Text
        style={{
          fontSize: FontSize.sm,
          color: valueColor ?? Colors.text,
          fontWeight: bold ? '700' : '400',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
