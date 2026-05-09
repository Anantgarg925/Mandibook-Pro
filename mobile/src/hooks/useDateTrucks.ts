import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';

export function useDateTrucks(date: Date) {
  const { shop } = useShop();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const dateParam = start.getTime();

  const { data: trucks = [], isLoading: loading } = useQuery({
    queryKey: ['trucks', shop?.shopId, dateParam],
    queryFn: () =>
      api.get<Truck[]>(
        `/api/trucks?shopId=${shop!.shopId}&date=${dateParam}`
      ),
    enabled: !!shop?.shopId,
    refetchInterval: 15000,
  });

  return { trucks, loading };
}
