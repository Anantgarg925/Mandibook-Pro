import { useQuery } from '@tanstack/react-query';
import { supabase, mapInquiry } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Inquiry } from '@/types/inquiry';
import { archiveQueryOptions } from '@/lib/queryOptions';

export function useDateInquiries(date: Date) {
  const { shop } = useShop();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const dateParam = start.getTime();

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const dateEnd = end.getTime();

  const { data: inquiries = [], isLoading: loading } = useQuery({
    queryKey: ['inquiries', shop?.shopId, dateParam, dateEnd, 'CONFIRMED'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('status', 'CONFIRMED')
        .gte('date', dateParam)
        .lte('date', dateEnd)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => mapInquiry(r as Record<string, unknown>)) as Inquiry[];
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  return { inquiries, loading };
}
