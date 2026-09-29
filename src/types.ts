export type Language = 'fi' | 'en' | 'sv';

export interface Product {
  id: string;
  plateNumber: string; // e.g. "Nº 001"
  name: {
    fi: string;
    en: string;
    sv: string;
  };
  price: number; // in Euros
  category: 'naiset' | 'miehet' | 'asusteet' | 'kokoelmat';
  subcategory: string;
  collectionSeason?: 'talvi' | 'kevat' | 'kesa' | 'syksy' | 'perusvaatteet';
  material: {
    fi: string;
    en: string;
    sv: string;
  };
  origin: {
    fi: string;
    en: string;
    sv: string;
  };
  description: {
    fi: string;
    en: string;
    sv: string;
  };
  care: {
    fi: string;
    en: string;
    sv: string;
  };
  sizes: string[];
  stock: number;
  isLimited: boolean;
  colorName: {
    fi: string;
    en: string;
    sv: string;
  };
  colorHex: string;
  cropVariation: {
    packshot: {
      position: string;
      scale: number;
      aspectRatio: '3/4' | '4/5' | '1/1' | '16/9';
      flipped?: boolean;
    };
    onModel: {
      position: string;
      scale: number;
      aspectRatio: '3/4' | '4/5' | '1/1' | '16/9';
      flipped?: boolean;
    };
    detail1: {
      position: string;
      scale: number;
    };
    detail2: {
      position: string;
      scale: number;
    };
    detail3: {
      position: string;
      scale: number;
    };
    detail4: {
      position: string;
      scale: number;
    };
  };
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

export interface JournalArticle {
  id: string;
  slug: string;
  date: string;
  title: {
    fi: string;
    en: string;
    sv: string;
  };
  subtitle: {
    fi: string;
    en: string;
    sv: string;
  };
  body: {
    fi: string[];
    en: string[];
    sv: string[];
  };
  readTime: string;
  cropPosition: string;
}

export type PageRoute =
  | { type: 'home' }
  | { type: 'archive'; category?: string; subcategory?: string }
  | { type: 'product'; productId: string }
  | { type: 'journal'; articleSlug?: string }
  | { type: 'lookbook' }
  | { type: 'about'; slug: 'philosophy' | 'materials' | 'sustainability' | 'workshops' }
  | { type: 'service'; slug: 'contact' | 'shipping-returns' | 'tracking' | 'size-guide' }
  | { type: 'legal'; slug: 'terms' | 'privacy' | 'cookies' }
  | { type: 'gift-cards' }
  | { type: 'cart' }
  | { type: 'checkout' }
  | { type: 'wishlist' }
  | { type: 'account' }
  | { type: 'sitemap' };
