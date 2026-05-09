import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianNumber } from '@/lib/formatters';
import type { GradeInventory } from '@/types/truck';

// ─── field input style ───────────────────────────────────────────────────────
const inputStyle = {
  height: 56,
  borderWidth: 1,
  borderColor: '#c0c9bb',
  borderRadius: 10,
  paddingHorizontal: 14,
  fontSize: 16,
  color: '#00450d',
  fontWeight: '700' as const,
  backgroundColor: '#fff',
};

// ─── two-column field wrapper ────────────────────────────────────────────────
function GridField({
  label,
  labelHi,
  children,
}: {
  label: string;
  labelHi: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ width: '47%' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>{label}</Text>
        <Text style={{ fontSize: 10, color: '#94A3B8', marginLeft: 4 }}>{labelHi}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── bottom action bar ───────────────────────────────────────────────────────
function BottomBar({
  totalEntered,
  totalKgNum,
  diff,
  formComplete,
  isPending,
  onSubmit,
}: {
  totalEntered: number;
  totalKgNum: number;
  diff: number;
  formComplete: boolean;
  isPending: boolean;
  onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        padding: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Row 1: live breakdown */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 10,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 2,
            }}
          >
            Live Breakdown
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
            Total Entered: {toIndianNumber(totalEntered)} kg / Truck: {toIndianNumber(totalKgNum)} kg
          </Text>
        </View>

        {diff > 0 && totalKgNum > 0 ? (
          <View
            style={{
              backgroundColor: '#FFF3E0',
              borderRadius: 8,
              padding: 8,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7e5700' }}>
              ⚠ {toIndianNumber(diff)} kg Mismatch
            </Text>
          </View>
        ) : null}
      </View>

      {/* Row 2: submit button */}
      <Pressable
        testID="submit-truck-button"
        onPress={onSubmit}
        disabled={!formComplete || isPending}
        style={{
          height: 56,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            formComplete && !isPending ? '#00450d' : 'transparent',
          borderWidth: formComplete && !isPending ? 0 : 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>
          {isPending ? 'Registering…' : 'Register Truck'}
        </Text>
        <Text style={{ fontSize: 10, color: '#fff', opacity: 0.85 }}>
          {isPending ? 'रजिस्टर हो रही है…' : 'गाड़ी रजिस्टर करें'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function RegisterTruckScreen() {
  const router = useRouter();
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const [truckNumber, setTruckNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderCode, setSenderCode] = useState('');
  const [chlNumber, setChlNumber] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [freightAmount, setFreightAmount] = useState('');
  const [gradeWeights, setGradeWeights] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const grades = shop?.grades ?? [];
  const totalEntered = grades.reduce(
    (s, g) => s + (parseFloat(gradeWeights[g.code] ?? '0') || 0),
    0
  );
  const totalKgNum = parseFloat(totalKg) || 0;
  const diff = Math.abs(totalKgNum - totalEntered);
  const formComplete = truckNumber.trim() !== '' && senderName.trim() !== '' && totalKgNum > 0;

  const mutation = useMutation({
    mutationFn: (payload: object) => api.post('/api/trucks', payload),
    onSuccess: () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      setSuccess(true);
    },
  });

  const handleSubmit = async () => {
    if (!shop?.shopId || !formComplete || mutation.isPending) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const gradeInventory: GradeInventory[] = grades.map((g) => ({
      code: g.code,
      name: g.name,
      totalKg: parseFloat(gradeWeights[g.code] ?? '0') || 0,
      confirmedKg: 0,
      provisionalKg: 0,
    }));

    mutation.mutate({
      shopId: shop.shopId,
      truckNumber: truckNumber.toUpperCase(),
      senderName,
      senderCode,
      chlNumber,
      totalKg: totalKgNum,
      freightAmount: parseFloat(freightAmount) || 0,
      gradeInventory,
      status: 'ACTIVE',
      date: startOfToday.getTime(),
      createdAt: Date.now(),
    });
  };

  const resetForm = () => {
    setTruckNumber('');
    setSenderName('');
    setSenderCode('');
    setChlNumber('');
    setTotalKg('');
    setFreightAmount('');
    setGradeWeights({});
    setSuccess(false);
    mutation.reset();
  };

  // ── success screen (unchanged) ──────────────────────────────────────────────
  if (success) {
    return (
      <View
        testID="register-success"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.success,
          padding: Spacing.xl,
        }}
      >
        <Text style={{ fontSize: 64, marginBottom: Spacing.md }}>✅</Text>
        <Text
          style={{
            fontSize: FontSize.xl,
            fontWeight: '800',
            color: '#FFF',
            marginBottom: Spacing.xs,
          }}
        >
          गाड़ी रजिस्टर हो गई!
        </Text>
        <Text
          style={{
            fontSize: FontSize.xxl,
            fontWeight: '900',
            color: '#FFF',
            letterSpacing: 2,
            marginBottom: Spacing.xl,
          }}
        >
          {truckNumber.toUpperCase()}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
          <Pressable
            testID="add-another-truck"
            onPress={resetForm}
            style={{
              flex: 1,
              height: 56,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: FontSize.md, fontWeight: '700' }}>+ और गाड़ी</Text>
          </Pressable>
          <Pressable
            testID="go-home-after-register"
            onPress={() => router.replace('/(tabs)/trucks')}
            style={{
              flex: 1,
              height: 56,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFF',
            }}
          >
            <Text style={{ color: Colors.success, fontSize: FontSize.md, fontWeight: '700' }}>
              🏠 Home
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── registration form ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4F0' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        }}
      >
        <Pressable testID="back-from-register" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#1a3c20" />
        </Pressable>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#1a3c20' }}>
          Register New Truck / नई गाड़ी
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Truck Details card ─────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 16,
              margin: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Truck Number */}
              <GridField label="Truck Number" labelHi="गाड़ी नंबर">
                <TextInput
                  testID="truck-number-input"
                  style={inputStyle}
                  placeholder="e.g. RJ 14 GB 5500"
                  placeholderTextColor="#c0c9bb"
                  value={truckNumber}
                  onChangeText={(v) => setTruckNumber(v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </GridField>

              {/* Consignment No */}
              <GridField label="Consignment No" labelHi="बिल्टी नंबर">
                <TextInput
                  testID="chl-input"
                  style={inputStyle}
                  placeholder="CR-8892"
                  placeholderTextColor="#c0c9bb"
                  value={chlNumber}
                  onChangeText={setChlNumber}
                />
              </GridField>

              {/* Sender Name */}
              <GridField label="Sender Name" labelHi="भेजने वाले का नाम">
                <TextInput
                  testID="sender-name-input"
                  style={inputStyle}
                  placeholder="Kishan Lal & Sons"
                  placeholderTextColor="#c0c9bb"
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </GridField>

              {/* Short Code */}
              <GridField label="Short Code" labelHi="शॉर्ट कोड">
                <TextInput
                  testID="sender-code-input"
                  style={inputStyle}
                  placeholder="KL-JP"
                  placeholderTextColor="#c0c9bb"
                  value={senderCode}
                  onChangeText={(v) => setSenderCode(v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </GridField>

              {/* Total Weight */}
              <GridField label="Total Weight (kg)" labelHi="कुल वजन (kg)">
                <TextInput
                  testID="total-kg-input"
                  style={inputStyle}
                  placeholder="23327"
                  placeholderTextColor="#c0c9bb"
                  value={totalKg}
                  onChangeText={setTotalKg}
                  keyboardType="numeric"
                />
              </GridField>

              {/* Freight */}
              <GridField label="Freight (₹)" labelHi="भाड़ा (₹)">
                <TextInput
                  testID="freight-input"
                  style={inputStyle}
                  placeholder="0.00"
                  placeholderTextColor="#c0c9bb"
                  value={freightAmount}
                  onChangeText={setFreightAmount}
                  keyboardType="numeric"
                />
              </GridField>
            </View>
          </View>

          {/* ── Inventory section header ───────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#00450d' }}>
              Inventory Breakdown / माल का विवरण
            </Text>
            <View
              style={{
                backgroundColor: '#dbf1fe',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#003d65' }}>
                {grades.length} Grades
              </Text>
            </View>
          </View>

          {/* ── Grade Grid ────────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              paddingHorizontal: 16,
            }}
          >
            {grades.map((grade) => (
              <View
                key={grade.code}
                style={{
                  width: '47%',
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 12,
                  padding: 14,
                  elevation: 1,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
                  {grade.name}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {grade.code}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <TextInput
                    testID={`grade-weight-${grade.code}`}
                    style={{
                      flex: 1,
                      height: 48,
                      borderBottomWidth: 1,
                      borderBottomColor: '#c0c9bb',
                      textAlign: 'right',
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#00450d',
                      backgroundColor: 'transparent',
                    }}
                    placeholder="0"
                    placeholderTextColor="#c0c9bb"
                    keyboardType="numeric"
                    value={gradeWeights[grade.code] ?? ''}
                    onChangeText={(v) =>
                      setGradeWeights((prev) => ({ ...prev, [grade.code]: v }))
                    }
                  />
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>kg</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── Fixed bottom action bar ────────────────────────────────────── */}
        <BottomBar
          totalEntered={totalEntered}
          totalKgNum={totalKgNum}
          diff={diff}
          formComplete={formComplete}
          isPending={mutation.isPending}
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
