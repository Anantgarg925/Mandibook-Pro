import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

type Props = {
  teamNames: string[];
  onTeamNamesChange: (names: string[]) => void;
  onPinSet: (pin: string) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function Step5_Team({ teamNames, onTeamNamesChange, onPinSet }: Props) {
  const [phase, setPhase] = useState<'set' | 'confirm'>('set');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [pinDone, setPinDone] = useState(false);
  const [error, setError] = useState('');
  const shakeX = useSharedValue(0);

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

  const pressKey = async (key: string) => {
    if (pinDone) return;
    setError('');

    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;

    const next = pin + key;
    setPin(next);

    if (next.length < 4) return;

    if (phase === 'set') {
      setFirstPin(next);
      setPhase('confirm');
      setPin('');
    } else {
      if (next === firstPin) {
        await AsyncStorage.setItem('admin_pin', next);
        setPinDone(true);
        onPinSet(next);
      } else {
        shake();
        setError('PIN मेल नहीं खाया — फिर से कोशिश करें');
        setPhase('set');
        setFirstPin('');
        setPin('');
      }
    }
  };

  const addTeamMember = () => onTeamNamesChange([...teamNames, '']);
  const updateName = (i: number, v: string) => {
    const next = [...teamNames];
    next[i] = v;
    onTeamNamesChange(next);
  };
  const removeName = (i: number) => onTeamNamesChange(teamNames.filter((_, idx) => idx !== i));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>
          Admin PIN सेट करें
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.lg }}>
          {phase === 'set' ? 'नया PIN डालें / Set New PIN' : 'PIN दोबारा डालें / Confirm PIN'}
        </Text>

        {pinDone ? (
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.success,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: Spacing.sm,
              }}
            >
              <Text style={{ fontSize: 32, color: '#FFF' }}>✓</Text>
            </View>
            <Text style={{ fontSize: FontSize.md, color: Colors.success, fontWeight: '700' }}>
              PIN सेट हो गया!
            </Text>
          </View>
        ) : (
          <>
            <Animated.View style={[{ alignItems: 'center', marginBottom: Spacing.lg }, shakeStyle]}>
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: Spacing.md }}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: pin.length > i ? Colors.primary : 'transparent',
                      borderWidth: 2,
                      borderColor: pin.length > i ? Colors.primary : Colors.border,
                    }}
                  />
                ))}
              </View>
              {error ? (
                <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>{error}</Text>
              ) : null}
            </Animated.View>

            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['', '0', 'del'],
              ].map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  {row.map((key, ki) => (
                    <Pressable
                      key={ki}
                      testID={key === 'del' ? 'pin-delete' : key === '' ? undefined : `pin-key-${key}`}
                      onPress={() => pressKey(key)}
                      style={({ pressed }) => ({
                        width: 72,
                        height: 72,
                        borderRadius: Radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                          key === ''
                            ? 'transparent'
                            : pressed
                              ? Colors.border
                              : Colors.surface,
                        borderWidth: key === '' ? 0 : 1,
                        borderColor: Colors.border,
                      })}
                    >
                      {key === 'del' ? (
                        <Delete size={22} color={Colors.text} />
                      ) : key === '' ? null : (
                        <Text style={{ fontSize: FontSize.xl, fontWeight: '600', color: Colors.text }}>
                          {key}
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ marginTop: Spacing.xl }}>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.sm }}>
            Team Members (optional)
          </Text>
          {teamNames.map((name, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <TextInput
                testID={`team-name-${i}`}
                style={{
                  flex: 1,
                  height: 48,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: FontSize.sm,
                  color: Colors.text,
                  backgroundColor: Colors.surface,
                }}
                placeholder={`Member ${i + 1} name`}
                placeholderTextColor={Colors.textSecond}
                value={name}
                onChangeText={(v) => updateName(i, v)}
              />
              <Pressable onPress={() => removeName(i)} style={{ padding: 4 }}>
                <Text style={{ color: Colors.danger, fontSize: FontSize.lg }}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable testID="add-team-member" onPress={addTeamMember} style={{ paddingVertical: Spacing.sm }}>
            <Text style={{ color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              + Add Team Member
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
