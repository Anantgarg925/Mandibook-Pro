-- Production RPCs for mobile-only Supabase deployments.
-- Apply after pin_hash values have been populated for shops.admin_pin_hash and members.pin_hash.

create extension if not exists pgcrypto with schema extensions;

alter table public.shops alter column admin_pin drop not null;
alter table public.members alter column pin drop not null;

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

  return jsonb_build_object(
    'is_admin', v_is_admin,
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

create or replace function public.set_shop_admin_pin(
  p_shop_id text,
  p_new_pin text,
  p_current_pin text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if length(coalesce(p_new_pin, '')) < 4 then
    raise exception 'PIN must be at least 4 digits';
  end if;

  select admin_pin_hash
    into v_hash
  from public.shops
  where id = p_shop_id
  for update;

  if not found then
    raise exception 'Shop not found';
  end if;

  if v_hash is not null and (p_current_pin is null or v_hash <> crypt(p_current_pin, v_hash)) then
    raise exception 'Current PIN is incorrect';
  end if;

  update public.shops
  set admin_pin_hash = crypt(p_new_pin, gen_salt('bf')),
      admin_pin = null
  where id = p_shop_id;
end;
$$;

revoke all on function public.set_shop_admin_pin(text, text, text) from public;
grant execute on function public.set_shop_admin_pin(text, text, text) to anon, authenticated;

create or replace function public.upsert_shop_member_pin(
  p_shop_id text,
  p_member_id text,
  p_name text,
  p_phone text,
  p_pin text,
  p_role text default 'MEMBER'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_member public.members%rowtype;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Member name is required';
  end if;

  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) <> 10 then
    raise exception 'Member phone must be 10 digits';
  end if;

  if length(coalesce(p_pin, '')) < 4 then
    raise exception 'PIN must be at least 4 digits';
  end if;

  insert into public.members (id, shop_id, name, phone, pin_hash, pin, role, created_at)
  values (
    coalesce(nullif(p_member_id, ''), gen_random_uuid()::text),
    p_shop_id,
    trim(p_name),
    regexp_replace(p_phone, '\D', '', 'g'),
    crypt(p_pin, gen_salt('bf')),
    null,
    coalesce(nullif(p_role, ''), 'MEMBER'),
    (extract(epoch from clock_timestamp()) * 1000)::bigint
  )
  on conflict (id) do update
  set name = excluded.name,
      phone = excluded.phone,
      pin_hash = excluded.pin_hash,
      pin = null,
      role = excluded.role
  returning * into v_member;

  return jsonb_build_object(
    'id', v_member.id,
    'name', v_member.name,
    'phone', v_member.phone,
    'role', v_member.role
  );
end;
$$;

revoke all on function public.upsert_shop_member_pin(text, text, text, text, text, text) from public;
grant execute on function public.upsert_shop_member_pin(text, text, text, text, text, text) to anon, authenticated;

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check check (type in ('SALE', 'PAYMENT', 'OPENING', 'RECEIPT'));

create or replace function public.record_buyer_payment(
  p_shop_id text,
  p_buyer_code text,
  p_amount numeric,
  p_method text,
  p_upi_ref text default null,
  p_note text default null
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
begin
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

revoke all on function public.record_buyer_payment(text, text, numeric, text, text, text) from public;
grant execute on function public.record_buyer_payment(text, text, numeric, text, text, text) to anon, authenticated;
