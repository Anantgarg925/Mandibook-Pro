import React, { useCallback, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface DraggableFABProps {
  onPress: () => void;
  children: React.ReactNode;
  initialBottom?: number;
  initialRight?: number;
  testID?: string;
}

export function DraggableFAB({
  onPress,
  children,
  initialBottom = 12,
  initialRight = 16,
  testID,
}: DraggableFABProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Animation values for the position
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  // Track offset so dragging starts from the last released position
  const offset = useRef({ x: 0, y: 0 });

  // Reset button to its original home position whenever the screen is revisited
  useFocusEffect(
    useCallback(() => {
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }).start(() => {
        offset.current = { x: 0, y: 0 };
        pan.setValue({ x: 0, y: 0 });
        pan.setOffset({ x: 0, y: 0 });
      });
    }, [pan])
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only capture gestures that move at least 5px to avoid swallowing simple taps
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Set offset so dragging starts where it left off
        pan.setOffset({ x: offset.current.x, y: offset.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();

        // Calculate final X and Y
        let finalX = (pan.x as any)._value;
        let finalY = (pan.y as any)._value;

        // Boundary checks (keeping it within readable screens)
        // Left boundary: we don't want it to exceed right margins too far
        const minX = -screenWidth + 80; // Allow dragging to the left edge of the screen
        const maxX = 10;                // Allow dragging slightly to the right of initial pos
        
        // Strict Top/Bottom boundaries to stay clean below Trial Banner and Header
        const minY = -screenHeight + 260 + initialBottom; // Never let it drag higher than 260dp from the top
        const maxY = 20;                                 // Don't let it drag below bottom nav bar
        
        if (finalX < minX) finalX = minX;
        if (finalX > maxX) finalX = maxX;
        if (finalY < minY) finalY = minY;
        if (finalY > maxY) finalY = maxY;

        // Animate smoothly to the bounded/snapped position
        Animated.spring(pan, {
          toValue: { x: finalX, y: finalY },
          useNativeDriver: false,
          friction: 7,
          tension: 40,
        }).start(() => {
          offset.current = { x: finalX, y: finalY };
        });

        // Tap verification
        const isTap = Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;
        if (isTap) {
          onPress();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      testID={testID}
      {...panResponder.panHandlers}
      style={[
        styles.fabContainer,
        {
          right: initialRight,
          bottom: initialBottom,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
