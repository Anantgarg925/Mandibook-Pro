import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Linking, ScrollView, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, CreditCard, Eye, FileText, MessageCircle, Phone, Pencil,
  Image as ImageIcon, Plus, Trash2,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { useBuyerBills, useBuyers, useBuyerTransactions } from '@/hooks/useBuyers';
import { shareSlipAsPDF } from '@/utils/printSlip';
import { generateBalanceMessage, generateCustomerMessage, openWhatsApp } from '@/utils/whatsapp';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { computeRunningBalances, type EnrichedTransaction } from '@/lib/ledger';
import type { PaymentMethod, Transaction } from '@/types/inquiry';
import { downloadElementAsJpeg, printHtmlOnWeb } from '@/utils/webExport';

export default function BuyerLedgerScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { shop } = useShop();
  const { getBuyer } = useBuyers();
  const buyer = getBuyer(code);
  const { transactions, loading } = useBuyerTransactions(code);
  const { bills, loading: billsLoading } = useBuyerBills(buyer?.name);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [openingVisible, setOpeningVisible] = useState(false);
  const reminderCardRef = useRef<View>(null);
  const combinedBillRef = useRef<View>(null);
  const [sharingBillId, setSharingBillId] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhones, setEditPhones] = useState<string[]>(['']);
  const [editNotes, setEditNotes] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingType, setOpeningType] = useState<'DR' | 'CR'>('DR');
  const [openingDate, setOpeningDate] = useState('');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null);
  const openingAmountRef = useRef<TextInput>(null);
  const openingDateRef = useRef<TextInput>(null);
  const editPhoneRef = useRef<TextInput>(null);
  const editNotesRef = useRef<TextInput>(null);

  // Transaction edit state
  const [txEditVisible, setTxEditVisible] = useState(false);
  const [txEditId, setTxEditId] = useState<string | null>(null);
  const [txEditAmount, setTxEditAmount] = useState('');
  const [txEditMethod, setTxEditMethod] = useState<PaymentMethod>('CASH');
  const [txEditNote, setTxEditNote] = useState('');
  const [txEditOriginalAmount, setTxEditOriginalAmount] = useState(0);

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

  const dailyGroups = useMemo(() => {
    const groups = new Map<string, typeof bills>();
    bills.forEach((bill) => {
      const key = new Date(bill.date).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), bill]);
    });
    return Array.from(groups.entries()).map(([key, rows]) => ({
      key,
      label: toIndianDate(rows[0]?.date ?? Date.now()),
      rows,
      total: rows.reduce((sum, bill) => sum + bill.netAmount, 0),
    }));
  }, [bills]);

  const activeDailyGroup = dailyGroups.find((g) => g.key === selectedDailyDate) ?? dailyGroups[0];


  const editBuyerMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !buyer) throw new Error('Missing shop or buyer');
      if (!editName.trim()) throw new Error('Name is required');
      const { error } = await supabase.from('buyers').update({
        name: editName.trim(),
        phone: editPhones.map(p => p.trim()).filter(Boolean).join(', '),
        notes: editNotes.trim(),
      }).eq('code', buyer.code).eq('shop_id', shop.shopId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      setEditVisible(false);
    },
    onError: (err) => Alert.alert('Error', (err as Error).message),
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (tx: EnrichedTransaction) => {
      if (!shop?.shopId || !buyer) throw new Error('Missing data');
      // Reverse balance effect: payment was CR, so removing it increases outstanding
      const { data: buyerRow, error: fetchErr } = await supabase
        .from('buyers')
        .select('outstanding_balance, id')
        .eq('shop_id', shop.shopId)
        .eq('code', buyer.code)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);
      await supabase.from('buyers').update({
        outstanding_balance: Number(buyerRow.outstanding_balance) + tx.amount,
      }).eq('id', buyerRow.id);
      const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
    },
    onError: (err) => Alert.alert('Error', (err as Error).message),
  });

  const editTransactionMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !buyer || !txEditId) throw new Error('Missing data');
      const newAmount = parseFloat(txEditAmount);
      if (!newAmount || newAmount <= 0) throw new Error('Enter a valid amount');
      const delta = txEditOriginalAmount - newAmount; // positive = outstanding goes up
      const { data: buyerRow, error: fetchErr } = await supabase
        .from('buyers')
        .select('outstanding_balance, id')
        .eq('shop_id', shop.shopId)
        .eq('code', buyer.code)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);
      await supabase.from('buyers').update({
        outstanding_balance: Number(buyerRow.outstanding_balance) + delta,
      }).eq('id', buyerRow.id);
      const { error } = await supabase.from('transactions').update({
        amount: newAmount,
        payment_method: txEditMethod,
        note: txEditNote.trim() || null,
      }).eq('id', txEditId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      setTxEditVisible(false);
    },
    onError: (err) => Alert.alert('Error', (err as Error).message),
  });

  const openTxEdit = (tx: EnrichedTransaction) => {
    setTxEditId(tx.id);
    setTxEditAmount(String(tx.amount));
    setTxEditMethod((tx.paymentMethod as PaymentMethod) ?? 'CASH');
    setTxEditNote(tx.note ?? '');
    setTxEditOriginalAmount(tx.amount);
    setTxEditVisible(true);
  };

  const handleDeleteTransaction = (tx: EnrichedTransaction) => {
    Alert.alert(
      'Delete Payment?',
      `Delete payment of ${tx.amount.toLocaleString('en-IN')}? This will increase the outstanding balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTransactionMutation.mutate(tx) },
      ]
    );
  };

  const openEditModal = () => {
    if (!buyer) return;
    setEditName(buyer.name);
    setEditPhones(buyer.phone ? buyer.phone.split(',').map(p => p.trim()).filter(Boolean) : ['']);
    setEditNotes(buyer.notes || '');
    setEditVisible(true);
  };



  const openingMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !buyer) throw new Error('Missing shop or buyer');
      const parsedAmount = parseFloat(openingAmount);
      if (!parsedAmount || parsedAmount < 0) throw new Error('Enter a valid opening balance');
      const dateMs = openingDate.trim() ? new Date(openingDate.trim()).getTime() : Date.now();
      if (Number.isNaN(dateMs)) throw new Error('Use date format YYYY-MM-DD');
      const previousSigned = buyer.openingBalanceSet
        ? (buyer.openingBalanceType === 'CR' ? -buyer.openingBalance : buyer.openingBalance)
        : 0;
      const nextSigned = openingType === 'CR' ? -parsedAmount : parsedAmount;

      await supabase.from('transactions')
        .delete()
        .eq('shop_id', shop.shopId)
        .eq('buyer_code', buyer.code)
        .eq('type', 'OPENING');
      const { error: txError } = await supabase.from('transactions').insert({
        shop_id: shop.shopId,
        buyer_code: buyer.code,
        type: 'OPENING',
        amount: parsedAmount,
        date: dateMs,
        note: openingType,
        description: 'Opening Balance',
        created_at: Date.now(),
      });
      if (txError) throw new Error(txError.message);
      const { error } = await supabase.from('buyers').update({
        opening_balance: parsedAmount,
        opening_balance_type: openingType,
        opening_balance_date: dateMs,
        opening_balance_set: true,
        outstanding_balance: (buyer.outstandingBalance ?? 0) - previousSigned + nextSigned,
        last_transaction_date: dateMs,
      }).eq('code', buyer.code).eq('shop_id', shop.shopId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      setOpeningVisible(false);
    },
    onError: (err) => Alert.alert('Opening balance', (err as Error).message),
  });

  const openOpeningEditor = () => {
    if (!buyer) return;
    setOpeningAmount(buyer.openingBalanceSet ? String(buyer.openingBalance) : '');
    setOpeningType(buyer.openingBalanceType ?? 'DR');
    setOpeningDate(buyer.openingBalanceDate ? new Date(buyer.openingBalanceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setOpeningVisible(true);
  };

  const handleShareReminderImage = async () => {
    if (!reminderCardRef.current) return;
    try {
      if (Platform.OS === 'web') {
        await downloadElementAsJpeg(reminderCardRef.current as unknown as HTMLElement, `balance-reminder-${buyer!.code}.jpg`);
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(reminderCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Send balance reminder' });
    } catch {
      Alert.alert('Reminder Error', 'Could not create reminder image.');
    }
  };

  const handleShareDailyCombinedPDF = async () => {
    if (!shop || !buyer || !activeDailyGroup) return;
    try {
      const html = generateCombinedBillHTML({
        shop,
        buyer,
        group: activeDailyGroup,
        balance,
      });
      if (Platform.OS === 'web') {
        await printHtmlOnWeb(html, `Daily bill ${buyer.name}`);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Daily bill ${buyer.name}` });
    } catch {
      Alert.alert('Share Error', 'Could not create daily combined bill.');
    }
  };

  const handleShareDailyCombinedImage = async () => {
    if (!combinedBillRef.current) return;
    try {
      if (Platform.OS === 'web') {
        await downloadElementAsJpeg(combinedBillRef.current as unknown as HTMLElement, `daily-bill-${buyer!.code}.jpg`);
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Image sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(combinedBillRef, { format: 'jpg', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
        dialogTitle: `Share daily bill ${buyer?.name ?? ''}`,
      });
    } catch {
      Alert.alert('Share Error', 'Could not create daily bill image.');
    }
  };

  const handleSendBill = (bill: typeof bills[number]) => {
    if (!shop) return;
    const phone = bill.customerPhone || buyer?.phone || '';
    if (!phone) {
      Alert.alert('No phone number', 'This buyer has no phone number. Use Share PDF or open the slip and share an image.');
      return;
    }
    openWhatsApp(phone, generateCustomerMessage(bill, shop));
  };

  const handleShareBill = async (bill: typeof bills[number]) => {
    if (!shop) return;
    setSharingBillId(bill.id);
    try {
      await shareSlipAsPDF(bill, shop);
    } catch {
      Alert.alert('Share Error', 'Could not create bill PDF.');
    } finally {
      setSharingBillId(null);
    }
  };

  const openBill = (bill: typeof bills[number]) => {
    if (bill.status === 'CONFIRMED') {
      router.push(`/slip/${bill.id}` as any);
      return;
    }
    if (bill.status === 'PENDING') {
      router.push({ pathname: '/authorization', params: { id: bill.id } } as any);
      return;
    }
    router.push(`/bills/${bill.id}` as any);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: 14,
        backgroundColor: Colors.primary, borderBottomWidth: 0,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }} testID="ledger-back">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          {buyer.name}
        </Text>
        <Pressable onPress={openEditModal} style={{ padding: 4 }} testID="edit-buyer-btn">
          <Pencil size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        testID="transactions-list"
        data={enrichedTransactions}
        keyExtractor={t => t.id}
        ListHeaderComponent={
          <>
            {/* Summary card */}
            <View style={{
              marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md,
              borderRadius: 14,
              backgroundColor: '#ffffff',
              borderWidth: 1, borderColor: '#E5E7EB',
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
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFF', marginTop: 4 }}>
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
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {buyer.phone.split(',').map((p) => p.trim()).filter(Boolean).map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingLeft: 8, paddingRight: 4, paddingVertical: 2, borderRadius: 14, gap: 6 }}>
                        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '500' }}>{p}</Text>
                        <Pressable
                          testID="whatsapp-icon-btn"
                          onPress={() => openWhatsApp(p, generateBalanceMessage(buyer, shop!))}
                          style={{ padding: 4, backgroundColor: '#DCFCE7', borderRadius: 10 }}
                        >
                          <MessageCircle size={14} color="#16A34A" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, flex: 1 }}>
                    No phone
                  </Text>
                )}
              </View>
            </View>

            <View style={{
              marginHorizontal: Spacing.md,
              marginBottom: Spacing.md,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              padding: Spacing.md,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, fontWeight: '800', textTransform: 'uppercase' }}>
                    Opening Balance / प्रारंभिक शेष
                  </Text>
                  <Text style={{ fontSize: FontSize.md, color: Colors.text, fontWeight: '800', marginTop: 4 }}>
                    {buyer.openingBalanceSet
                      ? `${toIndianCurrency(buyer.openingBalance)} ${buyer.openingBalanceType}`
                      : 'Pending / लंबित'}
                  </Text>
                  {buyer.openingBalanceDate ? (
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
                      Date: {toIndianDate(buyer.openingBalanceDate)}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  testID="edit-opening-balance"
                  onPress={openOpeningEditor}
                  style={{ minHeight: 44, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary }}>Edit</Text>
                </Pressable>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md }}>
              <Pressable
                testID="record-payment-btn"
                onPress={() => router.push(`/buyers/payment?code=${buyer.code}`)}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <View style={{
                    height: 48, borderRadius: Radius.sm,
                    backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <CreditCard size={18} color="#FFF" />
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>
                      Record Payment
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                testID="whatsapp-balance-btn"
                onPress={handleShareReminderImage}
                style={{ flex: 1 }}
              >
                {({ pressed }) => (
                  <View style={{
                    height: 48, borderRadius: Radius.sm,
                    backgroundColor: pressed ? Colors.primaryPressed : Colors.success,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <ImageIcon size={18} color="#FFF" />
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>
                      Send Reminder
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {activeDailyGroup ? (
              <View style={{
                marginHorizontal: Spacing.md,
                marginBottom: Spacing.md,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 14,
                padding: Spacing.md,
              }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond, textTransform: 'uppercase' }}>
                  Daily Combined Bill / दैनिक संयुक्त बिल
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm }}>
                  {dailyGroups.slice(0, 6).map((group) => (
                    <Pressable
                      key={group.key}
                      onPress={() => setSelectedDailyDate(group.key)}
                      style={{
                        minHeight: 44,
                        borderRadius: Radius.sm,
                        paddingHorizontal: Spacing.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: activeDailyGroup.key === group.key ? Colors.primary : Colors.border,
                        backgroundColor: activeDailyGroup.key === group.key ? '#E8F5E9' : Colors.surface,
                      }}
                    >
                      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.text }}>{group.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                    {activeDailyGroup.rows.length} bills
                  </Text>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: Colors.text }}>
                    {toIndianCurrency(activeDailyGroup.total)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                  <Pressable
                    testID="share-daily-combined-bill-pdf"
                    onPress={handleShareDailyCombinedPDF}
                    style={{ flex: 1, minHeight: 44, borderRadius: Radius.sm, backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                  >
                    <FileText size={15} color="#FFF" />
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#FFF' }}>PDF</Text>
                  </Pressable>
                  <Pressable
                    testID="share-daily-combined-bill-jpg"
                    onPress={handleShareDailyCombinedImage}
                    style={{ flex: 1, minHeight: 44, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                  >
                    <ImageIcon size={15} color="#FFF" />
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: '#FFF' }}>JPG</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Sales bills */}
            <View style={{
              marginHorizontal: Spacing.md,
              marginBottom: Spacing.md,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              <View style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: Spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
                backgroundColor: '#F8FAFC',
              }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Sales Bills
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
                  {bills.length} bill{bills.length === 1 ? '' : 's'} generated for this buyer
                </Text>
              </View>

              {billsLoading ? (
                <ActivityIndicator color={Colors.primary} size="small" style={{ marginVertical: Spacing.md }} />
              ) : bills.length === 0 ? (
                <View style={{ padding: Spacing.md }}>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
                    No sales bills found for this buyer name.
                  </Text>
                </View>
              ) : bills.map((bill) => (
                <View
                  key={bill.id}
                  style={{
                    padding: Spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text }}>
                        Bill #{bill.slipNumber} · {toIndianCurrency(bill.netAmount)}
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
                        {toIndianDate(bill.date)} · {bill.truckNumber} · {bill.grade} · {bill.sacks} case
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>
                        {bill.status} · {bill.paymentMode}
                      </Text>
                    </View>
                    <View style={{
                      borderRadius: Radius.round,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: bill.status === 'CONFIRMED' ? '#E8F5E9' : '#FFF8E1',
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: bill.status === 'CONFIRMED' ? Colors.success : '#7e5700',
                      }}>
                        {bill.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                    <Pressable
                      testID={`buyer-send-bill-${bill.id}`}
                      onPress={() => handleSendBill(bill)}
                      style={{ flex: 1 }}
                    >
                      {({ pressed }) => (
                        <View style={{
                          height: 38,
                          borderRadius: Radius.sm,
                          backgroundColor: pressed ? Colors.primaryPressed : Colors.success,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                          opacity: bill.customerPhone || buyer.phone ? 1 : 0.55,
                        }}>
                          <MessageCircle size={15} color="#FFF" />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>Send</Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable
                      testID={`buyer-share-bill-${bill.id}`}
                      onPress={() => handleShareBill(bill)}
                      disabled={sharingBillId === bill.id}
                      style={{ flex: 1 }}
                    >
                      {({ pressed }) => (
                        <View style={{
                          height: 38,
                          borderRadius: Radius.sm,
                          backgroundColor: pressed ? Colors.border : Colors.surface,
                          borderWidth: 1,
                          borderColor: Colors.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}>
                          <FileText size={15} color={Colors.text} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.text }}>
                            {sharingBillId === bill.id ? '...' : 'PDF'}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable
                      testID={`buyer-view-bill-${bill.id}`}
                      onPress={() => openBill(bill)}
                      style={{ flex: 1 }}
                    >
                      {({ pressed }) => (
                        <View style={{
                          height: 38,
                          borderRadius: Radius.sm,
                          backgroundColor: pressed ? Colors.border : Colors.surface,
                          borderWidth: 1,
                          borderColor: Colors.primary,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5,
                        }}>
                          <Eye size={15} color={Colors.primary} />
                          <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary }}>View</Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
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
          const isPayment = item.type === 'PAYMENT';
          const borderColor = isSale ? Colors.danger : Colors.success;
          const amountColor = isSale ? Colors.danger : Colors.success;

          let description = '';
          let secondLine: string | null = null;

          if (isSale) {
            description = `Sale #${item.slipNumber ?? ''}`;
            if (item.note) description += ` — ${item.note}`;
          } else if (isPayment) {
            description = `Payment — ${item.paymentMethod ?? 'Cash'}`;
            if (item.upiRef) {
              secondLine = `Ref: ${item.upiRef}`;
            } else if (item.note) {
              secondLine = item.note;
            }
          } else {
            description = item.note ?? 'Opening Balance';
          }

          return (
            <View style={{
              marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
              backgroundColor: '#ffffff',
              borderRadius: 14,
              borderWidth: 1, borderColor: '#E5E7EB',
              borderLeftWidth: 4, borderLeftColor: borderColor,
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

              {/* Bottom line: DR/CR + BAL + action buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: amountColor }}>
                  {isSale ? 'DR' : 'CR'} {toIndianCurrency(item.amount)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecond }}>
                    BAL {toIndianCurrency(item.balanceAfter)}
                  </Text>
                  {isPayment ? (
                    <>
                      <Pressable
                        testID={`edit-tx-${item.id}`}
                        onPress={() => openTxEdit(item)}
                        style={{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 8 }}
                      >
                        <Pencil size={15} color={Colors.primary} />
                      </Pressable>
                      <Pressable
                        testID={`delete-tx-${item.id}`}
                        onPress={() => handleDeleteTransaction(item)}
                        style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 }}
                      >
                        <Trash2 size={15} color={Colors.danger} />
                      </Pressable>
                    </>
                  ) : null}
                </View>
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

      <View
        ref={reminderCardRef}
        collapsable={false}
        style={{
          position: 'absolute',
          left: -1000,
          top: 0,
          width: 360,
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: Colors.border,
          padding: 22,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primary, textAlign: 'center' }}>
          {shop?.firmName ?? 'MandiBook'}
        </Text>
        <Text style={{ fontSize: 12, color: Colors.textSecond, textAlign: 'center', marginTop: 2 }}>
          {shop?.phone1 ? `Contact: ${shop.phone1}` : ''}
        </Text>
        <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 14 }} />
        <Text style={{ fontSize: 14, color: Colors.textSecond }}>Buyer / ग्राहक</Text>
        <Text style={{ fontSize: 18, fontWeight: '900', color: Colors.text }}>{buyer.name}</Text>
        <Text style={{ fontSize: 13, color: Colors.textSecond, marginTop: 2 }}>{buyer.phone || 'No phone'}</Text>
        <View style={{ backgroundColor: balance > 0 ? '#FFEBEE' : '#E8F5E9', borderRadius: 8, padding: 14, marginVertical: 16 }}>
          <Text style={{ fontSize: 12, color: Colors.textSecond }}>Outstanding Balance</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: balance > 0 ? Colors.danger : Colors.success }}>
            {toIndianCurrency(Math.abs(balance))} {balance > 0 ? 'DR' : balance < 0 ? 'CR' : 'NIL'}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: Colors.text, lineHeight: 20 }}>
          नमस्कार, कृपया अपना बकाया भुगतान सुविधानुसार कर दें।{'\n'}
          Kindly clear the outstanding balance at your convenience. Thank you.
        </Text>
        <Text style={{ fontSize: 11, color: Colors.textSecond, textAlign: 'right', marginTop: 16 }}>
          Date: {toIndianDate(Date.now())}
        </Text>
      </View>

      {activeDailyGroup ? (
        <View
          ref={combinedBillRef}
          collapsable={false}
          style={{
            position: 'absolute',
            left: -1200,
            top: 0,
            width: 520,
            backgroundColor: '#FFFFFF',
            borderRadius: 4,
            padding: 28,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>{shop?.phone1 ? `M: ${shop.phone1}` : ''}</Text>
            <Text style={{ fontSize: 13, color: '#64748B' }}>{shop?.phone2 ? `M: ${shop.phone2}` : ''}</Text>
          </View>
          <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '900', color: Colors.primary }}>
            {shop?.firmName?.toUpperCase() ?? 'MANDIBOOK'}
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 20 }}>
            {shop?.address}
            {shop?.city ? `\n${shop.city}` : ''}
          </Text>
          {shop?.upiId ? (
            <Text style={{ textAlign: 'center', fontSize: 12, color: '#64748B', marginTop: 6 }}>
              GPay/Paytm: {shop.upiId}
            </Text>
          ) : null}
          <Text style={{ color: '#CBD5E1', fontSize: 12, letterSpacing: 3, marginVertical: 18, textAlign: 'center' }} numberOfLines={1}>
            - - - - - - - - - - - - - - - - - - -
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#071e27' }}>
              No. {activeDailyGroup.rows[0]?.slipNumber ?? ''}
            </Text>
            <Text style={{ fontSize: 14, color: '#64748B' }}>Date: {formatShortDate(activeDailyGroup.rows[0]?.date ?? Date.now())}</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '900', color: '#071e27', marginBottom: 16 }}>
            M/s. {buyer.name.toUpperCase()}
          </Text>
          <View style={{ height: 1, backgroundColor: '#071e27', marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <Text style={{ flex: 1.35, fontSize: 12, fontWeight: '900', color: '#64748B' }}>ITEM</Text>
            <Text style={{ width: 54, fontSize: 12, fontWeight: '900', color: '#64748B', textAlign: 'right' }}>SACK</Text>
            <Text style={{ width: 78, fontSize: 12, fontWeight: '900', color: '#64748B', textAlign: 'right' }}>WEIGHT</Text>
            <Text style={{ width: 62, fontSize: 12, fontWeight: '900', color: '#64748B', textAlign: 'right' }}>RATE</Text>
            <Text style={{ width: 88, fontSize: 12, fontWeight: '900', color: '#64748B', textAlign: 'right' }}>AMOUNT</Text>
          </View>
          {activeDailyGroup.rows.map((bill) => (
            <View key={bill.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
              <View style={{ flex: 1.35 }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#071e27' }}>
                  {bill.grade}.{shop?.commodity?.toUpperCase() ?? 'ITEM'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{bill.gradeName}</Text>
              </View>
              <Text style={{ width: 54, fontSize: 13, color: '#071e27', textAlign: 'right' }}>{bill.sacks}</Text>
              <Text style={{ width: 78, fontSize: 13, color: '#071e27', textAlign: 'right' }}>{bill.totalWeight.toFixed(2)}</Text>
              <Text style={{ width: 62, fontSize: 13, color: '#071e27', textAlign: 'right' }}>{bill.ratePerKg.toFixed(2)}</Text>
              <Text style={{ width: 88, fontSize: 13, fontWeight: '900', color: Colors.primary, textAlign: 'right' }}>{bill.grossAmount.toFixed(2)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 12, gap: 6 }}>
            <CombinedTotalRow label="Total Amt" value={activeDailyGroup.rows.reduce((sum, bill) => sum + bill.grossAmount, 0)} />
            <CombinedTotalRow label="A.P.M.C." value={activeDailyGroup.rows.reduce((sum, bill) => sum + bill.apmcAmount, 0)} />
            <CombinedTotalRow label="BARDANA" value={activeDailyGroup.rows.reduce((sum, bill) => sum + bill.bardanaAmount + bill.cartageAmount, 0)} />
          </View>
          <Text style={{ color: '#CBD5E1', fontSize: 12, letterSpacing: 3, marginVertical: 12, textAlign: 'center' }} numberOfLines={1}>
            - - - - - - - - - - - - - - - - - - -
          </Text>
          <CombinedTotalRow label={`Sack ${activeDailyGroup.rows.reduce((sum, bill) => sum + bill.sacks, 0)}   Weight ${activeDailyGroup.rows.reduce((sum, bill) => sum + bill.totalWeight, 0).toFixed(2)}`} value={activeDailyGroup.total} />
          <View style={{ backgroundColor: 'rgba(27,94,32,0.08)', borderRadius: 8, padding: 14, marginTop: 14, borderWidth: 1, borderColor: 'rgba(27,94,32,0.15)' }}>
            <CombinedTotalRow label={`NET BALANCE ${formatShortDate(activeDailyGroup.rows[0]?.date ?? Date.now())}`} value={Math.max(0, balance)} large />
          </View>
          {buyer.lastPaymentDate ? (
            <Text style={{ textAlign: 'center', marginTop: 18, fontSize: 13, fontWeight: '900', color: '#071e27' }}>
              LAST PAYMENT {(buyer.lastPaymentAmount ?? 0).toFixed(0)} ON {formatShortDate(buyer.lastPaymentDate)}
            </Text>
          ) : null}
          <Text style={{ textAlign: 'center', marginTop: 18, fontSize: 13, fontWeight: '900', color: '#071e27' }}>
            RATES INCLUSIVE OF ALL TAXES
          </Text>
          <Text style={{ textAlign: 'center', marginTop: 18, fontSize: 22, fontWeight: '900', color: Colors.primary }}>धन्यवाद</Text>
          <Text style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: '#64748B' }}>Thank You for your business!</Text>
        </View>
      ) : null}

      <Modal
        visible={openingVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOpeningVisible(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpeningVisible(false)} />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: Spacing.md,
                paddingBottom: Math.max(Spacing.md, insets.bottom),
              }}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: Colors.text, marginBottom: Spacing.md }}>
                Opening Balance / प्रारंभिक शेष
              </Text>
              <TextInput
                testID="opening-balance-amount"
                value={openingAmount}
                onChangeText={setOpeningAmount}
                keyboardType="decimal-pad"
                returnKeyType="next"
                ref={openingAmountRef}
                onSubmitEditing={() => openingDateRef.current?.focus()}
                placeholder="Amount"
                placeholderTextColor={Colors.textSecond}
                style={modalInputStyle}
              />
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                {(['DR', 'CR'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setOpeningType(type)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      borderRadius: Radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: openingType === type ? Colors.primary : Colors.border,
                      backgroundColor: openingType === type ? '#E8F5E9' : Colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: FontSize.sm, color: Colors.text, fontWeight: '800' }}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID="opening-balance-date"
                value={openingDate}
                onChangeText={setOpeningDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecond}
                returnKeyType="done"
                ref={openingDateRef}
                style={modalInputStyle}
              />
              <Pressable
                testID="save-opening-balance"
                onPress={() => openingMutation.mutate()}
                disabled={openingMutation.isPending}
                style={{
                  minHeight: 52,
                  borderRadius: Radius.sm,
                  backgroundColor: openingMutation.isPending ? Colors.border : Colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: Spacing.sm,
                }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: '#FFF' }}>
                  {openingMutation.isPending ? 'Saving...' : 'Save Opening Balance'}
                </Text>
              </Pressable>
            </View>
        </KeyboardAvoidingView>
      </Modal>



      {/* Edit Buyer Modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setEditVisible(false)} />
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                paddingBottom: 20 + insets.bottom,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#071e27', marginBottom: 14 }}>
                Edit Buyer / ग्राहक संपादित करें
              </Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Name / नाम"
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
                onSubmitEditing={() => editPhoneRef.current?.focus()}
                style={modalInputStyle}
              />
              <View style={{ gap: 8 }}>
                {editPhones.map((phone, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={phone}
                      onChangeText={(text) => {
                        const updated = [...editPhones];
                        updated[index] = text;
                        setEditPhones(updated);
                      }}
                      placeholder={index === 0 ? "Phone / मोबाइल" : "Additional Phone"}
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      ref={index === 0 ? editPhoneRef : undefined}
                      onSubmitEditing={() => editNotesRef.current?.focus()}
                      style={[modalInputStyle, { flex: 1, marginBottom: 0 }]}
                    />
                    {index === Math.max(0, editPhones.length - 1) ? (
                      <Pressable 
                        onPress={() => setEditPhones([...editPhones, ''])} 
                        style={{ padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, height: 48, justifyContent: 'center' }}>
                        <Plus size={20} color="#64748B" />
                      </Pressable>
                    ) : (
                      <Pressable 
                        onPress={() => setEditPhones(editPhones.filter((_, i) => i !== index))} 
                        style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8, height: 48, justifyContent: 'center' }}>
                        <Trash2 size={20} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
              <TextInput
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Notes / टिप्पणी"
                placeholderTextColor="#94A3B8"
                returnKeyType="done"
                ref={editNotesRef}
                style={modalInputStyle}
              />
              <Pressable
                onPress={() => editBuyerMutation.mutate()}
                disabled={editBuyerMutation.isPending}
                style={{
                  height: 52,
                  borderRadius: 8,
                  backgroundColor: editBuyerMutation.isPending ? '#C8E6C9' : '#1b5e20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                  {editBuyerMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal visible={txEditVisible} transparent animationType="slide" onRequestClose={() => setTxEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setTxEditVisible(false)} />
          <View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: 20, paddingBottom: 20 + insets.bottom,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#071e27', marginBottom: 14 }}>
              Edit Payment
            </Text>

            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>AMOUNT (₹)</Text>
            <TextInput
              value={txEditAmount}
              onChangeText={setTxEditAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              style={modalInputStyle}
            />

            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>METHOD</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
              {(['CASH', 'UPI', 'CHEQUE'] as PaymentMethod[]).map(m => (
                <Pressable
                  key={m}
                  onPress={() => setTxEditMethod(m)}
                  style={{
                    flex: 1, height: 40, borderRadius: Radius.sm,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: txEditMethod === m ? Colors.info : Colors.background,
                    borderWidth: 1, borderColor: txEditMethod === m ? Colors.info : Colors.border,
                  }}
                >
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: txEditMethod === m ? '#FFF' : Colors.textSecond }}>{m}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>NOTE (optional)</Text>
            <TextInput
              value={txEditNote}
              onChangeText={setTxEditNote}
              placeholder="Any remark..."
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
              style={modalInputStyle}
            />

            <Pressable
              onPress={() => editTransactionMutation.mutate()}
              disabled={editTransactionMutation.isPending}
              style={{
                height: 52, borderRadius: 8,
                backgroundColor: editTransactionMutation.isPending ? '#C8E6C9' : '#1b5e20',
                alignItems: 'center', justifyContent: 'center', marginTop: 4,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                {editTransactionMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const modalInputStyle = {
  minHeight: 44,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: Radius.sm,
  paddingHorizontal: Spacing.sm,
  paddingVertical: 10,
  fontSize: FontSize.sm,
  color: Colors.text,
  marginBottom: Spacing.sm,
  backgroundColor: Colors.surface,
};

function CombinedTotalRow({
  label,
  value,
  large,
}: {
  label: string;
  value: number;
  large?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: large ? 15 : 13, fontWeight: '900', color: large ? Colors.primary : '#071e27' }}>
        {label}
      </Text>
      <Text style={{ fontSize: large ? 20 : 13, fontWeight: '900', color: large ? Colors.primary : '#071e27' }}>
        {value.toFixed(2)}
      </Text>
    </View>
  );
}

function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateCombinedBillHTML({
  shop,
  buyer,
  group,
  balance,
}: {
  shop: {
    firmName: string;
    address: string;
    city: string;
    commodity: string;
    phone1?: string;
    phone2?: string;
    upiId?: string;
  };
  buyer: {
    name: string;
    phone?: string;
    lastPaymentAmount?: number;
    lastPaymentDate?: number;
  };
  group: {
    label: string;
    rows: Array<{
      id: string;
      slipNumber: number;
      grade: string;
      gradeName: string;
      sacks: number;
      totalWeight: number;
      ratePerKg: number;
      grossAmount: number;
      apmcAmount: number;
      bardanaAmount: number;
      cartageAmount: number;
      netAmount: number;
      date: number;
    }>;
    total: number;
  };
  balance: number;
}) {
  const firstBill = group.rows[0];
  const grossTotal = group.rows.reduce((sum, bill) => sum + bill.grossAmount, 0);
  const apmcTotal = group.rows.reduce((sum, bill) => sum + bill.apmcAmount, 0);
  const bardanaTotal = group.rows.reduce((sum, bill) => sum + bill.bardanaAmount + bill.cartageAmount, 0);
  const totalSacks = group.rows.reduce((sum, bill) => sum + bill.sacks, 0);
  const totalWeight = group.rows.reduce((sum, bill) => sum + bill.totalWeight, 0);
  const previousBalance = Math.max(0, balance - group.total);
  const date = formatShortDate(firstBill?.date ?? Date.now());
  const itemRows = group.rows.map((bill) => `
      <tr>
        <td class="item">${escapeHtml(`${bill.grade}.${shop.commodity || 'ITEM'}`.toUpperCase())}</td>
        <td class="num sack">${bill.sacks}</td>
        <td class="num weight">${bill.totalWeight.toFixed(2)}</td>
        <td class="num rate">${bill.ratePerKg.toFixed(2)}</td>
        <td class="num amount">${bill.grossAmount.toFixed(2)}</td>
      </tr>
  `).join('');
  const lastPayment = buyer.lastPaymentDate
    ? `<div class="last-payment">LAST PAYMENT ${Math.round(buyer.lastPaymentAmount ?? 0)} ON ${formatShortDate(buyer.lastPaymentDate)}</div>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111; font-family: "Courier New", Courier, monospace; }
    .sheet { width: 176mm; margin: 0 auto; }
    .brand { text-align: center; font-family: Arial, sans-serif; font-size: 20px; font-weight: 900; line-height: 1.35; margin-bottom: 20px; }
    .brand .short { font-size: 18px; margin-bottom: 4px; }
    .meta { width: 118mm; margin: 0 auto 8px; font-size: 16px; font-weight: 700; display: flex; justify-content: space-between; }
    .buyer { width: 118mm; margin: 0 auto 16px; font-size: 16px; font-weight: 700; text-align: left; }
    .dash { width: 118mm; margin: 10px auto; border-top: 2px dashed #111; height: 0; }
    table { width: 118mm; margin: 0 auto; border-collapse: collapse; table-layout: fixed; font-size: 16px; font-weight: 700; }
    th { padding: 8px 6px; text-align: right; font-size: 16px; }
    th.item, td.item { text-align: left; }
    td { padding: 6px; vertical-align: top; }
    .item { width: 34mm; }
    .sack { width: 18mm; }
    .weight { width: 28mm; }
    .rate { width: 22mm; }
    .amount { width: 30mm; }
    .num { text-align: right; }
    .totals { width: 58mm; margin: 8px 29mm 12px auto; font-size: 16px; font-weight: 700; }
    .total-row { display: flex; justify-content: space-between; gap: 18px; margin: 7px 0; }
    .summary { width: 118mm; margin: 0 auto; font-size: 16px; font-weight: 700; }
    .summary-table td { padding-top: 8px; padding-bottom: 8px; }
    .balance-row { display: flex; justify-content: space-between; padding: 9px 6px; }
    .last-payment, .footer { text-align: center; width: 118mm; margin: 18px auto 0; font-size: 16px; font-weight: 700; }
    .dot { text-align: center; font-weight: 700; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <div class="short">${escapeHtml((shop.firmName.split(/\s+/)[0] ?? '').toUpperCase())}</div>
      ${escapeHtml(shop.firmName.toUpperCase())}<br>
      ${escapeHtml(shop.address.toUpperCase())}<br>
      ${escapeHtml(shop.city.toUpperCase())}
    </div>
    <div class="meta">
      <span>PURCHA NO :${escapeHtml(firstBill?.slipNumber ?? '')}</span>
      <span>DATE :${escapeHtml(date)}</span>
    </div>
    <div class="buyer">Buyer Name:${escapeHtml(buyer.name.toUpperCase())}${buyer.phone ? `; ${escapeHtml(buyer.phone)}` : ''}</div>
    <div class="dash"></div>
    <table>
      <thead>
        <tr>
          <th class="item">INAME</th>
          <th class="sack">SACK</th>
          <th class="weight">WEIGHT</th>
          <th class="rate">RATE</th>
          <th class="amount">AMOUNT</th>
        </tr>
      </thead>
    </table>
    <div class="dash"></div>
    <table>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Total Amt</span><span>${grossTotal.toFixed(2)}</span></div>
      <div class="total-row"><span>A.P.M.C.</span><span>${apmcTotal.toFixed(2)}</span></div>
      <div class="total-row"><span>BARDANA</span><span>${bardanaTotal.toFixed(2)}</span></div>
    </div>
    <div class="dash"></div>
    <table class="summary-table">
      <tr>
        <td class="item"></td>
        <td class="num sack">${totalSacks}</td>
        <td class="num weight">${totalWeight.toFixed(2)}</td>
        <td class="rate"></td>
        <td class="num amount">${group.total.toFixed(2)}</td>
      </tr>
    </table>
    <div class="summary">PREM--------------------------------------------</div>
    <div class="summary balance-row"><span>BALANCE AMT</span><span>${previousBalance.toFixed(2)}</span></div>
    <div class="dash"></div>
    <div class="summary balance-row"><span>NET BALANCE ${escapeHtml(date)}</span><span>${Math.max(0, balance).toFixed(2)}</span></div>
    <div class="dash"></div>
    ${lastPayment}
    <div class="dot">.</div>
    <div class="footer">RATES INCLUSIVE OF ALL TAXES</div>
  </div>
</body>
</html>`;
}
