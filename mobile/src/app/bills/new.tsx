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
import { ArrowLeft, ChevronDown, Minus, Plus, Phone } from 'lucide-react-native';
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

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.textSecond,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
      }}
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
  const [applyApmc, setApplyApmc] = useState(true);
  const [applyBardana, setApplyBardana] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      setContactsLoading(true);
      setContactSearchText('');
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status === 'granted') {
        const contacts = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        });
        
        if (contacts && contacts.data.length > 0) {
          // Filter contacts that have phone numbers
          const contactsWithPhones = contacts.data.filter(
            c => c.phoneNumbers && c.phoneNumbers.length > 0
          );
          setPhoneContacts(contactsWithPhones);
          setContactPickerVisible(true);
        }
      }
      setContactsLoading(false);
    } catch (error) {
      setContactsLoading(false);
      console.log('Contact picker error:', error);
    }
  };

  const selectPhoneContact = (contact: any) => {
    setCustomerName(contact.name || '');
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const phone = contact.phoneNumbers[0].number?.replace(/[^\d]/g, '') || '';
      setCustomerPhone(phone);
    }
    setBuyerSuggestions([]);
    setContactSearchText('');
    setContactPickerVisible(false);
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

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      inquiry: any;
      truckUpdate?: { id: string; gradeInventory: any[] };
      buyerUpsert?: { name: string; phone: string } | null;
    }) => {
      // 1. Create inquiry
      const dbInq = {
        shop_id: payload.inquiry.shopId,
        slip_number: payload.inquiry.slipNumber,
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
    if (!validate() || !shop?.shopId || (!selectedTruck && !boughtFromAgent) || !selectedGrade || saveMutation.isPending) return;

    const slip = slipNumber ?? 1001;
    const gradeInfo2 = selectedTruck?.gradeInventory.find((g) => g.code === selectedGrade);
    const gradeName = gradeInfo2?.name ?? shop?.grades?.find(g => g.code === selectedGrade)?.name ?? selectedGrade;
    const result = calc ?? calculateCharges({ sacks, weightPerSack: wps, ratePerKg: 0, charges: { apmcPct: 0, bardanaPerSack: 0, cartagePerKg: 0 }, applyApmc, applyBardana });

    const newInventory = selectedTruck ? selectedTruck.gradeInventory.map((g) =>
      g.code === selectedGrade
        ? { ...g, provisionalKg: g.provisionalKg + result.totalWeight }
        : g
    ) : [];

    await saveMutation.mutateAsync({
      inquiry: {
        shopId: shop.shopId,
        slipNumber: slip,
        truckId: boughtFromAgent ? null : selectedTruck?.id,
        truckNumber: boughtFromAgent ? 'Agent Stock' : selectedTruck?.truckNumber,
        sourceAgentName: boughtFromAgent ? sourceAgentName.trim() : '',
        sourceAgentPhone: boughtFromAgent ? sourceAgentPhone.trim() : '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
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
        bardanaSacks: sacks,
        bardanaRate: shop.charges?.bardanaPerSack ?? 0,
        applyBardana,
        applyApmc,
        chargeSnapshot: {
          apmcCommission: shop.charges?.apmcCommission ?? 0,
          bardanaPerSack: shop.charges?.bardanaPerSack ?? 0,
          cartagePerKg: shop.charges?.cartagePerKg ?? 0,
          applyApmc,
          applyBardana,
        },
        netAmount: result.net,
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

    setSavedSlip(slip);
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
    selectedGrade &&
    sacks > 0
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable testID="back-from-bill" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>नया बिल</Text>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
            Bill #{slipNumber ?? '…'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
          <View style={{ marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Bought from another agent</Text>
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
                              flexBasis: '48%',
                              flexGrow: 1,
                              maxWidth: '49%',
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
                              <Text numberOfLines={1} style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>
                                {grade.name || grade.code}
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
                              flexBasis: '48%',
                              flexGrow: 1,
                              maxWidth: '49%',
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
                              <Text numberOfLines={1} style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginBottom: 4 }}>
                                {grade.name || grade.code}
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
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>बोरे / Sacks</Text>
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
                <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 6 }}>
                  Weight/Sack (kg)
                </Text>
                <TextInput
                  testID="weight-per-sack-input"
                  style={inputStyle}
                  placeholder="e.g. 25"
                  placeholderTextColor={Colors.textSecond}
                  value={weightPerSack}
                  onChangeText={setWeightPerSack}
                  keyboardType="decimal-pad"
                />
                <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs }}>
                  {['20', '25', '30'].map((w) => (
                    <Pressable
                      key={w}
                      testID={`preset-weight-${w}`}
                      onPress={() => setWeightPerSack(w)}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: Spacing.sm,
                        borderRadius: Radius.round,
                        backgroundColor: weightPerSack === w ? Colors.border : '#EEEEEE',
                      }}
                    >
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{w} kg</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Calculation preview card */}
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
            </>
          ) : null}
          {errors.sacks ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.sacks}</Text> : null}

          {/* SECTION 4: Rate */}
          <View onLayout={rememberSection('rate')}>
            <SectionHeader title="रेट / Rate (optional)" />
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

          {/* APMC & Bardana Toggles */}
          <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md }}>
            <Pressable
              testID="toggle-apmc"
              onPress={() => setApplyApmc((prev) => !prev)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: applyApmc ? Colors.primary : Colors.border }}
            >
              <Text style={{ fontSize: FontSize.sm, color: applyApmc ? Colors.primary : Colors.textSecond, fontWeight: '700' }}>APMC</Text>
              <View pointerEvents="none">
                <Switch value={applyApmc} onValueChange={setApplyApmc} />
              </View>
            </Pressable>
            <Pressable
              testID="toggle-bardana"
              onPress={() => setApplyBardana((prev) => !prev)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: applyBardana ? Colors.primary : Colors.border }}
            >
              <Text style={{ fontSize: FontSize.sm, color: applyBardana ? Colors.primary : Colors.textSecond, fontWeight: '700' }}>Bardana</Text>
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
      </KeyboardAvoidingView>

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
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => {
            setTruckPickerVisible(false);
            setTruckSearchText('');
          }}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
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
      </Modal>

      {/* Contact Picker Modal */}
      <Modal
        visible={contactPickerVisible}
        transparent
        animationType="slide"
        hardwareAccelerated={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setContactPickerVisible(false);
          setContactSearchText('');
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => {
            setContactPickerVisible(false);
            setContactSearchText('');
          }}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
              paddingTop: Spacing.md,
              paddingBottom: Math.max(Spacing.md, insets.bottom),
              elevation: 20,
            }}
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
              📞 Select Contact
            </Text>
            <TextInput
              testID="contact-search-input"
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
              placeholder="Search contacts..."
              placeholderTextColor={Colors.textSecond}
              value={contactSearchText}
              onChangeText={setContactSearchText}
            />
            {contactsLoading ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : (
              <FlatList
                data={phoneContacts.filter((c) => {
                  const searchLower = contactSearchText.toLowerCase();
                  return (
                    c.name?.toLowerCase().includes(searchLower) ||
                    c.phoneNumbers?.[0]?.number?.includes(contactSearchText)
                  );
                })}
                keyExtractor={(c, idx) => `${c.id || idx}`}
                renderItem={({ item }) => (
                  <Pressable
                    testID={`contact-option-${item.id}`}
                    onPress={() => selectPhoneContact(item)}
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
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
                        {item.name || 'Unknown'}
                      </Text>
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 4 }}>
                        {item.phoneNumbers?.[0]?.number || 'No phone'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' }}>
                      Select
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: Colors.textSecond, padding: Spacing.lg }}>
                    No contacts found
                  </Text>
                }
              />
            )}
          </View>
        </Pressable>
      </Modal>

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
            <Pressable
              testID="view-bill-button"
              onPress={() => router.back()}
              style={{
                flex: 1,
                height: 52,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Colors.info,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>🔍 देखें</Text>
            </Pressable>
            <Pressable
              testID="home-after-bill"
              onPress={() => router.replace('/')}
              style={{
                flex: 1,
                height: 52,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: Colors.primary,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>🏠 Home</Text>
            </Pressable>
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
