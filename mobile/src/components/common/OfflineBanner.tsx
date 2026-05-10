import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi } from 'lucide-react-native';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const height = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);

      if (offline) {
        wasOfflineRef.current = true;
        setIsOffline(true);
        setShowReconnected(false);
        height.value = withTiming(1, { duration: 300 });
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsOffline(false);
        setShowReconnected(true);
        height.value = withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(2000, withTiming(0, { duration: 300 }))
        );
        setTimeout(() => setShowReconnected(false), 2500);
      }
    });

    return () => unsubscribe();
  }, [height]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: height.value * 60,
  }));

  if (!isOffline && !showReconnected) return null;

  return (
    <Animated.View
      testID="offline-banner"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: isOffline ? '#E65100' : '#2E7D32',
          paddingTop: insets.top,
          overflow: 'hidden',
        },
        animStyle,
      ]}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}>
        {isOffline ? (
          <WifiOff size={16} color="#FFF" />
        ) : (
          <Wifi size={16} color="#FFF" />
        )}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
          {isOffline ? 'No Internet Connection / इंटरनेट नहीं है' : 'Back Online / वापस ऑनलाइन'}
        </Text>
      </View>
    </Animated.View>
  );
}
