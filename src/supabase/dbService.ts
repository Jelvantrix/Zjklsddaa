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

export const EMPTY_STORE_CONTENT: StoreContent = {
  id: 'default',
  sectionOrder: ['hero', 'featured', 'categories', 'story', 'journal'],
  heroMedia: {
    desktopSrc: '',
    desktopPoster: '',
    mobileSrc: '',
    mobilePoster: '',
  },
  heroSlides: [],
  announcementBar: {
    en: '',
    fi: '',
    sv: '',
  },
  journalPosts: [],
  translations: {},
  updatedAt: '',
};

export const EMPTY_STORE_SETTINGS: StoreSettings = {
  id: 'default',
  storeInfo: {
    name: '',
    email: '',
    phone: '',
    address: '',
    currency: 'EUR',
  },
  shippingRates: [],
  freeShippingThreshold: 0,
  vatRate: 24,
  consentText: {
    en: '',
    fi: '',
    sv: '',
  },
  lowStockThreshold: 5,
  updatedAt: '',
};

/**
 * Audit Log recorder using standard crypto UUIDs (no Math.random)
 */
export async function logAuditEvent(
  who: string,
  action: string,
  target: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
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
    console.warn('Audit log write error:', err);
  }
}

/**
 * Real-time listener for Storefront Products.
 * Returns only genuine database products. Never returns fake or seeded items.
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

          const { data, error } = await supabase.from('products').select('*');

          if (error || !data) {
            onProducts([], false);
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

          items.sort((a, b) =>
            (a.nr || a.plateNumber || '').localeCompare(b.nr || b.plateNumber || '', undefined, { numeric: true })
          );

          onProducts(items, true);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && isSubscribed) {
          onProducts([], false);
        }
      });

    // Initial fetch
    (async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (!isSubscribed) return;
      if (!error && data) {
        const liveItems: Product[] = [];
        const now = Date.now();
        data.forEach((d: any) => {
          if (d.status === 'live') {
            liveItems.push({ ...d, plateNumber: d.nr || d.plateNumber });
          } else if (d.status === 'scheduled' && d.publishAt) {
            const pubTime = typeof d.publishAt === 'number' ? d.publishAt : new Date(d.publishAt).getTime();
            if (pubTime <= now) {
              liveItems.push({ ...d, plateNumber: d.nr || d.plateNumber });
            }
          }
        });
        liveItems.sort((a, b) =>
          (a.nr || a.plateNumber || '').localeCompare(b.nr || b.plateNumber || '', undefined, { numeric: true })
        );
        onProducts(liveItems, true);
      } else {
        onProducts([], false);
      }
    })();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('subscribeToStorefrontProducts exception:', err);
    onProducts([], false);
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
          if (error || !data) {
            onProducts([]);
            return;
          }
          const items: Product[] = data.map((d: any) => ({ ...d }));
          items.sort((a, b) => (a.nr || '').localeCompare(b.nr || '', undefined, { numeric: true }));
          onProducts(items);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error || !data) {
        onProducts([]);
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
    onProducts([]);
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
          if (error || !data) {
            onCategories([]);
            return;
          }
          const items = data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
          onCategories(items as Category[]);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error || !data) {
        onCategories([]);
        return;
      }
      const items = data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      onCategories(items as Category[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onCategories([]);
    return () => {};
  }
}

/**
 * Real-time listener for Collections
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
          if (error || !data) {
            onCollections([]);
            return;
          }
          onCollections(data as Collection[]);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('collections').select('*');
      if (error || !data) {
        onCollections([]);
        return;
      }
      onCollections(data as Collection[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onCollections([]);
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
          const { data, error } = await supabase.from('content').select('*').limit(1).maybeSingle();
          if (error || !data) {
            onContent(EMPTY_STORE_CONTENT);
            return;
          }
          onContent(data as StoreContent);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('content').select('*').limit(1).maybeSingle();
      if (error || !data) {
        onContent(EMPTY_STORE_CONTENT);
        return;
      }
      onContent(data as StoreContent);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onContent(EMPTY_STORE_CONTENT);
    return () => {};
  }
}

/**
 * Real-time listener for Store Settings
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
          const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
          if (error || !data) {
            onSettings(EMPTY_STORE_SETTINGS);
            return;
          }
          onSettings(data as StoreSettings);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error || !data) {
        onSettings(EMPTY_STORE_SETTINGS);
        return;
      }
      onSettings(data as StoreSettings);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onSettings(EMPTY_STORE_SETTINGS);
    return () => {};
  }
}

/**
 * Real-time listener for Discounts
 */
