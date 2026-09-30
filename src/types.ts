export type Language = 'fi' | 'en' | 'sv';

export type ProductStatus = 'draft' | 'scheduled' | 'live' | 'sold_out' | 'archived';

export interface ProductVariant {
  size: string;
  sku: string;
  stock: number;
}

export interface ProductImage {
  url: string;
  alt?: {
    fi: string;
    en: string;
    sv?: string;
  };
  focalX?: number; // 0 - 100 %
  focalY?: number; // 0 - 100 %
  order: number;
  isPrimary?: boolean;
  isHover?: boolean;
}

export interface Product {
  id: string;
  nr?: string; // e.g. "Nº 001"
  plateNumber: string; // "Nº 001"
  name: {
    fi: string;
    en: string;
    sv: string;
  };
  description: {
    fi: string;
    en: string;
    sv: string;
  };
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
  care: {
    fi: string;
    en: string;
    sv: string;
  };
  price: number; // in Euros
  compareAtPrice?: number;
  vatRate?: number; // default 24
  categoryIds?: string[];
  collectionIds?: string[];
  category: 'naiset' | 'miehet' | 'asusteet' | 'kokoelmat';
  subcategory: string;
  collectionSeason?: 'talvi' | 'kevat' | 'kesa' | 'syksy' | 'perusvaatteet';
  variants?: ProductVariant[];
  sizes: string[];
  stock: number;
  isLimited: boolean;
  limitedEdition?: {
    isLimited: boolean;
    editionSize?: number;
    soldCount?: number;
  };
  images?: ProductImage[];
  image?: string;
  hoverImage?: string;
  status?: ProductStatus;
  publishAt?: string | number; // ISO string or timestamp
  seo?: {
    title?: string;
    description?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  attentionScore?: number; // calculated from tracking in M4
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

export interface Category {
  id: string;
  parentId?: string | null;
  name: {
    fi: string;
    en: string;
    sv?: string;
  };
  slug: string;
  image?: string;
  order: number;
  visible: boolean;
}

export interface Collection {
  id: string;
  name: {
    fi: string;
    en: string;
  } | string;
  slug: string;
  type: 'season' | 'drop' | 'essentials';
  startAt?: string;
  endAt?: string;
  editionSize?: number;
  status: 'draft' | 'scheduled' | 'live' | 'completed' | 'archived';
  cover?: string;
  productIds?: string[];
}

export type OrderStatus = 'new' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  productId: string;
  productNr: string;
  productName: string;
  size: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  number: string; // e.g. "ZE-2026-0042"
  customer: {
    id?: string;
    email: string;
    name: string;
    phone?: string;
    address?: {
      street: string;
      postalCode: string;
      city: string;
      country: string;
    };
  };
  items: OrderItem[];
  totals: {
    subtotal: number;
    shipping: number;
    vat: number;
    discount: number;
    total: number;
  };
  status: OrderStatus;
  shippingMethod: string;
  tracking?: string;
  notes?: string;
  timeline: Array<{
    at: string;
    status: OrderStatus | string;
    note?: string;
    by?: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  marketingConsent: boolean;
  wishlist: string[];
  totals: {
    orders: number;
    spend: number;
  };
  firstSeen: string;
  lastSeen: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  dropId: string;
  createdAt: string;
  invited?: boolean;
}

export interface Discount {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'freeShipping';
  value: number;
  minSpend: number;
  usageLimit: number;
  used: number;
  startAt?: string;
  endAt?: string;
  active: boolean;
}

export interface StoreContent {
  id: string;
  sectionOrder: string[];
  heroMedia: {
    desktopSrc: string;
    desktopPoster: string;
    mobileSrc: string;
    mobilePoster: string;
  };
  announcementBar: {
    fi: string;
    en: string;
    sv?: string;
  };
  journalPosts: JournalArticle[];
  translations?: Record<string, any>;
}

export interface StoreSettings {
  id: string;
  storeInfo: {
    name: string;
    email: string;
    address: string;
    currency: string;
  };
  shippingRates: Array<{
    id: string;
    method: string;
    name: { fi: string; en: string };
    price: number;
    eta: string;
    freeOver?: number;
  }>;
  freeShippingThreshold: number;
  vatRate: number; // 24
  consentText: {
    fi: string;
    en: string;
  };
  lowStockThreshold: number;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productNr?: string;
  size: string;
  delta: number;
  reason: string;
  by: string;
  at: string;
}

export interface AuditLog {
  id: string;
  who: string;
  action: string;
  target: string;
  at: string;
  details?: Record<string, any>;
}

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
}

export type TrackingEventType =
  | 'page_view'
  | 'scroll_depth'
  | 'click'
  | 'hover_dwell'
  | 'product_view'
  | 'product_dwell'
  | 'image_interaction'
  | 'hero_video'
  | 'search'
  | 'filter_use'
  | 'density_toggle'
  | 'look_product_toggle'
  | 'quicklook_open'
  | 'size_select'
  | 'add_to_bag'
  | 'remove_from_bag'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'cart_open'
  | 'checkout_step'
  | 'purchase'
  | 'waitlist_signup'
  | 'language_switch'
  | 'outbound_click'
  | 'error';

export interface TrackingEvent {
  id?: string;
  type: TrackingEventType | string;
  timestamp: number;
  sessionId: string;
  visitorId: string;
  page: string;
  deviceClass: 'desktop' | 'tablet' | 'mobile';
  viewport: string | { width: number; height: number };
  language: string;
  referrer?: string;
  utm?: Record<string, string>;
  payload?: Record<string, any>;
  data?: Record<string, any>;
}

export interface DailyStat {
  id: string;
  date: string; // YYYY-MM-DD
  visitors: number;
  sessions: number;
  revenue: number;
  orders: number;
  pageViews: number;
  addToBags: number;
  conversionRate?: number;
  topProducts?: Array<{
    id: string;
    nr: string;
    name: string;
    views: number;
    sales: number;
  }>;
}

export interface AiInsight {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'merchandising' | 'pricing' | 'inventory' | 'content' | 'marketing' | 'ux' | 'drop_strategy';
  evidence: string;
  recommendation: string;
  expectedImpact: string;
  effort: string;
  suggestedAction: {
    type: string;
    targetId?: string;
    deepLink?: string;
  };
  status: 'new' | 'in_progress' | 'done' | 'dismissed';
  createdAt: string;
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
  tag?: string;
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
  | { type: 'sitemap' }
  | { type: 'admin'; subview?: string };
