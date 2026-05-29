# Store Release Checklist

## Before Build

- [ ] Production Supabase project created.
- [ ] Migrations applied and reviewed.
- [ ] RLS enabled and tested with real authenticated users.
- [ ] App icon and adaptive icon complete.
- [ ] Splash screen and brand assets final.
- [ ] Privacy policy published.
- [ ] Support URL/email available.
- [ ] Demo credentials created for reviewers.
- [ ] Crash reporting DSN configured.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.

## Android / Google Play

- [ ] Google Play Console developer account ready.
- [ ] App created in Play Console.
- [ ] App access details completed.
- [ ] Data safety form completed.
- [ ] Content rating completed.
- [ ] Target audience completed.
- [ ] Production build uploaded.
- [ ] Internal test release verified.
- [ ] Production rollout started.

## iOS / App Store

- [ ] Apple Developer Program membership active.
- [ ] App Store Connect app record created.
- [ ] Bundle id matches `com.mandibook.pro`.
- [ ] Privacy nutrition labels completed.
- [ ] Screenshots uploaded.
- [ ] Review notes include demo account and mandi workflow.
- [ ] Production build selected.
- [ ] Submitted for review.

## EAS Commands

```bash
eas build:configure
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android
eas submit --platform ios
```
