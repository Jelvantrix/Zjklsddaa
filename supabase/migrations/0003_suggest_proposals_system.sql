-- ============================================================================
-- Migration 0003: Zejesh Suggest & Proposal Pre-Launch Production Engine
-- Pure Supabase (Postgres, Row Level Security, Concurrency Locks, RPCs, Views)
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. Proposals Catalog (Demand-Driven Production)
-- ---------------------------------------------------------------------------

create table if not exists public.proposals (
  id                        uuid primary key default gen_random_uuid(),
  code                      text not null unique, -- e.g. P-001, P-002
  title                     text not null,
  category                  text not null,
  desired_fabric            text not null,
  description               text not null,
  story                     text,
  materials                 text,
  origin                    text,
  fit_notes                 text,
  threshold                 integer not null default 50 check (threshold > 0),
  confirmed_count           integer not null default 0 check (confirmed_count >= 0),
  status                    text not null default 'open' check (status in ('concept', 'open', 'confirmed', 'in_production', 'launched', 'not_produced')),
  visibility                boolean not null default true,
  price_cents               integer not null default 0 check (price_cents >= 0),
  currency                  text not null default 'EUR',
  max_per_person            integer not null default 2 check (max_per_person > 0),
  waitlist_enabled          boolean not null default true,
  preorder_enabled          boolean not null default false,
  reservation_deadline      timestamptz,
  expected_production_date  timestamptz,
  expected_ship_date        timestamptz,
  cost_per_unit_cents       integer not null default 0 check (cost_per_unit_cents >= 0),
  minimum_run               integer not null default 50 check (minimum_run > 0),
  target_margin             numeric(5,2) not null default 65.00 check (target_margin >= 0 and target_margin <= 100),
  is_demo                   boolean not null default false,
  curator_notes             text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_proposals_status on public.proposals (status);
create index if not exists idx_proposals_code on public.proposals (code);
create index if not exists idx_proposals_visibility on public.proposals (visibility);

-- ---------------------------------------------------------------------------
-- 2. Proposal Images & Editorial Media
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_images (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  url             text not null,
  crop_variation  jsonb not null default '{}'::jsonb,
  is_primary      boolean not null default false,
  is_hover        boolean not null default false,
  position_order  integer not null default 0,
  alt_text        text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists idx_proposal_images_proposal_id on public.proposal_images (proposal_id, position_order);

-- ---------------------------------------------------------------------------
-- 3. Proposal Sizes (Per-Size Production Caps)
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_sizes (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  size            text not null,
  cap             integer not null default 100 check (cap > 0),
  reserved_count  integer not null default 0 check (reserved_count >= 0),
  created_at      timestamptz not null default now(),
  unique (proposal_id, size)
);

create index if not exists idx_proposal_sizes_pid on public.proposal_sizes (proposal_id);

-- ---------------------------------------------------------------------------
-- 4. Reservations (Double Opt-In, Race-Safe Ordering, Referrals)
-- ---------------------------------------------------------------------------

create table if not exists public.reservations (
  id                        uuid primary key default gen_random_uuid(),
  proposal_id               uuid not null references public.proposals(id) on delete cascade,
  size                      text not null,
  quantity                  integer not null default 1 check (quantity > 0),
  email                     text not null,
  email_normalized          text not null,
  email_hash                text not null,
  name                      text,
  status                    text not null default 'pending' check (status in ('pending', 'confirmed', 'waiting_wave', 'invited', 'purchased', 'cancelled', 'expired')),
  option                    text not null default 'waitlist' check (option in ('waitlist', 'preorder')),
  position                  integer, -- Gap-free race-safe queue number per proposal
  confirm_token_hash        text,
  confirm_token_expires_at  timestamptz,
  manage_token_hash         text,
  referral_code             text not null unique,
  referred_by_code          text,
  referral_points           integer not null default 0 check (referral_points >= 0),
  terms_accepted            boolean not null default false,
  marketing_opt_in          boolean not null default false,
  ip_hash                   text not null,
  stripe_session_id         text,
  created_at                timestamptz not null default now(),
  confirmed_at              timestamptz,
  updated_at                timestamptz not null default now()
);

-- One active reservation per email + proposal + size
create unique index if not exists idx_reservations_active_unique
  on public.reservations (proposal_id, email_normalized, size)
  where status not in ('cancelled', 'expired');

create index if not exists idx_reservations_proposal_status on public.reservations (proposal_id, status);
create index if not exists idx_reservations_email_hash on public.reservations (email_hash);
create index if not exists idx_reservations_position on public.reservations (proposal_id, position);
create index if not exists idx_reservations_confirm_hash on public.reservations (confirm_token_hash);
create index if not exists idx_reservations_manage_hash on public.reservations (manage_token_hash);

-- ---------------------------------------------------------------------------
-- 5. Referral Events (Anti-Abuse Tracking)
-- ---------------------------------------------------------------------------

create table if not exists public.referral_events (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references public.reservations(id) on delete cascade,
  referee_id        uuid not null references public.reservations(id) on delete cascade,
  points_awarded    integer not null default 1,
  created_at        timestamptz not null default now(),
  unique (referrer_id, referee_id)
);

-- ---------------------------------------------------------------------------
-- 6. Invite Waves & Release Windows
-- ---------------------------------------------------------------------------

create table if not exists public.waves (
  id                    uuid primary key default gen_random_uuid(),
  proposal_id           uuid not null references public.proposals(id) on delete cascade,
  name                  text not null,
  wave_number           integer not null default 1,
  send_at               timestamptz not null,
  purchase_window_hours integer not null default 48 check (purchase_window_hours > 0),
  status                text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'closed')),
  created_at            timestamptz not null default now()
);

