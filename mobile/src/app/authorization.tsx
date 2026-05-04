import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import PendingInquiryCard from '@/components/bills/PendingInquiryCard';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Inquiry } from '@/types/inquiry';

// TODO: add admin PIN gate once role selection (Phase N) is built

export default function AuthorizationScreen() {
  const { pending, loading } = useInquiries();
  const { trucks } = useTodayTrucks();
  const [truckFilter, setTruckFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [truckModalVisible, setTruckModalVisible] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);

  const allGrades = Array.from(new Set(pending.map((i) => i.grade))).sort();

  const filtered = pending.filter((i) => {
    if (truckFilter && i.truckId !== truckFilter) return false;
    if (gradeFilter && i.grade !== gradeFilter) return false;
    return true;
  });

  const selectedTruckLabel =
    truckFilter ? trucks.find((t) => t.id === truckFilter)?.truckNumber ?? 'Truck' : 'Truck ▾';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Authorization
        </Text>
        {pending.length > 0 ? (
          <View
            style={{
              backgroundColor: Colors.warning,
              borderRadius: Radius.round,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: '#FFF' }}>
              {pending.length} pending
            </Text>
          </View>
        ) : null}
      </View>

      {/* Filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, flexDirection: 'row' }}
      >
        {/* All Pending chip */}
        <Pressable
          testID="filter-all-pending"
          onPress={() => { setTruckFilter(null); setGradeFilter(null); }}
          style={{
            paddingVertical: 7,
            paddingHorizontal: Spacing.sm,
            borderRadius: Radius.round,
            backgroundColor: !truckFilter && !gradeFilter ? Colors.warning : Colors.surface,
            borderWidth: 1,
            borderColor: !truckFilter && !gradeFilter ? Colors.warning : Colors.border,
          }}
        >
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: !truckFilter && !gradeFilter ? '#FFF' : Colors.textSecond,
            }}
          >
            सभी Pending ({pending.length})
          </Text>
        </Pressable>

        {/* Truck filter */}
        <Pressable
          testID="truck-filter-button"
          onPress={() => setTruckModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 7,
            paddingHorizontal: Spacing.sm,
            borderRadius: Radius.round,
            borderWidth: 1,
            borderColor: truckFilter ? Colors.primary : Colors.border,
            backgroundColor: truckFilter ? '#FFF3E0' : Colors.surface,
          }}
        >
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: truckFilter ? Colors.primary : Colors.textSecond,
            }}
          >
            {selectedTruckLabel}
          </Text>
          <ChevronDown size={12} color={truckFilter ? Colors.primary : Colors.textSecond} />
        </Pressable>

        {/* Grade filter */}
        <Pressable
          testID="grade-filter-button"
          onPress={() => setGradeModalVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 7,
            paddingHorizontal: Spacing.sm,
            borderRadius: Radius.round,
            borderWidth: 1,
            borderColor: gradeFilter ? Colors.primary : Colors.border,
            backgroundColor: gradeFilter ? '#FFF3E0' : Colors.surface,
          }}
        >
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: gradeFilter ? Colors.primary : Colors.textSecond,
            }}
          >
            {gradeFilter ? `Grade: ${gradeFilter}` : 'Grade ▾'}
          </Text>
          <ChevronDown size={12} color={gradeFilter ? Colors.primary : Colors.textSecond} />
        </Pressable>
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          testID="auth-loading"
          color={Colors.primary}
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : (
        <FlatList
          testID="pending-list"
          data={filtered}
          keyExtractor={(i: Inquiry) => i.id}
          renderItem={({ item }: { item: Inquiry }) => <PendingInquiryCard inquiry={item} />}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              testID="auth-empty"
              style={{ alignItems: 'center', paddingVertical: 64 }}
            >
              <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>✅</Text>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text }}>
                सब क्लियर है!
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
                No pending bills
              </Text>
            </View>
          }
        />
      )}

      {/* Truck filter modal */}
      <Modal
        visible={truckModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTruckModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setTruckModalVisible(false)}
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
              padding: Spacing.md,
              maxHeight: '60%',
            }}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm }}>
              Filter by Truck
            </Text>
            <Pressable
              onPress={() => { setTruckFilter(null); setTruckModalVisible(false); }}
              style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>सभी गाड़ियां (All)</Text>
            </Pressable>
            <FlatList
              data={trucks}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setTruckFilter(item.id); setTruckModalVisible(false); }}
                  style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}
                >
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>
                    {item.truckNumber}
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                    {item.senderName}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Grade filter modal */}
      <Modal
        visible={gradeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGradeModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setGradeModalVisible(false)}
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
              padding: Spacing.md,
              maxHeight: '60%',
            }}
          >
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm }}>
              Filter by Grade
            </Text>
            <Pressable
              onPress={() => { setGradeFilter(null); setGradeModalVisible(false); }}
              style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>सभी ग्रेड (All)</Text>
            </Pressable>
            {allGrades.map((g) => (
              <Pressable
                key={g}
                onPress={() => { setGradeFilter(g); setGradeModalVisible(false); }}
                style={{ paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}
              >
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
