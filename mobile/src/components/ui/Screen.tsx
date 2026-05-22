import React, { type ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/lib/theme';
import { useResponsive } from '@/hooks/useResponsive';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  bottomPadding?: number;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  testID?: string;
};

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = true,
  bottomPadding = 24,
  style,
  contentStyle,
  testID,
}: ScreenProps) {
  const { contentHPad } = useResponsive();
  const paddingHorizontal = padded ? contentHPad : 0;

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[{ flex: 1, backgroundColor: Colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingHorizontal,
              paddingTop: Spacing.md,
              paddingBottom: bottomPadding,
            },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
