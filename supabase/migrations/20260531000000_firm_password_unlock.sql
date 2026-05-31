-- Add a one-time firm password gate on top of existing phone + PIN login.

create extension if not exists pgcrypto with schema extensions;

alter table public.shops
  add column if not exists firm_password_hash text;

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
    'firm_password_set', v_shop.firm_password_hash is not null,
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

create or replace function public.set_shop_firm_password(
  p_shop_id text,
  p_new_password text,
  p_current_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Firm password must be at least 8 characters';
  end if;

  select firm_password_hash
    into v_hash
  from public.shops
  where id = p_shop_id
  for update;

  if not found then
    raise exception 'Shop not found';
  end if;

  if v_hash is not null and (p_current_password is null or v_hash <> crypt(p_current_password, v_hash)) then
    raise exception 'Current password is incorrect';
  end if;

  update public.shops
  set firm_password_hash = crypt(p_new_password, gen_salt('bf'))
  where id = p_shop_id;
end;
$$;

revoke all on function public.set_shop_firm_password(text, text, text) from public;
grant execute on function public.set_shop_firm_password(text, text, text) to anon, authenticated;

create or replace function public.verify_shop_firm_password(
  p_shop_id text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select firm_password_hash
    into v_hash
  from public.shops
  where id = p_shop_id;

  if not found or v_hash is null then
    return false;
  end if;

  return v_hash = crypt(p_password, v_hash);
end;
$$;

revoke all on function public.verify_shop_firm_password(text, text) from public;
grant execute on function public.verify_shop_firm_password(text, text) to anon, authenticated;
