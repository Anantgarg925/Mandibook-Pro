import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, mapTransaction } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { CashEntry } from '@/utils/pdfGenerator';
import { archiveQueryOptions } from '@/lib/queryOptions';

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function useCashEntries(date: Date) {
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const key = dateKey(date);
  const dateParam = startOfDay(date);
  const dateEndParam = endOfDay(date);
  const queryKey = ['cash-entries', shop?.shopId, key, dateParam, dateEndParam];

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('buyer_code', '__cashbook__')
        .gte('date', dateParam)
        .lte('date', dateEndParam)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: unknown) => {
        const t = mapTransaction(r as Record<string, unknown>);
        return {
          id: t.id,
          type: t.type === 'PAYMENT' ? 'PAYMENT' : 'RECEIPT',
          description: t.note ?? '',
          amount: t.amount,
          createdAt: t.createdAt,
        } as CashEntry;
      });
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<CashEntry, 'id'>) => {
      const { data, error } = await supabase.from('transactions').insert({
        shop_id: shop!.shopId,
        buyer_code: '__cashbook__',
        type: entry.type,
        note: entry.description,
        amount: entry.amount,
        created_at: entry.createdAt,
        date: dateParam,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const addEntry = async (entry: Omit<CashEntry, 'id'>) => {
    if (!shop?.shopId) return;
    await addMutation.mutateAsync(entry);
  };

  return { entries, loading, addEntry };
}