create table if not exists public.wave_members (
  id                uuid primary key default gen_random_uuid(),
  wave_id           uuid not null references public.waves(id) on delete cascade,
  reservation_id    uuid not null references public.reservations(id) on delete cascade,
  invite_token_hash text not null,
  invite_expires_at timestamptz not null,
  opened_at         timestamptz,
  clicked_at        timestamptz,
  purchased_at      timestamptz,
  created_at        timestamptz not null default now(),
  unique (wave_id, reservation_id)
);

-- ---------------------------------------------------------------------------
-- 7. Verified Ballots & Community Votes
-- ---------------------------------------------------------------------------

create table if not exists public.votes (
  id                uuid primary key default gen_random_uuid(),
  proposal_id       uuid not null references public.proposals(id) on delete cascade,
  voter_email_hash  text not null,
  ip_hash           text not null,
  created_at        timestamptz not null default now(),
  unique (proposal_id, voter_email_hash)
);

create index if not exists idx_votes_proposal on public.votes (proposal_id);

-- ---------------------------------------------------------------------------
-- 8. Client Saves & Wishlists
-- ---------------------------------------------------------------------------

create table if not exists public.saves (
  id                uuid primary key default gen_random_uuid(),
  proposal_id       uuid not null references public.proposals(id) on delete cascade,
  session_id        text not null,
  user_email_hash   text,
  created_at        timestamptz not null default now(),
  unique (proposal_id, session_id)
);

create index if not exists idx_saves_proposal on public.saves (proposal_id);

-- ---------------------------------------------------------------------------
-- 9. Subscribers & Consent Ledger (GDPR Double Opt-In)
-- ---------------------------------------------------------------------------

create table if not exists public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique,
  email_normalized  text not null unique,
  email_hash        text not null unique,
  source            text not null default 'suggest',
  marketing_consent boolean not null default false,
  consent_timestamp timestamptz not null default now(),
  ip_hash           text not null,
  status            text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced')),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. Platform Settings (Single Row Configuration)
-- ---------------------------------------------------------------------------

