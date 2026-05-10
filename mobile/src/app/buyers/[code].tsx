import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, CreditCard, MessageCircle, Phone,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { useBuyers, useBuyerTransactions } from '@/hooks/useBuyers';
import { generateBalanceMessage, openWhatsApp } from '@/utils/whatsapp';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { PaymentMethod, Transaction } from '@/types/inquiry';

type EnrichedTransaction = Transaction & { balanceAfter: number };

function computeRunningBalances(transactions: Transaction[]): EnrichedTransaction[] {
  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  let running = 0;
  const withBalance = sorted.map(txn => {
    if (txn.type === 'SALE') {
      running += txn.amount;
    } else {
      running -= txn.amount;
    }
    return { ...txn, balanceAfter: Math.max(0, running) };
  });
  return withBalance.reverse();
}

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

  const enrichedTransactions = useMemo(
    () => computeRunningBalances(transactions),
    [transactions],
  );

  const totalPurchases = useMemo(
    () => transactions
      .filter(t => t.type === 'SALE')
      .reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  );

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

  const balance = buyer.outstandingBalance;
  const balanceColor = balance > 0 ? Colors.danger : Colors.success;

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
      </View>

      <FlatList
        testID="transactions-list"
        data={enrichedTransactions}
        keyExtractor={t => t.id}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <View style={{
              margin: Spacing.md, borderRadius: Radius.md,
              backgroundColor: Colors.surface,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
              overflow: 'hidden',
            }}>
              {/* Row 1: Outstanding balance */}
              <View style={{
                backgroundColor: balanceColor,
                padding: Spacing.md, alignItems: 'center',
              }}>
                <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                  Outstanding / बकाया
                </Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 4 }}>
                  {toIndianCurrency(balance)}
                </Text>
                <View style={{
                  marginTop: 6,
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: Radius.round, paddingHorizontal: 10, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
                    {balance > 0 ? 'Dr' : balance === 0 ? 'Nil' : 'Cr'}
                  </Text>
                </View>
              </View>

              {/* Row 2: Last payment + Total purchases */}
              <View style={{
                flexDirection: 'row', padding: Spacing.md,
                borderBottomWidth: 1, borderBottomColor: Colors.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '600' }}>
                    Last Payment
                  </Text>
                  {buyer.lastPaymentDate ? (
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginTop: 2 }}>
                      {toIndianCurrency(buyer.lastPaymentAmount ?? 0)}{' '}
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecond }}>
                        on {toIndianDate(buyer.lastPaymentDate)}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecond, marginTop: 2 }}>
                      No payment yet
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '600' }}>
                    Total Purchases
                  </Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginTop: 2 }}>
                    {toIndianCurrency(totalPurchases)}
                  </Text>
                </View>
              </View>

              {/* Row 3: Code + phone + WhatsApp */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                padding: Spacing.sm, paddingHorizontal: Spacing.md, gap: Spacing.sm,
              }}>
                <View style={{
                  backgroundColor: balanceColor,
                  borderRadius: Radius.round, paddingHorizontal: 10, paddingVertical: 3,
                }}>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
                    {buyer.code}
                  </Text>
                </View>
                {buyer.phone ? (
                  <>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, flex: 1 }}>
                      {buyer.phone}
                    </Text>
                    <Pressable
                      testID="whatsapp-icon-btn"
                      onPress={() => openWhatsApp(buyer.phone, generateBalanceMessage(buyer, shop!))}
                      style={{ padding: 4 }}
                    >
                      <MessageCircle size={20} color="#25D366" />
                    </Pressable>
                  </>
                ) : (
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, flex: 1 }}>
                    No phone
                  </Text>
                )}
              </View>
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
        renderItem={({ item }: { item: EnrichedTransaction }) => {
          const isSale = item.type === 'SALE';
          const borderColor = isSale ? Colors.danger : Colors.success;
          const amountColor = isSale ? Colors.danger : Colors.success;

          let description = '';
          let secondLine: string | null = null;

          if (isSale) {
            description = `Sale #${item.slipNumber ?? ''}`;
            if (item.note) description += ` — ${item.note}`;
          } else {
            description = `Payment — ${item.paymentMethod ?? 'Cash'}`;
            if (item.upiRef) {
              secondLine = `Ref: ${item.upiRef}`;
            } else if (item.note) {
              secondLine = item.note;
            }
          }

          return (
            <View style={{
              marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
              backgroundColor: Colors.surface,
              borderRadius: Radius.sm,
              borderLeftWidth: 3, borderLeftColor: borderColor,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
              padding: Spacing.sm, paddingHorizontal: Spacing.md,
            }}>
              {/* Top line */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '600', minWidth: 52 }}>
                  {toIndianDate(item.date)}
                </Text>
                <Text style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                  {description}
                </Text>
              </View>

              {/* Second line */}
              {secondLine ? (
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2, marginLeft: 52 + Spacing.sm }}>
                  {secondLine}
                </Text>
              ) : null}

              {/* Bottom line: DR/CR + BAL */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: amountColor }}>
                  {isSale ? 'DR' : 'CR'} {toIndianCurrency(item.amount)}
                </Text>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecond }}>
                  BAL {toIndianCurrency(item.balanceAfter)}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          enrichedTransactions.length > 0 ? (
            <View style={{
              marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.lg,
              backgroundColor: '#E8E8E8', borderRadius: Radius.sm,
              padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text }}>
                NET BALANCE
              </Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.text }}>
                {toIndianCurrency(balance)}{' '}
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700' }}>
                  {balance > 0 ? 'Dr' : balance === 0 ? 'Nil' : 'Cr'}
                </Text>
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 48 }} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 48 }} testID="transactions-empty">
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecond }}>
                No transactions yet
              </Text>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 4 }}>
                Ledger will show all sales and payments here
              </Text>
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
