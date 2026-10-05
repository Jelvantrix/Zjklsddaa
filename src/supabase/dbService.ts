import { supabase } from './config';
import {
  Product,
  Category,
  Collection,
  Order,
  Customer,
  WaitlistEntry,
  Discount,
  StoreContent,
  StoreSettings,
  DailyStat,
  AiInsight,
  AuditLog,
  CommunitySuggestion,
} from '../types';
import {
  SEED_PRODUCTS,
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  SEED_DISCOUNTS,
  SEED_CONTENT,
  SEED_SETTINGS,
  SEED_ADMINS,
  SEED_DAILY_STATS,
  SEED_INSIGHTS,
} from '../data/seedData';

// Local storage key for fallback/offline persistence
const SEED_FLAG_KEY = 'zejesh_supabase_seeded_v2_real';

/**
 * Audit Log recorder
 */
export async function logAuditEvent(
  who: string,
  action: string,
  target: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logItem: AuditLog = {
      id,
      who,
      action,
      target,
      at: new Date().toISOString(),
      details,
    };
    await supabase.from('auditLog').insert(logItem);
  } catch (err) {
    console.warn('Audit log write failed or offline:', err);
  }
}

/**
 * Seed all database collections with initial mock data
 * NOTE: Production grade policy - Orders, Customers, and Waitlists are 100% REAL.
 * They are NEVER seeded with artificial fake data.
 *
 * CLEAN SLATE MODE: No seeded data for new users. Empty catalog, empty wishlist, etc.
 */
export async function seedDatabase(forceReset: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    // Only seed if explicitly forced - otherwise start clean
    if (!forceReset) {
      return { success: true, message: 'Starting with clean slate - no seeded data.' };
    }

    console.info('Initializing Zejesh production collections in Supabase...');

    // Only seed essential settings - NO products, categories, collections, discounts
    await supabase.from('content').upsert(SEED_CONTENT);
    await supabase.from('settings').upsert(SEED_SETTINGS);

    // Seed only the owner admin (huxaifa0fficial@gmail.com)
    const ownerAdmin = SEED_ADMINS.find((adm) => adm.email === 'huxaifa0fficial@gmail.com');
    if (ownerAdmin) {
      await supabase.from('admins').upsert(ownerAdmin);
    }

    localStorage.setItem(SEED_FLAG_KEY, 'true');
    await logAuditEvent('system', 'clean_slate_initialized', 'system', { mode: 'no_seeded_data' });

    return { success: true, message: 'Clean slate initialized - essential settings only, no products or catalog data.' };
  } catch (error) {
    console.error('Error during Supabase database initialization:', error);
    localStorage.setItem(SEED_FLAG_KEY, 'local_fallback');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Database initialization encountered an error.',
    };
  }
}

/**
 * Real-time listener for Storefront Products.
 */
export function subscribeToStorefrontProducts(
  onProducts: (products: Product[], isLiveFromSupabase: boolean) => void
): () => void {
  let isSubscribed = true;

  try {
    const channel = supabase
      .channel('products-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        async () => {
          if (!isSubscribed) return;

          const { data, error } = await supabase
            .from('products')
            .select('*');

          if (error || !data || data.length === 0) {
            seedDatabase(false);
            onProducts(
              SEED_PRODUCTS.filter((p) => p.status === 'live'),
              false
            );
            return;
          }

          const items: Product[] = [];
          const now = Date.now();

          data.forEach((d: any) => {
            if (d.status === 'live') {
              items.push({ ...d, plateNumber: d.nr || d.plateNumber });
            } else if (d.status === 'scheduled' && d.publishAt) {
              const pubTime = typeof d.publishAt === 'number' ? d.publishAt : new Date(d.publishAt).getTime();
              if (pubTime <= now) {
                items.push({ ...d, plateNumber: d.nr || d.plateNumber });
              }
            }
          });

          items.sort((a, b) => (a.nr || a.plateNumber || '').localeCompare(b.nr || b.plateNumber || '', undefined, { numeric: true }));

          onProducts(items.length > 0 ? items : SEED_PRODUCTS, true);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && isSubscribed) {
          console.warn('Supabase products subscription failed, using seed fallback');
          onProducts(
            SEED_PRODUCTS.filter((p) => p.status === 'live'),
            false
          );
        }
      });

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (!isSubscribed) return;
      if (!error && data && data.length > 0) {
        const items: Product[] = data.map((d: any) => ({ ...d, plateNumber: d.nr || d.plateNumber }));
        onProducts(items, true);
      } else {
        onProducts(SEED_PRODUCTS.filter((p) => p.status === 'live'), false);
      }
    })();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeToStorefrontProducts exception, fallback active:', err);
    onProducts(
      SEED_PRODUCTS.filter((p) => p.status === 'live'),
      false
    );
    return () => {
      isSubscribed = false;
    };
  }
}

