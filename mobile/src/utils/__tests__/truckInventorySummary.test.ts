import {
  attachBillSummaryToTrucks,
  getTruckAccountedPct,
  getTruckAvailableKg,
  getTruckSoldKg,
} from '../truckInventorySummary';
import type { Truck } from '@/types/truck';

const baseTruck: Truck = {
  id: 'truck-1',
  shopId: 'shop-1',
  truckNumber: 'RJ11GD1295',
  senderName: 'Iqbal',
  senderCode: '',
  chlNumber: '',
  totalKg: 17140,
  wastageKg: 0,
  freightAmount: 0,
  gradeInventory: [
    { code: 'III', name: 'Small', totalKg: 5000, confirmedKg: 1200, provisionalKg: 300 },
    { code: 'IV', name: 'Extra Small', totalKg: 10000, confirmedKg: 4000, provisionalKg: 200 },
  ],
  sourceAgentHidden: false,
  isGodown: false,
  status: 'ACTIVE',
  date: 0,
  createdAt: 0,
};

describe('truckInventorySummary', () => {
  it('rebuilds sold stock from current bill rows instead of stale truck inventory', () => {
    const [truck] = attachBillSummaryToTrucks(
      [baseTruck],
      [
        {
          truck_id: 'truck-1',
          grade: 'III',
          grade_name: 'Small',
          total_weight: 3940,
          status: 'CONFIRMED',
        },
        {
          truck_id: 'truck-1',
          grade: 'IV',
          grade_name: 'Extra Small',
          total_weight: 7497,
          status: 'CONFIRMED',
        },
        {
          truck_id: 'truck-1',
          grade: 'PILLA',
          grade_name: 'Peela',
          total_weight: 150,
          status: 'CONFIRMED',
        },
      ],
      []
    );

    expect(getTruckSoldKg(truck)).toBe(11587);
    expect(truck.gradeInventory.find((grade) => grade.code === 'III')?.confirmedKg).toBe(3940);
    expect(truck.gradeInventory.find((grade) => grade.code === 'III')?.provisionalKg).toBe(0);
  });

  it('uses charge snapshot entries for mixed-grade bills', () => {
    const [truck] = attachBillSummaryToTrucks(
      [baseTruck],
      [
        {
          truck_id: 'truck-1',
          grade: 'MIXED',
          grade_name: 'Multiple Items',
          total_weight: 2840,
          status: 'CONFIRMED',
          charge_snapshot: {
            entries: [
              { grade: 'V', gradeName: 'Goli', totalWeight: 2000 },
              { grade: 'CHURA', gradeName: 'Chura', totalWeight: 840 },
            ],
          },
        },
      ],
      []
    );

    expect(getTruckSoldKg(truck)).toBe(2840);
    expect(truck.gradeInventory.find((grade) => grade.code === 'V')?.confirmedKg).toBe(2000);
    expect(truck.gradeInventory.find((grade) => grade.code === 'CHURA')?.confirmedKg).toBe(840);
    expect(truck.gradeInventory.find((grade) => grade.code === 'MIXED')).toBeUndefined();
  });

  it('subtracts wastage from available stock', () => {
    const truck = {
      ...baseTruck,
      wastageKg: 2739,
      gradeInventory: [
        { code: 'III', name: 'Small', totalKg: 17140, confirmedKg: 11587, provisionalKg: 0 },
      ],
    };

    expect(getTruckAvailableKg(truck)).toBe(2814);
    expect(getTruckAccountedPct(truck)).toBe(84);
  });
});
