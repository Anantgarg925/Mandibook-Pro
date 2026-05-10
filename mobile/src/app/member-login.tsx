import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Menu, User } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';

export default function MemberLoginScreen() {
  const router = useRouter();
  const { shop } = useShop();
  const { setLaunchComplete } = useLaunch();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLogin = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      Alert.alert('Invalid Number', 'कृपया 10 अंकों का सही फोन नंबर डालें।');
      return;
    }
    if (!pin || pin.length < 4) {
      Alert.alert('Invalid PIN', 'कृपया 4 अंकों का PIN डालें।');
      return;
    }

    Keyboard.dismiss();
    const correctPin = shop?.adminPin ?? '';

    if (pin === correctPin) {
      setPinError(false);
      setLaunchComplete(true);
      router.replace('/authorization');
    } else {
      setPinError(true);
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
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header bar */}
          <View style={styles.header}>
            <Pressable testID="member-back-btn" onPress={() => router.back()} style={styles.headerIcon}>
              <Menu size={22} color="#1a1a1a" />
            </Pressable>
            <Text style={styles.headerTitle}>MandiBook Pro</Text>
            <View style={styles.headerIcon}>
              <User size={22} color="#1a1a1a" />
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

            {/* Login button */}
            <Pressable
              testID="member-login-btn"
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && styles.loginBtnPressed,
              ]}
            >
              <Text style={styles.loginBtnText}>LOG IN</Text>
              <Text style={styles.loginBtnSub}>लॉगिन करें</Text>
            </Pressable>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: -0.3,
  },
  heroWrap: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  labelHindi: {
    fontSize: 13,
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
    fontSize: 18,
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
    fontSize: 18,
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
    fontSize: 20,
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
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginBtnPressed: {
    backgroundColor: '#145214',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  loginBtnSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
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
