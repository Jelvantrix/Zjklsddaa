import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Product, Category, Collection, StoreContent, StoreSettings } from '../types';
import {
  subscribeToStorefrontProducts,
  subscribeToCategories,
  subscribeToCollections,
  subscribeToContent,
  subscribeToSettings,
  saveProduct as dbSaveProduct,
  deleteProduct as dbDeleteProduct,
  EMPTY_STORE_CONTENT,
  EMPTY_STORE_SETTINGS,
} from '../supabase/dbService';
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
  deleteProduct: (id: string) => Promise<boolean>;
  deleteProducts: (ids: string[]) => Promise<boolean>;
  saveProduct: (product: Product) => Promise<boolean>;
  refreshProducts: () => void;
}

const StorefrontDataContext = createContext<StorefrontDataContextType>({
  products: [],
  categories: [],
  collections: [],
  content: EMPTY_STORE_CONTENT,
  settings: EMPTY_STORE_SETTINGS,
  loading: true,
  isLiveFromFirestore: false,
  updateStoreContentLocal: () => {},
  deleteProduct: async () => false,
  deleteProducts: async () => false,
  saveProduct: async () => false,
  refreshProducts: () => {},
});

export const StorefrontDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [content, setContent] = useState<StoreContent>(EMPTY_STORE_CONTENT);
  const [settings, setSettings] = useState<StoreSettings>(EMPTY_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isLiveFromFirestore, setIsLiveFromFirestore] = useState(false);

  useEffect(() => {
    // 1. Subscribe to real-time products
    const unsubProducts = subscribeToStorefrontProducts((liveProducts, isLive) => {
      setProducts(liveProducts || []);
      setIsLiveFromFirestore(isLive);
      setLoading(false);
    });

    // 2. Subscribe to categories, collections, content, settings
    const unsubCats = subscribeToCategories((cats) => setCategories(cats || []));
    const unsubCols = subscribeToCollections((cols) => setCollections(cols || []));
    const unsubContent = subscribeToContent((cnt) => setContent(cnt || EMPTY_STORE_CONTENT));
    const unsubSettings = subscribeToSettings((st) => setSettings(st || EMPTY_STORE_SETTINGS));

    return () => {
      unsubProducts();
      unsubCats();
      unsubCols();
      unsubContent();
      unsubSettings();
    };
  }, []);

  const deleteProduct = async (id: string): Promise<boolean> => {
    return deleteProducts([id]);
  };

  const deleteProducts = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return true;

    // Immediately update local state
    setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));

    try {
      for (const id of ids) {
        await dbDeleteProduct(id);
      }
      return true;
    } catch (err) {
      console.error('Error deleting product from database:', err);
      return false;
    }
  };

  const saveProduct = async (prod: Product): Promise<boolean> => {
    if (!prod || !prod.id) return false;

    // Immediately update local state
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = prod;
        return copy;
      }
      return [prod, ...prev];
    });

    try {
      await dbSaveProduct(prod);
      return true;
    } catch (err) {
      console.error('Error saving product to database:', err);
      return false;
    }
  };

  const refreshProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*');
      if (data) {
        const liveItems = data
          .filter((d: any) => d.status === 'live')
          .map((d: any) => ({ ...d, plateNumber: d.nr || d.plateNumber }));
        setProducts(liveItems);
      }
    } catch (err) {
      console.warn('Refresh products error:', err);
    }
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
