import React from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Colors, FontSize, Radius } from '@/lib/theme';
import { toIndianNumber } from '@/lib/formatters';
import type { Grade } from '@/context/ShopContext';
import type { GradeInventory } from '@/types/truck';

type Props = {
  grades: Grade[];
  selectedGrade: string | null;
  onSelect: (code: string) => void;
  truckInventory: GradeInventory[];
};

const TILE_GAP = 8;
const SIDE_PADDING = 16;
const tileWidth = (Dimensions.get('window').width - SIDE_PADDING * 2 - TILE_GAP) / 2;

export default function GradeSelector({ grades, selectedGrade, onSelect, truckInventory }: Props) {
  // Pair grades into rows of 2 to build a grid without FlatList.
  // Nesting FlatList (even with scrollEnabled=false) inside a ScrollView crashes
  // on Android with "child already has a parent" IllegalStateException.
  const rows: Grade[][] = [];
  for (let i = 0; i < grades.length; i += 2) {
    rows.push(grades.slice(i, i + 2));
  }

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={{ flexDirection: 'row', gap: TILE_GAP, marginBottom: TILE_GAP }}
        >
          {row.map((item) => {
            const inv = truckInventory.find((t) => t.code === item.code);
            const available = inv ? Math.max(0, inv.totalKg - inv.confirmedKg - inv.provisionalKg) : 0;
            const isSelected = selectedGrade === item.code;
            const isZero = available === 0;

            const availColor =
              available > 500
                ? Colors.success
                : available > 100
                  ? Colors.primary
                  : available > 0
                    ? Colors.danger
                    : Colors.textSecond;

            return (
              <Pressable
                key={item.code}
                testID={`grade-tile-${item.code}`}
                onPress={() => !isZero && onSelect(item.code)}
                style={{
                  width: tileWidth,
                  height: 80,
                  borderRadius: Radius.md,
                  borderWidth: 2,
                  borderColor: isSelected ? Colors.primary : Colors.border,
                  backgroundColor: isSelected ? '#FFF3E0' : Colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isZero ? 0.4 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: Colors.text,
                    lineHeight: 26,
                  }}
                >
                  {item.code}
                </Text>
                <Text
                  style={{
                    fontSize: FontSize.xs,
                    color: Colors.textSecond,
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ fontSize: 11, color: availColor, fontWeight: '600', marginTop: 2 }}
                >
                  {isZero ? 'स्टॉक नहीं' : `${toIndianNumber(available)} kg`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
