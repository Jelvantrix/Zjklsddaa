-- ============================================================================
-- Zejesh — Initial Supabase schema
-- Migrated from Firebase Firestore.
--
-- Design notes
-- ------------
-- * Firestore stored free-form documents. This schema mirrors every field the
--   TypeScript app actually writes, using `text` for ids/statuses/dates and
--   `jsonb` for nested objects and arrays.
-- * All status/type/priority columns are plain `text` (NOT enums) because the
--   app writes values that are not part of the TypeScript union at runtime
--   (e.g. products.status = 'coming_soon').
-- * Dates are stored as `text` holding ISO-8601 strings, exactly as the app
--   produces them, so JS `new Date(iso)` keeps working after read-back.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id                  text primary key,
  nr                  text,
  plateNumber         text,
  name                jsonb,
  description         jsonb,
  material            jsonb,
  origin              jsonb,
  care                jsonb,
  price               double precision,
  compareAtPrice      double precision,
  vatRate             double precision,
  categoryIds         jsonb,
  collectionIds       jsonb,
  category            text,
  subcategory         text,
  collectionSeason    text,
  variants            jsonb,
  sizes               jsonb,
  stock               integer,
  isLimited           boolean,
  isComingSoon        boolean,
  comingSoonNotice    text,
  comingSoonMessage   text,
  limitedEdition      jsonb,
  images              jsonb,
  image               text,
  hoverImage          text,
  imagePosition       text,
  hoverImagePosition  text,
  imageScale          double precision,
  status              text,
  publishAt           text,
  seo                 jsonb,
  createdAt           text,
  updatedAt           text,
  attentionScore      double precision,
  colorName           jsonb,
  colorHex            text,
  cropVariation       jsonb
);

create table if not exists public.categories (
  id                text primary key,
  parentId          text,
  name              jsonb,
  slug              text,
  image             text,
  "order"           integer,
  visible           boolean,
  isComingSoon      boolean,
  comingSoonNotice  text
);

create table if not exists public.collections (
  id           text primary key,
  name         jsonb,
  slug         text,
  type         text,
  startAt      text,
  endAt        text,
  editionSize  integer,
  status       text,
  cover        text,
  productIds   jsonb
);

create table if not exists public.discounts (
  id          text primary key,
  code        text,
  type        text,
  value       double precision,
  minSpend    double precision,
  usageLimit  integer,
  used        integer,
  startAt     text,
  endAt       text,
  active      boolean
);

-- ---------------------------------------------------------------------------
-- Storefront content & settings (single-row documents)
-- ---------------------------------------------------------------------------

create table if not exists public.content (
  id              text primary key,
  sectionOrder    jsonb,
  heroMedia       jsonb,
  heroSlides      jsonb,
  announcementBar jsonb,
  journalPosts    jsonb,
  translations    jsonb,
  updatedAt       text
);

create table if not exists public.settings (
  id                    text primary key,
  storeInfo             jsonb,
  shippingRates         jsonb,
  freeShippingThreshold double precision,
  vatRate               double precision,
  consentText           jsonb,
  lowStockThreshold     integer,
  updatedAt             text
);

create table if not exists public.admins (
  id    text primary key,
  uid   text,
  email text,
  name  text,
  role  text
);

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id              text primary key,
  number          text,
  customer        jsonb,
  items           jsonb,
  totals          jsonb,
  status          text,
  shippingMethod  text,
  tracking        text,
  notes           text,
  timeline        jsonb,
  createdAt       text,
  updatedAt       text
);

create table if not exists public.customers (
  id                text primary key,
  email             text,
  name              text,
  marketingConsent  boolean,
  wishlist          jsonb,
  totals            jsonb,
  firstSeen         text,
  lastSeen          text
);

create table if not exists public.waitlist (
  id        text primary key,
  email     text,
  source    text,
  dropId    text,
  createdAt text,
  invited   boolean
);

create table if not exists public.inventoryLog (
  id               text primary key,
  productId        text,
  productNr        text,
  sku              text,
  size             text,
  delta            integer,
  resultingStock   integer,
  reason           text,
  "by"             text,
  at               text
);

-- ---------------------------------------------------------------------------
-- Community co-creation
-- ---------------------------------------------------------------------------

