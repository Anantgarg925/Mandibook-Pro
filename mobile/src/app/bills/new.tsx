import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, Minus, Plus } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import { useBuyers } from '@/hooks/useBuyers';
import GradeSelector from '@/components/bills/GradeSelector';
import PaymentSelector from '@/components/bills/PaymentSelector';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianCurrency, toIndianNumber, toIndianWeight } from '@/lib/formatters';
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

  const [slipNumber, setSlipNumber] = useState<number | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [truckPickerVisible, setTruckPickerVisible] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [buyerSuggestions, setBuyerSuggestions] = useState<Buyer[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [sacks, setSacks] = useState(0);
  const [weightPerSack, setWeightPerSack] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [upiRef, setUpiRef] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedSlip, setSavedSlip] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const successY = useSharedValue(400);
  const calcOpacity = useSharedValue(0);

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

  const selectBuyer = (b: Buyer) => {
    setCustomerName(b.name);
    setCustomerPhone(b.phone);
    setBuyerSuggestions([]);
  };

  const gradeInfo = selectedTruck?.gradeInventory.find((g) => g.code === selectedGrade);
  const available = gradeInfo
    ? Math.max(0, gradeInfo.totalKg - gradeInfo.confirmedKg - gradeInfo.provisionalKg)
    : 0;
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
        })
      : null;

  const calcStyle = useAnimatedStyle(() => ({ opacity: calcOpacity.value }));
  const successStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: successY.value }],
  }));

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      inquiry: object;
      truckUpdate: { id: string; gradeInventory: object[] };
      buyerUpsert?: { name: string; phone: string } | null;
    }) => {
      // 1. Create inquiry
      const inquiry = await api.post('/api/inquiries', payload.inquiry);

      // 2. Update truck inventory (best-effort)
      try {
        await api.put(`/api/trucks/${payload.truckUpdate.id}`, {
          shopId: shop!.shopId,
          gradeInventory: payload.truckUpdate.gradeInventory,
        });
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
            await api.post('/api/buyers', {
              shopId: shop!.shopId,
              name: payload.buyerUpsert.name,
              phone: payload.buyerUpsert.phone,
              lastTransactionDate: Date.now(),
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
    if (!selectedTruck) e.truck = 'गाड़ी चुनें';
    if (!customerName.trim()) e.customer = 'ग्राहक का नाम डालें';
    if (!selectedGrade) e.grade = 'ग्रेड चुनें';
    if (sacks <= 0) e.sacks = 'बोरों की संख्या डालें';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !shop?.shopId || !selectedTruck || !selectedGrade || saveMutation.isPending) return;

    const slip = slipNumber ?? 1001;
    const gradeInfo2 = selectedTruck.gradeInventory.find((g) => g.code === selectedGrade);
    const gradeName = gradeInfo2?.name ?? selectedGrade;
    const result = calc ?? calculateCharges({ sacks, weightPerSack: wps, ratePerKg: 0, charges: { apmcPct: 0, bardanaPerSack: 0, cartagePerKg: 0 } });

    const newInventory = selectedTruck.gradeInventory.map((g) =>
      g.code === selectedGrade
        ? { ...g, provisionalKg: g.provisionalKg + result.totalWeight }
        : g
    );

    await saveMutation.mutateAsync({
      inquiry: {
        shopId: shop.shopId,
        slipNumber: slip,
        truckId: selectedTruck.id,
        truckNumber: selectedTruck.truckNumber,
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
        netAmount: result.net,
        paymentMode,
        upiRef: upiRef.trim(),
        status: 'PENDING',
        date: Date.now(),
        createdAt: Date.now(),
      },
      truckUpdate: {
        id: selectedTruck.id,
        gradeInventory: newInventory,
      },
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
    setWeightPerSack('');
    setRatePerKg('');
    setCustomerName('');
    setCustomerPhone('');
    setUpiRef('');
    setPaymentMode('CASH');
    setErrors({});
    setSuccess(false);
    saveMutation.reset();
    successY.value = 400;
    if (shop?.shopId) {
      const next = await getNextSlipNumber(shop.shopId);
      setSlipNumber(next);
    }
  };

  const formComplete = !!(selectedTruck && customerName.trim() && selectedGrade && sacks > 0);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* SECTION 2: Customer */}
          <SectionHeader title="ग्राहक / Customer" />
          <View style={{ position: 'relative', zIndex: 10 }}>
            <TextInput
              testID="customer-name-input"
              style={{ ...inputStyle, marginBottom: buyerSuggestions.length > 0 ? 0 : Spacing.sm }}
              placeholder="Customer name"
              placeholderTextColor={Colors.textSecond}
              value={customerName}
              onChangeText={handleCustomerNameChange}
            />
            {buyerSuggestions.length > 0 ? (
              <View
                style={{
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderTopWidth: 0,
                  borderBottomLeftRadius: Radius.sm,
                  borderBottomRightRadius: Radius.sm,
                  marginBottom: Spacing.sm,
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
            placeholder="Phone number"
            placeholderTextColor={Colors.textSecond}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
          {errors.customer ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.customer}</Text> : null}

          {/* SECTION 3: Grade & Quantity */}
          <SectionHeader title="ग्रेड और मात्रा / Grade & Quantity" />
          {selectedTruck ? (
            <GradeSelector
              grades={shop?.grades ?? []}
              selectedGrade={selectedGrade}
              onSelect={setSelectedGrade}
              truckInventory={selectedTruck.gradeInventory}
            />
          ) : (
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.sm }}>
              पहले गाड़ी चुनें
            </Text>
          )}
          {errors.grade ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.grade}</Text> : null}

          {selectedGrade ? (
            <>
              {/* Sacks counter */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: Spacing.md,
                  backgroundColor: Colors.surface,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: Spacing.sm,
                }}
              >
                <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>बोरे / Sacks</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <Pressable
                    testID="sacks-minus"
                    onPress={() => setSacks((s) => Math.max(0, s - 1))}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Minus size={18} color={Colors.primary} strokeWidth={2.5} />
                  </Pressable>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.text, minWidth: 36, textAlign: 'center' }}>
                    {sacks}
                  </Text>
                  <Pressable
                    testID="sacks-plus"
                    onPress={() => setSacks((s) => s + 1)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      borderWidth: 2,
                      borderColor: Colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
                  </Pressable>
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
                        उपलब्ध ({selectedGrade}): {toIndianWeight(available)} ✅
                      </Text>
                    ) : (
                      <Text style={{ fontSize: FontSize.xs, color: Colors.danger }}>
                        ⚠ स्टॉक कम है! Only {toIndianWeight(available)} available
                      </Text>
                    )
                  ) : null}
                </View>
              </Animated.View>
            </>
          ) : null}
          {errors.sacks ? <Text style={{ color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>{errors.sacks}</Text> : null}

          {/* SECTION 4: Rate */}
          <SectionHeader title="रेट / Rate (optional)" />
          <TextInput
            testID="rate-per-kg-input"
            style={inputStyle}
            placeholder="₹ per kg"
            placeholderTextColor={Colors.textSecond}
            value={ratePerKg}
            onChangeText={setRatePerKg}
            keyboardType="decimal-pad"
          />

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
              <CalcRow label="APMC" value={`−${toIndianCurrency(calc.apmc)}`} color={Colors.danger} />
              <CalcRow label="Bardana" value={`−${toIndianCurrency(calc.bardana)}`} color={Colors.danger} />
              {calc.cartage > 0 ? <CalcRow label="Cartage" value={`−${toIndianCurrency(calc.cartage)}`} color={Colors.danger} /> : null}
              <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs }} />
              <CalcRow label="Net" value={toIndianCurrency(calc.net)} bold />
            </View>
          ) : null}

          {/* Payment mode */}
          <SectionHeader title="भुगतान / Payment" />
          <PaymentSelector
            selected={paymentMode}
            onSelect={setPaymentMode}
            upiRef={upiRef}
            onUpiRefChange={setUpiRef}
          />
        </ScrollView>

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
        onRequestClose={() => setTruckPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setTruckPickerVisible(false)}
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
              गाड़ी चुनें / Select Truck
            </Text>
            <FlatList
              data={trucks}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => {
                const totalAvail = item.gradeInventory.reduce(
                  (s, g) => s + Math.max(0, g.totalKg - g.confirmedKg - g.provisionalKg),
                  0
                );
                return (
                  <Pressable
                    testID={`truck-option-${item.id}`}
                    onPress={() => {
                      setSelectedTruck(item);
                      setSelectedGrade(null);
                      setTruckPickerVisible(false);
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
                  No trucks today
                </Text>
              }
            />
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
              onPress={() => router.replace('/(tabs)')}
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
