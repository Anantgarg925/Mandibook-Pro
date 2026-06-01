import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, FontSize, Radius } from '@/lib/theme';
import type { Grade } from '@/context/ShopContext';
import type { GradeInventory } from '@/types/truck';
import { useNetInfo } from '@react-native-community/netinfo';

type Props = {
  grades: Grade[];
  selectedGrade: string | null;
  onSelect: (code: string) => void;
  truckInventory?: GradeInventory[];
};

export default function GradeSelector({ grades, selectedGrade, onSelect, truckInventory }: Props) {
  const safeGrades = grades ?? [];
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const isBoughtFromAgent = !truckInventory || truckInventory.length === 0;
  const itemsToRender = isBoughtFromAgent ? safeGrades : truckInventory;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {itemsToRender.map((item: any) => {
        const isSelected = selectedGrade === item.code;

        let displayLabel = `${item.code} - ${item.name || ''}`;
        let subLabel = '';
        if (!isBoughtFromAgent) {
          const sold = (item.confirmedKg || 0) + (item.provisionalKg || 0);
          const est = item.totalKg || 0;
          const estText = est > 0 ? ` / Est: ${est}kg` : '';
          subLabel = `Sold: ${sold}kg${estText}`;
        }

        return (
          <Pressable
            key={item.code}
            testID={`grade-tile-${item.code}`}
            onPress={() => onSelect(item.code)}
            style={{
              flex: 1,
              minWidth: isBoughtFromAgent ? '30%' : '100%',
              minHeight: 48,
              paddingVertical: 8,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: isSelected ? Colors.primary : Colors.border,
              backgroundColor: isSelected ? Colors.primary : Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: FontSize.md,
                  fontWeight: isSelected ? '800' : '600',
                  color: isSelected ? '#FFFFFF' : Colors.text,
                }}
              >
                {displayLabel}
              </Text>
              {subLabel ? (
                <Text style={{ fontSize: 11, color: isSelected ? '#D1FAE5' : Colors.textSecond, marginTop: 2 }}>
                  {subLabel}
                </Text>
              ) : null}
              {isOffline && !isBoughtFromAgent && (
                <Text style={{ fontSize: 10, color: isSelected ? '#FDE68A' : '#D97706', fontWeight: 'bold', marginTop: 2 }}>
                  🟡 Cached
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
