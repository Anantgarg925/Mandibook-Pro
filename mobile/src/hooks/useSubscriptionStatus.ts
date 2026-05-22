import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';

export type SubscriptionStatus = {
  shop_id: string;
  status: 'trial' | 'active' | 'payment_pending' | 'expired' | 'cancelled';
  is_allowed: boolean;
  days_remaining: number;
  trial_started_at: number;
  trial_ends_at: number;
  current_period_ends_at?: number | null;
  monthly_price_inr: number;
  payment_requested_at?: number | null;
  payment_note?: string | null;
  server_time: number;
};

export function useSubscriptionStatus() {
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const queryKey = ['subscription-status', shop?.shopId];

  const query = useQuery({
    queryKey,
    enabled: !!shop?.shopId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_subscription_status', {
        p_shop_id: shop!.shopId,
      });
      if (error) throw new Error(error.message);
      return data as SubscriptionStatus;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async (paymentNote: string) => {
      if (!shop?.shopId) throw new Error('Shop is not loaded.');
      const { data, error } = await supabase.rpc('submit_subscription_payment', {
        p_shop_id: shop.shopId,
        p_payment_note: paymentNote || null,
      });
      if (error) throw new Error(error.message);
      return data as SubscriptionStatus;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    data: query.data,
    error: query.error,
    isError: query.isError,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
    refetch: query.refetch,
    submitPayment: submitPaymentMutation.mutateAsync,
    submittingPayment: submitPaymentMutation.isPending,
  };
}
