import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';

export function useInquiries() {
  const { shop } = useShop();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dateParam = startOfToday.getTime();

  const { data: inquiries = [], isLoading: loading, error } = useQuery({
    queryKey: ['inquiries', shop?.shopId, dateParam],
    queryFn: () =>
      api.get<Inquiry[]>(
        `/api/inquiries?shopId=${shop!.shopId}&date=${dateParam}`
      ),
    enabled: !!shop?.shopId,
    refetchInterval: 10000,
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