create table if not exists public.suggest_settings (
  id                      uuid primary key default gen_random_uuid(),
  launch_date             timestamptz not null default '2027-03-01T00:00:00Z',
  preorders_enabled       boolean not null default false,
  referrals_enabled       boolean not null default true,
  voting_enabled          boolean not null default true,
  default_max_per_person  integer not null default 2 check (default_max_per_person > 0),
  counter_min_visibility  integer not null default 10 check (counter_min_visibility >= 0),
  preorder_terms_text     text not null default 'Pre-orders are billed securely at checkout. 100% refund available prior to production cut.',
  refund_policy_text      text not null default 'If a design fails to reach threshold or is archived, all pre-orders are automatically refunded.',
  consent_text            text not null default 'I accept the reservation terms and double opt-in email verification.',
  email_sender            text not null default 'Zejesh Atelier <concierge@zejesh.com>',
  is_singleton            boolean not null default true unique check (is_singleton = true),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Ensure settings row exists
insert into public.suggest_settings (is_singleton)
values (true)
on conflict (is_singleton) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Email Dispatch Log & Auditing
-- ---------------------------------------------------------------------------

create table if not exists public.email_log (
  id                    uuid primary key default gen_random_uuid(),
  recipient_email_hash  text not null,
  template              text not null,
  status                text not null default 'sent' check (status in ('sent', 'failed', 'bounced', 'complaint')),
  provider_message_id   text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create table if not exists public.suggest_audit_log (
  id          uuid primary key default gen_random_uuid(),
  who         text not null,
  action      text not null,
  target      text not null,
  details     jsonb not null default '{}'::jsonb,
  ip_hash     text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12. Analytics Events & Daily Stats Aggregation
-- ---------------------------------------------------------------------------

create table if not exists public.suggest_events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  session_id  text not null,
  visitor_id  text not null,
  proposal_id uuid references public.proposals(id) on delete set null,
  page        text not null default '/suggest',
  payload     jsonb not null default '{}'::jsonb,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_suggest_events_created on public.suggest_events (created_at desc);

create table if not exists public.proposal_stats_daily (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  proposal_id     uuid not null references public.proposals(id) on delete cascade,
  views           integer not null default 0,
  unique_visitors integer not null default 0,
  avg_dwell_seconds integer not null default 0,
  saves           integer not null default 0,
  reservations    integer not null default 0,
  waitlist_count  integer not null default 0,
  preorder_count  integer not null default 0,
  votes           integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (date, proposal_id)
);

-- ---------------------------------------------------------------------------
-- 13. Targets, Milestones & Ramp Engine
-- ---------------------------------------------------------------------------

create table if not exists public.suggest_targets (
  id            uuid primary key default gen_random_uuid(),
  period        text not null check (period in ('yearly', 'monthly', 'weekly', 'daily')),
  target_date   date not null,
  metric        text not null check (metric in ('reservations', 'confirmed_reservations', 'preorder_revenue_cents', 'proposals_published', 'email_subscribers', 'visitors')),
  target_value  numeric(12,2) not null,
  actual_value  numeric(12,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (period, target_date, metric)
);

create table if not exists public.stripe_events (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,
  event_type    text not null,
  payload       jsonb not null,
  processed_at  timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete cascade,
  email           text not null unique,
  name            text not null,
  role            text not null default 'viewer' check (role in ('owner', 'manager', 'viewer')),
  is_mfa_enabled  boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id            uuid primary key default gen_random_uuid(),
  key_hash      text not null unique,
  count         integer not null default 1,
  window_start  timestamptz not null default now()
);

create index if not exists idx_rate_limits_window on public.rate_limits (window_start);

-- ---------------------------------------------------------------------------
-- 14. Views: Honest Counter Protection (Never Fake, Safe Columns Only)
-- ---------------------------------------------------------------------------

create or replace view public.public_proposals as
select
  p.id,
  p.code,
  p.title,
  p.category,
  p.desired_fabric,
  p.description,
  p.story,
  p.materials,
  p.origin,
  p.fit_notes,
  p.threshold,
  case
    when p.confirmed_count >= s.counter_min_visibility then p.confirmed_count
    else null
  end as confirmed_count,
  p.status,
  p.price_cents,
  p.currency,
  p.max_per_person,
  p.waitlist_enabled,
  (p.preorder_enabled and s.preorders_enabled) as preorder_enabled,
  p.reservation_deadline,
  p.expected_production_date,
  p.expected_ship_date,
  p.curator_notes,
  p.created_at,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', img.id,
          'url', img.url,
          'cropVariation', img.crop_variation,
          'isPrimary', img.is_primary,
          'isHover', img.is_hover,
          'alt', img.alt_text
        ) order by img.position_order asc
      )
      from public.proposal_images img
      where img.proposal_id = p.id
    ),
    '[]'::jsonb
  ) as images,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'size', sz.size,
          'isAvailable', (sz.cap > sz.reserved_count)
        )
      )
      from public.proposal_sizes sz
      where sz.proposal_id = p.id
    ),
    '[]'::jsonb
  ) as sizes,
  (
    select count(*)::int
    from public.votes v
    where v.proposal_id = p.id
  ) as vote_count
from public.proposals p
cross join public.suggest_settings s
where p.visibility = true
  and (p.is_demo = false or exists (select 1 from public.proposals where is_demo = true));

-- ---------------------------------------------------------------------------
-- 15. Security Definer Helper: Role Validation
-- ---------------------------------------------------------------------------

