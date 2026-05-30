export type InquiryStatus = 'PENDING' | 'DELIVERED' | 'CONFIRMED' | 'CANCELLED';
export type SlipStatus = 'draft' | 'authorized';
export type PaymentMode = 'CASH' | 'UPI' | 'UDHAARI' | 'CHEQUE' | 'PENDING';

export type Inquiry = {
  id: string;
  shopId: string;
  slipNumber: number;
  truckId: string | null;
  truckNumber: string;
  customerName: string;
  customerPhone: string;
  grade: string;
  gradeName: string;
  sacks: number;
  weightPerSack: number;
  totalWeight: number;
  ratePerKg: number;
  grossAmount: number;
  apmcAmount: number;
  bardanaAmount: number;
  cartageAmount: number;
  bardanaSacks: number;
  bardanaRate: number;
  applyBardana: boolean;
  applyApmc: boolean;
  chargeSnapshot: Record<string, unknown>;
  netAmount: number;
  paymentMode: PaymentMode;
  upiRef: string;
  status: InquiryStatus;
  slipStatus: SlipStatus;
  paymentReceivedAt?: number;
  paymentReceivedBy?: string;
  authorizedAt?: number;
  authorizedBy?: string;
  customerBillSentAt?: number;
  customerBillSentTo?: string;
  sourceAgentName?: string;
  sourceAgentPhone?: string;
  sourceAgentHidden: boolean;
  date: number;
  createdAt: number;
};

export type Buyer = {
  id: string;
  shopId: string;
  code: string;
  name: string;
  phone: string;
  outstandingBalance: number;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  openingBalanceDate?: number;
  openingBalanceSet: boolean;
  notes?: string;
  lastTransactionDate: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: number;
  createdAt: number;
};

export type TransactionType = 'SALE' | 'PAYMENT' | 'OPENING';
export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE';

export type Transaction = {
  id: string;
  shopId?: string;
  buyerCode?: string;
  type: TransactionType;
  amount: number;
  date: number;
  paymentMethod?: PaymentMethod;
  upiRef?: string;
  note?: string;
  slipNumber?: number;
  createdAt: number;
};
