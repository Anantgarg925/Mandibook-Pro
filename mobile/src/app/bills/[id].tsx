import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianDate, toIndianWeight } from '@/lib/formatters';
import type { Inquiry } from '@/types/inquiry';

const STATUS_COLOR: Record<string, string> = {
  PENDING: Colors.warning,
  CONFIRMED: Colors.success,
  CANCELLED: Colors.danger,
};

export default function BillDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const { data: inquiry } = useQuery({
    queryKey: ['inquiry', shop?.shopId, id],
    queryFn: () => api.get<Inquiry>(`/api/inquiries/${id}?shopId=${shop!.shopId}`),
    enabled: !!shop?.shopId && !!id,
    refetchInterval: 10000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'CONFIRMED' | 'CANCELLED') =>
      api.put(`/api/inquiries/${id}`, { shopId: shop!.shopId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiry', shop?.shopId, id] });
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
    },
  });

  const updateStatus = (status: 'CONFIRMED' | 'CANCELLED') => {
    if (!shop?.shopId || !id) return;
    statusMutation.mutate(status);
  };

  if (!inquiry) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <Text style={{ color: Colors.textSecond }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLOR[inquiry.status] ?? Colors.textSecond;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
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
        <Pressable testID="back-from-bill-detail" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.text }}>
          Slip #{inquiry.slipNumber}
        </Text>
        <View
          style={{
            paddingHorizontal: Spacing.sm,
            paddingVertical: 4,
            borderRadius: Radius.round,
            backgroundColor: inquiry.status === 'CONFIRMED' ? '#E8F5E9' : inquiry.status === 'PENDING' ? '#FFF8E1' : '#FFEBEE',
          }}
        >
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: statusColor }}>
            {inquiry.status}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Main card */}
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            padding: Spacing.md,
            marginBottom: Spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
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
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            padding: Spacing.md,
            marginBottom: Spacing.md,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
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
              backgroundColor: Colors.surface,
              borderRadius: Radius.md,
              padding: Spacing.md,
              marginBottom: Spacing.md,
              borderLeftWidth: 4,
              borderLeftColor: Colors.success,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
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
      </ScrollView>

      {/* Action buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          gap: Spacing.xs,
          padding: Spacing.md,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        }}
      >
        {inquiry.status === 'PENDING' ? (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Pressable
              testID="cancel-bill-button"
              onPress={() => updateStatus('CANCELLED')}
              disabled={statusMutation.isPending}
              style={{
                flex: 1,
                height: 48,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.danger,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, color: Colors.danger, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
            <Pressable
              testID="confirm-bill-button"
              onPress={() => updateStatus('CONFIRMED')}
              disabled={statusMutation.isPending}
              style={{
                flex: 2,
                height: 48,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Colors.success,
              }}
            >
              <Text style={{ fontSize: FontSize.md, color: '#FFF', fontWeight: '700' }}>✅ Confirm</Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable
          testID="view-slip-button"
          onPress={() => router.push(`/slip/${id}` as any)}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: Radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: pressed ? '#005a10' : '#00450d',
          })}
        >
          <FileText size={18} color="#FFF" />
          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}>
            View Delivery Slip / डिलीवरी स्लिप
          </Text>
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
