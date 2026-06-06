import { useQuery } from '@tanstack/react-query';
import { supabase, mapTruck } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';
import { liveQueryOptions } from '@/lib/queryOptions';
import { getBusinessDateRange, getCurrentBusinessDate } from '@/lib/businessDay';
import { attachBillSummaryToTrucks } from '@/utils/truckInventorySummary';

type InquiryRow = {
  truck_id: string | null;
  grade: string;
  grade_name: string;
  total_weight: number;
  status: string;
  syncStatus?: string | null;
  charge_snapshot?: unknown;
};

export function useTodayTrucks() {
  const { shop } = useShop();

  const { startMs: dateParam, endMs: dateEnd } = getBusinessDateRange(getCurrentBusinessDate());

  const { data: trucks = [], isLoading: loading, error } = useQuery({
    queryKey: ['trucks', shop?.shopId, dateParam, dateEnd, shop?.grades],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
        .eq('shop_id', shop!.shopId)
        .gte('date', dateParam)
        .lte('date', dateEnd)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const trucks = (data ?? []).map((r: unknown) => mapTruck(r as Record<string, unknown>)) as Truck[];
      if (trucks.length === 0) {
        return trucks;
      }
      
      const truckIds = trucks.map(t => t.id);
      
      const { data: inquiryRows, error: inquiryError } = await supabase
        .from('inquiries')
        .select('truck_id, grade, grade_name, total_weight, status, syncStatus, charge_snapshot')
        .eq('shop_id', shop!.shopId)
        .in('truck_id', truckIds);
      if (inquiryError) throw new Error(inquiryError.message);
      return attachBillSummaryToTrucks(trucks, (inquiryRows ?? []) as InquiryRow[], shop?.grades ?? []);
    },
    enabled: !!shop?.shopId,
    ...liveQueryOptions,
  });

  return {
    trucks,
    loading,
    error: error ? (error as Error).message : null,
  };
}
