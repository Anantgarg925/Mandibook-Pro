import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
