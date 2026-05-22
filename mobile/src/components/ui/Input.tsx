import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={Colors.textSecond}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? Colors.danger : Colors.border,
            borderRadius: Radius.sm,
            backgroundColor: Colors.surface,
            paddingHorizontal: Spacing.md,
            color: Colors.text,
            fontSize: FontSize.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={{ fontSize: FontSize.xs, color: Colors.danger }}>{error}</Text> : null}
    </View>
  );
}
