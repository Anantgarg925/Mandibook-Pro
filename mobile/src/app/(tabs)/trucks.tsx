import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useTodayTrucks } from '@/hooks/useTodayTrucks';
import TruckCard from '@/components/truck/TruckCard';
import { SkeletonTable } from '@/components/common/SkeletonLoader';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { Truck } from '@/types/truck';

function ListHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{
      backgroundColor: Colors.headerBg,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFF' }}>
            आज की गाड़ियां
          </Text>
          <Text style={{ fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' }}>Today's Trucks</Text>
        </View>
        <Pressable
          testID="add-truck-button"
          onPress={onAdd}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
            paddingVertical: 10,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.round,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
          })}
        >
          <Plus size={16} color="#FFF" strokeWidth={3} />
          <Text style={{ fontSize: FontSize.sm, color: '#FFF', fontWeight: '700' }}>नई गाड़ी</Text>
        </Pressable>
      </View>
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
          backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
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
      <SafeAreaView testID="trucks-loading" style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <ListHeader onAdd={handleAdd} />
        <SkeletonTable rows={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
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
    </SafeAreaView>
  );
}
