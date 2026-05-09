import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { CashEntry } from '@/utils/pdfGenerator';

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

export function useCashEntries(date: Date) {
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const key = dateKey(date);
  const dateParam = startOfDay(date);
  const queryKey = ['cash-entries', shop?.shopId, key, dateParam];

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () =>
      api.get<CashEntry[]>(
        `/api/transactions?shopId=${shop!.shopId}&buyerCode=__cashbook__&date=${dateParam}`
      ),
    enabled: !!shop?.shopId,
    refetchInterval: 15000,
  });

  const addMutation = useMutation({
    mutationFn: (entry: Omit<CashEntry, 'id'>) =>
      api.post<CashEntry>('/api/transactions', {
        shopId: shop!.shopId,
        buyerCode: '__cashbook__',
        type: entry.type,
        description: entry.description,
        amount: entry.amount,
        createdAt: entry.createdAt,
        date: dateParam,
      }),
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
