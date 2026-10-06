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
