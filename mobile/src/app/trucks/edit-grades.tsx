import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, mapTruck } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Truck, GradeInventory } from '@/types/truck';

export default function EditGradesScreen() {
  const router = useRouter();
  const { truckId } = useLocalSearchParams<{ truckId: string }>();
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const { data: truck } = useQuery({
    queryKey: ['truck', shop?.shopId, truckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('id', truckId)
        .single();
      if (error) throw new Error(error.message);
      return mapTruck(data as Record<string, unknown>);
    },
    enabled: !!shop?.shopId && !!truckId,
  });

  const [weights, setWeights] = useState<Record<string, string>>({});

  useEffect(() => {
    if (truck) {
      const initial: Record<string, string> = {};
      truck.gradeInventory.forEach((g) => {
        initial[g.code] = g.totalKg > 0 ? String(g.totalKg) : '';
      });
      setWeights(initial);
    }
  }, [truck]);

  const mutation = useMutation({
    mutationFn: async (gradeInventory: GradeInventory[]) => {
      const { data, error } = await supabase
        .from('trucks')
        .update({ grade_inventory: gradeInventory })
        .eq('id', truckId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['truck', shop?.shopId, truckId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!truck) return;
    const updated: GradeInventory[] = truck.gradeInventory.map((g) => ({
      ...g,
      totalKg: parseFloat(weights[g.code] ?? '0') || 0,
    }));
    mutation.mutate(updated);
  };

  if (!truck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <Text style={{ color: Colors.textSecond }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const totalEntered = Object.values(weights).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.primary, borderBottomWidth: 0,
      }}>
        <Pressable testID="back-edit-grades" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>Grade Estimate</Text>
          <Text style={{ fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.8)' }}>{truck.truckNumber} — अनुमानित वजन बदलें</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {/* Total hint */}
          <View style={{
            backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
            marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
          }}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
              कुल ट्रक वजन: <Text style={{ fontWeight: '800', color: Colors.text }}>{truck.totalKg.toLocaleString('en-IN')} kg</Text>
            </Text>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
              अभी तक दर्ज: <Text style={{ fontWeight: '800', color: totalEntered > truck.totalKg ? Colors.danger : Colors.primary }}>{totalEntered.toLocaleString('en-IN')} kg</Text>
            </Text>
          </View>

          {truck.gradeInventory.map((g) => (
            <View key={g.code} style={{
              flexDirection: 'row', alignItems: 'center',
              paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{g.code}</Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{g.name}</Text>
                {g.confirmedKg > 0 ? (
                  <Text style={{ fontSize: 10, color: Colors.success }}>✅ {g.confirmedKg.toLocaleString('en-IN')} kg confirmed</Text>
                ) : null}
              </View>
              <TextInput
                testID={`edit-grade-${g.code}`}
                style={{
                  width: 110, height: 48, borderWidth: 1, borderColor: Colors.border,
                  borderRadius: Radius.sm, paddingHorizontal: Spacing.sm,
                  fontSize: FontSize.md, color: Colors.text, textAlign: 'right',
                  backgroundColor: Colors.surface,
                }}
                placeholder="0 kg"
                placeholderTextColor={Colors.border}
                keyboardType="numeric"
                value={weights[g.code] ?? ''}
                onChangeText={(v) => setWeights((prev) => ({ ...prev, [g.code]: v }))}
              />
            </View>
          ))}
        </ScrollView>

        {/* Save button */}
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: Spacing.md, paddingBottom: Spacing.md + insets.bottom, backgroundColor: Colors.background,
          borderTopWidth: 1, borderTopColor: Colors.border,
        }}>
          <Pressable
            testID="save-grade-estimates"
            onPress={handleSave}
            disabled={mutation.isPending}
            style={{
              height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center',
              backgroundColor: mutation.isPending ? Colors.border : Colors.primary,
            }}
          >
            <Text style={{ fontSize: FontSize.md, color: mutation.isPending ? Colors.textSecond : '#FFF', fontWeight: '700' }}>
              {mutation.isPending ? 'सेव हो रहा है…' : 'अनुमान सेव करें'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
