-- Operational workflow alignment for reference slips, godown loss, and hidden source stock.

alter table public.trucks
  add column if not exists sender_name_hi text,
  add column if not exists gate_no text,
  add column if not exists arrival_time bigint,
  add column if not exists gate_out_time bigint,
  add column if not exists source_agent_name text not null default '',
  add column if not exists source_agent_phone text not null default '',
  add column if not exists source_agent_hidden boolean not null default true,
  add column if not exists source_truck_id text,
  add column if not exists gross_arrival_kg numeric,
  add column if not exists wastage_kg numeric not null default 0,
  add column if not exists wastage_reason text not null default '';

alter table public.inquiries
  add column if not exists payment_received_at bigint,
  add column if not exists payment_received_by text not null default '',
  add column if not exists authorized_at bigint,
  add column if not exists authorized_by text not null default '',
  add column if not exists customer_bill_sent_at bigint,
  add column if not exists customer_bill_sent_to text not null default '',
  add column if not exists source_agent_name text not null default '',
  add column if not exists source_agent_phone text not null default '',
  add column if not exists source_agent_hidden boolean not null default true;

create index if not exists trucks_shop_source_agent_idx
  on public.trucks (shop_id, source_agent_hidden, source_agent_name);

create unique index if not exists trucks_unique_godown_source_idx
  on public.trucks (source_truck_id)
  where source_truck_id is not null;

create index if not exists inquiries_shop_slip_status_idx
  on public.inquiries (shop_id, slip_status, status, created_at);
