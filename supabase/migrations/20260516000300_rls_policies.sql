-- Production RLS baseline.
-- This expects real Supabase Auth users and rows in public.shop_memberships.
-- Do not apply to the current anon-PIN prototype until authentication is wired in.

alter table public.shops enable row level security;
alter table public.shop_memberships enable row level security;
alter table public.members enable row level security;
alter table public.trucks enable row level security;
alter table public.inquiries enable row level security;
alter table public.buyers enable row level security;
alter table public.transactions enable row level security;
alter table public.day_closures enable row level security;
alter table public.truck_grade_entries enable row level security;

create schema if not exists app_private;

create or replace function app_private.current_user_shop_ids()
returns setof text
language sql
stable
security definer
set search_path = public, app_private
as $$
  select sm.shop_id
  from public.shop_memberships sm
  where sm.user_id = (select auth.uid())
$$;

create or replace function app_private.is_shop_admin(target_shop_id text)
returns boolean
language sql
stable
security definer
set search_path = public, app_private
as $$
  select exists (
    select 1
    from public.shop_memberships sm
    where sm.user_id = (select auth.uid())
      and sm.shop_id = target_shop_id
      and sm.role = 'ADMIN'
  )
$$;

create policy "shop members can read shops"
on public.shops for select
to authenticated
using (id in (select app_private.current_user_shop_ids()));

create policy "shop admins can update shops"
on public.shops for update
to authenticated
using (app_private.is_shop_admin(id))
with check (app_private.is_shop_admin(id));

create policy "users can read their own memberships"
on public.shop_memberships for select
to authenticated
using (user_id = (select auth.uid()) or app_private.is_shop_admin(shop_id));

create policy "shop admins manage memberships"
on public.shop_memberships for all
to authenticated
using (app_private.is_shop_admin(shop_id))
with check (app_private.is_shop_admin(shop_id));

create policy "shop members read members"
on public.members for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop admins manage members"
on public.members for all
to authenticated
using (app_private.is_shop_admin(shop_id))
with check (app_private.is_shop_admin(shop_id));

create policy "shop members read trucks"
on public.trucks for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members write trucks"
on public.trucks for insert
to authenticated
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members update trucks"
on public.trucks for update
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()))
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members read inquiries"
on public.inquiries for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members create inquiries"
on public.inquiries for insert
to authenticated
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members update inquiries"
on public.inquiries for update
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()))
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members read buyers"
on public.buyers for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members write buyers"
on public.buyers for insert
to authenticated
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members update buyers"
on public.buyers for update
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()))
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members read transactions"
on public.transactions for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members write transactions"
on public.transactions for insert
to authenticated
with check (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop members read day closures"
on public.day_closures for select
to authenticated
using (shop_id in (select app_private.current_user_shop_ids()));

create policy "shop admins manage day closures"
on public.day_closures for all
to authenticated
using (app_private.is_shop_admin(shop_id))
with check (app_private.is_shop_admin(shop_id));

create policy "shop members read truck grade entries"
on public.truck_grade_entries for select
to authenticated
using (
  exists (
    select 1
    from public.trucks t
    where t.id = truck_grade_entries.truck_id
      and t.shop_id in (select app_private.current_user_shop_ids())
  )
);

create policy "shop members write truck grade entries"
on public.truck_grade_entries for insert
to authenticated
with check (
  exists (
    select 1
    from public.trucks t
    where t.id = truck_grade_entries.truck_id
      and t.shop_id in (select app_private.current_user_shop_ids())
  )
);

create policy "shop members update truck grade entries"
on public.truck_grade_entries for update
to authenticated
using (
  exists (
    select 1
    from public.trucks t
    where t.id = truck_grade_entries.truck_id
      and t.shop_id in (select app_private.current_user_shop_ids())
  )
)
with check (
  exists (
    select 1
    from public.trucks t
    where t.id = truck_grade_entries.truck_id
      and t.shop_id in (select app_private.current_user_shop_ids())
  )
);

create policy "shop members delete truck grade entries"
on public.truck_grade_entries for delete
to authenticated
using (
  exists (
    select 1
    from public.trucks t
    where t.id = truck_grade_entries.truck_id
      and t.shop_id in (select app_private.current_user_shop_ids())
  )
);
