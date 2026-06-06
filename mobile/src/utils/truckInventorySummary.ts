import type { Inquiry } from '@/types/inquiry';
import type { GradeInventory, Truck } from '@/types/truck';

type ShopGrade = { code: string; name: string };

type InquirySummaryRow =
  | {
      truck_id: string | null;
      grade: string;
      grade_name: string;
      total_weight: number;
      status: string;
      charge_snapshot?: unknown;
    }
  | Inquiry;

type BillEntry = {
  grade?: string;
  gradeName?: string;
  totalWeight?: number;
};

function getRowTruckId(row: InquirySummaryRow) {
  return 'truck_id' in row ? row.truck_id : row.truckId;
}

function getRowStatus(row: InquirySummaryRow) {
  return row.status;
}

function getRowGrade(row: InquirySummaryRow) {
  return 'grade_name' in row
    ? { code: row.grade, name: row.grade_name, weight: row.total_weight, snapshot: row.charge_snapshot }
    : { code: row.grade, name: row.gradeName, weight: row.totalWeight, snapshot: row.chargeSnapshot };
}

function getBillEntries(row: InquirySummaryRow): BillEntry[] {
  const { code, name, weight, snapshot } = getRowGrade(row);
  const entries = (snapshot as { entries?: BillEntry[] } | null | undefined)?.entries;
  if (Array.isArray(entries) && entries.length > 0) {
    return entries;
  }
  return [{ grade: code, gradeName: name, totalWeight: weight }];
}

function ensureGrade(map: Map<string, GradeInventory>, code: string, name: string) {
  if (!map.has(code)) {
    map.set(code, {
      code,
      name,
      totalKg: 0,
      confirmedKg: 0,
      provisionalKg: 0,
    });
  }
  return map.get(code)!;
}

export function attachBillSummaryToTrucks(
  trucks: Truck[],
  rows: InquirySummaryRow[],
  grades: ShopGrade[] = []
): Truck[] {
  return trucks.map((truck) => {
    const gradeMap = new Map<string, GradeInventory>();

    grades.forEach((grade) => {
      ensureGrade(gradeMap, grade.code, grade.name);
    });

    (truck.gradeInventory || []).forEach((grade) => {
      const existing = ensureGrade(gradeMap, grade.code, grade.name || grade.code);
      existing.totalKg = grade.totalKg || 0;
    });

    rows.forEach((row) => {
      if (getRowTruckId(row) !== truck.id || getRowStatus(row) === 'CANCELLED') return;

      getBillEntries(row).forEach((entry) => {
        const code = entry.grade || getRowGrade(row).code || 'UNKNOWN';
        const name = entry.gradeName || getRowGrade(row).name || code;
        const grade = ensureGrade(gradeMap, code, name);
        const weight = entry.totalWeight || 0;

        if (getRowStatus(row) === 'CONFIRMED') {
          grade.confirmedKg += weight;
        } else {
          grade.provisionalKg += weight;
        }
      });
    });

    return { ...truck, gradeInventory: Array.from(gradeMap.values()) };
  });
}

export function getTruckSoldKg(truck: Truck) {
  return truck.gradeInventory.reduce((sum, grade) => sum + grade.confirmedKg + grade.provisionalKg, 0);
}

export function getTruckAvailableKg(truck: Truck) {
  return Math.max(0, truck.totalKg - getTruckSoldKg(truck) - (truck.wastageKg || 0));
}

export function getTruckAccountedKg(truck: Truck) {
  return Math.max(0, truck.totalKg - getTruckAvailableKg(truck));
}

export function getTruckAccountedPct(truck: Truck) {
  if (truck.totalKg <= 0) return 0;
  return Math.min(100, Math.round((getTruckAccountedKg(truck) / truck.totalKg) * 100));
}