create or replace function public.is_admin_user(p_min_role text default 'viewer')
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role text;
  v_confirmed boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select (email_confirmed_at is not null) into v_confirmed
  from auth.users
  where id = auth.uid();

  if not coalesce(v_confirmed, false) then
    return false;
  end if;

  -- Check app_metadata role
  v_role := (auth.jwt() -> 'app_metadata' ->> 'role');
  if v_role is null then
    -- Fallback to admin_profiles table
    select role into v_role from public.admin_profiles where user_id = auth.uid();
  end if;

  if v_role is null then
    return false;
  end if;

  if p_min_role = 'owner' then
    return v_role = 'owner';
  elsif p_min_role = 'manager' then
    return v_role in ('owner', 'manager');
  else
    return v_role in ('owner', 'manager', 'viewer');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. Atomic Reservation Confirmation (Race-Safe, Row-Locking, Threshold Auto)
-- ---------------------------------------------------------------------------

create or replace function public.confirm_reservation_atomic(
  p_token_hash text,
  p_referral_bonus_points integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_res record;
  v_prop record;
  v_size record;
  v_next_pos integer;
  v_referrer record;
begin
  -- 1. Lock and select pending reservation
  select * into v_res
  from public.reservations
  where confirm_token_hash = p_token_hash
  for update;

  if v_res.id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired confirmation token');
  end if;

  if v_res.status = 'confirmed' then
    return jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'reservation_id', v_res.id,
      'position', v_res.position,
      'referral_code', v_res.referral_code
    );
  end if;

  if v_res.confirm_token_expires_at < now() then
    update public.reservations set status = 'expired' where id = v_res.id;
    return jsonb_build_object('success', false, 'error', 'Confirmation link expired (48 hour limit)');
  end if;

  -- 2. Lock proposal & check size cap
  select * into v_prop from public.proposals where id = v_res.proposal_id for update;
  select * into v_size from public.proposal_sizes where proposal_id = v_res.proposal_id and size = v_res.size for update;

  if v_size.id is not null and (v_size.reserved_count + v_res.quantity) > v_size.cap then
    return jsonb_build_object('success', false, 'error', 'Size capacity reached');
  end if;

  -- 3. Calculate race-safe gap-free position in line
  select coalesce(max(position), 0) + 1 into v_next_pos
  from public.reservations
  where proposal_id = v_res.proposal_id and status in ('confirmed', 'waiting_wave', 'invited', 'purchased');

  -- 4. Mark reservation confirmed
  update public.reservations
  set
    status = 'confirmed',
    position = v_next_pos,
    confirmed_at = now(),
    confirm_token_hash = null,
    updated_at = now()
  where id = v_res.id;

  -- 5. Increment counts
  update public.proposals
  set
    confirmed_count = confirmed_count + v_res.quantity,
    status = case
      when (confirmed_count + v_res.quantity) >= threshold and status = 'open' then 'confirmed'
      else status
    end,
    updated_at = now()
  where id = v_prop.id;

  if v_size.id is not null then
    update public.proposal_sizes
    set reserved_count = reserved_count + v_res.quantity
    where id = v_size.id;
  end if;

  -- 6. Credit referral code with anti-abuse
  if v_res.referred_by_code is not null and v_res.referred_by_code != v_res.referral_code then
    select * into v_referrer from public.reservations where referral_code = v_res.referred_by_code and status = 'confirmed';
    if v_referrer.id is not null and v_referrer.email_normalized != v_res.email_normalized then
      insert into public.referral_events (referrer_id, referee_id, points_awarded)
      values (v_referrer.id, v_res.id, p_referral_bonus_points)
      on conflict do nothing;

      -- Move referrer up line (each point moves 1 position up if possible)
      update public.reservations
      set
        referral_points = referral_points + p_referral_bonus_points,
        position = greatest(1, position - p_referral_bonus_points),
        updated_at = now()
      where id = v_referrer.id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_res.id,
    'position', v_next_pos,
    'proposal_code', v_prop.code,
    'referral_code', v_res.referral_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 17. Admin RPCs: Real Analytics & Decision Helper
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard(range_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_since timestamptz := now() - (range_days || ' days')::interval;
  v_res jsonb;
begin
  if not public.is_admin_user('viewer') then
    raise exception 'Unauthorized admin access';
  end if;

  select jsonb_build_object(
    'total_reservations', count(*),
    'confirmed_reservations', count(*) filter (where status in ('confirmed', 'waiting_wave', 'invited', 'purchased')),
    'preorders_paid', count(*) filter (where option = 'preorder' and status in ('confirmed', 'purchased')),
    'revenue_minor_units', coalesce(sum(p.price_cents * r.quantity) filter (where r.option = 'preorder' and r.status in ('confirmed', 'purchased')), 0),
    'waitlist_count', count(*) filter (where option = 'waitlist' and status in ('confirmed', 'waiting_wave')),
    'conversion_rate', round(
      case
        when count(*) = 0 then 0
        else (count(*) filter (where status in ('confirmed', 'purchased'))::numeric / count(*)::numeric) * 100
      end,
      2
    )
  ) into v_res
  from public.reservations r
  join public.proposals p on p.id = r.proposal_id
  where r.created_at >= v_since
    and p.is_demo = false;

  return v_res;
end;
$$;

create or replace function public.admin_production_helper(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prop record;
  v_break_even integer;
  v_gap integer;
  v_proj_margin numeric;
  v_recom text;
  v_curve jsonb;
begin
  if not public.is_admin_user('viewer') then
    raise exception 'Unauthorized admin access';
  end if;

  select * into v_prop from public.proposals where id = p_id;
  if v_prop.id is null then
    raise exception 'Proposal not found';
  end if;

  -- Break-even = cost * min_run / price
  if v_prop.price_cents > 0 then
    v_break_even := ceil((v_prop.cost_per_unit_cents * v_prop.minimum_run)::numeric / v_prop.price_cents::numeric);
  else
    v_break_even := v_prop.minimum_run;
  end if;

  v_gap := v_prop.threshold - v_prop.confirmed_count;

  if v_prop.price_cents > 0 then
    v_proj_margin := round(((v_prop.price_cents - v_prop.cost_per_unit_cents)::numeric / v_prop.price_cents::numeric) * 100, 2);
  else
    v_proj_margin := 0;
  end if;

  if v_prop.confirmed_count >= v_prop.threshold then
    v_recom := 'ready';
  elsif v_prop.reservation_deadline is not null and v_prop.reservation_deadline < now() then
    v_recom := 'cancel';
  else
    v_recom := 'not_yet';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'size', sz.size,
        'reserved', sz.reserved_count,
        'cap', sz.cap,
        'percentage', case when v_prop.confirmed_count > 0 then round((sz.reserved_count::numeric / v_prop.confirmed_count::numeric) * 100, 1) else 0 end
      )
    ),
    '[]'::jsonb
  ) into v_curve
  from public.proposal_sizes sz
  where sz.proposal_id = p_id;

  return jsonb_build_object(
    'proposal_code', v_prop.code,
    'break_even_units', v_break_even,
    'confirmed_count', v_prop.confirmed_count,
    'threshold', v_prop.threshold,
    'gap', v_gap,
    'projected_margin_percent', v_proj_margin,
    'recommendation', v_recom,
    'size_curve', v_curve
  );
