import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';

export function useTodayTrucks() {
  const { shop } = useShop();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dateParam = startOfToday.getTime();

  const { data: trucks = [], isLoading: loading, error } = useQuery({
    queryKey: ['trucks', shop?.shopId, dateParam],
    queryFn: () =>
      api.get<Truck[]>(
        `/api/trucks?shopId=${shop!.shopId}&date=${dateParam}`
      ),
    enabled: !!shop?.shopId,
    refetchInterval: 10000,
  });

  return {
    trucks,
    loading,
    error: error ? (error as Error).message : null,
  };
}
