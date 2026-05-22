/**
 * ActionButton — a full-width CTA button where backgroundColor is applied to
 * an inner View (not the Pressable's style function) so it always renders
 * correctly on Android, avoiding the known Pressable backgroundColor issue.
 */
import React from 'react';
import { Pressable, View, Text, ActivityIndicator } from 'react-native';
import { Colors, FontSize, Radius } from '@/lib/theme';

type Props = {
  testID?: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  backgroundColor?: string;
  height?: number;
  borderRadius?: number;
  marginHorizontal?: number;
  marginTop?: number;
  marginBottom?: number;
};

export default function ActionButton({
  testID,
  label,
  onPress,
  loading = false,
  disabled = false,
  backgroundColor = Colors.primary,
  height = 56,
  borderRadius,
  marginHorizontal = 0,
  marginTop = 0,
  marginBottom = 0,
}: Props) {
  const bg = disabled && !loading ? Colors.border : backgroundColor;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={{ marginHorizontal, marginTop, marginBottom }}
    >
      {({ pressed }) => (
        <View
          style={{
            height,
            borderRadius: borderRadius ?? Radius.md,
            backgroundColor: pressed && !loading ? Colors.primaryPressed : bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: (disabled && !loading) ? Colors.textSecond : '#FFF' }}>
              {label}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
