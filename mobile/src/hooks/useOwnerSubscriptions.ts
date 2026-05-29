import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SubscriptionLifecycleStatus } from '@/hooks/useSubscriptionStatus';

export type OwnerSubscriptionAccount = {
  shop_id: string;
  firm_name: string;
  owner_name: string;
  phone1: string;
  phone2?: string | null;
  city?: string | null;
  commodity?: string | null;
  created_at: number;
  status: SubscriptionLifecycleStatus;
  is_allowed: boolean;
  days_remaining: number;
  trial_ends_at: number;
  current_period_ends_at?: number | null;
  monthly_price_inr: number;
  pricing_plan?: 'early_lifetime' | 'standard';
  early_customer_number?: number | null;
  payment_requested_at?: number | null;
  payment_grace_ends_at?: number | null;
  payment_note?: string | null;
  payment_verified_at?: number | null;
  payment_verified_by?: string | null;
  payment_rejected_at?: number | null;
  payment_rejected_reason?: string | null;
  member_count: number;
};

export type OwnerSubscriptionSummary = {
  total: number;
  trial: number;
  active: number;
  payment_pending: number;
  expired: number;
  rejected: number;
  cancelled: number;
};

export type OwnerSubscriptionPayload = {
  server_time: number;
  summary: OwnerSubscriptionSummary;
  accounts: OwnerSubscriptionAccount[];
};

const emptyPayload: OwnerSubscriptionPayload = {
  server_time: Date.now(),
  summary: {
    total: 0,
    trial: 0,
    active: 0,
    payment_pending: 0,
    expired: 0,
    rejected: 0,
    cancelled: 0,
  },
  accounts: [],
};

export function useOwnerSubscriptions(ownerKey: string) {
  const queryClient = useQueryClient();
  const queryKey = ['owner-subscriptions', ownerKey ? 'authorized' : 'locked'];

  const query = useQuery({
    queryKey,
    enabled: ownerKey.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_owner_subscription_accounts', {
        p_owner_key: ownerKey,
      });
      if (error) throw new Error(error.message);
      return (data ?? emptyPayload) as OwnerSubscriptionPayload;
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ shopId, months }: { shopId: string; months: number }) => {
      const { data, error } = await supabase.rpc('approve_subscription_payment', {
        p_owner_key: ownerKey,
        p_shop_id: shopId,
        p_months: months,
      });
      if (error) throw new Error(error.message);
      return data as OwnerSubscriptionPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ shopId, reason }: { shopId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('reject_subscription_payment', {
        p_owner_key: ownerKey,
        p_shop_id: shopId,
        p_reason: reason || null,
      });
      if (error) throw new Error(error.message);
      return data as OwnerSubscriptionPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  const resetTrialMutation = useMutation({
    mutationFn: async ({ shopId, trialDays }: { shopId: string; trialDays: number }) => {
      const { data, error } = await supabase.rpc('reset_subscription_trial', {
        p_owner_key: ownerKey,
        p_shop_id: shopId,
        p_trial_days: trialDays,
      });
      if (error) throw new Error(error.message);
      return data as OwnerSubscriptionPayload;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  return {
    data: query.data ?? emptyPayload,
    error: query.error,
    isError: query.isError,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    refetch: query.refetch,
    approve: approveMutation.mutateAsync,
    approving: approveMutation.isPending,
    reject: rejectMutation.mutateAsync,
    rejecting: rejectMutation.isPending,
    resetTrial: resetTrialMutation.mutateAsync,
    resettingTrial: resetTrialMutation.isPending,
  };
}
