import { useQuery } from '@tanstack/react-query';
import { supabase, mapTruck } from '@/lib/supabase';
import { useShop } from '@/context/ShopContext';
import type { Truck } from '@/types/truck';
import { archiveQueryOptions } from '@/lib/queryOptions';

type InquiryRow = {
  truck_id: string;
  grade: string;
  grade_name: string;
  total_weight: number;
  status: string;
};

function attachBillSummary(trucks: Truck[], rows: InquiryRow[], grades: { code: string; name: string }[]): Truck[] {
  return trucks.map((truck) => {
    const bills = rows.filter((row) => row.truck_id === truck.id && row.status !== 'CANCELLED');
    const gradeInventory = grades.map((grade) => {
      const gradeBills = bills.filter((bill) => bill.grade === grade.code);
      return {
        code: grade.code,
        name: grade.name,
        totalKg: truck.totalKg,
        confirmedKg: gradeBills
          .filter((bill) => bill.status === 'CONFIRMED')
          .reduce((sum, bill) => sum + (bill.total_weight || 0), 0),
        provisionalKg: gradeBills
          .filter((bill) => bill.status === 'PENDING')
          .reduce((sum, bill) => sum + (bill.total_weight || 0), 0),
      };
    });
    return { ...truck, gradeInventory };
  });
}

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
      const trucks = (data ?? []).map((r) => mapTruck(r as Record<string, unknown>)) as Truck[];
      const { data: inquiryRows, error: inquiryError } = await supabase
        .from('inquiries')
        .select('truck_id, grade, grade_name, total_weight, status')
        .eq('shop_id', shop!.shopId)
        .gte('date', dateParam)
        .lte('date', dateEnd);
      if (inquiryError) throw new Error(inquiryError.message);
      return attachBillSummary(trucks, (inquiryRows ?? []) as InquiryRow[], shop?.grades ?? []);
    },
    enabled: !!shop?.shopId,
    ...archiveQueryOptions,
  });

  return { trucks, loading };
}
