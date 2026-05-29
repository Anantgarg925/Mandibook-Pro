import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, mapInquiry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';
import { liveQueryOptions } from '@/lib/queryOptions';
import { getBusinessDateRange, getCurrentBusinessDate } from '@/lib/businessDay';

export function useInquiries() {
  const { shop } = useShop();

  const { startMs: dateParam, endMs: dateEnd } = getBusinessDateRange(getCurrentBusinessDate());

  const { data: inquiries = [], isLoading: loading, error } = useQuery({
    queryKey: ['inquiries', shop?.shopId, dateParam, dateEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .gte('date', dateParam)
        .lte('date', dateEnd)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: unknown) => mapInquiry(r as Record<string, unknown>)) as Inquiry[];
    },
    enabled: !!shop?.shopId,
    ...liveQueryOptions,
  });

  const pending = inquiries.filter((i) => i.status === 'PENDING');
  const confirmed = inquiries.filter((i) => i.status === 'CONFIRMED');
  const udhaari = inquiries.filter((i) => i.paymentMode === 'UDHAARI');

  const byTruck = useCallback(
    (truckId: string) => inquiries.filter((i) => i.truckId === truckId),
    [inquiries]
  );

  return {
    inquiries,
    pending,
    confirmed,
    udhaari,
    byTruck,
    loading,
    error: error ? (error as Error).message : null,
  };
}
