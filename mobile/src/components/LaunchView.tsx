import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { toIndianDate } from '@/lib/formatters';
import { getCurrentBusinessDate } from '@/lib/businessDay';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

interface Props {
  visible: boolean;
  onHide: () => void;
  onAdminPress: () => void;
  onMemberPress: () => void;
  shopName: string;
  shopCity?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({ onPress, children, style, testID }: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.96))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function LaunchView({ visible, onHide, onAdminPress, onMemberPress, shopName, shopCity }: Props) {
  const opacity = useSharedValue(0);
  const animationStarted = useRef(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const { width, height } = useWindowDimensions();
  const isSmall = width < 380;

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 450 });
    }
  }, [visible]);

  const dismiss = (callback: () => void) => {
    if (animationStarted.current) return;
    animationStarted.current = true;
    if (Platform.OS === 'web') {
      onHide();
      callback();
      return;
    }
    opacity.value = withTiming(0, { duration: 380 }, () => {
      runOnJS(onHide)();
      runOnJS(callback)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const today = toIndianDate(getCurrentBusinessDate().getTime());

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
          <View style={[styles.heroContainer, { height: isSmall ? 260 : 310 }]}>
            {imageError ? (
              <LinearGradient
                colors={['#1a5c1f', '#2d7a34', '#f3faff']}
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
            {/* Darker gradient overlay to make text pop */}
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)', '#f3faff']}
              style={StyleSheet.absoluteFill}
            />

            {/* Glassmorphic Identity Card */}
            <View style={{ width: '100%', paddingHorizontal: 20 }}>
              <BlurView intensity={80} tint="light" style={styles.identityCard}>
                <Text style={styles.brandName}>MandiBook Pro</Text>
                <View style={styles.brandUnderline} />
                <Text style={styles.shopName} numberOfLines={2}>
                  {shopCity ? `${shopName}, ${shopCity}` : shopName}
                </Text>
                <View style={styles.dateRow}>
                  <MaterialIcons name="calendar-today" size={14} color="#00450D" />
                  <Text style={styles.dateText}>{today}</Text>
                </View>
              </BlurView>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Admin Login */}
            <ScaleButton
              testID="launch-admin-btn"
              onPress={() => dismiss(onAdminPress)}
              style={styles.adminBtnOuter}
            >
              <LinearGradient
                colors={['#00450d', '#002B08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminBtn}
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
                <View style={styles.arrowIconWrap}>
                  <MaterialIcons name="arrow-forward-ios" size={14} color="#00450D" />
                </View>
              </LinearGradient>
            </ScaleButton>

            {/* Member Access */}
            <ScaleButton
              testID="launch-member-btn"
              onPress={() => dismiss(onMemberPress)}
              style={styles.memberBtn}
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
            </ScaleButton>

            {/* Feature Bento Cards */}
            <View style={styles.bentoRow}>
              <View style={styles.bentoCard}>
                <View style={styles.bentoIconContainer}>
                  <MaterialIcons name="account-balance-wallet" size={20} color="#00450D" />
                </View>
                <View>
                  <Text style={styles.bentoTitle}>Fast Settlement</Text>
                  <Text style={styles.bentoSub}>त्वरित भुगतान</Text>
                </View>
              </View>
              <View style={styles.bentoCard}>
                <View style={[styles.bentoIconContainer, { backgroundColor: '#FFF8E1' }]}>
                  <MaterialIcons name="verified-user" size={20} color="#854D0E" />
                </View>
                <View>
                  <Text style={styles.bentoTitle}>100% Secure</Text>
                  <Text style={styles.bentoSub}>पूरी तरह सुरक्षित</Text>
                </View>
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
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
  },
  identityCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00450D',
    letterSpacing: letterSpacingBrandName,
    marginBottom: 6,
  },
  brandUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#feb300',
    borderRadius: 2,
    marginBottom: 16,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#071e27',
    textAlign: 'center',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00450D',
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
  adminBtnOuter: {
    marginBottom: 14,
    borderRadius: 16,
    shadowColor: '#00450d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  adminBtn: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  adminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  adminBtnSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  arrowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBF1FE',
  },
  memberBtnTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#071e27',
  },
  memberBtnSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bentoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#071e27',
    marginBottom: 2,
  },
  bentoSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  footerHindi: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00450D',
    opacity: 0.9,
    marginBottom: 6,
  },
  footerEnglish: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004a78',
    textTransform: 'uppercase',
    letterSpacing: letterSpacingFooterEnglish,
    opacity: 0.4,
    marginBottom: 24,
  },
  footerDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    height: 1,
    width: 32,
    backgroundColor: '#E5E7EB',
  },
  footerPowered: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: letterSpacingFooterPowered,
  },
  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    opacity: 0.8,
    zIndex: 1,
  },
});
