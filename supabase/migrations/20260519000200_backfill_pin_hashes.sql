-- One-time migration for existing plaintext PIN data.
-- Run after 20260519000100_secure_member_login_and_payment_rpc.sql.

create extension if not exists pgcrypto with schema extensions;

alter table public.shops alter column admin_pin drop not null;
alter table public.members alter column pin drop not null;

update public.shops
set admin_pin_hash = crypt(admin_pin, gen_salt('bf')),
    admin_pin = null
where admin_pin_hash is null
  and admin_pin is not null
  and length(admin_pin) >= 4;

update public.members
set pin_hash = crypt(pin, gen_salt('bf')),
    pin = null
where pin_hash is null
  and pin is not null
  and length(pin) >= 4;
