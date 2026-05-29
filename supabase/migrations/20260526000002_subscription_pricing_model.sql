-- Early customer subscription pricing.
-- First 50 firms get Rs 399/month locked while subscribed; later firms pay Rs 550/month.

alter table public.shop_subscriptions
  add column if not exists pricing_plan text not null default 'early_lifetime',
  add column if not exists early_customer_number integer,
  add column if not exists included_user_count integer not null default 3,
  add column if not exists extra_user_price_inr integer not null default 99,
  add column if not exists standard_price_inr integer not null default 550;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shop_subscriptions_pricing_plan_check'
      and conrelid = 'public.shop_subscriptions'::regclass
  ) then
    alter table public.shop_subscriptions
      add constraint shop_subscriptions_pricing_plan_check
      check (pricing_plan in ('early_lifetime', 'standard'));
  end if;
end $$;

with ranked as (
  select
    shop_id,
    row_number() over (order by created_at asc, shop_id asc) as rn
  from public.shop_subscriptions
)
update public.shop_subscriptions s
set pricing_plan = case when ranked.rn <= 50 then 'early_lifetime' else 'standard' end,
    early_customer_number = case when ranked.rn <= 50 then ranked.rn else null end,
    monthly_price_inr = case when ranked.rn <= 50 then 399 else 550 end,
    included_user_count = coalesce(s.included_user_count, 3),
    extra_user_price_inr = coalesce(s.extra_user_price_inr, 99),
    standard_price_inr = 550,
    updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
from ranked
where s.shop_id = ranked.shop_id;

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
  v_early_count integer;
  v_pricing_plan text;
  v_early_customer_number integer;
  v_monthly_price_inr integer;
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

  select count(*)::integer into v_early_count
  from public.shop_subscriptions
  where pricing_plan = 'early_lifetime';

  if v_early_count < 50 then
    v_pricing_plan := 'early_lifetime';
    v_early_customer_number := v_early_count + 1;
    v_monthly_price_inr := 399;
  else
    v_pricing_plan := 'standard';
    v_early_customer_number := null;
    v_monthly_price_inr := 550;
  end if;

  insert into public.shop_subscriptions (
    shop_id,
    status,
    trial_started_at,
    trial_ends_at,
    monthly_price_inr,
    pricing_plan,
    early_customer_number,
    included_user_count,
    extra_user_price_inr,
    standard_price_inr
  ) values (
    p_shop_id,
    'trial',
    v_trial_start,
    v_trial_start + (20::bigint * 24 * 60 * 60 * 1000),
    v_monthly_price_inr,
    v_pricing_plan,
    v_early_customer_number,
    3,
    99,
    550
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
    'pricing_plan', v_sub.pricing_plan,
    'early_customer_number', v_sub.early_customer_number,
    'included_user_count', v_sub.included_user_count,
    'extra_user_price_inr', v_sub.extra_user_price_inr,
    'standard_price_inr', v_sub.standard_price_inr,
    'payment_requested_at', v_sub.payment_requested_at,
    'payment_note', v_sub.payment_note,
    'server_time', v_now
  );
end;
$$;

revoke all on function public.get_subscription_status(text) from public;
grant execute on function public.get_subscription_status(text) to anon, authenticated;
