import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateCode } from '@/utils/buyerCode';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { useBuyers } from '@/hooks/useBuyers';
import PaymentSelector from './PaymentSelector';
import { calculateCharges } from '@/utils/calculations';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import type { Inquiry, PaymentMode, Buyer } from '@/types/inquiry';
import type { Truck } from '@/types/truck';

type Props = { inquiry: Inquiry };

export default function PendingInquiryCard({ inquiry }: Props) {
  const router = useRouter();
  const { shop } = useShop();
  const { buyers } = useBuyers();
  const queryClient = useQueryClient();

  const [rate, setRate] = useState(inquiry.ratePerKg > 0 ? String(inquiry.ratePerKg) : '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(inquiry.paymentMode);
  const [upiRef, setUpiRef] = useState(inquiry.upiRef);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const lastTapRef = useRef<number>(0);
  const shakeRate = useSharedValue(0);
  const shakePayment = useSharedValue(0);

  const charges = shop?.charges;
  const rateNum = parseFloat(rate) || 0;

  const calc = useMemo(() => {
    if (!charges || rateNum <= 0) return null;
    return calculateCharges({
      sacks: inquiry.sacks,
      weightPerSack: inquiry.weightPerSack,
      ratePerKg: rateNum,
      charges: {
        apmcPct: charges.apmcCommission,
        bardanaPerSack: charges.bardanaPerSack,
        cartagePerKg: charges.cartagePerKg,
      },
    });
  }, [rateNum, charges, inquiry.sacks, inquiry.weightPerSack]);

  const shakeRateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeRate.value }],
  }));

  const shakePaymentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakePayment.value }],
  }));

  const shake = (sv: typeof shakeRate) => {
    sv.value = withSequence(
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(6, { duration: 55 }),
      withTiming(0, { duration: 55 })
    );
  };

  const authorizeMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !calc) throw new Error('Missing data');
      const result = calc;
      const now = Date.now();

      // 1. Update inquiry status
      await api.put(`/api/inquiries/${inquiry.id}`, {
        shopId: shop.shopId,
        status: 'CONFIRMED',
        authorizedAt: now,
        ratePerKg: rateNum,
        grossAmount: result.gross,
        apmcAmount: result.apmc,
        bardanaAmount: result.bardana,
        cartageAmount: result.cartage,
        netAmount: result.net,
        paymentMode,
        upiRef: upiRef.trim(),
      });

      // 2. Update truck gradeInventory — move from provisional to confirmed
      const weight = inquiry.totalWeight;
      const truck = await api.get<Truck>(`/api/trucks/${inquiry.truckId}?shopId=${shop.shopId}`);
      const newInventory = truck.gradeInventory.map((g) =>
        g.code === inquiry.grade
          ? {
              ...g,
              provisionalKg: Math.max(0, g.provisionalKg - weight),
              confirmedKg: g.confirmedKg + weight,
            }
          : g
      );
      await api.put(`/api/trucks/${inquiry.truckId}`, {
        gradeInventory: newInventory,
      });

      // 3. Auto-create/update buyer and add SALE transaction (best-effort)
      try {
        const existingCodes = buyers.map((b) => b.code);
        const existingBuyer = buyers.find(
          (b) =>
            (inquiry.customerPhone && b.phone === inquiry.customerPhone) ||
            b.name.toLowerCase() === inquiry.customerName.toLowerCase()
        );

        let buyerCode: string;

        if (!existingBuyer) {
          buyerCode = generateCode(inquiry.customerName, existingCodes);
          await api.post<Buyer>('/api/buyers', {
            shopId: shop.shopId,
            code: buyerCode,
            name: inquiry.customerName,
            phone: inquiry.customerPhone || '',
            outstandingBalance: paymentMode === 'UDHAARI' ? result.net : 0,
            lastTransactionDate: now,
            createdAt: now,
          });
        } else {
          buyerCode = existingBuyer.code;
          await api.put(`/api/buyers/${buyerCode}`, {
            shopId: shop.shopId,
            outstandingBalance:
              paymentMode === 'UDHAARI'
                ? (existingBuyer.outstandingBalance ?? 0) + result.net
                : existingBuyer.outstandingBalance ?? 0,
            lastTransactionDate: now,
          });
        }

        await api.post('/api/transactions', {
          shopId: shop.shopId,
          buyerCode,
          type: 'SALE',
          amount: result.net,
          date: now,
          slipNumber: inquiry.slipNumber,
          createdAt: now,
        });
      } catch { /* best-effort */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      router.push(`/slip/${inquiry.id}`);
    },
    onError: () => {
      setErrors({ rate: 'Save failed. Try again.' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId) throw new Error('Missing shop');
      await api.put(`/api/inquiries/${inquiry.id}`, {
        shopId: shop.shopId,
        status: 'CANCELLED',
      });
      // Return provisional weight back to available
      try {
        const truck = await api.get<Truck>(`/api/trucks/${inquiry.truckId}?shopId=${shop.shopId}`);
        const newInventory = truck.gradeInventory.map((g) =>
          g.code === inquiry.grade
            ? { ...g, provisionalKg: Math.max(0, g.provisionalKg - inquiry.totalWeight) }
            : g
        );
        await api.put(`/api/trucks/${inquiry.truckId}`, {
          gradeInventory: newInventory,
        });
      } catch { /* best-effort for cancel */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
    },
  });

  const handleAuthorize = async () => {
    if (!shop?.shopId || authorizeMutation.isPending) return;
    const now = Date.now();
    if (now - lastTapRef.current < 3000) return;
    lastTapRef.current = now;

    const e: Record<string, string> = {};
    if (!rate.trim() || rateNum <= 0) e.rate = 'रेट डालें / Enter rate';
    if (paymentMode === 'PENDING') e.payment = 'भुगतान मोड चुनें / Select payment mode';
    setErrors(e);
    if (Object.keys(e).length > 0) {
      if (e.rate) shake(shakeRate);
      if (e.payment) shake(shakePayment);
      return;
    }

    // 1-second visual pause (double-tap guard)
    await new Promise((r) => setTimeout(r, 1000));
    authorizeMutation.mutate();
  };

  const handleCancel = () => {
    if (!shop?.shopId) return;
    cancelMutation.mutate();
  };

  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        margin: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        overflow: 'hidden',
      }}
    >
      {/* Row 1: slip# + status */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingTop: Spacing.md,
          paddingBottom: Spacing.xs,
        }}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>
          Bill #{inquiry.slipNumber}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#FFF8E1',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: Radius.round,
          }}
        >
          <Text style={{ fontSize: FontSize.xs }}>🕐</Text>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning }}>
            PENDING
          </Text>
        </View>
      </View>

      {/* Row 2: customer + phone */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.xs,
        }}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 }}>
          {inquiry.customerName}
        </Text>
        {inquiry.customerPhone ? (
          <Pressable
            testID={`call-${inquiry.id}`}
            onPress={() => Linking.openURL(`tel:${inquiry.customerPhone}`)}
            style={{ padding: 4 }}
          >
            <Text style={{ fontSize: FontSize.sm }}>📞</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Row 3: grade + truck */}
      <Text
        style={{
          fontSize: FontSize.sm,
          color: Colors.textSecond,
          paddingHorizontal: Spacing.md,
          marginBottom: 4,
        }}
      >
        {inquiry.grade} ({inquiry.gradeName}) · {inquiry.truckNumber}
      </Text>

      {/* Row 4: weight info */}
      <Text
        style={{
          fontSize: FontSize.sm,
          color: Colors.textSecond,
          paddingHorizontal: Spacing.md,
          marginBottom: Spacing.md,
        }}
      >
        {inquiry.sacks} × {inquiry.weightPerSack} kg = {inquiry.totalWeight} kg
      </Text>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.border }} />

      {/* Rate input + live calc */}
      <View style={{ padding: Spacing.md }}>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 6 }}>
          Rate / kg (₹)
        </Text>
        <Animated.View style={shakeRateStyle}>
          <TextInput
            testID={`rate-input-${inquiry.id}`}
            disableFullscreenUI={true}
            style={{
              height: 52,
              borderWidth: errors.rate ? 2 : 1,
              borderColor: errors.rate ? Colors.danger : Colors.border,
              borderRadius: Radius.sm,
              paddingHorizontal: Spacing.md,
              fontSize: FontSize.lg,
              fontWeight: '700',
              backgroundColor: Colors.background,
              color: Colors.text,
            }}
            placeholder="₹ ——"
            placeholderTextColor={Colors.border}
            value={rate}
            onChangeText={(v) => {
              setRate(v);
              if (errors.rate) setErrors({});
            }}
            keyboardType="decimal-pad"
          />
          {errors.rate ? (
            <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>
              {errors.rate}
            </Text>
          ) : null}
        </Animated.View>

        {calc ? (
          <View
            style={{
              marginTop: Spacing.sm,
              backgroundColor: Colors.background,
              borderRadius: Radius.sm,
              padding: Spacing.sm,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
              Gross: <Text style={{ fontWeight: '700', color: Colors.text }}>{toIndianCurrency(calc.gross)}</Text>
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
              Net: <Text style={{ fontWeight: '800', color: Colors.success }}>{toIndianCurrency(calc.net)}</Text>
            </Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.border }} />

      {/* Payment selector */}
      <View style={{ padding: Spacing.md }}>
        <Animated.View style={shakePaymentStyle}>
          <PaymentSelector
            selected={paymentMode}
            onSelect={(m) => {
              setPaymentMode(m);
              if (errors.payment) setErrors((prev) => { const { payment, ...rest } = prev; return rest; });
            }}
            upiRef={upiRef}
            onUpiRefChange={setUpiRef}
          />
          {errors.payment ? (
            <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>
              {errors.payment}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.border }} />

      {/* Action buttons */}
      <View
        style={{
          flexDirection: 'row',
          gap: Spacing.sm,
          padding: Spacing.md,
        }}
      >
        <Pressable
          testID={`cancel-inquiry-${inquiry.id}`}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
          style={{
            flex: 1,
            height: 48,
            borderRadius: Radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: Colors.danger,
          }}
        >
          <Text style={{ fontSize: FontSize.sm, color: Colors.danger, fontWeight: '700' }}>
            ❌ रद्द करें
          </Text>
        </Pressable>

        <Pressable
          testID={`authorize-${inquiry.id}`}
          onPress={handleAuthorize}
          disabled={authorizeMutation.isPending}
          style={({ pressed }) => ({
            flex: 2,
            height: 48,
            borderRadius: Radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              authorizeMutation.isPending || pressed
                ? '#1B5E20'
                : Colors.success,
          })}
        >
          {authorizeMutation.isPending ? (
            <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>
              ⏳ Processing…
            </Text>
          ) : (
            <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>
              ✅ AUTHORIZE
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
