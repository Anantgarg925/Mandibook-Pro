import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Check } from 'lucide-react-native';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

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
  borderWidth: 1.5,
  borderColor: Colors.border,
  borderRadius: Radius.sm,
  paddingHorizontal: 16,
  paddingRight: 48,
  fontSize: FontSize.md,
  backgroundColor: Colors.surface,
  color: Colors.text,
};

function Field({
  label,
  required,
  filled,
  children,
}: {
  label: string;
  required?: boolean;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
        {required ? <Text style={{ color: Colors.danger }}> *</Text> : null}
      </Text>
      <View style={{ position: 'relative' }}>
        {children}
        {filled ? (
          <View style={{ position: 'absolute', right: 16, top: 16, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={20} color={Colors.success} strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function Step1_FirmDetails({ data, onChange }: Props) {
  const ownerNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const apmcLicenseRef = useRef<TextInput>(null);
  const gstRef = useRef<TextInput>(null);

  const handleFirmNameFilled = (text: string) => {
    onChange({ firmName: text });
  };

  const handleOwnerNameFilled = (text: string) => {
    onChange({ ownerName: text });
  };

  const handleAddressFilled = (text: string) => {
    onChange({ address: text });
  };

  const handleCityFilled = (text: string) => {
    onChange({ city: text });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={96}
        extraKeyboardSpace={16}
        disableScrollOnKeyboardHide
      >
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg }}>
          फर्म की जानकारी / Firm Details
        </Text>

        <Field label="Firm Name / फर्म का नाम" required filled={!!data.firmName.trim()}>
          <TextInput
            testID="firm-name-input"
            style={inputStyle}
            placeholder='e.g. "N.P. & Company"'
            placeholderTextColor={Colors.textSecond}
            value={data.firmName}
            onChangeText={handleFirmNameFilled}
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => ownerNameRef.current?.focus()}
          />
        </Field>

        <Field label="Owner Name / मालिक का नाम" required filled={!!data.ownerName.trim()}>
          <TextInput
            ref={ownerNameRef}
            testID="owner-name-input"
            style={inputStyle}
            placeholder="e.g. Narayan Prasad"
            placeholderTextColor={Colors.textSecond}
            value={data.ownerName}
            onChangeText={handleOwnerNameFilled}
            returnKeyType="next"
            onSubmitEditing={() => addressRef.current?.focus()}
          />
        </Field>

        <Field label="Full Address / पूरा पता" required filled={!!data.address.trim()}>
          <TextInput
            ref={addressRef}
            testID="address-input"
            style={[inputStyle, { height: 80, paddingTop: 12, paddingRight: 16, textAlignVertical: 'top' }]}
            placeholder="Shop No., Block, Area"
            placeholderTextColor={Colors.textSecond}
            value={data.address}
            onChangeText={handleAddressFilled}
            multiline
            numberOfLines={2}
            returnKeyType="next"
            onSubmitEditing={() => cityRef.current?.focus()}
          />
        </Field>

        <Field label="City / Mandi Name" required filled={!!data.city.trim()}>
          <TextInput
            ref={cityRef}
            testID="city-input"
            style={inputStyle}
            placeholder="e.g. Azadpur Mandi, Delhi"
            placeholderTextColor={Colors.textSecond}
            value={data.city}
            onChangeText={handleCityFilled}
            returnKeyType="next"
            onSubmitEditing={() => apmcLicenseRef.current?.focus()}
          />
        </Field>

        <Field label="APMC License No. (optional)" filled={!!data.apmcLicense.trim()}>
          <TextInput
            ref={apmcLicenseRef}
            testID="apmc-input"
            style={inputStyle}
            placeholder="APMC-XXXX-XXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.apmcLicense}
            onChangeText={(v) => onChange({ apmcLicense: v })}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => gstRef.current?.focus()}
          />
        </Field>

        <Field label="GST Number (optional)" filled={!!data.gst.trim()}>
          <TextInput
            ref={gstRef}
            testID="gst-input"
            style={inputStyle}
            placeholder="27AAAAA0000A1Z5"
            placeholderTextColor={Colors.textSecond}
            value={data.gst}
            onChangeText={(v) => onChange({ gst: v })}
            autoCapitalize="characters"
            returnKeyType="done"
          />
        </Field>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}
