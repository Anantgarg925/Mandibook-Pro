import { useQuery } from '@tanstack/react-query';
import { supabase, mapTruck } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';
import { archiveQueryOptions } from '@/lib/queryOptions';
import { attachBillSummaryToTrucks } from '@/utils/truckInventorySummary';

type InquiryRow = {
  truck_id: string | null;
  grade: string;
  grade_name: string;
  total_weight: number;
  status: string;
  charge_snapshot?: unknown;
};

export function useDateTrucks(date: Date) {
  const { shop } = useShop();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const dateParam = start.getTime();

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const dateEnd = end.getTime();

  const { data: trucks = [], isLoading: loading } = useQuery({
    queryKey: ['trucks', shop?.shopId, dateParam, dateEnd, shop?.grades],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .or(`and(date.gte.${dateParam},date.lte.${dateEnd}),and(is_godown.eq.true,status.eq.ACTIVE)`)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const trucks = (data ?? []).map((r: unknown) => mapTruck(r as Record<string, unknown>)) as Truck[];
      if (trucks.length === 0) {
        return trucks;
      }
      
      const truckIds = trucks.map(t => t.id);

      const { data: inquiryRows, error: inquiryError } = await supabase
        .from('inquiries')
        .select('truck_id, grade, grade_name, total_weight, status, charge_snapshot')
        .eq('shop_id', shop!.shopId)
        .in('truck_id', truckIds);
      if (inquiryError) throw new Error(inquiryError.message);
      return attachBillSummaryToTrucks(trucks, (inquiryRows ?? []) as InquiryRow[], shop?.grades ?? []);
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  return { trucks, loading };
}
