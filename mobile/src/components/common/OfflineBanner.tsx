import React, { useState, useEffect, useRef } from 'react';
import { View, Text, DeviceEventEmitter } from 'react-native';
import { getOfflineQueue, processOfflineQueue } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi } from 'lucide-react-native';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const wasOfflineRef = useRef(false);

  // Shared values — safe to read inside useAnimatedStyle worklet
  const height = useSharedValue(0);
  const hasPendingQueue = useSharedValue(0); // 1 = has pending, 0 = no pending

  const fetchQueue = () => {
    getOfflineQueue().then((q) => {
      setQueueLength(q.length);
      hasPendingQueue.value = q.length > 0 ? 1 : 0;
    });
  };

  useEffect(() => {
    fetchQueue();
    const sub = DeviceEventEmitter.addListener('onQueueUpdate', fetchQueue);

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

    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [height, hasPendingQueue]);

  // Only shared values are read in this worklet — no JS state access
  const animStyle = useAnimatedStyle(() => {
    if (hasPendingQueue.value > 0) {
      return {
        opacity: 1,
        maxHeight: 100,
      };
    }
    return {
      opacity: height.value,
      maxHeight: height.value * 60,
    };
  });

  const handleSyncNow = () => {
    processOfflineQueue(supabase).then((syncedAny) => {
      if (syncedAny) {
        queryClient.invalidateQueries({ queryKey: ['inquiries'] });
        queryClient.invalidateQueries({ queryKey: ['trucks'] });
        queryClient.invalidateQueries({ queryKey: ['truck'] });
      }
    }).catch((err) => console.error('Manual sync error:', err));
  };

  if (!isOffline && !showReconnected && queueLength === 0) return null;

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
          backgroundColor: isOffline ? '#E65100' : (queueLength > 0 ? '#1D4ED8' : '#2E7D32'),
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
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF', flex: 1 }}>
          {isOffline
            ? queueLength > 0
              ? `Offline mode — ${queueLength} bills pending sync`
              : 'Offline mode — No internet connection'
            : queueLength > 0
              ? `${queueLength} bills pending sync...`
              : 'Back Online / वापस ऑनलाइन'}
        </Text>
        {!isOffline && queueLength > 0 && (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 4,
            }}
            onTouchEnd={handleSyncNow}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Sync Now</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
