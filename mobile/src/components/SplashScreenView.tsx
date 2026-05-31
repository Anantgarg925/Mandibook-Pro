import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onHide: () => void;
}

export function SplashScreenView({ visible, onHide }: Props) {
  const opacity = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const animationStarted = useRef(false);

  useEffect(() => {
    progressWidth.value = withTiming(130, {
      duration: 2500,
      easing: Easing.out(Easing.quad),
    });
  }, []);

  useEffect(() => {
    if (!visible && !animationStarted.current) {
      animationStarted.current = true;
      const hideCallback = onHide;
      if (Platform.OS === 'web') {
        hideCallback();
      } else {
        progressWidth.value = withTiming(192, { duration: 250 }, () => {
          opacity.value = withTiming(0, { duration: 650 }, () => {
            runOnJS(hideCallback)();
          });
        });
      }
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, animatedContainerStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <LinearGradient colors={['#00450d', '#1b5e20']} style={styles.gradient}>
        {/* Decorative circles */}
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />

        {/* Top spacer */}
        <View style={{ flex: 0.3 }} />

        {/* Center branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="account-balance-wallet" size={64} color="#acf4a4" />
          </View>
          <Text style={styles.brandName}>MandiBook Pro</Text>
          <View style={styles.underline} />
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          <View style={styles.taglineContainer}>
            <Text style={styles.hindiTagline}>आपकी मंडी, आपका हिसाब</Text>
            <Text style={styles.englishTagline}>Your Mandi, Your Accounts</Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>

          <View style={styles.footerContainer}>
            <Text style={styles.poweredBy}>Powered by MandiBook</Text>
            <Text style={styles.version}>v2.4.0-pro-enterprise</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    elevation: 9999,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
  },
  decorTop: {
    position: 'absolute',
    top: -50,
    right: -25,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: '#1b5e20',
    opacity: 0.5,
  },
  decorBottom: {
    position: 'absolute',
    bottom: 80,
    left: -40,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#feb300',
    opacity: 0.08,
  },
  brandingContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 32,
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  underline: {
    width: 96,
    height: 6,
    backgroundColor: '#feb300',
    borderRadius: 3,
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 52,
    paddingHorizontal: 20,
    width: '100%',
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  hindiTagline: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  englishTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#acf4a4',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  progressTrack: {
    width: 192,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#feb300',
    borderRadius: 2,
  },
  footerContainer: {
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  version: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
