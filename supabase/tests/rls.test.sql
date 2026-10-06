-- ============================================================================
-- pgTAP RLS Security & Owner-Only Enforcement Test Suite
-- ============================================================================
-- Tests:
--  1. Verify get_owner_email() returns 'huxaifa0fficial@gmail.com'
--  2. Verify anonymous / public users CANNOT access administrative data
--  3. Verify non-owner authenticated users CANNOT read public.admins
--  4. Verify non-owner cannot insert/update into public.admins (trigger blocks)
--  5. Verify is_owner(), is_admin(), can_write() return false for non-owner
--  6. Verify proposals table policies enforce owner-only administrative mutations
-- ============================================================================

begin;
select plan(12);

-- Test 1: get_owner_email() function returns exact designated owner
select is(
  public.get_owner_email(),
  'huxaifa0fficial@gmail.com',
  'get_owner_email() must return huxaifa0fficial@gmail.com'
);

-- Test 2: Anonymous user is_owner() evaluates to false
set role anon;
select is(
  public.is_owner(),
  false,
  'anon role is_owner() must evaluate to false'
);

-- Test 3: Anonymous user is_admin() evaluates to false
select is(
  public.is_admin(),
  false,
  'anon role is_admin() must evaluate to false'
);

-- Test 4: Anonymous user can_write() evaluates to false
select is(
  public.can_write(),
  false,
  'anon role can_write() must evaluate to false'
);

-- Test 5: Anonymous user cannot select from public.admins (empty or denied)
select is_empty(
  'select * from public.admins',
  'anon role cannot select rows from public.admins'
);

-- Test 6: Verify trigger rejects non-owner insert into public.admins
set role authenticated;
set request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "email": "attacker@example.com"}';

select throws_ok(
  $$ insert into public.admins (id, email, name, role) values ('hack-1', 'attacker@example.com', 'Attacker', 'owner') $$,
  'P0001',
  '%Only the designated owner%may be registered in public.admins%',
  'Trigger must abort insert of non-owner email into public.admins'
);

-- Test 7: Verify trigger rejects editor role even if email matches
select throws_ok(
  $$ insert into public.admins (id, email, name, role) values ('hack-2', 'huxaifa0fficial@gmail.com', 'Huxaifa', 'editor') $$,
  'P0001',
  '%Only the owner role is permitted%',
  'Trigger must reject non-owner role in public.admins'
);

-- Test 8: Non-owner authenticated user is_owner() evaluates to false
select is(
  public.is_owner(),
  false,
  'attacker authenticated token is_owner() must evaluate to false'
);

-- Test 9: Non-owner authenticated user cannot read public.admins
select is_empty(
  'select * from public.admins',
  'attacker authenticated token cannot read public.admins via RLS'
);

-- Test 10: Non-owner cannot update proposals
select is_empty(
  $$ update public.proposals set status = 'launched' where code = 'P-001' returning id $$,
  'Non-owner cannot update proposals table'
);

-- Test 11: Switch to service_role to verify owner entry exists in public.admins
set role service_role;
select results_eq(
  'select email, role from public.admins where email = public.get_owner_email()',
  $$ values ('huxaifa0fficial@gmail.com'::text, 'owner'::text) $$,
  'Owner entry exists in public.admins with role owner'
);

-- Test 12: Verify owner_config table contains designated owner
select results_eq(
  'select owner_email from public.owner_config where id = 1',
  $$ values ('huxaifa0fficial@gmail.com'::text) $$,
  'owner_config table contains huxaifa0fficial@gmail.com'
);

select * from finish();
rollback;