create table if not exists public.suggestions (
  id             text primary key,
  title          text,
  category       text,
  desiredFabric  text,
  description    text,
  submittedBy    text,
  submitterEmail text,
  votes          integer,
  votedUserIds   jsonb,
  status         text,
  createdAt      text,
  updatedAt      text,
  curatorNotes   text
);

-- ---------------------------------------------------------------------------
-- Analytics, tracking & audit
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id           text primary key,
  type         text,
  timestamp    bigint,
  sessionId    text,
  visitorId    text,
  page         text,
  deviceClass  text,
  viewport     jsonb,
  language     text,
  referrer     text,
  utm          jsonb,
  payload      jsonb,
  data         jsonb,
  details      jsonb
);

create table if not exists public.dailyStats (
  id             text primary key,
  date           text,
  visitors       integer,
  sessions       integer,
  revenue        double precision,
  orders         integer,
  pageViews      integer,
  addToBags      integer,
  conversionRate double precision,
  topProducts    jsonb
);

create table if not exists public.auditLog (
  id      text primary key,
  who     text,
  action  text,
  target  text,
  at      text,
  details jsonb
);

create table if not exists public.insights (
  id               text primary key,
  title            text,
  priority         text,
  category         text,
  evidence         text,
  recommendation   text,
  expectedImpact   text,
  effort           text,
  suggestedAction  jsonb,
  metricImpact     jsonb,
  status           text,
  createdAt        text,
  resolvedAt       text
);

-- ---------------------------------------------------------------------------
-- Targets & goals system (served by server.ts)
-- ---------------------------------------------------------------------------

create table if not exists public."targetPlans" (
  id               text primary key,
  name             text,
  startMonth       integer,
  startYear        integer,
  endMonth         integer,
  endYear          integer,
  startPieces      double precision,
  endDailyPieces   double precision,
  growthCurve      text,
  growthRate       double precision,
  weekdayWeights   jsonb,
  yearlyTarget     jsonb,
  monthlyTargets   jsonb,
  weeklyTargets    jsonb,
  dailyTargets     jsonb,
  catalogTarget    jsonb,
  isActive         boolean,
  createdAt        text,
  updatedAt        text,
  version          integer,
  changeHistory    jsonb
);

create table if not exists public."metricActuals" (
  id                     text primary key,
  date                   text,
  piecesSold             integer,
  orders                 integer,
  revenue                double precision,
  grossProfit            double precision,
  sessions               integer,
  visitors               integer,
  conversionRate         double precision,
  aov                    double precision,
  unitsPerOrder          double precision,
  newCustomers           integer,
  returningCustomers     integer,
  repeatRate             double precision,
  emailSubscribers       integer,
  waitlistSignups        integer,
  contentPostsPublished  integer,
  adSpend                double precision,
  roas                   double precision,
  "returns"              integer,
  refunds                double precision,
  stockSellThrough       double precision,
  productsListed         integer,
  productsPhotographed   integer,
  isDemo                 boolean
);

create table if not exists public."coachTasks" (
  id              text primary key,
  date            text,
  title           text,
  family          text,
  status          text,
  priority        text,
  reason          text,
  expectedImpact  jsonb,
  effortMinutes   integer,
  deepLink        jsonb,
  autoGenerated   boolean,
  completedAt     text,
  skippedReason   text,
  snoozedUntil    text,
  blockedReason   text,
  assignedTo      text,
  position        integer,
  createdAt       text,
  updatedAt       text
);

create table if not exists public."dailyCoachBriefs" (
  id                    text primary key,
  date                  text,
  target                jsonb,
  actual                jsonb,
  pace                  text,
  gap                   integer,
  probabilityOfHitting  integer,
  tasks                 jsonb,
  totalEffortMinutes    integer,
  topPriorities         jsonb,
  riskPanel             jsonb,
  opportunityPanel      jsonb,
  winsPanel             jsonb,
  dailyScore            integer,
  streak                integer,
  carryOverCount        integer,
  generatedAt           text
);

create table if not exists public."reverseFunnelCalculations" (
  id                   text primary key,
  targetPieces         double precision,
  unitsPerOrder        double precision,
  targetOrders         double precision,
  conversionRate       double precision,
  targetSessions       double precision,
  visitorsPerSession   double precision,
  targetVisitors       double precision,
  channelBreakdown     jsonb,
  funnelSteps          jsonb,
  bottleneck           jsonb,
  sensitivityAnalysis  jsonb,
  generatedAt          text
);

