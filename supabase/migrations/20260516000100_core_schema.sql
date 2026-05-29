-- MandiBook production schema baseline.
-- Apply this to a fresh Supabase project before enabling the app in production.

create table if not exists public.shops (
  id text primary key,
  firm_name text not null,
  owner_name text not null default '',
  address text not null default '',
  city text not null default '',
  phone1 text not null default '',
  phone2 text not null default '',
  upi_id text not null default '',
  upi_apps jsonb not null default '[]'::jsonb,
  commodity text not null default 'Mosambi',
  grades jsonb not null default '[]'::jsonb,
  charges jsonb not null default '{}'::jsonb,
  admin_pin_hash text,
  admin_pin text,
  team_names jsonb not null default '[]'::jsonb,
  created_at bigint not null
);

create table if not exists public.shop_memberships (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references public.shops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'ADMIN' check (role in ('ADMIN', 'MEMBER')),
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  unique (shop_id, user_id)
);

create table if not exists public.members (
  id text primary key,
  shop_id text not null references public.shops(id) on delete cascade,
  name text not null,
  phone text not null,
  pin_hash text,
  pin text,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  created_at bigint not null,
  unique (shop_id, phone)
);

create table if not exists public.trucks (
  id text primary key,
  shop_id text not null references public.shops(id) on delete cascade,
  truck_number text not null,
  sender_name text not null default '',
  sender_code text not null default '',
  chl_number text not null default '',
  total_kg numeric not null default 0,
  freight_amount numeric not null default 0,
  grade_inventory jsonb not null default '[]'::jsonb,
  is_godown boolean not null default false,
  godown_date bigint,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED')),
  date bigint not null,
  created_at bigint not null
);

create table if not exists public.inquiries (
  id text primary key,
  shop_id text not null references public.shops(id) on delete cascade,
  slip_number integer not null,
  truck_id text not null references public.trucks(id) on delete cascade,
  truck_number text not null,
  customer_name text not null,
  customer_phone text not null default '',
  grade text not null,
  grade_name text not null,
  sacks integer not null,
  weight_per_sack numeric not null,
  total_weight numeric not null,
  rate_per_kg numeric not null default 0,
  gross_amount numeric not null default 0,
  apmc_amount numeric not null default 0,
  bardana_amount numeric not null default 0,
  cartage_amount numeric not null default 0,
  bardana_sacks numeric not null default 0,
  bardana_rate numeric not null default 0,
  apply_bardana boolean not null default false,
  apply_apmc boolean not null default true,
  charge_snapshot jsonb not null default '{}'::jsonb,
  net_amount numeric not null default 0,
  payment_mode text not null default 'PENDING' check (payment_mode in ('CASH', 'UPI', 'UDHAARI', 'CHEQUE', 'PENDING')),
  upi_ref text not null default '',
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'CANCELLED')),
  date bigint not null,
  created_at bigint not null
);

create table if not exists public.buyers (
  id text primary key,
  shop_id text not null references public.shops(id) on delete cascade,
  code text not null,
  name text not null,
  phone text not null default '',
  outstanding_balance numeric not null default 0,
  opening_balance numeric not null default 0,
  opening_balance_type text not null default 'DR' check (opening_balance_type in ('DR', 'CR')),
  opening_balance_date bigint,
  opening_balance_set boolean not null default false,
  notes text not null default '',
  last_transaction_date bigint not null,
  last_payment_amount numeric,
  last_payment_date bigint,
  created_at bigint not null,
  unique (shop_id, code)
);

create table if not exists public.transactions (
  id text primary key,
  shop_id text not null references public.shops(id) on delete cascade,
  buyer_code text not null,
  type text not null check (type in ('SALE', 'PAYMENT', 'OPENING')),
  amount numeric not null,
  date bigint not null,
  payment_method text check (payment_method in ('CASH', 'UPI', 'CHEQUE') or payment_method is null),
  upi_ref text,
  note text,
  description text,
  slip_number integer,
  created_at bigint not null,
  foreign key (shop_id, buyer_code) references public.buyers(shop_id, code) on delete cascade
);

create table if not exists public.truck_grade_entries (
  id text primary key,
  truck_id text not null references public.trucks(id) on delete cascade,
  grade_label text not null,
  weight_kg numeric not null default 0,
  created_at bigint not null
);

create table if not exists public.day_closures (
  id uuid primary key default gen_random_uuid(),
  shop_id text not null references public.shops(id) on delete cascade,
  report_date bigint not null,
  closed_by text not null,
  totals jsonb not null default '{}'::jsonb,
  closed_at bigint not null,
  created_at bigint not null,
  unique (shop_id, report_date)
);
