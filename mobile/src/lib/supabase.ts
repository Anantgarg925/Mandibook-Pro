import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Inquiry, InquiryStatus, PaymentMode, SlipStatus } from '@/types/inquiry';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Create a fail-safe client to prevent boot-time crashes if keys are missing (common on Vercel build step or local start before env resolves)
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          };
        }
        return (...args: any[]) => {
          console.warn(`[Supabase Safe Proxy] Call to "${String(prop)}" failed because Supabase env variables are missing.`);
          const builder = {
            select: () => builder,
            insert: () => builder,
            update: () => builder,
            upsert: () => builder,
            delete: () => builder,
            eq: () => builder,
            single: () => Promise.resolve({ data: null, error: new Error('Supabase credentials missing') }),
            then: (resolve: any) => resolve({ data: null, error: new Error('Supabase credentials missing') }),
          };
          return builder;
        };
      }
    });

// ─── helpers to map DB snake_case → app camelCase ────────────────────────────

export function mapShop(row: Record<string, unknown>) {
  return {
    shopId: row.id as string,
    firmName: row.firm_name as string,
    ownerName: row.owner_name as string,
    address: row.address as string,
    city: row.city as string,
    phone1: row.phone1 as string,
    phone2: (row.phone2 as string) ?? '',
    upiId: (row.upi_id as string) ?? '',
    upiApps: (row.upi_apps as string[]) ?? [],
    commodity: row.commodity as string,
    grades: (row.grades as { code: string; name: string }[]) ?? [],
    charges: (row.charges as {
      apmcCommission: number;
      agentCommission: number;
      bardanaPerSack: number;
      cartagePerKg: number;
      telePost: number;
    }) ?? {},
    adminPin: (row.admin_pin as string) ?? '',
    teamMembers: ((row.team_names as unknown[]) ?? []).map(t => {
      try {
        if (typeof t === 'string' && t.startsWith('{')) {
          const parsed = JSON.parse(t);
          return { ...parsed, pin: '' };
        }
        if (typeof t === 'object' && t !== null) {
          const parsed = t as Record<string, unknown>;
          return {
            id: String(parsed.id ?? Math.random().toString()),
            name: String(parsed.name ?? ''),
            phone: String(parsed.phone ?? ''),
            pin: '',
            role: String(parsed.role ?? 'MEMBER'),
          };
        }
        return { id: Math.random().toString(), name: t, phone: '', pin: '', role: 'MEMBER' };
      } catch {
        return { id: Math.random().toString(), name: t, phone: '', pin: '', role: 'MEMBER' };
      }
    }),
    createdAt: row.created_at as number,
  };
}

export function mapTruck(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    shopId: row.shop_id as string,
    truckNumber: row.truck_number as string,
    senderName: row.sender_name as string,
    senderNameHi: row.sender_name_hi as string | undefined,
    senderCode: (row.sender_code as string) ?? '',
    chlNumber: (row.chl_number as string) ?? '',
    gateNo: row.gate_no as string | undefined,
    arrivalTime: row.arrival_time as number | undefined,
    gateOutTime: row.gate_out_time as number | undefined,
    totalKg: row.total_kg as number,
    grossArrivalKg: row.gross_arrival_kg as number | undefined,
    wastageKg: (row.wastage_kg as number) ?? 0,
    wastageReason: (row.wastage_reason as string) ?? '',
    freightAmount: (row.freight_amount as number) ?? 0,
    gradeInventory: (row.grade_inventory as {
      code: string;
      name: string;
      totalKg: number;
      confirmedKg: number;
      provisionalKg: number;
    }[]) ?? [],
    referenceSlipNumber: (row.reference_slip_number as string) ?? undefined,
    sourceAgentName: (row.source_agent_name as string) ?? '',
    sourceAgentPhone: (row.source_agent_phone as string) ?? '',
    sourceAgentHidden: false,
    sourceTruckId: (row.source_truck_id as string) ?? undefined,
    isGodown: (row.is_godown as boolean) ?? false,
    godownDate: row.godown_date as number | undefined,
    status: (row.status as string) ?? 'ACTIVE',
    date: row.date as number,
    createdAt: row.created_at as number,
  };
}

