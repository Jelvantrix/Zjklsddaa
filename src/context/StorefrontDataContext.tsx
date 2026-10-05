import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, Category, Collection, StoreContent, StoreSettings } from '../types';
import {
  subscribeToStorefrontProducts,
  subscribeToCategories,
  subscribeToCollections,
  subscribeToContent,
  subscribeToSettings,
  seedDatabase,
} from '../supabase/dbService';
import {
  SEED_CONTENT,
  SEED_SETTINGS,
} from '../data/seedData';

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
});

export const StorefrontDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [content, setContent] = useState<StoreContent>(SEED_CONTENT);
  const [settings, setSettings] = useState<StoreSettings>(SEED_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isLiveFromFirestore, setIsLiveFromFirestore] = useState(false);

  useEffect(() => {
    // 1. Subscribe to real-time products (no automatic seeding)
    const unsubProducts = subscribeToStorefrontProducts((liveProducts, isLive) => {
      setProducts(liveProducts);
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
  }, []);

  const resetDemoData = async (): Promise<boolean> => {
    // No longer auto-seeds data - admin must manually add products
    setLoading(false);
    return false;
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
      }}
    >
      {children}
    </StorefrontDataContext.Provider>
  );
};

export const useStorefrontData = () => useContext(StorefrontDataContext);
