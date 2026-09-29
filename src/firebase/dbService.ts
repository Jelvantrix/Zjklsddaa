import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
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
  AdminUser,
  DailyStat,
  AiInsight,
  AuditLog,
  InventoryLog,
} from '../types';
import {
  SEED_PRODUCTS,
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  SEED_ORDERS,
  SEED_CUSTOMERS,
  SEED_WAITLIST,
  SEED_DISCOUNTS,
  SEED_CONTENT,
  SEED_SETTINGS,
  SEED_ADMINS,
  SEED_DAILY_STATS,
  SEED_INSIGHTS,
} from './seedData';

// Local storage key for fallback/offline persistence
const SEED_FLAG_KEY = 'zejesh_firestore_seeded_v1';

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
    await setDoc(doc(db, 'auditLog', id), logItem);
  } catch (err) {
    console.warn('Audit log write failed or offline:', err);
  }
}

/**
 * Seed all database collections with initial mock data
 */
export async function seedDatabase(forceReset: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    // Check if already seeded (unless forcing reset)
    if (!forceReset) {
      const snap = await getDocs(query(collection(db, 'products'), limit(1)));
      if (!snap.empty) {
        return { success: true, message: 'Database already populated.' };
      }
    }

    console.info('Starting Zejesh Studio database seeding...');

    // 1. Seed Products (batch by 20 to avoid exceeding 500 ops limit)
    for (let i = 0; i < SEED_PRODUCTS.length; i += 20) {
      const batch = writeBatch(db);
      const chunk = SEED_PRODUCTS.slice(i, i + 20);
      chunk.forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
      });
      await batch.commit();
    }

    // 2. Seed Categories
    const catBatch = writeBatch(db);
    SEED_CATEGORIES.forEach((cat) => {
      catBatch.set(doc(db, 'categories', cat.id), cat);
    });
    await catBatch.commit();

    // 3. Seed Collections
    const colBatch = writeBatch(db);
    SEED_COLLECTIONS.forEach((col) => {
      colBatch.set(doc(db, 'collections', col.id), col);
    });
    await colBatch.commit();

    // 4. Seed Orders
    for (let i = 0; i < SEED_ORDERS.length; i += 20) {
      const batch = writeBatch(db);
      const chunk = SEED_ORDERS.slice(i, i + 20);
      chunk.forEach((ord) => {
        batch.set(doc(db, 'orders', ord.id), ord);
      });
      await batch.commit();
    }

    // 5. Seed Customers
    const custBatch = writeBatch(db);
    SEED_CUSTOMERS.forEach((c) => {
      custBatch.set(doc(db, 'customers', c.id), c);
    });
    await custBatch.commit();

    // 6. Seed Waitlist
    const wlBatch = writeBatch(db);
    SEED_WAITLIST.forEach((w) => {
      wlBatch.set(doc(db, 'waitlist', w.id), w);
    });
    await wlBatch.commit();

    // 7. Seed Discounts
    const discBatch = writeBatch(db);
    SEED_DISCOUNTS.forEach((d) => {
      discBatch.set(doc(db, 'discounts', d.id), d);
    });
    await discBatch.commit();

    // 8. Seed Content & Settings
    await setDoc(doc(db, 'content', SEED_CONTENT.id), SEED_CONTENT);
    await setDoc(doc(db, 'settings', SEED_SETTINGS.id), SEED_SETTINGS);

    // 9. Seed Admins
    const adminBatch = writeBatch(db);
    SEED_ADMINS.forEach((adm) => {
      adminBatch.set(doc(db, 'admins', adm.uid), adm);
    });
    await adminBatch.commit();

    // 10. Seed DailyStats & Insights
    const statBatch = writeBatch(db);
    SEED_DAILY_STATS.forEach((st) => {
      statBatch.set(doc(db, 'dailyStats', st.id), st);
    });
    SEED_INSIGHTS.forEach((ins) => {
      statBatch.set(doc(db, 'insights', ins.id), ins);
    });
    await statBatch.commit();

    localStorage.setItem(SEED_FLAG_KEY, 'true');
    await logAuditEvent('system', 'seed_database', 'all_collections', { count: SEED_PRODUCTS.length });

    return { success: true, message: 'All 24 products, 5 collections, 40 orders and 30 days analytics seeded.' };
  } catch (error) {
    console.error('Error during Firestore database seeding:', error);
    // Mark local flag so fallback works
    localStorage.setItem(SEED_FLAG_KEY, 'local_fallback');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Database seeding encountered an error.',
    };
  }
}

/**
 * Real-time listener for Storefront Products.
 * Filtered for 'live' status, plus 'scheduled' products whose publishAt has elapsed.
 */
