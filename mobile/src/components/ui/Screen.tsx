import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
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
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={bottomPadding + 24}
          extraKeyboardSpace={16}
          disableScrollOnKeyboardHide
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
        </KeyboardAwareScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
