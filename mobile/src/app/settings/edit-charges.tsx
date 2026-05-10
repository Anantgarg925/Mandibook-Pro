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
import { useShop, type ShopCharges } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { useResponsive } from '@/hooks/useResponsive';

function ChargeRow({
  label,
  hint,
  value,
  onChange,
  testID,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}) {
  const { rowInputWidth } = useResponsive();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.text }}>{label}</Text>
        <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>{hint}</Text>
      </View>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={{
          width: rowInputWidth,
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 8,
          fontSize: FontSize.sm,
          fontWeight: '700',
          color: Colors.text,
          textAlign: 'right',
          backgroundColor: Colors.background,
        }}
      />
    </View>
  );
}

export default function EditChargesScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const c = shop?.charges;
  const [charges, setCharges] = useState({
    apmcCommission: String(c?.apmcCommission ?? 1),
    agentCommission: String(c?.agentCommission ?? 6),
    bardanaPerSack: String(c?.bardanaPerSack ?? 5),
    cartagePerKg: String(c?.cartagePerKg ?? 0),
    telePost: String(c?.telePost ?? 0),
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof typeof charges) => (v: string) =>
    setCharges(prev => ({ ...prev, [field]: v }));

  const handleSave = async () => {
    const parsed: ShopCharges = {
      apmcCommission: parseFloat(charges.apmcCommission) || 0,
      agentCommission: parseFloat(charges.agentCommission) || 0,
      bardanaPerSack: parseFloat(charges.bardanaPerSack) || 0,
      cartagePerKg: parseFloat(charges.cartagePerKg) || 0,
      telePost: parseFloat(charges.telePost) || 0,
    };
    setSaving(true);
    try {
      await updateShop({ charges: parsed });
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
        <Pressable testID="charges-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Charges / कमीशन
        </Text>
        <Pressable
          testID="save-charges"
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

      <ScrollView>
        <ChargeRow
          testID="charge-apmc"
          label="APMC Commission %"
          hint="% of gross"
          value={charges.apmcCommission}
          onChange={set('apmcCommission')}
        />
        <ChargeRow
          testID="charge-agent"
          label="Agent Commission %"
          hint="% of gross (for day book)"
          value={charges.agentCommission}
          onChange={set('agentCommission')}
        />
        <ChargeRow
          testID="charge-bardana"
          label="Bardana / Sack"
          hint="₹ per sack"
          value={charges.bardanaPerSack}
          onChange={set('bardanaPerSack')}
        />
        <ChargeRow
          testID="charge-cartage"
          label="Cartage / kg"
          hint="₹ per kg"
          value={charges.cartagePerKg}
          onChange={set('cartagePerKg')}
        />
        <ChargeRow
          testID="charge-telepost"
          label="Tele & Post"
          hint="Fixed ₹ per day"
          value={charges.telePost}
          onChange={set('telePost')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
