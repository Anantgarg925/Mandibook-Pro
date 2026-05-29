# MandiBook Project Overview

## What The App Does

MandiBook is a mandi operations app for fruit commission agents. It covers:

- firm onboarding and settings
- truck arrival registration
- grade/stock tracking
- bill generation
- admin bill authorization
- thermal slip printing/sharing
- buyer ledger and payment tracking
- cash book
- day-end reports and PDFs

## Mobile App Structure

- `mobile/src/app`: Expo Router screens and navigation routes.
- `mobile/src/components`: reusable UI and feature components.
- `mobile/src/components/ui`: shared production UI primitives for new/refactored screens.
- `mobile/src/context`: app-level providers such as shop, launch, bill notifications.
- `mobile/src/hooks`: data-fetching hooks backed by React Query and Supabase.
- `mobile/src/lib`: infrastructure helpers, Supabase client, business day, query timing, observability.
- `mobile/src/types`: TypeScript domain types.
- `mobile/src/utils`: calculations, slips, report PDFs, WhatsApp, slip numbering.

## Data Flow

1. App starts in `_layout.tsx`.
2. `ShopProvider` loads cached shop data from AsyncStorage.
3. It syncs the shop from Supabase in the background.
4. Screens call hooks like `useTodayTrucks`, `useInquiries`, `useBuyers`.
5. Hooks query Supabase and map rows through `mobile/src/lib/supabase.ts`.
6. React Query caches and refetches live day data.
7. Mutations insert/update Supabase rows and invalidate related query keys.

## Core Business Flow

1. Register truck with number, sender, challan, freight, total kg.
2. Create bill/inquiry against truck and grade.
3. Calculate gross, APMC, bardana, cartage, net.
4. Admin authorizes pending bill.
5. Confirmed bill appears in reports and buyer/customer views.
6. Udhaari bill updates buyer ledger and transactions.
7. Admin can print/share slip and close the business day.

## Backend Folder

`backend/` contains a Hono + Prisma + SQLite API. It mirrors much of the mobile domain but the current mobile app mostly talks directly to Supabase. For production, choose one source of truth:

- Supabase-first: mobile app uses Supabase directly with RLS and Auth.
- API-first: mobile app talks only to backend API, backend uses service credentials.

Supabase-first is faster for this app, but it requires strict RLS and proper Auth.
