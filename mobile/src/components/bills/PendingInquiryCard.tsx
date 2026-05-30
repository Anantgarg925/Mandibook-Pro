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
import { Phone, Clock, User, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { useShop } from '@/context/ShopContext';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { calculateCharges } from '@/utils/calculations';
import { toIndianWeight } from '@/lib/formatters';
import type { Inquiry, PaymentMode } from '@/types/inquiry';
import PaymentSelector from './PaymentSelector';
import EditableSlipRow from './EditableSlipRow';
import * as Contacts from 'expo-contacts';
import { useBuyers } from '@/hooks/useBuyers';

export default function PendingInquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const { shop } = useShop();
  const { trucks } = useTodayTrucks();
  const queryClient = useQueryClient();
  const isAgentStock = !inquiry.truckId || inquiry.truckNumber === 'Agent Stock' || !!inquiry.sourceAgentName;

  const [truckId, setTruckId] = useState<string | null>(inquiry.truckId ?? null);
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
    setTruckId(inquiry.truckId ?? null);
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

  const buildInquiryUpdate = (status?: 'PENDING' | 'DELIVERED' | 'CONFIRMED') => {
    if (!calc) throw new Error('Missing calculation');
    return {
      truck_id: isAgentStock ? null : truckId,
      truck_number: isAgentStock ? 'Agent Stock' : selectedTruck?.truckNumber ?? inquiry.truckNumber,
      source_agent_name: inquiry.sourceAgentName ?? '',
      source_agent_phone: inquiry.sourceAgentPhone ?? '',
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
    if (!isAgentStock && !truckId) e.truck = 'गाड़ी चुनें / Select truck';
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
        .update(buildInquiryUpdate(inquiry.status === 'DELIVERED' ? 'DELIVERED' : 'PENDING'))
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
        const existing = ((buyerRows ?? []) as Record<string, unknown>[]).find((buyer) => {
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

  const [editingField, setEditingField] = useState<string | null>(null);
  const { buyers } = useBuyers();
  const [buyerSuggestions, setBuyerSuggestions] = useState<any[]>([]);

  const handleCustomerNameChange = (val: string) => {
    setCustomerName(val);
    if (errors.customer) setErrors((prev) => { const { customer, ...rest } = prev; return rest; });
    const lower = val.toLowerCase();
    if (lower.length > 0) {
      setBuyerSuggestions(
        buyers.filter((b: any) => b.name.toLowerCase().includes(lower)).slice(0, 5)
      );
    } else {
      setBuyerSuggestions([]);
    }
  };

  const openContactPicker = async () => {
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status === 'granted') {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact) {
          setCustomerName(contact.name || '');
          if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
            const phone = contact.phoneNumbers[0].number?.replace(/[^\d]/g, '') || '';
            setCustomerPhone(phone);
          }
          setBuyerSuggestions([]);
        }
      }
    } catch (error) {
      console.log('Contact picker error:', error);
    }
  };

  const selectBuyer = (b: any) => {
    setCustomerName(b.name);
    setCustomerPhone(b.phone);
    setBuyerSuggestions([]);
  };




  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
        borderWidth: 2,
        borderColor: '#111827',
        padding: 22,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
        {shop?.firmName?.toUpperCase() ?? 'MANDIBOOK'}
      </Text>
      <Text style={{ fontSize: 14, color: '#111827', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
        {[shop?.phone1, shop?.phone2].filter(Boolean).join(' / ')}
      </Text>

      <View
        style={{
          borderWidth: 2,
          borderColor: '#111827',
          marginBottom: 16,
          paddingVertical: 8,
          paddingHorizontal: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
          PENDING AUTHORIZATION
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#111827', textAlign: 'center', marginTop: 2 }}>
          SLIP #SL-{inquiry.slipNumber} • {timeAgoStr}
        </Text>
      </View>

      {/* Customer Name */}
      <EditableSlipRow label="Customer" value={customerName || 'None'} isEditing={editingField === "customer"} onToggle={() => setEditingField(editingField === "customer" ? null : "customer")} isError={!!errors.customer} />
      {editingField === 'customer' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
              placeholder="Customer name"
              value={customerName}
              onChangeText={handleCustomerNameChange}
            />
            <Pressable onPress={openContactPicker} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="#0EA5E9" />
            </Pressable>
          </View>
          {buyerSuggestions.length > 0 && (
            <View style={{ marginTop: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
              {buyerSuggestions.map((b) => (
                <Pressable
                  key={b.id || b.code}
                  onPress={() => selectBuyer(b)}
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{b.name}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>{b.phone}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', marginTop: 8 }}
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={(v) => setCustomerPhone(v.replace(/\D/g, '').slice(0, 10))}
          />
        </View>
      )}

      {/* Truck */}
      <EditableSlipRow label="Truck / Lot" value={selectedTruck?.truckNumber || 'Agent Stock'} isEditing={editingField === "truck"} onToggle={() => setEditingField(editingField === "truck" ? null : "truck")} isError={!!errors.truck} />
      {editingField === 'truck' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {trucks.map(truck => (
            <Pressable
              key={truck.id}
              onPress={() => {
                setTruckId(truck.id);
                if (!truck.gradeInventory.find((g) => g.code === grade)) {
                  setGrade(truck.gradeInventory[0]?.code ?? grade);
                }
                setEditingField(null);
                if (errors.truck) setErrors(p => ({...p, truck: ''}));
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: truck.id === truckId ? '#00450D' : '#CBD5E1', backgroundColor: truck.id === truckId ? '#E8F5E9' : '#FFF' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: truck.id === truckId ? '#00450D' : '#334155' }}>{truck.truckNumber}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Grade */}
      <EditableSlipRow label="Fruit Grade" value={gradeName} isEditing={editingField === "grade"} onToggle={() => setEditingField(editingField === "grade" ? null : "grade")} isError={!!errors.grade} />
      {editingField === 'grade' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {gradeOptions.map(item => (
            <Pressable
              key={item.code}
              onPress={() => { setGrade(item.code); setEditingField(null); if(errors.grade) setErrors(p => ({...p, grade: ''})); }}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: item.code === grade ? '#00450D' : '#CBD5E1', backgroundColor: item.code === grade ? '#E8F5E9' : '#FFF' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: item.code === grade ? '#00450D' : '#334155' }}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Quantity */}
      <EditableSlipRow label="Quantity (Sacks)" value={`${sacksNum} sacks @ ${weightPerSackNum}kg`} isEditing={editingField === "quantity"} onToggle={() => setEditingField(editingField === "quantity" ? null : "quantity")} isError={!!errors.sacks || !!errors.weight} />
      {editingField === 'quantity' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
            placeholder="Sacks"
            keyboardType="number-pad"
            value={sacks}
            onChangeText={(v) => { setSacks(v.replace(/\D/g, '')); if(errors.sacks) setErrors(p => ({...p, sacks: ''})) }}
          />
          <TextInput
            style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
            placeholder="Weight/Sack"
            keyboardType="decimal-pad"
            value={weightPerSack}
            onChangeText={(v) => { setWeightPerSack(v.replace(/[^0-9.]/g, '')); if(errors.weight) setErrors(p => ({...p, weight: ''})) }}
          />
        </View>
      )}

      {/* Rate */}
      <EditableSlipRow label="Rate (per kg)" value={rateNum > 0 ? `₹${rateNum}` : '-'} isEditing={editingField === "rate"} onToggle={() => setEditingField(editingField === "rate" ? null : "rate")} isError={!!errors.rate} />
      {editingField === 'rate' && (
        <Animated.View style={[{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }, shakeRateStyle]}>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', fontWeight: '800' }}
            placeholder="Enter Rate (₹/kg)"
            keyboardType="decimal-pad"
            value={rate}
            onChangeText={handleRateChange}
          />
        </Animated.View>
      )}

      {/* Total Amount */}
      <EditableSlipRow label="Total Bill Amount" value={totalBillAmount ? `₹${totalBillAmount}` : '-'} isEditing={editingField === "totalAmount"} onToggle={() => setEditingField(editingField === "totalAmount" ? null : "totalAmount")} />
      {editingField === 'totalAmount' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
          <TextInput
            style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', fontWeight: '800' }}
            placeholder="Enter Total Amount (₹) (Auto updates rate)"
            keyboardType="decimal-pad"
            value={totalBillAmount}
            onChangeText={handleTotalBillAmountChange}
          />
        </View>
      )}

      {/* Payment */}
      <EditableSlipRow label="Payment Mode" value={paymentMode} isEditing={editingField === "payment"} onToggle={() => setEditingField(editingField === "payment" ? null : "payment")} isError={!!errors.payment} />
      {editingField === 'payment' && (
        <Animated.View style={[{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }, shakePaymentStyle]}>
          <PaymentSelector
            selected={paymentMode}
            onSelect={(m) => { setPaymentMode(m); setEditingField(null); if(errors.payment) setErrors(p => ({...p, payment: ''})); }}
            upiRef={upiRef}
            onUpiRefChange={setUpiRef}
          />
        </Animated.View>
      )}


      {/* APMC */}
      <EditableSlipRow label="APMC" value={applyApmc ? `₹${Math.round(calc?.apmc || 0)}` : 'Not Applied'} isEditing={editingField === "apmc"} onToggle={() => setEditingField(editingField === "apmc" ? null : "apmc")} />
      {editingField === 'apmc' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700' }}>Apply APMC Charges</Text>
          <Switch value={applyApmc} onValueChange={setApplyApmc} />
        </View>
      )}

      {/* Bardana */}
      <EditableSlipRow label="Bardana" value={applyBardana ? `₹${Math.round(calc?.bardana || 0)}` : 'Not Applied'} isEditing={editingField === "bardana"} onToggle={() => setEditingField(editingField === "bardana" ? null : "bardana")} />
      {editingField === 'bardana' && (
        <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: applyBardana ? 8 : 0 }}>
            <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700' }}>Apply Bardana Charges</Text>
            <Switch value={applyBardana} onValueChange={(val) => {
              setApplyBardana(val);
              if (val && (!bardanaSacks || bardanaSacks === '0')) setBardanaSacks(String(sacksNum || 0));
              if (val && (!bardanaRate || bardanaRate === '0')) setBardanaRate(String(shop?.charges?.bardanaPerSack ?? 0));
            }} />
          </View>
          {applyBardana && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
                placeholder="Bardana Sacks"
                keyboardType="number-pad"
                value={bardanaSacks}
                onChangeText={(v) => setBardanaSacks(v.replace(/\D/g, ''))}
              />
              <TextInput
                style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
                placeholder="Bardana Rate"
                keyboardType="decimal-pad"
                value={bardanaRate}
                onChangeText={(v) => setBardanaRate(v.replace(/[^0-9.]/g, ''))}
              />
            </View>
          )}
        </View>
      )}

      {/* View Details Box (Totals) */}
      <View style={{ marginTop: 24, borderWidth: 1, borderColor: '#111827' }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#111827' }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '900', color: '#111827', padding: 8 }}>Total Weight</Text>
          <Text style={{ width: 150, fontSize: 15, fontWeight: '900', color: '#111827', padding: 8, textAlign: 'right' }}>
            {toIndianWeight(totalWeight)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827' }}>
          <Text style={{ flex: 1, fontSize: 15, color: '#111827', padding: 8 }}>Gross Amount</Text>
          <Text style={{ width: 150, fontSize: 15, color: '#111827', padding: 8, textAlign: 'right' }}>
            ₹{Math.round(calc?.gross || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        {(calc?.apmc || 0) > 0 && (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827' }}>
            <Text style={{ flex: 1, fontSize: 15, color: '#111827', padding: 8 }}>APMC</Text>
            <Text style={{ width: 150, fontSize: 15, color: '#111827', padding: 8, textAlign: 'right' }}>₹{Math.round(calc?.apmc ?? 0).toLocaleString('en-IN')}</Text>
          </View>
        )}
        {(calc?.bardana || 0) > 0 && (
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#111827' }}>
            <Text style={{ flex: 1, fontSize: 15, color: '#111827', padding: 8 }}>Bardana</Text>
            <Text style={{ width: 150, fontSize: 15, color: '#111827', padding: 8, textAlign: 'right' }}>₹{Math.round(calc?.bardana ?? 0).toLocaleString('en-IN')}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', backgroundColor: '#E8F5E9' }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '900', color: '#166534', padding: 8 }}>Net Amount</Text>
          <Text style={{ width: 150, fontSize: 15, fontWeight: '900', color: '#166534', padding: 8, textAlign: 'right' }}>
            ₹{Math.round(calc?.net || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ marginTop: 24, gap: Spacing.sm }}>
        {errors.save ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs }}>{errors.save}</Text> : null}
        
        <Pressable
          testID={`save-edits-${inquiry.id}`}
          onPress={handleSaveEdits}
          disabled={saveEditsMutation.isPending}
          style={{
            padding: 14,
            borderWidth: 2,
            borderColor: '#111827',
            backgroundColor: saveEditsMutation.isPending ? '#CBD5E1' : '#FFFFFF',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>
            {saveEditsMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Pressable
            testID={`cancel-inquiry-${inquiry.id}`}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            style={{
              flex: 1,
              padding: 14,
              borderWidth: 2,
              borderColor: '#DC2626',
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#DC2626' }}>CANCEL</Text>
          </Pressable>

          <Pressable
            testID={`authorize-${inquiry.id}`}
            onPress={handleAuthorize}
            disabled={authorizeMutation.isPending}
            style={{
              flex: 1.5,
              padding: 14,
              borderWidth: 2,
              borderColor: '#111827',
              backgroundColor: authorizeMutation.isPending ? '#CBD5E1' : '#FBBF24',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827' }}>
              {authorizeMutation.isPending ? 'PROCESSING...' : 'AUTHORIZE'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
