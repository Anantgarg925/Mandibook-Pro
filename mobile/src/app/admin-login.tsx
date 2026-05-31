import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';
import { mapShop, supabase } from '@/lib/supabase';
import { isFirmUnlocked } from '@/lib/firmAccess';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';
import { APP_SESSION_KEY } from '@/lib/session';
import { resetToRoute } from '@/utils/navigation';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { cacheShop } = useShop();
  const { setLaunchComplete } = useLaunch();
  const insets = useSafeAreaInsets();
  
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizePhone = (value: string) => value.replace(/\D/g, '');

  const goBack = () => {
    setLaunchComplete(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: '/', params: { access: 'choose' } } as any);
    }
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const handleAdminLogin = async () => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length !== 10) {
      setError('कृपया 10 अंकों का सही फोन नंबर डालें।');
      return;
    }
    if (!pin || pin.length < 4) {
      setError('कृपया 4-अंकीय Admin PIN डालें।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify admin PIN and get shop data in one call
      const { data: loginResult, error: loginError } = await supabase.rpc(
        'verify_member_login',
        {
          p_phone: cleaned,
          p_pin: pin,
        }
      );

      if (loginError || !loginResult) {
        setError('फोन या PIN गलत है। फिर से कोशिश करें।');
        setLoading(false);
        return;
      }

      // Check if user is admin
      if (!loginResult.is_admin) {
        setError('यह खाता Admin नहीं है।');
        setLoading(false);
        return;
      }

      // Success! Load shop and create session
      const shop = mapShop(loginResult.shop as Record<string, unknown>);
      await cacheShop(shop);
      const unlocked = await isFirmUnlocked(shop.shopId);

      const session = {
        id: shop.shopId,
        name: shop.ownerName,
        phone: shop.phone1,
        role: 'ADMIN',
        sessionToken: '', // Not needed for local admin
      };

      await AsyncStorage.setItem(APP_SESSION_KEY, JSON.stringify(session));
      if (!unlocked) {
        setLaunchComplete(false);
        router.push({
          pathname: '/firm-password',
          params: { shopId: shop.shopId, mode: loginResult.firm_password_set ? 'unlock' : 'setup' },
        } as any);
        return;
      }
      setLaunchComplete(true);
      resetToRoute(router, '/');
    } catch (err) {
      console.error('[Admin Login]', err);
      setError('लॉगिन विफल। इंटरनेट कनेक्शन चेक करें और दोबारा कोशिश करें।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: Spacing.lg,
            paddingBottom: Math.max(Spacing.lg, insets.bottom),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: Spacing.xl,
            }}
          >
            <Pressable onPress={goBack} style={{ padding: Spacing.sm, marginRight: Spacing.sm }}>
              <ArrowLeft size={24} color={Colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
                Admin Login
              </Text>
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
                एडमिन के लिए नई दुकान एक्सेस करें
              </Text>
            </View>
          </View>

          {/* Welcome Message */}
          <View
            style={{
              backgroundColor: '#E8F5E9',
              padding: Spacing.lg,
              borderRadius: Radius.lg,
              marginBottom: Spacing.xl,
              borderLeftWidth: 4,
              borderLeftColor: Colors.success,
            }}
          >
            <Text style={{ fontSize: FontSize.sm, color: Colors.success, fontWeight: '600', lineHeight: 20 }}>
              एक नई डिवाइस पर अपनी दुकान से जुड़ने के लिए अपना फोन नंबर और Admin PIN दर्ज करें।
            </Text>
          </View>

          {/* Phone Input */}
          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm }}>
              Phone Number (दुकान का फोन)
            </Text>
            <TextInput
              placeholder="10-digit number"
              placeholderTextColor={Colors.textSecond}
              keyboardType="phone-pad"
              maxLength={15}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setError('');
              }}
              editable={!loading}
              style={{
                height: 56,
                borderWidth: 2,
                borderColor: error && !phone ? Colors.danger : Colors.border,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.md,
                fontSize: FontSize.md,
                color: Colors.text,
                backgroundColor: Colors.surface,
              }}
            />
          </View>

          {/* PIN Input */}
          <View style={{ marginBottom: Spacing.xl }}>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm }}>
              Admin PIN
            </Text>
            <TextInput
              placeholder="0000"
              placeholderTextColor={Colors.textSecond}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(v) => {
                setPin(v.replace(/[^0-9]/g, ''));
                setError('');
              }}
              editable={!loading}
              style={{
                height: 56,
                borderWidth: 2,
                borderColor: error && !pin ? Colors.danger : Colors.border,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.md,
                fontSize: FontSize.md,
                color: Colors.text,
                backgroundColor: Colors.surface,
                textAlign: 'center',
                letterSpacing: 12,
              }}
            />
          </View>

          {/* Error Message */}
          {error ? (
            <View
              style={{
                backgroundColor: '#FFEBEE',
                padding: Spacing.md,
                borderRadius: Radius.sm,
                marginBottom: Spacing.lg,
                borderLeftWidth: 4,
                borderLeftColor: Colors.danger,
              }}
            >
              <Text style={{ fontSize: FontSize.sm, color: Colors.danger, fontWeight: '600' }}>
                ⚠ {error}
              </Text>
            </View>
          ) : null}

          {/* Login Button */}
          <Pressable
            onPress={handleAdminLogin}
            disabled={loading || !phone || !pin}
            style={({ pressed }) => ({
              opacity: pressed && !loading && phone && pin ? 0.8 : 1,
            })}
          >
            <View
              style={{
                height: 56,
                borderRadius: Radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: phone && pin && !loading ? Colors.primary : '#E5E7EB',
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text
                  style={{
                    fontSize: FontSize.md,
                    fontWeight: '700',
                    color: phone && pin && !loading ? '#FFF' : Colors.textSecond,
                  }}
                >
                  Login as Admin
                </Text>
              )}
            </View>
          </Pressable>

          {/* Help Text */}
          <Text
            style={{
              fontSize: FontSize.xs,
              color: Colors.textSecond,
              textAlign: 'center',
              marginTop: Spacing.xl,
              lineHeight: 18,
            }}
          >
            पहली बार ऑनबोर्ड कर रहे हैं? होम स्क्रीन पर नई दुकान बनाएं।
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
