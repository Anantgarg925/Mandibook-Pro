-- Require a short-lived app session token for sensitive write RPCs.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  shop_id text not null references public.shops(id) on delete cascade,
  member_id text,
  role text not null default 'MEMBER',
  expires_at bigint not null,
  created_at bigint not null default (extract(epoch from clock_timestamp()) * 1000)::bigint
);

create index if not exists app_sessions_token_hash_idx
  on public.app_sessions (token_hash);

create index if not exists app_sessions_shop_expires_idx
  on public.app_sessions (shop_id, expires_at);

alter table public.app_sessions enable row level security;

drop policy if exists "no direct app session access" on public.app_sessions;
create policy "no direct app session access"
on public.app_sessions
for all
using (false)
with check (false);

create or replace function public.verify_member_login(p_phone text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_shop public.shops%rowtype;
  v_member public.members%rowtype;
  v_is_admin boolean := false;
  v_session_token text;
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if length(v_phone) <> 10 or length(coalesce(p_pin, '')) < 4 then
    return null;
  end if;

  select *
    into v_member
  from public.members m
  where regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') = v_phone
    and m.pin_hash is not null
    and m.pin_hash = crypt(p_pin, m.pin_hash)
  limit 1;

  if found then
    select * into v_shop from public.shops s where s.id = v_member.shop_id;
  else
    select *
      into v_shop
    from public.shops s
    where regexp_replace(coalesce(s.phone1, ''), '\D', '', 'g') = v_phone
      and s.admin_pin_hash is not null
      and s.admin_pin_hash = crypt(p_pin, s.admin_pin_hash)
    limit 1;

    if not found then
      return null;
    end if;

    v_is_admin := true;
  end if;

  v_session_token := gen_random_uuid()::text || gen_random_uuid()::text;

  insert into public.app_sessions (token_hash, shop_id, member_id, role, expires_at, created_at)
  values (
    encode(digest(v_session_token, 'sha256'), 'hex'),
    v_shop.id,
    case when v_is_admin then null else v_member.id end,
    case when v_is_admin then 'ADMIN' else v_member.role end,
    v_now + (30::bigint * 24 * 60 * 60 * 1000),
    v_now
  );

  delete from public.app_sessions
  where expires_at < v_now;

  return jsonb_build_object(
    'is_admin', v_is_admin,
    'session_token', v_session_token,
    'shop', jsonb_build_object(
      'id', v_shop.id,
      'firm_name', v_shop.firm_name,
      'owner_name', v_shop.owner_name,
      'address', v_shop.address,
      'city', v_shop.city,
      'phone1', v_shop.phone1,
      'phone2', v_shop.phone2,
      'upi_id', v_shop.upi_id,
      'upi_apps', v_shop.upi_apps,
      'commodity', v_shop.commodity,
      'grades', v_shop.grades,
      'charges', v_shop.charges,
      'admin_pin', '',
      'team_names', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'name', m.name,
          'phone', m.phone,
          'role', m.role
        ) order by m.created_at)
        from public.members m
        where m.shop_id = v_shop.id
      ), '[]'::jsonb),
      'created_at', v_shop.created_at
    ),
    'member', case
      when v_is_admin then jsonb_build_object(
        'id', 'admin-member',
        'name', v_shop.owner_name,
        'phone', v_shop.phone1,
        'role', 'ADMIN'
      )
      else jsonb_build_object(
        'id', v_member.id,
        'name', v_member.name,
        'phone', v_member.phone,
        'role', v_member.role
      )
    end
  );
end;
$$;

revoke all on function public.verify_member_login(text, text) from public;
grant execute on function public.verify_member_login(text, text) to anon, authenticated;

drop function if exists public.record_buyer_payment(text, text, numeric, text, text, text);

create or replace function public.record_buyer_payment(
  p_shop_id text,
  p_buyer_code text,
  p_amount numeric,
  p_method text,
  p_upi_ref text default null,
  p_note text default null,
  p_session_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_now bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_day bigint;
  v_buyer public.buyers%rowtype;
  v_payment_id text := gen_random_uuid()::text;
  v_cashbook_id text := gen_random_uuid()::text;
  v_session public.app_sessions%rowtype;
begin
  if p_session_token is null or length(p_session_token) < 32 then
    raise exception 'Session required';
  end if;

  select *
    into v_session
  from public.app_sessions s
  where s.token_hash = encode(digest(p_session_token, 'sha256'), 'hex')
    and s.shop_id = p_shop_id
    and s.expires_at > v_now
  limit 1;

  if not found then
    raise exception 'Invalid or expired session';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_method not in ('CASH', 'UPI', 'CHEQUE') then
    raise exception 'Invalid payment method';
  end if;

  select *
    into v_buyer
  from public.buyers b
  where b.shop_id = p_shop_id
    and b.code = p_buyer_code
  for update;

  if not found then
    raise exception 'Buyer not found';
  end if;

  v_day := ((v_now + 19800000) / 86400000)::bigint * 86400000 - 19800000;

  insert into public.buyers (
    id, shop_id, code, name, phone, outstanding_balance, opening_balance,
    opening_balance_type, opening_balance_set, notes, last_transaction_date, created_at
  ) values (
    p_shop_id || '__cashbook__',
    p_shop_id,
    '__cashbook__',
    'Cashbook',
    '',
    0,
    0,
    'DR',
    true,
    'Internal cashbook ledger account',
    v_now,
    v_now
  )
  on conflict (shop_id, code) do nothing;

  insert into public.transactions (
    id, shop_id, buyer_code, type, amount, date, payment_method, upi_ref, note, created_at
  ) values (
    v_payment_id, p_shop_id, p_buyer_code, 'PAYMENT', p_amount, v_now, p_method, nullif(p_upi_ref, ''), nullif(p_note, ''), v_now
  );

  update public.buyers
  set outstanding_balance = coalesce(outstanding_balance, 0) - p_amount,
      last_payment_amount = p_amount,
      last_payment_date = v_now,
      last_transaction_date = v_now
  where shop_id = p_shop_id
    and code = p_buyer_code;

  insert into public.transactions (
    id, shop_id, buyer_code, type, amount, date, note, created_at
  ) values (
    v_cashbook_id,
    p_shop_id,
    '__cashbook__',
    'RECEIPT',
    p_amount,
    v_day,
    'Payment from ' || v_buyer.name || case when nullif(p_note, '') is null then '' else ' - ' || p_note end,
    v_now
  );

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'cashbook_id', v_cashbook_id,
    'recorded_at', v_now
  );
end;
$$;

revoke all on function public.record_buyer_payment(text, text, numeric, text, text, text, text) from public;
grant execute on function public.record_buyer_payment(text, text, numeric, text, text, text, text) to anon, authenticated;