-- Indexes used by the queries the app performs
create index if not exists products_status_idx        on public.products (status);
create index if not exists events_timestamp_idx       on public.events (timestamp desc);
create index if not exists metric_actuals_date_idx    on public."metricActuals" (date);
create index if not exists coach_tasks_date_idx       on public."coachTasks" (date, position);
create index if not exists orders_created_at_idx      on public.orders ("createdAt" desc);
create index if not exists waitlist_created_at_idx    on public.waitlist ("createdAt" desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The storefront and admin UI both act through the anon key from the browser,
-- so these policies are deliberately permissive. Tighten them by restricting
-- writes to `authenticated` and/or adding role checks against public.admins.
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  for tbl in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', tbl);

    -- Drop any previously created permissive policies so the block is idempotent.
    execute format('drop policy if exists "anon_all" on public.%I', tbl);
    execute format('drop policy if exists "authenticated_all" on public.%I', tbl);

    execute format(
      'create policy "anon_all" on public.%I for all to anon using (true) with check (true)',
      tbl
    );
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime — tables the app subscribes to via postgres_changes
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'products', 'categories', 'collections', 'content', 'settings',
      'orders', 'customers', 'waitlist', 'suggestions', 'events',
      'targetPlans', 'metricActuals', 'coachTasks', 'dailyCoachBriefs'
    ])
  loop
    -- Publication membership is not idempotent, so ignore duplicate errors.
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Daily stats aggregation
--
-- Port of the Firebase Cloud Function `aggregateDailyStats`
-- (functions/src/index.ts), which ran daily at 00:05 Europe/Helsinki and
-- rolled raw /events rows up into /dailyStats/{YYYY-MM-DD}.
-- ---------------------------------------------------------------------------

create or replace function public.aggregate_daily_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date    text;
  v_start   bigint;
  v_end     bigint;
  v_views   integer := 0;
  v_bags    integer := 0;
  v_orders  integer := 0;
  v_revenue double precision := 0;
  v_sessions integer := 0;
  v_visitors integer := 0;
  v_conv    double precision := 0;
begin
  -- "Yesterday" in the store's timezone, matching the original function.
  v_date   := to_char((now() at time zone 'Europe/Helsinki') - interval '1 day', 'YYYY-MM-DD');
  v_start  := (extract(epoch from ((now() at time zone 'Europe/Helsinki') - interval '1 day')::date) * 1000)::bigint;
  v_end    := v_start + 86399999;

  select
    count(*) filter (where type = 'page_view'),
    count(*) filter (where type = 'add_to_bag'),
    count(*) filter (where type = 'purchase'),
    coalesce(sum(
      coalesce(
        (payload->>'total')::numeric,
        (details->>'total')::numeric,
        (data->>'total')::numeric,
        0
      )
    ), 0)::double precision,
    count(distinct sessionId),
    count(distinct visitorId)
  into v_views, v_bags, v_orders, v_revenue, v_sessions, v_visitors
  from public.events
  where timestamp between v_start and v_end;

  if v_sessions > 0 then
    v_conv := round((v_orders::numeric / v_sessions) * 1000) / 10;
  end if;

  insert into public.dailyStats
    (id, date, visitors, sessions, revenue, orders, pageViews, addToBags, conversionRate, topProducts)
  values
    (v_date, v_date, v_visitors, v_sessions, v_revenue, v_orders, v_views, v_bags, v_conv, '[]'::jsonb)
  on conflict (id) do update set
    visitors      = excluded.visitors,
    sessions      = excluded.sessions,
    revenue       = excluded.revenue,
    orders        = excluded.orders,
    pageViews     = excluded.pageViews,
    addToBags     = excluded.addToBags,
    conversionRate = excluded.conversionRate;
end $$;

-- 00:05 UTC ~= 00:05 Europe/Helsinki during standard time (EET, UTC+2).
-- During summer time (EEST, UTC+3) the rollup runs at 01:05 local instead.
-- Requires the pg_cron extension (enabled in the Supabase dashboard).
select cron.schedule(
  'aggregate-daily-stats',
  '5 22 * * *',
  $$select public.aggregate_daily_stats()$$
);
