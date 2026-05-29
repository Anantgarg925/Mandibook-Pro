-- Explicit Data API grants for new Supabase projects where public tables are not
-- automatically exposed. RLS policies in 20260516000300 still control row access.

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.shops,
  public.shop_memberships,
  public.members,
  public.trucks,
  public.inquiries,
  public.buyers,
  public.transactions,
  public.truck_grade_entries,
  public.day_closures
to authenticated;
