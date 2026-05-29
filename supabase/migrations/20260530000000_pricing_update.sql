-- Update standard_price_inr default to 649
alter table if exists public.shop_subscriptions alter column standard_price_inr set default 649;

create or replace function app_private.ensure_subscription_rows()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_existing_early_count integer;
begin
  select count(*)::integer into v_existing_early_count
  from public.shop_subscriptions
  where pricing_plan = 'early_lifetime';

  with missing as (
    select
      s.id as shop_id,
      coalesce(
        case when s.created_at < 1000000000000 then s.created_at * 1000 else s.created_at end,
        v_now
      ) as trial_start,
      row_number() over (order by s.created_at asc, s.id asc) as rn
    from public.shops s
    left join public.shop_subscriptions sub on sub.shop_id = s.id
    where sub.shop_id is null
  )
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
  )
  select
    shop_id,
    'trial',
    trial_start,
    trial_start + (20::bigint * 24 * 60 * 60 * 1000),
    case when v_existing_early_count + rn <= 10 then 399 else 649 end,
    case when v_existing_early_count + rn <= 10 then 'early_lifetime' else 'standard' end,
    case when v_existing_early_count + rn <= 10 then v_existing_early_count + rn else null end,
    3,
    99,
    649
  from missing
  on conflict (shop_id) do nothing;
end;
$$;

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
  v_grace_ends_at bigint;
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

  if v_early_count < 10 then
    v_pricing_plan := 'early_lifetime';
    v_early_customer_number := v_early_count + 1;
    v_monthly_price_inr := 399;
  else
    v_pricing_plan := 'standard';
    v_early_customer_number := null;
    v_monthly_price_inr := 649;
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
    649
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

  v_grace_ends_at := case
    when v_sub.payment_requested_at is not null then v_sub.payment_requested_at + (24::bigint * 60 * 60 * 1000)
    else null
  end;

  v_status := case
    when v_sub.status in ('cancelled', 'rejected') then v_sub.status
    when v_sub.current_period_ends_at is not null and v_sub.current_period_ends_at > v_now then 'active'
    when v_sub.status = 'payment_pending' and v_grace_ends_at is not null and v_grace_ends_at > v_now then 'payment_pending'
    when v_sub.trial_ends_at > v_now then 'trial'
    else 'expired'
  end;

  if v_sub.status is distinct from v_status then
    update public.shop_subscriptions
    set status = v_status,
        updated_at = v_now
    where shop_id = p_shop_id;

    select * into v_sub
    from public.shop_subscriptions
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
    'payment_grace_ends_at', case when v_status = 'payment_pending' then v_grace_ends_at else null end,
    'payment_note', v_sub.payment_note,
    'payment_rejected_at', v_sub.payment_rejected_at,
    'payment_rejected_reason', v_sub.payment_rejected_reason,
    'server_time', v_now
  );
end;
$$;
