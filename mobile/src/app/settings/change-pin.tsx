import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

function PinInput({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  return (
    <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.md }}>
      <Text
        style={{
          fontSize: FontSize.xs,
          fontWeight: '700',
          color: Colors.textSecond,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 14,
          fontSize: FontSize.xl,
          fontWeight: '800',
          color: Colors.text,
          letterSpacing: 8,
          textAlign: 'center',
          backgroundColor: Colors.surface,
        }}
      />
    </View>
  );
}

export default function ChangePinScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (currentPin !== shop?.adminPin) {
      Alert.alert('Wrong PIN', 'Current PIN is incorrect.');
      return;
    }
    if (newPin.length < 4) {
      Alert.alert('Too Short', 'New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PINs do not match.');
      return;
    }
    setSaving(true);
    try {
      await updateShop({ adminPin: newPin });
      Alert.alert('Done', 'PIN changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable testID="pin-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Change PIN
        </Text>
      </View>

      <View style={{ padding: Spacing.md }}>
        <PinInput
          testID="current-pin"
          label="CURRENT PIN"
          value={currentPin}
          onChange={setCurrentPin}
        />
        <PinInput testID="new-pin" label="NEW PIN" value={newPin} onChange={setNewPin} />
        <PinInput
          testID="confirm-pin"
          label="CONFIRM NEW PIN"
          value={confirmPin}
          onChange={setConfirmPin}
        />

        <Pressable
          testID="save-pin"
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: Radius.sm,
            backgroundColor: saving ? Colors.border : pressed ? '#E55A00' : Colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: Spacing.md,
          })}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: '#FFF' }}>
              Change PIN
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
