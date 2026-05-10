import React, { useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { PaymentMode } from '@/types/inquiry';

type Option = { mode: PaymentMode; label: string; color: string };

const OPTIONS: Option[] = [
  { mode: 'CASH', label: '💵 CASH', color: Colors.success },
  { mode: 'UPI', label: '📱 UPI', color: Colors.info },
  { mode: 'UDHAARI', label: '📒 UDHAARI', color: Colors.primary },
];

type Props = {
  selected: PaymentMode;
  onSelect: (mode: PaymentMode) => void;
  upiRef: string;
  onUpiRefChange: (v: string) => void;
};

export default function PaymentSelector({ selected, onSelect, upiRef, onUpiRefChange }: Props) {
  const upiHeight = useSharedValue(0);

  useEffect(() => {
    upiHeight.value = withTiming(selected === 'UPI' ? 60 : 0, { duration: 260 });
  }, [selected, upiHeight]);

  const upiStyle = useAnimatedStyle(() => ({
    height: upiHeight.value,
    overflow: 'hidden' as const,
  }));

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {OPTIONS.map(({ mode, label, color }) => {
          const active = selected === mode;
          return (
            <Pressable
              key={mode}
              testID={`payment-${mode}`}
              onPress={() => onSelect(mode)}
              style={{
                flex: 1,
                flexShrink: 1,
                height: 48,
                borderRadius: Radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: active ? color : Colors.border,
                backgroundColor: active ? color : Colors.surface,
              }}
            >
              <Text
                style={{
                  fontSize: FontSize.xs,
                  fontWeight: '700',
                  color: active ? '#FFF' : Colors.textSecond,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={upiStyle}>
        <TextInput
          testID="upi-ref-input"
          style={{
            height: 48,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.md,
            fontSize: FontSize.sm,
            backgroundColor: Colors.surface,
            color: Colors.text,
            marginTop: Spacing.sm,
          }}
          placeholder="UPI Reference No."
          placeholderTextColor={Colors.textSecond}
          value={upiRef}
          onChangeText={onUpiRefChange}
          keyboardType="default"
          autoCapitalize="none"
        />
      </Animated.View>
    </View>
  );
}
