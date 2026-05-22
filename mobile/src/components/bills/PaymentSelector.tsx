import React, { useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import type { PaymentMode } from '@/types/inquiry';

type Option = { mode: PaymentMode; labelEn: string; labelHi: string };

const OPTIONS: Option[] = [
  { mode: 'CASH', labelEn: 'Cash', labelHi: 'नकद' },
  { mode: 'UDHAARI', labelEn: 'Credit', labelHi: 'उधारी' },
  { mode: 'UPI', labelEn: 'UPI', labelHi: 'यूपीआई' },
  { mode: 'CHEQUE', labelEn: 'Cheque', labelHi: 'चेक' },
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
    upiHeight.value = withTiming(selected === 'UPI' ? 68 : 0, { duration: 260 });
  }, [selected, upiHeight]);

  const upiStyle = useAnimatedStyle(() => ({
    height: upiHeight.value,
    overflow: 'hidden' as const,
  }));

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {OPTIONS.map(({ mode, labelEn, labelHi }) => {
          const active = selected === mode;
          return (
            <Pressable
              key={mode}
              testID={`payment-${mode}`}
              onPress={() => onSelect(mode)}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                flexShrink: 1,
                height: 56,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: active ? 0 : 1,
                borderColor: '#E5E7EB',
                backgroundColor: active ? Colors.primary : '#F8F9FA',
              }}
            >
              <Text
                style={{
                  fontSize: FontSize.md,
                  fontWeight: '700',
                  color: active ? '#FFFFFF' : Colors.text,
                  marginBottom: 2
                }}
              >
                {labelEn}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: active ? '#FFFFFF' : Colors.textSecond,
                }}
              >
                {labelHi}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={upiStyle}>
        <TextInput
          testID="upi-ref-input"
          style={{
            height: 56,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.md,
            fontSize: FontSize.md,
            backgroundColor: '#FFFFFF',
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
