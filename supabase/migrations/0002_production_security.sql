-- ============================================================================
-- Production security hardening
--
-- Closes the holes found in the security review:
--   1. `anon` previously had FULL read/write on every table.
--   2. Checkout could arbitrarily UPDATE `products` from the browser.
--   3. Community voting allowed double-counting and status forgery.
--   4. An `editor` could promote themselves to `owner` via public.admins.
--   5. No way to ask "is this JWT an administrator?" from a policy.
--
-- Public (anon) surface, derived from the actual storefront code:
--   read   : products, categories, collections, content, settings,
--            discounts, suggestions
--   insert : waitlist, suggestions (via RPC), events, auditLog
--   rpc    : place_order, submit_suggestion, vote_for_suggestion
--   everything else -> administrators only
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------

create or replace function public.jwt_email()
returns text
language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')); $$;

-- SECURITY DEFINER so it can read public.admins even when RLS hides that table.
create or replace function public.admin_role()
returns text
language sql stable security definer set search_path = public
as $$
  select lower(a.role)
  from public.admins a
  where lower(a.email) = public.jwt_email()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable
as $$ select public.admin_role() is not null; $$;

-- owner/editor may write; viewer is read-only; non-admins write nothing.
create or replace function public.can_write()
returns boolean language sql stable
as $$ select coalesce(public.admin_role() in ('owner', 'editor'), false); $$;

create or replace function public.is_owner()
returns boolean language sql stable
as $$ select coalesce(public.admin_role() = 'owner', false); $$;

-- ISO-8601 UTC timestamp in the exact format the TypeScript app produces.
create or replace function public.iso_now()
returns text language sql stable
as $$
  select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

grant execute on function public.jwt_email()  to anon, authenticated, service_role;
grant execute on function public.admin_role() to anon, authenticated, service_role;
grant execute on function public.is_admin()   to anon, authenticated, service_role;
grant execute on function public.can_write()  to anon, authenticated, service_role;
grant execute on function public.is_owner()   to anon, authenticated, service_role;
grant execute on function public.iso_now()    to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Checkout RPC — atomic, so the browser can never write products/customers
-- ---------------------------------------------------------------------------
create or replace function public.place_order(p_order jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_cust      jsonb := p_order -> 'customer';
  v_totals    jsonb := p_order -> 'totals';
  v_cust_id   text;
  v_item      jsonb;
  v_qty       integer;
  v_new_stock integer;
begin
  if p_order is null or p_order ->> 'id' is null then
    raise exception 'order id is required';
  end if;

  insert into public.orders
    (id, number, customer, items, totals, status,
     "shippingMethod", tracking, notes, timeline, "createdAt", "updatedAt")
  values (
    p_order ->> 'id',
    p_order ->> 'number',
    v_cust,
    p_order -> 'items',
    v_totals,
    coalesce(p_order ->> 'status', 'new'),
    p_order ->> 'shippingMethod',
    p_order ->> 'tracking',
    p_order ->> 'notes',
    coalesce(p_order -> 'timeline', '[]'::jsonb),
    coalesce(p_order ->> 'createdAt', public.iso_now()),
    public.iso_now()
  )
  on conflict (id) do nothing;

  -- Customer profile (upsert + increment)
  v_cust_id := lower(regexp_replace(coalesce(v_cust ->> 'email', ''), '[^a-z0-9]', '_', 'g'));
  if v_cust_id <> '' then
    insert into public.customers
      (id, email, name, "marketingConsent", wishlist, totals, "firstSeen", "lastSeen")
    values (
      v_cust_id,
      v_cust ->> 'email',
      v_cust ->> 'name',
      true,
      '[]'::jsonb,
      jsonb_build_object('orders', 1,
                         'spend', coalesce((v_totals ->> 'total')::numeric, 0)),
      public.iso_now(),
      public.iso_now()
    )
    on conflict (id) do update set
      name = excluded.name,
      totals = jsonb_build_object(
        'orders', coalesce((public.customers.totals ->> 'orders')::integer, 0) + 1,
        'spend',  coalesce((public.customers.totals ->> 'spend')::numeric, 0)
                  + coalesce((v_totals ->> 'total')::numeric, 0)),
      "lastSeen" = excluded."lastSeen";
  end if;

  -- Stock decrement
  for v_item in select * from jsonb_array_elements(coalesce(p_order -> 'items', '[]'::jsonb))
  loop
    v_qty := coalesce((v_item ->> 'quantity')::integer, 0);

    update public.products p
    set stock = s.v_new_stock,
        variants = (
          select coalesce(jsonb_agg(
                   case when v ->> 'size' = v_item ->> 'size'
                        then jsonb_set(v, '{stock}',
                              to_jsonb(greatest(0, coalesce((v ->> 'stock')::integer, 0) - v_qty)))
                        else v end), '[]'::jsonb)
          from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) as v
        ),
        status = case when s.v_new_stock = 0 and p.status = 'live'
                      then 'sold_out' else p.status end,
        "updatedAt" = public.iso_now()
    from (select greatest(0, coalesce(p.stock, 0) - v_qty) as v_new_stock) s
    where p.id = v_item ->> 'productId';
  end loop;

  insert into public.auditLog (id, who, action, target, "at", details)
  values (
    'audit-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6),
    'storefront_checkout', 'order_placed', p_order ->> 'id', public.iso_now(),
    jsonb_build_object(
      'customer',  v_cust ->> 'name',
      'email',     v_cust ->> 'email',
      'total',     v_totals ->> 'total',
      'itemCount', coalesce(jsonb_array_length(p_order -> 'items'), 0))
  );

  return jsonb_build_object('id', p_order ->> 'id', 'success', true);
