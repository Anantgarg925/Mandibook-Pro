export type InquiryStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'UDHAARI';

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
  name: string;
  phone: string;
  lastTransactionDate: number;
};
