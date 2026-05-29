import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react-native';
import { useOwnerSubscriptions, type OwnerSubscriptionAccount } from '@/hooks/useOwnerSubscriptions';
import { Colors, FontSize, Radius, Spacing } from '@/lib/theme';
import { useShop } from '@/context/ShopContext';
import { useLaunch } from '@/context/LaunchContext';
import { mapShop, supabase } from '@/lib/supabase';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY, IMPERSONATION_KEY } from '@/lib/session';

const OWNER_KEY_STORAGE = 'mandibook_owner_console_key';

const statusLabels: Record<OwnerSubscriptionAccount['status'], string> = {
  trial: 'Trial',
  active: 'Active',
  payment_pending: 'Pending',
  expired: 'Expired',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const statusColors: Record<OwnerSubscriptionAccount['status'], { bg: string; fg: string; border: string }> = {
  trial: { bg: '#FFF8E1', fg: '#7A5200', border: '#FFE082' },
  active: { bg: '#E8F5E9', fg: Colors.success, border: '#C8E6C9' },
  payment_pending: { bg: '#E3F2FD', fg: Colors.info, border: '#BBDEFB' },
  expired: { bg: '#FFEBEE', fg: Colors.danger, border: '#FFCDD2' },
  rejected: { bg: '#FCE4EC', fg: '#AD1457', border: '#F8BBD0' },
  cancelled: { bg: '#ECEFF1', fg: '#455A64', border: '#CFD8DC' },
};

function formatDate(ms?: number | null) {
  if (!ms) return 'Not set';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(ms?: number | null) {
  if (!ms) return 'Not set';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function rupees(value: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        width: '32%',
        minWidth: 96,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: Spacing.sm,
      }}
    >
      <Text style={{ fontSize: FontSize.xs, fontWeight: '900', color: '#64748B' }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: FontSize.xl, fontWeight: '900', color }}>{value}</Text>
    </View>
  );
}

