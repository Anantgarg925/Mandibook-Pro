import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '@/lib/theme';

function Shimmer({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: Radius.sm,
          backgroundColor: Colors.border,
        },
        style,
        animStyle,
      ]}
    />
  );
}

export default function TruckCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        padding: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Shimmer width={140} height={20} />
        <Shimmer width={60} height={20} />
      </View>
      <Shimmer width={200} height={14} style={{ marginBottom: 12 }} />
      <Shimmer width="100%" height={24} style={{ borderRadius: 12 }} />
    </View>
  );
}
