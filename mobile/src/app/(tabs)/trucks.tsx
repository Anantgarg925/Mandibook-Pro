import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import TruckCard from '@/components/truck/TruckCard';
import { SkeletonTable } from '@/components/common/SkeletonLoader';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Truck } from '@/types/truck';

function ListHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
      }}
    >
      <View>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          आज की गाड़ियां
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>Today's Trucks</Text>
      </View>
      <Pressable
        testID="add-truck-button"
        onPress={onAdd}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: pressed ? '#E55A00' : Colors.primary,
          paddingVertical: 10,
          paddingHorizontal: Spacing.md,
          borderRadius: 999,
        })}
      >
        <Plus size={16} color="#FFF" strokeWidth={3} />
        <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>नई गाड़ी</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View
      testID="empty-trucks"
      style={{ alignItems: 'center', paddingVertical: 64 }}
    >
      <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>🚛</Text>
      <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
        आज कोई गाड़ी नहीं
      </Text>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4, marginBottom: Spacing.lg }}>
        No trucks registered today
      </Text>
      <Pressable
        testID="empty-add-truck"
        onPress={onAdd}
        style={({ pressed }) => ({
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radius.round,
          backgroundColor: pressed ? '#E55A00' : Colors.primary,
        })}
      >
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>+ गाड़ी जोड़ें</Text>
      </Pressable>
    </View>
  );
}

export default function TrucksScreen() {
  const router = useRouter();
  const { trucks, loading } = useTodayTrucks();

  const handleAdd = () => router.push('/trucks/register');
  const handlePress = (truck: Truck) => router.push(`/trucks/${truck.id}`);

  if (loading) {
    return (
      <View testID="trucks-loading" style={{ flex: 1, backgroundColor: Colors.background }}>
        <ListHeader onAdd={handleAdd} />
        <SkeletonTable rows={3} />
      </View>
    );
  }

  return (
    <FlatList
      testID="truck-list"
      data={trucks}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => <TruckCard truck={item} onPress={() => handlePress(item)} />}
      ListHeaderComponent={<ListHeader onAdd={handleAdd} />}
      ListEmptyComponent={<EmptyState onAdd={handleAdd} />}
      contentContainerStyle={{ paddingBottom: Spacing.xl, backgroundColor: Colors.background }}
      style={{ backgroundColor: Colors.background }}
      showsVerticalScrollIndicator={false}
    />
  );
}
