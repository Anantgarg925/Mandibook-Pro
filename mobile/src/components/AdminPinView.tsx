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

  const { width: screenWidth } = useWindowDimensions();
  const keypadW = screenWidth - 32;
  const keySize = Math.floor((keypadW - 48) / 3);
  const keyFontSize = Math.floor(keySize * 0.42);

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
        <Pressable
          testID="pin-cancel"
          onPress={onCancel}
          style={styles.cancelBtn}
        >
          <MaterialIcons name="close" size={20} color="#41493e" />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Upper section */}
        <View style={styles.upperSection}>
          {/* Lock icon */}
          <View style={styles.lockCircle}>
            <MaterialIcons name="lock" size={52} color="#00450d" />
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
        </View>

        {/* Keypad */}
        <View style={[styles.keypad, { width: keypadW }]}>
          {KEYS.map((key, idx) => {
            if (key === '') {
              return (
                <View
                  key={idx}
                  style={{ width: keySize, height: keySize, margin: 8 }}
                />
              );
            }
            if (key === 'back') {
              return (
                <Pressable
                  key={idx}
                  testID="pin-backspace"
                  onPress={() => handleKey('back')}
                  style={{ width: keySize, height: keySize, margin: 8 }}
                  android_ripple={{ color: '#ffdad6', borderless: true, radius: keySize / 2 }}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.keyBtn,
                        { width: keySize, height: keySize, borderRadius: keySize / 2 },
                        pressed && styles.backBtnPressed,
                      ]}
                    >
                      <MaterialIcons name="backspace" size={28} color="#ba1a1a" />
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
                style={{ width: keySize, height: keySize, margin: 8 }}
                android_ripple={{ color: '#acf4a4', borderless: true, radius: keySize / 2 }}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.keyBtn,
                      styles.numBtn,
                      { width: keySize, height: keySize, borderRadius: keySize / 2 },
                      pressed && styles.numBtnPressed,
                    ]}
                  >
                    <Text style={[styles.keyText, { fontSize: keyFontSize }]}>{key}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerPill}>
          <MaterialIcons name="fingerprint" size={15} color="#003d65" />
          <Text style={styles.footerPillText}>Biometric entry available</Text>
        </View>
        <Text style={styles.footerNote}>Forgot PIN? Contact support.</Text>
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
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8eceb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
  },
  upperSection: {
    alignItems: 'center',
  },
  lockCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(0,69,13,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00450d',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headingHindi: {
    fontSize: 13,
    color: '#717a6d',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  dotEmpty: {
    backgroundColor: '#c0c9bb',
  },
  dotFilled: {
    backgroundColor: '#00450d',
    shadowColor: '#feb300',
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
  },
  keyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c0c9bb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  numBtnPressed: {
    backgroundColor: '#e8f5e9',
  },
  backBtnPressed: {
    backgroundColor: '#ffdad6',
  },
  keyText: {
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
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.6,
    zIndex: 1,
  },
});
