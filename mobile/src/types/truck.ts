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
  senderCode: string;
  chlNumber: string;
  totalKg: number;
  freightAmount: number;
  gradeInventory: GradeInventory[];
  status: TruckStatus;
  date: number;
  createdAt: number;
};
