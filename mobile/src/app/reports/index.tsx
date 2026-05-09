import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  BookOpen,
  CreditCard,
  BookMarked,
  FileText,
  Plus,
} from 'lucide-react-native';
import { useDateInquiries } from '@/hooks/useDateInquiries';
import { useDateTrucks } from '@/hooks/useDateTrucks';
import { useCashEntries } from '@/hooks/useCashEntries';
import { useShop } from '@/context/ShopContext';
import { exportAndShareReport, type CashEntry } from '@/utils/pdfGenerator';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Inquiry } from '@/types/inquiry';

type TabKey = 'sale' | 'accounts' | 'payments' | 'cashbook';

const TABS: { key: TabKey; label: string; icon: React.FC<{ size: number; color: string }> }[] = [
  { key: 'sale', label: 'बिक्री', icon: BarChart2 },
  { key: 'accounts', label: 'हिसाब', icon: BookOpen },
  { key: 'payments', label: 'भुगतान', icon: CreditCard },
  { key: 'cashbook', label: 'कैश', icon: BookMarked },
];

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function DaySummaryScreen() {
  const router = useRouter();
  const { shop } = useShop();
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [activeTab, setActiveTab] = useState<TabKey>('sale');
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Cash entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const { inquiries, loading: inqLoading } = useDateInquiries(date);
  const { trucks, loading: trucksLoading } = useDateTrucks(date);
  const { entries: cashEntries, loading: cashLoading, addEntry } = useCashEntries(date);

  const loading = inqLoading || trucksLoading;

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(d);
  };

  // Grade summary
  const gradeSummary = useMemo(() => {
    const map = new Map<string, { grade: string; gradeName: string; sacks: number; weight: number; gross: number; avgRate: number }>();
    for (const inq of inquiries) {
      const existing = map.get(inq.grade);
      if (existing) {
        existing.sacks += inq.sacks;
        existing.weight += inq.totalWeight;
        existing.gross += inq.grossAmount;
        existing.avgRate = existing.gross / existing.weight;
      } else {
        map.set(inq.grade, {
          grade: inq.grade,
          gradeName: inq.gradeName,
          sacks: inq.sacks,
          weight: inq.totalWeight,
          gross: inq.grossAmount,
          avgRate: inq.ratePerKg,
        });
      }
    }
    return Array.from(map.values());
  }, [inquiries]);

  const totalSacks = gradeSummary.reduce((s, r) => s + r.sacks, 0);
  const totalWeight = gradeSummary.reduce((s, r) => s + r.weight, 0);
  const totalGross = gradeSummary.reduce((s, r) => s + r.gross, 0);
  const totalAvgRate = totalWeight > 0 ? totalGross / totalWeight : 0;

  // Accounts
  const totalFreight = trucks.reduce((s, t) => s + t.freightAmount, 0);
  const totalApmc = inquiries.reduce((s, i) => s + i.apmcAmount, 0);
  const totalCartage = inquiries.reduce((s, i) => s + i.cartageAmount, 0);
  const totalBardana = inquiries.reduce((s, i) => s + i.bardanaAmount, 0);
  const commissionPct = shop?.charges?.agentCommission ?? 0;
  const telePost = shop?.charges?.telePost ?? 0;
  const commission = totalGross * commissionPct / 100;
  const netToSender = totalGross - totalFreight - commission - totalApmc - totalCartage - totalBardana - telePost;

  // Payment breakdown
  const cashInquiries = inquiries.filter(i => i.paymentMode === 'CASH');
  const upiInquiries = inquiries.filter(i => i.paymentMode === 'UPI');
  const udhaariInquiries = inquiries.filter(i => i.paymentMode === 'UDHAARI');

  // Cash book
  const cashReceiptsFromSales: CashEntry[] = cashInquiries.map(i => ({
    id: i.id,
    type: 'RECEIPT' as const,
    description: `Sale #${i.slipNumber} - ${i.customerName}`,
    amount: i.netAmount,
    createdAt: i.createdAt,
  }));
  const allReceipts: CashEntry[] = [
    ...cashReceiptsFromSales,
    ...cashEntries.filter(e => e.type === 'RECEIPT'),
  ];
  const allPayments: CashEntry[] = cashEntries.filter(e => e.type === 'PAYMENT');
  const totalReceipts = allReceipts.reduce((s, e) => s + e.amount, 0);
  const totalPayments = allPayments.reduce((s, e) => s + e.amount, 0);
  const closingBalance = totalReceipts - totalPayments;

  const handleSaveEntry = async () => {
    const amt = parseFloat(entryAmount);
    if (!amt || amt <= 0 || !entryDesc.trim()) return;
    setSavingEntry(true);
    try {
      await addEntry({
        type: entryType,
        description: entryDesc.trim(),
        amount: amt,
        createdAt: Date.now(),
      });
      setShowEntryModal(false);
      setEntryDesc('');
      setEntryAmount('');
      setEntryType('RECEIPT');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleExport = async () => {
    if (!shop) return;
    setShowExportMenu(false);
    setExporting(true);
    try {
      await exportAndShareReport({
        date: date.getTime(),
        shop,
        confirmedInquiries: inquiries,
        trucks,
        cashEntries: [...allReceipts, ...allPayments],
      });
    } catch {
      Alert.alert('Error', 'Could not generate report.');
    } finally {
      setExporting(false);
    }
  };

  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
        {router.canGoBack() ? (
          <Pressable testID="back-btn" onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
        ) : <View style={{ width: 32 }} />}
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          दिन का हिसाब
        </Text>
        <Pressable
          testID="export-fab"
          onPress={() => setShowExportMenu(true)}
          disabled={exporting}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: Spacing.sm,
            borderRadius: Radius.round,
            backgroundColor: exporting ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
          })}
        >
          <FileText size={16} color="#FFF" />
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: '#FFF' }}>
            {exporting ? 'Exporting...' : 'Export'}
          </Text>
        </Pressable>
      </View>

      {/* Date picker row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
        <Pressable testID="prev-day-btn" onPress={prevDay} style={{ padding: 8 }}>
          <ChevronLeft size={22} color={Colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>
            {toIndianDate(date.getTime())}
          </Text>
          {isToday ? (
            <Text style={{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' }}>Today</Text>
          ) : null}
        </View>
        <Pressable
          testID="next-day-btn"
          onPress={nextDay}
          style={{ padding: 8, opacity: isToday ? 0.3 : 1 }}
          disabled={isToday}
        >
          <ChevronRight size={22} color={Colors.text} />
        </Pressable>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: Spacing.sm }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.key}
              testID={`tab-${tab.key}`}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: Spacing.md,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: active ? Colors.primary : 'transparent',
              }}
            >
              <Icon size={16} color={active ? Colors.primary : Colors.textSecond} />
              <Text style={{
                fontSize: FontSize.sm,
                fontWeight: active ? '800' : '500',
                color: active ? Colors.primary : Colors.textSecond,
              }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          testID="reports-loading"
          color={Colors.primary}
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : (
        <>
          {/* TAB 1: Sale Summary */}
          {activeTab === 'sale' ? (
            <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
              {trucks.map(t => (
                <View key={t.id} style={{
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.sm,
                  padding: Spacing.md,
                  marginBottom: Spacing.sm,
                  borderLeftWidth: 4,
                  borderLeftColor: Colors.primary,
                }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text }}>
                    {t.truckNumber}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                    {t.senderName} · {t.totalKg} kg registered
                  </Text>
                </View>
              ))}

              {/* Grade table */}
              <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.sm, overflow: 'hidden', marginTop: Spacing.sm }}>
                {/* Table header */}
                <View style={{ flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: Spacing.sm }}>
                  {['Grade', 'Sacks', 'Weight', 'Avg Rate', 'Gross'].map((h, i) => (
                    <Text key={h} style={{
                      flex: i === 0 ? 2 : 1,
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#FFF',
                      textAlign: i > 0 ? 'right' : 'left',
                    }}>{h}</Text>
                  ))}
                </View>

                {gradeSummary.length === 0 ? (
                  <View testID="no-bills-msg" style={{ padding: Spacing.lg, alignItems: 'center' }}>
                    <Text style={{ color: Colors.textSecond }}>No confirmed bills for this date</Text>
                  </View>
                ) : (
                  gradeSummary.map((row, idx) => (
                    <View key={row.grade} style={{
                      flexDirection: 'row',
                      paddingVertical: 10,
                      paddingHorizontal: Spacing.sm,
                      backgroundColor: idx % 2 === 0 ? Colors.surface : '#F9F9F9',
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.border,
                    }}>
                      <Text style={{ flex: 2, fontSize: 11, color: Colors.text, fontWeight: '700' }}>
                        {row.grade}
                      </Text>
                      <Text style={{ flex: 1, fontSize: 11, color: Colors.text, textAlign: 'right' }}>{row.sacks}</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: Colors.text, textAlign: 'right' }}>{row.weight.toFixed(0)}kg</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: Colors.text, textAlign: 'right' }}>₹{row.avgRate.toFixed(0)}</Text>
                      <Text style={{ flex: 1, fontSize: 11, color: Colors.text, textAlign: 'right', fontWeight: '700' }}>
                        {toIndianCurrency(row.gross)}
                      </Text>
                    </View>
                  ))
                )}

                {/* Total row */}
                {gradeSummary.length > 0 ? (
                  <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: Spacing.sm, backgroundColor: Colors.success }}>
                    <Text style={{ flex: 2, fontSize: 11, fontWeight: '900', color: '#FFF' }}>Total</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: '#FFF', textAlign: 'right' }}>{totalSacks}</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: '#FFF', textAlign: 'right' }}>{totalWeight.toFixed(0)}kg</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: '#FFF', textAlign: 'right' }}>₹{totalAvgRate.toFixed(0)}</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '900', color: '#FFF', textAlign: 'right' }}>{toIndianCurrency(totalGross)}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : null}

          {/* TAB 2: Accounts */}
          {activeTab === 'accounts' ? (
            <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
              {[
                { label: 'Gross Sale', amount: totalGross, deduct: false },
                { label: 'Less Freight', amount: totalFreight, deduct: true },
                { label: `Less Commission (${commissionPct}%)`, amount: commission, deduct: true },
                { label: 'Less APMC', amount: totalApmc, deduct: true },
                { label: 'Less Cartage', amount: totalCartage, deduct: true },
                { label: 'Less Tele & Post', amount: telePost, deduct: true },
                { label: 'Less Bardana', amount: totalBardana, deduct: true },
              ].map(row => (
                <View key={row.label} style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: Spacing.md,
                  backgroundColor: Colors.surface,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border,
                }}>
                  <Text style={{ fontSize: FontSize.sm, color: Colors.text }}>{row.label}</Text>
                  <Text style={{
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                    color: row.deduct ? Colors.danger : Colors.text,
                  }}>
                    {row.deduct ? '-' : null}{toIndianCurrency(row.amount)}
                  </Text>
                </View>
              ))}

              {/* Net to Sender */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 18,
                paddingHorizontal: Spacing.md,
                backgroundColor: Colors.surface,
                borderTopWidth: 3,
                borderTopColor: Colors.text,
                borderBottomWidth: 3,
                borderBottomColor: Colors.text,
                marginTop: 2,
              }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: Colors.text }}>
                  NET TO SENDER
                </Text>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.success }}>
                  {toIndianCurrency(netToSender)}
                </Text>
              </View>
            </ScrollView>
          ) : null}

          {/* TAB 3: Payments */}
          {activeTab === 'payments' ? (
            <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
              {/* Summary cards */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                {[
                  { label: 'Cash', amount: cashInquiries.reduce((s, i) => s + i.netAmount, 0), count: cashInquiries.length, color: Colors.success },
                  { label: 'UPI', amount: upiInquiries.reduce((s, i) => s + i.netAmount, 0), count: upiInquiries.length, color: Colors.info },
                  { label: 'उधारी', amount: udhaariInquiries.reduce((s, i) => s + i.netAmount, 0), count: udhaariInquiries.length, color: Colors.danger },
                ].map(card => (
                  <View key={card.label} style={{
                    flex: 1,
                    backgroundColor: Colors.surface,
                    borderRadius: Radius.sm,
                    padding: Spacing.sm,
                    borderTopWidth: 3,
                    borderTopColor: card.color,
                    alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>{card.label}</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '900', color: card.color }}>
                      {toIndianCurrency(card.amount)}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{card.count} bills</Text>
                  </View>
                ))}
              </View>

              {/* Udhaari breakdown */}
              {udhaariInquiries.length > 0 ? (
                <>
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: Spacing.sm }}>
                    UDHAARI BREAKDOWN
                  </Text>
                  {udhaariInquiries.map((inq: Inquiry) => (
                    <View key={inq.id} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: Spacing.md,
                      backgroundColor: Colors.surface,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.border,
                    }}>
                      <View>
                        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{inq.customerName}</Text>
                        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>#{inq.slipNumber} · {inq.grade}</Text>
                      </View>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.danger }}>
                        {toIndianCurrency(inq.netAmount)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </ScrollView>
          ) : null}

          {/* TAB 4: Cash Book */}
          {activeTab === 'cashbook' ? (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}>
                {/* Add entry button */}
                <Pressable
                  testID="add-cash-entry"
                  onPress={() => setShowEntryModal(true)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    height: 44,
                    borderRadius: Radius.sm,
                    marginBottom: Spacing.md,
                    backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
                  })}
                >
                  <Plus size={16} color="#FFF" />
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>+ एंट्री जोड़ें</Text>
                </Pressable>

                {/* Receipts */}
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: Spacing.sm }}>
                  RECEIPTS
                </Text>
                {allReceipts.length === 0 ? (
                  <Text style={{ color: Colors.textSecond, fontSize: FontSize.sm, marginBottom: Spacing.md }}>No receipts</Text>
                ) : allReceipts.map((e, idx) => (
                  <View key={`${e.id}-${idx}`} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    backgroundColor: Colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}>
                    <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.text }} numberOfLines={1}>{e.description}</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.success }}>
                      +{toIndianCurrency(e.amount)}
                    </Text>
                  </View>
                ))}

                {/* Payments */}
                <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginTop: Spacing.md, marginBottom: Spacing.sm }}>
                  PAYMENTS
                </Text>
                {allPayments.length === 0 ? (
                  <Text style={{ color: Colors.textSecond, fontSize: FontSize.sm, marginBottom: Spacing.md }}>No payments</Text>
                ) : allPayments.map(e => (
                  <View key={e.id} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    backgroundColor: Colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}>
                    <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.text }} numberOfLines={1}>{e.description}</Text>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.danger }}>
                      -{toIndianCurrency(e.amount)}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Closing balance sticky */}
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: Colors.surface,
                borderTopWidth: 2,
                borderTopColor: Colors.border,
                padding: Spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -3 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 10,
              }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text }}>बैलेंस</Text>
                <Text style={{
                  fontSize: FontSize.xl,
                  fontWeight: '900',
                  color: closingBalance >= 0 ? Colors.success : Colors.danger,
                }}>
                  {toIndianCurrency(closingBalance)}
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}

      {/* Export options modal */}
      <Modal
        visible={showExportMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportMenu(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowExportMenu(false)}
        >
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: Spacing.md,
          }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', marginBottom: Spacing.md }}>Export Report</Text>
            <Pressable
              testID="export-pdf-btn"
              onPress={handleExport}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: Radius.sm,
                marginBottom: Spacing.sm,
                backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              })}
            >
              <FileText size={18} color="#FFF" />
              <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}>Full PDF Report</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Cash entry modal */}
      <Modal
        visible={showEntryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEntryModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowEntryModal(false)}
        >
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: Colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: Spacing.md,
          }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', marginBottom: Spacing.md }}>Add Cash Entry</Text>

            {/* Type toggle */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
              {(['RECEIPT', 'PAYMENT'] as const).map(t => (
                <Pressable
                  key={t}
                  testID={`entry-type-${t.toLowerCase()}`}
                  onPress={() => setEntryType(t)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: Radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: entryType === t ? (t === 'RECEIPT' ? Colors.success : Colors.danger) : Colors.background,
                    borderWidth: 1,
                    borderColor: entryType === t ? (t === 'RECEIPT' ? Colors.success : Colors.danger) : Colors.border,
                  }}
                >
                  <Text style={{
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                    color: entryType === t ? '#FFF' : Colors.textSecond,
                  }}>
                    {t === 'RECEIPT' ? 'Receipt' : 'Payment'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>DESCRIPTION</Text>
            <TextInput
              testID="entry-desc-input"
              value={entryDesc}
              onChangeText={setEntryDesc}
              placeholder="e.g. Transport expense"
              placeholderTextColor={Colors.textSecond}
              style={{
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: Radius.sm,
                paddingHorizontal: Spacing.sm,
                paddingVertical: 10,
                fontSize: FontSize.sm,
                color: Colors.text,
                marginBottom: Spacing.md,
              }}
            />

            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 6 }}>AMOUNT (₹)</Text>
            <TextInput
              testID="entry-amount-input"
              value={entryAmount}
              onChangeText={setEntryAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textSecond}
              style={{
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: Radius.sm,
                paddingHorizontal: Spacing.sm,
                paddingVertical: 12,
                fontSize: FontSize.lg,
                fontWeight: '700',
                color: Colors.text,
                marginBottom: Spacing.lg,
              }}
            />

            <Pressable
              testID="save-entry-btn"
              onPress={handleSaveEntry}
              disabled={savingEntry}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: Radius.sm,
                backgroundColor: savingEntry ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#FFF' }}>
                {savingEntry ? 'Saving...' : 'Save Entry'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
