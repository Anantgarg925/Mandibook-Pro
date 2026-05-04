import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import InventoryBar from './InventoryBar';
import type { Truck } from '@/types/truck';

type Props = { truck: Truck; onPress: () => void };

export default function TruckCard({ truck, onPress }: Props) {
  const totalConfirmed = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg, 0);
  const totalProvisional = truck.gradeInventory.reduce((s, g) => s + g.provisionalKg, 0);
  const isActive = truck.status === 'ACTIVE';

  return (
    <Pressable
      testID={`truck-card-${truck.id}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        padding: Spacing.md,
        opacity: pressed ? 0.92 : 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      })}
    >
      {/* Row 1: truck number + status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 }}>
          {truck.truckNumber}
        </Text>
        <View
          style={{
            paddingHorizontal: Spacing.sm,
            paddingVertical: 3,
            borderRadius: Radius.round,
            backgroundColor: isActive ? '#E8F5E9' : '#F5F5F5',
          }}
        >
          <Text
            style={{
              fontSize: FontSize.xs,
              fontWeight: '700',
              color: isActive ? Colors.success : Colors.textSecond,
            }}
          >
            {truck.status}
          </Text>
        </View>
      </View>

      {/* Row 2: sender name */}
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.sm }}>
        {truck.senderName}
        {truck.senderCode ? ` (${truck.senderCode})` : null}
      </Text>

      {/* Row 3: inventory bar */}
      <InventoryBar
        totalKg={truck.totalKg}
        confirmedKg={totalConfirmed}
        provisionalKg={totalProvisional}
        compact
      />

      {/* Row 4: tap hint */}
      <Text
        style={{
          fontSize: FontSize.xs,
          color: Colors.primary,
          textAlign: 'right',
          marginTop: Spacing.sm,
          fontWeight: '600',
        }}
      >
        Tap for details →
      </Text>
    </Pressable>
  );
}
