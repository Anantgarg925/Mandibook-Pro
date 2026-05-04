import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, Linking } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { writeBatch, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '@/lib/firebase';
import { useShop } from '@/context/ShopContext';
import PaymentSelector from './PaymentSelector';
import { calculateCharges } from '@/utils/calculations';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency } from '@/lib/formatters';
import type { Inquiry, PaymentMode } from '@/types/inquiry';

type Props = { inquiry: Inquiry };

export default function PendingInquiryCard({ inquiry }: Props) {
  const router = useRouter();
  const { shop } = useShop();
  const [rate, setRate] = useState(inquiry.ratePerKg > 0 ? String(inquiry.ratePerKg) : '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(inquiry.paymentMode);
  const [upiRef, setUpiRef] = useState(inquiry.upiRef);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authorizing, setAuthorizing] = useState(false);
  const lastTapRef = useRef<number>(0);
  const shakeRate = useSharedValue(0);

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

  const shake = (sv: typeof shakeRate) => {
    sv.value = withSequence(
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(6, { duration: 55 }),
      withTiming(0, { duration: 55 })
    );
  };

  const handleAuthorize = async () => {
    if (!shop?.shopId || authorizing) return;
    const now = Date.now();
    if (now - lastTapRef.current < 3000) return;
    lastTapRef.current = now;

    const e: Record<string, string> = {};
    if (!rate.trim() || rateNum <= 0) e.rate = 'रेट डालें';
    setErrors(e);
    if (e.rate) { shake(shakeRate); return; }

    setAuthorizing(true);
    // 1-second visual pause (double-tap guard)
    await new Promise((r) => setTimeout(r, 1000));

    const result = calc!;
    const batch = writeBatch(db);

    // 1. Update inquiry
    const inquiryRef = doc(db, 'shops', shop.shopId, 'inquiries', inquiry.id);
    batch.update(inquiryRef, {
      status: 'CONFIRMED',
      authorizedAt: Date.now(),
      ratePerKg: rateNum,
      grossAmount: result.gross,
      apmcAmount: result.apmc,
      bardanaAmount: result.bardana,
      cartageAmount: result.cartage,
      netAmount: result.net,
      paymentMode,
      upiRef: upiRef.trim(),
    });

    // 2. Deduct from truck gradeInventory
    try {
      const truckRef = doc(db, 'shops', shop.shopId, 'trucks', inquiry.truckId);
      // We'll do the deduction outside the batch to read current state first
      batch.commit().then(async () => {
        try {
          const { getDoc, updateDoc } = await import('firebase/firestore');
          const truckSnap = await getDoc(truckRef);
          if (truckSnap.exists()) {
            const truck = truckSnap.data();
            const newInventory = (truck.gradeInventory as Array<{
              code: string;
              provisionalKg: number;
              confirmedKg: number;
            }>).map((g) =>
              g.code === inquiry.grade
                ? {
                    ...g,
                    provisionalKg: Math.max(0, g.provisionalKg - result.totalWeight),
                    confirmedKg: g.confirmedKg + result.totalWeight,
                  }
                : g
            );
            await updateDoc(truckRef, { gradeInventory: newInventory });
          }
        } catch { /* best-effort */ }

        // 3. UDHAARI upsert
        if (paymentMode === 'UDHAARI' && inquiry.customerPhone) {
          try {
            const phone = inquiry.customerPhone.replace(/\D/g, '');
            const buyerRef = doc(db, 'shops', shop.shopId, 'buyers', `${shop.shopId}_${phone}`);
            await setDoc(
              buyerRef,
              {
                name: inquiry.customerName,
                phone: inquiry.customerPhone,
                outstandingBalance: result.net,
                lastPurchaseDate: Date.now(),
              },
              { merge: true }
            );
          } catch { /* best-effort */ }
        }
      });
    } catch { /* best-effort */ }

    try {
      await batch.commit();
    } catch (err) {
      setAuthorizing(false);
      setErrors({ rate: 'Save failed. Try again.' });
      return;
    }

    setAuthorizing(false);
    router.push(`/slip/${inquiry.id}`);
  };

  const handleCancel = async () => {
    if (!shop?.shopId) return;
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'shops', shop.shopId, 'inquiries', inquiry.id), {
      status: 'CANCELLED',
    });
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
        <PaymentSelector
          selected={paymentMode}
          onSelect={setPaymentMode}
          upiRef={upiRef}
          onUpiRefChange={setUpiRef}
        />
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
          disabled={authorizing}
          style={({ pressed }) => ({
            flex: 2,
            height: 48,
            borderRadius: Radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              authorizing || pressed
                ? '#1B5E20'
                : Colors.success,
          })}
        >
          {authorizing ? (
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
