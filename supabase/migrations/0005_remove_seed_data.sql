-- ============================================================================
-- Migration 0005: Total Purge of Seed / Fake / Demo Data
-- 
-- Removes all invented products, categories, collections, orders, customers,
-- discounts, suggestions, proposals, waitlist, events, logs, stats, targets.
-- Resets settings and content to clean, empty default documents.
-- KEEPS public.admins and public.owner_config completely untouched.
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. Purge catalogue tables
truncate table public.products cascade;
truncate table public.categories cascade;
truncate table public.collections cascade;
truncate table public.discounts cascade;

-- 2. Purge orders, customers, commerce
truncate table public.orders cascade;
truncate table public.customers cascade;
truncate table public.waitlist cascade;
truncate table public.inventoryLog cascade;

-- 3. Purge community suggestions & proposals system (0001 & 0003)
truncate table public.suggestions cascade;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'reservations') then
    truncate table public.reservations cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'referral_events') then
    truncate table public.referral_events cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'wave_members') then
    truncate table public.wave_members cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'waves') then
    truncate table public.waves cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'votes') then
    truncate table public.votes cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'saves') then
    truncate table public.saves cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'subscribers') then
    truncate table public.subscribers cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'proposal_images') then
    truncate table public.proposal_images cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'proposal_sizes') then
    truncate table public.proposal_sizes cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'proposal_stats_daily') then
    truncate table public.proposal_stats_daily cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'proposals') then
    truncate table public.proposals cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'suggest_targets') then
    truncate table public.suggest_targets cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'suggest_events') then
    truncate table public.suggest_events cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'suggest_audit_log') then
    truncate table public.suggest_audit_log cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'email_log') then
    truncate table public.email_log cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'stripe_events') then
    truncate table public.stripe_events cascade;
  end if;
end $$;

-- 4. Purge events, stats, audit and insights
truncate table public.events cascade;
truncate table public.dailyStats cascade;
truncate table public.auditLog cascade;
truncate table public.insights cascade;

-- 5. Purge targets & coaching system
truncate table public."targetPlans" cascade;
truncate table public."metricActuals" cascade;
truncate table public."coachTasks" cascade;
truncate table public."dailyCoachBriefs" cascade;
truncate table public."reverseFunnelCalculations" cascade;

-- 6. Reset settings to empty editable schema
delete from public.settings;
insert into public.settings (
  id,
  storeInfo,
  shippingRates,
  freeShippingThreshold,
  vatRate,
  consentText,
  lowStockThreshold,
  updatedAt
) values (
  'default',
  '{"name": "", "email": "", "phone": "", "address": "", "currency": "EUR"}'::jsonb,
  '[]'::jsonb,
  0,
  24,
  '{"en": ""}'::jsonb,
  5,
  to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
on conflict (id) do update set
  storeInfo = excluded.storeInfo,
  shippingRates = excluded.shippingRates,
  freeShippingThreshold = excluded.freeShippingThreshold,
  vatRate = excluded.vatRate,
  consentText = excluded.consentText,
  lowStockThreshold = excluded.lowStockThreshold,
  updatedAt = excluded.updatedAt;

-- 7. Reset content to empty sections
delete from public.content;
insert into public.content (
  id,
  sectionOrder,
  heroMedia,
  heroSlides,
  announcementBar,
  journalPosts,
  translations,
  updatedAt
) values (
  'default',
  '["hero", "featured", "categories", "story", "journal"]'::jsonb,
  '{"desktopSrc": "", "desktopPoster": "", "mobileSrc": "", "mobilePoster": ""}'::jsonb,
  '[]'::jsonb,
  '{"en": ""}'::jsonb,
  '[]'::jsonb,
  '{}'::jsonb,
  to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)
on conflict (id) do update set
  sectionOrder = excluded.sectionOrder,
  heroMedia = excluded.heroMedia,
  heroSlides = excluded.heroSlides,
  announcementBar = excluded.announcementBar,
  journalPosts = excluded.journalPosts,
  translations = excluded.translations,
  updatedAt = excluded.updatedAt;
