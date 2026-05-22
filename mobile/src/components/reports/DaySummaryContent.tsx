import React, { useState, useMemo, useCallback } from 'react';
import { BottomNavBar } from '@/components/common/BottomNavBar';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Lock,
  LockOpen,
  MessageCircle,
  Plus,
  Share2,
} from 'lucide-react-native';
import PagerView from 'react-native-pager-view';
import { useQuery } from '@tanstack/react-query';
import { useDateInquiries } from '@/hooks/useDateInquiries';
import { useDateTrucks } from '@/hooks/useDateTrucks';
import { useCashEntries } from '@/hooks/useCashEntries';
import { useShop } from '@/context/ShopContext';
import { supabase, mapInquiry } from '@/lib/supabase';
import { exportAndShareReport, type CashEntry } from '@/utils/pdfGenerator';
import { generateCustomerMessage, openWhatsApp } from '@/utils/whatsapp';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Inquiry } from '@/types/inquiry';
import { archiveQueryOptions } from '@/lib/queryOptions';
import { getCurrentBusinessDate } from '@/lib/businessDay';

type TabKey = 'sale' | 'bills' | 'accounts' | 'payments' | 'cashbook';

const TAB_LABELS: Record<TabKey, string> = {
  sale: 'Sale',
  bills: 'Bills',
  accounts: 'Accounts',
  payments: 'Payments',
  cashbook: 'Cash Book',
};

const TAB_ORDER: TabKey[] = ['sale', 'bills', 'accounts', 'payments', 'cashbook'];

type DaySummaryContentProps = {
  showBottomNav?: boolean;
};

