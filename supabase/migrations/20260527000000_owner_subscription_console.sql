-- Owner subscription console with 24 hour payment-pending grace.
-- Apply this in Supabase SQL editor, then set your owner key:
--
-- update app_private.owner_console_settings
-- set secret_hash = extensions.crypt('CHANGE_THIS_OWNER_KEY', extensions.gen_salt('bf')),
--     updated_at = (extract(epoch from clock_timestamp()) * 1000)::bigint
-- where id = 1;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists app_private;

alter table public.shop_subscriptions
  add column if not exists pricing_plan text not null default 'early_lifetime',
  add column if not exists early_customer_number integer,
  add column if not exists included_user_count integer not null default 3,
  add column if not exists extra_user_price_inr integer not null default 99,
  add column if not exists standard_price_inr integer not null default 550,
  add column if not exists payment_rejected_at bigint,
  add column if not exists payment_rejected_reason text,
  add column if not exists payment_verified_by text;

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

alter table public.shop_subscriptions
  drop constraint if exists shop_subscriptions_status_check;

alter table public.shop_subscriptions
  add constraint shop_subscriptions_status_check
  check (status in ('trial', 'active', 'payment_pending', 'expired', 'cancelled', 'rejected'));

create table if not exists app_private.owner_console_settings (
  id integer primary key default 1 check (id = 1),
  secret_hash text,
  created_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint
);

insert into app_private.owner_console_settings (id)
values (1)
on conflict (id) do nothing;

create or replace function app_private.assert_owner_console_key(p_owner_key text)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions
as $$
declare
  v_hash text;
begin
  select secret_hash into v_hash
  from app_private.owner_console_settings
  where id = 1;

  if v_hash is null then
    raise exception 'Owner console key is not configured';
  end if;

  if nullif(trim(coalesce(p_owner_key, '')), '') is null
     or v_hash <> extensions.crypt(p_owner_key, v_hash) then
    raise exception 'Invalid owner key';
  end if;
end;
$$;

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
    case when v_existing_early_count + rn <= 50 then 399 else 550 end,
    case when v_existing_early_count + rn <= 50 then 'early_lifetime' else 'standard' end,
    case when v_existing_early_count + rn <= 50 then v_existing_early_count + rn else null end,
    3,
    99,
    550
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
      payment_rejected_at = null,
      payment_rejected_reason = null,
      updated_at = v_now
  where shop_id = p_shop_id;

  return public.get_subscription_status(p_shop_id);
end;
$$;

