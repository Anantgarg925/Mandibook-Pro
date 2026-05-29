alter table public.buyers
  add column if not exists opening_balance numeric not null default 0,
  add column if not exists opening_balance_type text not null default 'DR' check (opening_balance_type in ('DR', 'CR')),
  add column if not exists opening_balance_date bigint,
  add column if not exists opening_balance_set boolean not null default false,
  add column if not exists notes text not null default '';

alter table public.trucks
  add column if not exists is_godown boolean not null default false,
  add column if not exists godown_date bigint;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check check (type in ('SALE', 'PAYMENT', 'OPENING'));

alter table public.inquiries drop constraint if exists inquiries_payment_mode_check;
alter table public.inquiries
  add constraint inquiries_payment_mode_check check (payment_mode in ('CASH', 'UPI', 'UDHAARI', 'CHEQUE', 'PENDING'));

create table if not exists public.truck_grade_entries (
  id text primary key,
  truck_id text not null references public.trucks(id) on delete cascade,
  grade_label text not null,
  weight_kg numeric not null default 0,
  created_at bigint not null
);

create index if not exists truck_grade_entries_truck_idx
  on public.truck_grade_entries (truck_id, created_at);

create index if not exists trucks_shop_godown_idx
  on public.trucks (shop_id, is_godown, godown_date);
