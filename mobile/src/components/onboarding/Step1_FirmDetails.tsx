import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, FontSize } from '@/lib/theme';

type FormData = {
  firmName: string;
  ownerName: string;
  address: string;
  city: string;
  apmcLicense: string;
  gst: string;
};

type Props = { data: FormData; onChange: (d: Partial<FormData>) => void };

const inputStyle = {
  height: 56,
  borderWidth: 1,
  borderColor: Colors.border,
  borderRadius: 8,
  paddingHorizontal: 16,
  fontSize: FontSize.md,
  backgroundColor: Colors.surface,
  color: Colors.text,
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 6 }}>
        {label}
        {required ? <Text style={{ color: Colors.danger }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export default function Step1_FirmDetails({ data, onChange }: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="Firm Name / फर्म का नाम" required>
          <TextInput
            testID="firm-name-input"
            style={inputStyle}
            placeholder='e.g. "N.P. & Company"'
            placeholderTextColor={Colors.textSecond}
            value={data.firmName}
            onChangeText={(v) => onChange({ firmName: v })}
            autoCorrect={false}
          />
        </Field>

        <Field label="Owner Name / मालिक का नाम" required>
          <TextInput
            testID="owner-name-input"
            style={inputStyle}
            placeholder="e.g. Narayan Prasad"
            placeholderTextColor={Colors.textSecond}
            value={data.ownerName}
            onChangeText={(v) => onChange({ ownerName: v })}
          />
        </Field>

        <Field label="Full Address / पूरा पता" required>
          <TextInput
            testID="address-input"
            style={[inputStyle, { height: 80, paddingTop: 12, textAlignVertical: 'top' }]}
            placeholder="Shop No., Block, Area"
            placeholderTextColor={Colors.textSecond}
            value={data.address}
            onChangeText={(v) => onChange({ address: v })}
            multiline
            numberOfLines={2}
          />
        </Field>

        <Field label="City / Mandi Name" required>
          <TextInput
            testID="city-input"
            style={inputStyle}
            placeholder="e.g. Azadpur Mandi, Delhi"
            placeholderTextColor={Colors.textSecond}
            value={data.city}
            onChangeText={(v) => onChange({ city: v })}
          />
        </Field>

        <Field label="APMC License No. (optional)">
          <TextInput
            testID="apmc-input"
            style={inputStyle}
            placeholder="APMC-XXXX-XXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.apmcLicense}
            onChangeText={(v) => onChange({ apmcLicense: v })}
            autoCapitalize="characters"
          />
        </Field>

        <Field label="GST Number (optional)">
          <TextInput
            testID="gst-input"
            style={inputStyle}
            placeholder="27AAAAA0000A1Z5"
            placeholderTextColor={Colors.textSecond}
            value={data.gst}
            onChangeText={(v) => onChange({ gst: v })}
            autoCapitalize="characters"
          />
        </Field>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
