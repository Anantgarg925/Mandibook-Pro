import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
  Alert, ActivityIndicator, BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ArrowLeft, User } from 'lucide-react-native';
import { useShop, type TeamMember } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';
import { mapShop, supabase } from '@/lib/supabase';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';
export { APP_SESSION_KEY, MEMBER_SESSION_KEY };

const normalizePhone = (value: string) => value.replace(/\D/g, '');

export default function MemberLoginScreen() {
  const router = useRouter();
  const { cacheShop } = useShop();
  const { setLaunchComplete } = useLaunch();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  const goBack = () => {
    setLaunchComplete(false);
    router.replace({ pathname: '/', params: { access: 'choose' } } as any);
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setLaunchComplete(false);
      router.replace({ pathname: '/', params: { access: 'choose' } } as any);
      return true;
    });
    return () => subscription.remove();
  }, [router, setLaunchComplete]);

  const findRemoteShop = async (phoneDigits: string, enteredPin: string) => {
    const { data, error } = await supabase.rpc('verify_member_login', {
      p_phone: phoneDigits,
      p_pin: enteredPin,
    });
    if (error) throw error;
    if (!data) return null;

    const payload = data as {
      shop?: Record<string, unknown>;
      member?: TeamMember;
      is_admin?: boolean;
      session_token?: string;
    };
    if (!payload.shop || !payload.member || !payload.session_token) return null;

    return {
      shop: mapShop(payload.shop),
      member: payload.member,
      isAdmin: payload.is_admin === true,
      sessionToken: payload.session_token,
    };
  };

  const handleLogin = async () => {
    const cleaned = normalizePhone(phone);
    if (cleaned.length !== 10) {
      Alert.alert('Invalid Number', 'कृपया 10 अंकों का सही फोन नंबर डालें।');
      return;
    }
    if (!pin || pin.length < 4) {
      Alert.alert('Invalid PIN', 'कृपया 4 अंकों का PIN डालें।');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const remoteMatch = await findRemoteShop(cleaned, pin);
      const activeShop = remoteMatch?.shop;
      const isAdmin = remoteMatch?.isAdmin ?? false;
      const member = remoteMatch?.member;

      if (remoteMatch?.shop) {
        await cacheShop(remoteMatch.shop);
      }

      if (activeShop && (isAdmin || member)) {
        setPinError(false);
        setLaunchComplete(true);
        const session = {
          id: member?.id ?? 'admin-member',
          name: member?.name ?? activeShop.ownerName,
          phone: member?.phone ?? activeShop.phone1,
          role: member?.role ?? 'ADMIN',
          sessionToken: remoteMatch.sessionToken,
        };
        AsyncStorage.setItem(APP_SESSION_KEY, JSON.stringify(session)).catch(() => {});
        if (isAdmin) {
          AsyncStorage.removeItem(MEMBER_SESSION_KEY).catch(() => {});
          router.replace('/');
        } else {
          AsyncStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify(session)).catch(() => {});
          router.replace('/member-dashboard');
        }
        return;
      }

      setPinError(true);
    } catch {
      Alert.alert(
        'Login Failed',
        'Could not check your firm details right now. Please check internet and try again.\nफर्म जानकारी नहीं मिल पाई। इंटरनेट चेक करके दोबारा कोशिश करें।'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header bar */}
          <View style={styles.header}>
            <Pressable testID="member-back-btn" onPress={goBack} style={styles.headerIcon}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>MandiBook Pro</Text>
            <View style={styles.headerIcon}>
              <User size={22} color="#FFFFFF" />
            </View>
          </View>

          {/* Hero image */}
          <View style={styles.heroWrap}>
            {imageError ? (
              <LinearGradient
                colors={['#1a5c1f', '#2d7a34', '#e8f5e9']}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=900&q=80' }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.45)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Member Access</Text>
              <Text style={styles.heroSub}>मेंबर एक्सेस</Text>
            </View>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            {/* Phone Number */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.labelHindi}>फोन नंबर</Text>
            </View>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                testID="member-phone-input"
                style={styles.phoneInput}
                placeholder="00000 00000"
                placeholderTextColor="#a0a0a0"
                keyboardType="phone-pad"
                maxLength={12}
                value={phone}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '');
                  if (digits.length <= 10) {
                    const formatted = digits.length > 5
                      ? `${digits.slice(0, 5)} ${digits.slice(5)}`
                      : digits;
                    setPhone(formatted);
                  }
                  setPinError(false);
                }}
              />
            </View>

            {/* PIN */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Shop PIN</Text>
              <Text style={styles.labelHindi}>शॉप पिन</Text>
            </View>
            <TextInput
              testID="member-pin-input"
              style={[styles.pinInput, pinError && styles.pinInputError]}
              placeholder="Enter 4-digit PIN"
              placeholderTextColor="#a0a0a0"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              value={pin}
              onChangeText={(t) => {
                setPin(t.replace(/\D/g, ''));
                setPinError(false);
              }}
            />
            {pinError ? (
              <Text style={styles.errorText}>गलत PIN। कृपया सही PIN डालें।</Text>
            ) : null}

            <View style={styles.secureRow}>
              <MaterialIcons name="lock" size={18} color="#546E57" />
              <View>
                <Text style={styles.secureText}>SECURE LOG-IN</Text>
                <Text style={styles.secureSub}>सुरक्षित लॉगिन</Text>
              </View>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.termsWrap}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms and Conditions</Text>
            </Text>
            <Text style={styles.termsHindi}>
              आगे बढ़कर, आप हमारी{' '}
              <Text style={styles.termsLink}>नियम और शर्तों</Text>
              {' '}से सहमत होते हैं।
            </Text>
          </View>

          {/* Trust badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <MaterialIcons name="verified" size={22} color="#546E57" />
              <Text style={styles.badgeText}>VERIFIED</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badge}>
              <MaterialIcons name="shield" size={22} color="#546E57" />
              <Text style={styles.badgeText}>ENCRYPTED</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badge}>
              <MaterialIcons name="support-agent" size={22} color="#546E57" />
              <Text style={styles.badgeText}>SUPPORT</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              MANDIBOOK PRO © 2024 INSTITUTIONAL LEDGER
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomCta}>
          <Pressable
            testID="member-login-btn"
            onPress={handleLogin}
            disabled={loading}
          >
            {({ pressed }) => (
              <View style={[
                styles.loginBtn,
                pressed && styles.loginBtnPressed,
                loading && styles.loginBtnDisabled,
              ]}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>LOG IN</Text>
                    <Text style={styles.loginBtnSub}>लॉगिन करें</Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 112,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#00450d',
    borderBottomWidth: 0,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroWrap: {
    height: 176,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  labelHindi: {
    fontSize: 12,
    color: '#546E57',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d0d5d1',
    borderRadius: 12,
    backgroundColor: '#fafbfa',
    marginBottom: 20,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#d0d5d1',
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 16,
    letterSpacing: 1,
  },
  pinInput: {
    borderWidth: 1.5,
    borderColor: '#d0d5d1',
    borderRadius: 12,
    backgroundColor: '#fafbfa',
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  pinInputError: {
    borderColor: '#B71C1C',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 13,
    color: '#B71C1C',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 16,
  },
  loginBtn: {
    backgroundColor: '#FDE047',
    borderRadius: 12,
    minHeight: 60,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    borderWidth: 2,
    borderColor: '#00450D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomCta: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  loginBtnPressed: {
    backgroundColor: '#FBBF24',
  },
  loginBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#003807',
    letterSpacing: 1,
  },
  loginBtnSub: {
    fontSize: 11,
    color: '#365314',
    fontWeight: '900',
    marginTop: 2,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secureText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  secureSub: {
    fontSize: 10,
    color: '#546E57',
  },
  termsWrap: {
    marginTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#546E57',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsHindi: {
    fontSize: 11,
    color: '#546E57',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 2,
  },
  termsLink: {
    color: '#1B5E20',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 16,
  },
  badge: {
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#546E57',
    letterSpacing: 0.5,
  },
  badgeDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#d0d5d1',
  },
  footer: {
    marginTop: 28,
    marginBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8fac90',
    letterSpacing: 0.8,
  },
});
