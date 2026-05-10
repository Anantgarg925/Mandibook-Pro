import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_W = Math.min(SCREEN_WIDTH - 40, 300);
const KEY_SIZE = Math.floor((CONTAINER_W - 48) / 3);

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

interface Props {
  visible: boolean;
  onHide: () => void;
  onSuccess: () => void;
  onCancel: () => void;
  correctPin: string;
}

export function AdminPinView({ visible, onHide, onSuccess, onCancel, correctPin }: Props) {
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const opacity = useSharedValue(0);
  const animRef = useRef(false);
  const wasVisible = useRef(false);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      animRef.current = false;
      setEntered([]);
      setError(false);
      opacity.value = withTiming(1, { duration: 380 });
    } else if (wasVisible.current && !animRef.current) {
      animRef.current = true;
      const hide = onHide;
      opacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(hide)();
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKey = (key: string) => {
    if (error) setError(false);
    if (key === 'back') {
      setEntered((prev) => prev.slice(0, -1));
      return;
    }
    if (entered.length >= PIN_LENGTH) return;

    const next = [...entered, key];
    setEntered(next);

    if (next.length === PIN_LENGTH) {
      const pin = next.join('');
      if (pin === correctPin) {
        onSuccess();
      } else {
        setError(true);
        Vibration.vibrate(400);
        shakeX.value = withSequence(
          withTiming(-10, { duration: 55 }),
          withTiming(10, { duration: 55 }),
          withTiming(-10, { duration: 55 }),
          withTiming(10, { duration: 55 }),
          withTiming(0, { duration: 55 }),
        );
        setTimeout(() => {
          setEntered([]);
          setError(false);
        }, 700);
      }
    }
  };

  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="shield" size={22} color="#00450d" />
          <Text style={styles.headerTitle}>MandiBook Pro</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Lock icon */}
        <View style={styles.lockCircle}>
          <MaterialIcons name="lock" size={48} color="#00450d" />
        </View>

        <Text style={styles.heading}>Enter Admin PIN</Text>
        <Text style={styles.headingHindi}>एडमिन पिन डालें</Text>

        {/* PIN dots */}
        <Animated.View style={[styles.dotsRow, dotsStyle]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < entered.length
                  ? error
                    ? styles.dotError
                    : styles.dotFilled
                  : styles.dotEmpty,
              ]}
            />
          ))}
        </Animated.View>

        {/* Error message */}
        <View style={styles.errorRow}>
          {error ? (
            <>
              <MaterialIcons name="error" size={15} color="#ba1a1a" />
              <Text style={styles.errorText}>Wrong PIN / गलत PIN</Text>
            </>
          ) : null}
        </View>

        {/* Keypad */}
        <View style={[styles.keypad, { width: CONTAINER_W }]}>
          {KEYS.map((key, idx) => {
            if (key === '') {
              return <View key={idx} style={{ width: KEY_SIZE, height: KEY_SIZE, margin: 12 }} />;
            }
            if (key === 'back') {
              return (
                <Pressable
                  key={idx}
                  testID="pin-backspace"
                  onPress={() => handleKey('back')}
                  style={{ width: KEY_SIZE, height: KEY_SIZE, margin: 12 }}
                  android_ripple={{ color: '#ffdad6', borderless: true, radius: KEY_SIZE / 2 }}
                >
                  {({ pressed }) => (
                    <View style={[
                      styles.keyBtn,
                      { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 },
                      pressed && styles.backBtnPressed,
                    ]}>
                      <MaterialIcons name="backspace" size={26} color="#ba1a1a" />
                    </View>
                  )}
                </Pressable>
              );
            }
            return (
              <Pressable
                key={idx}
                testID={`pin-key-${key}`}
                onPress={() => handleKey(key)}
                style={{ width: KEY_SIZE, height: KEY_SIZE, margin: 12 }}
                android_ripple={{ color: '#acf4a4', borderless: true, radius: KEY_SIZE / 2 }}
              >
                {({ pressed }) => (
                  <View style={[
                    styles.keyBtn,
                    styles.numBtn,
                    { width: KEY_SIZE, height: KEY_SIZE, borderRadius: KEY_SIZE / 2 },
                    pressed && styles.numBtnPressed,
                  ]}>
                    <Text style={styles.keyText}>{key}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.footerPill}>
          <MaterialIcons name="fingerprint" size={15} color="#003d65" />
          <Text style={styles.footerPillText}>Biometric entry available</Text>
        </View>
        <Text style={styles.footerNote}>Forgot PIN? Contact support.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9997,
    elevation: 9997,
    backgroundColor: '#f3faff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#00450d',
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(27,94,32,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.15)',
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#00450d',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headingHindi: {
    fontSize: 12,
    color: '#717a6d',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    backgroundColor: '#c0c9bb',
  },
  dotFilled: {
    backgroundColor: '#00450d',
    shadowColor: '#acf4a4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  dotError: {
    backgroundColor: '#ba1a1a',
  },
  errorRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 28,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ba1a1a',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: CONTAINER_W,
  },
  keyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c0c9bb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  numBtnPressed: {
    backgroundColor: '#acf4a4',
  },
  backBtnPressed: {
    backgroundColor: '#ffdad6',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#071e27',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#dbf1fe',
    borderRadius: 20,
    marginBottom: 12,
  },
  footerPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#003d65',
  },
  footerNote: {
    fontSize: 12,
    color: '#717a6d',
  },
});