create or replace function public.list_owner_subscription_accounts(p_owner_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_accounts jsonb;
  v_summary jsonb;
begin
  perform app_private.assert_owner_console_key(p_owner_key);
  perform app_private.ensure_subscription_rows();

  update public.shop_subscriptions s
  set status = case
      when s.status in ('cancelled', 'rejected') then s.status
      when s.current_period_ends_at is not null and s.current_period_ends_at > v_now then 'active'
      when s.status = 'payment_pending'
        and s.payment_requested_at is not null
        and s.payment_requested_at + (24::bigint * 60 * 60 * 1000) > v_now then 'payment_pending'
      when s.trial_ends_at > v_now then 'trial'
      else 'expired'
    end,
    updated_at = v_now
  where s.status is distinct from case
      when s.status in ('cancelled', 'rejected') then s.status
      when s.current_period_ends_at is not null and s.current_period_ends_at > v_now then 'active'
      when s.status = 'payment_pending'
        and s.payment_requested_at is not null
        and s.payment_requested_at + (24::bigint * 60 * 60 * 1000) > v_now then 'payment_pending'
      when s.trial_ends_at > v_now then 'trial'
      else 'expired'
    end;

  select jsonb_build_object(
    'total', count(*),
    'trial', count(*) filter (where sub.status = 'trial'),
    'active', count(*) filter (where sub.status = 'active'),
    'payment_pending', count(*) filter (where sub.status = 'payment_pending'),
    'expired', count(*) filter (where sub.status = 'expired'),
    'rejected', count(*) filter (where sub.status = 'rejected'),
    'cancelled', count(*) filter (where sub.status = 'cancelled')
  )
  into v_summary
  from public.shop_subscriptions sub;

  select coalesce(jsonb_agg(account order by sort_rank asc, payment_requested_at desc nulls last, created_at desc), '[]'::jsonb)
  into v_accounts
  from (
    select jsonb_build_object(
      'shop_id', s.id,
      'firm_name', s.firm_name,
      'owner_name', s.owner_name,
      'phone1', s.phone1,
      'phone2', s.phone2,
      'city', s.city,
      'commodity', s.commodity,
      'created_at', s.created_at,
      'status', sub.status,
      'is_allowed', sub.status in ('trial', 'active', 'payment_pending'),
      'days_remaining', greatest(
        0,
        ceil(((coalesce(sub.current_period_ends_at, sub.trial_ends_at) - v_now)::numeric) / 86400000)::integer
      ),
      'trial_ends_at', sub.trial_ends_at,
      'current_period_ends_at', sub.current_period_ends_at,
      'monthly_price_inr', sub.monthly_price_inr,
      'pricing_plan', sub.pricing_plan,
      'early_customer_number', sub.early_customer_number,
      'payment_requested_at', sub.payment_requested_at,
      'payment_grace_ends_at', case
        when sub.status = 'payment_pending' and sub.payment_requested_at is not null then sub.payment_requested_at + (24::bigint * 60 * 60 * 1000)
        else null
      end,
      'payment_note', sub.payment_note,
      'payment_verified_at', sub.payment_verified_at,
      'payment_verified_by', sub.payment_verified_by,
      'payment_rejected_at', sub.payment_rejected_at,
      'payment_rejected_reason', sub.payment_rejected_reason,
      'member_count', (
        select count(*)::integer
        from public.members m
        where m.shop_id = s.id
      )
    ) as account,
    sub.payment_requested_at,
    s.created_at,
    case sub.status
      when 'payment_pending' then 1
      when 'expired' then 2
      when 'trial' then 3
      when 'active' then 4
      when 'rejected' then 5
      else 6
    end as sort_rank
    from public.shops s
    join public.shop_subscriptions sub on sub.shop_id = s.id
  ) rows;

  return jsonb_build_object(
    'server_time', v_now,
    'summary', v_summary,
    'accounts', v_accounts
  );
end;
$$;

create or replace function public.approve_subscription_payment(
  p_owner_key text,
  p_shop_id text,
  p_months integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_months integer := greatest(1, least(coalesce(p_months, 1), 24));
  v_start bigint;
begin
  perform app_private.assert_owner_console_key(p_owner_key);
  perform public.get_subscription_status(p_shop_id);

  select greatest(v_now, coalesce(current_period_ends_at, 0))
  into v_start
  from public.shop_subscriptions
  where shop_id = p_shop_id
  for update;

  update public.shop_subscriptions
  set status = 'active',
      current_period_ends_at = v_start + (v_months::bigint * 30 * 24 * 60 * 60 * 1000),
      payment_verified_at = v_now,
      payment_verified_by = 'owner_console',
      payment_rejected_at = null,
      payment_rejected_reason = null,
      updated_at = v_now
  where shop_id = p_shop_id;

  return public.list_owner_subscription_accounts(p_owner_key);
end;
$$;

create or replace function public.reject_subscription_payment(
  p_owner_key text,
  p_shop_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  perform app_private.assert_owner_console_key(p_owner_key);
  perform public.get_subscription_status(p_shop_id);

  update public.shop_subscriptions
  set status = 'rejected',
      payment_rejected_at = v_now,
      payment_rejected_reason = nullif(trim(coalesce(p_reason, '')), ''),
      updated_at = v_now
  where shop_id = p_shop_id;

  return public.list_owner_subscription_accounts(p_owner_key);
end;
$$;

create or replace function public.reset_subscription_trial(
  p_owner_key text,
  p_shop_id text,
  p_trial_days integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_days integer := greatest(1, least(coalesce(p_trial_days, 20), 90));
begin
  perform app_private.assert_owner_console_key(p_owner_key);
  perform public.get_subscription_status(p_shop_id);

  update public.shop_subscriptions
  set status = 'trial',
      trial_started_at = v_now,
      trial_ends_at = v_now + (v_days::bigint * 24 * 60 * 60 * 1000),
      current_period_ends_at = null,
      payment_requested_at = null,
      payment_note = null,
      payment_verified_at = null,
      payment_verified_by = null,
      payment_rejected_at = null,
      payment_rejected_reason = null,
      updated_at = v_now
  where shop_id = p_shop_id;

  return public.list_owner_subscription_accounts(p_owner_key);
end;
$$;

revoke all on function public.get_subscription_status(text) from public;
revoke all on function public.submit_subscription_payment(text, text) from public;
revoke all on function public.list_owner_subscription_accounts(text) from public;
revoke all on function public.approve_subscription_payment(text, text, integer) from public;
revoke all on function public.reject_subscription_payment(text, text, text) from public;
revoke all on function public.reset_subscription_trial(text, text, integer) from public;

grant execute on function public.get_subscription_status(text) to anon, authenticated;
grant execute on function public.submit_subscription_payment(text, text) to anon, authenticated;
grant execute on function public.list_owner_subscription_accounts(text) to anon, authenticated;
grant execute on function public.approve_subscription_payment(text, text, integer) to anon, authenticated;
grant execute on function public.reject_subscription_payment(text, text, text) to anon, authenticated;
grant execute on function public.reset_subscription_trial(text, text, integer) to anon, authenticated;
