import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, CreditCard } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { useBuyers } from '@/hooks/useBuyers';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { PaymentMethod } from '@/types/inquiry';
import { APP_SESSION_KEY } from '@/lib/session';

export default function RecordPaymentScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { shop } = useShop();
  const { getBuyer } = useBuyers();
  const buyer = getBuyer(code);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [upiRef, setUpiRef] = useState('');
  const [note, setNote] = useState('');

  const paymentAmountRef = useRef<TextInput>(null);
  const upiRefInputRef = useRef<TextInput>(null);
  const paymentNoteRef = useRef<TextInput>(null);

  const paymentMutation = useMutation({
    mutationFn: async (payload: {
      amount: number;
      method: PaymentMethod;
      upiRef: string;
      note: string;
    }) => {
      if (!shop?.shopId || !buyer) throw new Error('Missing shop or buyer');
      const rawSession = await AsyncStorage.getItem(APP_SESSION_KEY);
      const sessionToken = rawSession
        ? (JSON.parse(rawSession) as { sessionToken?: string }).sessionToken
        : undefined;
      if (!sessionToken) throw new Error('Please unlock the app again before recording payment.');
      const { error } = await supabase.rpc('record_buyer_payment', {
        p_shop_id: shop.shopId,
        p_buyer_code: buyer.code,
        p_amount: payload.amount,
        p_method: payload.method,
        p_upi_ref: payload.upiRef || null,
        p_note: payload.note || null,
        p_session_token: sessionToken,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['cash-entries', shop?.shopId] });
      router.back();
    },
    onError: (err) => {
      Alert.alert('Error', 'Could not save payment. Try again.');
      console.error(err);
    },
  });

  const handleSavePayment = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    paymentMutation.mutate({ amount: amt, method, upiRef, note });
  };

  if (!buyer) return null;

  const content = (
    <>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: Spacing.md,
          paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing.xl),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 14,
          borderWidth: 1, borderColor: '#E5E7EB',
          padding: Spacing.md,
        }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md }}>
            Payment from {buyer.name}
          </Text>

          {/* Amount */}
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>
            AMOUNT (₹)
          </Text>
          <TextInput
            testID="payment-amount-input"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            ref={paymentAmountRef}
            returnKeyType="next"
            onSubmitEditing={() => (method === 'UPI' ? upiRefInputRef.current?.focus() : paymentNoteRef.current?.focus())}
            placeholder="0"
            placeholderTextColor={Colors.textSecond}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
              paddingHorizontal: Spacing.sm, paddingVertical: 12,
              fontSize: FontSize.lg, fontWeight: '700', color: Colors.text,
              marginBottom: Spacing.md,
              backgroundColor: Colors.surface,
            }}
          />

          {/* Method chips */}
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>
            PAYMENT METHOD
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            {(['CASH', 'UPI', 'CHEQUE'] as PaymentMethod[]).map(m => (
              <Pressable
                key={m}
                testID={`method-${m}`}
                onPress={() => {
                  setMethod(m);
                  if (m === 'UPI') {
                    upiRefInputRef.current?.focus();
                  } else {
                    paymentNoteRef.current?.focus();
                  }
                }}
                style={{
                  flex: 1, height: 40, borderRadius: Radius.sm,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: method === m ? Colors.info : Colors.background,
                  borderWidth: 1, borderColor: method === m ? Colors.info : Colors.border,
                }}
              >
                <Text style={{
                  fontSize: FontSize.xs, fontWeight: '700',
                  color: method === m ? '#FFF' : Colors.textSecond,
                }}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* UPI ref */}
          {method === 'UPI' ? (
            <>
              <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>
                UPI REFERENCE (optional)
              </Text>
              <TextInput
                testID="upi-ref-input"
                value={upiRef}
                onChangeText={setUpiRef}
                ref={upiRefInputRef}
                returnKeyType="next"
                onSubmitEditing={() => paymentNoteRef.current?.focus()}
                placeholder="Transaction ID"
                placeholderTextColor={Colors.textSecond}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm, paddingVertical: 10,
                  fontSize: FontSize.sm, color: Colors.text,
                  marginBottom: Spacing.md,
                  backgroundColor: Colors.surface,
                }}
              />
            </>
          ) : null}

          {/* Note */}
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>
            NOTE (optional)
          </Text>
          <TextInput
            testID="payment-note-input"
            value={note}
            onChangeText={setNote}
            ref={paymentNoteRef}
            returnKeyType="done"
            placeholder="Any remark..."
            placeholderTextColor={Colors.textSecond}
            style={{
              borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
              paddingHorizontal: Spacing.sm, paddingVertical: 10,
              fontSize: FontSize.sm, color: Colors.text,
              marginBottom: Spacing.sm,
              backgroundColor: Colors.surface,
            }}
          />
        </View>

        <Pressable
          testID="save-payment-btn"
          onPress={handleSavePayment}
          disabled={paymentMutation.isPending}
          style={{ marginTop: Spacing.md }}
        >
          {({ pressed }) => (
            <View
              style={{
                height: 56,
                borderRadius: Radius.sm,
                backgroundColor: paymentMutation.isPending ? '#cccccc' : pressed ? '#00450D' : '#1b5e20',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                elevation: 3,
              }}
            >
              {paymentMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <CreditCard size={20} color="#FFFFFF" />
                  <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 }}>
                    RECORD PAYMENT
                  </Text>
                </>
              )}
            </View>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
          paddingHorizontal: Spacing.md, paddingVertical: 14,
          backgroundColor: Colors.primary,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }} testID="payment-back">
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
            Record Payment
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1, position: 'relative' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
