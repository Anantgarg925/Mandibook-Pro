import React from 'react';
import { View, Text, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';

const UPI_APPS = ['GPay', 'Paytm', 'PhonePe', 'BHIM'];

type FormData = {
  phone1: string;
  phone2: string;
  upiId: string;
  upiApps: string[];
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

export default function Step2_Contact({ data, onChange }: Props) {
  const toggleApp = (app: string) => {
    const current = data.upiApps;
    const next = current.includes(app) ? current.filter((a) => a !== app) : [...current, app];
    onChange({ upiApps: next });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="Primary Phone / मुख्य नंबर" required>
          <TextInput
            testID="phone1-input"
            style={inputStyle}
            placeholder="98XXXXXXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.phone1}
            onChangeText={(v) => onChange({ phone1: v })}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </Field>

        <Field label="Secondary Phone / दूसरा नंबर">
          <TextInput
            testID="phone2-input"
            style={inputStyle}
            placeholder="Optional"
            placeholderTextColor={Colors.textSecond}
            value={data.phone2}
            onChangeText={(v) => onChange({ phone2: v })}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </Field>

        <Field label="UPI ID / Number">
          <TextInput
            testID="upi-id-input"
            style={inputStyle}
            placeholder="name@upi or 98XXXXXXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.upiId}
            onChangeText={(v) => onChange({ upiId: v })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </Field>

        <View style={{ marginBottom: Spacing.md }}>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: 10 }}>
            UPI Apps (select all you accept)
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
            {UPI_APPS.map((app) => {
              const selected = data.upiApps.includes(app);
              return (
                <Pressable
                  key={app}
                  testID={`upi-app-${app}`}
                  onPress={() => toggleApp(app)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: Spacing.md,
                    borderRadius: Radius.sm,
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? Colors.primary : Colors.border,
                    backgroundColor: selected ? '#FFF3E0' : Colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: FontSize.sm,
                      fontWeight: selected ? '700' : '400',
                      color: selected ? Colors.primary : Colors.textSecond,
                    }}
                  >
                    {app}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
