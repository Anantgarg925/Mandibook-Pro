import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Colors, FontSize, Radius } from '@/lib/theme';
import type { Grade } from '@/context/ShopContext';
import type { GradeInventory } from '@/types/truck';

type Props = {
  grades: Grade[];
  selectedGrade: string | null;
  onSelect: (code: string) => void;
  truckInventory: GradeInventory[];
};

export default function GradeSelector({ grades, selectedGrade, onSelect }: Props) {
  const safeGrades = grades ?? [];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {safeGrades.map((item) => {
        const isSelected = selectedGrade === item.code;

        return (
          <Pressable
            key={item.code}
            testID={`grade-tile-${item.code}`}
            onPress={() => onSelect(item.code)}
            style={{
              flex: 1,
              minWidth: '30%',
              height: 48,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: isSelected ? Colors.primary : Colors.border,
              backgroundColor: isSelected ? Colors.primary : Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: FontSize.md,
                fontWeight: isSelected ? '800' : '600',
                color: isSelected ? '#FFFFFF' : Colors.text,
              }}
            >
              {item.code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
