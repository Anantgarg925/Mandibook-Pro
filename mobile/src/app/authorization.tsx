import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, CheckCircle2 } from 'lucide-react-native';
import { useInquiries } from '@/hooks/useInquiries';
import PendingInquiryCard from '@/components/bills/PendingInquiryCard';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PagerView from '@/components/common/PagerView';
import { useShop } from '@/context/ShopContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Inquiry } from '@/types/inquiry';

// TODO: add admin PIN gate once role selection (Phase N) is built

export default function AuthorizationScreen() {
  const { pending, loading } = useInquiries();
  const router = useRouter();
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [currentPage, setCurrentPage] = React.useState(0);
  const visiblePending = id ? pending.filter((bill) => bill.id === id) : pending;

  // Group bills by customer name and phone
  const groupedPending = React.useMemo(() => {
    if (id) return visiblePending.map(b => [b]); // Single item view

    const groups: Record<string, Inquiry[]> = {};
    visiblePending.forEach(bill => {
      // Use combination of name and phone as unique key
      const name = bill.customerName?.trim().toLowerCase() || 'unknown';
      const phone = bill.customerPhone?.trim() || 'unknown';
      const key = `${name}_${phone}`;
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(bill);
    });

    // Return array of groups, sorted so larger groups might appear first, or keep original order
    return Object.values(groups);
  }, [visiblePending, id]);

  const activePage = Math.min(currentPage, Math.max(0, groupedPending.length - 1));

  const authorizeAllMutation = useMutation({
    mutationFn: async (group: Inquiry[]) => {
      if (!shop?.shopId) throw new Error('Missing shop');
      
      for (const bill of group) {
        const now = Date.now();
        const finalNetAmount = bill.netAmount ?? 0;

        // 1. Update bill status
        const { error: inquiryUpdateError } = await supabase
          .from('inquiries')
          .update({
            status: 'CONFIRMED',
            slip_status: 'authorized',
          })
          .eq('id', bill.id);
        if (inquiryUpdateError) throw new Error(inquiryUpdateError.message);

        // 2. Handle UDHAARI Ledger
        if (bill.paymentMode === 'UDHAARI') {
          const { data: buyerRows, error: buyerFetchError } = await supabase
            .from('buyers')
            .select('*')
            .eq('shop_id', shop.shopId);
          if (buyerFetchError) throw new Error(buyerFetchError.message);

          const normalizedName = (bill.customerName || '').trim().toLowerCase();
          const normalizedPhone = (bill.customerPhone || '').trim();
          const existing = ((buyerRows ?? []) as Record<string, unknown>[]).find((b) => {
            const bPhone = String(b.phone ?? '').trim();
            const bName = String(b.name ?? '').trim().toLowerCase();
            return (
              (!!normalizedPhone && bPhone === normalizedPhone) ||
              (!!normalizedName && bName === normalizedName)
            );
          });

          const buyerCode = existing?.code ?? `B${now}`;

          if (existing) {
            const { error: buyerUpdateError } = await supabase
              .from('buyers')
              .update({
                outstanding_balance: Number(existing.outstanding_balance ?? 0) + finalNetAmount,
                last_transaction_date: now,
              })
              .eq('id', existing.id);
            if (buyerUpdateError) throw new Error(buyerUpdateError.message);
          } else {
            const { error: buyerInsertError } = await supabase.from('buyers').insert({
              shop_id: shop.shopId,
              code: buyerCode,
              name: (bill.customerName || '').trim(),
              phone: (bill.customerPhone || '').trim(),
              outstanding_balance: finalNetAmount,
              last_transaction_date: now,
              created_at: now,
            });
            if (buyerInsertError) throw new Error(buyerInsertError.message);
          }

          const { error: transactionError } = await supabase.from('transactions').insert({
            shop_id: shop.shopId,
            buyer_code: buyerCode,
            type: 'SALE',
            amount: finalNetAmount,
            date: now,
            note: `Bill #${bill.slipNumber}`,
            slip_number: bill.slipNumber,
            created_at: now,
          });
          if (transactionError) throw new Error(transactionError.message);
        }

        // 3. Handle Agent Ledger
        if (bill.sourceAgentName && bill.agentPurchaseAmount && bill.agentPurchaseAmount > 0) {
          const { data: buyerRows, error: agentFetchError } = await supabase
            .from('buyers')
            .select('*')
            .eq('shop_id', shop.shopId);
          if (agentFetchError) throw new Error(agentFetchError.message);

          const normalizedName = bill.sourceAgentName.trim().toLowerCase();
          const normalizedPhone = (bill.sourceAgentPhone ?? '').trim();
          const existingAgent = ((buyerRows ?? []) as Record<string, unknown>[]).find((b) => {
            const bPhone = String(b.phone ?? '').trim();
            const bName = String(b.name ?? '').trim().toLowerCase();
            return (
              (!!normalizedPhone && bPhone === normalizedPhone) ||
              (!!normalizedName && bName === normalizedName)
            );
          });

          const agentCode = existingAgent?.code ?? `A${now}`;
          const agentPurchaseAmount = bill.agentPurchaseAmount;

          if (existingAgent) {
            const { error: agentUpdateError } = await supabase
              .from('buyers')
              .update({
                outstanding_balance: Number(existingAgent.outstanding_balance ?? 0) - agentPurchaseAmount,
                last_transaction_date: now,
              })
              .eq('id', existingAgent.id);
            if (agentUpdateError) throw new Error(agentUpdateError.message);
          } else {
            const { error: agentInsertError } = await supabase.from('buyers').insert({
              shop_id: shop.shopId,
              code: agentCode,
              name: bill.sourceAgentName.trim(),
              phone: (bill.sourceAgentPhone ?? '').trim(),
              party_type: 'AGENT',
              outstanding_balance: -agentPurchaseAmount,
              last_transaction_date: now,
              created_at: now,
            });
            if (agentInsertError) throw new Error(agentInsertError.message);
          }

          const { error: agentTransactionError } = await supabase.from('transactions').insert({
            shop_id: shop.shopId,
            buyer_code: agentCode,
            type: 'PURCHASE',
            amount: agentPurchaseAmount,
            date: now,
            note: `Stock Purchase Bill #${bill.slipNumber}`,
            slip_number: bill.slipNumber,
            created_at: now,
          });
          if (agentTransactionError) throw new Error(agentTransactionError.message);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['trucks', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId] });
      // Reset to first page or go back if no more
      if (groupedPending.length <= 1 && !id) {
        router.back();
      } else {
        setCurrentPage((prev) => Math.max(0, prev - 1));
      }
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to authorize bills');
    },
  });

  const handleAuthorizeGroup = (group: Inquiry[]) => {
    Alert.alert(
      'Authorize All',
      `Are you sure you want to authorize all ${group.length} bills for ${group[0].customerName || 'this customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Authorize All', onPress: () => authorizeAllMutation.mutate(group) },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F8FA' }} edges={['top', 'bottom']}>
      {/* Top Bar matching config */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          backgroundColor: Colors.primary,
          borderBottomWidth: 0,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 8, marginRight: Spacing.sm }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: '#FFFFFF' }}>
          Authorization
        </Text>
        <Pressable onPress={() => router.push('/settings' as any)}>
          <Settings size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Page Title */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F2C23', letterSpacing: -0.5, marginBottom: 4 }}>
          Pending Bills / पेंडिंग बिल ({pending.length})
        </Text>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond }}>
          {id ? 'Verify and authorize this slip' : 'Verify and authorize market transactions'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          testID="auth-loading"
          color={Colors.primary}
          size="large"
          style={{ marginTop: 48 }}
        />
      ) : groupedPending.length === 0 ? (
        <View
          testID="auth-empty"
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 64 }}
        >
          <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>✅</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: Colors.text }}>
            सब क्लियर है!
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginTop: 4 }}>
            {id ? 'This slip is no longer pending' : 'No pending bills'}
          </Text>
        </View>
      ) : (
        <PagerView
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {groupedPending.map((group, idx) => {
            const isVisible = Math.abs(idx - activePage) <= 1;
            // Use the first bill's ID as the key for the group page
            return (
              <View key={group[0].id} style={{ flex: 1 }}>
                {isVisible ? (
                  <ScrollView
                    contentContainerStyle={{ paddingBottom: Spacing.xl }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Render each bill in the group */}
                    {group.map(item => (
                      <PendingInquiryCard key={item.id} inquiry={item} />
                    ))}
                    
                    {/* Authorize All Button for multiple bills */}
                    {group.length > 1 && (
                      <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.md }}>
                        <Pressable
                          onPress={() => handleAuthorizeGroup(group)}
                          disabled={authorizeAllMutation.isPending}
                          style={{
                            backgroundColor: '#00450D',
                            paddingVertical: 16,
                            borderRadius: Radius.md,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: authorizeAllMutation.isPending ? 0.7 : 1,
                          }}
                        >
                          {authorizeAllMutation.isPending ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <CheckCircle2 size={24} color="#FFFFFF" />
                          )}
                          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>
                            AUTHORIZE ALL ({group.length} BILLS)
                          </Text>
                        </Pressable>
                        <Text style={{ textAlign: 'center', fontSize: 12, color: Colors.textSecond, marginTop: 8 }}>
                          Saves time by authorizing all {group[0].customerName}'s bills at once.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                  </View>
                )}
              </View>
            );
          })}
        </PagerView>
      )}
    </SafeAreaView>
  );
}