export function subscribeToDiscounts(
  onDiscounts: (discounts: Discount[]) => void
): () => void {
  try {
    const channel = supabase
      .channel('discounts-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discounts',
        },
        async () => {
          const { data, error } = await supabase.from('discounts').select('*');
          if (error || !data) {
            onDiscounts([]);
            return;
          }
          onDiscounts(data as Discount[]);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('discounts').select('*');
      if (error || !data) {
        onDiscounts([]);
        return;
      }
      onDiscounts(data as Discount[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onDiscounts([]);
    return () => {};
  }
}

/**
 * Real-time listener for Community Suggestions
 */
export function subscribeToSuggestions(
  onSuggestions: (suggestions: CommunitySuggestion[]) => void
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
          const { data, error } = await supabase
            .from('suggestions')
            .select('*')
            .order('votes', { ascending: false });
          if (error || !data) {
            onSuggestions([]);
            return;
          }
          onSuggestions(data as CommunitySuggestion[]);
        }
      )
      .subscribe();

    (async () => {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('votes', { ascending: false });
      if (error || !data) {
        onSuggestions([]);
        return;
      }
      onSuggestions(data as CommunitySuggestion[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onSuggestions([]);
    return () => {};
  }
}

/**
 * Real-time listener for Orders (Admin)
 */
export function subscribeToOrders(onOrders: (orders: Order[]) => void): () => void {
  try {
    const channel = supabase
      .channel('orders-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { data, error } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
        if (error || !data) {
          onOrders([]);
          return;
        }
        onOrders(data as Order[]);
      })
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('orders').select('*').order('createdAt', { ascending: false });
      if (error || !data) {
        onOrders([]);
        return;
      }
      onOrders(data as Order[]);
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
 * Real-time listener for Customers (Admin)
 */
export function subscribeToCustomers(onCustomers: (customers: Customer[]) => void): () => void {
  try {
    const channel = supabase
      .channel('customers-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, async () => {
        const { data, error } = await supabase.from('customers').select('*');
        if (error || !data) {
          onCustomers([]);
          return;
        }
        onCustomers(data as Customer[]);
      })
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error || !data) {
        onCustomers([]);
        return;
      }
      onCustomers(data as Customer[]);
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
 * Real-time listener for Waitlist (Admin)
 */
export function subscribeToWaitlist(onWaitlist: (waitlist: WaitlistEntry[]) => void): () => void {
  try {
    const channel = supabase
      .channel('waitlist-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, async () => {
        const { data, error } = await supabase.from('waitlist').select('*').order('createdAt', { ascending: false });
        if (error || !data) {
          onWaitlist([]);
          return;
        }
        onWaitlist(data as WaitlistEntry[]);
      })
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('waitlist').select('*').order('createdAt', { ascending: false });
      if (error || !data) {
        onWaitlist([]);
        return;
      }
      onWaitlist(data as WaitlistEntry[]);
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
 * Real-time listener for Daily Stats (Admin)
 */
export function subscribeToDailyStats(onStats: (stats: DailyStat[]) => void): () => void {
  try {
    const channel = supabase
      .channel('stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dailyStats' }, async () => {
        const { data, error } = await supabase.from('dailyStats').select('*').order('date', { ascending: true });
        if (error || !data) {
          onStats([]);
          return;
        }
        onStats(data as DailyStat[]);
      })
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('dailyStats').select('*').order('date', { ascending: true });
      if (error || !data) {
        onStats([]);
        return;
      }
      onStats(data as DailyStat[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onStats([]);
    return () => {};
  }
}

/**
 * Real-time listener for AI Insights (Admin)
 */
export function subscribeToInsights(onInsights: (insights: AiInsight[]) => void): () => void {
  try {
    const channel = supabase
      .channel('insights-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights' }, async () => {
        const { data, error } = await supabase.from('insights').select('*').order('createdAt', { ascending: false });
        if (error || !data) {
          onInsights([]);
          return;
        }
        onInsights(data as AiInsight[]);
      })
      .subscribe();

    (async () => {
      const { data, error } = await supabase.from('insights').select('*').order('createdAt', { ascending: false });
      if (error || !data) {
        onInsights([]);
        return;
      }
      onInsights(data as AiInsight[]);
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    onInsights([]);
    return () => {};
  }
}

/**
 * Save product (create or update)
 */
export async function saveProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').upsert(product);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Delete product
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Save content document
 */
export async function saveContent(content: StoreContent): Promise<void> {
  const { error } = await supabase.from('content').upsert({
    ...content,
    id: content.id || 'default',
    updatedAt: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Save settings document
 */
export async function saveSettings(settings: StoreSettings): Promise<void> {
  const { error } = await supabase.from('settings').upsert({
    ...settings,
    id: settings.id || 'default',
    updatedAt: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetch a single product by ID from Supabase
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as Product;
  } catch {
    return null;
  }
}
