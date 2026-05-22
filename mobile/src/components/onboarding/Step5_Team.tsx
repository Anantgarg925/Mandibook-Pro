import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Check, AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

type Props = {
  teamNames: string[];
  onTeamNamesChange: (names: string[]) => void;
  onPinSet: (pin: string) => void;
  ownerName?: string;
};

export default function Step5_Team({ teamNames, onTeamNamesChange, onPinSet, ownerName = '' }: Props) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinDone, setPinDone] = useState(false);
  const [error, setError] = useState('');
  const shakeX = useSharedValue(0);
  const pinInputRef = useRef<TextInput>(null);
  const confirmPinInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const handlePinChange = (value: string) => {
    setError('');
    // Allow only numbers, max 4 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericValue);
  };

  const handleConfirmPinChange = (value: string) => {
    setError('');
    // Allow only numbers, max 4 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    setConfirmPin(numericValue);
  };

  const validateAndSetPin = () => {
    if (pin.length < 4) {
      setError('PIN कम से कम 4 अंकों का होना चाहिए');
      shake();
      return;
    }
    if (confirmPin.length < 4) {
      setError('पुष्टि PIN कम से कम 4 अंकों का होना चाहिए');
      shake();
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN मेल नहीं खाया — फिर से कोशिश करें');
      shake();
      setPin('');
      setConfirmPin('');
      pinInputRef.current?.focus();
      return;
    }
    setPinDone(true);
    onPinSet(pin);
    
    // Auto-fill first team member with owner name
    if (ownerName.trim() && (!teamNames || teamNames.length === 0)) {
      onTeamNamesChange([ownerName]);
    }
    
    // Auto-scroll to team members section
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 500);
  };

  const addTeamMember = () => onTeamNamesChange([...teamNames, '']);
  const updateName = (i: number, v: string) => {
    const next = [...teamNames];
    next[i] = v;
    onTeamNamesChange(next);
  };
  const removeName = (i: number) => onTeamNamesChange(teamNames.filter((_, idx) => idx !== i));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' }}>
          {!pinDone && (
            <>
              <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'center' }}>
                Admin PIN सेट करें
              </Text>
              <Text style={{ fontSize: FontSize.md, color: Colors.textSecond, marginBottom: Spacing.xl, textAlign: 'center' }}>
                4-अंकीय PIN डालें और पुष्टि करें
              </Text>

              <Animated.View style={[{ width: '100%', marginBottom: Spacing.xl }, shakeStyle]}>
                {/* PIN Input */}
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm }}>
                    PIN
                  </Text>
                  <TextInput
                    ref={pinInputRef}
                    placeholder="0000"
                    placeholderTextColor={Colors.textSecond}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={pin}
                    onChangeText={handlePinChange}
                    editable={!pinDone}
                    style={{
                      height: 56,
                      borderWidth: 2,
                      borderColor: pin.length === 4 ? Colors.success : Colors.border,
                      borderRadius: Radius.md,
                      paddingHorizontal: Spacing.md,
                      fontSize: FontSize.lg,
                      fontWeight: '600',
                      color: Colors.text,
                      backgroundColor: Colors.surface,
                      textAlign: 'center',
                      letterSpacing: 12,
                    }}
                  />
                </View>

                {/* Confirm PIN Input */}
                <View style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm }}>
                    PIN पुष्टि करें
                  </Text>
                  <TextInput
                    ref={confirmPinInputRef}
                    placeholder="0000"
                    placeholderTextColor={Colors.textSecond}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    value={confirmPin}
                    onChangeText={handleConfirmPinChange}
                    editable={!pinDone}
                    style={{
                      height: 56,
                      borderWidth: 2,
                      borderColor: confirmPin.length === 4 ? Colors.success : Colors.border,
                      borderRadius: Radius.md,
                      paddingHorizontal: Spacing.md,
                      fontSize: FontSize.lg,
                      fontWeight: '600',
                      color: Colors.text,
                      backgroundColor: Colors.surface,
                      textAlign: 'center',
                      letterSpacing: 12,
                    }}
                  />
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, backgroundColor: '#FFEBEE', padding: Spacing.md, borderRadius: Radius.sm }}>
                    <AlertCircle size={20} color={Colors.danger} strokeWidth={2} />
                    <Text style={{ color: Colors.danger, fontSize: FontSize.sm, fontWeight: '600', flex: 1 }}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Save PIN Button */}
                <Pressable
                  onPress={validateAndSetPin}
                  disabled={pin.length < 4 || confirmPin.length < 4}
                  style={({ pressed }) => ({
                    paddingVertical: Spacing.md,
                    paddingHorizontal: Spacing.lg,
                    backgroundColor: pin.length === 4 && confirmPin.length === 4 && !pressed ? Colors.primary : pin.length === 4 && confirmPin.length === 4 ? Colors.primaryLight || 'rgba(27, 94, 32, 0.8)' : '#E5E7EB',
                    borderRadius: Radius.md,
                    alignItems: 'center',
                    opacity: pressed && pin.length === 4 && confirmPin.length === 4 ? 0.9 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: FontSize.md,
                      fontWeight: '700',
                      color: pin.length === 4 && confirmPin.length === 4 ? '#FFF' : Colors.textSecond,
                    }}
                  >
                    PIN सेट करें
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          )}

          {pinDone ? (
            <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: Colors.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: Spacing.lg,
                }}
              >
                <Check size={40} color="#FFF" strokeWidth={3} />
              </View>
              <Text style={{ fontSize: FontSize.lg, color: Colors.success, fontWeight: '700', textAlign: 'center' }}>
                PIN सेट हो गया!
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: Spacing.sm, textAlign: 'center' }}>
                अब आप अगले स्टेप पर जा सकते हैं
              </Text>
            </View>
          ) : null}

        {/* Team Members Section */}
        {pinDone ? (
          <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xl, marginTop: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              टीम सदस्य (वैकल्पिक)
            </Text>
            {teamNames.map((name, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
                <TextInput
                  testID={`team-name-${i}`}
                  style={{
                    flex: 1,
                    height: 48,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: Radius.sm,
                    paddingHorizontal: Spacing.md,
                    fontSize: FontSize.sm,
                    color: Colors.text,
                    backgroundColor: Colors.surface,
                  }}
                  placeholder={`सदस्य ${i + 1}`}
                  placeholderTextColor={Colors.textSecond}
                  value={name}
                  onChangeText={(v) => updateName(i, v)}
                />
                <Pressable onPress={() => removeName(i)} style={{ padding: Spacing.sm }}>
                  <Text style={{ color: Colors.danger, fontSize: 24, fontWeight: '300' }}>−</Text>
                </Pressable>
              </View>
            ))}
            <Pressable testID="add-team-member" onPress={addTeamMember} style={{ paddingVertical: Spacing.sm }}>
              <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
                + टीम सदस्य जोड़ें
              </Text>
            </Pressable>
          </View>
        ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
