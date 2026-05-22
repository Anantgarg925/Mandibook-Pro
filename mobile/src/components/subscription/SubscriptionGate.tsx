import React, { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { CheckCircle2, Clock3, Copy, RefreshCw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { usePathname } from 'expo-router';
import { useShop } from '@/context/ShopContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';

const PAYTM_UPI_ID = process.env.EXPO_PUBLIC_PAYTM_UPI_ID ?? '';
const PAYTM_QR_IMAGE_URL = process.env.EXPO_PUBLIC_PAYTM_QR_IMAGE_URL ?? '';

function formatDate(ms?: number | null) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function TrialBanner({
  status,
  daysRemaining,
  until,
}: {
  status: string;
  daysRemaining: number;
  until?: number | null;
}) {
  const isTrial = status === 'trial';
  return (
    <View
      style={{
        backgroundColor: isTrial ? '#FFF8E1' : '#E8F5E9',
        borderBottomWidth: 1,
        borderBottomColor: isTrial ? '#FFE082' : '#C8E6C9',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
      }}
    >
      {isTrial ? <Clock3 size={16} color="#8A5A00" strokeWidth={2} /> : <CheckCircle2 size={16} color={Colors.success} strokeWidth={2} />}
      <Text 
        style={{ flex: 1, fontSize: FontSize.xs, fontWeight: '800', color: isTrial ? '#6D4C00' : Colors.success, lineHeight: 18 }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {isTrial
          ? `Free trial: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
          : `Subscription active until ${formatDate(until)}`}
      </Text>
    </View>
  );
}

function Paywall({
  status,
  onRefresh,
  refreshing,
  onSubmitPayment,
  submitting,
}: {
  status: ReturnType<typeof useSubscriptionStatus>['data'];
  onRefresh: () => void;
  refreshing: boolean;
  onSubmitPayment: (note: string) => Promise<unknown>;
  submitting: boolean;
}) {
  const [note, setNote] = useState('');
  const amount = status?.monthly_price_inr ?? 399;
  const pending = status?.status === 'payment_pending';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View
          style={{
            backgroundColor: Colors.surface,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.md,
          }}
        >
          <Text style={{ fontSize: FontSize.xl, fontWeight: '900', color: Colors.text }}>
            MandiBook Pro
          </Text>
          <Text style={{ marginTop: 6, fontSize: FontSize.sm, color: Colors.textSecond, lineHeight: 20 }}>
            Your 20 day free trial has ended. Continue using billing, trucks, ledgers, reports, and payment recording for Rs {amount}/month.
          </Text>

          {pending ? (
            <View style={{ marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: '#FFF8E1' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#7A5200' }}>
                Payment submitted for verification
              </Text>
              <Text style={{ marginTop: 4, fontSize: FontSize.sm, color: '#7A5200' }}>
                We will activate your subscription after confirming the Paytm payment.
              </Text>
            </View>
          ) : null}

          <View
            style={{
              marginTop: Spacing.md,
              minHeight: 220,
              borderRadius: Radius.sm,
              borderWidth: 1,
              borderColor: Colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F8FAF9',
              overflow: 'hidden',
            }}
          >
            {PAYTM_QR_IMAGE_URL ? (
              <Image
                source={{ uri: PAYTM_QR_IMAGE_URL }}
                style={{ width: 220, height: 220 }}
                resizeMode="contain"
              />
            ) : (
              <Text style={{ padding: Spacing.md, textAlign: 'center', color: Colors.textSecond, fontWeight: '700' }}>
                Add EXPO_PUBLIC_PAYTM_QR_IMAGE_URL in mobile/.env to show your Paytm scanner here.
              </Text>
            )}
          </View>

          <Text style={{ marginTop: Spacing.md, fontSize: FontSize.sm, color: Colors.textSecond, lineHeight: 20 }}>
            Scan the QR from Paytm, PhonePe, GPay, or BHIM. If scanning is not convenient, copy the UPI ID below and enter Rs {amount} manually.
          </Text>

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            {PAYTM_UPI_ID ? (
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(PAYTM_UPI_ID);
                  Alert.alert('Copied', 'UPI ID copied.');
                }}
                style={{
                  height: 48,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: Colors.surface,
                }}
              >
                <Copy size={17} color={Colors.primary} />
                <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary }}>
                  Copy UPI ID: {PAYTM_UPI_ID}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={{ marginTop: Spacing.md, fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond }}>
            PAYMENT NOTE / UTR
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Enter UTR, transaction ID, or payer name"
            placeholderTextColor={Colors.textSecond}
            style={{
              marginTop: 6,
              minHeight: 52,
              borderRadius: Radius.sm,
              borderWidth: 1,
              borderColor: Colors.border,
              paddingHorizontal: Spacing.sm,
              color: Colors.text,
              backgroundColor: Colors.surface,
            }}
          />

          <Pressable
            onPress={() => {
              onSubmitPayment(note).catch((error) => {
                Alert.alert('Could not submit', error instanceof Error ? error.message : 'Please try again.');
              });
            }}
            disabled={submitting}
            style={{
              marginTop: Spacing.md,
              height: 52,
              borderRadius: Radius.sm,
              backgroundColor: submitting ? Colors.border : Colors.info,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#FFFFFF' }}>
                I have paid
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onRefresh}
            style={{ marginTop: Spacing.sm, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            <RefreshCw size={16} color={Colors.textSecond} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '800', color: Colors.textSecond }}>
              Refresh status
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { shop, loading: shopLoading } = useShop();
  const pathname = usePathname();
  const { data, isLoading, isFetching, refetch, submitPayment, submittingPayment } = useSubscriptionStatus();
  const insets = useSafeAreaInsets();

  const bypass =
    !shop?.shopId ||
    shopLoading ||
    pathname === '/onboarding' ||
    pathname === '/member-login';

  if (bypass) return <>{children}</>;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={{ marginTop: Spacing.sm, color: Colors.textSecond, fontWeight: '700' }}>
          Checking subscription...
        </Text>
      </SafeAreaView>
    );
  }

  if (!data?.is_allowed) {
    return (
      <Paywall
        status={data}
        refreshing={isFetching}
        onRefresh={() => refetch()}
        onSubmitPayment={submitPayment}
        submitting={submittingPayment}
      />
    );
  }

  const showBanner = data?.status === 'trial' || data?.status === 'active';
  const { width, height } = Dimensions.get('window');

  return (
    <View style={{ flex: 1 }}>
      {showBanner ? (
        <View style={{ paddingTop: insets.top, backgroundColor: data.status === 'trial' ? '#FFF8E1' : '#E8F5E9' }}>
          <TrialBanner
            status={data.status}
            daysRemaining={data.days_remaining}
            until={data.current_period_ends_at ?? data.trial_ends_at}
          />
        </View>
      ) : null}
      {showBanner && Platform.OS !== 'web' ? (
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width, height },
            insets: { ...insets, top: 0 },
          }}
        >
          {children}
        </SafeAreaProvider>
      ) : (
        children
      )}
    </View>
  );
}
