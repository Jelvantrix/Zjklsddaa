-- ============================================================================
-- Migration 0004: Strict Single-Owner Administrative Security Hardening
--
-- Exclusively restricts administrative capabilities to the verified owner:
--   huxaifa0fficial@gmail.com
--
-- Even if an account is created in auth.users, or an unauthorized row is
-- inserted into public.admins, all RLS functions evaluate to FALSE unless:
--   1. auth.uid() is NOT NULL
--   2. JWT email equals 'huxaifa0fficial@gmail.com' (lowercased)
--   3. Email is confirmed (email_confirmed_at is NOT NULL)
--   4. A corresponding row exists in public.admins with role = 'owner'
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Immutable Owner Configuration Table & Security Function
-- ---------------------------------------------------------------------------

create table if not exists public.owner_config (
  id integer primary key default 1 check (id = 1),
  owner_email text not null unique check (lower(owner_email) = owner_email),
  created_at timestamptz not null default now()
);

insert into public.owner_config (id, owner_email)
values (1, 'huxaifa0fficial@gmail.com')
on conflict (id) do update set owner_email = 'huxaifa0fficial@gmail.com';

-- Lock down owner_config table from all non-service_role access
alter table public.owner_config enable row level security;
revoke all on public.owner_config from anon, authenticated;

create or replace function public.get_owner_email()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select 'huxaifa0fficial@gmail.com'::text;
$$;

grant execute on function public.get_owner_email() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Owner-Only Security Functions (Replace previous role helpers)
-- ---------------------------------------------------------------------------

create or replace function public.jwt_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_email_confirmed()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_confirmed boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- First check JWT claim if present
  if (auth.jwt() ->> 'email_confirmed_at') is not null then
    return true;
  end if;

  -- Fallback to auth.users lookup
  select (email_confirmed_at is not null) into v_confirmed
  from auth.users
  where id = auth.uid();

  return coalesce(v_confirmed, false);
end;
$$;

grant execute on function public.jwt_email() to anon, authenticated, service_role;
grant execute on function public.is_email_confirmed() to anon, authenticated, service_role;

-- Checks if caller is the validated owner
create or replace function public.is_owner()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text;
  v_owner_match boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  v_email := public.jwt_email();

  -- Strict check 1: JWT email must equal designated owner email
  if v_email <> public.get_owner_email() then
    return false;
  end if;

  -- Strict check 2: Email must be confirmed
  if not public.is_email_confirmed() then
    return false;
  end if;

  -- Strict check 3: Must exist in public.admins with role = 'owner'
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = public.get_owner_email()
      and lower(a.role) = 'owner'
  ) into v_owner_match;

  return coalesce(v_owner_match, false);
end;
$$;

-- is_admin() and can_write() delegate directly to is_owner()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.is_owner();
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
as $$
  select public.is_owner();
$$;

create or replace function public.admin_role()
returns text
language sql
stable
as $$
  select case when public.is_owner() then 'owner' else null end;
$$;

-- Proposal / Demand system function from migration 0003
create or replace function public.is_admin_user(p_min_role text default 'viewer')
returns boolean
language sql
stable
as $$
  select public.is_owner();
$$;

grant execute on function public.is_owner() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.can_write() to anon, authenticated, service_role;
grant execute on function public.admin_role() to anon, authenticated, service_role;
grant execute on function public.is_admin_user(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Strict Database Trigger on public.admins
-- ---------------------------------------------------------------------------
-- Prevents any non-owner admin row from ever being inserted or updated.

create or replace function public.trg_enforce_owner_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if lower(trim(new.email)) <> public.get_owner_email() then
    raise exception 'Access Denied: Only the designated owner (%) may be registered in public.admins.', public.get_owner_email();
  end if;

  if lower(trim(new.role)) <> 'owner' then
    raise exception 'Access Denied: Only the owner role is permitted in public.admins.';
  end if;

  new.email := lower(trim(new.email));
  new.role := 'owner';
  return new;
end;
$$;

drop trigger if exists enforce_owner_admin_only on public.admins;
create trigger enforce_owner_admin_only
before insert or update on public.admins
for each row
execute function public.trg_enforce_owner_admin_only();

-- Clean up any non-owner rows in public.admins
delete from public.admins
where lower(trim(email)) <> public.get_owner_email();

-- Ensure owner row exists in public.admins
insert into public.admins (id, email, name, role, created_at, updated_at)
values (
  'admin-owner',
  public.get_owner_email(),
  'Huxaifa (Owner)',
  'owner',
  now(),
  now()
)
on conflict (id) do update set
  email = public.get_owner_email(),
  role = 'owner',
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Lockdown of public.admins Table Permissions
-- ---------------------------------------------------------------------------
-- Disallow ALL client-side inserts, updates, and deletes on public.admins.
-- Rows may only be managed via the Supabase SQL editor or migration scripts.

drop policy if exists admin_insert on public.admins;
drop policy if exists admin_update on public.admins;
drop policy if exists admin_delete on public.admins;
drop policy if exists admin_read on public.admins;

-- Only authenticated users passing is_owner() can read public.admins
create policy admin_read on public.admins
  for select
  to authenticated
  using (public.is_owner());

-- Revoke write privileges on public.admins from client roles
revoke insert, update, delete on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
grant all on public.admins to service_role;
