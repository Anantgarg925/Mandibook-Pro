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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Truck } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianNumber } from '@/lib/formatters';
import type { GradeInventory } from '@/types/truck';

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

function SectionLabel({ text }: { text: string }) {
  return (
    <Text
      style={{
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.textSecond,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
        marginTop: Spacing.lg,
      }}
    >
      {text}
    </Text>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

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
  const totalEntered = grades.reduce((s, g) => s + (parseFloat(gradeWeights[g.code] ?? '0') || 0), 0);
  const totalKgNum = parseFloat(totalKg) || 0;
  const diff = Math.abs(totalKgNum - totalEntered);
  const formComplete = truckNumber.trim() && senderName.trim() && totalKgNum > 0;

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
        <Pressable testID="back-from-register" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
            नई गाड़ी
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>Register Truck</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel text="Truck Details / गाड़ी की जानकारी" />

          <Field label="Truck Number *">
            <TextInput
              testID="truck-number-input"
              style={inputStyle}
              placeholder="MH 12 AB 3456"
              placeholderTextColor={Colors.border}
              value={truckNumber}
              onChangeText={(v) => setTruckNumber(v.toUpperCase())}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Sender Name / भेजने वाले का नाम *">
            <TextInput
              testID="sender-name-input"
              style={inputStyle}
              placeholder="Ranjit Singh"
              placeholderTextColor={Colors.border}
              value={senderName}
              onChangeText={setSenderName}
            />
          </Field>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Sender Code">
                <TextInput
                  testID="sender-code-input"
                  style={inputStyle}
                  placeholder="SDFC"
                  placeholderTextColor={Colors.border}
                  value={senderCode}
                  onChangeText={(v) => setSenderCode(v.toUpperCase())}
                  autoCapitalize="characters"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="CHL / Consignment No.">
                <TextInput
                  testID="chl-input"
                  style={inputStyle}
                  placeholder="CHL-2024-001"
                  placeholderTextColor={Colors.border}
                  value={chlNumber}
                  onChangeText={setChlNumber}
                />
              </Field>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Total Weight kg *">
                <TextInput
                  testID="total-kg-input"
                  style={inputStyle}
                  placeholder="23327"
                  placeholderTextColor={Colors.border}
                  value={totalKg}
                  onChangeText={setTotalKg}
                  keyboardType="numeric"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Freight Amount ₹">
                <TextInput
                  testID="freight-input"
                  style={inputStyle}
                  placeholder="0"
                  placeholderTextColor={Colors.border}
                  value={freightAmount}
                  onChangeText={setFreightAmount}
                  keyboardType="numeric"
                />
              </Field>
            </View>
          </View>

          <SectionLabel text="ग्रेड अनुमान / Grade Estimate (Optional)" />
          <Text style={{ fontSize: 12, color: Colors.textSecond, marginBottom: Spacing.sm, marginTop: -8 }}>
            अभी छोड़ सकते हैं — बाद में ट्रक डिटेल से अपडेट करें
          </Text>

          {grades.map((grade) => (
            <View
              key={grade.code}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                  {grade.code}
                </Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{grade.name}</Text>
              </View>
              <TextInput
                testID={`grade-weight-${grade.code}`}
                style={{
                  width: 100,
                  height: 44,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: Radius.sm,
                  paddingHorizontal: Spacing.sm,
                  fontSize: FontSize.md,
                  color: Colors.text,
                  textAlign: 'right',
                  backgroundColor: Colors.surface,
                }}
                placeholder="0"
                placeholderTextColor={Colors.border}
                keyboardType="numeric"
                value={gradeWeights[grade.code] ?? ''}
                onChangeText={(v) => setGradeWeights((prev) => ({ ...prev, [grade.code]: v }))}
              />
            </View>
          ))}

          {/* Live total bar */}
          <View
            style={{
              marginTop: Spacing.md,
              padding: Spacing.md,
              backgroundColor: Colors.surface,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 6 }}>
              दर्ज: {toIndianNumber(totalEntered)} kg &nbsp;/&nbsp; कुल: {toIndianNumber(totalKgNum)} kg
            </Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: Colors.border, overflow: 'hidden' }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.primary,
                  width: totalKgNum > 0 ? `${Math.min((totalEntered / totalKgNum) * 100, 100)}%` : '0%',
                }}
              />
            </View>
            {diff > 100 ? (
              <Text style={{ fontSize: FontSize.xs, color: Colors.warning, marginTop: 6 }}>
                ⚠ अंतर: {toIndianNumber(diff)} kg — फिर भी जारी रखें?
              </Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Submit button */}
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
            testID="submit-truck-button"
            onPress={handleSubmit}
            disabled={!formComplete || mutation.isPending}
            style={{
              height: 56,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: Spacing.sm,
              backgroundColor: formComplete && !mutation.isPending ? Colors.primary : Colors.border,
            }}
          >
            <Truck size={20} color="#FFF" />
            <Text style={{ fontSize: FontSize.md, color: '#FFF', fontWeight: '700' }}>
              {mutation.isPending ? 'रजिस्टर हो रही है…' : 'गाड़ी रजिस्टर करें'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
