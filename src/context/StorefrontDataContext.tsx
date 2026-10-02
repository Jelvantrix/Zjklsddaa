import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, Category, Collection, StoreContent, StoreSettings } from '../types';
import {
  subscribeToStorefrontProducts,
  subscribeToCategories,
  subscribeToCollections,
  subscribeToContent,
  subscribeToSettings,
  seedDatabase,
} from '../firebase/dbService';
import {
  SEED_PRODUCTS,
  SEED_CATEGORIES,
  SEED_COLLECTIONS,
  SEED_CONTENT,
  SEED_SETTINGS,
} from '../firebase/seedData';

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
  products: SEED_PRODUCTS.filter((p) => p.status === 'live'),
  categories: SEED_CATEGORIES,
  collections: SEED_COLLECTIONS,
  content: SEED_CONTENT,
  settings: SEED_SETTINGS,
  loading: true,
  isLiveFromFirestore: false,
  updateStoreContentLocal: () => {},
  resetDemoData: async () => false,
});

export const StorefrontDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [collections, setCollections] = useState<Collection[]>(SEED_COLLECTIONS);
  const [content, setContent] = useState<StoreContent>(SEED_CONTENT);
  const [settings, setSettings] = useState<StoreSettings>(SEED_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isLiveFromFirestore, setIsLiveFromFirestore] = useState(false);

  useEffect(() => {
    // 1. Initial background seed check
    seedDatabase(false).catch(() => {});

    // 2. Subscribe to real-time products
    const unsubProducts = subscribeToStorefrontProducts((liveProducts, isLive) => {
      setProducts(liveProducts);
      setIsLiveFromFirestore(isLive);
      setLoading(false);
    });

    // 3. Subscribe to categories, collections, content, settings
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
    setLoading(true);
    const res = await seedDatabase(true);
    setLoading(false);
    return res.success;
  };

  const updateStoreContentLocal = (updated: StoreContent) => {
    setContent(updated);
  };

  return (
    <StorefrontDataContext.Provider
      value={{
        products: products.length > 0 ? products : SEED_PRODUCTS.filter((p) => p.status === 'live'),
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
