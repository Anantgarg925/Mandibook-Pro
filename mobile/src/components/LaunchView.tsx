import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { toIndianDate } from '@/lib/formatters';

interface Props {
  visible: boolean;
  onHide: () => void;
  onAdminPress: () => void;
  onMemberPress: () => void;
  shopName: string;
}

export function LaunchView({ visible, onHide, onAdminPress, onMemberPress, shopName }: Props) {
  const opacity = useSharedValue(0);
  const animationStarted = useRef(false);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 450 });
    }
  }, [visible]);

  const dismiss = (callback: () => void) => {
    if (animationStarted.current) return;
    animationStarted.current = true;
    const hide = onHide;
    const cb = callback;
    const handleFinish = () => {
      hide();
      setTimeout(cb, 0);
    };
    opacity.value = withTiming(0, { duration: 380 }, (finished) => {
      if (finished) runOnJS(handleFinish)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const today = toIndianDate(Date.now());

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Image Section */}
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1542838687-2f4c1a6e2a25?w=900&q=80' }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(0,69,13,0.15)', 'rgba(0,69,13,0.05)', '#f3faff']}
              style={StyleSheet.absoluteFill}
            />

            {/* Identity Card */}
            <View style={styles.identityCard}>
              <Text style={styles.brandName}>MandiBook Pro</Text>
              <View style={styles.brandUnderline} />
              <Text style={styles.shopName}>{shopName}</Text>
              <View style={styles.dateRow}>
                <MaterialIcons name="calendar-today" size={14} color="#41493e" />
                <Text style={styles.dateText}>{today}</Text>
              </View>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Admin Login */}
            <Pressable
              testID="launch-admin-btn"
              onPress={() => dismiss(onAdminPress)}
              style={({ pressed }) => [styles.adminBtn, pressed && styles.adminBtnPressed]}
            >
              <View style={styles.btnLeft}>
                <View style={styles.adminIconWrap}>
                  <MaterialIcons name="admin-panel-settings" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.adminBtnTitle}>Admin Login</Text>
                  <Text style={styles.adminBtnSub}>एडमिन लॉगिन</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="rgba(255,255,255,0.75)" />
            </Pressable>

            {/* Member Access */}
            <Pressable
              testID="launch-member-btn"
              onPress={() => dismiss(onMemberPress)}
              style={({ pressed }) => [styles.memberBtn, pressed && styles.memberBtnPressed]}
            >
              <View style={styles.btnLeft}>
                <View style={styles.memberIconWrap}>
                  <MaterialIcons name="group" size={24} color="#00450d" />
                </View>
                <View>
                  <Text style={styles.memberBtnTitle}>Member Access</Text>
                  <Text style={styles.memberBtnSub}>मेंबर एक्सेस</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="#00450d" />
            </Pressable>

            {/* Feature Bento Cards */}
            <View style={styles.bentoRow}>
              <View style={styles.bentoCard}>
                <MaterialIcons name="account-balance-wallet" size={22} color="#00450d" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoTitle}>Fast Settlement</Text>
                <Text style={styles.bentoSub}>त्वरित भुगतान</Text>
              </View>
              <View style={styles.bentoCard}>
                <MaterialIcons name="verified-user" size={22} color="#00450d" style={{ marginBottom: 8 }} />
                <Text style={styles.bentoTitle}>100% Secure</Text>
                <Text style={styles.bentoSub}>पूरी तरह सुरक्षित</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerHindi}>आपकी मंडी, आपका हिसाब</Text>
              <Text style={styles.footerEnglish}>Your Mandi, Your Accounts</Text>
              <View style={styles.footerDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.footerPowered}>POWERED BY MandiBook Pro</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Bottom accent */}
      <LinearGradient
        colors={['#00450d', '#feb300', '#00450d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bottomAccent}
      />
    </Animated.View>
  );
}

const letterSpacingBrandName = Platform.OS === 'android' ? 0 : -0.5;
const letterSpacingFooterEnglish = Platform.OS === 'android' ? 0.5 : 3;
const letterSpacingBentoTitle = Platform.OS === 'android' ? 0 : 0.8;
const letterSpacingFooterPowered = Platform.OS === 'android' ? 0 : 0.5;

const styles = StyleSheet.create({
  container: {
    zIndex: 9998,
    elevation: 9998,
    backgroundColor: '#f3faff',
  },
  heroContainer: {
    height: 310,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  identityCard: {
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00450d',
    letterSpacing: letterSpacingBrandName,
    marginBottom: 4,
  },
  brandUnderline: {
    width: 48,
    height: 3,
    backgroundColor: '#feb300',
    borderRadius: 2,
    marginBottom: 12,
  },
  shopName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#071e27',
    textAlign: 'center',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#41493e',
  },
  content: {
    padding: 20,
    paddingTop: 16,
    flex: 1,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adminBtn: {
    backgroundColor: '#00450d',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 12,
    shadowColor: '#00450d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  adminBtnPressed: {
    backgroundColor: '#003a0b',
  },
  adminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  adminBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  memberBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c0c9bb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  memberBtnPressed: {
    backgroundColor: '#f5f5f5',
  },
  memberIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbf1fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBtnTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#071e27',
  },
  memberBtnSub: {
    fontSize: 12,
    color: '#41493e',
    marginTop: 1,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#e6f6ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cfe6f2',
  },
  bentoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00450d',
    textTransform: 'uppercase',
    letterSpacing: letterSpacingBentoTitle,
    marginBottom: 2,
  },
  bentoSub: {
    fontSize: 10,
    color: '#41493e',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 16,
  },
  footerHindi: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b5e20',
    opacity: 0.9,
    marginBottom: 6,
  },
  footerEnglish: {
    fontSize: 10,
    fontWeight: '700',
    color: '#004a78',
    textTransform: 'uppercase',
    letterSpacing: letterSpacingFooterEnglish,
    opacity: 0.4,
    marginBottom: 20,
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    height: 1,
    width: 28,
    backgroundColor: '#c0c9bb',
  },
  footerPowered: {
    fontSize: 9,
    fontWeight: '700',
    color: '#717a6d',
    letterSpacing: letterSpacingFooterPowered,
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  },
});
