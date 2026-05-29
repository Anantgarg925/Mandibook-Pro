import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Vibration,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PIN_LENGTH = 4;

interface Props {
  visible: boolean;
  onHide: () => void;
  onSuccess: () => void;
  onCancel: () => void;
  correctPin?: string;
  onVerifyPin?: (pin: string) => Promise<boolean> | boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AdminPinView({ visible, onHide, onSuccess, onCancel, correctPin, onVerifyPin }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const opacity = useSharedValue(0);
  const animRef = useRef(false);
  const wasVisible = useRef(false);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      animRef.current = false;
      setEntered('');
      setError(false);
      setVerifying(false);
      opacity.value = withTiming(1, { duration: 380 });
      setTimeout(() => inputRef.current?.focus(), 250);
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
    setVerifying(false);
    Vibration.vibrate(400);
    shakeX.value = withSequence(
      withTiming(-12, { duration: 55 }),
      withTiming(12, { duration: 55 }),
      withTiming(-12, { duration: 55 }),
      withTiming(12, { duration: 55 }),
      withTiming(0, { duration: 55 }),
    );
    setTimeout(() => {
      setEntered('');
      setError(false);
      inputRef.current?.focus();
    }, 700);
  };

  const verifyPin = async (pin: string) => {
    setVerifying(true);
    const valid = onVerifyPin ? await onVerifyPin(pin) : pin === correctPin;
    if (valid) {
      onSuccess();
    } else {
      rejectPin();
    }
  };

  const handlePinChange = (value: string) => {
    if (verifying) return;
    if (error) setError(false);
    const next = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setEntered(next);

    if (next.length === PIN_LENGTH) verifyPin(next).catch(rejectPin);
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
          <MaterialIcons name="shield" size={24} color="#00450d" />
          <Text style={styles.headerTitle}>MandiBook Pro</Text>
        </View>
        <Pressable
          testID="pin-cancel"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && { backgroundColor: '#E2E8F0' }
          ]}
        >
          <MaterialIcons name="close" size={22} color="#071e27" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        {/* Upper section */}
        <View style={styles.upperSection}>
          {/* Lock icon */}
          <LinearGradient
            colors={['rgba(0,69,13,0.15)', 'rgba(0,69,13,0.05)']}
            style={styles.lockCircle}
          >
            <MaterialIcons name="lock-outline" size={48} color="#00450d" />
          </LinearGradient>

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
              <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="error" size={16} color="#ba1a1a" />
                <Text style={styles.errorText}>Wrong PIN / गलत PIN</Text>
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            testID="admin-pin-native-input"
            value={entered}
            onChangeText={handlePinChange}
            editable={!verifying}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            secureTextEntry
            maxLength={PIN_LENGTH}
            caretHidden
            autoFocus={visible}
            style={styles.nativeInput}
          />
          <AnimatedPressable
            testID="pin-keyboard-focus"
            onPress={() => inputRef.current?.focus()}
            style={styles.keyboardButton}
            android_ripple={{ color: 'rgba(0,69,13,0.08)' }}
          >
            <MaterialIcons name="keyboard" size={20} color="#00450d" />
            <Text style={styles.keyboardButtonText}>
              {verifying ? 'Checking PIN...' : 'Use phone keyboard'}
            </Text>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]} />

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
    marginTop: 32,
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
    marginTop: 24,
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
  inputWrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: 24,
  },
  nativeInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  keyboardButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keyboardButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00450d',
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
