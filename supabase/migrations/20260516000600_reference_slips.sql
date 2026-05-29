alter table public.trucks
  add column if not exists reference_slip_number text;

alter table public.inquiries
  add column if not exists slip_status text not null default 'draft';

alter table public.inquiries drop constraint if exists inquiries_slip_status_check;
alter table public.inquiries
  add constraint inquiries_slip_status_check check (slip_status in ('draft', 'authorized'));

create index if not exists trucks_shop_reference_slip_idx
  on public.trucks (shop_id, reference_slip_number);
