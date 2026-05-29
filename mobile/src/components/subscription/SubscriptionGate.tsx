import React, { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
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
const PAYTM_PHONE = (process.env.EXPO_PUBLIC_PAYTM_PHONE ?? '').replace(/\D/g, '');
const PAYTM_QR_IMAGE_URL = process.env.EXPO_PUBLIC_PAYTM_QR_IMAGE_URL ?? '';
const UPI_PAYEE_NAME = process.env.EXPO_PUBLIC_UPI_PAYEE_NAME ?? '';
const PAYTM_PHONE_UPI_ID = PAYTM_PHONE.length === 10 ? `${PAYTM_PHONE}@paytm` : '';
const PRIMARY_UPI_ID = PAYTM_PHONE_UPI_ID || PAYTM_UPI_ID;

function formatDate(ms?: number | null) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRupees(value: number) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function buildUpiPaymentUrl(amount: number) {
  const params = new URLSearchParams({
    pa: PRIMARY_UPI_ID,
    am: String(amount),
    cu: 'INR',
    tn: 'MandiBook subscription',
  });
  if (UPI_PAYEE_NAME.trim()) {
    params.set('pn', UPI_PAYEE_NAME.trim());
  }
  return `upi://pay?${params.toString()}`;
}

function ValueRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <CheckCircle2 size={16} color={Colors.success} strokeWidth={2.4} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 19, fontWeight: '700' }}>
        {text}
      </Text>
    </View>
  );
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
  const isPending = status === 'payment_pending';
  return (
    <View
      style={{
        backgroundColor: isTrial || isPending ? '#FFF8E1' : '#E8F5E9',
        borderBottomWidth: 1,
        borderBottomColor: isTrial || isPending ? '#FFE082' : '#C8E6C9',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
      }}
    >
      {isTrial || isPending ? <Clock3 size={16} color="#8A5A00" strokeWidth={2} /> : <CheckCircle2 size={16} color={Colors.success} strokeWidth={2} />}
      <Text 
        style={{ flex: 1, fontSize: FontSize.xs, fontWeight: '800', color: isTrial || isPending ? '#6D4C00' : Colors.success, lineHeight: 18 }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {isPending
          ? `Payment verification pending until ${formatDate(until)}`
          : isTrial
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
  const standardAmount = status?.standard_price_inr ?? 550;
  const includedUsers = status?.included_user_count ?? 3;
  const extraUserPrice = status?.extra_user_price_inr ?? 99;
  const earlyCustomerNumber = status?.early_customer_number ?? null;
  const isEarlyPlan = (status?.pricing_plan ?? 'early_lifetime') === 'early_lifetime';
  const monthlySaving = Math.max(0, standardAmount - amount);
  const yearlySaving = monthlySaving * 12;
  const dailyCost = Math.ceil(amount / 30);
  const pending = status?.status === 'payment_pending';
  const openUpiPayment = async () => {
    if (!PRIMARY_UPI_ID) {
      Alert.alert('UPI not configured', 'Add EXPO_PUBLIC_PAYTM_PHONE or EXPO_PUBLIC_PAYTM_UPI_ID in mobile/.env first.');
      return;
    }

    try {
      await Linking.openURL(buildUpiPaymentUrl(amount));
    } catch {
      Alert.alert(
        'Could not open UPI app',
        'Please scan the QR or copy the UPI ID and pay from Paytm, PhonePe, GPay, or BHIM.'
      );
    }
  };

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
          <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: Colors.primary, letterSpacing: 0 }}>
            MANDIBOOK PRO
          </Text>
          <Text style={{ marginTop: 4, fontSize: FontSize.xxl, fontWeight: '900', color: Colors.text, lineHeight: 30 }}>
            Run the firm from every phone for {formatRupees(amount)}/month
          </Text>
          <Text style={{ marginTop: 6, fontSize: FontSize.sm, color: Colors.textSecond, lineHeight: 20 }}>
            Your 20 day free trial has ended. Keep billing, approvals, stock, udhaari, buyers, trucks, and reports working without interruption.
          </Text>

          <View
            style={{
              marginTop: Spacing.md,
              borderRadius: Radius.sm,
              borderWidth: 1,
              borderColor: isEarlyPlan ? '#F9A825' : Colors.border,
              backgroundColor: isEarlyPlan ? '#FFF8E1' : '#F8FAF9',
              padding: Spacing.md,
              gap: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: isEarlyPlan ? '#7A5200' : Colors.textSecond }}>
                  {isEarlyPlan ? 'EARLY PRICE LOCKED WHILE SUBSCRIBED' : 'MONTHLY PLAN'}
                </Text>
                <Text style={{ marginTop: 2, fontSize: FontSize.xl, fontWeight: '900', color: Colors.text }}>
                  {formatRupees(amount)}/month
                </Text>
              </View>
              {isEarlyPlan ? (
                <View
                  style={{
                    borderRadius: Radius.round,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#F9A825',
                    paddingHorizontal: Spacing.sm,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: '#7A5200' }}>
                    {earlyCustomerNumber ? `Early #${earlyCustomerNumber}` : 'First 50'}
                  </Text>
                </View>
              ) : null}
            </View>

            {monthlySaving > 0 ? (
              <Text style={{ fontSize: FontSize.sm, color: '#7A5200', lineHeight: 19, fontWeight: '800' }}>
                Standard price is {formatRupees(standardAmount)}/month. You save {formatRupees(monthlySaving)}/month, about {formatRupees(yearlySaving)}/year while subscribed.
              </Text>
            ) : (
              <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, lineHeight: 19, fontWeight: '800' }}>
                About {formatRupees(dailyCost)} per day for the full firm.
              </Text>
            )}

            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, lineHeight: 19, fontWeight: '800' }}>
              Includes {includedUsers} team members. Extra members can be added at {formatRupees(extraUserPrice)}/member/month.
            </Text>
          </View>

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <ValueRow text="One billing or udhaari mistake can cost more than this full month." />
            <ValueRow text="Owner can approve bills and check firm position from any registered phone." />
            <ValueRow text="Other firms are not shown your buyers, trucks, bills, stock, or reports in the app." />
            <ValueRow text="Start with notebook and app together for a few days; switch fully only after confidence." />
          </View>

          {pending ? (
            <View style={{ marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.sm, backgroundColor: '#FFF8E1' }}>
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#7A5200' }}>
                Payment submitted for verification
              </Text>
              <Text style={{ marginTop: 4, fontSize: FontSize.sm, color: '#7A5200' }}>
                You get 24 hours of temporary access while we confirm the Paytm/UPI payment.
              </Text>
            </View>
          ) : null}

          {PRIMARY_UPI_ID ? (
            <Pressable
              onPress={openUpiPayment}
              style={({ pressed }) => ({
                marginTop: Spacing.md,
                minHeight: 54,
                borderRadius: Radius.sm,
                backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: Spacing.md,
              })}
            >
              <Text style={{ fontSize: FontSize.md, fontWeight: '900', color: '#FFFFFF' }}>
                Pay {formatRupees(amount)} with UPI app
              </Text>
              <Text style={{ marginTop: 2, fontSize: FontSize.xs, fontWeight: '700', color: '#D7EED9' }}>
                {PAYTM_PHONE_UPI_ID ? `Pays to Paytm number ${PAYTM_PHONE}` : 'Opens Paytm, PhonePe, GPay, BHIM, or any UPI app'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={{ marginTop: Spacing.sm, fontSize: FontSize.xs, color: Colors.textSecond, lineHeight: 17, fontWeight: '700' }}>
            After payment, come back here and tap "I have paid". UTR is optional.
          </Text>

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
            Backup option: scan the QR from Paytm, PhonePe, GPay, or BHIM. If scanning is not convenient, copy the UPI ID below and enter {formatRupees(amount)} manually.
          </Text>

          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            {PRIMARY_UPI_ID ? (
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(PRIMARY_UPI_ID);
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
                  Copy UPI ID: {PRIMARY_UPI_ID}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={{ marginTop: Spacing.md, fontSize: FontSize.xs, fontWeight: '800', color: Colors.textSecond }}>
            PAYMENT NOTE / UTR (OPTIONAL)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional: UTR, transaction ID, or payer name"
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
                I have paid, verify my payment
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
    pathname === '/member-login' ||
    pathname === '/owner/subscriptions';

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

  const showBanner = data?.status === 'trial' || data?.status === 'active' || data?.status === 'payment_pending';
  const { width, height } = Dimensions.get('window');

  return (
    <View style={{ flex: 1 }}>
      {showBanner ? (
        <View style={{ paddingTop: insets.top, backgroundColor: data.status === 'active' ? '#E8F5E9' : '#FFF8E1' }}>
          <TrialBanner
            status={data.status}
            daysRemaining={data.days_remaining}
            until={data.status === 'payment_pending' ? data.payment_grace_ends_at : data.current_period_ends_at ?? data.trial_ends_at}
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
