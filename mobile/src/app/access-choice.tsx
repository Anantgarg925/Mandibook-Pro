import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, Users } from 'lucide-react-native';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function AccessChoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.xl,
          paddingBottom: Math.max(Spacing.xl, insets.bottom),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              padding: Spacing.sm,
              marginLeft: -Spacing.sm,
              marginBottom: Spacing.lg,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>

          <Text style={{ fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm }}>
            कैसे शुरुआत करेंगे?
          </Text>
          <Text style={{ fontSize: FontSize.md, color: Colors.textSecond, marginBottom: Spacing.xl }}>
            अपनी भूमिका चुनें
          </Text>
        </View>

        {/* Choice Cards */}
        <View style={{ gap: Spacing.lg }}>
          {/* Admin Option */}
          <Pressable
            onPress={() => router.push('/admin-login' as any)}
            style={({ pressed }) => ({
              borderRadius: Radius.lg,
              overflow: 'hidden',
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={['#1B5E20', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                padding: Spacing.lg,
                borderRadius: Radius.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 }}>
                    Admin / मालिक
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.8)' }}>
                    दुकान सेटअप करें या Admin से लॉगिन करें
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: FontSize.sm, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20 }}>
                • नई दुकान बनाएं{'\n'}
                • Admin PIN से लॉगिन करें{'\n'}
                • सभी सेटिंग्स नियंत्रित करें
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Member Option */}
          <Pressable
            onPress={() => router.push('/member-login' as any)}
            style={({ pressed }) => ({
              borderRadius: Radius.lg,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: Colors.primary,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View
              style={{
                padding: Spacing.lg,
                backgroundColor: '#E8F5E9',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: Colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={28} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, marginBottom: 2 }}>
                    Member / कर्मचारी
                  </Text>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond }}>
                    दुकान के साथ लॉगिन करें
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 }}>
                • फोन + PIN से लॉगिन करें{'\n'}
                • अपना काम करें{'\n'}
                • दुकान सेटिंग्स एक्सेस न करें
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Footer Info */}
        <View style={{ backgroundColor: '#F3FAFF', padding: Spacing.lg, borderRadius: Radius.lg }}>
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecond, lineHeight: 18 }}>
            <Text style={{ fontWeight: '700' }}>पहली बार?</Text> {'\n'}
            नई दुकान बनाने के लिए "Admin / मालिक" चुनें और onboarding पूरा करें।
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
