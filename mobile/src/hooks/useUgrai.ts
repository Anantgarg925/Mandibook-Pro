import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import { archiveQueryOptions } from '@/lib/queryOptions';

export type UgraiCollection = {
  id: string;
  shop_id: string;
  buyer_code: string;
  buyer_name: string;
  member_id: string;
  member_name: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  created_at: number;
  payment_method?: string;
  upi_ref?: string;
};

export function useUgrai() {
  const { shop } = useShop();
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading: loading } = useQuery({
    queryKey: ['ugrai_collections', shop?.shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ugrai_collections')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as UgraiCollection[];
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  const pendingCollections = collections.filter(c => c.status === 'PENDING');

  const addCollection = useMutation({
    mutationFn: async (payload: Omit<UgraiCollection, 'id' | 'shop_id' | 'created_at' | 'status'>) => {
      const { error } = await supabase
        .from('ugrai_collections')
        .insert({
          ...payload,
          shop_id: shop!.shopId,
          status: 'PENDING',
          created_at: Date.now()
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ugrai_collections', shop?.shopId] });
    }
  });

  const confirmCollection = useMutation({
    mutationFn: async (collection: UgraiCollection) => {
      // 1. Mark as confirmed
      const { error: updateError } = await supabase
        .from('ugrai_collections')
        .update({ status: 'CONFIRMED' })
        .eq('id', collection.id);
      if (updateError) throw new Error(updateError.message);

      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          shop_id: shop!.shopId,
          buyer_code: collection.buyer_code,
          type: 'PAYMENT',
          amount: collection.amount,
          date: Date.now(),
          payment_method: collection.payment_method || 'CASH',
          note: `Ugrai collected by ${collection.member_name}${collection.upi_ref ? ` (Ref: ${collection.upi_ref})` : ''}`,
          created_at: Date.now()
        });
      if (txError) throw new Error(txError.message);

      const { error: cbError } = await supabase
        .from('transactions')
        .insert({
          shop_id: shop!.shopId,
          buyer_code: '__cashbook__',
          type: 'RECEIPT',
          amount: collection.amount,
          date: Date.now(),
          payment_method: collection.payment_method || 'CASH',
          note: `Ugrai collected from ${collection.buyer_name} by ${collection.member_name}${collection.upi_ref ? ` (Ref: ${collection.upi_ref})` : ''}`,
          created_at: Date.now()
        });
      if (cbError) throw new Error(cbError.message);

      // 3. Update buyer balance
      const { data: buyerData, error: getError } = await supabase
        .from('buyers')
        .select('outstanding_balance')
        .eq('code', collection.buyer_code)
        .eq('shop_id', shop!.shopId)
        .single();
      
      if (getError) throw new Error(getError.message);

      const newBalance = (buyerData?.outstanding_balance || 0) - collection.amount;

      const { error: balError } = await supabase
        .from('buyers')
        .update({ outstanding_balance: newBalance })
        .eq('code', collection.buyer_code)
        .eq('shop_id', shop!.shopId);
        
      if (balError) throw new Error(balError.message);
    },
    onSuccess: (_, collection) => {
      queryClient.invalidateQueries({ queryKey: ['ugrai_collections', shop?.shopId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', shop?.shopId, collection.buyer_code] });
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
    }
  });

  return { collections, pendingCollections, loading, addCollection, confirmCollection };
}
