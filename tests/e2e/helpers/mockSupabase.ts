import type { Page, Route } from '@playwright/test';

/**
 * In-memory Supabase double used by every e2e spec.
 *
 * It intercepts the REST, Storage and Auth endpoints so the suite runs with a
 * completely EMPTY database — the exact "zero seeded data" condition the
 * project requires — and can flip individual tables to simulate a real row.
 *
 * Nothing here ever fabricates storefront content: the default for every table
 * is an empty array.
 */

export type TableRows = Record<string, unknown[]>;

/** 1x1 transparent PNG, used to satisfy image requests without real files. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export interface MockOptions {
  /** Rows per table. Every table not listed answers with []. */
  tables?: TableRows;
  /** Make the next N storage uploads fail (upload failure + retry tests). */
  storageFailures?: number;
  /** Make every storage upload fail. */
  storageAlwaysFails?: boolean;
}

export interface MockHandle {
  /** Uploads attempted (successful + failed). */
  uploads: string[];
  /** Rows that were written through /rest/v1/. */
  writes: Array<{ table: string; method: string; body: unknown }>;
  storageFailuresLeft: () => number;
  setTable: (table: string, rows: unknown[]) => void;
}

const isSingleObjectRequest = (route: Route) => {
  const accept = route.request().headers()['accept'] || '';
  return accept.includes('vnd.pgrst.object+json');
};

export async function mockSupabase(page: Page, options: MockOptions = {}): Promise<MockHandle> {
  const tables: TableRows = { ...(options.tables || {}) };
  const uploads: string[] = [];
  const writes: MockHandle['writes'] = [];
  let failuresLeft = options.storageFailures || 0;

  const handle: MockHandle = {
    uploads,
    writes,
    storageFailuresLeft: () => failuresLeft,
    setTable: (table, rows) => {
      tables[table] = rows;
    },
  };

  await page.route('**/*.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    // ---------------------------------------------------------------- auth --
    if (path.includes('/auth/v1/')) {
      const user = {
        id: '00000000-0000-4000-8000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'huxaifa0fficial@gmail.com',
        email_confirmed_at: '2026-01-01T00:00:00.000Z',
        phone: '',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        identities: [],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'e2e-refresh-token',
          user,
        }),
      });
    }

    // ------------------------------------------------------------- storage --
    if (path.includes('/storage/v1/')) {
      if (method === 'POST' && !path.includes('/object/public/')) {
        uploads.push(path);
        if (options.storageAlwaysFails || failuresLeft > 0) {
          if (failuresLeft > 0) failuresLeft -= 1;
          return route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal Storage error (simulated network failure)' }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: path.split('/storage/v1/object/')[1] || 'media/file', Id: 'obj-1' }),
        });
      }

      if (method === 'DELETE') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"message":"ok"}' });
      }

      // Public object reads (storefront <img>/<video> src).
      return route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG });
    }

    // --------------------------------------------------------------- rest --
    if (path.includes('/rest/v1/')) {
      const rest = path.split('/rest/v1/')[1] || '';
      const table = rest.split('?')[0].split('/')[0].split(':')[0];

      if (method === 'GET') {
        if (url.searchParams.get('select') === 'count') {
          return route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
            body: '',
          });
        }
        if (isSingleObjectRequest(route)) {
          const rows = tables[table] || [];
          if (rows.length === 1) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(rows[0]),
            });
          }
          return route.fulfill({
            status: 406,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'PGRST116',
              message: 'JSON object requested, multiple (or no) rows returned',
              details: `The result contains ${rows.length} rows`,
              hint: null,
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(tables[table] || []),
        });
      }

      if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
        let body: unknown = null;
        try {
          body = request.postDataJSON();
        } catch {
          body = null;
        }
        writes.push({ table, method, body });
        const isInsertReturning =
          method === 'POST' && (url.searchParams.get('resolution') === 'merge-duplicates' || true);
        if (method === 'POST') {
          const payload = Array.isArray(body) ? body : [body];
          return route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(isInsertReturning ? payload : payload),
          });
        }
        return route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: '',
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  return handle;
}

/**
 * Accepts the Supabase realtime websocket without ever forwarding
 * postgres_changes events, so the app behaves as if realtime is connected but
 * silent.
 *
 * A hard block (204/abort) makes the channel raise CHANNEL_ERROR, whose
 * handler calls `onProducts([], false)` and races the initial products fetch —
 * sometimes wiping already-loaded rows with an empty array. Accepting the
 * socket keeps the channel open (no CHANNEL_ERROR) so the initial fetch result
 * stands and the suite is deterministic.
 */
export async function blockRealtime(page: Page) {
  await page.routeWebSocket(/\/realtime\/v1\//, (ws) => {
    // Swallow every client message (phx_join, heartbeat) and never send
    // server events back: the channel stays open, no realtime updates arrive.
    ws.onMessage(() => {});
  });
}