end;
$$;
grant execute on function public.place_order(jsonb) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Community suggestion RPCs — server-enforced fields, no status/vote forgery
-- ---------------------------------------------------------------------------
create or replace function public.submit_suggestion(p_suggestion jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id text;
begin
  if coalesce(p_suggestion ->> 'title', '') = '' then
    raise exception 'title is required';
  end if;

  v_id := 'sug-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);

  insert into public.suggestions
    (id, title, category, "desiredFabric", description,
     "submittedBy", "submitterEmail", votes, "votedUserIds", status, "createdAt")
  values (
    v_id,
    left(p_suggestion ->> 'title', 300),
    left(p_suggestion ->> 'category', 120),
    left(p_suggestion ->> 'desiredFabric', 300),
    left(p_suggestion ->> 'description', 5000),
    left(p_suggestion ->> 'submittedBy', 120),
    left(p_suggestion ->> 'submitterEmail', 254),
    1,                -- votes always start at 1
    '[]'::jsonb,
    'under_review',   -- status is never caller-controlled
    public.iso_now()
  );

  insert into public.auditLog (id, who, action, target, "at", details)
  values ('audit-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6),
          'client', 'suggest_garment', v_id, public.iso_now(),
          jsonb_build_object('title', left(p_suggestion ->> 'title', 300),
                             'category', left(p_suggestion ->> 'category', 120)));

  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;
grant execute on function public.submit_suggestion(jsonb) to anon, authenticated, service_role;

-- One vote per voter, enforced atomically (the old read-then-write both raced
-- and incremented votes even for repeat voters).
create or replace function public.vote_for_suggestion(p_id text, p_voter text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  if coalesce(p_voter, '') = '' then
    return jsonb_build_object('success', false, 'error', 'missing voter id');
  end if;

  update public.suggestions s
  set votes = coalesce(s.votes, 0) + 1,
      "votedUserIds" = coalesce(s."votedUserIds", '[]'::jsonb) || to_jsonb(p_voter),
      "updatedAt" = public.iso_now()
  where s.id = p_id
    and not coalesce(s."votedUserIds", '[]'::jsonb) @> to_jsonb(p_voter);

  get diagnostics v_count = row_count;

  return jsonb_build_object('success', true, 'changed', v_count > 0);
end;
$$;
grant execute on function public.vote_for_suggestion(text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  ------------------------------------------------------------------
  -- Public catalogue: readable by everyone, writable by admins only
  ------------------------------------------------------------------
  foreach t in array array['products','categories','collections','content',
                           'settings','discounts','suggestions']
  loop
    execute format('drop policy if exists read_all on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy read_all on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.can_write())', t);
  end loop;

  ------------------------------------------------------------------
  -- Admin-only tables: invisible to anonymous callers entirely
  ------------------------------------------------------------------
  foreach t in array array['admins','orders','customers','waitlist','events',
                           'auditLog','inventoryLog','insights','dailyStats',
                           'targetPlans','metricActuals','coachTasks',
                           'dailyCoachBriefs','reverseFunnelCalculations']
  loop
    execute format('drop policy if exists admin_read on public.%I', t);
    execute format('drop policy if exists admin_insert on public.%I', t);
    execute format('drop policy if exists admin_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy admin_read on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check (public.can_write())', t);
    execute format('create policy admin_update on public.%I for update to authenticated using (public.can_write()) with check (public.can_write())', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.can_write())', t);
  end loop;

  -- public.admins: only the OWNER may grant or revoke administrative roles.
  -- Without this an `editor` could write their own row as `owner`.
  execute format('drop policy if exists admin_insert on public.admins');
  execute format('drop policy if exists admin_update on public.admins');
  execute format('drop policy if exists admin_delete on public.admins');
  execute format('create policy admin_insert on public.admins for insert to authenticated with check (public.is_owner())');
  execute format('create policy admin_update on public.admins for update to authenticated using (public.is_owner()) with check (public.is_owner())');
  execute format('create policy admin_delete on public.admins for delete to authenticated using (public.is_owner())');

  ------------------------------------------------------------------
  -- Public actions available to signed-out visitors
  ------------------------------------------------------------------

  -- Waitlist signup (Footer / HomeSections) — email + drop id only.
  execute format('drop policy if exists public_insert on public.waitlist');
  execute format('create policy public_insert on public.waitlist for insert to anon, authenticated with check (true)');

  -- Community proposals: created only through submit_suggestion(), which
  -- forces status='under_review' and votes=1. Direct inserts are rejected.
  execute format('drop policy if exists public_submit on public.suggestions');
  execute format('create policy public_submit on public.suggestions for insert to anon, authenticated with check (false)');

  -- Consent-gated analytics: append-only, never publicly readable.
  execute format('drop policy if exists public_insert on public.events');
  execute format('create policy public_insert on public.events for insert to anon, authenticated with check (true)');

  -- Audit trail: append-only from the storefront, admin-readable, and only
  -- owners/editors may append while authenticated (keeps non-admin accounts
  -- from flooding it).
  execute format('drop policy if exists public_insert on public.auditLog');
  execute format('create policy public_insert on public.auditLog for insert to anon with check (true)');
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
--
-- RLS only filters rows; the GRANT decides which operations exist at all.
-- `anon` loses every write except the public actions above.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.products, public.categories, public.collections,
                public.content, public.settings, public.discounts,
                public.suggestions to anon;
grant insert on public.waitlist, public.events, public.auditLog to anon;

-- authenticated gets the full surface; RLS then decides by role.
grant select on all tables in schema public to authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- Lock down tables created after this migration too.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
