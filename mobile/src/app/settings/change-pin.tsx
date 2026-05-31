import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

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
  const { shop, cacheShop } = useShop();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!shop?.shopId) {
      Alert.alert('Error', 'Shop is not loaded.');
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
      const { error } = await supabase.rpc('set_shop_admin_pin', {
        p_shop_id: shop.shopId,
        p_new_pin: newPin,
        p_current_pin: currentPin,
      });
      if (error) throw new Error(error.message);
      await cacheShop({ ...shop, adminPin: '' });
      Alert.alert('Done', 'PIN changed successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not save PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="pin-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Change PIN
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 112 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraKeyboardSpace={16}
        disableScrollOnKeyboardHide
      >
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
            backgroundColor: saving ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: Spacing.md,
            marginTop: Spacing.md,
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
