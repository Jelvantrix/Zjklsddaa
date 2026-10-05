-- =============================================================================
-- Bootstrap the first administrator
-- =============================================================================
-- WHY THIS IS NEEDED
--   Migration 0002 removes anonymous write access to `public.admins` entirely,
--   and admin rows are only insertable by an existing `owner`. That is
--   deliberate — otherwise any signed-in customer could promote themselves.
--   The consequence is that the very first admin row has to be created from
--   the Supabase SQL editor, which runs with full privileges.
--
-- HOW TO USE
--   1. Run 0001_init_schema.sql, then 0002_production_security.sql.
--   2. Edit the three values in "STEP 1" below.
--   3. Run this whole file once in the Supabase SQL Editor.
--   4. Sign in at /admin with those credentials.
--
--   If you prefer the dashboard instead of Step 1, create the user under
--   Authentication -> Users -> "Add user" (tick "Auto Confirm"), then delete
--   Step 1 and only run Step 2 with the same email address.
-- =============================================================================

begin;

do $$
declare
  v_email    text := 'you@example.com';          -- <- CHANGE ME
  v_password text := 'replace-with-a-long-password'; -- <- CHANGE ME (12+ chars)
  v_name     text := 'Studio Owner';              -- <- CHANGE ME
  v_uid      uuid;
begin
  ---------------------------------------------------------------- STEP 1 ----
  -- Create the Supabase Auth account (password is hashed server-side).
  select id into v_uid from auth.users where lower(email) = lower(v_email);

  if v_uid is null then
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf', 12)),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', v_name),
      now(),
      now()
    );

    -- Minimal profile row so Supabase's auth API behaves normally.
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email',
      v_uid::text,
      now(), now(), now()
    );
  else
    -- Account already exists: make sure it can sign in right away.
    update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_token = null
    where id = v_uid;
  end if;

  ---------------------------------------------------------------- STEP 2 ----
  -- Grant the studio role. `role` accepts: owner | editor | viewer.
  --   owner  - full admin, can grant/revoke roles
  --   editor - may write catalogue, orders and targets
  --   viewer - read-only
  insert into public.admins (id, uid, email, name, role)
  values (v_uid::text, v_uid::text, lower(v_email), v_name, 'owner')
  on conflict (id) do update
    set email = excluded.email,
        name  = excluded.name,
        role  = excluded.role;

  raise notice 'Administrator ready: %', lower(v_email);
end $$;

commit;

-- -----------------------------------------------------------------------------
-- Optional: verify
-- -----------------------------------------------------------------------------
-- select u.email, a.role
-- from auth.users u
-- left join public.admins a on a.id = u.id::text
-- order by u.created_at desc;
