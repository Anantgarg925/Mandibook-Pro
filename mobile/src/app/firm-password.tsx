import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { markFirmUnlocked } from '@/lib/firmAccess';
import { resetToRoute } from '@/utils/navigation';

export default function FirmPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { shop } = useShop();
  const { setLaunchComplete } = useLaunch();
  const params = useLocalSearchParams<{ shopId?: string; mode?: 'setup' | 'unlock'; phone?: string; pin?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [current, setCurrent] = useState('');
  const [loading, setLoading] = useState(false);
  const isSetup = params.mode === 'setup';
  const shopId = params.shopId || shop?.shopId || '';

  const title = useMemo(() => isSetup ? 'Set Firm Password' : 'Enter Firm Password', [isSetup]);

  const goBack = () => {
    setLaunchComplete(false);
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/admin-login' } as any);
  };

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  const handleSave = async () => {
    if (!shopId) return;
    if (password.length < 8) return Alert.alert('Password too short', 'Use at least 8 characters.');
    if (isSetup && password !== confirm) return Alert.alert('Mismatch', 'Passwords do not match.');
    setLoading(true);
    try {
      if (isSetup) {
        await supabase.rpc('set_shop_firm_password', {
          p_shop_id: shopId,
          p_new_password: password,
          p_current_password: current || null,
        });
      } else {
        const { data, error } = await supabase.rpc('verify_shop_firm_password', {
          p_shop_id: shopId,
          p_password: password,
        });
        if (error || data !== true) throw new Error('Invalid password');
      }
      await markFirmUnlocked(shopId);
      setLaunchComplete(true);
      resetToRoute(router, '/');
    } catch (err) {
      Alert.alert('Firm Password', err instanceof Error ? err.message : 'Could not verify password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md }}>
          <Pressable onPress={goBack} style={{ padding: 6, marginRight: 8 }}>
            <ArrowLeft size={22} color={Colors.text} />
          </Pressable>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>{title}</Text>
        </View>
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
          <Text style={{ color: Colors.textSecond, fontSize: FontSize.sm, lineHeight: 20 }}>
            {isSetup
              ? 'Create a firm password for this device family. After it is unlocked once on a device, phone + PIN will be enough there.'
              : 'Enter the firm password once on this device to unlock access. After that, normal phone + PIN login will be enough here.'}
          </Text>
          {isSetup ? (
            <TextInput
              value={current}
              onChangeText={setCurrent}
              placeholder="Current password (optional)"
              placeholderTextColor={Colors.textSecond}
              secureTextEntry
              style={field}
            />
          ) : null}
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={isSetup ? 'New firm password' : 'Firm password'}
            placeholderTextColor={Colors.textSecond}
            secureTextEntry
            style={field}
          />
          {isSetup ? (
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textSecond}
              secureTextEntry
              style={field}
            />
          ) : null}
          <Pressable
            onPress={handleSave}
            disabled={loading || !password}
            style={{
              height: 54,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: loading || !password ? '#D1D5DB' : Colors.primary,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: FontSize.md }}>
              {loading ? 'Checking...' : isSetup ? 'Save Password' : 'Unlock Firm'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const field = {
  minHeight: 54,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: Radius.md,
  paddingHorizontal: Spacing.md,
  backgroundColor: Colors.surface,
  color: Colors.text,
};
