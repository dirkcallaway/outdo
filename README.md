# Workout Tracker

A mobile-first PWA to build workouts, log sets and reps with a rest timer, and
track progress over time. Built with **Nuxt 4 + Nuxt UI**, **Convex** (reactive
DB), **Clerk** (auth), and seeded from the free **wger** exercise database.

## Features

- 📅 Calendar of your workouts, with per-day sessions
- 🏋️ Exercise library seeded from [wger](https://wger.de) + your own custom exercises
- ⏱️ Active workout tracker: reps/weight per set, rest timer/stopwatch
- 📶 Works offline — in-progress sets buffer in IndexedDB and sync when back online
- 📈 Stats: per-exercise progress charts, personal records, streaks
- 📲 Installable PWA

## Stack

| Concern      | Choice |
| ------------ | ------ |
| Framework    | Nuxt 4 (Vue 3, TypeScript) |
| UI           | Nuxt UI v4 (Tailwind v4) |
| Database     | Convex (`convex-nuxt`) |
| Auth         | Clerk (`@clerk/nuxt`) |
| Offline/PWA  | `@vite-pwa/nuxt`, `useIDBKeyval` |
| Charts       | `vue-chartjs` |

## One-time setup

### 1. Install

```bash
npm install
```

### 2. Convex

```bash
npx convex dev
```

This logs you in (browser), creates a deployment, writes `convex/_generated/*`,
and prints your deployment URL. Add it to `.env`:

```
NUXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Leave `npx convex dev` running in a terminal while developing — it pushes your
`convex/` functions live.

### 3. Clerk

1. Create an app at [clerk.com](https://clerk.com) (enable **Email** sign-in).
2. Copy the API keys into `.env`:

   ```
   NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   NUXT_CLERK_SECRET_KEY=sk_test_...
   ```

3. In Clerk, create a **JWT template** named `convex` (Clerk has a built-in
   Convex template — pick it). Copy its **Issuer** URL.
4. In the **Convex** dashboard → Settings → Environment Variables, add:

   ```
   CLERK_JWT_ISSUER_DOMAIN=https://<your-app>.clerk.accounts.dev
   ```

   (`convex/auth.config.ts` reads this to verify Clerk tokens.)

### 4. Seed exercises (once)

With `npx convex dev` running:

```bash
npx convex run seed:seedExercises '{"maxPages":10}'
```

This imports ~900 exercises from wger. Re-running is safe (idempotent by wger id).

## Develop

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
```

## Deploy (Vercel + Convex)

`vercel.json` sets the build command to
`npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NUXT_PUBLIC_CONVEX_URL`,
so each Vercel build deploys the Convex functions to production and injects the
prod Convex URL into the Nuxt build.

1. In the **Convex dashboard** (project → Production), set env var
   `CLERK_JWT_ISSUER_DOMAIN` (same Clerk issuer as dev).
2. Generate a **Production deploy key** (Convex dashboard → Settings → Deploy keys).
3. Import the repo at [vercel.com/new](https://vercel.com/new) and add env vars:
   - `CONVEX_DEPLOY_KEY` = the production deploy key
   - `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_...`
   - `NUXT_CLERK_SECRET_KEY` = `sk_...`
4. Deploy. Every push to `main` redeploys automatically.

For a real launch, switch Clerk to a **production instance** (custom domain +
your own Google OAuth credentials) and update the keys + issuer above.

## Notes

- Exercise data © [wger](https://wger.de), licensed CC-BY-SA (attributed in-app).
- `convex/_generated/` is committed so the app typechecks before `convex dev`
  runs; `npx convex dev` regenerates it in place.
