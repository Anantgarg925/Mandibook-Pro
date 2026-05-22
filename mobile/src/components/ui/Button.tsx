import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

const variantStyle: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.primary, fg: '#FFFFFF', border: Colors.primary },
  secondary: { bg: Colors.surface, fg: Colors.primary, border: Colors.primary },
  danger: { bg: Colors.danger, fg: '#FFFFFF', border: Colors.danger },
  ghost: { bg: 'transparent', fg: Colors.text, border: Colors.border },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  style,
  testID,
}: ButtonProps) {
  const colors = variantStyle[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: Radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bg,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.sm,
          overflow: 'hidden',
          opacity: inactive ? 0.6 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <View style={{ minWidth: leftIcon || loading ? 18 : 0, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color={colors.fg} size="small" /> : leftIcon}
      </View>
      <Text
        style={{ flexShrink: 1, fontSize: FontSize.md, fontWeight: '800', color: colors.fg, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {title}
      </Text>
    </Pressable>
  );
}
