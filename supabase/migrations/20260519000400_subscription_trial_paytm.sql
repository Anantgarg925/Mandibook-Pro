-- Subscription/trial support for direct APK distribution.
-- 20 day free trial, then manual Paytm/UPI payment verification.

create table if not exists public.shop_subscriptions (
  shop_id text primary key references public.shops(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'payment_pending', 'expired', 'cancelled')),
  trial_started_at bigint not null,
  trial_ends_at bigint not null,
  current_period_ends_at bigint,
  monthly_price_inr integer not null default 399,
  payment_requested_at bigint,
  payment_note text,
  payment_verified_at bigint,
  updated_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint,
  created_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint
);

alter table public.shop_subscriptions enable row level security;

drop policy if exists "no direct subscription access" on public.shop_subscriptions;
create policy "no direct subscription access"
on public.shop_subscriptions
for all
using (false)
with check (false);

create or replace function public.get_subscription_status(p_shop_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_shop public.shops%rowtype;
  v_sub public.shop_subscriptions%rowtype;
  v_trial_start bigint;
  v_status text;
  v_days_remaining integer;
begin
  select * into v_shop
  from public.shops
  where id = p_shop_id;

  if not found then
    raise exception 'Shop not found';
  end if;

  v_trial_start := coalesce(v_shop.created_at, v_now);
  if v_trial_start < 1000000000000 then
    v_trial_start := v_trial_start * 1000;
  end if;

  insert into public.shop_subscriptions (
    shop_id,
    status,
    trial_started_at,
    trial_ends_at,
    monthly_price_inr
  ) values (
    p_shop_id,
    'trial',
    v_trial_start,
    v_trial_start + (20::bigint * 24 * 60 * 60 * 1000),
    399
  )
  on conflict (shop_id) do nothing;

  select * into v_sub
  from public.shop_subscriptions
  where shop_id = p_shop_id;

  if v_sub.trial_started_at < 1000000000000 then
    update public.shop_subscriptions
    set trial_started_at = v_trial_start,
        trial_ends_at = v_trial_start + (20::bigint * 24 * 60 * 60 * 1000),
        updated_at = v_now
    where shop_id = p_shop_id;

    select * into v_sub
    from public.shop_subscriptions
    where shop_id = p_shop_id;
  end if;

  v_status := case
    when v_sub.status = 'cancelled' then 'cancelled'
    when v_sub.current_period_ends_at is not null and v_sub.current_period_ends_at > v_now then 'active'
    when v_sub.status = 'payment_pending' then 'payment_pending'
    when v_sub.trial_ends_at > v_now then 'trial'
    else 'expired'
  end;

  if v_sub.status is distinct from v_status then
    update public.shop_subscriptions
    set status = v_status,
        updated_at = v_now
    where shop_id = p_shop_id;
  end if;

  v_days_remaining := greatest(
    0,
    ceil(((coalesce(v_sub.current_period_ends_at, v_sub.trial_ends_at) - v_now)::numeric) / 86400000)::integer
  );

  return jsonb_build_object(
    'shop_id', p_shop_id,
    'status', v_status,
    'is_allowed', v_status in ('trial', 'active', 'payment_pending'),
    'days_remaining', v_days_remaining,
    'trial_started_at', v_sub.trial_started_at,
    'trial_ends_at', v_sub.trial_ends_at,
    'current_period_ends_at', v_sub.current_period_ends_at,
    'monthly_price_inr', v_sub.monthly_price_inr,
    'payment_requested_at', v_sub.payment_requested_at,
    'payment_note', v_sub.payment_note,
    'server_time', v_now
  );
end;
$$;

revoke all on function public.get_subscription_status(text) from public;
grant execute on function public.get_subscription_status(text) to anon, authenticated;

create or replace function public.submit_subscription_payment(
  p_shop_id text,
  p_payment_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  perform public.get_subscription_status(p_shop_id);

  update public.shop_subscriptions
  set status = 'payment_pending',
      payment_requested_at = v_now,
      payment_note = nullif(trim(coalesce(p_payment_note, '')), ''),
      updated_at = v_now
  where shop_id = p_shop_id;

  return public.get_subscription_status(p_shop_id);
end;
$$;

revoke all on function public.submit_subscription_payment(text, text) from public;
grant execute on function public.submit_subscription_payment(text, text) to anon, authenticated;

-- Manual approval query for you after confirming Paytm payment:
--
-- update public.shop_subscriptions
-- set status = 'active',
--     current_period_ends_at = (extract(epoch from clock_timestamp()) * 1000)::bigint + (30::bigint * 24 * 60 * 60 * 1000),
--     payment_verified_at = (extract(epoch from clock_timestamp()) * 1000)::bigint,
--     updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
-- where shop_id = 'SHOP_ID_HERE';