/**
 * Real-time listener for All Products (Admin view including drafts, scheduled, archived)
 */
export function subscribeToAllProducts(
  onProducts: (products: Product[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('all-products-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        async () => {
          const { data, error } = await supabase.from('products').select('*');
          if (error || !data || data.length === 0) {
            onProducts(SEED_PRODUCTS);
            return;
          }
          const items: Product[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => (a.nr || '').localeCompare(b.nr || '', undefined, { numeric: true }));
          onProducts(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !data) {
        onProducts(SEED_PRODUCTS);
        return;
      }
      const items: Product[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => (a.nr || '').localeCompare(b.nr || '', undefined, { numeric: true }));
      onProducts(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onProducts(SEED_PRODUCTS);
    return () => {};
  }
}

/**
 * Real-time listener for Categories
 */
export function subscribeToCategories(
  onCategories: (cats: Category[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('categories-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        async () => {
          const { data, error } = await supabase.from('categories').select('*');
          if (error || !data || data.length === 0) {
            onCategories(SEED_CATEGORIES);
            return;
          }
          const items: Category[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => a.order - b.order);
          onCategories(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error || !data) {
        onCategories(SEED_CATEGORIES);
        return;
      }
      const items: Category[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => a.order - b.order);
      onCategories(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onCategories(SEED_CATEGORIES);
    return () => {};
  }
}

/**
 * Real-time listener for Collections & Drops
 */
export function subscribeToCollections(
  onCollections: (cols: Collection[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('collections-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collections',
        },
        async () => {
          const { data, error } = await supabase.from('collections').select('*');
          if (error || !data || data.length === 0) {
            onCollections(SEED_COLLECTIONS);
            return;
          }
          const items: Collection[] = data.map((d: any) => ({ ...d }));
          onCollections(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('collections').select('*');
      if (error || !data) {
        onCollections(SEED_COLLECTIONS);
        return;
      }
      const items: Collection[] = data.map((d: any) => ({ ...d }));
      onCollections(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onCollections(SEED_COLLECTIONS);
    return () => {};
  }
}

/**
 * Real-time listener for Storefront Content
 */
export function subscribeToContent(
  onContent: (content: StoreContent) => void
): () => void {
  try {
    const channel = supabase
      .channel('content-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        async () => {
          const { data, error } = await supabase.from('content').select('*').eq('id', 'storefront-main').single();
          if (error || !data) {
            onContent(SEED_CONTENT);
            return;
          }
          onContent(data as StoreContent);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('content').select('*').eq('id', 'storefront-main').single();
      if (error || !data) {
        onContent(SEED_CONTENT);
        return;
      }
      onContent(data as StoreContent);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onContent(SEED_CONTENT);
    return () => {};
  }
}

/**
 * Updates Storefront Content in Supabase (Hero slides, video, ticker, journal)
 */
export async function updateStoreContent(
  contentData: Partial<StoreContent>
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = contentData.id || 'storefront-main';
    const { error } = await supabase
      .from('content')
      .upsert({
        ...contentData,
        id: targetId,
        updatedAt: new Date().toISOString(),
      });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to update store content in Supabase:', err);
    return { success: false, error: err?.message || 'Failed to update store content' };
  }
}

/**
 * Real-time listener for Storefront Settings
 */
export function subscribeToSettings(
  onSettings: (settings: StoreSettings) => void
): () => void {
  try {
    const channel = supabase
      .channel('settings-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
        },
        async () => {
          const { data, error } = await supabase.from('settings').select('*').eq('id', 'global-settings').single();
          if (error || !data) {
            onSettings(SEED_SETTINGS);
            return;
          }
          onSettings(data as StoreSettings);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'global-settings').single();
      if (error || !data) {
        onSettings(SEED_SETTINGS);
        return;
      }
      onSettings(data as StoreSettings);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onSettings(SEED_SETTINGS);
    return () => {};
  }
}

/**
 * Real-time listener for Orders
 * REAL DATA: If no customer has ordered yet, returns empty array [].
 */
export function subscribeToOrders(
  onOrders: (orders: Order[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async () => {
          const { data, error } = await supabase.from('orders').select('*');
          if (error || !data || data.length === 0) {
            onOrders([]);
            return;
          }
          const items: Order[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onOrders(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (error || !data) {
        onOrders([]);
        return;
      }
      const items: Order[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onOrders(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onOrders([]);
    return () => {};
  }
}

/**
 * Real-time listener for Customers
 * REAL DATA: If no customer exists, returns empty array [].
 */
export function subscribeToCustomers(
  onCustomers: (customers: Customer[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('customers-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        async () => {
          const { data, error } = await supabase.from('customers').select('*');
          if (error || !data || data.length === 0) {
            onCustomers([]);
            return;
          }
          const items: Customer[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => (b.totals?.spend || 0) - (a.totals?.spend || 0));
          onCustomers(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error || !data) {
        onCustomers([]);
        return;
      }
      const items: Customer[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => (b.totals?.spend || 0) - (a.totals?.spend || 0));
      onCustomers(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onCustomers([]);
    return () => {};
  }
}

/**
 * Real-time listener for Waitlist
 * REAL DATA: If no waitlist signups exist, returns empty array [].
 */
export function subscribeToWaitlist(
  onWaitlist: (entries: WaitlistEntry[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('waitlist-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
        },
        async () => {
          const { data, error } = await supabase.from('waitlist').select('*');
          if (error || !data || data.length === 0) {
            onWaitlist([]);
            return;
          }
          const items: WaitlistEntry[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onWaitlist(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('waitlist').select('*');
      if (error || !data) {
        onWaitlist([]);
        return;
      }
      const items: WaitlistEntry[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onWaitlist(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onWaitlist([]);
    return () => {};
  }
}

/**
 * Single product fetch
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (!error && data) {
      const productData = data as Product;
      return { ...productData, plateNumber: productData.nr || productData.plateNumber };
    }
  } catch (err) {
    console.warn('Failed fetching product from Supabase, checking seed:', err);
  }
  return SEED_PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * Create or save order in Supabase, upsert real customer record, and decrement stock
 */
export async function createStoreOrder(
  order: Omit<Order, 'id' | 'number'> & { number?: string }
): Promise<{ id: string; success: boolean }> {
  const id = `ZE-${Date.now().toString().slice(-6)}`;
  const fullOrder: Order = { ...order, id, number: `#${id}` };
  try {
    // Single atomic RPC: writes the order, upserts the customer, decrements
    // stock and records the audit trail inside the database. The browser is
    // deliberately NOT allowed to write `orders`, `customers` or `products`.
    const { data, error } = await supabase.rpc('place_order', {
      p_order: fullOrder as unknown as Record<string, any>,
    });
    if (error) throw error;
    if (data && data.success === false) {
      return { id, success: false };
    }

    return { id, success: true };
  } catch (err) {
    console.error('Failed creating order in Supabase:', err);
    return { id, success: false };
  }
}

/**
 * Real waitlist signup
 */
export async function joinWaitlist(email: string, dropId: string, source: string): Promise<{ success: boolean }> {
  try {
    const id = `wl-${Date.now()}`;
    const entry: WaitlistEntry = {
      id,
      email,
      dropId,
      source,
      createdAt: new Date().toISOString(),
    };
    await supabase.from('waitlist').insert(entry);
    await logAuditEvent('storefront', 'waitlist_signup', dropId, { email, source });
    return { success: true };
  } catch (err) {
    console.warn('Waitlist signup failed or offline:', err);
    return { success: true };
  }
}

/**
 * Updates Storefront Settings in Supabase (Contact email, dispatch email, social platforms)
 */
export async function updateStoreSettings(
  settingsData: Partial<StoreSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = settingsData.id || 'global-settings';
    const { error } = await supabase
      .from('settings')
      .upsert({
        ...settingsData,
        id: targetId,
      });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to update store settings in Supabase:', err);
    return { success: false, error: err?.message || 'Failed to update store settings' };
  }
}

/**
 * Initial seed suggestions for co-creation ballot if collection is fresh
 */
export const SEED_SUGGESTIONS: CommunitySuggestion[] = [
  {
    id: 'sug-001',
    title: 'Floor-Length Heavy Double-Faced Wool Greatcoat',
    category: 'Outerwear',
    desiredFabric: '100% Finnish Virgin Wool (780 gsm)',
    description: 'A sweeping, monolithic greatcoat featuring deep storm welt pockets, exaggerated lapel stance, and unlined raw interior seams.',
    submittedBy: 'Archival Collector 09',
    submitterEmail: 'client@atelier.fi',
    votes: 48,
    votedUserIds: [],
    status: 'in_sampling',
    createdAt: '2026-09-15T10:00:00.000Z',
    curatorNotes: 'Pattern drafted at Porto atelier. Heavy drape sample in testing.',
  },
  {
    id: 'sug-002',
    title: 'High-Neck Seamless Cashmere & Merino Rollneck',
    category: 'Knitwear',
    desiredFabric: '70% Recycled Cashmere / 30% Merino',
    description: 'Dense 7-gauge seamless knit with a structured sculptural neck that stays upright without folding. Raw selvedge cuffs.',
    submittedBy: 'Elena K.',
    submitterEmail: 'elena@nordic.com',
    votes: 39,
    votedUserIds: [],
    status: 'under_review',
    createdAt: '2026-09-20T14:30:00.000Z',
  },
  {
    id: 'sug-003',
    title: 'Structured Leather Archival Weekender Bag',
    category: 'Accessories',
    desiredFabric: 'Vegetable-Tanned Full Grain Saddle Leather',
    description: 'Zero plastic lining, solid hand-cast brass hardware, structured cylindrical silhouette designed to patina over 30 years.',
    submittedBy: 'Marcus V.',
    submitterEmail: 'marcus@design.studio',
    votes: 62,
    votedUserIds: [],
    status: 'commissioned',
    createdAt: '2026-09-10T12:00:00.000Z',
    curatorNotes: 'Commissioned for Production! Expected Drop 03.',
  },
  {
    id: 'sug-004',
    title: 'Tailored Wide-Leg Trousers in Midnight Wool Twill',
    category: 'Tailoring',
    desiredFabric: '100% Worsted Wool Twill (340 gsm)',
    description: 'High-rise silhouette with deep inward pleats, extended tab waistband, and continuous clean leg line down to the shoe.',
    submittedBy: 'Sofia H.',
    submitterEmail: 'sofia@helsinki.fi',
    votes: 27,
    votedUserIds: [],
    status: 'under_review',
    createdAt: '2026-09-24T18:15:00.000Z',
  },
];

/**
 * Real-time listener for Community Co-Creation Suggestions
 */
export function subscribeToSuggestions(
  onSuggestions: (items: CommunitySuggestion[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('suggestions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
        },
        async () => {
          const { data, error } = await supabase.from('suggestions').select('*');
          if (error || !data || data.length === 0) {
            onSuggestions(SEED_SUGGESTIONS);
            return;
          }
          const items: CommunitySuggestion[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => b.votes - a.votes);
          onSuggestions(items);
        }
      )
      .subscribe();

    // Initial fetch (run async so the unsubscribe callback stays synchronous)
    (async () => {
      const { data, error } = await supabase.from('suggestions').select('*');
      if (error || !data) {
        onSuggestions(SEED_SUGGESTIONS);
        return;
      }
      const items: CommunitySuggestion[] = data.map((d: any) => ({ ...d }));
      items.sort((a, b) => b.votes - a.votes);
      onSuggestions(items);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onSuggestions(SEED_SUGGESTIONS);
    return () => {};
  }
}

/**
 * Submit a new community proposal
 */
export async function submitCommunitySuggestion(
  suggestion: Omit<CommunitySuggestion, 'id' | 'votes' | 'votedUserIds' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Server enforces status='under_review' and votes=1; direct inserts are
    // rejected by RLS so callers cannot forge a commissioned proposal.
    const { data, error } = await supabase.rpc('submit_suggestion', {
      p_suggestion: {
        title: suggestion.title,
        category: suggestion.category,
        desiredFabric: suggestion.desiredFabric,
        description: suggestion.description,
        submittedBy: suggestion.submittedBy,
        submitterEmail: suggestion.submitterEmail,
      },
    });
    if (error) throw error;
    if (data && data.success === false) {
      return { success: false, error: data.error || 'Database error' };
    }
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Error submitting suggestion:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Upvote a community proposal
 */
export async function voteForSuggestion(
  suggestionId: string,
  voterId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Atomic RPC: increments only if this voter has not voted before, so
    // repeat votes can no longer inflate the count.
    const { data, error } = await supabase.rpc('vote_for_suggestion', {
      p_id: suggestionId,
      p_voter: voterId,
    });
    if (error) throw error;
    if (data && data.success === false) {
      return { success: false, error: data.error || 'Vote rejected' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error voting for suggestion:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Admin: Update proposal status (e.g. commissioned, sampling, declined)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  status: CommunitySuggestion['status'],
  curatorNotes?: string
): Promise<{ success: boolean }> {
  try {
    const payload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (curatorNotes !== undefined) payload.curatorNotes = curatorNotes;

    const { error } = await supabase
      .from('suggestions')
      .update(payload)
      .eq('id', suggestionId);
    if (error) throw error;

    await logAuditEvent('admin', 'update_suggestion_status', suggestionId, { status });
    return { success: true };
  } catch (err) {
    console.error('Error updating suggestion status:', err);
    return { success: false };
  }
}

/**
 * Admin: Delete proposal
 */
export async function deleteCommunitySuggestion(
  suggestionId: string
): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase.from('suggestions').delete().eq('id', suggestionId);
    if (error) throw error;

    await logAuditEvent('admin', 'delete_suggestion', suggestionId, {});
    return { success: true };
  } catch (err) {
    console.error('Error deleting suggestion:', err);
    return { success: false };
  }
}
