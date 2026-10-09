export type Language = 'fi' | 'en' | 'sv';

export type ProductStatus =
  | 'draft'
  | 'scheduled'
  | 'live'
  | 'sold_out'
  | 'coming_soon'
  | 'archived';

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
  scale?: number; // zoom e.g. 1.0 - 3.0
  rotation?: number; // angle in degrees -180 to 180
  position?: string; // e.g. '50% 20%'
  aspectRatio?: string;
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
  isComingSoon?: boolean;
  comingSoonMessage?: string;
  /** Shown on the storefront while `status === 'coming_soon'`. */
  comingSoonNotice?: string;
  limitedEdition?: {
    isLimited: boolean;
    editionSize?: number;
    soldCount?: number;
  };
  images?: ProductImage[];
  image?: string;
  hoverImage?: string;
  imagePosition?: string;
  hoverImagePosition?: string;
  imageScale?: number;
  imageRotation?: number;
  hoverImageRotation?: number;
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
  isComingSoon?: boolean;
  comingSoonNotice?: string;
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

export interface HeroSlide {
  id: string;
  type: 'video' | 'image';
  src: string;
  poster?: string;
  positionDesktop: string;
  positionMobile: string;
  scale?: number;
  rotation?: number;
  focalX?: number;
  focalY?: number;
  aspectRatio?: string;
  caption?: {
    fi: string;
    en: string;
    sv?: string;
  };
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
  heroSlides?: HeroSlide[];
  announcementBar: {
    fi: string;
    en: string;
    sv?: string;
  };
  journalPosts: JournalArticle[];
  translations?: Record<string, any>;
  updatedAt?: string;
}

export interface SocialPlatformLink {
  id: string;
  name: string; // e.g. "Instagram", "Pinterest", "TikTok", "X", "YouTube", "Spotify"
  url: string;
  handle?: string;
  enabled: boolean;
}

