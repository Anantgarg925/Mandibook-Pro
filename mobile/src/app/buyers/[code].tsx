import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, CreditCard, MessageCircle,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { useBuyers, useBuyerTransactions } from '@/hooks/useBuyers';
import { generateBalanceMessage, openWhatsApp } from '@/utils/whatsapp';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { PaymentMethod, Transaction } from '@/types/inquiry';

export default function BuyerLedgerScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { shop } = useShop();
  const { getBuyer } = useBuyers();
  const buyer = getBuyer(code);
  const { transactions, loading } = useBuyerTransactions(code);
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [upiRef, setUpiRef] = useState('');
  const [note, setNote] = useState('');

  const paymentMutation = useMutation({
    mutationFn: async (payload: {
      amount: number;
      method: PaymentMethod;
      upiRef: string;
      note: string;
    }) => {
      if (!shop?.shopId || !buyer) throw new Error('Missing shop or buyer');
      const now = Date.now();
      await api.post('/api/transactions', {
        shopId: shop.shopId,
        buyerCode: buyer.code,
        type: 'PAYMENT',
        amount: payload.amount,
        date: now,
        paymentMethod: payload.method,
        upiRef: payload.upiRef || null,
        note: payload.note || null,
        createdAt: now,
      });
      // Update buyer outstanding balance
      await api.put(`/api/buyers/${buyer.code}`, {
        shopId: shop.shopId,
        outstandingBalance: (buyer.outstandingBalance ?? 0) - payload.amount,
        lastPaymentAmount: payload.amount,
        lastPaymentDate: now,
        lastTransactionDate: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      setModalVisible(false);
      setAmount('');
      setUpiRef('');
      setNote('');
      setMethod('CASH');
    },
    onError: () => {
      Alert.alert('Error', 'Could not save payment. Try again.');
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

  if (!buyer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator testID="ledger-loading" color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }} testID="ledger-back">
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          {buyer.name}
        </Text>
        <View style={{
          backgroundColor: buyer.outstandingBalance > 0 ? Colors.danger : Colors.success,
          borderRadius: Radius.round, paddingHorizontal: 10, paddingVertical: 4,
        }}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
            {buyer.code}
          </Text>
        </View>
      </View>

      <FlatList
        testID="transactions-list"
        data={transactions}
        keyExtractor={t => t.id}
        ListHeaderComponent={
          <>
            {/* Balance card */}
            <View style={{
              margin: Spacing.md, borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
              overflow: 'hidden',
            }}>
              <View style={{
                backgroundColor: buyer.outstandingBalance > 0 ? Colors.danger : Colors.success,
                padding: Spacing.md, alignItems: 'center',
              }}>
                <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  Outstanding Balance
                </Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 4 }}>
                  {toIndianCurrency(buyer.outstandingBalance)}
                </Text>
              </View>
              {buyer.phone ? (
                <View style={{ padding: Spacing.sm, alignItems: 'center' }}>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>📞 {buyer.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md }}>
              <Pressable
                testID="record-payment-btn"
                onPress={() => setModalVisible(true)}
                style={({ pressed }) => ({
                  flex: 1, height: 48, borderRadius: Radius.sm,
                  backgroundColor: pressed ? '#1A5276' : Colors.info,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                })}
              >
                <CreditCard size={18} color="#FFF" />
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>
                  Record Payment
                </Text>
              </Pressable>
              {buyer.phone ? (
                <Pressable
                  testID="whatsapp-balance-btn"
                  onPress={() => openWhatsApp(buyer.phone, generateBalanceMessage(buyer, shop!))}
                  style={({ pressed }) => ({
                    flex: 1, height: 48, borderRadius: Radius.sm,
                    backgroundColor: pressed ? '#1B5E20' : '#25D366',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  })}
                >
                  <MessageCircle size={18} color="#FFF" />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>
                    WhatsApp Balance
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={{
              paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
              fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Transactions
            </Text>
          </>
        }
        renderItem={({ item }: { item: Transaction }) => (
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
            backgroundColor: Colors.surface,
            borderBottomWidth: 1, borderBottomColor: Colors.border,
            gap: Spacing.sm,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: Radius.sm,
              backgroundColor: item.type === 'PAYMENT' ? '#E8F5E9' : '#FFEBEE',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{
                fontSize: FontSize.xs, fontWeight: '900',
                color: item.type === 'PAYMENT' ? Colors.success : Colors.danger,
              }}>
                {item.type === 'PAYMENT' ? 'Cr' : 'Dr'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                {item.type === 'PAYMENT'
                  ? `Payment (${item.paymentMethod})`
                  : `Sale #${item.slipNumber ?? ''}`}
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                {toIndianDate(item.date)}
                {item.note ? ` · ${item.note}` : null}
                {item.upiRef ? ` · ${item.upiRef}` : null}
              </Text>
            </View>
            <Text style={{
              fontSize: FontSize.sm, fontWeight: '800',
              color: item.type === 'PAYMENT' ? Colors.success : Colors.danger,
            }}>
              {item.type === 'PAYMENT' ? '-' : '+'}{toIndianCurrency(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 48 }} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48 }} testID="transactions-empty">
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>No transactions yet</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
      />

      {/* Record Payment Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onPress={() => setModalVisible(false)}
          >
            <View
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
                padding: Spacing.md,
              }}
              onStartShouldSetResponder={() => true}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md }}>
                Record Payment
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
                placeholder="0"
                placeholderTextColor={Colors.textSecond}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm, paddingVertical: 12,
                  fontSize: FontSize.lg, fontWeight: '700', color: Colors.text,
                  marginBottom: Spacing.md,
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
                    onPress={() => setMethod(m)}
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
                    placeholder="Transaction ID"
                    placeholderTextColor={Colors.textSecond}
                    style={{
                      borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
                      paddingHorizontal: Spacing.sm, paddingVertical: 10,
                      fontSize: FontSize.sm, color: Colors.text,
                      marginBottom: Spacing.md,
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
                placeholder="Any remark..."
                placeholderTextColor={Colors.textSecond}
                style={{
                  borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm, paddingVertical: 10,
                  fontSize: FontSize.sm, color: Colors.text,
                  marginBottom: Spacing.lg,
                }}
              />

              <Pressable
                testID="save-payment-btn"
                onPress={handleSavePayment}
                disabled={paymentMutation.isPending}
                style={({ pressed }) => ({
                  height: 52, borderRadius: Radius.sm,
                  backgroundColor: paymentMutation.isPending ? Colors.border : pressed ? '#1A5276' : Colors.info,
                  alignItems: 'center', justifyContent: 'center',
                })}
              >
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#FFF' }}>
                  {paymentMutation.isPending ? 'Saving...' : 'Save Payment'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
