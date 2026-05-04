import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Colors, Radius } from '@/lib/theme';

function SkeletonBox({
  width,
  height,
  style,
}: {
  width?: number | string;
  height: number;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor: Colors.border,
          borderRadius: Radius.sm,
        },
        animStyle,
        { width: width ?? '100%' } as ViewStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <View
      style={{
        margin: 8,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        padding: 16,
        gap: 8,
      }}
    >
      <SkeletonBox height={14} width="60%" />
      <SkeletonBox height={12} width="40%" />
      <SkeletonBox height={height - 60} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 6,
      }}
    >
      <SkeletonBox height={14} width="55%" />
      <SkeletonBox height={11} width="35%" />
    </View>
  );
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
