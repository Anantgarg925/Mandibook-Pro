# MandiBook Production Readiness

## Security

- Use Supabase Auth for every admin/member user.
- Connect every user to a shop via `shop_memberships`.
- Apply `supabase/migrations/20260516000300_rls_policies.sql` only after Auth is wired in.
- Do not read plaintext `admin_pin` or `members.pin` from the client in production.
- Move PIN verification to a trusted backend or Supabase Edge Function and store only `*_pin_hash`.
- Never ship a Supabase service-role key in the mobile app.

## Schema

- Use the SQL files under `supabase/migrations/` as the baseline for a fresh production project.
- Keep schema changes in migrations, not manual dashboard edits.
- Run performance indexes from `20260516000200_indexes.sql`.
- Keep `members` and `day_closures` in the production schema because the app now references both concepts.

## UI Consistency

- New screens should use shared primitives from `mobile/src/components/ui`.
- Preferred layout: `Screen` -> `AppHeader` -> `Card` sections -> `Button`/`Input` controls.
- Avoid hard-coded full-screen layouts that ignore safe areas.
- Keep bottom fixed actions padded by `useSafeAreaInsets().bottom`.

## Testing

- Current foundation:
  - `npm run typecheck`
  - `npm test`
- Add tests before touching:
  - charge calculations
  - business-day rollover
  - buyer ledger balances
  - report totals
  - slip HTML totals

## Observability

- `mobile/src/lib/observability.ts` is the single facade for crash/error/event tracking.
- Wire it to Sentry or your chosen provider after you create a production DSN.
- Avoid logging customer phone numbers, buyer names, or exact payment refs into analytics.

## Offline Strategy

Recommended production behavior:

1. Read cached shop/settings immediately.
2. If offline, allow draft truck/bill creation into `offlineQueue`.
3. Show a visible "Pending sync" state on queued bills.
4. On reconnect, replay operations in creation order.
5. Use deterministic ids for queued operations so retries are idempotent.
6. Never mark a bill as fully confirmed until the server write succeeds.

The scaffold is in `mobile/src/lib/offlineQueue.ts`; it still needs integration into truck/bill save mutations.

## Store Readiness

- Create a production Supabase project separate from testing.
- Add privacy policy URL and support URL.
- Add real app icon foreground and adaptive icon.
- Prepare screenshots for common phone sizes.
- Create a demo shop/admin account for Apple review.
- Add release notes and support contact.
- Verify Android package and iOS bundle id:
  - Android: `com.mandibook.pro`
  - iOS: `com.mandibook.pro`
