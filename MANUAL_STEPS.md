# Manual steps checklist

Run these in order. Nothing here is automated — every step needs you.

## A. Database (Supabase → SQL Editor, run **in order**)

- [ ] **1.** `supabase/migrations/0001_init_schema.sql` (skip if already applied)
- [ ] **2.** `supabase/migrations/0002_production_security.sql` (skip if already applied)
- [ ] **3.** `supabase/migrations/0003_suggest_proposals_system.sql` (skip if already applied)
- [ ] **4.** `supabase/migrations/0004_owner_only_security.sql` (skip if already applied)
- [ ] **5.** `supabase/migrations/0005_remove_seed_data.sql`
      — deletes **every** row from `products`, `categories`, `collections`, `discounts`,
        `suggestions`, `orders`, `customers`, `waitlist`, `events`, `"auditLog"`,
        `"inventoryLog"`, `insights`, `"dailyStats"`, `"targetPlans"`, `"metricActuals"`,
        `"coachTasks"`, `"dailyCoachBriefs"`, `"reverseFunnelCalculations"`
        and all proposal/wave/vote tables from 0003,
      — resets `settings` and `content` to **empty** defaults,
      — **keeps `public.admins` and `public.owner_config` untouched**,
      - safe to re-run at any time.
- [ ] **6.** `supabase/migrations/0006_media_storage.sql`
      — creates the public-read `media` bucket (15 MB, restricted mime types, owner-only writes),
      — creates `public.media_assets` (camelCase columns, `framing` jsonb),
      — rejects any `url` that is not `https://…` or `/…` (so base64 can never be stored),
      - safe to re-run.
- [ ] **7.** `supabase/setup-first-admin.sql` (only if the owner row does not exist yet)

## B. Storage verification

- [ ] **8.** Supabase → **Storage → Buckets** → a bucket named `media` exists.
- [ ] **9.** It is marked **Public bucket** (public read).
- [ ] **10.** File size limit shows **15 MB (15728640 bytes)**.
- [ ] **11.** Allowed mime types are exactly:
      `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `video/mp4`, `video/webm`.
- [ ] **12.** Storage policies: `Public can view media` (SELECT, everyone) and
      `Owner can upload / update / delete media` (INSERT/UPDATE/DELETE guarded by `public.is_owner()`).
- [ ] **13.** RLS on `public.media_assets` is enabled with a public SELECT policy and
      owner-only INSERT/UPDATE/DELETE.

## C. Realtime

- [ ] **14.** Supabase → **Database → Replication** → `content` (and `products`,
      `categories`, `collections`, `settings`) are in the `supabase_realtime` publication,
      so CMS edits appear on the storefront immediately.

## D. Local verification

- [ ] **15.** `npm install`
- [ ] **16.** `npm run check:no-seed` → prints `Check passed: zero seed, demo, or placeholder data found in src/.`
- [ ] **17.** `npm run lint` → 0 TypeScript errors
- [ ] **18.** `npm test` → all Vitest suites pass
- [ ] **19.** `npm run build` → succeeds (the guard runs as part of the build)
- [ ] **20.** `npm run test:e2e` → Playwright suite passes (builds first, mocks Supabase, zero seeded data)
- [ ] **21.** `npm run dev` and walk the storefront: with an empty database every page shows an
      honest empty state — no placeholder products, no invented numbers, no broken images.

## E. Content you must fill in yourself

- [ ] **22.** Admin → Settings: store name, e-mail, phone, address, currency, shipping
      thresholds (they are intentionally **blank/0** after 0005).
- [ ] **23.** Admin → Content → Hero slides: add slides, upload desktop + mobile media,
      frame them in the ImageEditor, set link/enabled, **Save**.
- [ ] **24.** Admin → Media: upload your real photography (drag & drop / camera / library / https URL).
- [ ] **25.** Admin → Products: set primary/hover/gallery images, drag to reorder, edit alt text,
      open the ImageEditor on any image and **Apply framing**.

## F. Deploy

- [ ] **26.** Push to Git; CI (`.github/workflows/ci.yml`) must be green.
- [ ] **27.** Vercel → Project Settings → Environment Variables:
      `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only — never `VITE_`), `GEMINI_API_KEY`, `TRUST_PROXY`.
- [ ] **28.** Build command `npm run build`, output directory `dist` (already in `vercel.json`).
      The build runs the no-seed guard, so a bad commit fails the deploy.
- [ ] **29.** Redeploy (Deployments → Redeploy) after the migrations are applied.
- [ ] **30.** Smoke-test production: storefront loads, admin login works, an image upload
      lands in Storage **and** in `public.media_assets`, and the storefront shows it.
