import React from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Colors, Spacing, FontSize } from '@/lib/theme';
import type { ShopCharges } from '@/context/ShopContext';

type Props = { charges: ShopCharges; onChange: (c: Partial<ShopCharges>) => void };

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

function ChargeField({
  label,
  hint,
  value,
  onChange,
  suffix,
  testID,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  testID: string;
}) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, flex: 1 }}>{label}</Text>
        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginLeft: 8 }}>{suffix}</Text>
      </View>
      <TextInput
        testID={testID}
        style={inputStyle}
        value={value === 0 ? '' : String(value)}
        onChangeText={(v) => {
          const n = parseFloat(v);
          onChange(isNaN(n) ? 0 : n);
        }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={Colors.border}
      />
      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, marginTop: 4, lineHeight: 16 }}>
        {hint}
      </Text>
    </View>
  );
}

export default function Step4_Charges({ charges, onChange }: Props) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={96}
        extraKeyboardSpace={16}
        disableScrollOnKeyboardHide
      >
        <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>
          दर और कमीशन
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.lg }}>
          Rates & Commission — these apply to every bill by default
        </Text>

        <ChargeField
          testID="apmc-commission-input"
          label="APMC Commission / मंडी शुल्क"
          suffix="%"
          value={charges.apmcCommission}
          onChange={(v) => onChange({ apmcCommission: v })}
          hint="मंडी शुल्क — सरकार द्वारा निर्धारित कमीशन जो APMC को जाता है"
        />

        <ChargeField
          testID="agent-commission-input"
          label="Agent Commission / आढ़त"
          suffix="%"
          value={charges.agentCommission}
          onChange={(v) => onChange({ agentCommission: v })}
          hint="आढ़त — आढ़तिये का कमीशन जो माल बिकवाने पर मिलता है"
        />

        <ChargeField
          testID="bardana-input"
          label="Bardana per Sack / बर्दाना प्रति बोरा"
          suffix="₹"
          value={charges.bardanaPerSack}
          onChange={(v) => onChange({ bardanaPerSack: v })}
          hint="बर्दाना — बोरे की कीमत जो किसान या आढ़तिये से ली जाती है"
        />

        <ChargeField
          testID="cartage-input"
          label="Cartage per kg / ढुलाई प्रति किलो"
          suffix="₹/kg"
          value={charges.cartagePerKg}
          onChange={(v) => onChange({ cartagePerKg: v })}
          hint="ढुलाई — माल मंडी में लाने की गाड़ी भाड़ा (0 if not applicable)"
        />

        <ChargeField
          testID="tele-post-input"
          label="Tele & Post per consignment"
          suffix="₹"
          value={charges.telePost}
          onChange={(v) => onChange({ telePost: v })}
          hint="तार व डाक — प्रति खेप संचार खर्च (0 if not applicable)"
        />
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}
