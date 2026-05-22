import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '@/lib/theme';

type EmptyStateProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
};

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
      {icon}
      <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: icon ? Spacing.sm : 0 }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, textAlign: 'center', marginTop: 4 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
