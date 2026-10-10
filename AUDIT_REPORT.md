# Audit Report — Seed Data Removal, Real Media Storage, ImageEditor, Hero CMS

**Date:** 2026-10-10
**Scope:** Full audit of every deliverable in the 4-task overhaul. Each item lists the file, what was removed/added, and its verification status.

---

## Task 1 — Remove ALL seeded / fake data

### Deleted artefacts
| Item | Status |
|---|---|
| `src/data/mockData.ts` and the whole `src/data/` folder | ✅ Deleted (`src/data` no longer exists) |
| `SEED_*` / `MOCK_*` / `ARCHIVE_PRODUCTS` / `seedData` / `targetsSeedData` constants in `src/` | ✅ Zero occurrences (grep-verified) |
| `src/assets/images/*` (9 seeded campaign JPGs) | ✅ Folder deleted; zero `/src/assets/` references in `src/` (grep-verified) |
| Unsplash / Picsum / placehold / lorem / Google sample-video URLs in `src/` | ✅ Zero occurrences |
| `DEMO_MODE` flag from `.env.example`, `README.md`, and all source references | ✅ Removed |
| Fabricated identities (`Elena Rostova`, `Sofia Lindqvist`, `merchandiser@zejesh.fi`, `#ZE-…`, …) | ✅ Zero occurrences (`AuthPage` "Elena Rostova" → "Full name") |
| `Math.random()` for metrics/ids | ✅ Zero occurrences (only a comment in `src/supabase/dbService.ts:60`) |
| Hardcoded grouped-number KPIs (`'84,290'`, `'1,290'`, …) | ✅ Zero occurrences (`AdminAnalyticsView`, `AdminOrdersView`, `CheckoutModal` purged) |
| `veoService.ts` Google `gtv-videos-bucket` sample-video fallback | ✅ Removed — no fallback URL remains |
| `productRecommendations.ts` fabricated recommendation list | ✅ File deleted by the purge |

### Guard (fails the build on regression)
- **`scripts/check-no-seed.mjs`** — dependency-free Node script; scans `src/` for SEED_/mock/demo/fake/placeholder patterns, stock-image URLs, asset paths, `readAsDataURL` + data-URL pipelines, `Math.random`, grouped-number literals, fabricated identities. Reports `file:line [rule]` and exits 1.
- **Allowlist** — exactly one documented exception: `src/components/VeoMotionModal.tsx` may use `readAsDataURL` (encodes the chosen still for the server-side Veo API request only; payload never written to the DB).
- **`npm run check:no-seed`** added; `npm run build` runs the guard first; `.github/workflows/ci.yml` runs it as a dedicated job.
- **`tests/unit/noSeedCheck.test.ts`** — 6 tests: passes on clean tree, fails + reports `file:line` for SEED_ constant, `Math.random`, Unsplash/lorem, base64 pipeline.
- **Current status:** `Check passed: zero seed, demo, or placeholder data found in src/.` ✅

### Honest empty states (no demo fallbacks)
- `src/components/HomeSections.tsx` — "No Archival Garments Live Yet" when zero live products.
- `ProductListing` / `StoryPage` / `StaticPages` / admin views — render empty-state copy or "Could not load data"; no invented rows.
- Gemini features reply "not enough data" instead of fabricating metrics.
- Single neutral placeholder kept: `public/placeholder.svg` (grey, `#F4F4F4`), referenced via `NEUTRAL_PLACEHOLDER_IMG` in `src/types.ts:845`.

### Database purge
- **`supabase/migrations/0005_remove_seed_data.sql`** — truncates products, categories, collections, discounts, orders, customers, waitlist, events, `"auditLog"`, `"inventoryLog"`, insights, `"dailyStats"`, `"targetPlans"`, `"metricActuals"`, `"coachTasks"`, `"dailyCoachBriefs"`, `"reverseFunnelCalculations"` + all 0003 proposal/wave/vote tables; resets `settings` and `content` to empty defaults; **keeps `public.admins` + `public.owner_config` untouched**; idempotent.
- **`supabase/tests/rls.test.sql`** — pgTAP suite, `plan(20)`: owner email, anon/non-owner denial, trigger rejects, proposals, **media bucket public/15MB/6-mime checks, media_assets RLS, data-URL rejection**.

---

## Task 2 — Real Supabase Storage image upload / delete