end;
$$;

create or replace function public.admin_today()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := current_date;
  v_settings record;
  v_target numeric := 0;
  v_actual numeric := 0;
  v_pace text := 'on_track';
  v_gap numeric := 0;
  v_actions jsonb := '[]'::jsonb;
begin
  if not public.is_admin_user('viewer') then
    raise exception 'Unauthorized admin access';
  end if;

  select * into v_settings from public.suggest_settings limit 1;

  -- Today target from targets table if exists
  select coalesce(target_value, 10), coalesce(actual_value, 0)
  into v_target, v_actual
  from public.suggest_targets
  where period = 'daily' and target_date = v_today and metric = 'confirmed_reservations';

  v_gap := v_target - v_actual;
  if v_gap > 3 then v_pace := 'behind';
  elsif v_gap < -2 then v_pace := 'ahead';
  else v_pace := 'on_track';
  end if;

  -- Generate 3-5 deterministic actions based on real numbers
  select jsonb_agg(act) into v_actions from (
    -- Action 1: Close to threshold proposals
    select jsonb_build_object(
      'id', 'act-thresh-' || p.code,
      'title', 'Push ' || p.code || ' over threshold',
      'reason', p.code || ' is ' || (p.threshold - p.confirmed_count) || ' reservations away from factory threshold.',
      'priority', 'high',
      'deepLinkId', p.id,
      'impact', 'Unlocks production batch'
    ) as act
    from public.proposals p
    where p.status = 'open' and (p.threshold - p.confirmed_count) between 1 and 15 and p.is_demo = false
    limit 2

    union all

    -- Action 2: Stalled proposals
    select jsonb_build_object(
      'id', 'act-stalled-' || p.code,
      'title', 'Review imagery for ' || p.code,
      'reason', p.code || ' has views but below 2% reserve conversion.',
      'priority', 'medium',
      'deepLinkId', p.id,
      'impact', 'Increases visitor trust'
    ) as act
    from public.proposals p
    where p.status = 'open' and p.confirmed_count < 5 and p.is_demo = false
    limit 2

    union all

    -- Action 3: Review launch countdown
    select jsonb_build_object(
      'id', 'act-launch-date',
      'title', 'Audit March 2027 launch timeline',
      'reason', 'Target pace requires ' || ceil(v_gap) || ' more reservations today.',
      'priority', 'medium',
      'deepLinkId', v_settings.id,
      'impact', 'Keeps pre-launch ramp accurate'
    ) as act
  ) q;

  return jsonb_build_object(
    'date', v_today,
    'target', v_target,
    'actual', v_actual,
    'pace', v_pace,
    'gap', v_gap,
    'launch_date', v_settings.launch_date,
    'ranked_actions', coalesce(v_actions, '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 18. Row Level Security Policies (Default Deny Everywhere)
-- ---------------------------------------------------------------------------

alter table public.proposals enable row level security;
alter table public.proposal_images enable row level security;
alter table public.proposal_sizes enable row level security;
alter table public.reservations enable row level security;
alter table public.referral_events enable row level security;
alter table public.waves enable row level security;
alter table public.wave_members enable row level security;
alter table public.votes enable row level security;
alter table public.saves enable row level security;
alter table public.subscribers enable row level security;
alter table public.suggest_settings enable row level security;
alter table public.email_log enable row level security;
alter table public.suggest_audit_log enable row level security;
alter table public.suggest_events enable row level security;
alter table public.proposal_stats_daily enable row level security;
alter table public.suggest_targets enable row level security;
alter table public.stripe_events enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.rate_limits enable row level security;

-- Drop permissive policies on these tables if any
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'proposals', 'proposal_images', 'proposal_sizes', 'reservations',
    'referral_events', 'waves', 'wave_members', 'votes', 'saves',
    'subscribers', 'suggest_settings', 'email_log', 'suggest_audit_log',
    'suggest_events', 'proposal_stats_daily', 'suggest_targets',
    'stripe_events', 'admin_profiles', 'rate_limits'
  ]) loop
    execute format('drop policy if exists "anon_all" on public.%I', tbl);
    execute format('drop policy if exists "authenticated_all" on public.%I', tbl);
  end loop;