export interface StoreSettings {
  id: string;
  storeInfo: {
    name: string;
    email: string;
    dispatchEmail?: string;
    conciergeEmail?: string;
    address: string;
    currency: string;
    platforms?: SocialPlatformLink[];
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
  image?: string;
}

export interface CommunitySuggestion {
  id: string;
  title: string;
  category: string;
  desiredFabric: string;
  description: string;
  submittedBy?: string;
  submitterEmail?: string;
  votes: number;
  votedUserIds?: string[];
  status: 'under_review' | 'in_sampling' | 'commissioned' | 'declined';
  createdAt: string;
  updatedAt?: string;
  curatorNotes?: string;
}

export type PageRoute =
  | { type: 'home' }
  | { type: 'archive'; category?: string; subcategory?: string }
  | { type: 'product'; productId: string }
  | { type: 'journal'; articleSlug?: string }
  | { type: 'lookbook' }
  | { type: 'story' }
  | { type: 'vote' }
  | { type: 'about'; slug: 'philosophy' | 'materials' | 'sustainability' | 'workshops' }
  | { type: 'service'; slug: 'contact' | 'shipping-returns' | 'tracking' | 'size-guide' }
  | { type: 'legal'; slug: 'terms' | 'privacy' | 'cookies' }
  | { type: 'gift-cards' }
  | { type: 'cart' }
  | { type: 'checkout' }
  | { type: 'wishlist' }
  | { type: 'account' }
  | { type: 'auth'; mode?: 'signin' | 'signup' | 'forgot' }
  | { type: 'sitemap' }
  | { type: 'admin-login' }
  | { type: 'admin-console' }
  | { type: 'not-found' }
  | { type: 'admin'; subview?: string };

// ==================== TARGETS & GOALS SYSTEM ====================

export type GrowthCurve = 'geometric' | 'linear' | 's_curve' | 'step_ladder' | 'custom';

export type TargetPeriod = 'yearly' | 'monthly' | 'weekly' | 'daily';

export interface TargetMetric {
  metricId: string;
  name: string;
  target: number;
  actual: number;
  pace: number; // projected at current rate
  forecast: number; // predicted end-of-period
  unit: string;
}

export interface MonthlyTarget {
  month: number; // 1-12
  year: number;
  piecesTarget: number;
  ordersTarget: number;
  revenueTarget: number; // in minor units (cents)
  sessionsTarget: number;
  visitorsTarget: number;
  conversionRateTarget: number; // decimal, e.g., 0.015 for 1.5%
  aovTarget: number; // average order value in minor units
  newCustomersTarget: number;
  emailSubscribersTarget: number;
  productsListedTarget: number;
  contentPostsTarget: number;
  adSpendTarget: number; // in minor units
  roasTarget: number; // return on ad spend as multiplier
  // Computed fields
  piecesActual: number;
  ordersActual: number;
  revenueActual: number;
  sessionsActual: number;
  visitorsActual: number;
  conversionRateActual: number;
  aovActual: number;
  newCustomersActual: number;
  emailSubscribersActual: number;
  productsListedActual: number;
  contentPostsActual: number;
  adSpendActual: number;
  roasActual: number;
  pace: 'ahead' | 'on_track' | 'behind';
  gap: number; // pieces gap
  dailyAverageNeeded: number;
  isLocked: boolean; // T-012: lock past periods
}

export interface WeeklyTarget {
  week: number; // 1-52
  year: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  piecesTarget: number;
  piecesActual: number;
  pace: 'ahead' | 'on_track' | 'behind';
  gap: number;
}

export interface DailyTarget {
  date: string; // YYYY-MM-DD
  piecesTarget: number;
  piecesActual: number;
  sessionsTarget: number;
  sessionsActual: number;
  ordersTarget: number;
  ordersActual: number;
  revenueTarget: number; // minor units
  revenueActual: number; // minor units
  weekdayWeight: number; // 0.5-2.0 multiplier
  isHoliday: boolean;
  isDropDay: boolean;
  dropBoost?: number; // additional pieces target for drop days
  pace: 'ahead' | 'on_track' | 'behind';
}

export interface TargetPlan {
  id: string;
  name: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
  startPieces: number; // e.g., 13
  endDailyPieces: number; // e.g., 12.9 per day
  growthCurve: GrowthCurve;
  growthRate: number; // calculated monthly growth factor
  weekdayWeights: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
  };
  yearlyTarget: {
    pieces: number;
    orders: number;
    revenue: number; // minor units
    sessions: number;
    visitors: number;
  };
  monthlyTargets: MonthlyTarget[];
  weeklyTargets: WeeklyTarget[];
  dailyTargets: DailyTarget[];
  catalogTarget: {
    totalProductsByDate: string; // ISO date
    targetCount: number;
    currentCount: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number; // T-010: versioning
  changeHistory: Array<{
    version: number;
    changedAt: string;
    changedBy: string;
    reason: string;
    changes: Record<string, any>;
  }>;
}

export interface MetricActual {
  date: string; // YYYY-MM-DD
  piecesSold: number;
  orders: number;
  revenue: number; // minor units
  grossProfit: number; // minor units
  sessions: number;
  visitors: number;
  conversionRate: number;
  aov: number; // minor units
  unitsPerOrder: number;
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  emailSubscribers: number;
  waitlistSignups: number;
  contentPostsPublished: number;
  adSpend: number; // minor units
  roas: number;
  returns: number;
  refunds: number; // minor units
  stockSellThrough: number; // percentage
  productsListed: number;
  productsPhotographed: number;
  isDemo: boolean; // T-xxx: demo mode flag
}

// ==================== DAILY COACH SYSTEM ====================

export type TaskStatus = 'pending' | 'done' | 'skipped' | 'snoozed' | 'blocked';

export type TaskFamily =
  | 'catalog'
  | 'traffic'
  | 'conversion'
  | 'operations'
  | 'finance'
  | 'content'
  | 'marketing'
  | 'customer_service';

export interface CoachTask {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  family: TaskFamily;
  status: TaskStatus;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  expectedImpact: {
    pieces?: number;
    revenue?: number; // minor units
    description: string;
  };
  effortMinutes: number;
  deepLink?: {
    type: 'product' | 'order' | 'customer' | 'campaign' | 'settings' | 'analytics';
    targetId: string;
  };
  autoGenerated: boolean; // true if generated by rules engine
  completedAt?: string;
  skippedReason?: string;
  snoozedUntil?: string;
  blockedReason?: string;
  assignedTo?: string; // user ID
  position: number; // rank in daily list
  createdAt: string;
  updatedAt: string;
}

export interface DailyCoachBrief {
  date: string; // YYYY-MM-DD
  target: {
    pieces: number;
    orders: number;
    revenue: number; // minor units
  };
  actual: {
    pieces: number;
    orders: number;
    revenue: number; // minor units
  };
  pace: 'ahead' | 'on_track' | 'behind';
  gap: number; // pieces gap
  probabilityOfHitting: number; // 0-100 percentage
  tasks: CoachTask[];
  totalEffortMinutes: number;
  topPriorities: string[]; // task IDs
  riskPanel: Array<{
    type: 'stock_out' | 'late_shipment' | 'payment_failure' | 'site_error';
    severity: 'high' | 'medium' | 'low';
    message: string;
    targetId?: string;
  }>;
  opportunityPanel: Array<{
    type: 'trending_product' | 'rising_search' | 'returning_visitor';
    message: string;
    targetId?: string;
  }>;
  winsPanel: Array<{
    type: 'first_sale' | 'milestone' | 'streak';
    message: string;
  }>;
  dailyScore: number; // 0-100
  streak: number; // consecutive days meeting target
  carryOverCount: number;
  generatedAt: string;
}

// ==================== REVERSE FUNNEL ====================

export interface FunnelStep {
  stepName: string;
  rate: number; // conversion rate to next step
  benchmark: number; // industry or historical benchmark
  actual: number; // current actual rate
  gap: number; // actual - benchmark
}

export interface ReverseFunnelCalculation {
  targetPieces: number;
  unitsPerOrder: number;
  targetOrders: number;
  conversionRate: number;
  targetSessions: number;
  visitorsPerSession: number;
  targetVisitors: number;
  channelBreakdown: Array<{
    channel: string;
    share: number; // percentage of traffic
    requiredSessions: number;
    requiredVisitors: number;
  }>;
  funnelSteps: FunnelStep[];
  bottleneck: {
    stepName: string;
    gap: number;
    impact: number; // pieces lost due to this bottleneck
  };
  sensitivityAnalysis: Array<{
    metric: string;
    currentValue: number;
    improvedValue: number;
    sessionsSaved: number;
  }>;
  generatedAt: string;
}

// ==================== AI ADVISOR ====================

export interface AdvisorInsight extends AiInsight {
  metricImpact?: {
    metricId: string;
    beforeValue: number;
    expectedAfterValue: number;
  };
  learningFlag?: boolean; // track if this insight type historically moves numbers
  experimentSuggested?: {
    variantA: string;
    variantB: string;
    metric: string;
    duration: string;
  };
}

// ==================== MEDIA ASSETS & IMAGE FRAMING ====================

export const NEUTRAL_PLACEHOLDER_IMG = '/placeholder.svg';

export interface ImagePlacementCrop {
  focalX?: number; // 0 - 100
  focalY?: number; // 0 - 100
  zoom?: number; // 1.0 - 4.0
  rotation?: number; // -45 to 45 or 90-step
  flipH?: boolean;
  flipV?: boolean;
  aspectRatio?: string;
}

export interface ImageFramingParams {
  focalX: number; // 0 - 100 %
  focalY: number; // 0 - 100 %
  zoom: number; // 1.0 - 4.0
  rotation: number; // -45 to 45 or degrees
  flipH?: boolean;
  flipV?: boolean;
  aspectRatio?: string; // e.g. '3:4', '4:5', '1:1', '16:9', '9:16'
  overrides?: Record<string, Partial<ImagePlacementCrop>>;
}

export interface MediaAsset {
  id: string;
  path: string;
  url: string;
  kind: 'image' | 'video';
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  alt?: string;
  focalX?: number;
  focalY?: number;
  createdAt: string;
}

export function formatPrice(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '0,00 €';
  return amount.toFixed(2).replace('.', ',') + ' €';
}

export const SUB_CATEGORIES = {
  naiset: [
    { name: { en: 'Coats & Jackets', fi: 'Takit' }, slug: 'takit' },
    { name: { en: 'Knitwear', fi: 'Neuleet' }, slug: 'neuleet' },
    { name: { en: 'Tailoring & Trousers', fi: 'Housut' }, slug: 'housut' },
    { name: { en: 'Dresses & Skirts', fi: 'Mekot' }, slug: 'mekot' },
    { name: { en: 'Shirts & Tops', fi: 'Paidat' }, slug: 'paidat' },
  ],
  miehet: [
    { name: { en: 'Coats & Outerwear', fi: 'Takit' }, slug: 'takit' },
    { name: { en: 'Heavy Knitwear', fi: 'Neuleet' }, slug: 'neuleet' },
    { name: { en: 'Tailored Trousers', fi: 'Housut' }, slug: 'housut' },
    { name: { en: 'Overshirts', fi: 'Paidat' }, slug: 'paidat' },
  ],
  asusteet: [
    { name: { en: 'Leather Goods', fi: 'Nahkatuotteet' }, slug: 'nahkatuotteet' },
    { name: { en: 'Wool Scarves & Beanies', fi: 'Huivit ja päähineet' }, slug: 'huivit-paahineet' },
    { name: { en: 'Jewelry & Hardware', fi: 'Korut' }, slug: 'korut' },
  ],
  kokoelmat: [
    { name: { en: 'Archive Essentials', fi: 'Arkistoperusteet' }, slug: 'essentials' },
    { name: { en: 'Winter Solstice', fi: 'Talvi' }, slug: 'talvi' },
  ],
};

export const translations = {
  fi: {
    languageName: 'Suomi',
    translateBar: 'Käännä sivusto yhdellä klikkauksella:',
    sitemap: 'Sivukartta',
    announcement: 'ILMAINEN TOIMITUS YLI 100 € TILAUKSIIN · 14 PÄIVÄN PALAUTUSOIKEUS',
    nav: {
      new: 'Uutuudet',
      women: 'Naiset',
      men: 'Miehet',
      accessories: 'Asusteet',
      collections: 'Kokoelmat',
      search: 'Haku',
      wishlist: 'Suosikit',
      account: 'Kirjaudu',
      bag: 'Ostoskori',
      close: 'Sulje',
      viewAll: 'Näytä kaikki',
      archive: 'Arkisto',
      journal: 'Journal',
      lookbook: 'Lookbook',
    },
    latestDrop: {
      tag: 'UUSIN PUDOTUS',
      edition: 'Numeroitu sarja',
      title: 'Pohjoinen arkkitehtuuri',
      description: 'Veistoksellista raskaansarjan villaa.',
      link: 'Tutustu',
    },
    categoriesMosaic: {
      women: 'Naiset',
      men: 'Miehet',
      accessories: 'Asusteet',
      collections: 'Kokoelmat',
      subWomen: 'Puhdasta linjaa ja orgaanisia materiaaleja',
      subMen: 'Räätälöityä ryhtiä ja pohjoista funktiota',
      subAcc: 'Käsityönä viimeistellyt yksityiskohdat',
      subCol: 'Kausittaiset kokonaisuudet',
    },
    featured: {
      tag: 'VALITUT',
      title: 'Arkiston teokset',
      dragHint: 'Selaa',
      viewAll: 'Kaikki teokset',
    },
    cart: {
      title: 'Ostoskori',
      empty: 'Ostoskorisi on tyhjä',
      subtotal: 'Välisumma',
      shipping: 'Toimitus',
      shippingCalculated: 'Lasketaan kassalla',
      freeShippingEligible: 'Tilaus oikeuttaa ilmaiseen toimitukseen',
      freeShippingRemaining: (rem: number) => `Lisää ${formatPrice(rem)} ilmaiseen toimitukseen`,
      checkout: 'Siirry kassalle',
      continueShopping: 'Jatka selailua',
      remove: 'Poista',
    },
    product: {
      addToBag: 'Lisää ostoskoriin',
      soldOut: 'Loppuunmyyty',
      selectSize: 'Valitse koko',
      details: 'Yksityiskohdat',
      materials: 'Materiaalit',
      shippingReturns: 'Toimitus ja palautus',
      care: 'Hoito-ohjeet',
      craftsmanship: 'Valmistus',
      origin: 'Alkuperä',
      numberedPiece: 'Numeroitu arkistokappale',
    },
    pdp: {
      plate: 'Arkistolevy',
      vatIncluded: 'sis. ALV 24 %',
      selectSize: 'Valitse koko',
      sizeGuide: 'Koko-opas (cm)',
      addToCart: 'Lisää ostoskoriin',
      addedToCart: 'Lisätty ostoskoriin',
      outOfStock: 'Tilapäisesti loppu',
      descTitle: 'Kuvaus ja istuvuus',
      careTitle: 'Materiaali ja huolenpito',
      shippingTitle: 'Toimitus ja palautukset',
      shippingInfo: 'Ilmainen toimitus Postin, Matkahuollon ja Schenkerin noutopisteisiin yli 100 € tilauksiin. 14 päivän maksuton palautusoikeus.',
      completeLook: 'Täydennä asu',
      othersViewed: 'Muut katsoivat myös',
      zoomHint: 'Napsauta suurentaaksesi kuvan',
    },
    checkout: {
      title: 'Kassa',
      step1: '1. Toimitus',
      step2: '2. Maksu',
      step3: '3. Vahvistus',
      shippingMethods: 'Valitse toimitustapa',
      customerInfo: 'Asiakastiedot',
      email: 'Sähköposti',
      firstName: 'Etunimi',
      lastName: 'Sukunimi',
      street: 'Katuosoite',
      postalCode: 'Postinumero',
      city: 'Postitoimipaikka',
      phone: 'Puhelinnumero',
      proceedToPayment: 'Jatka maksutapaan',
      paymentMethods: 'Maksutavat',
      verkkopankki: 'Verkkopankit',
      mobilepay: 'MobilePay',
      klarna: 'Klarna',
      cards: 'Pankki- ja luottokortit',
      applepay: 'Apple Pay',
      back: 'Takaisin',
      pay: 'Vahvista ja tilaa',
      orderConfirmed: 'Tilaus vahvistettu',
      orderThanks: 'Kiitos tilauksestasi.',
      orderSentTo: 'Vahvistus lähetetty osoitteeseen',
      returnHome: 'Palaa etusivulle',
    },
    footer: {
      newsletterTitle: 'Liity sisäpiiriin',
      newsletterSubtitle: 'Vastaanota tieto uusista eristä ja hiljaisista arkistojulkaisuista.',
      subscribe: 'Tilaa',
      privacyNote: 'Kunnioitamme yksityisyyttäsi. Voit perua tilauksen milloin tahansa.',
      copyright: 'Kaikki oikeudet pidätetään.',
    },
    cookie: {
      text: 'Käytämme välttämättömiä evästeitä varmistaaksemme sivuston toiminnan ja estetiikan.',
      accept: 'Hyväksy',
      settings: 'Asetukset',
    },
  },
  en: {
    languageName: 'English',
    translateBar: 'Translate website in 1 click:',
    sitemap: 'Sitemap',
    announcement: 'COMPLIMENTARY SHIPPING OVER 100 € · 14-DAY RETURN PRIVILEGE',
    nav: {
      new: 'New Arrivals',
      women: 'Women',
      men: 'Men',
      accessories: 'Accessories',
      collections: 'Collections',
      search: 'Search',
      wishlist: 'Wishlist',
      account: 'Account',
      bag: 'Bag',
      close: 'Close',
      viewAll: 'View All',
      archive: 'Archive',
      journal: 'Journal',
      lookbook: 'Lookbook',
    },
    latestDrop: {
      tag: 'LATEST DROP',
      edition: 'Numbered Edition',
      title: 'Nordic Architecture',
      description: 'Sculptural heavy wool crafted for restraint and durability.',
      link: 'Discover Drop',
    },
    categoriesMosaic: {
      women: 'Women',
      men: 'Men',
      accessories: 'Accessories',
      collections: 'Collections',
      subWomen: 'Pure silhouettes and organic materials',
      subMen: 'Tailored composure and northern function',
      subAcc: 'Hand-finished minimalist hardware',
      subCol: 'Seasonal capsule ensembles',
    },
    featured: {
      tag: 'CURATED',
      title: 'Archival Focus',
      dragHint: 'Swipe or explore',
      viewAll: 'Explore All',
    },
    cart: {
      title: 'Shopping Bag',
      empty: 'Your shopping bag is empty',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      shippingCalculated: 'Calculated at checkout',
      freeShippingEligible: 'Complimentary shipping applied',
      freeShippingRemaining: (rem: number) => `Add ${formatPrice(rem)} for complimentary shipping`,
      checkout: 'Proceed to Checkout',
      continueShopping: 'Continue Exploring',
      remove: 'Remove',
    },
    product: {
      addToBag: 'Add to Bag',
      soldOut: 'Sold Out',
      selectSize: 'Select Size',
      details: 'Garment Details',
      materials: 'Materials & Origin',
      shippingReturns: 'Shipping & Returns',
      care: 'Care Protocol',
      craftsmanship: 'Craftsmanship',
      origin: 'Origin',
      numberedPiece: 'Numbered Archive Piece',
    },
    pdp: {
      plate: 'Archive Plate',
      vatIncluded: 'incl. 24% VAT',
      selectSize: 'Select Size',
      sizeGuide: 'Size Guide (cm)',
      addToCart: 'Add to Bag',
      addedToCart: 'Added to Bag',
      outOfStock: 'Sold Out',
      descTitle: 'Description & Fit',
      careTitle: 'Material & Care Protocol',
      shippingTitle: 'Shipping & Returns',
      shippingInfo: 'Complimentary shipping over 100 €. 14-day return privilege.',
      completeLook: 'Harmonious Synthesis',
      othersViewed: 'Also Viewed',
      zoomHint: 'Click to enlarge',
    },
    checkout: {
      title: 'Checkout',
      step1: '1. Delivery',
      step2: '2. Payment',
      step3: '3. Confirmation',
      shippingMethods: 'Select Delivery Method',
      customerInfo: 'Customer Information',
      email: 'Email',
      firstName: 'First Name',
      lastName: 'Last Name',
      street: 'Street Address',
      postalCode: 'Postal Code',
      city: 'City',
      phone: 'Phone Number',
      proceedToPayment: 'Continue to Payment',
      paymentMethods: 'Payment Methods',
      verkkopankki: 'Online Banks',
      mobilepay: 'MobilePay',
      klarna: 'Klarna',
      cards: 'Credit & Debit Cards',
      applepay: 'Apple Pay',
      back: 'Back',
      pay: 'Confirm & Place Order',
      orderConfirmed: 'Order Confirmed',
      orderThanks: 'Thank you for your order.',
      orderSentTo: 'Confirmation sent to',
      returnHome: 'Return to Store',
    },
    footer: {
      newsletterTitle: 'Join the Atelier Dispatch',
      newsletterSubtitle: 'Receive notifications on limited releases and silent archive drops.',
      subscribe: 'Subscribe',
      privacyNote: 'Strict restraint. You may unsubscribe at any moment.',
      copyright: 'All rights reserved.',
    },
    cookie: {
      text: 'We use necessary cookies to ensure the restraint and performance of this digital archive.',
      accept: 'Accept',
      settings: 'Preferences',
    },
  },
  sv: {
    languageName: 'Svenska',
    translateBar: 'Översätt webbplats med ett klick:',
    sitemap: 'Webbplatskarta',
    announcement: 'FRI FRAKT ÖVER 100 € · 14 DAGARS RETURRÄTT',
    nav: {
      new: 'Nyheter',
      women: 'Dam',
      men: 'Herr',
      accessories: 'Accessoarer',
      collections: 'Kollektioner',
      search: 'Sök',
      wishlist: 'Önskelista',
      account: 'Konto',
      bag: 'Varukorg',
      close: 'Stäng',
      viewAll: 'Visa alla',
      archive: 'Arkiv',
      journal: 'Journal',
      lookbook: 'Lookbook',
    },
    latestDrop: {
      tag: 'SENASTE SLÄPP',
      edition: 'Numrerad upplaga',
      title: 'Nordisk arkitektur',
      description: 'Skulptural tung ull sydd för nordisk funktion.',
      link: 'Upptäck släppet',
    },
    categoriesMosaic: {
      women: 'Dam',
      men: 'Herr',
      accessories: 'Accessoarer',
      collections: 'Kollektioner',
      subWomen: 'Rena linjer och organiska material',
      subMen: 'Skräddad hållning och nordisk funktion',
      subAcc: 'Handgjorda minimalistiska detaljer',
      subCol: 'Säsongshelheter',
    },
    featured: {
      tag: 'UTVALDA',
      title: 'Arkivverk',
      dragHint: 'Bläddra',
      viewAll: 'Utforska alla',
    },
    cart: {
      title: 'Varukorg',
      empty: 'Din varukorg är tom',
      subtotal: 'Delsumma',
      shipping: 'Frakt',
      shippingCalculated: 'Beräknas i kassan',
      freeShippingEligible: 'Berättigad till fri frakt',
      freeShippingRemaining: (rem: number) => `Lägg till ${formatPrice(rem)} för fri frakt`,
      checkout: 'Gå till kassan',
      continueShopping: 'Fortsätt handla',
      remove: 'Ta bort',
    },
    product: {
      addToBag: 'Lägg i varukorg',
      soldOut: 'Slutsåld',
      selectSize: 'Välj storlek',
      details: 'Plaggets detaljer',
      materials: 'Material och ursprung',
      shippingReturns: 'Frakt och retur',
      care: 'Skötselråd',
      craftsmanship: 'Hantverk',
      origin: 'Ursprung',
      numberedPiece: 'Numrerat arkivplagg',
    },
    pdp: {
      plate: 'Arkivplatta',
      vatIncluded: 'inkl. 24 % moms',
      selectSize: 'Välj storlek',
      sizeGuide: 'Storleksguide (cm)',
      addToCart: 'Lägg i varukorg',
      addedToCart: 'Tillagd i varukorg',
      outOfStock: 'Slutsåld',
      descTitle: 'Beskrivning och passform',
      careTitle: 'Material och skötsel',
      shippingTitle: 'Frakt och returer',
      shippingInfo: 'Fri frakt över 100 €. 14 dagars returrätt.',
      completeLook: 'Harmonisk helhet',
      othersViewed: 'Andra tittade också på',
      zoomHint: 'Klicka för att förstora bilden',
    },
    checkout: {
      title: 'Kassa',
      step1: '1. Leverans',
      step2: '2. Betalning',
      step3: '3. Bekräftelse',
      shippingMethods: 'Välj leveranssätt',
      customerInfo: 'Kunduppgifter',
      email: 'E-post',
      firstName: 'Förnamn',
      lastName: 'Efternamn',
      street: 'Gatuadress',
      postalCode: 'Postnummer',
      city: 'Postort',
      phone: 'Telefonnummer',
      proceedToPayment: 'Fortsätt till betalning',
      paymentMethods: 'Betalsätt',
      verkkopankki: 'Internetbank',
      mobilepay: 'MobilePay',
      klarna: 'Klarna',
      cards: 'Betalkort',
      applepay: 'Apple Pay',
      back: 'Tillbaka',
      pay: 'Bekräfta och beställ',
      orderConfirmed: 'Order bekräftad',
      orderThanks: 'Tack för din beställning.',
      orderSentTo: 'Bekräftelse skickad till',
      returnHome: 'Tillbaka till butiken',
    },
    footer: {
      newsletterTitle: 'Gå med i ateljén',
      newsletterSubtitle: 'Få meddelanden om begränsade släpp och tysta arkivsläpp.',
      subscribe: 'Prenumerera',
      privacyNote: 'Vi respekterar din integritet. Du kan avregistrera dig när som helst.',
      copyright: 'Alla rättigheter förbehållna.',
    },
    cookie: {
      text: 'Vi använder nödvändiga kakor för att säkerställa arkivets prestanda.',
      accept: 'Acceptera',
      settings: 'Inställningar',
    },
  },
};

