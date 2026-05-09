import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  required,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  required?: boolean;
  testID?: string;
}) {
  return (
    <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
      <Text
        style={{
          fontSize: FontSize.xs,
          fontWeight: '700',
          color: Colors.textSecond,
          marginBottom: 6,
        }}
      >
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecond}
        keyboardType={numeric ? 'phone-pad' : 'default'}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 12,
          fontSize: FontSize.sm,
          color: Colors.text,
          backgroundColor: Colors.surface,
        }}
      />
    </View>
  );
}

export default function EditFirmScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const [form, setForm] = useState({
    firmName: shop?.firmName ?? '',
    ownerName: shop?.ownerName ?? '',
    address: shop?.address ?? '',
    city: shop?.city ?? '',
    phone1: shop?.phone1 ?? '',
    phone2: shop?.phone2 ?? '',
    upiId: shop?.upiId ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const handleSave = async () => {
    if (!form.firmName.trim() || !form.ownerName.trim() || !form.phone1.trim()) {
      Alert.alert('Required Fields', 'Firm Name, Owner Name, and Phone 1 are required.');
      return;
    }
    setSaving(true);
    try {
      await updateShop(form);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
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
        <Pressable testID="firm-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Firm Profile
        </Text>
        <Pressable
          testID="save-firm"
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.round,
            backgroundColor: saving ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
          })}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: Spacing.sm }}>
        <Field
          testID="firm-name"
          label="FIRM NAME / दुकान का नाम"
          value={form.firmName}
          onChange={set('firmName')}
          placeholder="Shri Ram Fruits"
          required
        />
        <Field
          testID="owner-name"
          label="OWNER NAME / मालिक का नाम"
          value={form.ownerName}
          onChange={set('ownerName')}
          placeholder="Ramesh Kumar"
          required
        />
        <Field
          testID="address"
          label="ADDRESS / पता"
          value={form.address}
          onChange={set('address')}
          placeholder="Mandi Gate No. 3"
        />
        <Field
          testID="city"
          label="CITY / शहर"
          value={form.city}
          onChange={set('city')}
          placeholder="Nagpur"
        />
        <Field
          testID="phone1"
          label="PHONE 1 / मोबाइल 1"
          value={form.phone1}
          onChange={set('phone1')}
          placeholder="9876543210"
          numeric
          required
        />
        <Field
          testID="phone2"
          label="PHONE 2 / मोबाइल 2"
          value={form.phone2}
          onChange={set('phone2')}
          placeholder="Optional"
          numeric
        />
        <Field
          testID="upi-id"
          label="UPI ID"
          value={form.upiId}
          onChange={set('upiId')}
          placeholder="name@upi"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
