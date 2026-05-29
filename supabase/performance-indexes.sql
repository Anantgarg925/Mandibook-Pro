-- Speed up the mobile app's common Supabase reads as data grows.
-- Run this in Supabase Dashboard > SQL Editor for your project.

create index if not exists inquiries_shop_date_created_idx
  on public.inquiries (shop_id, date, created_at desc);

create index if not exists inquiries_shop_status_date_idx
  on public.inquiries (shop_id, status, date, created_at desc);

create index if not exists inquiries_shop_truck_date_idx
  on public.inquiries (shop_id, truck_id, date, created_at desc);

create index if not exists trucks_shop_date_created_idx
  on public.trucks (shop_id, date, created_at desc);

create index if not exists buyers_shop_name_idx
  on public.buyers (shop_id, name);

create index if not exists buyers_shop_phone_idx
  on public.buyers (shop_id, phone);

create index if not exists transactions_shop_buyer_date_idx
  on public.transactions (shop_id, buyer_code, date, created_at desc);

create index if not exists day_closures_shop_report_date_idx
  on public.day_closures (shop_id, report_date);