export default function DaySummaryContent({ showBottomNav = false }: DaySummaryContentProps) {
  const router = useRouter();
  const { shop } = useShop();
  const [date, setDate] = useState<Date>(getCurrentBusinessDate());
  const [activeTab, setActiveTab] = useState<TabKey>('sale');
  const [exporting, setExporting] = useState(false);
  const pagerRef = React.useRef<PagerView>(null);

  // Cash entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [entryDesc, setEntryDesc] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const { inquiries, loading: inqLoading } = useDateInquiries(date);
  const { trucks, loading: trucksLoading } = useDateTrucks(date);
  const { entries: cashEntries, addEntry } = useCashEntries(date);

  const dateParam = useMemo(() => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d.getTime(); }, [date]);
  const dateEndParam = useMemo(() => { const d = new Date(date); d.setHours(23, 59, 59, 999); return d.getTime(); }, [date]);
  const { data: allInquiries = [] } = useQuery({
    queryKey: ['inquiries', shop?.shopId, dateParam, dateEndParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .gte('date', dateParam)
        .lte('date', dateEndParam);
      if (error) throw new Error(error.message);
      return (data || []).map((r) => mapInquiry(r as Record<string, unknown>)) as Inquiry[];
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });
  const pendingCount = allInquiries.filter(i => i.status === 'PENDING').length;
  const generatedBills = useMemo(
    () => [...allInquiries].sort((a, b) => b.createdAt - a.createdAt),
    [allInquiries],
  );

  const dateKey = useMemo(() => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

  const [closingDay, setClosingDay] = useState(false);
  const {
    data: dayClosure,
    refetch: refetchDayClosure,
  } = useQuery({
    queryKey: ['day-closure', shop?.shopId, dateParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_closures')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('report_date', dateParam)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });
  const isDayClosed = !!dayClosure;

  const toggleDayClosed = useCallback(async () => {
    if (!shop?.shopId) return;
    setClosingDay(true);
    try {
      if (isDayClosed) {
        const { error } = await supabase
          .from('day_closures')
          .delete()
          .eq('shop_id', shop.shopId)
          .eq('report_date', dateParam);
        if (error) throw new Error(error.message);
      } else {
        const confirmedRows = allInquiries.filter((i) => i.status === 'CONFIRMED');
        const totals = {
          dateKey,
          bills: confirmedRows.length,
          pendingBills: allInquiries.filter((i) => i.status === 'PENDING').length,
          sacks: confirmedRows.reduce((sum, i) => sum + i.sacks, 0),
          weight: confirmedRows.reduce((sum, i) => sum + i.totalWeight, 0),
          gross: confirmedRows.reduce((sum, i) => sum + i.grossAmount, 0),
          net: confirmedRows.reduce((sum, i) => sum + i.netAmount, 0),
          trucks: trucks.length,
        };
        const { error } = await supabase.from('day_closures').upsert({
          shop_id: shop.shopId,
          report_date: dateParam,
          closed_by: 'admin',
          totals,
          closed_at: Date.now(),
          created_at: Date.now(),
        });
        if (error) throw new Error(error.message);
      }
      await refetchDayClosure();
    } catch {
      Alert.alert('Error', 'Could not update day close status.');
    } finally {
      setClosingDay(false);
    }
  }, [allInquiries, dateKey, dateParam, isDayClosed, refetchDayClosure, shop?.shopId, trucks.length]);

  const loading = inqLoading || trucksLoading;

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    if (d <= getCurrentBusinessDate()) setDate(d);
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

  const truckReports = useMemo(() => {
    const telePostShare = trucks.length > 0 ? telePost / trucks.length : 0;

    return trucks.map((truck) => {
      const rows = inquiries.filter((inq) => inq.truckId === truck.id);
      const sacks = rows.reduce((sum, inq) => sum + inq.sacks, 0);
      const weight = rows.reduce((sum, inq) => sum + inq.totalWeight, 0);
      const gross = rows.reduce((sum, inq) => sum + inq.grossAmount, 0);
      const apmc = rows.reduce((sum, inq) => sum + inq.apmcAmount, 0);
      const cartage = rows.reduce((sum, inq) => sum + inq.cartageAmount, 0);
      const bardana = rows.reduce((sum, inq) => sum + inq.bardanaAmount, 0);
      const commissionAmount = gross * commissionPct / 100;
      const net = gross - truck.freightAmount - commissionAmount - apmc - cartage - bardana - telePostShare;
      const gradeMap = new Map<string, { grade: string; gradeName: string; sacks: number; weight: number; gross: number; avgRate: number }>();

      for (const inq of rows) {
        const existing = gradeMap.get(inq.grade);
        if (existing) {
          existing.sacks += inq.sacks;
          existing.weight += inq.totalWeight;
          existing.gross += inq.grossAmount;
          existing.avgRate = existing.weight > 0 ? existing.gross / existing.weight : 0;
        } else {
          gradeMap.set(inq.grade, {
            grade: inq.grade,
            gradeName: inq.gradeName,
            sacks: inq.sacks,
            weight: inq.totalWeight,
            gross: inq.grossAmount,
            avgRate: inq.ratePerKg,
          });
        }
      }

      return {
        truck,
        bills: rows.length,
        sacks,
        weight,
        gross,
        apmc,
        cartage,
        bardana,
        commission: commissionAmount,
        telePost: telePostShare,
        net,
        grades: Array.from(gradeMap.values()),
      };
    });
  }, [commissionPct, inquiries, telePost, trucks]);

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
    setExporting(true);
    try {
      await exportAndShareReport({
        date: date.getTime(),
        shop,
        confirmedInquiries: inquiries,
        trucks,
        cashEntries,
      });
    } catch {
      Alert.alert('Error', 'Could not generate report.');
    } finally {
      setExporting(false);
    }
  };

  const handleSendBill = (bill: Inquiry) => {
    if (!shop) return;
    if (!bill.customerPhone) {
      Alert.alert('No phone number', 'Open the slip and use Share PDF/Image, or add the buyer phone number first.');
      return;
    }
    openWhatsApp(bill.customerPhone, generateCustomerMessage(bill, shop));
  };

  const isToday = date.toDateString() === getCurrentBusinessDate().toDateString();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top']}>
      <View style={{ flex: 1 }}>
        {/* Header section -- static */}
        <View style={{
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          paddingHorizontal: 20,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Left: title block */}
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              fontSize: 26,
              fontWeight: '700',
              color: '#00450d',
              letterSpacing: -0.5,
            }}>
              Day Report / आज की रिपोर्ट
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Daily Business Summary
            </Text>
          </View>

          {/* Right: date pill */}
          <View style={{
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#c0c9bb',
            borderRadius: 12,
            height: 48,
            paddingHorizontal: 14,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}>
            <Pressable testID="prev-day-btn" onPress={prevDay} hitSlop={8}>
              <ChevronLeft size={18} color="#071e27" />
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#071e27' }}>
                {toIndianDate(date.getTime())}
              </Text>
              {isToday ? (
                <Text style={{ fontSize: 10, color: '#00450d', fontWeight: '700', lineHeight: 12 }}>
                  आज
                </Text>
              ) : null}
            </View>

            <Pressable
              testID="next-day-btn"
              onPress={nextDay}
              disabled={isToday}
              hitSlop={8}
              style={{ opacity: isToday ? 0.3 : 1 }}
            >
              <ChevronRight size={18} color="#071e27" />
            </Pressable>
          </View>
        </View>

        {isDayClosed ? (
          <View testID="day-closed-badge" style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: '#E8F5E9',
            borderBottomWidth: 1,
            borderBottomColor: '#C8E6C9',
            paddingVertical: 8,
          }}>
            <Lock size={14} color="#2E7D32" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E7D32' }}>
              Day Closed / दिन बंद
            </Text>
          </View>
        ) : null}

        {/* Tab bar -- static */}
        <View style={{
          backgroundColor: '#f3faff',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}>
          <View style={{
            backgroundColor: '#e6f6ff',
            borderRadius: 14,
            padding: 4,
            flexDirection: 'row',
            overflow: 'visible',
          }}>
            {TAB_ORDER.map(key => {
              const active = activeTab === key;
              return (
                <Pressable
                  key={key}
                  testID={`tab-${key === 'cashbook' ? 'cashbook' : key}`}
                  onPress={() => {
                    setActiveTab(key);
                    pagerRef.current?.setPage(TAB_ORDER.indexOf(key));
                  }}
                  style={{
                    flex: 1,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: active ? '#00450d' : 'transparent',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: active ? '700' : '400',
                    color: active ? '#ffffff' : '#64748B',
                  }}>
                    {TAB_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Tab content */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <ActivityIndicator testID="reports-loading" color="#00450d" size="large" />
          </View>
        ) : (
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={TAB_ORDER.indexOf(activeTab) !== -1 ? TAB_ORDER.indexOf(activeTab) : 0}
            onPageSelected={(e) => setActiveTab(TAB_ORDER[e.nativeEvent.position])}
          >
            {/* TAB 1: Sale */}
            <View key="sale" style={{ flex: 1 }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}
              >
                {/* Truck-wise reports */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#00450d', marginBottom: 10 }}>
                    Truck-wise Reports / गाड़ी अनुसार रिपोर्ट
                  </Text>
                  {truckReports.length === 0 ? (
                    <View style={{
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                    }}>
                      <Text style={{ color: '#64748B' }}>No trucks registered for this date</Text>
                    </View>
                  ) : (
                    truckReports.map((report) => (
                      <View key={report.truck.id} style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#C0C9BB',
                        borderRadius: 14,
                        marginBottom: 12,
                        overflow: 'hidden',
                      }}>
                        <View style={{
                          backgroundColor: '#dbf1fe',
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderLeftWidth: 4,
                          borderLeftColor: '#00450d',
                        }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#071e27' }}>
                            {report.truck.truckNumber}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                            {report.truck.senderName || 'Sender'} · Load {Math.round(report.truck.totalKg).toLocaleString('en-IN')} kg · {report.bills} bill{report.bills === 1 ? '' : 's'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 }}>
                          {[
                            ['Sacks', String(report.sacks)],
                            ['Weight', `${Math.round(report.weight).toLocaleString('en-IN')} kg`],
                            ['Gross', toIndianCurrency(report.gross)],
                            ['Net', toIndianCurrency(report.net)],
                          ].map(([label, value]) => (
                            <View key={label} style={{
                              width: '48%',
                              backgroundColor: '#f3faff',
                              borderRadius: 10,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                            }}>
                              <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>{label}</Text>
                              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15, color: label === 'Net' ? '#00450d' : '#071e27', fontWeight: '800', marginTop: 3 }}>
                                {value}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {report.grades.length > 0 ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ minWidth: 420 }}>
                            <View style={{
                              backgroundColor: '#f3faff',
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              borderTopWidth: 1,
                              borderTopColor: '#E5E7EB',
                              borderBottomWidth: 1,
                              borderBottomColor: '#E5E7EB',
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                              <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                Grade
                              </Text>
                              <Text style={{ width: 48, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                                Sacks
                              </Text>
                              <Text style={{ width: 70, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                                Weight
                              </Text>
                              <Text style={{ width: 62, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                                Avg Rate
                              </Text>
                              <Text style={{ width: 82, fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                                Gross
                              </Text>
                            </View>

                            {report.grades.map((grade, idx) => (
                              <View key={grade.grade} style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                                borderBottomWidth: 1,
                                borderBottomColor: '#E5E7EB',
                              }}>
                                <View style={{ flex: 2 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#071e27' }}>
                                    {grade.grade}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: '#64748B' }} numberOfLines={1}>
                                    {grade.gradeName}
                                  </Text>
                                </View>
                                <Text style={{ width: 48, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#071e27' }}>
                                  {grade.sacks}
                                </Text>
                                <Text style={{ width: 70, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#071e27' }}>
                                  {grade.weight.toFixed(0)} kg
                                </Text>
                                <Text style={{ width: 62, textAlign: 'right', fontSize: 12, fontWeight: '700', color: '#071e27' }}>
                                  {'\u20B9'}{grade.avgRate.toFixed(0)}
                                </Text>
                                <Text style={{ width: 82, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#00450d' }}>
                                  {toIndianCurrency(grade.gross)}
                                </Text>
                              </View>
                            ))}

                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#00450d',
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                            }}>
                              <Text style={{ flex: 2, fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                                Total
                              </Text>
                              <Text style={{ width: 48, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                                {report.sacks}
                              </Text>
                              <Text style={{ width: 70, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                                {report.weight.toFixed(0)} kg
                              </Text>
                              <Text style={{ width: 62, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                                {'\u20B9'}{report.weight > 0 ? (report.gross / report.weight).toFixed(0) : '0'}
                              </Text>
                              <Text style={{ width: 82, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                                {toIndianCurrency(report.gross)}
                              </Text>
                            </View>
                            </View>
                          </ScrollView>
                        ) : (
                          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                            <Text style={{ fontSize: 12, color: '#64748B' }}>
                              No confirmed bills for this truck yet.
                            </Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>

                {/* Grade Table Card */}
                <View style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  overflow: 'hidden',
                  marginBottom: 16,
                }}>
                  {/* Card header */}
                  <View style={{
                    backgroundColor: '#dbf1fe',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#00450d' }}>
                      Sales Summary by Grade
                    </Text>
                  </View>

                  {/* Table column headers */}
                  <View style={{
                    backgroundColor: '#f3faff',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Grade
                    </Text>
                    <Text style={{ width: 50, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                      Sacks
                    </Text>
                    <Text style={{ width: 80, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                      Weight
                    </Text>
                    <Text style={{ width: 70, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                      Avg Rate
                    </Text>
                    <Text style={{ width: 90, fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>
                      Gross
                    </Text>
                  </View>

                  {/* Empty state */}
                  {gradeSummary.length === 0 ? (
                    <View testID="no-bills-msg" style={{ paddingVertical: 32, alignItems: 'center' }}>
                      <Text style={{ color: '#64748B' }}>No confirmed bills for this date</Text>
                    </View>
                  ) : (
                    <>
                      {gradeSummary.map((row, idx) => (
                        <View key={row.grade} style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                          borderBottomWidth: 1,
                          borderBottomColor: '#E5E7EB',
                        }}>
                          <View style={{ flex: 2 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#071e27' }}>
                              {row.grade}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              {row.gradeName}
                            </Text>
                          </View>
                          <Text style={{ width: 50, fontSize: 14, fontWeight: '700', color: '#071e27', textAlign: 'right' }}>
                            {row.sacks}
                          </Text>
                          <Text style={{ width: 80, fontSize: 14, fontWeight: '700', color: '#071e27', textAlign: 'right' }}>
                            {row.weight.toFixed(0)} kg
                          </Text>
                          <Text style={{ width: 70, fontSize: 14, fontWeight: '700', color: '#071e27', textAlign: 'right' }}>
                            {'\u20B9'}{row.avgRate.toFixed(0)}
                          </Text>
                          <Text style={{ width: 90, fontSize: 14, fontWeight: '700', color: '#00450d', textAlign: 'right' }}>
                            {toIndianCurrency(row.gross)}
                          </Text>
                        </View>
                      ))}

                      {/* Total row */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#00450d',
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                      }}>
                        <Text style={{ flex: 2, fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                          Total
                        </Text>
                        <Text style={{ width: 50, fontSize: 13, fontWeight: '700', color: '#ffffff', textAlign: 'right' }}>
                          {totalSacks}
                        </Text>
                        <Text style={{ width: 80, fontSize: 13, fontWeight: '700', color: '#ffffff', textAlign: 'right' }}>
                          {totalWeight.toFixed(0)} kg
                        </Text>
                        <Text style={{ width: 70, fontSize: 13, fontWeight: '700', color: '#ffffff', textAlign: 'right' }}>
                          {'\u20B9'}{totalAvgRate.toFixed(0)}
                        </Text>
                        <Text style={{ width: 90, fontSize: 13, fontWeight: '700', color: '#ffffff', textAlign: 'right' }}>
                          {toIndianCurrency(totalGross)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Net Settlement Card */}
                <View style={{
                  backgroundColor: '#cfe6f2',
                  borderWidth: 1,
                  borderColor: '#c0c9bb',
                  borderRadius: 14,
                  padding: 20,
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#00450d', marginBottom: 16 }}>
                    Net Settlement
                  </Text>

                  {/* Line items */}
                  {[
                    { label: 'Gross Sale / कुल बिक्री', amount: totalGross, deduct: false },
                    { label: '- Freight / भाड़ा', amount: totalFreight, deduct: true },
                    { label: `- Commission (${commissionPct}%) / कमीशन`, amount: commission, deduct: true },
                    { label: '- APMC / मंडी शुल्क', amount: totalApmc, deduct: true },
                    ...(totalCartage > 0 ? [{ label: '- Cartage', amount: totalCartage, deduct: true }] : []),
                    ...(totalBardana > 0 ? [{ label: '- Bardana', amount: totalBardana, deduct: true }] : []),
                  ].map(item => (
                    <View key={item.label} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: 'rgba(0,0,0,0.06)',
                    }}>
                      <Text style={{ fontSize: 14, color: '#071e27' }}>{item.label}</Text>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: item.deduct ? '#ba1a1a' : '#071e27',
                      }}>
                        {toIndianCurrency(item.amount)}
                      </Text>
                    </View>
                  ))}

                  {/* Dashed divider */}
                  <View style={{ height: 1, backgroundColor: '#717a6d', opacity: 0.4, marginVertical: 12 }} />

                  {/* Net row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#00450d' }}>
                        Net to Sender
                      </Text>
                      <Text style={{ fontSize: 11, color: '#41493e', marginTop: 2 }}>
                        भेजने वाले को शुद्ध देय
                      </Text>
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#00450d' }}>
                      {toIndianCurrency(netToSender)}
                    </Text>
                  </View>
                </View>

                {/* Export PDF Card */}
                <View style={{
                  backgroundColor: '#e8f5e9',
                  borderWidth: 1,
                  borderColor: '#a5d6a7',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1b5e20', marginBottom: 12 }}>
                    📄 Day Report / दिन की रिपोर्ट
                  </Text>
                  <Pressable
                    testID="export-fab"
                    onPress={handleExport}
                    disabled={exporting}
                  >
                    <View style={{
                      backgroundColor: '#00450d',
                      borderRadius: 12,
                      height: 56,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}>
                      {exporting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <FileText size={22} color="#ffffff" />}
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
                          Export &amp; Share PDF
                        </Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                          पीडीएफ निर्यात करें
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              </ScrollView>
            </View>

            {/* TAB 2: Generated Bills */}
            <View key="bills" style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
                <View style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 12,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#00450d' }}>
                    Daywise Generated Bills
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    {generatedBills.length} bill{generatedBills.length === 1 ? '' : 's'} created on {toIndianDate(date.getTime())}
                  </Text>
                </View>

                {generatedBills.length === 0 ? (
                  <View style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 14,
                    padding: 24,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: '#64748B', fontSize: 14 }}>No bills generated for this date</Text>
                  </View>
                ) : generatedBills.map((bill) => (
                  <View key={bill.id} style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 10,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#071e27' }}>
                          #{bill.slipNumber} · {bill.customerName}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {bill.truckNumber} · {bill.grade} · {bill.sacks} case · {Math.round(bill.totalWeight).toLocaleString('en-IN')} kg
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          {bill.status} · {bill.paymentMode} · {toIndianCurrency(bill.netAmount)}
                        </Text>
                      </View>
                      <View style={{
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: bill.status === 'CONFIRMED' ? '#E8F5E9' : '#FFF8E1',
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: bill.status === 'CONFIRMED' ? '#2E7D32' : '#7e5700',
                        }}>
                          {bill.status}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <Pressable
                        testID={`send-bill-${bill.id}`}
                        onPress={() => handleSendBill(bill)}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          backgroundColor: pressed ? '#1B5E20' : '#25D366',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: bill.customerPhone ? 1 : 0.55,
                        })}
                      >
                        <MessageCircle size={16} color="#FFF" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Send</Text>
                      </Pressable>
                      <Pressable
                        testID={`view-bill-${bill.id}`}
                        onPress={() => router.push(`/slip/${bill.id}` as any)}
                        style={({ pressed }) => ({
                          flex: 1,
                          height: 42,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#00450d',
                          backgroundColor: pressed ? '#E8F5E9' : '#FFFFFF',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        })}
                      >
                        <Eye size={16} color="#00450d" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#00450d' }}>View</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* TAB 3: Accounts */}
            <View key="accounts" style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
                {pendingCount > 0 ? (
                  <View
                    testID="pending-warning-banner"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#FFF8E1',
                      borderWidth: 1,
                      borderColor: '#FFE082',
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 12,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>⚠</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#7e5700', fontWeight: '600' }}>
                      {pendingCount} bill{pendingCount > 1 ? 's' : null} still pending authorization — not included in this summary
                    </Text>
                  </View>
                ) : null}
                <View style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}>
                  {[
                    { label: 'Gross Sale / कुल बिक्री', amount: totalGross, deduct: false },
                    { label: 'Less Freight / भाड़ा', amount: totalFreight, deduct: true },
                    { label: `Less Commission (${commissionPct}%) / कमीशन`, amount: commission, deduct: true },
                    { label: 'Less APMC / मंडी शुल्क', amount: totalApmc, deduct: true },
                    { label: 'Less Cartage', amount: totalCartage, deduct: true },
                    { label: 'Less Tele & Post', amount: telePost, deduct: true },
                    { label: 'Less Bardana', amount: totalBardana, deduct: true },
                  ].map(row => (
                    <View key={row.label} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <Text style={{ fontSize: 14, color: '#071e27' }}>{row.label}</Text>
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: row.deduct ? '#ba1a1a' : '#071e27',
                      }}>
                        {row.deduct ? '-' : null}{toIndianCurrency(row.amount)}
                      </Text>
                    </View>
                  ))}

                  {/* NET TO SENDER row */}
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#e8f5e9',
                    paddingHorizontal: 16,
                    paddingVertical: 18,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#00450d' }}>
                      NET TO SENDER
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#00450d' }}>
                      {toIndianCurrency(netToSender)}
                    </Text>
                  </View>
                </View>



                {/* Close Day / Reopen Day button */}
                <Pressable
                  testID="close-day-btn"
                  onPress={toggleDayClosed}
                  disabled={closingDay}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: isDayClosed
                      ? '#F57C00'
                      : '#2E7D32',
                    opacity: closingDay ? 0.6 : 1,
                    marginTop: 24,
                  }}>
                    {isDayClosed ? (
                      <LockOpen size={20} color="#FFF" />
                    ) : (
                      <Lock size={20} color="#FFF" />
                    )}
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>
                        {isDayClosed ? 'Reopen Day' : 'Close Day'}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                        {isDayClosed ? 'दिन खोलें' : 'दिन बंद करें'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </ScrollView>
            </View>

            {/* TAB 4: Payments */}
            <View key="payments" style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
                {/* Summary cards */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Cash', amount: cashInquiries.reduce((s, i) => s + i.netAmount, 0), count: cashInquiries.length, color: '#00450d' },
                    { label: 'UPI', amount: upiInquiries.reduce((s, i) => s + i.netAmount, 0), count: upiInquiries.length, color: '#0277bd' },
                    { label: 'उधारी', amount: udhaariInquiries.reduce((s, i) => s + i.netAmount, 0), count: udhaariInquiries.length, color: '#ba1a1a' },
                  ].map(card => (
                    <View key={card.label} style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 12,
                      padding: 14,
                      borderTopWidth: 3,
                      borderTopColor: card.color,
                      alignItems: 'center',
                    }}>
                      <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{card.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: card.color }}>
                        {toIndianCurrency(card.amount)}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{card.count} bills</Text>
                    </View>
                  ))}
                </View>

                {/* Udhaari breakdown */}
                {udhaariInquiries.length > 0 ? (
                  <View style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 14,
                    overflow: 'hidden',
                  }}>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        Udhaari Breakdown
                      </Text>
                    </View>
                    {udhaariInquiries.map((inq: Inquiry) => (
                      <View key={inq.id} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E5E7EB',
                      }}>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>{inq.customerName}</Text>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>#{inq.slipNumber} · {inq.grade}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ba1a1a' }}>
                          {toIndianCurrency(inq.netAmount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {/* TAB 5: Cash Book */}
            <View key="cashbook" style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }}>
               
                {/* Receipts */}
                <View style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  overflow: 'hidden',
                  marginBottom: 14,
                }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#f0fdf4' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#00450d', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Receipts
                    </Text>
                  </View>
                  {allReceipts.length === 0 ? (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                      <Text style={{ color: '#64748B', fontSize: 14 }}>No receipts</Text>
                    </View>
                  ) : allReceipts.map((e, idx) => (
                    <View key={`${e.id}-${idx}`} style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#E5E7EB',
                    }}>
                      <Text style={{ flex: 1, fontSize: 14, color: '#071e27' }} numberOfLines={1}>{e.description}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#00450d' }}>
                        +{toIndianCurrency(e.amount)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Payments */}
                <View style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 14,
                  overflow: 'hidden',
                  marginBottom: 14,
                }}>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff5f5' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ba1a1a', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Payments
                    </Text>
                  </View>
                  {allPayments.length === 0 ? (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                      <Text style={{ color: '#64748B', fontSize: 14 }}>No payments</Text>
                    </View>
                  ) : allPayments.map(e => (
                      <View key={e.id} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E5E7EB',
                      }}>
                        <Text style={{ flex: 1, fontSize: 14, color: '#071e27' }} numberOfLines={1}>{e.description}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ba1a1a' }}>
                          -{toIndianCurrency(e.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>

                   {/* Add entry button */}
                <Pressable
                  testID="add-cash-entry"
                  onPress={() => setShowEntryModal(true)}
                  disabled={isDayClosed}
                  style={({ pressed }) => ({
                    marginBottom: 16,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    height: 56,
                    borderRadius: 14,
                    backgroundColor: isDayClosed ? '#9E9E9E' : '#00450d',
                    opacity: isDayClosed ? 0.6 : 1,
                  }}>
                    {isDayClosed ? (
                      <Lock size={18} color="#FFF" />
                    ) : (
                      <Plus size={18} color="#FFF" />
                    )}
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>
                        {isDayClosed ? 'Day Closed' : 'एंट्री जोड़ें'}
                      </Text>
                      {isDayClosed ? (
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
                          Cannot Add
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                {/* Closing balance sticky */}
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderTopWidth: 2,
                  borderTopColor: '#E5E7EB',
                  padding: 16,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -3 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 10,
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#071e27' }}>बैलेंस</Text>
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '700',
                    color: closingBalance >= 0 ? '#00450d' : '#ba1a1a',
                  }}>
                    {toIndianCurrency(closingBalance)}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </PagerView>
        )}
      </View>



      {/* Cash entry modal */}
      <Modal
        visible={showEntryModal}
        transparent
        animationType="slide"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowEntryModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setShowEntryModal(false)}
        >
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <ScrollView
              scrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1 }}
              style={{ maxHeight: '90%' }}
            >
              <View style={{
                backgroundColor: Colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: Spacing.md,
                paddingBottom: Spacing.xl + 40,
              }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md }}>Add Cash Entry</Text>

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
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{
                height: 52,
                borderRadius: Radius.sm,
                backgroundColor: savingEntry ? Colors.border : Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFF' }}>
                  {savingEntry ? 'Saving...' : 'Save Entry'}
                </Text>
              </View>
            </Pressable>
          </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {showBottomNav ? <BottomNavBar /> : null}
    </SafeAreaView>
  );
}
