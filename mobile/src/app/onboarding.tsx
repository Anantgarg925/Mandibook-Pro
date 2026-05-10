import React, { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useShop, DEFAULT_SHOP } from '@/context/ShopContext';
import type { Grade, ShopCharges, ShopData } from '@/context/ShopContext';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';
import Step1_FirmDetails from '@/components/onboarding/Step1_FirmDetails';
import Step2_Contact from '@/components/onboarding/Step2_Contact';
import Step3_Grades from '@/components/onboarding/Step3_Grades';
import Step4_Charges from '@/components/onboarding/Step4_Charges';
import Step5_Team from '@/components/onboarding/Step5_Team';

const STEP_TITLES = [
  'Firm Details',
  'Contact & UPI',
  'Grades / ग्रेडिंग',
  'Rates / दरें',
  'Team & PIN',
];

type FormState = {
  firmName: string;
  ownerName: string;
  address: string;
  city: string;
  apmcLicense: string;
  gst: string;
  phone1: string;
  phone2: string;
  upiId: string;
  upiApps: string[];
  grades: Grade[];
  charges: ShopCharges;
  teamNames: string[];
  adminPin: string;
};

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <React.Fragment key={i}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? Colors.success : active ? Colors.primary : 'transparent',
                borderWidth: done || active ? 0 : 1.5,
                borderColor: Colors.border,
              }}
            >
              {done ? (
                <Check size={16} color="#FFF" strokeWidth={3} />
              ) : (
                <Text
                  style={{
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                    color: active ? '#FFF' : Colors.textSecond,
                  }}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {i < total - 1 ? (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: done ? Colors.success : Colors.border,
                }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { saveShop } = useShop();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    firmName: '',
    ownerName: '',
    address: '',
    city: '',
    apmcLicense: '',
    gst: '',
    phone1: '',
    phone2: '',
    upiId: '',
    upiApps: [],
    grades: DEFAULT_SHOP.grades,
    charges: DEFAULT_SHOP.charges,
    teamNames: [],
    adminPin: '',
  });

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }));

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!(form.firmName.trim() && form.ownerName.trim() && form.address.trim() && form.city.trim());
      case 1:
        return !!form.phone1.trim();
      case 2:
        return form.grades.length >= 1 && form.grades.every((g) => g.code.trim());
      case 3:
        return true;
      case 4:
        return !!form.adminPin;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    const shopId = `shop_${Date.now()}`;
    const shopData: ShopData = {
      shopId,
      firmName: form.firmName,
      ownerName: form.ownerName,
      address: form.address,
      city: form.city,
      phone1: form.phone1,
      phone2: form.phone2,
      upiId: form.upiId,
      upiApps: form.upiApps,
      commodity: 'Mosambi',
      grades: form.grades,
      charges: form.charges,
      adminPin: form.adminPin,
      teamNames: form.teamNames,
      createdAt: Date.now(),
    };
    await saveShop(shopData);
    setSaving(false);
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    if (step === 0) return;
    setStep((s) => s - 1);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ProgressBar step={step} total={5} />

      <Text
        style={{
          fontSize: FontSize.lg,
          fontWeight: '700',
          color: Colors.text,
          paddingHorizontal: Spacing.lg,
          paddingBottom: Spacing.sm,
        }}
      >
        {STEP_TITLES[step]}
      </Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {step === 0 ? (
          <Step1_FirmDetails
            data={form}
            onChange={(d) => patch(d)}
          />
        ) : step === 1 ? (
          <Step2_Contact
            data={form}
            onChange={(d) => patch(d)}
          />
        ) : step === 2 ? (
          <Step3_Grades
            grades={form.grades}
            onChange={(grades) => patch({ grades })}
          />
        ) : step === 3 ? (
          <Step4_Charges
            charges={form.charges}
            onChange={(c) => patch({ charges: { ...form.charges, ...c } })}
          />
        ) : (
          <Step5_Team
            teamNames={form.teamNames}
            onTeamNamesChange={(teamNames) => patch({ teamNames })}
            onPinSet={(adminPin) => patch({ adminPin })}
          />
        )}
      </KeyboardAvoidingView>

      <View
        style={{
          flexDirection: 'row',
          gap: Spacing.sm,
          padding: Spacing.lg,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        }}
      >
        {step > 0 ? (
          <Pressable
            testID="back-button"
            onPress={handleBack}
            style={{
              flex: 1,
              height: 56,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: Colors.surface,
            }}
          >
            <Text style={{ fontSize: FontSize.md, color: Colors.textSecond, fontWeight: '600' }}>
              Back
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          testID="next-button"
          onPress={handleNext}
          disabled={!canProceed() || saving}
          style={{
            flex: 2,
            height: 56,
            borderRadius: Radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: canProceed() && !saving ? Colors.primary : Colors.border,
          }}
        >
          <Text style={{ fontSize: FontSize.md, color: '#FFF', fontWeight: '700' }}>
            {saving ? 'Saving…' : step === 4 ? 'Finish Setup ✓' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
