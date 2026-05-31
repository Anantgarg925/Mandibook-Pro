import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  BackHandler,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronRight, Info, Plus, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { toIndianWeight } from '@/lib/formatters';
import { useMemberMode } from '@/hooks/useMemberMode';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { makeReferenceSlipNumber, normalizeGradeRows, ReferenceSlipCard } from '@/utils/referenceSlip';
import { downloadTestIdAsJpeg } from '@/utils/webExport';
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
  includeFontPadding: false,
  textAlignVertical: 'center' as const,
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
    <View style={{ width: '47%', marginRight: 12, marginBottom: 12, flexShrink: 1 }}>
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
  totalKgNum,
  formComplete,
  isPending,
  onSubmit,
  onSubmitAndAddAnother,
}: {
  totalKgNum: number;
  formComplete: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onSubmitAndAddAnother: () => void;
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
        elevation: 10,
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
            Live Breakdown Calculation
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#071e27' }}>
            Truck Load: {totalKgNum > 0 ? toIndianWeight(totalKgNum) : 'Not entered'}
          </Text>
        </View>

        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#00450d' }}>
            Grade split will come from bills
          </Text>
        </View>
      </View>

      {/* Row 2: submit buttons */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          testID="submit-add-another-truck-button"
          onPress={onSubmitAndAddAnother}
          disabled={!formComplete || isPending}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: formComplete && !isPending ? '#00450d' : '#E5E7EB',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: formComplete && !isPending ? '#00450d' : '#9CA3AF' }}>
            Save + Add More
          </Text>
          <Text style={{ fontSize: 10, color: formComplete && !isPending ? '#00450d' : '#9CA3AF', opacity: 0.85 }}>
            और गाड़ी
          </Text>
        </Pressable>

        <Pressable
          testID="submit-truck-button"
          onPress={onSubmit}
          disabled={!formComplete || isPending}
          style={{
            flex: 1,
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
          <Text style={{ fontSize: 15, fontWeight: '800', color: formComplete && !isPending ? '#fff' : '#9CA3AF' }}>
            {isPending ? 'Registering…' : 'Register Truck'}
          </Text>
          <Text style={{ fontSize: 10, color: formComplete && !isPending ? '#fff' : '#9CA3AF', opacity: 0.85 }}>
            {isPending ? 'रजिस्टर हो रही है…' : 'सेव करें'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function RegisterTruckScreen() {
  const router = useRouter();
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const isMemberMode = useMemberMode();

  const [truckNumber, setTruckNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderCode, setSenderCode] = useState('');
  const [chlNumber, setChlNumber] = useState('');
  const [totalKg, setTotalKg] = useState('');
  const [freightAmount, setFreightAmount] = useState('');
  const [gradeBreakdownOpen, setGradeBreakdownOpen] = useState(false);
  const [gradeRows, setGradeRows] = useState([{ gradeLabel: '', weightKg: '' }]);
  const [referenceSlipNumber, setReferenceSlipNumber] = useState(() => makeReferenceSlipNumber());
  const [success, setSuccess] = useState(false);
  const submitModeRef = useRef<'done' | 'add-another'>('done');
  const referenceSlipRef = useRef<View>(null);
  const chlRef = useRef<TextInput>(null);
  const senderNameRef = useRef<TextInput>(null);
  const senderCodeRef = useRef<TextInput>(null);
  const totalKgRef = useRef<TextInput>(null);
  const freightRef = useRef<TextInput>(null);
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

  const grades = shop?.grades ?? [];
  const firmGradeRows = useMemo(
    () => grades.map((grade) => ({
      gradeLabel: grade.code,
      weightKg: '',
    })),
    [grades],
  );
  const totalKgNum = parseFloat(totalKg) || 0;
  const totalGradedWeight = gradeBreakdownOpen
    ? gradeRows.reduce((sum, row) => sum + (parseFloat(row.weightKg) || 0), 0)
    : 0;
  const remainingUngraded = totalKgNum - totalGradedWeight;
  const formComplete = truckNumber.trim() !== '' && senderName.trim() !== '' && totalKgNum > 0;
  const referenceSlipReady = truckNumber.trim() !== '' && totalKgNum > 0;
  const referenceSlipRows = gradeBreakdownOpen ? normalizeGradeRows(gradeRows) : [];

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      if (isMemberMode) {
        router.replace('/member-trucks' as any);
      } else {
        router.replace('/trucks' as any);
      }
    }
  };

  const goToTrucks = () => {
    router.replace((isMemberMode ? '/member-trucks' : '/trucks') as any);
  };

  useEffect(() => {
    if (isMemberMode === undefined) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [isMemberMode, router]);

  useEffect(() => {
    if (!gradeBreakdownOpen || grades.length === 0) return;
    setGradeRows((rows) => {
      const hasOnlyBlankRow = rows.length === 1 && !rows[0].gradeLabel.trim() && !rows[0].weightKg.trim();
      if (!hasOnlyBlankRow) return rows;
      return firmGradeRows;
    });
  }, [firmGradeRows, gradeBreakdownOpen, grades.length]);

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('trucks')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      if (submitModeRef.current === 'add-another') {
        setTruckNumber('');
        setSenderName('');
        setSenderCode('');
        setChlNumber('');
        setTotalKg('');
        setFreightAmount('');
        mutation.reset();
        return;
      }
      setSuccess(true);
    },
  });

  const handleSubmit = async (addAnother = false) => {
    if (!shop?.shopId || !formComplete || mutation.isPending) return;
    if (gradeBreakdownOpen) {
      if (totalGradedWeight > totalKgNum) return;
      const invalidRow = gradeRows.some((row) => (parseFloat(row.weightKg) || 0) > 0 && !row.gradeLabel.trim());
      if (invalidRow) return;
    }
    submitModeRef.current = addAnother ? 'add-another' : 'done';

    const businessDate = getCurrentBusinessDate();

    const validGradeRows = gradeBreakdownOpen
      ? gradeRows
          .map((row) => ({ gradeLabel: row.gradeLabel.trim(), weightKg: parseFloat(row.weightKg) || 0 }))
          .filter((row) => row.gradeLabel && row.weightKg > 0)
      : [];

    const gradeInventory: GradeInventory[] = grades.map((g) => {
      const match = validGradeRows.find((r) => r.gradeLabel === g.code);
      return {
        code: g.code,
        name: g.name,
        totalKg: match ? match.weightKg : 0,
        confirmedKg: 0,
        provisionalKg: 0,
      };
    });

    const { data: truckData, error } = await supabase
      .from('trucks')
      .insert({
      shop_id: shop.shopId,
      truck_number: truckNumber.toUpperCase(),
      sender_name: senderName,
      sender_code: senderCode,
      chl_number: chlNumber,
      total_kg: totalKgNum,
      freight_amount: parseFloat(freightAmount) || 0,
      grade_inventory: gradeInventory,
      reference_slip_number: referenceSlipNumber,
      status: 'ACTIVE',
      date: businessDate.getTime(),
      created_at: Date.now(),
      })
      .select()
      .single();
    if (error) {
      Alert.alert('Could not register truck', error.message);
      return;
    }
    if (validGradeRows.length > 0) {
      await supabase.from('truck_grade_entries').insert(validGradeRows.map((row) => ({
        id: `${truckData.id}-${row.gradeLabel}-${Date.now()}`.replace(/\s+/g, '-'),
        truck_id: truckData.id,
        grade_label: row.gradeLabel,
        weight_kg: row.weightKg,
        created_at: Date.now(),
      })));
    }
    queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
    if (submitModeRef.current === 'add-another') {
      setTruckNumber('');
      setSenderName('');
      setSenderCode('');
      setChlNumber('');
      setTotalKg('');
      setFreightAmount('');
      setGradeRows(firmGradeRows.length > 0 ? firmGradeRows : [{ gradeLabel: '', weightKg: '' }]);
      setGradeBreakdownOpen(false);
      setReferenceSlipNumber(makeReferenceSlipNumber());
      return;
    }
    setSuccess(true);
  };

  const resetForm = () => {
    setTruckNumber('');
    setSenderName('');
    setSenderCode('');
    setChlNumber('');
    setTotalKg('');
    setFreightAmount('');
    setGradeRows(firmGradeRows.length > 0 ? firmGradeRows : [{ gradeLabel: '', weightKg: '' }]);
    setGradeBreakdownOpen(false);
    setReferenceSlipNumber(makeReferenceSlipNumber());
    setSuccess(false);
    mutation.reset();
  };

  const shareReferenceSlip = async () => {
    if (!referenceSlipReady || !referenceSlipRef.current) return;
    try {
      if (Platform.OS === 'web') {
        await downloadTestIdAsJpeg('reference-slip-web', `reference-slip-${referenceSlipNumber}.jpg`);
        return;
      }
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing unavailable', 'Reference slip sharing is not available on this device.');
        return;
      }
      const uri = await captureRef(referenceSlipRef, { format: 'jpg', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        UTI: 'public.jpeg',
        dialogTitle: 'Share reference slip',
      });
    } catch {
      Alert.alert('Reference Slip', 'Could not create the reference slip image.');
    }
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
            onPress={goToTrucks}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3faff' }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="back-from-register" onPress={goBack} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Register New Truck / नई गाड़ी
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <KeyboardAwareScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={200}
        >
          {/* ── Section label ──────────────────────────────────────────────── */}
          <Text
            onLayout={rememberSection('details')}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#00450d',
              marginLeft: 16,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Truck Details / {'\u0917\u093E\u0921\u093C\u0940 \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940'}
          </Text>

          {/* ── Truck Details card ─────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 16,
              margin: 16,
              marginTop: 0,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
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
                  returnKeyType="next"
                  onSubmitEditing={() => chlRef.current?.focus()}
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
                  ref={chlRef}
                  returnKeyType="next"
                  onSubmitEditing={() => senderNameRef.current?.focus()}
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
                  ref={senderNameRef}
                  returnKeyType="next"
                  onSubmitEditing={() => senderCodeRef.current?.focus()}
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
                  ref={senderCodeRef}
                  returnKeyType="next"
                  onSubmitEditing={() => totalKgRef.current?.focus()}
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
                  ref={totalKgRef}
                  returnKeyType="next"
                  onSubmitEditing={() => freightRef.current?.focus()}
                />
              </GridField>

              {/* Freight */}
              <GridField label="Freight (₹)" labelHi="भाड़ा (₹)">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 56,
                    borderWidth: 1,
                    borderColor: '#c0c9bb',
                    borderRadius: 10,
                    backgroundColor: '#fff',
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#00450d',
                      marginRight: 4,
                    }}
                  >
                    {'\u20B9'}
                  </Text>
                  <TextInput
                    testID="freight-input"
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#00450d',
                      fontWeight: '700',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#c0c9bb"
                    value={freightAmount}
                    onChangeText={setFreightAmount}
                    keyboardType="numeric"
                  ref={freightRef}
                  returnKeyType="done"
                  onSubmitEditing={() => scrollToSection('grades')}
                />
              </View>
            </GridField>
            </View>
          </View>



          <View
            onLayout={rememberSection('grades')}
            style={{
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 8,
              padding: 10,
              marginHorizontal: 16,
              marginBottom: 12,
            }}
          >
            <Pressable
              testID="toggle-grade-breakdown"
              onPress={() => {
                if (!gradeBreakdownOpen && grades.length > 0) {
                  setGradeRows((rows) => {
                    const hasOnlyBlankRow = rows.length === 1 && !rows[0].gradeLabel.trim() && !rows[0].weightKg.trim();
                    return hasOnlyBlankRow ? firmGradeRows : rows;
                  });
                }
                setGradeBreakdownOpen((open) => !open);
                setTimeout(() => scrollToSection('grades'), 80);
              }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              {gradeBreakdownOpen ? <ChevronDown size={18} color="#00450d" /> : <ChevronRight size={18} color="#00450d" />}
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: '#00450d' }}>
                Add grade-wise weight breakdown (optional)
              </Text>
            </Pressable>

            {gradeBreakdownOpen ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                {grades.length > 0 ? (
                  <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                    Firm grades are prefilled from settings. Enter weights only for grades present in this truck.
                  </Text>
                ) : null}
                {gradeRows.map((row, index) => (
                  <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      testID={`grade-label-${index}`}
                      style={{ ...inputStyle, flex: 1, minHeight: 44, height: 44 }}
                      placeholder="Grade"
                      placeholderTextColor="#c0c9bb"
                      value={row.gradeLabel}
                      onChangeText={(value) => setGradeRows((rows) => rows.map((r, i) => i === index ? { ...r, gradeLabel: value } : r))}
                      returnKeyType="next"
                    />
                    <TextInput
                      testID={`grade-weight-${index}`}
                      style={{ ...inputStyle, flex: 1, minHeight: 44, height: 44 }}
                      placeholder="Weight kg"
                      placeholderTextColor="#c0c9bb"
                      value={row.weightKg}
                      onChangeText={(value) => setGradeRows((rows) => rows.map((r, i) => i === index ? { ...r, weightKg: value } : r))}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                    <Pressable
                      testID={`remove-grade-row-${index}`}
                      onPress={() => setGradeRows((rows) => rows.length === 1 ? rows : rows.filter((_, i) => i !== index))}
                      style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={18} color="#B71C1C" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  testID="add-grade-row"
                  onPress={() => {
                    setGradeRows((rows) => [...rows, { gradeLabel: '', weightKg: '' }]);
                    setTimeout(() => scrollToSection('grades'), 80);
                  }}
                  style={{ minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: '#00450d', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Plus size={16} color="#00450d" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#00450d' }}>Add Grade</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ width: '48%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Total Graded Weight</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#071e27' }}>{toIndianWeight(totalGradedWeight)}</Text>
                  </View>
                  <View style={{ width: '48%', borderWidth: 1, borderColor: remainingUngraded < 0 ? '#B71C1C' : '#E5E7EB', borderRadius: 8, padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>Ungraded / Remaining</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: remainingUngraded < 0 ? '#B71C1C' : '#071e27' }}>{toIndianWeight(remainingUngraded)}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── Inventory explanation ─────────────────────────────────────── */}
          <View
            onLayout={rememberSection('saveHint')}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              backgroundColor: '#E8F5E9',
              borderWidth: 1,
              borderColor: '#B7DDBA',
              borderRadius: 12,
              marginHorizontal: 16,
              padding: 14,
            }}
          >
            <Info size={20} color="#00450d" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#00450d' }}>
                No grade estimate needed
              </Text>
              <Text style={{ fontSize: 12, color: '#41493e', marginTop: 4, lineHeight: 18 }}>
                Mosambi grade is selected while making each bill. Truck detail will total grade-wise sacks and weight automatically.
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>

        {/* ── Fixed bottom action bar ────────────────────────────────────── */}
        <BottomBar
          totalKgNum={totalKgNum}
          formComplete={formComplete}
          isPending={mutation.isPending}
          onSubmit={() => handleSubmit(false)}
          onSubmitAndAddAnother={() => handleSubmit(true)}
        />
      </KeyboardAvoidingView>

      <View style={{ position: 'absolute', left: -1200, top: 0 }}>
        <View ref={referenceSlipRef} testID="reference-slip-web" collapsable={false}>
          <ReferenceSlipCard
            shop={shop}
            slipNumber={referenceSlipNumber}
            generatedAt={Date.now()}
            itemName={shop?.commodity ?? 'Item'}
            truckNumber={truckNumber.trim().toUpperCase() || 'Truck / Lot'}
            totalKg={totalKgNum}
            gradeRows={referenceSlipRows}
            status="draft"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