end $$;

-- Public (Anon) Read Access
create policy "public_can_read_visible_proposals"
  on public.proposals for select to anon, authenticated
  using (visibility = true);

create policy "public_can_read_proposal_images"
  on public.proposal_images for select to anon, authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and p.visibility = true));

create policy "public_can_read_proposal_sizes"
  on public.proposal_sizes for select to anon, authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and p.visibility = true));

create policy "public_can_read_public_settings"
  on public.suggest_settings for select to anon, authenticated
  using (true);

-- Admin Full Access Policies
create policy "admin_manage_proposals"
  on public.proposals for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_manage_images"
  on public.proposal_images for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_manage_sizes"
  on public.proposal_sizes for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_read_reservations"
  on public.reservations for select to authenticated
  using (public.is_admin_user('viewer'));

create policy "admin_write_reservations"
  on public.reservations for update to authenticated
  using (public.is_admin_user('manager'))
  with check (public.is_admin_user('manager'));

create policy "admin_manage_waves"
  on public.waves for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_manage_wave_members"
  on public.wave_members for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_manage_settings"
  on public.suggest_settings for update to authenticated
  using (public.is_admin_user('owner'))
  with check (public.is_admin_user('owner'));

create policy "admin_read_audit"
  on public.suggest_audit_log for select to authenticated
  using (public.is_admin_user('viewer'));

create policy "admin_read_stats"
  on public.proposal_stats_daily for select to authenticated
  using (public.is_admin_user('viewer'));

create policy "admin_manage_targets"
  on public.suggest_targets for all to authenticated
  using (public.is_admin_user('viewer'))
  with check (public.is_admin_user('manager'));

create policy "admin_read_profiles"
  on public.admin_profiles for select to authenticated
  using (public.is_admin_user('viewer'));

-- ---------------------------------------------------------------------------
-- 19. Realtime Publication
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['proposals', 'reservations', 'waves', 'suggest_targets']) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
