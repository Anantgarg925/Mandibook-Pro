export type InquiryStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'UDHAARI' | 'PENDING';

export type Inquiry = {
  id: string;
  shopId: string;
  slipNumber: number;
  truckId: string;
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
  netAmount: number;
  paymentMode: PaymentMode;
  upiRef: string;
  status: InquiryStatus;
  date: number;
  createdAt: number;
};

export type Buyer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  outstandingBalance: number;
  lastTransactionDate: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: number;
  createdAt: number;
};

export type TransactionType = 'SALE' | 'PAYMENT';
export type PaymentMethod = 'CASH' | 'UPI' | 'CHEQUE';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: number;
  paymentMethod?: PaymentMethod;
  upiRef?: string;
  note?: string;
  slipNumber?: number;
  createdAt: number;
};
