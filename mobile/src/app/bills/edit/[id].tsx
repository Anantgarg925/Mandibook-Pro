import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Switch, Modal,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, mapInquiry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { useDateTrucks } from '@/hooks/useDateTrucks';
import { calculateCharges } from '@/utils/calculations';
import PaymentSelector from '@/components/bills/PaymentSelector';
import GradeSelector from '@/components/bills/GradeSelector';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianWeight } from '@/lib/formatters';
import { adjustLedgerForBillEdit } from '@/utils/ledgerSync';

const inputStyle = {
  height: 52,
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

export default function EditBillScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shop } = useShop();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: inquiry, isLoading } = useQuery({
    queryKey: ['inquiry', shop?.shopId, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', id)
        .eq('shop_id', shop!.shopId)
        .single();
      if (error) throw new Error(error.message);
      return mapInquiry(data as Record<string, unknown>);
    },
    enabled: !!shop?.shopId && !!id,
  });

  
  // Form state
  const [boughtFromAgent, setBoughtFromAgent] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [sourceAgentName, setSourceAgentName] = useState('');
  const [sourceAgentPhone, setSourceAgentPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [upiRef, setUpiRef] = useState('');
  const [applyApmc, setApplyApmc] = useState(true);
  const [applyBardana, setApplyBardana] = useState(true);
  const [manualTotal, setManualTotal] = useState('');
  const [truckPickerVisible, setTruckPickerVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [grade, setGrade] = useState<string | null>(null);
  const [sacks, setSacks] = useState('');
  const [weightPerSack, setWeightPerSack] = useState('');
  const [rate, setRate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  // Refs for focus
  const customerPhoneRef = useRef<TextInput>(null);
  const sacksRef = useRef<TextInput>(null);
  const weightRef = useRef<TextInput>(null);
  const rateRef = useRef<TextInput>(null);
  const scrollRef = useRef<any>(null);
  const sectionY = useRef<Record<string, number>>({});

  const rememberSection = (key: string) => (event: any) => {
    sectionY.current[key] = event.nativeEvent.layout.y;
  };

  const scrollToSection = (key: string) => {
    const y = sectionY.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  // Get trucks for grade data
  const billDate = inquiry ? new Date(inquiry.date) : new Date();
  const { trucks } = useDateTrucks(billDate);

  // Pre-populate once
  useEffect(() => {
    if (inquiry && !initialized) {
      
      setCustomerName(inquiry.customerName);
      setCustomerPhone(inquiry.customerPhone);
      setGrade(inquiry.grade);
      setSacks(String(inquiry.sacks));
      setWeightPerSack(String(inquiry.weightPerSack));
      setRate(inquiry.ratePerKg > 0 ? String(inquiry.ratePerKg) : '');

      setBoughtFromAgent(!inquiry.truckId);
      setSelectedTruckId(inquiry.truckId);
      setSourceAgentName(inquiry.truckId ? '' : (inquiry.sourceAgentName || ''));
      setSourceAgentPhone(inquiry.truckId ? '' : (inquiry.sourceAgentPhone || ''));
      setPaymentMode((inquiry.paymentMode as PaymentMode) ?? 'CASH');
      setUpiRef(inquiry.upiRef ?? '');
      setApplyApmc(inquiry.applyApmc ?? true);
      setApplyBardana(inquiry.applyBardana ?? false);
      
      const calcNet = inquiry.grossAmount + inquiry.apmcAmount + inquiry.bardanaAmount + inquiry.cartageAmount;
      if (Math.abs(inquiry.netAmount - calcNet) > 0.1) {
        setManualTotal(String(inquiry.netAmount));
      }

      setInitialized(true);
    }
  }, [inquiry, initialized]);

  // Calculations
  const sacksNum = parseInt(sacks, 10) || 0;
  const weightPerSackNum = parseFloat(weightPerSack) || 0;
  const rateNum = parseFloat(rate) || 0;
  const totalWeight = sacksNum * weightPerSackNum;

  const selectedTruck = trucks.find(t => t.id === selectedTruckId) ?? null;
  const gradeOptions = selectedTruck?.gradeInventory.length
    ? selectedTruck.gradeInventory
    : (shop?.grades ?? []).map(g => ({
        code: g.code,
        name: g.name,
        totalKg: 0,
        confirmedKg: 0,
        provisionalKg: 0,
      }));
  const selectedGrade = gradeOptions.find(g => g.code === grade);
  const gradeName = selectedGrade?.name ?? inquiry?.gradeName ?? grade ?? '';

  const calc = sacksNum > 0 && weightPerSackNum > 0 && shop?.charges
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
        bardanaSacks: inquiry?.bardanaSacks ?? sacksNum,
        bardanaRate: inquiry?.bardanaRate ?? shop.charges.bardanaPerSack ?? 0,
      })
    : null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!grade) e.grade = 'ग्रेड चुनें / Select grade';
    if (sacksNum <= 0) e.sacks = 'बोरे डालें / Enter sacks';
    if (weightPerSackNum <= 0) e.weight = 'वजन डालें / Enter weight';
    if (!rate.trim() || rateNum <= 0) e.rate = 'रेट डालें / Enter rate';
    setErrors(e);
    return e;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId || !calc || !inquiry) throw new Error('Missing data');

      const newNetAmount = manualTotal ? (parseFloat(manualTotal) || calc.net) : calc.net;

      const nextInquiryUpdate = {
        truck_id: boughtFromAgent ? null : selectedTruckId,
        truck_number: boughtFromAgent ? 'Agent Stock' : (selectedTruck?.truckNumber ?? inquiry.truckNumber),
        source_agent_name: boughtFromAgent ? sourceAgentName.trim() : '',
        source_agent_phone: boughtFromAgent ? sourceAgentPhone.trim() : '',
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
        net_amount: newNetAmount,
        payment_mode: paymentMode,
        upi_ref: upiRef,
        apply_apmc: applyApmc,
        apply_bardana: applyBardana,
        charge_snapshot: inquiry.chargeSnapshot,
      };

      const { error } = await supabase.from('inquiries').update(nextInquiryUpdate).eq('id', inquiry.id);
      if (error) throw new Error(error.message);

      try {
        await adjustLedgerForBillEdit(
          shop.shopId,
          inquiry.slipNumber,
          inquiry.status,
          inquiry.paymentMode,
          inquiry.netAmount,
          inquiry.customerName,
          inquiry.customerPhone,
          inquiry.status,
          paymentMode,
          newNetAmount,
          customerName,
          customerPhone
        );
      } catch (ledgerError) {
        const { error: revertError } = await supabase.from('inquiries').update({
          truck_id: inquiry.truckId,
          truck_number: inquiry.truckNumber,
          source_agent_name: inquiry.sourceAgentName ?? '',
          source_agent_phone: inquiry.sourceAgentPhone ?? '',
          customer_name: inquiry.customerName,
          customer_phone: inquiry.customerPhone,
          grade: inquiry.grade,
          grade_name: inquiry.gradeName,
          sacks: inquiry.sacks,
          weight_per_sack: inquiry.weightPerSack,
          total_weight: inquiry.totalWeight,
          rate_per_kg: inquiry.ratePerKg,
          gross_amount: inquiry.grossAmount,
          apmc_amount: inquiry.apmcAmount,
          bardana_amount: inquiry.bardanaAmount,
          cartage_amount: inquiry.cartageAmount,
          net_amount: inquiry.netAmount,
          payment_mode: inquiry.paymentMode,
          upi_ref: inquiry.upiRef,
          apply_apmc: inquiry.applyApmc,
          apply_bardana: inquiry.applyBardana,
          charge_snapshot: inquiry.chargeSnapshot,
        }).eq('id', inquiry.id);
        if (revertError) {
          throw new Error(`${(ledgerError as Error).message}; rollback failed: ${revertError.message}`);
        }
        throw ledgerError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['inquiry', shop?.shopId, id] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId] });
      Alert.alert(
        'Bill Updated ✅',
        'बिल अपडेट हो गया',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Could not save. Try again.');
    },
  });

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) return;
    saveMutation.mutate();
  };

  if (isLoading || !inquiry) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff', alignItems: 'center', justifyContent: 'center' }} edges={['top', 'bottom']}>
          <ActivityIndicator color={Colors.primary} size="large" />
        
      {/* Truck Picker Modal */}
      <Modal
        visible={truckPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTruckPickerVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            onPress={() => setTruckPickerVisible(false)}
          >
            <View
              style={{
                backgroundColor: Colors.surface,
                borderTopLeftRadius: Radius.lg,
                borderTopRightRadius: Radius.lg,
                maxHeight: '80%',
              }}
              onStartShouldSetResponder={() => true}
            >
              <View style={{ padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md }}>
                  गाड़ी चुनें / Select Truck
                </Text>
              </View>
              <View style={{ maxHeight: 400 }}>
                {trucks.map(truck => (
                  <Pressable
                    key={truck.id}
                    onPress={() => {
                      setSelectedTruckId(truck.id);
                      setGrade(null);
                      setTruckPickerVisible(false);
                    }}
                    style={{
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: Colors.border,
                    }}
                  >
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text }}>
                      {truck.truckNumber}
                    </Text>
                    <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                      {truck.senderName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>

      </>
    );
  }

  if (inquiry.status !== 'PENDING' && inquiry.status !== 'CONFIRMED') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.primary }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: '#FFFFFF' }}>
              Cannot Edit
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
            <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>🔒</Text>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, textAlign: 'center' }}>
              This bill has been authorized
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, textAlign: 'center', marginTop: 4 }}>
              अधिकृत बिल में बदलाव नहीं किया जा सकता
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            backgroundColor: Colors.primary,
          }}
        >
          <Pressable testID="back-from-edit" onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: '#FFFFFF' }}>
              Edit Bill / बिल संपादित करें
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
              Slip #{inquiry.slipNumber} • {inquiry.truckNumber}
            </Text>
          </View>
        </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
                setGrade(null);
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
              style={[inputStyle, { justifyContent: 'center', marginBottom: Spacing.sm }]}
            >
              <Text style={{ color: selectedTruckId ? Colors.text : Colors.textSecond, fontSize: FontSize.md }}>
                {trucks.find(t => t.id === selectedTruckId)?.truckNumber || (selectedTruckId === inquiry?.truckId ? inquiry?.truckNumber : 'Select Truck / गाड़ी चुनें')}
              </Text>
            </Pressable>
          )}

          {/* Customer Section */}

          <View onLayout={rememberSection('customer')}>
            <SectionHeader title="ग्राहक / Customer (Optional)" />
          </View>
          <TextInput
            testID="edit-customer-name"
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Customer name / ग्राहक का नाम"
            placeholderTextColor={Colors.textSecond}
            returnKeyType="next"
            onSubmitEditing={() => customerPhoneRef.current?.focus()}
            style={[inputStyle, { marginBottom: Spacing.sm }]}
          />
          <TextInput
            testID="edit-customer-phone"
            ref={customerPhoneRef}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="Phone / फ़ोन (Optional)"
            placeholderTextColor={Colors.textSecond}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => sacksRef.current?.focus()}
            style={inputStyle}
          />

          {/* Grade Section */}
          <View onLayout={rememberSection('grade')}>
            <SectionHeader title="ग्रेड चुनें / Select Grade" />
          </View>
          {errors.grade ? (
            <Text style={{ fontSize: FontSize.xs, color: Colors.danger, marginBottom: 6 }}>
              {errors.grade}
            </Text>
          ) : null}
          <GradeSelector
            grades={(shop?.grades ?? [])}
            selectedGrade={grade}
            truckInventory={selectedTruck?.gradeInventory ?? []}
            onSelect={(g) => {
              setGrade(g);
              scrollToSection('quantity');
              setTimeout(() => sacksRef.current?.focus(), 120);
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
                ref={sacksRef}
                value={sacks}
                onChangeText={(v) => { setSacks(v); if (errors.sacks) setErrors(prev => { const { sacks: _, ...rest } = prev; return rest; }); }}
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => weightRef.current?.focus()}
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
                ref={weightRef}
                value={weightPerSack}
                onChangeText={(v) => { setWeightPerSack(v); if (errors.weight) setErrors(prev => { const { weight: _, ...rest } = prev; return rest; }); }}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onSubmitEditing={() => {
                  scrollToSection('rate');
                  rateRef.current?.focus();
                }}
                style={[inputStyle, errors.weight ? { borderColor: Colors.danger } : {}]}
              />
              {errors.weight ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>{errors.weight}</Text> : null}
            </View>
          </View>

          {/* Total Weight Display */}
          {totalWeight > 0 ? (
            <View style={{ marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: '#E8F5E9', borderRadius: Radius.sm }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, textAlign: 'center' }}>
                Total Weight: {toIndianWeight(totalWeight)}
              </Text>
            </View>
          ) : null}

          {/* Rate Section */}
          <View onLayout={rememberSection('rate')}>
            <SectionHeader title="रेट / Rate" />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginBottom: 4 }}>
                ₹ / kg
              </Text>
              <TextInput
                testID="edit-rate"
                ref={rateRef}
                value={rate}
                onChangeText={(v) => { setRate(v); if (errors.rate) setErrors(prev => { const { rate: _, ...rest } = prev; return rest; }); }}
                keyboardType="decimal-pad"
                style={[inputStyle, errors.rate ? { borderColor: Colors.danger } : {}]}
              />
              {errors.rate ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 2 }}>{errors.rate}</Text> : null}
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

          {calc ? (
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
              <CalcRow label="Total Weight" value={toIndianWeight(calc.totalWeight)} />
              <CalcRow label="Gross Amount" value={toIndianCurrency(calc.gross)} />
              {calc.apmc > 0 ? <CalcRow label="APMC" value={`+${toIndianCurrency(calc.apmc)}`} color={Colors.text} /> : null}
              {calc.bardana > 0 ? <CalcRow label="Bardana" value={`+${toIndianCurrency(calc.bardana)}`} color={Colors.text} /> : null}
              {calc.cartage > 0 ? <CalcRow label="Cartage" value={`+${toIndianCurrency(calc.cartage)}`} color={Colors.text} /> : null}
              <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs }} />
              
              <CalcRow label="Calculated Net Amount" value={toIndianCurrency(calc.net)} bold />
              
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

          ) : null}
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
          <Pressable
            testID="save-edit-button"
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
                backgroundColor: saveMutation.isPending ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
              }}>
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: '#FFFFFF' }}>
                      Save Changes / बदलाव सेव करें
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </>
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

import type { PaymentMode } from '@/types/inquiry';
