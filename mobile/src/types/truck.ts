export type GradeInventory = {
  code: string;
  name: string;
  totalKg: number;
  confirmedKg: number;
  provisionalKg: number;
};

export type TruckStatus = 'ACTIVE' | 'CLOSED';

export type Truck = {
  id: string;
  shopId: string;
  truckNumber: string;
  senderName: string;
  senderNameHi?: string;
  senderCode: string;
  chlNumber: string;
  gateNo?: string;
  arrivalTime?: number;
  gateOutTime?: number;
  totalKg: number;
  grossArrivalKg?: number;
  wastageKg: number;
  wastageReason?: string;
  freightAmount: number;
  gradeInventory: GradeInventory[];
  referenceSlipNumber?: string;
  sourceAgentName?: string;
  sourceAgentPhone?: string;
  sourceAgentHidden: boolean;
  sourceTruckId?: string;
  isGodown: boolean;
  godownDate?: number;
  status: TruckStatus;
  date: number;
  createdAt: number;
};

export type TruckGradeEntry = {
  id: string;
  truckId: string;
  gradeLabel: string;
  weightKg: number;
  createdAt: number;
};
