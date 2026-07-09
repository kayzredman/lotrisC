# Lotris Pager — Mobile rollout handoff (internal teams)

> **Status:** Dev-complete for internal pilot; **store / MDM rollout deferred**  
> **Audience:** Platform engineering, mobile release, customer IT  
> **App path:** `apps/mobile`  
> **EAS slug:** `lotris-pager` · **Bundle ID:** `com.lotris.pager`

This document packages the mobile pager for **later continuation** by teams with proprietary access (Apple Developer, Google Play Console, Expo/EAS org, customer Entra/APNs/FCM).

---

## 1. What is done (July 2026)

| Area | Status |
|------|--------|
| Expo app (Alerts, My Work, Queue, Lead, Me) | Built |
| Identity login + refresh tokens | Built |
| Microsoft Entra mobile login (deep link) | Built |
| Push device registration + test push API | Built |
| Biometric lock on resume | Built |
| Lead batch reassign | Built |
| My Work `Work \| Today` stats segment | Built |
| Lotris branding (mockup palette) | Built |
| API smoke gate | `pnpm mobile:smoke` |
| EAS project linked | `@kayzredman/lotris-pager` |
| `eas.json` profiles | `development`, `preview`, `production` |

**Validated in dev:** Expo Go / LAN against local API (`192.168.100.51:5153`).

---

## 2. Deferred to internal teams (Phase 5)

These require **your** accounts and customer-specific secrets — not committed to the repo.

| Task | Owner | Notes |
|------|-------|-------|
| Apple Developer Program | Release / IT | $99/yr; create App Store Connect app for `com.lotris.pager` |
| Google Play Console | Release / IT | Create app `com.lotris.pager` |
| EAS org / credentials | Mobile platform | Use team Expo account or transfer project |
| Production `EXPO_PUBLIC_API_URL` | Customer IT | HTTPS public Lotris URL — **not** LAN IP |
| APNs key in Expo | Customer IT | Required for iOS push in real builds |
| FCM credentials in Expo | Customer IT | Required for Android push |
| Entra redirect URIs (staging/prod) | Identity team | Mobile scheme `lotris-pager://` + API Microsoft callback |
| EAS preview / production builds | Mobile platform | See §4 |
| TestFlight / Play internal testing | QA | Device smoke before wider rollout |
| App Store / Play public listing | Product + legal | Screenshots, privacy policy, review account |
| MDM distribution (optional) | Customer IT | Often preferred over public store for B2B pager |

---

## 3. Local dev (unchanged)

From **repo root**:

```bash
pnpm api:restart
pnpm mobile:start          # LAN — phone on same Wi‑Fi
pnpm mobile:start:tunnel   # if LAN QR fails (ngrok can be flaky)
pnpm mobile:smoke          # API auth + queue + devices gate
```

Phone `.env` (`apps/mobile/.env`):

```bash
EXPO_PUBLIC_API_URL=http://<dev-host>:5153
EXPO_PUBLIC_EAS_PROJECT_ID=<expo-project-uuid>
```

**Note:** Remote push in **Expo Go** is limited (especially Android SDK 53+). Real push testing needs an **EAS development or production build**.

---

## 4. Build & store upload (when ready)

All commands from `apps/mobile` after `npx eas-cli login` with the **team** Expo account.

### 4.1 Internal pilot (recommended first)

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://lotris.customer.example npx eas build --profile preview --platform ios
EXPO_PUBLIC_API_URL=https://lotris.customer.example npx eas build --profile preview --platform android
```

Install via TestFlight (iOS) or internal APK/AAB track (Android).

### 4.2 Production binaries

```bash
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

### 4.3 Submit to stores

```bash
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```

Or one step: `npx eas build --profile production --platform ios --auto-submit`

**Apple:** App Store Connect app + privacy questionnaire + screenshots + demo login for review.  
**Google:** Play Console app + data safety form + internal testing track before production.

Consider **unlisted / TestFlight-only / MDM** for enterprise customers instead of a public consumer listing.

---

## 5. Pre-release smoke gate (mandatory)

Run before any handover to customer IT or store submission:

```bash
pnpm mobile:smoke   # against target API URL
```

On a **real EAS build** (not Expo Go):

1. Sign in (identity + Entra if enabled)
2. My Work → Work \| Today segments
3. Queue claim → ticket detail → status update
4. Push register → test push → open from alert
5. Biometric lock on resume
6. Lead batch assign (lead role)
7. Sign out → device revoked, refresh invalidated

---

## 6. Configuration checklist (per environment)

| Variable / setting | Where |
|--------------------|--------|
| `EXPO_PUBLIC_API_URL` | EAS build env or `apps/mobile/.env` |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | `apps/mobile/.env` |
| `App:MobileScheme` | Lotris API — default `lotris-pager` |
| `Auth:Providers:Entra:*` | Lotris API + Entra app registration |
| APNs / FCM | [expo.dev](https://expo.dev) project credentials |
| JWT / TLS on API | Customer on-prem or hosted edge |

---

## 7. Related docs

| Doc | Purpose |
|-----|---------|
| [MOBILE-PAGER-SCOPE.md](MOBILE-PAGER-SCOPE.md) | Product scope & investment case |
| [MOBILE-IMPLEMENTATION-PHASES.md](MOBILE-IMPLEMENTATION-PHASES.md) | Phase 0–5 plan |
| [IT-HANDOVER.md](IT-HANDOVER.md) §5.1 | Mobile addendum in IT handover |
| [BRD.md](BRD.md) §5.9 | Mobile functional requirements |

---

## 8. Handoff sign-off

| # | Item | Owner | Done |
|---|------|-------|------|
| 1 | Code on `dev` / release branch reviewed | Eng | ☐ |
| 2 | Team Expo + Apple + Google accounts confirmed | Release | ☐ |
| 3 | Production API URL + TLS | Customer IT | ☐ |
| 4 | APNs + FCM in EAS | Customer IT | ☐ |
| 5 | EAS preview build on pilot devices | QA | ☐ |
| 6 | `pnpm mobile:smoke` on target API | QA | ☐ |
| 7 | Store listing or MDM path chosen | Product | ☐ |

---

_Lotris Pager mobile rollout handoff — pack for later; internal teams continue with proprietary store and tenant credentials._
