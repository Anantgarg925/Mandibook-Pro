import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useShop } from '@/context/ShopContext';
import type { Buyer, Transaction } from '@/types/inquiry';

export function useBuyers() {
  const { shop } = useShop();

  const { data: buyers = [], isLoading: loading } = useQuery({
    queryKey: ['buyers', shop?.shopId],
    queryFn: () => api.get<Buyer[]>(`/api/buyers?shopId=${shop!.shopId}`),
    enabled: !!shop?.shopId,
    refetchInterval: 15000,
  });

  const getBuyer = (code: string) => buyers.find((b) => b.code === code) ?? null;

  return { buyers, loading, getBuyer };
}

export function useBuyerTransactions(buyerCode: string) {
  const { shop } = useShop();

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['transactions', shop?.shopId, buyerCode],
    queryFn: () =>
      api.get<Transaction[]>(
        `/api/transactions?shopId=${shop!.shopId}&buyerCode=${buyerCode}`
      ),
    enabled: !!shop?.shopId && !!buyerCode,
    refetchInterval: 15000,
  });

  return { transactions, loading };
}
