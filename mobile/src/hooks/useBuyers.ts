import { useQuery } from '@tanstack/react-query';
import { supabase, mapBuyer, mapInquiry, mapTransaction } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Buyer, Inquiry, Transaction } from '@/types/inquiry';
import { archiveQueryOptions } from '@/lib/queryOptions';

export function useBuyers() {
  const { shop } = useShop();

  const { data: buyers = [], isLoading: loading } = useQuery({
    queryKey: ['buyers', shop?.shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .neq('code', '__cashbook__')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: unknown) => mapBuyer(r as Record<string, unknown>)) as Buyer[];
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  const getBuyer = (code: string) => buyers.find((b) => b.code === code) ?? null;

  return { buyers, loading, getBuyer };
}

export function useBuyerTransactions(buyerCode: string) {
  const { shop } = useShop();

  const { data: transactions = [], isLoading: loading } = useQuery({
    queryKey: ['transactions', shop?.shopId, buyerCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('buyer_code', buyerCode)
        .order('date', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: unknown) => mapTransaction(r as Record<string, unknown>)) as Transaction[];
    },
    enabled: !!shop?.shopId && !!buyerCode,
    ...archiveQueryOptions,
  });

  return { transactions, loading };
}

export function useBuyerBills(buyerName?: string) {
  const { shop } = useShop();

  const { data: bills = [], isLoading: loading } = useQuery({
    queryKey: ['buyer-bills', shop?.shopId, buyerName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .eq('customer_name', buyerName!)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: unknown) => mapInquiry(r as Record<string, unknown>)) as Inquiry[];
    },
    enabled: !!shop?.shopId && !!buyerName,
    ...archiveQueryOptions,
  });

  return { bills, loading };
}
