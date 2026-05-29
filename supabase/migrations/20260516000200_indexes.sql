create index if not exists trucks_shop_date_idx
  on public.trucks (shop_id, date, created_at desc);

create index if not exists trucks_shop_godown_idx
  on public.trucks (shop_id, is_godown, godown_date);

create index if not exists inquiries_shop_date_status_idx
  on public.inquiries (shop_id, date, status, created_at desc);

create index if not exists inquiries_shop_customer_idx
  on public.inquiries (shop_id, customer_name, date desc);

create index if not exists buyers_shop_code_idx
  on public.buyers (shop_id, code);

create index if not exists transactions_shop_buyer_date_idx
  on public.transactions (shop_id, buyer_code, date, created_at desc);

create index if not exists day_closures_shop_report_date_idx
  on public.day_closures (shop_id, report_date);

create index if not exists shop_memberships_user_idx
  on public.shop_memberships (user_id, shop_id);

create index if not exists truck_grade_entries_truck_idx
  on public.truck_grade_entries (truck_id, created_at);
