import { useQuery } from '@tanstack/react-query';
import { supabase, mapTruck } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';
import { liveQueryOptions } from '@/lib/queryOptions';
import { getBusinessDateRange, getCurrentBusinessDate } from '@/lib/businessDay';

type InquiryRow = {
  truck_id: string | null;
  grade: string;
  grade_name: string;
  total_weight: number;
  status: string;
};

function attachBillSummary(trucks: Truck[], rows: InquiryRow[], grades: { code: string; name: string }[]): Truck[] {
  return trucks.map((truck) => {
    const bills = rows.filter((row) => row.truck_id === truck.id && row.status !== 'CANCELLED');
    const gradeMap = new Map<string, any>();

    // 1. Initialize with shop grades
    grades.forEach((grade) => {
      gradeMap.set(grade.code, {
        code: grade.code,
        name: grade.name,
        totalKg: 0,
        confirmedKg: 0,
        provisionalKg: 0,
      });
    });

    // 2. Add existing truck inventory grades
    (truck.gradeInventory || []).forEach((g: any) => {
      if (!gradeMap.has(g.code)) {
        gradeMap.set(g.code, {
          code: g.code,
          name: g.name || g.code,
          totalKg: g.totalKg || 0,
          confirmedKg: 0,
          provisionalKg: 0,
        });
      } else {
        gradeMap.get(g.code)!.totalKg = g.totalKg || 0;
      }
    });

    // 3. Process all active bills
    bills.forEach((bill) => {
      const code = bill.grade || 'UNKNOWN';
      if (!gradeMap.has(code)) {
        gradeMap.set(code, {
          code,
          name: bill.grade_name || code,
          totalKg: 0,
          confirmedKg: 0,
          provisionalKg: 0,
        });
      }
      const g = gradeMap.get(code)!;
      if (bill.status === 'CONFIRMED') {
        g.confirmedKg += bill.total_weight || 0;
      } else {
        g.provisionalKg += bill.total_weight || 0;
      }
    });

    return { ...truck, gradeInventory: Array.from(gradeMap.values()) };
  });
}

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
        .select('truck_id, grade, grade_name, total_weight, status')
        .eq('shop_id', shop!.shopId)
        .in('truck_id', truckIds);
      if (inquiryError) throw new Error(inquiryError.message);
      return attachBillSummary(trucks, (inquiryRows ?? []) as InquiryRow[], shop?.grades ?? []);
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
