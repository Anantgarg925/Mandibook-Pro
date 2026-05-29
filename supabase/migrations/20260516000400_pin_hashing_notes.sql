-- Store PIN hashes, not plaintext PINs.
-- Recommended production implementation:
-- 1. Add pgcrypto: create extension if not exists pgcrypto;
-- 2. From a trusted server/edge function, write crypt(pin, gen_salt('bf')) into *_pin_hash.
-- 3. Remove admin_pin and pin after the mobile app is migrated away from plaintext PIN reads.
--
-- This migration keeps legacy columns for compatibility and adds guard comments.

comment on column public.shops.admin_pin is
  'Legacy plaintext PIN. Do not use in production clients; migrate to admin_pin_hash.';

comment on column public.shops.admin_pin_hash is
  'Production PIN hash. Verify from trusted backend/edge function only.';

comment on column public.members.pin is
  'Legacy plaintext PIN. Do not expose through client queries in production.';

comment on column public.members.pin_hash is
  'Production PIN hash. Verify from trusted backend/edge function only.';
