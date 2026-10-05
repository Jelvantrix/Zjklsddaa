import { createClient, SupabaseClient } from '@supabase/supabase-js';

// import.meta.env only exists when Vite builds the file for the browser.
// Under plain Node (tsx) it is undefined, so fall back to an empty object.
const metaEnv: Record<string, any> = (import.meta as any).env ?? {};

// Node-side fallback so `server.ts` (run via tsx) can read .env directly.
// Guarded with typeof because `process` does not exist in the browser.
const nodeEnv: Record<string, any> =
  (typeof process !== 'undefined' && (process as any).env) || {};

const runningInBrowser = typeof window !== 'undefined';

const supabaseUrl: string =
  metaEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || 'https://your-project.supabase.co';

const supabaseAnonKey: string =
  metaEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

/**
 * Server-only privilege key.
 *
 * Deliberately NOT prefixed with `VITE_`: Vite only inlines `VITE_*` variables
 * into the browser bundle, so this value can never reach the client. The guard
 * below fails loudly if a browser context ever sees it, rather than silently
 * shipping a key that bypasses row level security.
 */
const serviceRoleKey: string = nodeEnv.SUPABASE_SERVICE_ROLE_KEY || '';

if (runningInBrowser && serviceRoleKey) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY must never be available in the browser. ' +
      'Remove any VITE_-prefixed copy of it from your environment.'
  );
}

/** True when this process holds the RLS-bypassing service key (server only). */
export const isServiceClient: boolean = Boolean(serviceRoleKey) && !runningInBrowser;

/**
 * The client used across the app.
 *
 * - Browser: always the anon key, so every query is subject to row level
 *   security and a forged client session gains nothing.
 * - server.ts: the service role key, because the API verifies the caller's
 *   Supabase JWT in middleware before touching data.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
  auth: {
    persistSession: runningInBrowser,
    autoRefreshToken: runningInBrowser,
    detectSessionInUrl: runningInBrowser,
    storageKey: 'zejesh-auth',
  },
});

/**
 * Validate connection to Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.warn('Supabase: connection test failed:', error);
    return false;
  }
}

/**
 * Ensure an anonymous or authenticated user session exists
 */
export async function ensureAuthSession(): Promise<any> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session ? session.user : null;
  } catch (err) {
    console.warn('Auth session check failed:', err);
    return null;
  }
}