function StatusPill({ status }: { status: OwnerSubscriptionAccount['status'] }) {
  const colors = statusColors[status];
  return (
    <View
      style={{
        borderRadius: Radius.round,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: colors.fg, fontSize: FontSize.xs, fontWeight: '900' }}>{statusLabels[status]}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 130 }}>
      <Text style={{ fontSize: FontSize.xs, color: '#64748B', fontWeight: '800' }}>{label}</Text>
      <Text style={{ marginTop: 3, fontSize: FontSize.sm, color: Colors.text, fontWeight: '800' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function AccountCard({
  account,
  busy,
  onApprove,
  onReject,
  onResetTrial,
  onImpersonate,
}: {
  account: OwnerSubscriptionAccount;
  busy: boolean;
  onApprove: (account: OwnerSubscriptionAccount) => void;
  onReject: (account: OwnerSubscriptionAccount) => void;
  onResetTrial: (account: OwnerSubscriptionAccount) => void;
  onImpersonate: (account: OwnerSubscriptionAccount) => void;
}) {
  const canApprove = account.status === 'payment_pending' || account.status === 'expired' || account.status === 'rejected';
  const canReject = account.status === 'payment_pending';
  const periodText = account.status === 'active'
    ? `Active until ${formatDate(account.current_period_ends_at)}`
    : account.status === 'trial'
      ? `Trial ends ${formatDate(account.trial_ends_at)}`
      : account.status === 'payment_pending'
        ? `Grace until ${formatDateTime(account.payment_grace_ends_at)}`
        : `Expired after ${formatDate(account.trial_ends_at)}`;

  return (
    <View
      style={{
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        padding: Spacing.md,
        gap: Spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.lg, color: Colors.text, fontWeight: '900' }} numberOfLines={2}>
            {account.firm_name || 'Unnamed firm'}
          </Text>
          <Text style={{ marginTop: 3, fontSize: FontSize.sm, color: '#64748B', fontWeight: '700' }} numberOfLines={1}>
            {account.owner_name || 'Owner not set'} - {account.phone1 || 'No phone'}
          </Text>
        </View>
        <StatusPill status={account.status} />
      </View>

      <Text style={{ fontSize: FontSize.sm, color: account.is_allowed ? Colors.success : Colors.danger, fontWeight: '900' }}>
        {account.is_allowed ? 'App access allowed' : 'App access blocked'} - {periodText}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        <Detail label="Plan" value={`${rupees(account.monthly_price_inr)}/month`} />
        <Detail label="City / Commodity" value={`${account.city || '-'} / ${account.commodity || '-'}`} />
        <Detail label="Team" value={`${account.member_count || 0} members`} />
        <Detail label="Joined" value={formatDate(account.created_at)} />
      </View>

      {account.payment_note ? (
        <View style={{ borderRadius: Radius.sm, backgroundColor: '#F8FAFC', padding: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.xs, color: '#64748B', fontWeight: '900' }}>PAYMENT NOTE / UTR</Text>
          <Text style={{ marginTop: 4, fontSize: FontSize.sm, color: Colors.text, fontWeight: '800' }}>
            {account.payment_note}
          </Text>
          <Text style={{ marginTop: 2, fontSize: FontSize.xs, color: '#64748B', fontWeight: '700' }}>
            Submitted {formatDateTime(account.payment_requested_at)}
          </Text>
        </View>
      ) : null}

      {account.payment_rejected_reason ? (
        <Text style={{ fontSize: FontSize.sm, color: Colors.danger, fontWeight: '800' }}>
          Rejected: {account.payment_rejected_reason}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {canApprove ? (
          <Pressable
            disabled={busy}
            onPress={() => onApprove(account)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 46,
              borderRadius: Radius.sm,
              backgroundColor: busy ? '#A5D6A7' : pressed ? Colors.primaryPressed : Colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            })}
          >
            <CheckCircle2 size={17} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '900' }}>Approve 30 days</Text>
          </Pressable>
        ) : null}

        {canReject ? (
          <Pressable
            disabled={busy}
            onPress={() => onReject(account)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 46,
              borderRadius: Radius.sm,
              backgroundColor: pressed ? '#F9D6DA' : '#FFEBEE',
              borderWidth: 1,
              borderColor: '#FFCDD2',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            })}
          >
            <XCircle size={17} color={Colors.danger} />
            <Text style={{ color: Colors.danger, fontSize: FontSize.sm, fontWeight: '900' }}>Reject</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        disabled={busy}
        onPress={() => onResetTrial(account)}
        style={({ pressed }) => ({
          minHeight: 44,
          borderRadius: Radius.sm,
          backgroundColor: pressed ? '#E2E8F0' : '#F8FAFC',
          borderWidth: 1,
          borderColor: '#CBD5E1',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ color: '#334155', fontSize: FontSize.sm, fontWeight: '900' }}>
          Reset trial from today
        </Text>
      </Pressable>

      <Pressable
        disabled={busy}
        onPress={() => onImpersonate(account)}
        style={({ pressed }) => ({
          minHeight: 44,
          borderRadius: Radius.sm,
          backgroundColor: pressed ? '#DBEAFE' : '#EFF6FF',
          borderWidth: 1,
          borderColor: '#93C5FD',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text style={{ color: '#1E40AF', fontSize: FontSize.sm, fontWeight: '900' }}>
          Enter Shop Complete Dashboard
        </Text>
      </Pressable>
    </View>
  );
}

export default function OwnerSubscriptionsScreen() {
  const router = useRouter();
  const { cacheShop } = useShop();
  const { setLaunchComplete } = useLaunch();
  const [impersonating, setImpersonating] = useState(false);
  const [ownerKey, setOwnerKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OwnerSubscriptionAccount['status'] | 'all'>('all');
  const { data, isFetching, isLoading, isError, error, refetch, approve, approving, reject, rejecting, resetTrial, resettingTrial } = useOwnerSubscriptions(ownerKey);

  useEffect(() => {
    AsyncStorage.getItem(OWNER_KEY_STORAGE).then((saved) => {
      if (saved) {
        setOwnerKey(saved);
        setDraftKey(saved);
      }
    }).catch(() => {});
  }, []);

  const filteredAccounts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.accounts.filter((account) => {
      const matchesFilter = filter === 'all' || account.status === filter;
      const haystack = `${account.firm_name} ${account.owner_name} ${account.phone1} ${account.city} ${account.commodity}`.toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [data.accounts, filter, search]);

  const saveKey = async () => {
    const trimmed = draftKey.trim();
    if (!trimmed) {
      Alert.alert('Owner key required', 'Enter the owner console key configured in Supabase.');
      return;
    }
    await AsyncStorage.setItem(OWNER_KEY_STORAGE, trimmed);
    setOwnerKey(trimmed);
  };

  const clearKey = async () => {
    await AsyncStorage.removeItem(OWNER_KEY_STORAGE);
    setOwnerKey('');
    setDraftKey('');
  };

  const handleApprove = (account: OwnerSubscriptionAccount) => {
    Alert.alert(
      'Approve subscription?',
      `${account.firm_name} will become active for 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approve({ shopId: account.shop_id, months: 1 }).catch((err) => {
              Alert.alert('Approval failed', err instanceof Error ? err.message : 'Please try again.');
            });
          },
        },
      ]
    );
  };

  const handleImpersonate = async (account: OwnerSubscriptionAccount) => {
    try {
      setImpersonating(true);
      const { data, error } = await supabase.from('shops').select('*').eq('id', account.shop_id).single();
      if (error || !data) throw error || new Error('Shop not found');
      
      const parsedShop = mapShop(data);
      await cacheShop(parsedShop);

      const session = {
        id: parsedShop.shopId,
        name: parsedShop.ownerName || 'Admin Override',
        phone: parsedShop.phone1 || '',
        role: 'ADMIN',
      };

      await AsyncStorage.setItem(APP_SESSION_KEY, JSON.stringify(session));
      await AsyncStorage.removeItem(MEMBER_SESSION_KEY);
      await AsyncStorage.setItem(IMPERSONATION_KEY, 'true');
      
      setLaunchComplete(true);
      router.replace('/');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not open firm account');
    } finally {
      setImpersonating(false);
    }
  };

  const handleReject = (account: OwnerSubscriptionAccount) => {
    Alert.alert(
      'Reject payment?',
      `${account.firm_name} will be blocked until they submit payment again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            reject({ shopId: account.shop_id, reason: 'Payment not received' }).catch((err) => {
              Alert.alert('Reject failed', err instanceof Error ? err.message : 'Please try again.');
            });
          },
        },
      ]
    );
  };

  const handleResetTrial = (account: OwnerSubscriptionAccount) => {
    Alert.alert(
      'Reset trial?',
      `${account.firm_name} trial will restart from today for 20 days. Active subscription dates and pending payment notes will be cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Trial',
          onPress: () => {
            resetTrial({ shopId: account.shop_id, trialDays: 20 }).catch((err) => {
              Alert.alert('Reset failed', err instanceof Error ? err.message : 'Please try again.');
            });
          },
        },
      ]
    );
  };

  const busy = approving || rejecting || resettingTrial;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3FAFF' }} edges={['top', 'bottom']}>
      <View
        style={{
          backgroundColor: Colors.primary,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <ArrowLeft size={23} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: '900' }}>Owner Subscriptions</Text>
          <Text style={{ marginTop: 2, color: 'rgba(255,255,255,0.78)', fontSize: FontSize.xs, fontWeight: '800' }}>
            Trials, active shops, pending UPI approvals
          </Text>
        </View>
        <Pressable onPress={() => refetch()} disabled={!ownerKey || isFetching} style={{ padding: Spacing.sm }}>
          <RefreshCw size={21} color="#FFFFFF" />
        </Pressable>
      </View>

      {!ownerKey ? (
        <View style={{ flex: 1, padding: Spacing.md, justifyContent: 'center' }}>
          <View style={{ borderRadius: Radius.md, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: Spacing.md }}>
            <ShieldCheck size={30} color={Colors.primary} />
            <Text style={{ marginTop: Spacing.sm, fontSize: FontSize.xl, fontWeight: '900', color: Colors.text }}>
              Owner key required
            </Text>
            <Text style={{ marginTop: 6, fontSize: FontSize.sm, color: '#64748B', lineHeight: 19, fontWeight: '700' }}>
              This dashboard shows every mandi account connected to Supabase. Enter your private owner key to continue.
            </Text>
            <TextInput
              value={draftKey}
              onChangeText={setDraftKey}
              secureTextEntry
              placeholder="Owner console key"
              placeholderTextColor="#94A3B8"
              style={{
                marginTop: Spacing.md,
                minHeight: 52,
                borderRadius: Radius.sm,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                paddingHorizontal: Spacing.md,
                color: Colors.text,
                fontWeight: '800',
              }}
            />
            <Pressable
              onPress={saveKey}
              style={({ pressed }) => ({
                marginTop: Spacing.md,
                minHeight: 50,
                borderRadius: Radius.sm,
                backgroundColor: pressed ? Colors.primaryPressed : Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '900' }}>Open Dashboard</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md, maxWidth: 760, width: '100%', alignSelf: 'center' }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={{ flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '900' }}>All accounts</Text>
            <Pressable onPress={clearKey} style={{ paddingHorizontal: Spacing.sm, paddingVertical: 8 }}>
              <Text style={{ color: Colors.danger, fontSize: FontSize.sm, fontWeight: '900' }}>Lock</Text>
            </Pressable>
          </View>

          {isError ? (
            <View style={{ borderRadius: Radius.sm, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE', padding: Spacing.md }}>
              <Text style={{ color: Colors.danger, fontSize: FontSize.md, fontWeight: '900' }}>
                Could not load subscriptions
              </Text>
              <Text style={{ marginTop: 4, color: Colors.danger, fontSize: FontSize.sm, fontWeight: '700' }}>
                {error instanceof Error ? error.message : 'Check owner key and Supabase migration.'}
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            <SummaryCard label="Total" value={data.summary.total} color={Colors.text} />
            <SummaryCard label="Pending" value={data.summary.payment_pending} color={Colors.info} />
            <SummaryCard label="Trial" value={data.summary.trial} color="#7A5200" />
            <SummaryCard label="Active" value={data.summary.active} color={Colors.success} />
            <SummaryCard label="Expired" value={data.summary.expired} color={Colors.danger} />
            <SummaryCard label="Rejected" value={data.summary.rejected} color="#AD1457" />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', paddingHorizontal: Spacing.sm }}>
            <Search size={18} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search firm, owner, phone, city"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, minHeight: 48, color: Colors.text, fontWeight: '800' }}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {(['all', 'payment_pending', 'trial', 'active', 'expired', 'rejected'] as const).map((item) => {
              const selected = filter === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={{
                    borderRadius: Radius.round,
                    borderWidth: 1,
                    borderColor: selected ? Colors.primary : '#CBD5E1',
                    backgroundColor: selected ? '#E8F5E9' : '#FFFFFF',
                    paddingHorizontal: Spacing.md,
                    paddingVertical: 9,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {item === 'payment_pending' ? <Clock3 size={15} color={selected ? Colors.primary : '#64748B'} /> : null}
                  <Text style={{ color: selected ? Colors.primary : '#64748B', fontSize: FontSize.sm, fontWeight: '900' }}>
                    {item === 'all' ? 'All' : statusLabels[item]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={{ marginTop: Spacing.sm, color: '#64748B', fontWeight: '800' }}>Loading accounts...</Text>
            </View>
          ) : filteredAccounts.length === 0 ? (
            <View style={{ padding: Spacing.xl, borderRadius: Radius.md, backgroundColor: '#FFFFFF', alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontWeight: '900' }}>No accounts found</Text>
            </View>
          ) : (
            filteredAccounts.map((account) => (
              <AccountCard
                key={account.shop_id}
                account={account}
                busy={busy || impersonating}
                onApprove={handleApprove}
                onReject={handleReject}
                onResetTrial={handleResetTrial}
                onImpersonate={handleImpersonate}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
