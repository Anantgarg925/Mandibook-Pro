import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Contacts from 'expo-contacts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Minus, Plus, Phone, Trash2 } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { useBuyers } from '@/hooks/useBuyers';
import { useMemberMode } from '@/hooks/useMemberMode';
import PaymentSelector from '@/components/bills/PaymentSelector';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianWeight } from '@/lib/formatters';
import { calculateCharges } from '@/utils/calculations';
import { getNextSlipNumber } from '@/utils/slipNumber';
import type { Truck } from '@/types/truck';
import type { PaymentMode, Buyer } from '@/types/inquiry';

const inputStyle = {
  height: 56,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: Radius.sm,
  paddingHorizontal: Spacing.md,
  fontSize: FontSize.md,
  backgroundColor: Colors.surface,
  color: Colors.text,
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
};

function SectionHeader({ title, style }: { title: string, style?: any }) {
  return (
    <Text
      style={[{
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.textSecond,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
      }, style]}
    >
      {title}
    </Text>
  );
}

export default function NewBillScreen() {
  const router = useRouter();
  const { truckId: preselectedTruckId } = useLocalSearchParams<{ truckId?: string }>();
  const { shop } = useShop();
  const { trucks } = useTodayTrucks();
  const { buyers } = useBuyers();
  const isMemberMode = useMemberMode();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [slipNumber, setSlipNumber] = useState<number | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [truckPickerVisible, setTruckPickerVisible] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearchText, setContactSearchText] = useState('');
  const [truckSearchText, setTruckSearchText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [buyerSuggestions, setBuyerSuggestions] = useState<Buyer[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [sacks, setSacks] = useState(0);
  const [sacksText, setSacksText] = useState('');
  const [weightPerSack, setWeightPerSack] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [upiRef, setUpiRef] = useState('');
  const [success, setSuccess] = useState(false);
  const [boughtFromAgent, setBoughtFromAgent] = useState(false);
  const [sourceAgentName, setSourceAgentName] = useState('');
  const [sourceAgentPhone, setSourceAgentPhone] = useState('');
  const [savedSlip, setSavedSlip] = useState<number | null>(null);
  const [savedInquiryId, setSavedInquiryId] = useState<string | null>(null);
  const [applyApmc, setApplyApmc] = useState(true);
  const [applyBardana, setApplyBardana] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<any[]>([]);

  const successY = useSharedValue(400);
  const calcOpacity = useSharedValue(0);
  const scrollRef = useRef<any>(null);
  const sectionY = useRef<Record<string, number>>({});

  const rememberSection = (key: string) => (event: any) => {
    sectionY.current[key] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (key: string) => {
    const y = sectionY.current[key] ?? 0;
    scrollRef.current?.scrollToPosition?.(0, Math.max(0, y - 12), true);
    scrollRef.current?.scrollTo?.({ y: Math.max(0, y - 12), animated: true });
  };

  useEffect(() => {
    if (!shop?.shopId) return;
    getNextSlipNumber(shop.shopId).then(setSlipNumber);
  }, [shop?.shopId]);

  useEffect(() => {
    if (preselectedTruckId && trucks.length > 0) {
      const t = trucks.find((tr) => tr.id === preselectedTruckId);
      if (t) setSelectedTruck(t);
    }
  }, [preselectedTruckId, trucks]);

  useEffect(() => {
    const show = sacks > 0 && parseFloat(weightPerSack) > 0;
    calcOpacity.value = withTiming(show ? 1 : 0, { duration: 250 });
  }, [sacks, weightPerSack, calcOpacity]);

  useEffect(() => {
    if (success) successY.value = withTiming(0, { duration: 380 });
  }, [success, successY]);

  const handleCustomerNameChange = (v: string) => {
    setCustomerName(v);
    if (v.length >= 2) {
      const lower = v.toLowerCase();
      setBuyerSuggestions(
        buyers.filter((b) => b.name.toLowerCase().includes(lower)).slice(0, 5)
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

  const selectBuyer = (b: Buyer) => {
    setCustomerName(b.name);
    setCustomerPhone(b.phone);
    setBuyerSuggestions([]);
  };

  const hasBreakdown = selectedTruck?.gradeInventory.some((g) => g.totalKg > 0);
  const truckSoldKg = selectedTruck?.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0) ?? 0;
  const truckAvailableKg = selectedTruck ? Math.max(0, selectedTruck.totalKg - truckSoldKg) : 0;
  let available = 0;
  if (selectedTruck && selectedGrade) {
    if (hasBreakdown) {
      const gradeInfo = selectedTruck.gradeInventory.find((g) => g.code === selectedGrade);
      available = gradeInfo ? Math.max(0, gradeInfo.totalKg - gradeInfo.confirmedKg - gradeInfo.provisionalKg) : 0;
    } else {
      available = truckAvailableKg;
    }
  }
  const wps = parseFloat(weightPerSack) || 0;
  const rate = parseFloat(ratePerKg) || 0;
  const charges = shop?.charges;
  const calc =
    sacks > 0 && wps > 0 && charges
      ? calculateCharges({
        sacks,
        weightPerSack: wps,
        ratePerKg: rate,
        charges: {
          apmcPct: charges.apmcCommission,
          bardanaPerSack: charges.bardanaPerSack,
          cartagePerKg: charges.cartagePerKg,
        },
        applyApmc,
        applyBardana,
      })
      : null;

  const calcStyle = useAnimatedStyle(() => ({ opacity: calcOpacity.value }));
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: successY.value }],
  }));

  const markDeliveredMutation = useMutation({
    mutationFn: async () => {
      if (!savedInquiryId) throw new Error('Missing inquiry ID');
      const { error } = await supabase
        .from('inquiries')
        .update({ status: 'DELIVERED' })
        .eq('id', savedInquiryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      successY.value = 400; // hide bottom sheet
      router.replace('/member-dashboard' as any);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      inquiry: any;
      truckUpdate?: { id: string; gradeInventory: any[] };
      buyerUpsert?: { name: string; phone: string } | null;
    }) => {
      // 1. Fetch latest slip just before saving to prevent simultaneous duplicates
      const realTimeSlip = await getNextSlipNumber(payload.inquiry.shopId);

      // 2. Create inquiry
      const dbInq = {
        shop_id: payload.inquiry.shopId,
        slip_number: realTimeSlip,
        truck_id: payload.inquiry.truckId,
        truck_number: payload.inquiry.truckNumber,
        source_agent_name: payload.inquiry.sourceAgentName ?? '',
        source_agent_phone: payload.inquiry.sourceAgentPhone ?? '',
        source_agent_hidden: !payload.inquiry.sourceAgentName,
        customer_name: payload.inquiry.customerName,
        customer_phone: payload.inquiry.customerPhone,
        grade: payload.inquiry.grade,
        grade_name: payload.inquiry.gradeName,
        sacks: payload.inquiry.sacks,
        weight_per_sack: payload.inquiry.weightPerSack,
        total_weight: payload.inquiry.totalWeight,
        rate_per_kg: payload.inquiry.ratePerKg,
        gross_amount: payload.inquiry.grossAmount,
        apmc_amount: payload.inquiry.apmcAmount,
        bardana_amount: payload.inquiry.bardanaAmount,
        cartage_amount: payload.inquiry.cartageAmount,
        bardana_sacks: payload.inquiry.applyBardana ? payload.inquiry.bardanaSacks : 0,
        bardana_rate: payload.inquiry.applyBardana ? payload.inquiry.bardanaRate : 0,
        apply_bardana: payload.inquiry.applyBardana,
        apply_apmc: payload.inquiry.applyApmc,
        charge_snapshot: payload.inquiry.chargeSnapshot,
        net_amount: payload.inquiry.netAmount,
        payment_mode: payload.inquiry.paymentMode,
        upi_ref: payload.inquiry.upiRef,
        status: payload.inquiry.status,
        date: payload.inquiry.date,
        created_at: payload.inquiry.createdAt,
      };
      const { data: inquiry, error: inqErr } = await supabase
        .from('inquiries')
        .insert(dbInq)
        .select()
        .single();
      if (inqErr) throw new Error(inqErr.message);

      // 2. Update truck inventory (best-effort)
      try {
        if (payload.truckUpdate) {
          await supabase
            .from('trucks')
            .update({ grade_inventory: payload.truckUpdate.gradeInventory })
            .eq('id', payload.truckUpdate.id);
        }
      } catch { /* best-effort */ }

      // 3. Upsert buyer (best-effort)
      try {
        if (payload.buyerUpsert) {
          const existing = buyers.find(
            (b) =>
              b.phone === payload.buyerUpsert!.phone ||
              b.name.toLowerCase() === payload.buyerUpsert!.name.toLowerCase()
          );
          if (!existing) {
            await supabase.from('buyers').insert({
              shop_id: shop!.shopId,
              name: payload.buyerUpsert.name,
              phone: payload.buyerUpsert.phone,
              last_transaction_date: Date.now(),
              created_at: Date.now(),
            });
          }
        }
      } catch { /* best-effort */ }

      return inquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
    },
  });


  const handleAddEntry = () => {
    if (!validate() || !shop?.shopId || (!selectedTruck && !boughtFromAgent) || !selectedGrade) return;

    const gradeInfo2 = selectedTruck?.gradeInventory.find((g) => g.code === selectedGrade);
    const gradeName = gradeInfo2?.name ?? shop?.grades?.find(g => g.code === selectedGrade)?.name ?? selectedGrade;
    const result = calc ?? calculateCharges({ sacks, weightPerSack: wps, ratePerKg: 0, charges: { apmcPct: 0, bardanaPerSack: 0, cartagePerKg: 0 }, applyApmc, applyBardana });

    const newEntry = {
      grade: selectedGrade,
      gradeName,
      sacks,
      weightPerSack: wps,
      totalWeight: result.totalWeight,
      ratePerKg: rate,
      grossAmount: result.gross,
      apmcAmount: result.apmc,
      bardanaAmount: result.bardana,
      cartageAmount: result.cartage,
      netAmount: result.net,
    };

    setEntries([...entries, newEntry]);

    // Reset current item fields
    setSelectedGrade(null);
    setSacks(0);
    setSacksText('');
    setWeightPerSack('');
    setRatePerKg('');
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!boughtFromAgent && !selectedTruck) e.truck = 'गाड़ी चुनें';
    if (boughtFromAgent && !sourceAgentName.trim()) e.sourceAgent = 'एजेंट का नाम डालें';
    if (!selectedGrade) e.grade = 'ग्रेड चुनें';
    if (sacks <= 0) e.sacks = 'बोरों की संख्या डालें';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (entries.length === 0 && (!validate() || !shop?.shopId || (!selectedTruck && !boughtFromAgent) || !selectedGrade || saveMutation.isPending)) return;
    if (saveMutation.isPending) return;

    const slip = slipNumber ?? 1001;

    // Combine existing entries with the current one if valid
    const allEntries = [...entries];
    if (selectedGrade && sacks > 0) {
      const gradeInfo2 = selectedTruck?.gradeInventory.find((g) => g.code === selectedGrade);
      const gradeName = gradeInfo2?.name ?? shop?.grades?.find(g => g.code === selectedGrade)?.name ?? selectedGrade;
      const result = calc ?? calculateCharges({ sacks, weightPerSack: wps, ratePerKg: 0, charges: { apmcPct: 0, bardanaPerSack: 0, cartagePerKg: 0 }, applyApmc, applyBardana });

      allEntries.push({
        grade: selectedGrade,
        gradeName,
        sacks,
        weightPerSack: wps,
        totalWeight: result.totalWeight,
        ratePerKg: rate,
        grossAmount: result.gross,
        apmcAmount: result.apmc,
        bardanaAmount: result.bardana,
        cartageAmount: result.cartage,
        netAmount: result.net,
      });
    }

    if (allEntries.length === 0) return;

    const totalSacks = allEntries.reduce((sum, e) => sum + e.sacks, 0);
    const totalWeight = allEntries.reduce((sum, e) => sum + e.totalWeight, 0);
    const totalGross = allEntries.reduce((sum, e) => sum + e.grossAmount, 0);
    const totalApmc = allEntries.reduce((sum, e) => sum + e.apmcAmount, 0);
    const totalBardana = allEntries.reduce((sum, e) => sum + e.bardanaAmount, 0);
    const totalCartage = allEntries.reduce((sum, e) => sum + e.cartageAmount, 0);
    const totalNet = allEntries.reduce((sum, e) => sum + e.netAmount, 0);

    const mainGrade = allEntries.length > 1 ? 'MIXED' : allEntries[0].grade;
    const mainGradeName = allEntries.length > 1 ? 'Multiple Items' : allEntries[0].gradeName;

    const newInventory = selectedTruck ? [...selectedTruck.gradeInventory] : [];
    if (selectedTruck) {
      for (const entry of allEntries) {
        const idx = newInventory.findIndex(g => g.code === entry.grade);
        if (idx !== -1) {
          newInventory[idx] = { ...newInventory[idx], provisionalKg: newInventory[idx].provisionalKg + entry.totalWeight };
        }
      }
    }

    const createdInquiry = await saveMutation.mutateAsync({
      inquiry: {
        shopId: shop!.shopId,
        slipNumber: slip,
        truckId: boughtFromAgent ? null : selectedTruck?.id,
        truckNumber: boughtFromAgent ? 'Agent Stock' : selectedTruck?.truckNumber,
        sourceAgentName: boughtFromAgent ? sourceAgentName.trim() : '',
        sourceAgentPhone: boughtFromAgent ? sourceAgentPhone.trim() : '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        grade: mainGrade,
        gradeName: mainGradeName,
        sacks: totalSacks,
        weightPerSack: 0, // 0 means mixed or N/A
        totalWeight,
        ratePerKg: 0, // 0 means mixed
        grossAmount: totalGross,
        apmcAmount: totalApmc,
        bardanaAmount: totalBardana,
        cartageAmount: totalCartage,
        bardanaSacks: applyBardana ? totalSacks : 0,
        bardanaRate: shop!.charges?.bardanaPerSack ?? 0,
        applyBardana,
        applyApmc,
        chargeSnapshot: {
          apmcCommission: shop!.charges?.apmcCommission ?? 0,
          bardanaPerSack: shop!.charges?.bardanaPerSack ?? 0,
          cartagePerKg: shop!.charges?.cartagePerKg ?? 0,
          applyApmc,
          applyBardana,
          entries: allEntries
        },
        netAmount: totalNet,
        paymentMode,
        upiRef: upiRef.trim(),
        status: 'PENDING',
        date: getCurrentBusinessDate().getTime(),
        createdAt: Date.now(),
      },
      truckUpdate: selectedTruck ? {
        id: selectedTruck.id,
        gradeInventory: newInventory,
      } : undefined,
      buyerUpsert: customerName.trim()
        ? { name: customerName.trim(), phone: customerPhone.trim() }
        : null,
    });

    setSavedSlip(createdInquiry?.slip_number ?? slip);
    if (createdInquiry?.id) {
      setSavedInquiryId(createdInquiry.id);
    }
    setSuccess(true);
  };

  const resetForm = async () => {
    setSelectedGrade(null);
    setSacks(0);
    setSacksText('');
    setWeightPerSack('');
    setRatePerKg('');
    setPaymentMode('CASH');
    setUpiRef('');
    setCustomerName('');
    setCustomerPhone('');
    setApplyApmc(true);
    setApplyBardana(true);
    setErrors({});
    setEntries([]);
    setSuccess(false);
    saveMutation.reset();
    successY.value = 400;
    if (shop?.shopId) {
      const next = await getNextSlipNumber(shop.shopId);
      setSlipNumber(next);
    }
  };

  const formComplete = !!(
    (boughtFromAgent ? sourceAgentName.trim() : selectedTruck) &&
    (entries.length > 0 || (selectedGrade && sacks > 0))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00450D' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: 14,
          backgroundColor: '#00450D',
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="back-from-bill" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>नया बिल</Text>
          <Text style={{ fontSize: FontSize.xs, color: '#DFF4FF' }}>
            Bill #{slipNumber ?? '…'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <KeyboardAwareScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={110}
        >
          {/* Payment Method - MOVED TO TOP */}
          <View onLayout={rememberSection('payment')}>
            <SectionHeader title="भुगतान / Payment Method" />
          </View>
          <View style={{ marginBottom: Spacing.md }}>
            <PaymentSelector
              selected={paymentMode}
              onSelect={setPaymentMode}
              upiRef={upiRef}
              onUpiRefChange={setUpiRef}
            />
          </View>

          {/* Bought from Agent Toggle */}
          <View style={{ marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: Colors.text }}>Bought from another agent</Text>
            <Switch
              testID="bought-from-agent-toggle"
              value={boughtFromAgent}
              onValueChange={(v) => {
                setBoughtFromAgent(v);
                setSelectedTruck(null);
                setSelectedGrade(null);
                if (!v) { setSourceAgentName(''); setSourceAgentPhone(''); }
                setTimeout(() => scrollToSection(v ? 'source' : 'truck'), 80);
              }}
            />
          </View>

          {boughtFromAgent ? (
            <View onLayout={rememberSection('source')} style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
              <TextInput
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: Spacing.md, height: 48, fontSize: 16, color: '#111827' }}
                placeholder="Agent name *"
                placeholderTextColor="#9CA3AF"
                value={sourceAgentName}
                onChangeText={setSourceAgentName}
              />
              {errors?.sourceAgent ? <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>⚠ {errors.sourceAgent}</Text> : null}
              <TextInput
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: Spacing.md, height: 48, fontSize: 16, color: '#111827' }}
                placeholder="Agent phone (optional)"
                placeholderTextColor="#9CA3AF"
                value={sourceAgentPhone}
                onChangeText={setSourceAgentPhone}
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <View onLayout={rememberSection('truck')}>
              {/* SECTION 1: Truck */}
              <SectionHeader title="गाड़ी चुनें / Select Truck" />

              <Pressable
                testID="truck-picker-button"
                onPress={() => setTruckPickerVisible(true)}
                style={{
                  ...inputStyle,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontSize: FontSize.md,
                    color: selectedTruck ? Colors.text : Colors.textSecond,
                  }}
                >
                  {selectedTruck ? `${selectedTruck.truckNumber} — ${selectedTruck.senderName}` : 'Select truck…'}
                </Text>
                <ChevronDown size={18} color={Colors.textSecond} />
              </Pressable>
              {errors.truck ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.truck}</Text> : null}
            </View>
          )}

          {/* SECTION 2: Customer */}
          <View onLayout={rememberSection('customer')}>
            <SectionHeader title="ग्राहक / Customer (Optional)" />
          </View>
          <View style={{ position: 'relative', zIndex: 10, marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <TextInput
                testID="customer-name-input"
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Customer name"
                placeholderTextColor={Colors.textSecond}
                value={customerName}
                onChangeText={handleCustomerNameChange}
              />
              <Pressable
                testID="contact-picker-btn"
                onPress={openContactPicker}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: Radius.sm,
                  backgroundColor: Colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: Colors.primary,
                }}
              >
                <Phone size={20} color="#FFF" />
              </Pressable>
            </View>
            {buyerSuggestions.length > 0 ? (
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderTopWidth: 0,
                  borderBottomLeftRadius: Radius.sm,
                  borderBottomRightRadius: Radius.sm,
                  marginTop: Spacing.xs,
                  elevation: 20,
                }}
              >
                {buyerSuggestions.map((b) => (
                  <Pressable
                    key={b.id}
                    testID={`buyer-suggestion-${b.id}`}
                    onPress={() => selectBuyer(b)}
                    style={{ paddingVertical: 10, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}
                  >
                    <Text style={{ fontSize: FontSize.sm, color: Colors.text, fontWeight: '600' }}>{b.name}</Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{b.phone}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <TextInput
            testID="customer-phone-input"
            style={inputStyle}
            placeholder="Phone number (optional)"
            placeholderTextColor={Colors.textSecond}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => scrollToSection('grade')}
          />

          {/* SECTION 3: Grade & Quantity */}
          <View onLayout={rememberSection('grade')}>
            <SectionHeader title="ग्रेड और मात्रा / Grade & Quantity" />
          </View>
          {selectedTruck || boughtFromAgent ? (
            <>
              {/* Grade-wise Stock Display */}
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: Spacing.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Select Grade
                </Text>
                {!boughtFromAgent && selectedTruck && !hasBreakdown ? (
                  <View
                    style={{
                      backgroundColor: '#FFF8E1',
                      borderWidth: 1,
                      borderColor: '#FBBF24',
                      borderRadius: Radius.sm,
                      padding: Spacing.sm,
                      marginBottom: Spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: FontSize.xs, color: '#7E5700', fontWeight: '800' }}>
                      Shared truck stock: {toIndianWeight(truckAvailableKg)}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: '#7E5700', marginTop: 2 }}>
                      Grade-wise load was not entered for this truck, so stock is common across all grades.
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {boughtFromAgent ? (
                    // Show shop grades when buying from agent
                    shop?.grades && shop.grades.length > 0 ? (
                      shop.grades.map((grade) => {
                        const isSelected = selectedGrade === grade.code;
                        return (
                          <Pressable
                            key={grade.code}
                            testID={`grade-option-${grade.code}`}
                            onPress={() => {
                              setSelectedGrade(grade.code);
                              setTimeout(() => scrollToSection('quantity'), 80);
                            }}
                            style={{
                              flexBasis: '31%',
                              flexGrow: 1,
                              maxWidth: '32.5%',
                              minHeight: 112,
                              justifyContent: 'space-between',
                              padding: Spacing.sm,
                              borderRadius: Radius.sm,
                              borderWidth: 2,
                              borderColor: isSelected ? Colors.primary : Colors.border,
                              backgroundColor: isSelected ? '#F0F7FF' : Colors.surface,
                              elevation: isSelected ? 4 : 0,
                            }}
                          >
                            <View>
                              <Text numberOfLines={2} style={{ marginBottom: 4 }}>
                                <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.text }}>
                                  {grade.code}
                                </Text>
                                {grade.name && grade.name !== grade.code && (
                                  <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecond }}>
                                    {` (${grade.name})`}
                                  </Text>
                                )}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecond }} />
                                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                                  Agent Stock
                                </Text>
                              </View>
                            </View>
                            <View style={{ alignSelf: 'flex-start', backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.1)' : 'transparent', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm }}>
                              <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.primary }}>
                                ✓
                              </Text>
                              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>Choose</Text>
                            </View>
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, textAlign: 'center', padding: Spacing.md }}>
                        No grades available
                      </Text>
                    )
                  ) : (
                    // Show truck grades when truck is selected
                    selectedTruck?.gradeInventory.length ? (
                      selectedTruck.gradeInventory.map((grade) => {
                        const gradeAvailable = Math.max(0, grade.totalKg - grade.confirmedKg - grade.provisionalKg);
                        const isSelected = selectedGrade === grade.code;
                        const stockColor = gradeAvailable > 0 ? Colors.success : Colors.danger;
                        return (
                          <Pressable
                            key={grade.code}
                            testID={`grade-option-${grade.code}`}
                            onPress={() => {
                              setSelectedGrade(grade.code);
                              setTimeout(() => scrollToSection('quantity'), 80);
                            }}
                            style={{
                              flexBasis: '31%',
                              flexGrow: 1,
                              maxWidth: '32.5%',
                              minHeight: 126,
                              justifyContent: 'space-between',
                              padding: Spacing.sm,
                              borderRadius: Radius.sm,
                              borderWidth: 2,
                              borderColor: isSelected ? Colors.primary : Colors.border,
                              backgroundColor: isSelected ? '#F0F7FF' : Colors.surface,
                              elevation: isSelected ? 4 : 0,
                            }}
                          >
                            <View>
                              <Text numberOfLines={2} style={{ marginBottom: 4 }}>
                                <Text style={{ fontSize: FontSize.lg, fontWeight: '900', color: Colors.text }}>
                                  {grade.code}
                                </Text>
                                {grade.name && grade.name !== grade.code && (
                                  <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecond }}>
                                    {` (${grade.name})`}
                                  </Text>
                                )}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecond }} />
                                <Text numberOfLines={2} style={{ flex: 1, fontSize: FontSize.xs, color: Colors.textSecond }}>
                                  {hasBreakdown ? `Total: ${toIndianWeight(grade.totalKg)}` : 'Category only'}
                                </Text>
                              </View>
                            </View>
                            <View style={{ alignSelf: 'flex-start', backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.1)' : 'transparent', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm }}>
                              {hasBreakdown ? (
                                <>
                                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: FontSize.md, fontWeight: '800', color: stockColor }}>
                                    {toIndianWeight(gradeAvailable)}
                                  </Text>
                                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>Available</Text>
                                </>
                              ) : (
                                <>
                                  <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: isSelected ? Colors.primary : Colors.textSecond }}>
                                    {isSelected ? '✓' : 'Pick'}
                                  </Text>
                                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 2 }}>Grade</Text>
                                </>
                              )}
                            </View>
                          </Pressable>
                        );
                      })
                    ) : (
                      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, textAlign: 'center', padding: Spacing.md }}>
                        No grades available
                      </Text>
                    )
                  )}
                </View>
              </View>
            </>
          ) : (
            <View style={{ padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md }}>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, textAlign: 'center', fontWeight: '500' }}>
                👆 पहले गाड़ी चुनें / Select truck first
              </Text>
            </View>
          )}
          {errors.grade ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.grade}</Text> : null}

          {selectedGrade ? (
            <>
              {/* Sacks counter */}
              <View
                onLayout={rememberSection('quantity')}
                style={{
                  marginTop: Spacing.md,
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: Spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: Colors.text }}>बोरे / Sacks</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: Colors.background,
                      borderRadius: Radius.round,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      padding: 4,
                    }}
                  >
                    <Pressable
                      testID="sacks-minus"
                      onPress={() => {
                        const newVal = Math.max(0, sacks - 1);
                        setSacks(newVal);
                        setSacksText(newVal > 0 ? String(newVal) : '');
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: Colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={18} color={Colors.primary} strokeWidth={2.5} />
                    </Pressable>
                    <TextInput
                      testID="sacks-input"
                      value={sacksText}
                      onChangeText={(v) => {
                        const cleaned = v.replace(/[^0-9]/g, '').slice(0, 4);
                        setSacksText(cleaned);
                        const num = parseInt(cleaned, 10);
                        setSacks(isNaN(num) ? 0 : num);
                      }}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      placeholder="0"
                      placeholderTextColor={Colors.textSecond}
                      selectTextOnFocus
                      style={{
                        width: 72,
                        height: 44,
                        fontSize: 22,
                        fontWeight: '900',
                        color: Colors.text,
                        textAlign: 'center',
                        paddingVertical: 0,
                      }}
                    />
                    <Pressable
                      testID="sacks-plus"
                      onPress={() => {
                        const newVal = sacks + 1;
                        setSacks(newVal);
                        setSacksText(String(newVal));
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: Colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Weight per sack */}
              <View style={{ marginTop: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: 6 }}>
                  Weight/Sack (kg)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      testID="weight-per-sack-input"
                      style={[
                        inputStyle,
                        {
                          width: 90,
                          textAlign: 'center',
                          backgroundColor: '#F3F4F6', // Distinct gray inset background
                          borderColor: '#D1D5DB', // Stronger border
                          borderWidth: 1.5,
                          fontSize: FontSize.lg,
                          fontWeight: '700'
                        }
                      ]}
                      placeholder="e.g. 25"
                      maxLength={5}
                      placeholderTextColor="#9CA3AF"
                      value={weightPerSack}
                      onChangeText={setWeightPerSack}
                      keyboardType="decimal-pad"
                    />
                    {/* Tiny "kg" label inside the input */}
                    <Text style={{ position: 'absolute', right: 12, top: 18, fontSize: FontSize.xs, color: '#6B7280', fontWeight: '600' }}>kg</Text>
                  </View>

                  <View style={{
                    flexDirection: 'row',
                    flex: 1,
                    marginLeft: 8,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 24,
                    padding: 4,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}>
                    {['20', '25', '30'].map((w) => {
                      const isSelected = weightPerSack === w;
                      return (
                        <Pressable
                          key={w}
                          testID={`preset-weight-${w}`}
                          onPress={() => setWeightPerSack(w)}
                          style={{
                            flex: 1,
                            height: 40, // Fits nicely inside the container
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 20,
                            backgroundColor: isSelected ? Colors.primary : 'transparent',
                            shadowColor: isSelected ? Colors.primary : 'transparent',
                            shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                            shadowOpacity: isSelected ? 0.2 : 0,
                            shadowRadius: isSelected ? 4 : 0,
                            elevation: isSelected ? 4 : 0,
                          }}
                        >
                          <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: isSelected ? '#FFFFFF' : '#6B7280' }}>
                            {w}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Calculation preview card */}
              {calc ? (
                <Animated.View style={[calcStyle, { marginTop: Spacing.sm }]}>
                  <View
                    style={{
                      backgroundColor: Colors.surface,
                      borderRadius: Radius.md,
                      borderLeftWidth: 4,
                      borderLeftColor: Colors.success,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      padding: Spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>
                      कुल वजन: {toIndianWeight((parseFloat(weightPerSack) || 0) * sacks)}
                    </Text>
                    {available > 0 ? (
                      (parseFloat(weightPerSack) || 0) * sacks <= available ? (
                        <Text style={{ fontSize: FontSize.xs, color: Colors.success }}>
                          {hasBreakdown ? `उपलब्ध (${selectedGrade})` : 'Shared truck stock'}: {toIndianWeight(available)} ✅
                        </Text>
                      ) : (
                        <Text style={{ fontSize: FontSize.xs, color: Colors.danger }}>
                          ⚠ स्टॉक कम है! Only {toIndianWeight(available)} {hasBreakdown ? 'available in this grade' : 'shared stock available'}
                        </Text>
                      )
                    ) : null}
                  </View>
                </Animated.View>
              ) : null}
            </>
          ) : null}
          {errors.sacks ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.sacks}</Text> : null}


          {/* ADDED ENTRIES */}
          {entries.length > 0 ? (
            <View style={{ marginBottom: Spacing.md, marginTop: Spacing.md }}>
              <SectionHeader title="जोड़े गए आइटम / Added Items" />
              {entries.map((entry, idx) => (
                <View key={idx} style={{ backgroundColor: '#FFF', padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontWeight: '700', color: Colors.text }}>{entry.gradeName}</Text>
                      <Text style={{ fontWeight: '700', color: Colors.text }}>₹{entry.netAmount.toFixed(0)}</Text>
                    </View>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                      {entry.sacks} sacks @ {entry.weightPerSack}kg (Total {entry.totalWeight}kg)
                      {entry.ratePerKg > 0 ? ` x ₹${entry.ratePerKg}/kg` : ''}
                    </Text>
                  </View>
                  <Pressable 
                    onPress={() => setEntries(prev => prev.filter((_, i) => i !== idx))}
                    style={{ padding: Spacing.sm, marginLeft: Spacing.sm }}
                  >
                    <Trash2 size={20} color={Colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* SECTION 4: Rate */}
          <View onLayout={rememberSection('rate')}>
            <SectionHeader title="रेट / Rate (optional)" style={{ marginTop: 2 }} />
          </View>
          <TextInput
            testID="rate-per-kg-input"
            style={inputStyle}
            placeholder="₹ per kg"
            placeholderTextColor={Colors.textSecond}
            value={ratePerKg}
            onChangeText={setRatePerKg}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />


          {calc ? (
            <Pressable
              onPress={handleAddEntry}
              style={{
                marginTop: Spacing.md,
                backgroundColor: Colors.surface,
                borderWidth: 2,
                borderColor: Colors.primary,
                borderRadius: Radius.md,
                paddingVertical: 10,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: FontSize.md }}>+ Add Another Item</Text>
            </Pressable>
          ) : null}

          {/* APMC & Bardana Toggles */}
          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
            <Pressable
              testID="toggle-apmc"
              onPress={() => setApplyApmc((prev) => !prev)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: applyApmc ? Colors.primary : Colors.border }}
            >
              <Text style={{ fontSize: FontSize.md, color: applyApmc ? Colors.primary : Colors.text, fontWeight: '700' }}>APMC</Text>
              <View pointerEvents="none">
                <Switch value={applyApmc} onValueChange={setApplyApmc} />
              </View>
            </Pressable>
            <Pressable
              testID="toggle-bardana"
              onPress={() => setApplyBardana((prev) => !prev)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: applyBardana ? Colors.primary : Colors.border }}
            >
              <Text style={{ fontSize: FontSize.md, color: applyBardana ? Colors.primary : Colors.text, fontWeight: '700' }}>Bardana</Text>
              <View pointerEvents="none">
                <Switch value={applyBardana} onValueChange={setApplyBardana} />
              </View>
            </Pressable>
          </View>

          {calc && rate > 0 ? (
            <View
              style={{
                marginTop: Spacing.sm,
                backgroundColor: Colors.surface,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                padding: Spacing.md,
              }}
            >
              <CalcRow label="Gross" value={toIndianCurrency(calc.gross)} />
              <CalcRow label="APMC" value={`+${toIndianCurrency(calc.apmc)}`} color={Colors.text} />
              <CalcRow label="Bardana" value={`+${toIndianCurrency(calc.bardana)}`} color={Colors.text} />
              {calc.cartage > 0 ? <CalcRow label="Cartage" value={`+${toIndianCurrency(calc.cartage)}`} color={Colors.text} /> : null}
              <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs }} />
              <CalcRow label="Net" value={toIndianCurrency(calc.net)} bold />
            </View>
          ) : null}



        </KeyboardAwareScrollView>

        {/* Save button */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: Spacing.md,
            backgroundColor: Colors.background,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
            elevation: 10,
          }}
        >
          <Pressable
            testID="save-bill-button"
            onPress={handleSave}
            disabled={!formComplete || saveMutation.isPending}
            style={{
              height: 56,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: Spacing.sm,
              backgroundColor: formComplete && !saveMutation.isPending ? Colors.success : Colors.border,
            }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={{ fontSize: FontSize.md, color: '#FFF', fontWeight: '700' }}>
                📋 बिल सेव करें / Save Bill
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Truck Picker Modal */}
      <Modal
        visible={truckPickerVisible}
        transparent
        animationType="slide"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setTruckPickerVisible(false);
          setTruckSearchText('');
        }}
      >
        {truckPickerVisible && (
          <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1 }}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
              onPress={() => {
                setTruckPickerVisible(false);
                setTruckSearchText('');
              }}
            >
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  maxHeight: '70%',
                  paddingTop: Spacing.md,
                  paddingBottom: Math.max(Spacing.md, insets.bottom),
                  elevation: 20,
                }}
                onStartShouldSetResponder={() => true}
              >
                <Text
                  style={{
                    fontSize: FontSize.md,
                    fontWeight: '700',
                    color: Colors.text,
                    paddingHorizontal: Spacing.md,
                    marginBottom: Spacing.sm,
                  }}
                >
                  गाड़ी चुनें / Select Truck
                </Text>
                {/* Search bar for trucks */}
                <TextInput
                  testID="truck-search-input"
                  style={{
                    height: 48,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: Radius.sm,
                    paddingHorizontal: Spacing.md,
                    marginHorizontal: Spacing.md,
                    marginBottom: Spacing.md,
                    fontSize: FontSize.md,
                    backgroundColor: Colors.background,
                    color: Colors.text,
                  }}
                  placeholder="Search truck number or sender... / गाड़ी खोजें"
                  placeholderTextColor={Colors.textSecond}
                  value={truckSearchText}
                  onChangeText={setTruckSearchText}
                  autoCorrect={false}
                />
                <FlatList
                  data={trucks.filter((t) => {
                    if (!truckSearchText.trim()) return true;
                    const q = truckSearchText.trim().toLowerCase();
                    return (
                      t.truckNumber.toLowerCase().includes(q) ||
                      t.senderName.toLowerCase().includes(q)
                    );
                  })}
                  keyExtractor={(t) => t.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const hasBreakdown = item.gradeInventory.some(g => g.totalKg > 0);
                    const totalAvail = hasBreakdown
                      ? item.gradeInventory.reduce((s, g) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg), 0)
                      : Math.max(0, item.totalKg - item.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0));
                    return (
                      <Pressable
                        testID={`truck-option-${item.id}`}
                        onPress={() => {
                          setSelectedTruck(item);
                          setSelectedGrade(null);
                          setTruckPickerVisible(false);
                          setTruckSearchText('');
                          setTimeout(() => scrollToSection('customer'), 120);
                        }}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: Spacing.md,
                          paddingHorizontal: Spacing.md,
                          borderBottomWidth: 1,
                          borderBottomColor: Colors.border,
                        }}
                      >
                        <View>
                          <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
                            {item.truckNumber}
                          </Text>
                          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                            {item.senderName}
                          </Text>
                        </View>
                        <Text style={{ fontSize: FontSize.sm, color: Colors.success, fontWeight: '600' }}>
                          {toIndianWeight(totalAvail)}
                        </Text>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: 'center', color: Colors.textSecond, padding: Spacing.lg }}>
                      {truckSearchText.trim() ? 'No trucks matching search' : 'No trucks today'}
                    </Text>
                  }
                />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Removed Contact Picker Modal */}

      {/* Success bottom sheet */}
      {success ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: Spacing.xl,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 20,
            },
            successStyle,
          ]}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.xs }}>✅</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>
            बिल सेव हो गया!
          </Text>
          <Text style={{ fontSize: FontSize.xxl, fontWeight: '900', color: Colors.primary, marginBottom: Spacing.xl }}>
            Slip #{savedSlip}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
            <Pressable
              testID="new-bill-button"
              onPress={resetForm}
              style={{
                flex: 1,
                height: 52,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, color: Colors.text, fontWeight: '700' }}>➕ नया बिल</Text>
            </Pressable>
            {isMemberMode === false ? (
              <>
                <Pressable
                  testID="edit-bill-button"
                  onPress={() => router.push(`/bills/edit/${savedInquiryId}` as any)}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: Radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.info,
                  }}
                >
                  <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>✏️ एडिट</Text>
                </Pressable>
                <Pressable
                  testID="authorize-bill"
                  onPress={() => {
                    successY.value = 400; // hide bottom sheet visually
                    router.push({ pathname: '/authorization', params: { id: savedInquiryId } } as any);
                  }}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: Radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.primary,
                  }}
                >
                  <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>🔐 Auth</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  testID="edit-bill-button"
                  onPress={() => router.push(`/bills/edit/${savedInquiryId}` as any)}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: Radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.info,
                  }}
                >
                  <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>✏️ एडिट</Text>
                </Pressable>
                <Pressable
                  testID="mark-delivered-bill"
                  onPress={() => markDeliveredMutation.mutate()}
                  disabled={markDeliveredMutation.isPending}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: Radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.success,
                  }}
                >
                  {markDeliveredMutation.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>🚚 Deliver</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function CalcRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>{label}</Text>
      <Text
        style={{
          fontSize: FontSize.sm,
          color: color ?? Colors.text,
          fontWeight: bold ? '800' : '600',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