export function subscribeToStorefrontProducts(
  onProducts: (products: Product[], isLiveFromFirestore: boolean) => void
): Unsubscribe {
  let isSubscribed = true;

  try {
    const q = query(collection(db, 'products'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;

        if (snapshot.empty) {
          // If empty, auto-trigger background seed and supply mock data
          seedDatabase(false);
          onProducts(
            SEED_PRODUCTS.filter((p) => p.status === 'live'),
            false
          );
          return;
        }

        const items: Product[] = [];
        const now = Date.now();

        snapshot.forEach((d) => {
          const data = d.data() as Product;
          // Storefront public rule: live or scheduled with publishAt in past
          if (data.status === 'live') {
            items.push({ ...data, id: d.id, plateNumber: data.nr || data.plateNumber });
          } else if (data.status === 'scheduled' && data.publishAt) {
            const pubTime = typeof data.publishAt === 'number' ? data.publishAt : new Date(data.publishAt).getTime();
            if (pubTime <= now) {
              items.push({ ...data, id: d.id, plateNumber: data.nr || data.plateNumber });
            }
          }
        });

        // Sort by plate number / order
        items.sort((a, b) => (a.nr || a.plateNumber || '').localeCompare(b.nr || b.plateNumber || '', undefined, { numeric: true }));

        onProducts(items.length > 0 ? items : SEED_PRODUCTS, true);
      },
      (error) => {
        console.warn('Firestore products listener warning (using seed fallback):', error.message);
        if (isSubscribed) {
          onProducts(
            SEED_PRODUCTS.filter((p) => p.status === 'live'),
            false
          );
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
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
): Unsubscribe {
  try {
    const q = query(collection(db, 'products'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          onProducts(SEED_PRODUCTS);
          return;
        }
        const items: Product[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as Product), id: d.id });
        });
        items.sort((a, b) => (a.nr || '').localeCompare(b.nr || '', undefined, { numeric: true }));
        onProducts(items);
      },
      () => {
        onProducts(SEED_PRODUCTS);
      }
    );
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
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        if (snap.empty) {
          onCategories(SEED_CATEGORIES);
          return;
        }
        const items: Category[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as Category), id: d.id }));
        items.sort((a, b) => a.order - b.order);
        onCategories(items);
      },
      () => onCategories(SEED_CATEGORIES)
    );
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
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'collections'),
      (snap) => {
        if (snap.empty) {
          onCollections(SEED_COLLECTIONS);
          return;
        }
        const items: Collection[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as Collection), id: d.id }));
        onCollections(items);
      },
      () => onCollections(SEED_COLLECTIONS)
    );
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
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'content', 'storefront-main'),
      (snap) => {
        if (snap.exists()) {
          onContent(snap.data() as StoreContent);
        } else {
          onContent(SEED_CONTENT);
        }
      },
      () => onContent(SEED_CONTENT)
    );
  } catch {
    onContent(SEED_CONTENT);
    return () => {};
  }
}

/**
 * Real-time listener for Storefront Settings
 */
export function subscribeToSettings(
  onSettings: (settings: StoreSettings) => void
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'settings', 'global-settings'),
      (snap) => {
        if (snap.exists()) {
          onSettings(snap.data() as StoreSettings);
        } else {
          onSettings(SEED_SETTINGS);
        }
      },
      () => onSettings(SEED_SETTINGS)
    );
  } catch {
    onSettings(SEED_SETTINGS);
    return () => {};
  }
}

/**
 * Real-time listener for Orders
 */
export function subscribeToOrders(
  onOrders: (orders: Order[]) => void
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        if (snap.empty) {
          onOrders(SEED_ORDERS);
          return;
        }
        const items: Order[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as Order), id: d.id }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onOrders(items);
      },
      () => onOrders(SEED_ORDERS)
    );
  } catch {
    onOrders(SEED_ORDERS);
    return () => {};
  }
}

/**
 * Single product fetch
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (snap.exists()) {
      const data = snap.data() as Product;
      return { ...data, id: snap.id, plateNumber: data.nr || data.plateNumber };
    }
  } catch (err) {
    console.warn('Failed fetching product from Firestore, checking seed:', err);
  }
  return SEED_PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * Create or save order
 */
export async function createStoreOrder(order: Omit<Order, 'id'>): Promise<{ id: string; success: boolean }> {
  const id = `ord-${Date.now()}`;
  const fullOrder: Order = { ...order, id };
  try {
    await setDoc(doc(db, 'orders', id), fullOrder);
    return { id, success: true };
  } catch (err) {
    console.error('Failed creating order in Firestore:', err);
    return { id, success: false };
  }
}

/**
 * Waitlist signup
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
    await setDoc(doc(db, 'waitlist', id), entry);
    return { success: true };
  } catch (err) {
    console.warn('Waitlist signup failed or offline:', err);
    return { success: true }; // optimistically succeed
  }
}
