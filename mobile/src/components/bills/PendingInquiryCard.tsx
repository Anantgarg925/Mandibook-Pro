import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Switch } from 'react-native';
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Phone, Clock, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { useShop } from '@/context/ShopContext';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { calculateCharges } from '@/utils/calculations';
import type { Inquiry, PaymentMode } from '@/types/inquiry';
import PaymentSelector from './PaymentSelector';

export default function PendingInquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const { shop } = useShop();
  const { trucks } = useTodayTrucks();
  const queryClient = useQueryClient();

  const [truckId, setTruckId] = useState(inquiry.truckId);
  const [customerName, setCustomerName] = useState(inquiry.customerName);
  const [customerPhone, setCustomerPhone] = useState(inquiry.customerPhone);
  const [grade, setGrade] = useState(inquiry.grade);
  const [sacks, setSacks] = useState(String(inquiry.sacks));
  const [weightPerSack, setWeightPerSack] = useState(String(inquiry.weightPerSack));
  const [rate, setRate] = useState(inquiry.ratePerKg > 0 ? String(inquiry.ratePerKg) : '');
  const [totalBillAmount, setTotalBillAmount] = useState(
    inquiry.ratePerKg > 0 ? String(Math.round(inquiry.totalWeight * inquiry.ratePerKg * 100) / 100) : ''
  );
  const [applyApmc, setApplyApmc] = useState(inquiry.applyApmc);
  const [applyBardana, setApplyBardana] = useState(inquiry.applyBardana);
  const [bardanaSacks, setBardanaSacks] = useState(String(inquiry.bardanaSacks || inquiry.sacks || 0));
  const [bardanaRate, setBardanaRate] = useState(String(inquiry.bardanaRate || shop?.charges?.bardanaPerSack || 0));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(inquiry.paymentMode || 'PENDING');
  const [upiRef, setUpiRef] = useState(inquiry.upiRef || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedTruck = trucks.find((truck) => truck.id === truckId);
  const gradeOptions = selectedTruck?.gradeInventory.length
    ? selectedTruck.gradeInventory
    : (shop?.grades ?? []).map((g) => ({
        code: g.code,
        name: g.name,
        totalKg: 0,
        confirmedKg: 0,
        provisionalKg: 0,
      }));
  const selectedGrade = gradeOptions.find((g) => g.code === grade);
  const gradeName = selectedGrade?.name ?? inquiry.gradeName ?? grade;
  const sacksNum = parseInt(sacks, 10) || 0;
  const weightPerSackNum = parseFloat(weightPerSack) || 0;
  const rateNum = parseFloat(rate) || 0;
  const bardanaSacksNum = parseFloat(bardanaSacks) || sacksNum;
  const bardanaRateNum = parseFloat(bardanaRate) || 0;

  useEffect(() => {
    setTruckId(inquiry.truckId);
    setCustomerName(inquiry.customerName);
    setCustomerPhone(inquiry.customerPhone);
    setGrade(inquiry.grade);
    setSacks(String(inquiry.sacks));
    setWeightPerSack(String(inquiry.weightPerSack));
    setRate(inquiry.ratePerKg > 0 ? String(inquiry.ratePerKg) : '');
    setTotalBillAmount(
      inquiry.ratePerKg > 0 ? String(Math.round(inquiry.totalWeight * inquiry.ratePerKg * 100) / 100) : ''
    );
    setApplyApmc(inquiry.applyApmc);
    setApplyBardana(inquiry.applyBardana);
    setBardanaSacks(String(inquiry.bardanaSacks || inquiry.sacks || 0));
    setBardanaRate(String(inquiry.bardanaRate || shop?.charges?.bardanaPerSack || 0));
    setPaymentMode(inquiry.paymentMode || 'PENDING');
    setUpiRef(inquiry.upiRef || '');
  }, [inquiry, shop?.charges?.bardanaPerSack]);

  const lastTapRef = useRef(0);
  const shakeRate = useSharedValue(0);
  const shakePayment = useSharedValue(0);

  const shake = (val: SharedValue<number>) => {
    val.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const shakeRateStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeRate.value }] }));
  const shakePaymentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakePayment.value }] }));

  const calc =
    sacksNum > 0 && weightPerSackNum > 0 && shop?.charges
      ? calculateCharges({
          sacks: sacksNum,
          weightPerSack: weightPerSackNum,
          ratePerKg: rateNum,
          charges: {
            apmcPct: shop.charges.apmcCommission,
            bardanaPerSack: shop.charges.bardanaPerSack,
            cartagePerKg: shop.charges.cartagePerKg,
          },
          applyApmc,
          applyBardana,
          bardanaSacks: bardanaSacksNum,
          bardanaRate: bardanaRateNum,
        })
      : null;

  const totalWeight = calc?.totalWeight ?? sacksNum * weightPerSackNum;

  const cleanDecimal = (value: string) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const formatMoneyInput = (value: number) =>
    Number.isFinite(value) && value > 0 ? String(Math.round(value * 100) / 100) : '';

  const handleRateChange = (value: string) => {
    const cleaned = cleanDecimal(value);
    setRate(cleaned);
    const nextRate = parseFloat(cleaned) || 0;
    setTotalBillAmount(formatMoneyInput(totalWeight * nextRate));
    if (errors.rate) setErrors((prev) => { const { rate: _rate, ...rest } = prev; return rest; });
  };

  const handleTotalBillAmountChange = (value: string) => {
    const cleaned = cleanDecimal(value);
    setTotalBillAmount(cleaned);
    const nextTotal = parseFloat(cleaned) || 0;
    setRate(totalWeight > 0 ? formatMoneyInput(nextTotal / totalWeight) : '');
    if (errors.rate) setErrors((prev) => { const { rate: _rate, ...rest } = prev; return rest; });
  };

  const timeDiffMins = Math.floor((Date.now() - inquiry.date) / 60000);
  const timeAgoStr = timeDiffMins < 1 ? 'Just now' : `${timeDiffMins} mins ago`;

  const buildInquiryUpdate = (status?: 'PENDING' | 'CONFIRMED') => {
    if (!calc) throw new Error('Missing calculation');
    return {
      truck_id: truckId,
      truck_number: selectedTruck?.truckNumber ?? inquiry.truckNumber,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      grade,
      grade_name: gradeName,
      sacks: sacksNum,
      weight_per_sack: weightPerSackNum,
      total_weight: calc.totalWeight,
      rate_per_kg: rateNum,
      gross_amount: calc.gross,
      apmc_amount: calc.apmc,
      bardana_amount: calc.bardana,
      cartage_amount: calc.cartage,
      bardana_sacks: applyBardana ? bardanaSacksNum : 0,
      bardana_rate: applyBardana ? bardanaRateNum : 0,
      apply_bardana: applyBardana,
      apply_apmc: applyApmc,
      charge_snapshot: {
        apmcCommission: shop?.charges?.apmcCommission ?? 0,
        bardanaPerSack: shop?.charges?.bardanaPerSack ?? 0,
        cartagePerKg: shop?.charges?.cartagePerKg ?? 0,
        applyApmc,
        applyBardana,
      },
      net_amount: calc.net,
      payment_mode: paymentMode,
      upi_ref: upiRef.trim(),
      ...(status
        ? {
            status,
            slip_status: status === 'CONFIRMED' ? 'authorized' : 'draft',
          }
        : {}),
    };
  };

  const validateEdits = (requirePayment = false) => {
    const e: Record<string, string> = {};
    if (!truckId) e.truck = 'गाड़ी चुनें / Select truck';
    if (paymentMode === 'UDHAARI' && !customerName.trim() && !customerPhone.trim()) {
      e.customer = 'उधारी के लिए नाम या नंबर डालें / Enter name or phone';
    }
    if (!grade) e.grade = 'ग्रेड चुनें / Select grade';
    if (sacksNum <= 0) e.sacks = 'बोरे डालें / Enter sacks';
    if (weightPerSackNum <= 0) e.weight = 'वजन डालें / Enter weight';
    if (!rate.trim() || rateNum <= 0) e.rate = 'रेट डालें / Enter rate';
    if (requirePayment && paymentMode === 'PENDING') e.payment = 'भुगतान मोड चुनें / Select payment mode';
    setErrors(e);
    return e;
  };

  const saveEditsMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !calc) throw new Error('Missing shop or calculation');
      const { error } = await supabase
        .from('inquiries')
        .update(buildInquiryUpdate('PENDING'))
        .eq('id', inquiry.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
    },
    onError: (error: Error) => {
      console.error('Save error:', error);
      setErrors({ save: error.message || 'Save failed. Try again.' });
    },
  });

  const authorizeMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !calc) throw new Error('Missing shop or calculation');
      const now = Date.now();

      const { error: inquiryUpdateError } = await supabase
        .from('inquiries')
        .update(buildInquiryUpdate('CONFIRMED'))
        .eq('id', inquiry.id);
      if (inquiryUpdateError) throw new Error(inquiryUpdateError.message);

      if (paymentMode === 'UDHAARI') {
        const { data: buyerRows, error: buyerFetchError } = await supabase
          .from('buyers')
          .select('*')
          .eq('shop_id', shop.shopId);
        if (buyerFetchError) throw new Error(buyerFetchError.message);

        const normalizedName = customerName.trim().toLowerCase();
        const normalizedPhone = customerPhone.trim();
        const existing = (buyerRows ?? []).find((buyer) => {
          const buyerPhone = String(buyer.phone ?? '').trim();
          const buyerName = String(buyer.name ?? '').trim().toLowerCase();
          return (
            (!!normalizedPhone && buyerPhone === normalizedPhone) ||
            (!!normalizedName && buyerName === normalizedName)
          );
        });

        const buyerCode = existing?.code ?? `B${now}`;

        if (existing) {
          const { error: buyerUpdateError } = await supabase
            .from('buyers')
            .update({
              outstanding_balance: Number(existing.outstanding_balance ?? 0) + calc.net,
              last_transaction_date: now,
            })
            .eq('id', existing.id);
          if (buyerUpdateError) throw new Error(buyerUpdateError.message);
        } else {
          const { error: buyerInsertError } = await supabase.from('buyers').insert({
            shop_id: shop.shopId,
            code: buyerCode,
            name: customerName.trim(),
            phone: customerPhone.trim(),
            outstanding_balance: calc.net,
            last_transaction_date: now,
            created_at: now,
          });
          if (buyerInsertError) throw new Error(buyerInsertError.message);
        }

        const { error: transactionError } = await supabase.from('transactions').insert({
          shop_id: shop.shopId,
          buyer_code: buyerCode,
          type: 'SALE',
          amount: calc.net,
          date: now,
          note: `Bill #${inquiry.slipNumber}`,
          slip_number: inquiry.slipNumber,
          created_at: now,
        });
        if (transactionError) throw new Error(transactionError.message);
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['inquiry', shop?.shopId, inquiry.id], (old: any) => 
        old ? { ...old, status: 'CONFIRMED' } : old
      );
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      
      router.push(`/slip/${inquiry.id}`);
    },
    onError: (error: Error) => {
      console.error('Authorize error:', error);
      setErrors({ rate: error.message || 'Authorize failed. Try again.' });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId) throw new Error('Missing shop');
      await supabase.from('inquiries').update({ status: 'CANCELLED' }).eq('id', inquiry.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
    },
  });

  const handleAuthorize = async () => {
    if (!shop?.shopId || authorizeMutation.isPending) return;

    const e = validateEdits(true);
    if (Object.keys(e).length > 0) {
      if (e.rate) shake(shakeRate);
      if (e.payment) shake(shakePayment);
      return;
    }

    authorizeMutation.mutate();
  };

  const handleSaveEdits = () => {
    if (saveEditsMutation.isPending) return;
    const e = validateEdits(false);
    if (Object.keys(e).length > 0) {
      if (e.rate) shake(shakeRate);
      return;
    }
    saveEditsMutation.mutate();
  };

  const handleCancel = () => {
    if (cancelMutation.isPending) return;
    cancelMutation.mutate();
  };

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: Radius.lg,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0' // Light border similar to image
      }}
    >
      {/* Top Header - Light Blue */}
      <View
        style={{
          backgroundColor: '#F0F9FF',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0'
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#0F2C23', letterSpacing: 0.5 }}>
            SLIP #SL-{inquiry.slipNumber}
          </Text>
          <View style={{ backgroundColor: '#FDE047', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#1F2937' }}>
              VERIFICATION NEEDED
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Clock size={12} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: FontSize.xs, color: '#6B7280', fontWeight: '500' }}>
            {timeAgoStr}
          </Text>
        </View>
      </View>

      {/* Customer & Grade Section */}
      <View style={{ padding: Spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md }}>
          <User size={22} color="#0EA5E9" />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            testID={`auth-customer-name-${inquiry.id}`}
            style={{
              fontSize: FontSize.lg,
              fontWeight: '800',
              color: '#0F2C23',
              borderBottomWidth: 1,
              borderBottomColor: errors.customer ? Colors.danger : '#CBD5E1',
              paddingVertical: 2,
            }}
            placeholder="Customer name"
            placeholderTextColor="#94A3B8"
            value={customerName}
            onChangeText={(value) => {
              setCustomerName(value);
              if (errors.customer) setErrors((prev) => { const { customer, ...rest } = prev; return rest; });
            }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Phone size={12} color="#0EA5E9" style={{ marginRight: 4 }} />
            <TextInput
              testID={`auth-customer-phone-${inquiry.id}`}
              style={{
                flex: 1,
                fontSize: FontSize.sm,
                color: '#0EA5E9',
                fontWeight: '700',
                paddingVertical: 0,
              }}
              placeholder="Phone"
              placeholderTextColor="#94A3B8"
              value={customerPhone}
              onChangeText={(value) => setCustomerPhone(value.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600', marginBottom: 2 }}>Grade / श्रेणी</Text>
          <Text style={{ fontSize: FontSize.md, color: '#0F2C23', fontWeight: '800' }}>{gradeName}</Text>
        </View>
      </View>

      {/* Slip details */}
      <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>
        <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: Radius.sm, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: Spacing.sm, paddingVertical: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 10, color: '#111827', fontWeight: '900', letterSpacing: 0.4 }}>
              SLIP DETAILS
            </Text>
          </View>
          <View style={{ padding: Spacing.sm, gap: 6 }}>
            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6 }}>Truck</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {trucks.map((truck) => {
                  const active = truck.id === truckId;
                  return (
                    <Pressable
                      key={truck.id}
                      testID={`auth-truck-${inquiry.id}-${truck.id}`}
                      onPress={() => {
                        setTruckId(truck.id);
                        if (!truck.gradeInventory.find((g) => g.code === grade)) {
                          setGrade(truck.gradeInventory[0]?.code ?? grade);
                        }
                        if (errors.truck) setErrors((prev) => { const { truck: _truck, ...rest } = prev; return rest; });
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: Radius.round,
                        borderWidth: 1,
                        borderColor: active ? '#00450D' : '#CBD5E1',
                        backgroundColor: active ? '#E8F5E9' : '#FFFFFF',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#00450D' : '#334155' }}>
                        {truck.truckNumber}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.truck ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.truck}</Text> : null}
            </View>

            <View>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6 }}>Grade</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {gradeOptions.map((item) => {
                  const active = item.code === grade;
                  return (
                    <Pressable
                      key={item.code}
                      testID={`auth-grade-${inquiry.id}-${item.code}`}
                      onPress={() => {
                        setGrade(item.code);
                        if (errors.grade) setErrors((prev) => { const { grade: _grade, ...rest } = prev; return rest; });
                      }}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: Radius.round,
                        borderWidth: 1,
                        borderColor: active ? '#00450D' : '#CBD5E1',
                        backgroundColor: active ? '#E8F5E9' : '#FFFFFF',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: active ? '#00450D' : '#334155' }}>
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.grade ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.grade}</Text> : null}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 }}>Sacks</Text>
                <TextInput
                  testID={`auth-sacks-${inquiry.id}`}
                  style={{
                    height: 44,
                    borderWidth: errors.sacks ? 2 : 1,
                    borderColor: errors.sacks ? Colors.danger : '#CBD5E1',
                    borderRadius: Radius.sm,
                    paddingHorizontal: 10,
                    color: '#111827',
                    fontWeight: '800',
                    backgroundColor: '#FFFFFF',
                  }}
                  value={sacks}
                  onChangeText={(value) => {
                    setSacks(value.replace(/\D/g, ''));
                    if (errors.sacks) setErrors((prev) => { const { sacks: _sacks, ...rest } = prev; return rest; });
                  }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 }}>Weight / sack</Text>
                <TextInput
                  testID={`auth-weight-${inquiry.id}`}
                  style={{
                    height: 44,
                    borderWidth: errors.weight ? 2 : 1,
                    borderColor: errors.weight ? Colors.danger : '#CBD5E1',
                    borderRadius: Radius.sm,
                    paddingHorizontal: 10,
                    color: '#111827',
                    fontWeight: '800',
                    backgroundColor: '#FFFFFF',
                  }}
                  value={weightPerSack}
                  onChangeText={(value) => {
                    setWeightPerSack(value.replace(/[^0-9.]/g, ''));
                    if (errors.weight) setErrors((prev) => { const { weight: _weight, ...rest } = prev; return rest; });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
            {(errors.sacks || errors.weight) ? (
              <Text style={{ color: Colors.danger, fontSize: FontSize.xs }}>{errors.sacks || errors.weight}</Text>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Total weight</Text>
              <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>{totalWeight} kg</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Rate (current)</Text>
              <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>
                {inquiry.ratePerKg > 0 ? `₹${inquiry.ratePerKg}/kg` : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Summary Box */}
      <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: Radius.sm, backgroundColor: '#FFFFFF' }}>
          <View style={{ flex: 1, padding: Spacing.sm, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 10, color: '#111827', fontWeight: '800', marginBottom: 6 }}>WEIGHT</Text>
            <Text style={{ fontSize: FontSize.lg, color: '#0F2C23', fontWeight: '700' }}>{totalWeight} kg</Text>
          </View>
          <View style={{ flex: 1, padding: Spacing.sm, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 10, color: '#111827', fontWeight: '800', marginBottom: 6 }}>RATE</Text>
            <Text style={{ fontSize: FontSize.lg, color: '#0F2C23', fontWeight: '700' }}>{rateNum > 0 ? `₹${rateNum}` : '-'}</Text>
          </View>
          <View style={{ flex: 1, padding: Spacing.sm, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#111827', fontWeight: '800', marginBottom: 6 }}>TOTAL</Text>
            <Text style={{ fontSize: FontSize.lg, color: '#166534', fontWeight: '800' }}>
              {rateNum > 0 ? `₹${(totalWeight * rateNum).toLocaleString('en-IN')}` : '-'}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: Spacing.sm, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: Radius.sm, padding: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 10, color: '#111827', fontWeight: '800' }}>APMC</Text>
                <Switch value={applyApmc} onValueChange={setApplyApmc} />
              </View>
              <Text style={{ fontSize: FontSize.sm, color: applyApmc ? '#166534' : '#6B7280', fontWeight: '700' }}>
                {applyApmc ? 'Applied' : 'Not Applied'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: Radius.sm, padding: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 10, color: '#111827', fontWeight: '800' }}>BARDANA</Text>
                <Switch
                  value={applyBardana}
                  onValueChange={(value) => {
                    setApplyBardana(value);
                    if (value && (!bardanaSacks || bardanaSacks === '0')) setBardanaSacks(String(sacksNum || 0));
                    if (value && (!bardanaRate || bardanaRate === '0')) setBardanaRate(String(shop?.charges?.bardanaPerSack ?? 0));
                  }}
                />
              </View>
              <Text style={{ fontSize: FontSize.sm, color: applyBardana ? '#166534' : '#6B7280', fontWeight: '700' }}>
                {applyBardana ? 'Applied' : 'Not Applied'}
              </Text>
              {applyBardana ? (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <TextInput
                    testID={`auth-bardana-sacks-${inquiry.id}`}
                    style={{
                      flex: 1,
                      height: 36,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: Radius.sm,
                      paddingHorizontal: 8,
                      fontSize: 12,
                      color: '#111827',
                      fontWeight: '700',
                      backgroundColor: '#FFFFFF',
                    }}
                    value={bardanaSacks}
                    onChangeText={(value) => setBardanaSacks(value.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="Sacks"
                    placeholderTextColor="#94A3B8"
                  />
                  <TextInput
                    testID={`auth-bardana-rate-${inquiry.id}`}
                    style={{
                      flex: 1,
                      height: 36,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      borderRadius: Radius.sm,
                      paddingHorizontal: 8,
                      fontSize: 12,
                      color: '#111827',
                      fontWeight: '700',
                      backgroundColor: '#FFFFFF',
                    }}
                    value={bardanaRate}
                    onChangeText={(value) => setBardanaRate(value.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="Rate"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              ) : null}
            </View>
          </View>

          {calc ? (
            <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: Radius.sm, padding: Spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Gross</Text>
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>₹{Math.round(calc.gross).toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>APMC</Text>
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>₹{Math.round(calc.apmc).toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Bardana</Text>
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>₹{Math.round(calc.bardana).toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Cartage</Text>
                <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>₹{Math.round(calc.cartage).toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: '#E2E8F0', marginTop: 8, marginBottom: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '800' }}>Net</Text>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '900' }}>₹{Math.round(calc.net).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

      {/* Adjust Rate Section */}
      <View style={{ padding: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#111827' }}>Adjust Rate / रेट बदलें</Text>
          <Text style={{ fontSize: FontSize.xs, color: '#4B5563', fontWeight: '500' }}>Per KG</Text>
        </View>
        <Animated.View style={shakeRateStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: errors.rate ? 2 : 1, borderColor: errors.rate ? Colors.danger : '#D1D5DB', borderRadius: Radius.sm, height: 50, backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginRight: 12 }}>₹</Text>
            <TextInput
              testID={`rate-input-${inquiry.id}`}
              disableFullscreenUI={true}
              style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#0F2C23', padding: 0 }}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              value={rate}
              onChangeText={handleRateChange}
              keyboardType="decimal-pad"
            />
          </View>
          {errors.rate ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.rate}</Text> : null}
        </Animated.View>

        <View style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#111827' }}>
              Total Bill Amount / कुल बिल
            </Text>
            <Text style={{ fontSize: FontSize.xs, color: '#4B5563', fontWeight: '500' }}>
              Auto updates rate
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: errors.rate ? 2 : 1, borderColor: errors.rate ? Colors.danger : '#D1D5DB', borderRadius: Radius.sm, height: 50, backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#374151', marginRight: 12 }}>₹</Text>
            <TextInput
              testID={`total-bill-input-${inquiry.id}`}
              disableFullscreenUI={true}
              style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#0F2C23', padding: 0 }}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              value={totalBillAmount}
              onChangeText={handleTotalBillAmountChange}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />

      {/* Payment Selector */}
      <View style={{ padding: Spacing.md }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#111827', marginBottom: Spacing.sm }}>
          Payment Mode / भुगतान का तरीका
        </Text>
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
          {errors.payment ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.payment}</Text> : null}
        </Animated.View>
      </View>

      <View style={{ height: 1, backgroundColor: '#F3F4F6', marginTop: Spacing.sm }} />

      {/* Action buttons */}
      <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
        {errors.save ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs }}>{errors.save}</Text> : null}
        
        <Pressable
          testID={`save-edits-${inquiry.id}`}
          onPress={handleSaveEdits}
          disabled={saveEditsMutation.isPending}
        >
          {({ pressed }) => (
            <View style={{
              minHeight: 48,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: '#00450D',
              backgroundColor: saveEditsMutation.isPending ? '#CBD5E1' : pressed ? '#E8F5E9' : '#FFFFFF',
            }}>
              <Text allowFontScaling={false} style={{ fontSize: FontSize.sm, color: '#00450D', fontWeight: '900' }}>
                {saveEditsMutation.isPending ? 'Saving...' : 'Save Changes / बदलाव सेव करें'}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Pressable
            testID={`cancel-inquiry-${inquiry.id}`}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            style={{ flex: 1 }}
          >
            {({ pressed }) => (
              <View style={{
                minHeight: 62, 
                borderRadius: Radius.md, 
                alignItems: 'center', 
                justifyContent: 'center',
                borderWidth: 1.5, 
                borderColor: '#DC2626', 
                backgroundColor: pressed ? '#FEF2F2' : '#FFFFFF',
              }}>
                <Text allowFontScaling={false} style={{ fontSize: FontSize.sm, color: '#DC2626', fontWeight: '900' }}>Cancel</Text>
                <Text allowFontScaling={false} style={{ fontSize: 12, color: '#DC2626', fontWeight: '900', marginTop: 2 }}>रद्द करें</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            testID={`authorize-${inquiry.id}`}
            onPress={handleAuthorize}
            disabled={authorizeMutation.isPending}
            style={{ flex: 1.5 }}
          >
            {({ pressed }) => (
              <View style={{
                minHeight: 62,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: authorizeMutation.isPending ? '#CBD5E1' : pressed ? '#FBBF24' : '#FDE047',
                borderWidth: 2,
                borderColor: '#00450D',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.16,
                shadowRadius: 6,
                elevation: 4,
              }}>
                {authorizeMutation.isPending ? (
                  <Text allowFontScaling={false} style={{ fontSize: FontSize.md, color: '#003807', fontWeight: '900' }}>Processing...</Text>
                ) : (
                  <>
                    <Text allowFontScaling={false} style={{ fontSize: FontSize.lg, color: '#003807', fontWeight: '900' }}>Authorize</Text>
                    <Text allowFontScaling={false} style={{ fontSize: 12, color: '#365314', fontWeight: '900', marginTop: 2 }}>स्वीकार करें</Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </View>

    </View>
  );
}
