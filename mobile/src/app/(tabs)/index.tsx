import { useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing } from '@/lib/theme';
import { toIndianCurrency, toIndianDate, toIndianWeight, toIndianNumber } from '@/lib/formatters';

export default function HomeScreen() {
  const router = useRouter();
  const { shop, loading } = useShop();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    if (!shop) {
      router.replace('/onboarding');
    }
  }, [loading, shop, router]);

  if (loading) {
    return (
      <View testID="home-loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!shop) return null;

  return (
    <View testID="home-screen" style={{ flex: 1 }}>
      <LinearGradient
        colors={['#FF8A3D', '#FF6B00', '#E55A00']}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 24,
            paddingVertical: Spacing.xl,
            paddingHorizontal: Spacing.lg,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
            minWidth: 280,
          }}
        >
          <CheckCircle2 size={56} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ color: Colors.surface, fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.md }}>
            MandiBook Pro
          </Text>
          <Text style={{ color: Colors.surface, fontSize: FontSize.md, fontWeight: '500', marginTop: Spacing.xs, opacity: 0.9 }}>
            {shop.firmName}
          </Text>

          <View
            style={{
              marginTop: Spacing.xl,
              backgroundColor: 'rgba(0,0,0,0.18)',
              borderRadius: 14,
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.lg,
              gap: 6,
              width: '100%',
            }}
          >
            <Row label="Amount" value={toIndianCurrency(943878)} />
            <Row label="Weight" value={toIndianWeight(23327)} />
            <Row label="Count" value={toIndianNumber(1250000)} />
            <Row label="Date" value={toIndianDate(Date.now())} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm }}>{label}</Text>
      <Text style={{ color: Colors.surface, fontSize: FontSize.sm, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}
