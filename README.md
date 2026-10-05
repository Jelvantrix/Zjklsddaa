# Zejesh

Scandinavian archival e-commerce storefront + studio administration console.

- **Front end:** Vite + React + TypeScript + Tailwind
- **Database / realtime / auth:** Supabase (Postgres, Realtime, Supabase Auth)
- **API:** Express (`server.ts`) — Gemini video generation, targets & coach engine

Firebase has been fully removed. There is no `firebase` package, no `functions/`
directory, and no Firestore/Storage rules left in this repository.

---

## 1. Environment

Copy `.env.example` to `.env` and fill it in:

| Variable | Where it lives | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client + server | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Client + server | Safe to expose; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Bypasses RLS. **Never** prefix with `VITE_` |
| `GEMINI_API_KEY` | Server only | Video generation |
| `TRUST_PROXY` | Server only | Set to `1` when behind nginx/Cloudflare/etc. |
| `DEMO_MODE` | Either | Must be `false`/unset in production |
| `NODE_ENV` | Server only | `development` is opt-in via `npm run dev`; everything else runs with production posture |

`SUPABASE_SERVICE_ROLE_KEY` is read through `process.env`, not `import.meta.env`,
so Vite never inlines it. A build-time check (`config.ts`) throws if it is ever
present in a browser context. The `/api` routes return **503** if it is missing,
because they cannot verify administrative roles without it.

---

## 2. Database setup

Run the migrations **in order** in the Supabase SQL Editor (or `supabase db push`):

1. `supabase/migrations/0001_init_schema.sql` — 21 tables, indexes, realtime publication, `pg_cron` daily-stats job
2. `supabase/migrations/0002_production_security.sql` — role helpers, checkout RPCs, Row Level Security
3. `supabase/setup-first-admin.sql` — **required**, see below

### 2.1 Creating the first administrator

Security model: `public.admins` has no anonymous access, and only an existing
`owner` may insert or update rows in it. The very first row therefore has to be
created from the SQL Editor, which runs with full privileges.

Edit the three values at the top of `supabase/setup-first-admin.sql` and run it
once. It creates the Supabase Auth account *and* the matching `owner` row
atomically.

> **Note:** the account `huxaifa0fficial@gmail.com` is referenced in demo seed
> constants only. It is not an access credential and does not exist until you
> create it.

### 2.2 Supabase Auth settings

In **Authentication → Providers**, keep *Email* enabled. In **Authentication →
Settings**, disable "Allow new users to sign up" for the public site — only
administrators should ever need to register.

---

## 3. Security model

### Row Level Security

| Surface | `anon` | `authenticated` |
| --- | --- | --- |
| `products`, `categories`, `collections`, `content`, `settings`, `discounts`, `suggestions` | SELECT | SELECT |
| `waitlist`, `events`, `auditLog` | INSERT only | as below |
| `orders`, `customers`, `insights`, `dailyStats`, `auditLog`, `inventoryLog`, targets/coach tables | none | `is_admin()` to read, `can_write()` to write |
| `admins` | none | `is_admin()` to read, **`is_owner()` to write** |

`is_admin()` / `admin_role()` / `can_write()` / `is_owner()` are `SECURITY
DEFINER` functions that read `public.admins` from the caller's JWT — the client
cannot influence their result.

### Table writes that visitors need

Checkout, waitlist signup and community voting all mutate data, but the browser
is never granted direct write access to `products`, `customers` or `suggestions`.
They go through `SECURITY DEFINER` RPCs instead:

- `place_order(jsonb)` — inserts the order, upserts the customer, decrements
  stock and writes the audit row in one transaction
- `submit_suggestion(jsonb)` — forces `status='under_review'`, `votes=1`
- `vote_for_suggestion(text, text)` — increments only if this voter has not
  voted before (the old read-then-write both raced and allowed repeat votes)

### Administrative console

`AdminSecurityGate` calls `supabase.auth.signInWithPassword`. There is no
client-side password, no bypass button, and no passkey stored in
`localStorage`. The role shown in the header is read-only — it comes from
`public.admins` and cannot be escalated from the browser. Real enforcement is
server-side: even a fully forged client session produces an invalid JWT and is
rejected by RLS.

### API (`server.ts`)

All 26 `/api/*` routes require a live Supabase access token that resolves to a
`public.admins` row. Additional hardening:

- body limit **512 KB** by default, **15 MB** only for `/api/generate-video`
- in-memory per-IP rate limiting (120 req/min general, 10/min video generation)
- `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, no `X-Powered-By`
- set `TRUST_PROXY=1` when behind a reverse proxy so rate limiting sees real IPs
- a JSON error handler returns a stable `{ error }` body and **never** sends a
  stack trace unless `NODE_ENV=development`
- unmatched `/api/*` paths answer `404 {"error":"Not found."}` instead of falling
  through to the SPA catch-all

Measured behaviour of a running server:

| Request | Response |
| --- | --- |
| `GET /api/metrics` (no token) | `401 {"error":"Authentication required."}` |
| `GET /api/metrics` (invalid token) | `401 {"error":"Invalid or expired session."}` |
| `GET /api/*` with no service key configured | `503` (fail closed) |
| Body > 512 KB | `413 {"error":"Request body too large."}` |
| Malformed JSON | `400 {"error":"Malformed JSON body."}` |
| 121+ requests/min from one IP | `429` + `Retry-After` |
| `GET /`, `GET /story` | `200 text/html` (SPA) |

---

## 4. Development

```bash
npm install
npm run dev      # NODE_ENV=development — Vite middleware, stack traces in errors
```

## 5. Production

```bash
npm run build    # bundles the client into dist/
npm start        # NODE_ENV=production — serves dist/ plus the /api routes
```

`cross-env` and `tsx` are regular **dependencies** (not dev), so a
`npm ci --omit=dev` production install still boots. If `dist/index.html` is
missing the server logs a clear warning and serves `503` rather than failing
obscurely.

Environment defaults are fail-safe: with `NODE_ENV` unset, the server behaves
in production mode — it serves the built assets and never returns a stack
trace — instead of accidentally booting a Vite dev server.

Verification status:

- `npm run lint` (`tsc --noEmit`) — **0 errors**, including `server.ts`
- `npm run build` — succeeds, 2333 modules
- `npm audit` — **0 vulnerabilities**
- `npm start` smoke-tested: SPA routes, 401/400/413/429 responses all verified
- No Firebase imports, no hardcoded credentials
- Service role key verified absent from the browser bundle (build-time sentinel test)
