import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';

export function useDateInquiries(date: Date) {
  const { shop } = useShop();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const dateParam = start.getTime();

  const { data: inquiries = [], isLoading: loading } = useQuery({
    queryKey: ['inquiries', shop?.shopId, dateParam, 'CONFIRMED'],
    queryFn: () =>
      api.get<Inquiry[]>(
        `/api/inquiries?shopId=${shop!.shopId}&date=${dateParam}&status=CONFIRMED`
      ),
    enabled: !!shop?.shopId,
    refetchInterval: 15000,
  });

  return { inquiries, loading };
}
