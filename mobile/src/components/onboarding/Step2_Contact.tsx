import React, { useRef } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Check } from 'lucide-react-native';
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
  children 
}: { 
  label: string; 
  required?: boolean;
  filled?: boolean;
  children: React.ReactNode 
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

export default function Step2_Contact({ data, onChange }: Props) {
  const phone2Ref = useRef<TextInput>(null);
  const upiIdRef = useRef<TextInput>(null);

  const toggleApp = (app: string) => {
    const current = data.upiApps;
    const next = current.includes(app) ? current.filter((a) => a !== app) : [...current, app];
    onChange({ upiApps: next });
  };

  const handlePhone1Change = (v: string) => {
    onChange({ phone1: v });
    if (v.length === 10) {
      phone2Ref.current?.focus();
    }
  };

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
        <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg }}>
          संपर्क जानकारी / Contact Details
        </Text>

        <Field label="Primary Phone / मुख्य नंबर" required filled={data.phone1.length === 10}>
          <TextInput
            testID="phone1-input"
            style={inputStyle}
            placeholder="98XXXXXXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.phone1}
            onChangeText={handlePhone1Change}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => phone2Ref.current?.focus()}
          />
        </Field>

        <Field label="Secondary Phone / दूसरा नंबर" filled={data.phone2.length === 10}>
          <TextInput
            ref={phone2Ref}
            testID="phone2-input"
            style={inputStyle}
            placeholder="Optional"
            placeholderTextColor={Colors.textSecond}
            value={data.phone2}
            onChangeText={(v) => onChange({ phone2: v })}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
            onSubmitEditing={() => upiIdRef.current?.focus()}
          />
        </Field>

        <Field label="UPI ID / Number" filled={!!data.upiId.trim()}>
          <TextInput
            ref={upiIdRef}
            testID="upi-id-input"
            style={inputStyle}
            placeholder="name@upi या 98XXXXXXXX"
            placeholderTextColor={Colors.textSecond}
            value={data.upiId}
            onChangeText={(v) => onChange({ upiId: v })}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
          />
        </Field>

        <View style={{ marginBottom: Spacing.md }}>
          <Text style={{ fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecond, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            UPI Apps (सभी स्वीकृत ऐप्स चुनें)
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
            {UPI_APPS.map((app) => {
              const selected = data.upiApps.includes(app);
              return (
                <Pressable
                  key={app}
                  testID={`upi-app-${app}`}
                  onPress={() => toggleApp(app)}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    paddingHorizontal: Spacing.md,
                    borderRadius: Radius.sm,
                    borderWidth: selected ? 2 : 1.5,
                    borderColor: selected ? Colors.primary : Colors.border,
                    backgroundColor: selected ? Colors.primaryLight || 'rgba(76, 175, 80, 0.1)' : Colors.surface,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: FontSize.sm,
                      fontWeight: selected ? '700' : '500',
                      color: selected ? Colors.primary : Colors.text,
                    }}
                  >
                    {app}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}