### Migration
- **`supabase/migrations/0006_media_storage.sql`**:
  - `media` bucket — public read, 15 MB (`15728640`), exactly 6 mime types (jpeg/png/webp/avif/mp4/webm), `on conflict do update` (idempotent).
  - Storage RLS — `Public can view media` (SELECT everyone), `Owner can upload/update/delete media` (INSERT/UPDATE/DELETE guarded by `public.is_owner()`).
  - `public.media_assets` — camelCase quoted columns (`"sizeBytes"`, `"mimeType"`, `"focalX"`, `"focalY"`, `"framing"`, `"createdAt"`), `framing jsonb` added with `add column if not exists`.
  - `media_assets_url_http_check` constraint (https:// or / only — **base64 can never be stored**), wrapped in a `DO` block so the migration is re-runnable.
  - Indexes on `"createdAt" desc` and `kind`; RLS public SELECT + owner-only writes.

### Service layer (`src/supabase/mediaService.ts`)
- `compressImageToWebP` — client-side WebP, max 2400 px longest edge, q 0.85; uses `URL.createObjectURL` (never base64).
- `uploadMediaAsset` — validates size (15 MB) + mime before upload, uploads to `media/YYYY/MM/uuid.ext`, gets public URL, inserts `media_assets` row with progress callbacks; **throws + rolls back the Storage object if the DB insert fails** (no orphaned files).
- `updateMediaAsset` — persists alt/focal/framing onto an asset row.
- `findMediaUsage` — deep-scans products (image/hoverImage/images[]), categories, collections, and the content row (heroMedia, heroSlides, journalPosts `image` field, translations, announcementBar) with recursive matching.
- `removeMediaReferences` — strips the URL from products (nulls image/hoverImage, rewrites `images[]` order), hero slides (src/poster/desktopMedia/mobileMedia), journal, translations, categories, collections — used by "Remove everywhere".
- `deleteMediaAssetPermanently` — removes from Storage + `media_assets`.
- `isDataUrl` / `getMediaAssetsWithStatus` — data-URL detection + honest "Could not load data" surfacing.

### Picker (everywhere)
- **`src/admin/components/UniversalMediaPickerModal.tsx`** — upload device / drag-drop / take photo (capture) / library grid / paste URL (https-only, rejects http:// and data:); progress bar, retry on failure, empty-library state "No media assets found".
- Wired into: product editor (primary/hover/gallery), media library, CMS content slots, hero slides.

### Deletion with usage warning
- "Remove everywhere" (strip references, keep file) vs "Delete permanently" (Storage + row) flows in `AdminMediaView`; usage count shown before delete.
- **All `/src/assets/images/...` references removed** — verified by the guard's asset-path rules.

### Base64 prohibition
- Zero `readAsDataURL` outside the Veo allowlist; zero `data:image` / `data:video` string literals; `media_assets_url_http_check` enforces it at the DB level; pgTAP test 20 covers it.

---

## Task 3 — Reusable non-destructive ImageEditor applied on the storefront

### The editor
- **`src/admin/components/UniversalImageEditorModal.tsx`** — one reusable editor: focal point, zoom 1–4×, straighten ±45° + rotate 90°, flipH/flipV, aspect presets (3:4, 4:5, 1:1, 16:9, 9:16), reset, undo/redo (Ctrl+Z/Y), per-placement overrides with "Same for all" toggle, mouse/touch/pinch/keyboard interaction, live previews (card, archive crops, product page, hero desktop, hero mobile, OG), undersize warning (<1920 px hero), optional "Export edited copy".
- **Non-destructive** — params are saved as JSON (`framing`); the source file is never mutated. Optional export produces a new asset copy.

### Storefront application
- **`src/components/FashionImage.tsx`** — single source of framing CSS: exports `imageFramingStyle()`, `normalizeAspect()`, `legacyFramingFor()`.
  - Precedence: placement override > explicit `framing` prop > per-image `Product.images[].framing` > legacy `cropVariation`/props. Focal beats legacy `position`; `framing.aspectRatio` applied.
  - Works for `<img>` and `<video>`; desktop/tablet/mobile via per-placement overrides.
- Applied at: `ProductDetail` (gallery derives from `product.images[]`, per-image framing, `placement="productPage"` + zoom modal), `ProductListing` (`placement="archive"`), `QuickLookModal`, recommendation cards (`placement="card"`), `SearchModal`, `StoryPage` (`placement="heroDesktop"` + archive), `StaticPages`, `HomeSections`.
- Undersize warning for hero images <1920 px shown in the editor.

### Types (`src/types.ts`)
- `Product.framing`, `ProductImage.framing`, `MediaAsset.framing`, `HeroSlideMedia {url, kind, poster, alt, framing}`, `HeroSlide.mobileMedia/desktopMedia/framing`.

### Tests
- **`tests/unit/framing.test.ts`** — pure-function coverage of `imageFramingStyle` precedence, `normalizeAspect`, `legacyFramingFor`.
- **`tests/e2e/storefront.spec.ts`** — Playwright (desktop 1440×900 + mobile 390×844): heroDesktop override `15% 25%`, heroMobile override `88% 72%`, product-card focal+zoom override applied (`33% 44%`), legacy `cropVariation` behaviour intact when nothing authored, honest empty storefront (no invented products/prices/broken images). Products in the featured grid require `status: 'live'` — covered in the spec setup.

---

## Task 4 — Real Hero Slides + CMS manager

### CMS manager (`src/admin/content/AdminContentView.tsx`)
- Hero slides: add / delete / drag-and-drop reorder / enable-disable per slide.
- Separate desktop + mobile media per slide, each framed in the ImageEditor; video slides take a poster.
- Per-slide link field; **no text overlay on slides** (image only).
- CMS image slots (home / story / journal / announcement / footer) with picker + editor; **empty slot renders nothing** on the storefront.
- Persists to the real `content` table (heroSlides array), realtime updates, Preview desktop/tablet/mobile, Save / Discard with unsaved-changes warning.
- `readAsDataURL` occurrences removed from this file during the audit (device upload uses object URLs).

### Storefront (`src/components/HeroSection.tsx`)
- Renders real `content.heroSlides`; desktop media on ≥768 px, mobile media below; per-slide framing applied through `imageFramingStyle`; poster shown for videos; empty content → nothing rendered.
- `StoryPage` / `JournalModal` read the same `content` row (story plates, journal posts).

---

## Test suite summary

| Suite | Files | Tests | Status |
|---|---|---|---|
| Vitest unit (`tests/unit/`) | 4 (`framing`, `noSeedCheck`, `mediaValidation`, `mediaPicker`) | 28 | ✅ 28/28 pass |
| Playwright e2e (`tests/e2e/`) | `storefront.spec.ts` (+ `helpers/mockSupabase.ts`) | 12 (desktop + mobile) | ✅ 12/12 pass |
| pgTAP (`supabase/tests/rls.test.sql`) | 1 | 20 | ⏳ Requires a live Supabase project (manual step) |
| No-seed guard | `scripts/check-no-seed.mjs` | — | ✅ Pass |
| TypeScript (`npm run lint`) | — | — | ✅ 0 errors |
| Production build (`npm run build`) | — | — | ✅ Guard + Vite succeed |

### Verification summary (final run, 2026-10-10)
- `node scripts/check-no-seed.mjs` — ✅ **Check passed: zero seed, demo, or placeholder data found in src/.**
- `npx tsc --noEmit` — ✅ **0 errors**
- `npx vitest run` — ✅ **28/28 tests pass** (4 files: framing, noSeedCheck, mediaValidation, mediaPicker)
- `npm run build` — ✅ guard + Vite build succeed (2340 modules, dist emitted)
- `npm run test:e2e` — ✅ **12/12 Playwright tests pass** (desktop 1440×900 + mobile 390×844), Supabase REST/Storage/Auth mocked, realtime websocket accepted-but-silent so the suite is deterministic.

---

## Configuration deliverables

| File | Change |
|---|---|
| `package.json` | `build` runs the guard first; `check:no-seed`, `test`, `test:unit`, `test:e2e`, `pretest:e2e`, `verify` scripts added |
| `tsconfig.json` | includes `tests`, `vitest.config.ts`, `playwright.config.ts`; `noEmit: true` |
| `vitest.config.ts` | jsdom; includes `.test.{ts,tsx}`; 30 s timeout for the guard's child process |
| `playwright.config.ts` | desktop + mobile projects; `vite preview` webServer; HTML/list reporters |
| `.github/workflows/ci.yml` | 3 jobs: guard (dependency-free) → typecheck+unit+build → e2e (installs Chromium) |
| `.env.example` | rewritten; `DEMO_MODE` removed; documents which keys are server-only |
| `README.md` | migration list 0001–0006, storage verification, tests section, deploy notes |
| `MANUAL_STEPS.md` | 30-step ordered checklist (SQL → Storage → Realtime → Local → Content → Deploy) |

## Files changed during the audit pass
- `src/admin/components/ImageFrameAdjusterModal.tsx` — `readAsDataURL` → `URL.createObjectURL` (last guard violation).
- `supabase/migrations/0006_media_storage.sql` — idempotent constraint block.
- `tests/unit/mediaPicker.test.tsx` — waits for the library count before clicking the tab.
- `tests/e2e/storefront.spec.ts` — empty-state copy + framing expectations aligned with the real components; products in the featured grid require `status: 'live'`.
- `tests/e2e/helpers/mockSupabase.ts` — `blockRealtime` accepts (not blocks) the realtime websocket so the CHANNEL_ERROR handler cannot race and wipe the initial products fetch; suite is deterministic.
- `vitest.config.ts` — `.test.{ts,tsx}` include.
- `package.json` — `pretest:e2e` (builds before the Playwright run).