export function mapInquiry(row: Record<string, unknown>): Inquiry {
  return {
    id: row.id as string,
    shopId: row.shop_id as string,
    slipNumber: row.slip_number as number,
    truckId: (row.truck_id as string | null) ?? null,
    truckNumber: row.truck_number as string,
    customerName: row.customer_name as string,
    customerPhone: (row.customer_phone as string) ?? '',
    grade: row.grade as string,
    gradeName: row.grade_name as string,
    sacks: row.sacks as number,
    weightPerSack: row.weight_per_sack as number,
    totalWeight: row.total_weight as number,
    ratePerKg: (row.rate_per_kg as number) ?? 0,
    grossAmount: (row.gross_amount as number) ?? 0,
    apmcAmount: (row.apmc_amount as number) ?? 0,
    bardanaAmount: (row.bardana_amount as number) ?? 0,
    cartageAmount: (row.cartage_amount as number) ?? 0,
    bardanaSacks: (row.bardana_sacks as number) ?? (row.sacks as number) ?? 0,
    bardanaRate: (row.bardana_rate as number) ?? 0,
    applyBardana: ((row.apply_bardana as boolean | null) ?? false) || (((row.bardana_amount as number) ?? 0) > 0),
    applyApmc: (row.apply_apmc as boolean) ?? true,
    chargeSnapshot: (row.charge_snapshot as Record<string, unknown>) ?? {},
    netAmount: (row.net_amount as number) ?? 0,
    paymentMode: (row.payment_mode as PaymentMode) ?? 'CASH',
    upiRef: (row.upi_ref as string) ?? '',
    status: (row.status as InquiryStatus) ?? 'PENDING',
    slipStatus: (row.slip_status as SlipStatus) ?? ((row.status as string) === 'CONFIRMED' ? 'authorized' : 'draft'),
    paymentReceivedAt: row.payment_received_at as number | undefined,
    paymentReceivedBy: (row.payment_received_by as string) ?? '',
    authorizedAt: row.authorized_at as number | undefined,
    authorizedBy: (row.authorized_by as string) ?? '',
    customerBillSentAt: row.customer_bill_sent_at as number | undefined,
    customerBillSentTo: (row.customer_bill_sent_to as string) ?? '',
    sourceAgentName: (row.source_agent_name as string) ?? '',
    sourceAgentPhone: (row.source_agent_phone as string) ?? '',
    sourceAgentHidden: (row.source_agent_hidden as boolean) ?? true,
    date: row.date as number,
    createdAt: row.created_at as number,
  };
}

export function mapBuyer(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    shopId: row.shop_id as string,
    code: row.code as string,
    name: row.name as string,
    phone: (row.phone as string) ?? '',
    outstandingBalance: (row.outstanding_balance as number) ?? 0,
    openingBalance: (row.opening_balance as number) ?? 0,
    openingBalanceType: (row.opening_balance_type as 'DR' | 'CR') ?? 'DR',
    openingBalanceDate: row.opening_balance_date as number | undefined,
    openingBalanceSet: (row.opening_balance_set as boolean) ?? false,
    notes: (row.notes as string) ?? '',
    lastTransactionDate: row.last_transaction_date as number,
    lastPaymentAmount: row.last_payment_amount as number | undefined,
    lastPaymentDate: row.last_payment_date as number | undefined,
    createdAt: row.created_at as number,
  };
}

export function mapTruckGradeEntry(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    truckId: row.truck_id as string,
    gradeLabel: row.grade_label as string,
    weightKg: (row.weight_kg as number) ?? 0,
    createdAt: row.created_at as number,
  };
}

export function mapTransaction(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    shopId: row.shop_id as string,
    buyerCode: row.buyer_code as string,
    type: row.type as string,
    amount: row.amount as number,
    date: row.date as number,
    paymentMethod: row.payment_method as string | undefined,
    upiRef: row.upi_ref as string | undefined,
    note: row.note as string | undefined,
    description: row.description as string | undefined,
    slipNumber: row.slip_number as number | undefined,
    createdAt: row.created_at as number,
  };
}
