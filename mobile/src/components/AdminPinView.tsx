import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Vibration,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  runOnJS,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

interface Props {
  visible: boolean;
  onHide: () => void;
  onSuccess: () => void;
  onCancel: () => void;
  correctPin?: string;
  onVerifyPin?: (pin: string) => Promise<boolean> | boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleKey({ onPress, children, style, testID, isBack }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.9))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[style, animatedStyle]}
      android_ripple={{ color: isBack ? '#ffdad6' : 'rgba(0,69,13,0.1)', borderless: true, radius: 40 }}
    >
      {children}
    </AnimatedPressable>
  );
}

export function AdminPinView({ visible, onHide, onSuccess, onCancel, correctPin, onVerifyPin }: Props) {
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const opacity = useSharedValue(0);
  const animRef = useRef(false);
  const wasVisible = useRef(false);
  const shakeX = useSharedValue(0);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isSmallHeight = screenHeight < 700;
  const isVerySmallHeight = screenHeight < 600;

  // Bound the keypad width so it doesn't grow too large on wide/tall screens
  // and shrink it on small screens to prevent overlapping with the footer
  let maxW = 340;
  if (isVerySmallHeight) maxW = 240;
  else if (isSmallHeight) maxW = 280;

  const keypadW = Math.min(screenWidth - 32, maxW);
  const keySize = Math.floor((keypadW - 48) / 3);
  const keyFontSize = Math.floor(keySize * 0.4);

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

  const rejectPin = () => {
    setError(true);
    Vibration.vibrate(400);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 55 }),
      withTiming(12, { duration: 55 }),
      withTiming(-12, { duration: 55 }),
      withTiming(12, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
    setTimeout(() => {
      setEntered([]);
      setError(false);
    }, 700);
  };

  const verifyPin = async (pin: string) => {
    const valid = onVerifyPin ? await onVerifyPin(pin) : pin === correctPin;
    if (valid) {
      onSuccess();
    } else {
      rejectPin();
    }
  };

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
      verifyPin(pin).catch(rejectPin);
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
      {/* Background Gradient */}
      <LinearGradient
        colors={['#E6F6FF', '#F3FAFF', '#F3FAFF']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 16 }]}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="shield" size={isVerySmallHeight ? 20 : 24} color="#00450d" />
          <Text style={[styles.headerTitle, isVerySmallHeight && { fontSize: 16 }]}>MandiBook Pro</Text>
        </View>
        <Pressable
          testID="pin-cancel"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelBtn,
            isVerySmallHeight && { width: 36, height: 36 },
            pressed && { backgroundColor: '#E2E8F0' }
          ]}
        >
          <MaterialIcons name="close" size={isVerySmallHeight ? 20 : 22} color="#071e27" />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Upper section */}
        <View style={[styles.upperSection, { marginTop: isSmallHeight ? 8 : 32 }]}>
          {/* Lock icon */}
          <LinearGradient
            colors={['rgba(0,69,13,0.15)', 'rgba(0,69,13,0.05)']}
            style={[styles.lockCircle, isVerySmallHeight && { width: 72, height: 72, marginBottom: 12 }]}
          >
            <MaterialIcons name="lock-outline" size={isVerySmallHeight ? 36 : 48} color="#00450d" />
          </LinearGradient>

          <Text style={[styles.heading, isVerySmallHeight && { fontSize: 22 }]}>Enter Admin PIN</Text>
          <Text style={styles.headingHindi}>एडमिन पिन डालें</Text>

          {/* PIN dots */}
          <Animated.View style={[styles.dotsRow, dotsStyle, { marginTop: isSmallHeight ? 12 : 24 }]}>
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
              <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="error" size={16} color="#ba1a1a" />
                <Text style={styles.errorText}>Wrong PIN / गलत PIN</Text>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* Keypad */}
        <View style={[styles.keypad, { width: keypadW, marginBottom: isSmallHeight ? 0 : 24 }]}>
          {KEYS.map((key, idx) => {
            if (key === '') {
              return (
                <View
                  key={idx}
                  style={{ width: keySize, height: keySize, margin: isVerySmallHeight ? 6 : 8 }}
                />
              );
            }
            if (key === 'back') {
              return (
                <ScaleKey
                  key={idx}
                  testID="pin-backspace"
                  isBack={true}
                  onPress={() => handleKey('back')}
                  style={{ width: keySize, height: keySize, margin: isVerySmallHeight ? 6 : 8 }}
                >
                  <View style={[styles.keyBtn, styles.backBtn, { borderRadius: keySize / 2 }]}>
                    <MaterialIcons name="backspace" size={24} color="#ba1a1a" />
                  </View>
                </ScaleKey>
              );
            }
            return (
              <ScaleKey
                key={idx}
                testID={`pin-key-${key}`}
                onPress={() => handleKey(key)}
                style={{ width: keySize, height: keySize, margin: isVerySmallHeight ? 6 : 8 }}
              >
                <View style={[styles.keyBtn, styles.numBtn, { borderRadius: keySize / 2 }]}>
                  <Text style={[styles.keyText, { fontSize: keyFontSize }]}>{key}</Text>
                </View>
              </ScaleKey>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + (isSmallHeight ? 12 : 24) }]}>
        <View style={styles.footerPill}>
          <MaterialIcons name="fingerprint" size={isVerySmallHeight ? 14 : 16} color="#00450D" />
          <Text
            style={[styles.footerPillText, isVerySmallHeight && { fontSize: 11 }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            Biometric entry available
          </Text>
        </View>
      </View>

      {/* Bottom accent */}
      <LinearGradient
        colors={['#00450d', '#feb300', '#00450d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomAccent}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00450d',
    letterSpacing: -0.3,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  upperSection: {
    alignItems: 'center',
    width: '100%',
  },
  lockCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,69,13,0.1)',
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#00450d',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headingHindi: {
    fontSize: 13,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotEmpty: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dotFilled: {
    backgroundColor: '#00450d',
    shadowColor: '#00450d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dotError: {
    backgroundColor: '#ba1a1a',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  errorRow: {
    height: 32,
    justifyContent: 'center',
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  numBtn: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  keyText: {
    fontWeight: '800',
    color: '#071e27',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  footerPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00450D',
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
    zIndex: 1,
  },
});
