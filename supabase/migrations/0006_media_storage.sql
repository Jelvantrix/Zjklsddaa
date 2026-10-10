-- ============================================================================
-- Migration 0006: Real Supabase Media Storage & Media Assets Tracking
--
-- 1. Provisions the public-read "media" storage bucket with 15MB limit and
--    restricted mime-types (JPEG, PNG, WebP, AVIF, MP4, WebM).
-- 2. Configures Storage RLS: Public read, owner-only (public.is_owner()) write.
-- 3. Creates public.media_assets table with camelCase columns in double quotes.
-- 4. Secures public.media_assets with public select and owner-only write policies.
-- ============================================================================

-- 1. Storage bucket configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  15728640, -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']::text[];

-- 2. Storage RLS Policies
-- Enable RLS on storage.objects if not already enabled
alter table storage.objects enable row level security;

-- Drop existing media policies if they exist to allow clean idempotent re-execution
drop policy if exists "Public can view media" on storage.objects;
drop policy if exists "Owner can upload media" on storage.objects;
drop policy if exists "Owner can update media" on storage.objects;
drop policy if exists "Owner can delete media" on storage.objects;

-- Allow public read access to media bucket
create policy "Public can view media"
  on storage.objects
  for select
  using (bucket_id = 'media');

-- Allow only confirmed store owner to upload objects
create policy "Owner can upload media"
  on storage.objects
  for insert
  with check (bucket_id = 'media' and public.is_owner());

-- Allow only confirmed store owner to update objects
create policy "Owner can update media"
  on storage.objects
  for update
  using (bucket_id = 'media' and public.is_owner());

-- Allow only confirmed store owner to delete objects
create policy "Owner can delete media"
  on storage.objects
  for delete
  using (bucket_id = 'media' and public.is_owner());

-- 3. Table: public.media_assets
create table if not exists public.media_assets (
  id            text primary key,
  path          text not null unique,
  url           text not null,
  kind          text not null default 'image' check (kind in ('image', 'video')),
  width         integer,
  height        integer,
  "sizeBytes"   bigint,
  "mimeType"    text,
  alt           text,
  "focalX"      double precision default 50,
  "focalY"      double precision default 50,
  "createdAt"   text not null default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- Index for rapid lookup
create index if not exists idx_media_assets_created on public.media_assets ("createdAt" desc);
create index if not exists idx_media_assets_kind on public.media_assets (kind);

-- 4. RLS for public.media_assets
alter table public.media_assets enable row level security;

drop policy if exists "Public can view media assets" on public.media_assets;
drop policy if exists "Owner can insert media assets" on public.media_assets;
drop policy if exists "Owner can update media assets" on public.media_assets;
drop policy if exists "Owner can delete media assets" on public.media_assets;

create policy "Public can view media assets"
  on public.media_assets
  for select
  using (true);

create policy "Owner can insert media assets"
  on public.media_assets
  for insert
  with check (public.is_owner());

create policy "Owner can update media assets"
  on public.media_assets
  for update
  using (public.is_owner());

create policy "Owner can delete media assets"
  on public.media_assets
  for delete
  using (public.is_owner());
