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
import { ArrowLeft, ChevronDown, Minus, Plus, Phone, Trash2, User } from 'lucide-react-native';
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
import EditableSlipRow from '@/components/bills/EditableSlipRow';
import GradeSelector from '@/components/bills/GradeSelector';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianWeight, toIndianDate } from '@/lib/formatters';
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
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const selectedTruck = trucks.find(t => t.id === selectedTruckId) || null;
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
  const [editingField, setEditingField] = useState<string | null>('customer');
  const [entries, setEntries] = useState<any[]>([]);
  const [manualTotal, setManualTotal] = useState('');

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
      const t = trucks.find(t => t.id === preselectedTruckId);
      if (t) setSelectedTruckId(t.id);
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


  const handleEditEntry = (idx: number, item: any) => {
    setSelectedGrade(item.grade);
    setSacks(item.sacks);
    setSacksText(String(item.sacks));
    setWeightPerSack(String(item.weightPerSack));
    setRatePerKg(item.ratePerKg > 0 ? String(item.ratePerKg) : '');
    setEntries(entries.filter((_, i) => i !== idx));
    setTimeout(() => {
      scrollToSection('grade');
    }, 100);
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
    const finalNet = manualTotal ? (parseFloat(manualTotal) || totalNet) : totalNet;

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
        weightPerSack: allEntries.length === 1 ? allEntries[0].weightPerSack : 0, // 0 means mixed or N/A
        totalWeight,
        ratePerKg: allEntries.length === 1 ? allEntries[0].ratePerKg : 0, // 0 means mixed
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
        netAmount: finalNet,
        paymentMode,
        upiRef: upiRef.trim(),
        status: 'PENDING',
        date: getCurrentBusinessDate().getTime(),
        createdAt: Date.now(),
      },
      truckUpdate: selectedTruck ? {
        id: selectedTruckId!,
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
    setManualTotal('');
    setSuccess(false);
    saveMutation.reset();
    successY.value = 400;
    if (shop?.shopId) {
      const next = await getNextSlipNumber(shop.shopId);
      setSlipNumber(next);
    }
    
    // Scroll back to the top of the form
    setTimeout(() => {
      if (scrollRef.current) {
        // Try all possible scroll methods for different ScrollView wrappers
        if (typeof scrollRef.current.scrollToPosition === 'function') {
          scrollRef.current.scrollToPosition(0, 0, false);
        } else if (typeof scrollRef.current.scrollTo === 'function') {
          scrollRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
        
        // Also try getScrollResponder if available (some wrappers need this)
        const responder = scrollRef.current.getScrollResponder?.();
        if (responder && typeof responder.scrollTo === 'function') {
          responder.scrollTo({ x: 0, y: 0, animated: false });
        }
      }
    }, 100);
  };

  const formComplete = !!(
    (boughtFromAgent ? sourceAgentName.trim() : selectedTruckId) &&
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

      {isMemberMode ? (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f3faff' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={120}
          extraKeyboardSpace={16}
          disableScrollOnKeyboardHide
        >
          {/* Source Section */}
          <View onLayout={rememberSection('source')}>
            <SectionHeader title="गाड़ी / Source" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Bought from agent?</Text>
            <Switch
              value={boughtFromAgent}
              onValueChange={(v) => {
                setBoughtFromAgent(v);
                setSelectedTruckId(null);
                setSelectedGrade(null);
                if (!v) { setSourceAgentName(''); setSourceAgentPhone(''); }
              }}
            />
          </View>
          {boughtFromAgent ? (
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <TextInput
                style={inputStyle}
                placeholder="Agent name *"
                placeholderTextColor={Colors.textSecond}
                value={sourceAgentName}
                onChangeText={setSourceAgentName}
              />
              <TextInput
                style={inputStyle}
                placeholder="Agent phone (optional)"
                placeholderTextColor={Colors.textSecond}
                value={sourceAgentPhone}
                onChangeText={setSourceAgentPhone}
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <Pressable 
              onPress={() => setTruckPickerVisible(true)} 
              style={[inputStyle, { justifyContent: 'center', marginBottom: Spacing.sm, borderColor: errors.truck ? Colors.danger : Colors.border }]}
            >
              <Text style={{ color: selectedTruckId ? Colors.text : Colors.textSecond, fontSize: FontSize.md }}>
                {selectedTruck?.truckNumber || 'Select Truck / गाड़ी चुनें'}
              </Text>
            </Pressable>
          )}
          {errors.truck ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: -4, marginBottom: 8 }}>{errors.truck}</Text> : null}

          {/* Customer Section */}
          <View onLayout={rememberSection('customer')}>
            <SectionHeader title="ग्राहक / Customer (Optional)" />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <TextInput
              testID="edit-customer-name"
              value={customerName}
              onChangeText={(val) => {
                setCustomerName(val);
                if (errors.customer) setErrors((prev) => { const { customer, ...rest } = prev; return rest; });
                const lower = val.toLowerCase();
                if (lower.length > 0) {
                  setBuyerSuggestions(buyers.filter((b) => b.name.toLowerCase().includes(lower)).slice(0, 5));
                } else setBuyerSuggestions([]);
              }}
              placeholder="Customer name / ग्राहक का नाम"
              placeholderTextColor={Colors.textSecond}
              returnKeyType="next"
              style={[inputStyle, { flex: 1 }]}
            />
            <Pressable onPress={openContactPicker} style={{ width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BAE6FD' }}>
              <User size={24} color="#0EA5E9" />
            </Pressable>
          </View>
          {buyerSuggestions.length > 0 && (
            <View style={{ marginBottom: Spacing.sm, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: Radius.sm, overflow: 'hidden' }}>
              {buyerSuggestions.map((b) => (
                <Pressable
                  key={b.id || b.code}
                  onPress={() => {
                    setCustomerName(b.name);
                    setCustomerPhone(b.phone || '');
                    setBuyerSuggestions([]);
                  }}
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{b.name}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>{b.phone}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            testID="edit-customer-phone"
            value={customerPhone}
            onChangeText={(v) => setCustomerPhone(v.replace(/[^\d]/g, '').slice(0, 10))}
            placeholder="Phone / फ़ोन (Optional)"
            placeholderTextColor={Colors.textSecond}
            keyboardType="phone-pad"
            returnKeyType="next"
            style={[inputStyle, { marginBottom: Spacing.sm }]}
          />

          {/* Added Items List */}
          {entries.length > 0 && (
            <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              <SectionHeader title="Added Items / जुड़े हुए आइटम" />
              <View style={{ backgroundColor: '#FFF', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' }}>
                {entries.map((item, idx) => (
                  <Pressable key={idx} onPress={() => handleEditEntry(idx, item)} style={({pressed}) => ({ flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: idx < entries.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6', alignItems: 'center', backgroundColor: pressed ? '#F8FAFC' : 'transparent' })}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{item.grade} - {item.gradeName} • {item.sacks} qty</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>{item.totalWeight}kg @ ₹{item.ratePerKg}/kg</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>₹{Math.round(item.gross)}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => handleEditEntry(idx, item)} style={{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 6 }}>
                          <Text style={{ fontSize: 16 }}>✏️</Text>
                        </Pressable>
                        <Pressable onPress={() => setEntries(entries.filter((_, i) => i !== idx))} style={{ padding: 6, backgroundColor: '#FEF2F2', borderRadius: 6 }}>
                          <Trash2 size={20} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Grade Section */}
          <View onLayout={rememberSection('grade')}>
            <SectionHeader title={entries.length > 0 ? "Add Another Item - Grade" : "ग्रेड चुनें / Select Grade"} />
          </View>
          {errors.grade ? <Text style={{ fontSize: FontSize.xs, color: Colors.danger, marginBottom: 6 }}>{errors.grade}</Text> : null}
          <GradeSelector
            grades={(shop?.grades ?? [])}
            selectedGrade={selectedGrade}
            truckInventory={boughtFromAgent ? [] : (selectedTruck?.gradeInventory ?? [])}
            onSelect={(g) => {
              setSelectedGrade(g);
              scrollToSection('quantity');
            }}
          />

          {/* Quantity Section */}
          <View onLayout={rememberSection('quantity')}>
            <SectionHeader title="मात्रा / Quantity" />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>
                बोरे / Qty
              </Text>
              <TextInput
                testID="edit-sacks"
                value={sacksText}
                onChangeText={(v) => { setSacksText(v); setSacks(parseInt(v.replace(/[^\d]/g, ''), 10) || 0); if(errors.sacks) setErrors(p => ({...p, sacks: ''})) }}
                keyboardType="numeric"
                returnKeyType="next"
                style={[inputStyle, errors.sacks ? { borderColor: Colors.danger } : {}]}
              />
              {errors.sacks ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>{errors.sacks}</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>
                वजन/बोरा / Weight/kg
              </Text>
              <TextInput
                testID="edit-weight"
                value={weightPerSack}
                onChangeText={(v) => { setWeightPerSack(v.replace(/[^0-9.]/g, '')); if(errors.weight) setErrors(p => ({...p, weight: ''})) }}
                keyboardType="decimal-pad"
                returnKeyType="next"
                style={[inputStyle, errors.weight ? { borderColor: Colors.danger } : {}]}
              />
              {errors.weight ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>{errors.weight}</Text> : null}
            </View>
          </View>

          {/* Rate Section */}
          <View onLayout={rememberSection('rate')}>
            <SectionHeader title="रेट / Rate" />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>
                ₹ / kg
              </Text>
              <TextInput
                testID="edit-rate"
                value={ratePerKg}
                onChangeText={(v) => { setRatePerKg(v.replace(/[^0-9.]/g, '')); if(errors.rate) setErrors(p => ({...p, rate: ''})); }}
                keyboardType="decimal-pad"
                style={[inputStyle, errors.rate ? { borderColor: Colors.danger } : {}]}
              />
              {errors.rate ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>{errors.rate}</Text> : null}
            </View>
            
            <View style={{ marginTop: 20 }}>
              <Pressable
                onPress={handleAddEntry}
                style={{ height: 56, backgroundColor: '#00450D', paddingHorizontal: 20, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Plus size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>ADD</Text>
              </Pressable>
            </View>
          </View>

          {/* Bill Settings (Payment, APMC, Bardana) */}
          <View onLayout={rememberSection('settings')}>
            <SectionHeader title="बिल सेटिंग्स / Bill Settings" />
          </View>
          
          <View style={{ backgroundColor: '#FFF', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md }}>
            <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 8 }}>PAYMENT MODE</Text>
            <PaymentSelector selected={paymentMode} onSelect={setPaymentMode} upiRef={upiRef} onUpiRefChange={setUpiRef} />
            
            <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md }} />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              <Text style={{ fontSize: 15, color: '#111827', fontWeight: '700' }}>Apply APMC Charges</Text>
              <Switch value={applyApmc} onValueChange={setApplyApmc} />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, color: '#111827', fontWeight: '700' }}>Apply Bardana Charges</Text>
              <Switch value={applyBardana} onValueChange={setApplyBardana} />
            </View>
          </View>

          {/* Calculation Preview */}
          {(entries.reduce((s, e) => s + e.netAmount, 0) + (calc?.net ?? 0)) > 0 && (
            <View
              style={{
                marginTop: Spacing.lg,
                backgroundColor: '#FFFFFF',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderLeftWidth: 4,
                borderLeftColor: Colors.primary,
                padding: Spacing.md,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm }}>
                Bill Preview / बिल पूर्वावलोकन
              </Text>
              <CalcRow label="Total Weight" value={toIndianWeight(entries.reduce((s, e) => s + e.totalWeight, 0) + (calc?.totalWeight ?? 0))} />
              <CalcRow label="Gross Amount" value={toIndianCurrency(entries.reduce((s, e) => s + e.grossAmount, 0) + (calc?.gross ?? 0))} />
              {(entries.reduce((s, e) => s + e.apmcAmount, 0) + (calc?.apmc ?? 0)) > 0 ? <CalcRow label="APMC" value={`+${toIndianCurrency(entries.reduce((s, e) => s + e.apmcAmount, 0) + (calc?.apmc ?? 0))}`} color={Colors.text} /> : null}
              {(entries.reduce((s, e) => s + e.bardanaAmount, 0) + (calc?.bardana ?? 0)) > 0 ? <CalcRow label="Bardana" value={`+${toIndianCurrency(entries.reduce((s, e) => s + e.bardanaAmount, 0) + (calc?.bardana ?? 0))}`} color={Colors.text} /> : null}
              {(entries.reduce((s, e) => s + e.cartageAmount, 0) + (calc?.cartage ?? 0)) > 0 ? <CalcRow label="Cartage" value={`+${toIndianCurrency(entries.reduce((s, e) => s + e.cartageAmount, 0) + (calc?.cartage ?? 0))}`} color={Colors.text} /> : null}
              <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs }} />
              <CalcRow label="Calculated Net Amount" value={toIndianCurrency(entries.reduce((s, e) => s + e.netAmount, 0) + (calc?.net ?? 0))} bold />
              
              <View style={{ marginTop: Spacing.sm }}>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>
                  Manual Override Total (Optional)
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Override Total (₹)"
                  keyboardType="decimal-pad"
                  value={manualTotal}
                  onChangeText={(v) => setManualTotal(v.replace(/[^0-9.]/g, ''))}
                />
              </View>
            </View>
          )}

        </KeyboardAwareScrollView>

        {/* Save Button */}
        <View
          style={{
            padding: Spacing.md,
            paddingBottom: Math.max(Spacing.md, insets.bottom + Spacing.sm),
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
          }}
        >
          {errors.save ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, textAlign: 'center', marginBottom: 8 }}>{errors.save}</Text> : null}
          <Pressable
            testID="save-bill-button"
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {({ pressed }) => (
              <View style={{
                height: 56,
                borderRadius: Radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: saveMutation.isPending ? Colors.border : pressed ? '#EAB308' : '#FBBF24',
              }}>
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <>
                    <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#111827' }}>
                      SAVE BILL
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      ) : (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={110}
        >
          <View style={{ borderWidth: 2, borderColor: '#111827', padding: 22, backgroundColor: '#FFFFFF', marginBottom: 40 }}>
            {/* Header */}
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
              {shop?.firmName?.toUpperCase() ?? 'MANDIBOOK'}
            </Text>
            <Text style={{ fontSize: 14, color: '#111827', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              {[shop?.phone1, shop?.phone2].filter(Boolean).join(' / ')}
            </Text>
            <View style={{ borderWidth: 2, borderColor: '#111827', marginBottom: 16, paddingVertical: 8, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' }}>NEW BILL</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#111827', textAlign: 'center', marginTop: 2 }}>
                SLIP #SL-{slipNumber ?? '...'} • {toIndianDate(Date.now())}
              </Text>
            </View>

            {/* Customer */}
            <EditableSlipRow label="Customer" value={customerName || 'None'} isEditing={editingField === 'customer'} onToggle={() => setEditingField(editingField === 'customer' ? null : 'customer')} isError={!!errors.customer} />
            {editingField === 'customer' && (
              <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput style={{ flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }} placeholder="Customer name" value={customerName} onChangeText={(val) => { setCustomerName(val); if (errors.customer) setErrors((prev) => { const { customer, ...rest } = prev; return rest; }); const lower = val.toLowerCase(); if (lower.length > 0) { setBuyerSuggestions(buyers.filter((b) => b.name.toLowerCase().includes(lower)).slice(0, 5)); } else setBuyerSuggestions([]); }} />
                  <Pressable onPress={openContactPicker} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#0EA5E9" /></Pressable>
                </View>
                {buyerSuggestions.length > 0 && (
                  <View style={{ marginTop: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                    {buyerSuggestions.map((b) => (
                      <Pressable key={b.id || b.code} onPress={() => selectBuyer(b)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{b.name}</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>{b.phone}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', marginTop: 8 }} placeholder="Phone number" keyboardType="phone-pad" value={customerPhone} onChangeText={(v) => setCustomerPhone(v.replace(/[^\d]/g, '').slice(0, 10))} />
              </View>
            )}

            {/* Added Items */}
            {entries.length > 0 && (
              <View style={{ marginTop: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase' }}>Added Items</Text>
                {entries.map((item, idx) => (
                  <Pressable key={idx} onPress={() => handleEditEntry(idx, item)} style={({pressed}) => ({ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center', backgroundColor: pressed ? '#F8FAFC' : 'transparent', borderRadius: 4 })}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{item.grade} - {item.gradeName} • {item.sacks} qty</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>{item.totalWeight}kg @ ₹{item.ratePerKg}/kg</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>₹{Math.round(item.gross)}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => handleEditEntry(idx, item)} style={{ padding: 6, backgroundColor: '#EFF6FF', borderRadius: 6 }}>
                          <Text style={{ fontSize: 16 }}>✏️</Text>
                        </Pressable>
                        <Pressable onPress={() => setEntries(entries.filter((_, i) => i !== idx))} style={{ padding: 6, backgroundColor: '#FEF2F2', borderRadius: 6 }}>
                          <Trash2 size={18} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Current Item / Add New Item */}
            <View style={{ marginTop: 24, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase' }}>{entries.length > 0 ? 'Add Another Item' : 'Item Details'}</Text>
              <EditableSlipRow label="Source" value={boughtFromAgent ? (sourceAgentName || 'Agent') : (selectedTruck?.truckNumber || 'Select Truck')} isEditing={editingField === 'source'} onToggle={() => setEditingField(editingField === 'source' ? null : 'source')} isError={!!errors.truck} />
              {editingField === 'source' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Bought from agent?</Text>
                    <Switch value={boughtFromAgent} onValueChange={(v) => { setBoughtFromAgent(v); setSelectedTruckId(null); setSelectedGrade(null); if (!v) { setSourceAgentName(''); setSourceAgentPhone(''); } }} />
                  </View>
                  {boughtFromAgent ? (
                    <View style={{ gap: 8 }}>
                      <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }} placeholder="Agent name *" value={sourceAgentName} onChangeText={setSourceAgentName} />
                      <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }} placeholder="Agent phone (optional)" value={sourceAgentPhone} onChangeText={setSourceAgentPhone} keyboardType="phone-pad" />
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {trucks.map(truck => (
                        <Pressable key={truck.id} onPress={() => { setSelectedTruckId(truck.id); setSelectedGrade(null); if (errors.truck) setErrors(p => ({...p, truck: ''})); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: truck.id === selectedTruckId ? '#00450D' : '#CBD5E1', backgroundColor: truck.id === selectedTruckId ? '#E8F5E9' : '#FFF' }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: truck.id === selectedTruckId ? '#00450D' : '#334155' }}>{truck.truckNumber}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <EditableSlipRow label="Fruit Grade" value={selectedGrade ? `${selectedGrade} - ${selectedTruck?.gradeInventory.find(g => g.code === selectedGrade)?.name ?? shop?.grades?.find(g => g.code === selectedGrade)?.name ?? selectedGrade}` : 'Select Grade'} isEditing={editingField === 'grade'} onToggle={() => setEditingField(editingField === 'grade' ? null : 'grade')} isError={!!errors.grade} />
              {editingField === 'grade' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(boughtFromAgent ? (shop?.grades || []) : (selectedTruck?.gradeInventory || [])).map((item: any) => (
                    <Pressable key={item.code} onPress={() => { setSelectedGrade(item.code); setEditingField('quantity'); if(errors.grade) setErrors(p => ({...p, grade: ''})); }} style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: item.code === selectedGrade ? '#00450D' : '#CBD5E1', backgroundColor: item.code === selectedGrade ? '#E8F5E9' : '#FFF' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: item.code === selectedGrade ? '#00450D' : '#334155' }}>{item.code} - {item.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <EditableSlipRow label="Quantity" value={sacks > 0 ? `${sacks} qty, ${Math.round(calc?.totalWeight || 0)}kg total` : ''} isEditing={editingField === 'quantity'} onToggle={() => setEditingField(editingField === 'quantity' ? null : 'quantity')} isError={!!errors.sacks} />
              {editingField === 'quantity' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4, fontWeight: '600' }}>Sacks</Text>
                      <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }} placeholder="Qty" keyboardType="number-pad" value={sacksText} onChangeText={(v) => { setSacksText(v); setSacks(parseInt(v.replace(/[^\d]/g, ''), 10) || 0); if(errors.sacks) setErrors(p => ({...p, sacks: ''})) }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4, fontWeight: '600' }}>Total Wt (kg)</Text>
                      <TextInput
                        style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827' }}
                        placeholder="Total Wt"
                        keyboardType="decimal-pad"
                        value={calc && calc.totalWeight > 0 ? String(calc.totalWeight) : ''}
                        onChangeText={(v) => {
                          const tw = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                          if (sacks > 0) {
                            setWeightPerSack(String(Math.round((tw / sacks) * 100) / 100));
                          } else {
                            setWeightPerSack('');
                          }
                          if (errors.weight) setErrors(p => ({...p, weight: ''}));
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', flex: 1 }}>Or enter Wt/Sack:</Text>
                    <TextInput
                      style={{ width: 120, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 8, fontSize: 14, color: '#111827' }}
                      placeholder="Wt/Sack"
                      keyboardType="decimal-pad"
                      value={weightPerSack}
                      onChangeText={(v) => { setWeightPerSack(v.replace(/[^0-9.]/g, '')); if(errors.weight) setErrors(p => ({...p, weight: ''})) }}
                    />
                  </View>
                </View>
              )}

              <EditableSlipRow label="Rate (per kg)" value={ratePerKg ? `₹${ratePerKg}` : ''} isEditing={editingField === 'rate'} onToggle={() => setEditingField(editingField === 'rate' ? null : 'rate')} isError={!!errors.rate} />
              {editingField === 'rate' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                  <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', fontWeight: '800' }} placeholder="Enter Rate (₹/kg)" keyboardType="decimal-pad" value={ratePerKg} onChangeText={(v) => { setRatePerKg(v.replace(/[^0-9.]/g, '')); if(errors.rate) setErrors(p => ({...p, rate: ''})); }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                    <Pressable onPress={handleAddEntry} style={{ backgroundColor: '#00450D', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Plus size={18} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>ADD ITEM</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Bill Settings (Payment, APMC, Bardana) */}
            <View style={{ marginTop: 24 }}>
              <EditableSlipRow label="Payment Mode" value={paymentMode} isEditing={editingField === 'payment'} onToggle={() => setEditingField(editingField === 'payment' ? null : 'payment')} />
              {editingField === 'payment' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                  <PaymentSelector selected={paymentMode} onSelect={setPaymentMode} upiRef={upiRef} onUpiRefChange={setUpiRef} />
                </View>
              )}

              <EditableSlipRow label="APMC" value={applyApmc ? 'Applied' : 'Not Applied'} isEditing={editingField === 'apmc'} onToggle={() => setEditingField(editingField === 'apmc' ? null : 'apmc')} />
              {editingField === 'apmc' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700' }}>Apply APMC Charges</Text>
                  <Switch value={applyApmc} onValueChange={setApplyApmc} />
                </View>
              )}

              <EditableSlipRow label="Bardana" value={applyBardana ? 'Applied' : 'Not Applied'} isEditing={editingField === 'bardana'} onToggle={() => setEditingField(editingField === 'bardana' ? null : 'bardana')} />
              {editingField === 'bardana' && (
                <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, color: '#111827', fontWeight: '700' }}>Apply Bardana Charges</Text>
                  <Switch value={applyBardana} onValueChange={setApplyBardana} />
                </View>
              )}

              {(entries.reduce((s, e) => s + e.netAmount, 0) + (calc?.net ?? 0)) > 0 && (
                <>
                  <EditableSlipRow label="Final Total" value={manualTotal ? `₹${manualTotal}` : `₹${Math.round(entries.reduce((s, e) => s + e.netAmount, 0) + (calc?.net ?? 0))}`} isEditing={editingField === 'total'} onToggle={() => setEditingField(editingField === 'total' ? null : 'total')} />
                  {editingField === 'total' && (
                    <View style={{ padding: Spacing.sm, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>Calculated Total: ₹{Math.round(entries.reduce((s, e) => s + e.netAmount, 0) + (calc?.net ?? 0))}</Text>
                      <TextInput style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', padding: 10, fontSize: 16, color: '#111827', fontWeight: '800' }} placeholder="Override total amount (optional)" keyboardType="decimal-pad" value={manualTotal} onChangeText={(v) => setManualTotal(v.replace(/[^0-9.]/g, ''))} />
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Action buttons */}
            <View style={{ marginTop: 24, gap: Spacing.sm }}>
              {errors.save ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, textAlign: 'center' }}>{errors.save}</Text> : null}
              <Pressable testID="save-bill-button" onPress={handleSave} disabled={saveMutation.isPending} style={{ padding: 16, borderWidth: 2, borderColor: '#111827', backgroundColor: saveMutation.isPending ? '#CBD5E1' : '#FBBF24', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827' }}>{saveMutation.isPending ? 'PROCESSING...' : 'SAVE BILL'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
      )}
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
                          setSelectedTruckId(item.id);
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
              position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
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
              zIndex: 9999,
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
