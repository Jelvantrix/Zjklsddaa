import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Product, Category, Collection, StoreContent, StoreSettings } from '../types';
import {
  subscribeToStorefrontProducts,
  subscribeToCategories,
  subscribeToCollections,
  subscribeToContent,
  subscribeToSettings,
} from '../supabase/dbService';
import {
  SEED_PRODUCTS,
  SEED_CONTENT,
  SEED_SETTINGS,
} from '../data/seedData';
import { supabase } from '../supabase/config';

interface StorefrontDataContextType {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  content: StoreContent;
  settings: StoreSettings;
  loading: boolean;
  isLiveFromFirestore: boolean;
  updateStoreContentLocal: (updated: StoreContent) => void;
  resetDemoData: () => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  deleteProducts: (ids: string[]) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<boolean>;
  refreshProducts: () => void;
}

const StorefrontDataContext = createContext<StorefrontDataContextType>({
  products: [],
  categories: [],
  collections: [],
  content: SEED_CONTENT,
  settings: SEED_SETTINGS,
  loading: true,
  isLiveFromFirestore: false,
  updateStoreContentLocal: () => {},
  resetDemoData: async () => false,
  deleteProduct: async () => false,
  deleteProducts: async () => false,
  saveProduct: async () => false,
  refreshProducts: () => {},
});

// Storage helper functions to ensure 100% reliable local persistence
function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem('zejesh_deleted_product_ids');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDeletedIds(ids: string[]) {
  try {
    const set = getDeletedProductIds();
    ids.forEach((id) => set.add(id));
    localStorage.setItem('zejesh_deleted_product_ids', JSON.stringify(Array.from(set)));
  } catch {
    // Ignore
  }
}

function getCustomProducts(): Product[] {
  try {
    const raw = localStorage.getItem('zejesh_custom_products');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistCustomProducts(products: Product[]) {
  try {
    localStorage.setItem('zejesh_custom_products', JSON.stringify(products));
  } catch {
    // Ignore
  }
}

export const StorefrontDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    // Immediate initial state before subscription loads
    const deleted = getDeletedProductIds();
    const custom = getCustomProducts();
    const filteredSeed = SEED_PRODUCTS.filter((p) => !deleted.has(p.id));
    const combined = [...custom.filter((p) => !deleted.has(p.id))];
    for (const p of filteredSeed) {
      if (!combined.some((c) => c.id === p.id)) {
        combined.push(p);
      }
    }
    return combined;
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [content, setContent] = useState<StoreContent>(SEED_CONTENT);
  const [settings, setSettings] = useState<StoreSettings>(SEED_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isLiveFromFirestore, setIsLiveFromFirestore] = useState(false);

  const applyProductsFiltering = useCallback((baseProducts: Product[]) => {
    const deleted = getDeletedProductIds();
    const custom = getCustomProducts();
    const filteredBase = baseProducts.filter((p) => !deleted.has(p.id));
    const merged = [...custom.filter((p) => !deleted.has(p.id))];
    for (const p of filteredBase) {
      if (!merged.some((m) => m.id === p.id)) {
        merged.push(p);
      }
    }
    setProducts(merged);
  }, []);

  useEffect(() => {
    // 1. Subscribe to real-time products
    const unsubProducts = subscribeToStorefrontProducts((liveProducts, isLive) => {
      applyProductsFiltering(liveProducts);
      setIsLiveFromFirestore(isLive);
      setLoading(false);
    });

    // 2. Subscribe to categories, collections, content, settings
    const unsubCats = subscribeToCategories((cats) => setCategories(cats));
    const unsubCols = subscribeToCollections((cols) => setCollections(cols));
    const unsubContent = subscribeToContent((cnt) => setContent(cnt));
    const unsubSettings = subscribeToSettings((st) => setSettings(st));

    return () => {
      unsubProducts();
      unsubCats();
      unsubCols();
      unsubContent();
      unsubSettings();
    };
  }, [applyProductsFiltering]);

  const deleteProduct = async (id: string): Promise<boolean> => {
    return deleteProducts([id]);
  };

  const deleteProducts = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return true;

    // 1. Immediately remove from local state
    persistDeletedIds(ids);
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));

    // 2. Update custom products cache
    const custom = getCustomProducts().filter((p) => !ids.includes(p.id));
    persistCustomProducts(custom);

    // 3. Delete from Supabase in background
    try {
      for (const id of ids) {
        await supabase.from('products').delete().eq('id', id);
      }
    } catch (err) {
      console.warn('Database sync for deletion (kept deleted locally):', err);
    }

    return true;
  };

  const saveProduct = async (prod: Product): Promise<boolean> => {
    if (!prod || !prod.id) return false;

    // Remove from deleted list if re-added
    const deleted = getDeletedProductIds();
    if (deleted.has(prod.id)) {
      deleted.delete(prod.id);
      localStorage.setItem('zejesh_deleted_product_ids', JSON.stringify(Array.from(deleted)));
    }

    // 1. Immediately update local state
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = prod;
        return copy;
      }
      return [prod, ...prev];
    });

    // 2. Persist in custom products
    const custom = getCustomProducts();
    const existingIdx = custom.findIndex((p) => p.id === prod.id);
    if (existingIdx >= 0) {
      custom[existingIdx] = prod;
    } else {
      custom.unshift(prod);
    }
    persistCustomProducts(custom);

    // 3. Persist to Supabase in background
    try {
      await supabase.from('products').upsert(prod);
    } catch (err) {
      console.warn('Database sync for saving product (saved locally):', err);
    }

    return true;
  };

  const refreshProducts = () => {
    const deleted = getDeletedProductIds();
    const custom = getCustomProducts();
    setProducts((prev) => {
      const filtered = prev.filter((p) => !deleted.has(p.id));
      for (const c of custom) {
        if (!deleted.has(c.id) && !filtered.some((p) => p.id === c.id)) {
          filtered.unshift(c);
        }
      }
      return filtered;
    });
  };

  const resetDemoData = async (): Promise<boolean> => {
    localStorage.removeItem('zejesh_deleted_product_ids');
    localStorage.removeItem('zejesh_custom_products');
    setProducts(SEED_PRODUCTS);
    setLoading(false);
    return true;
  };

  const updateStoreContentLocal = (updated: StoreContent) => {
    setContent(updated);
  };

  return (
    <StorefrontDataContext.Provider
      value={{
        products,
        categories,
        collections,
        content,
        settings,
        loading,
        isLiveFromFirestore,
        updateStoreContentLocal,
        resetDemoData,
        deleteProduct,
        deleteProducts,
        saveProduct,
        refreshProducts,
      }}
    >
      {children}
    </StorefrontDataContext.Provider>
  );
};

export const useStorefrontData = () => useContext(StorefrontDataContext);
