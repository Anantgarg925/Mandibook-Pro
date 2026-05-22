import React, { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, FontSize, Spacing } from '@/lib/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, onBack, right }: AppHeaderProps) {
  return (
    <View
      style={{
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderBottomWidth: 0,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
      }}
    >
      {onBack ? (
        <Pressable
          testID="app-header-back"
          onPress={onBack}
          hitSlop={10}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 }}>
            {subtitle}
          </Text>

        ) : null}
      </View>
      {right}
    </View>
  );
}
