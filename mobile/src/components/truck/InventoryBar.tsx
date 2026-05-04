import React, { useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Colors, FontSize, Spacing } from '@/lib/theme';
import { toIndianWeight } from '@/lib/formatters';

type Props = {
  totalKg: number;
  confirmedKg: number;
  provisionalKg: number;
  compact?: boolean;
};

export default function InventoryBar({ totalKg, confirmedKg, provisionalKg, compact }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const confirmedWidth = useSharedValue(0);
  const provisionalWidth = useSharedValue(0);

  const availableKg = Math.max(0, totalKg - confirmedKg - provisionalKg);
  const availablePct = totalKg > 0 ? availableKg / totalKg : 0;
  const availableColor =
    availablePct > 0.5 ? Colors.success : availablePct > 0.25 ? Colors.primary : Colors.danger;

  useEffect(() => {
    if (containerWidth === 0 || totalKg === 0) return;
    const confirmed = Math.min(confirmedKg / totalKg, 1) * containerWidth;
    const provisional = Math.min(provisionalKg / totalKg, 1 - confirmedKg / totalKg) * containerWidth;
    confirmedWidth.value = withTiming(confirmed, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
    provisionalWidth.value = withTiming(provisional, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
  }, [containerWidth, totalKg, confirmedKg, provisionalKg]);

  const confirmedStyle = useAnimatedStyle(() => ({
    width: confirmedWidth.value,
  }));

  const provisionalStyle = useAnimatedStyle(() => ({
    width: provisionalWidth.value,
    left: confirmedWidth.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View>
      <View
        onLayout={onLayout}
        style={{
          height: 24,
          borderRadius: 12,
          backgroundColor: Colors.border,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              height: 24,
              backgroundColor: Colors.success,
              borderRadius: 12,
            },
            confirmedStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              height: 24,
              backgroundColor: Colors.warning,
              borderRadius: 12,
            },
            provisionalStyle,
          ]}
        />
      </View>

      {compact ? null : (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: Spacing.xs,
          }}
        >
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' }}>
              ✅ {toIndianWeight(confirmedKg)}
            </Text>
            <Text style={{ fontSize: 10, color: Colors.textSecond }}>Confirmed</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FontSize.xs, color: Colors.warning, fontWeight: '700' }}>
              🟡 {toIndianWeight(provisionalKg)}
            </Text>
            <Text style={{ fontSize: 10, color: Colors.textSecond }}>Provisional</Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: FontSize.xs, color: availableColor, fontWeight: '700' }}>
              ⬜ {toIndianWeight(availableKg)}
            </Text>
            <Text style={{ fontSize: 10, color: Colors.textSecond }}>Available</Text>
          </View>
        </View>
      )}
    </View>
  );
}
