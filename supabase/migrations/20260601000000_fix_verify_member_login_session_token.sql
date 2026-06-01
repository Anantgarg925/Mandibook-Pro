-- FIX: The 20260531000000_firm_password_unlock migration overwrote
-- verify_member_login and dropped the session_token generation that was
-- added in 20260519000300. The member-login code checks for session_token
-- and returns null when it's missing, causing ALL logins to appear as
-- "incorrect PIN" even with the correct PIN.
--
-- This migration restores session_token generation while keeping the
-- firm_password_set field added in 20260531.

create extension if not exists pgcrypto with schema extensions;

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

  -- Try member login first
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
    -- Try admin login
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

  -- Generate session token (restored from 20260519000300)
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

  -- Cleanup expired sessions
  delete from public.app_sessions
  where expires_at < v_now;

  return jsonb_build_object(
    'is_admin', v_is_admin,
    'session_token', v_session_token,
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
