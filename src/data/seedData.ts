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
} from '../types';
import { ARCHIVE_PRODUCTS, JOURNAL_ARTICLES, PLACEHOLDER_IMG, PLACEHOLDER_VIDEO, HERO_SLIDES } from './mockData';
import { seedTargetsSystem } from './targetsSeedData';

// 1. Transform the 24 mock products into the full schema
export const SEED_PRODUCTS: Product[] = ARCHIVE_PRODUCTS.map((p, idx) => {
  const nrNum = (idx + 1).toString().padStart(3, '0');
  const nr = `Nº ${nrNum}`;
  const isLimited = p.isLimited || idx % 4 === 0;
  const editionSize = isLimited ? 25 + (idx % 3) * 15 : undefined;
  const soldCount = isLimited ? Math.floor((editionSize || 30) * 0.6) : undefined;

  const sizes = p.sizes || ['XS', 'S', 'M', 'L', 'XL'];
  const variants = sizes.map((sz, sIdx) => ({
    size: sz,
    sku: `ZEJ-${nrNum}-${sz}`,
    stock: Math.max(0, 3 + ((idx * 3 + sIdx * 5) % 11)),
  }));

  const totalStock = variants.reduce((acc, v) => acc + v.stock, 0);

  // Distribute statuses realistically
  let status: Product['status'] = 'live';
  if (idx === 21) status = 'draft';
  else if (idx === 22) status = 'scheduled';
  else if (idx === 23) status = 'sold_out';

  // Primary packshot and hover on-model images
  const images = [
    {
      url: PLACEHOLDER_IMG,
      alt: { fi: `${p.name.fi} - studio packshot`, en: `${p.name.en} - studio packshot` },
      focalX: 50,
      focalY: 18,
      order: 0,
      isPrimary: true,
      isHover: false,
    },
    {
      url: PLACEHOLDER_IMG,
      alt: { fi: `${p.name.fi} - mallin päällä`, en: `${p.name.en} - on model` },
      focalX: 50,
      focalY: 22,
      order: 1,
      isPrimary: false,
      isHover: true,
    },
  ];

  const catIds = [p.category || 'all', (p.subcategory || '').toLowerCase().replace(/\s+/g, '-')].filter(Boolean) as string[];

  return {
    ...p,
    id: p.id,
    nr,
    plateNumber: nr,
    variants,
    stock: totalStock,
    images,
    categoryIds: catIds,
    collectionIds: p.collectionSeason ? [p.collectionSeason] : ['essentials'],
    status,
    publishAt: status === 'scheduled' ? new Date(Date.now() + 86400000 * 3).toISOString() : undefined,
    limitedEdition: {
      isLimited,
      editionSize,
      soldCount,
    },
    seo: {
      title: `${p.name.en} (${nr}) | Zejesh Studio Helsinki`,
      description: p.description.en.slice(0, 150) + '...',
    },
    createdAt: new Date(Date.now() - (30 - idx) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - idx * 3600000).toISOString(),
    attentionScore: 75 + ((idx * 7) % 24),
  };
});

// 2. Categories tree
export const SEED_CATEGORIES: Category[] = [
  { id: 'cat-naiset', name: { fi: 'Naiset', en: 'Women', sv: 'Kvinnor' }, slug: 'naiset', order: 1, visible: true },
  { id: 'cat-miehet', name: { fi: 'Miehet', en: 'Men', sv: 'Män' }, slug: 'miehet', order: 2, visible: true },
  { id: 'cat-asusteet', name: { fi: 'Asusteet', en: 'Accessories', sv: 'Accessoarer' }, slug: 'asusteet', order: 3, visible: true },
  { id: 'cat-kokoelmat', name: { fi: 'Kokoelmat', en: 'Collections', sv: 'Kollektioner' }, slug: 'kokoelmat', order: 4, visible: true },

  // Subcategories
  { id: 'cat-naiset-takit', parentId: 'cat-naiset', name: { fi: 'Takit & Ulkovaatteet', en: 'Coats & Outerwear' }, slug: 'naiset-takit', order: 1, visible: true },
  { id: 'cat-naiset-neuleet', parentId: 'cat-naiset', name: { fi: 'Neuleet & Villapaidat', en: 'Knitwear & Sweaters' }, slug: 'naiset-neuleet', order: 2, visible: true },
  { id: 'cat-naiset-paidat', parentId: 'cat-naiset', name: { fi: 'Paidat & Topit', en: 'Shirts & Tops' }, slug: 'naiset-paidat', order: 3, visible: true },
  { id: 'cat-naiset-housut', parentId: 'cat-naiset', name: { fi: 'Housut & Hameet', en: 'Trousers & Skirts' }, slug: 'naiset-housut', order: 4, visible: true },

  { id: 'cat-miehet-takit', parentId: 'cat-miehet', name: { fi: 'Takit & Ulkovaatteet', en: 'Coats & Outerwear' }, slug: 'miehet-takit', order: 1, visible: true },
  { id: 'cat-miehet-neuleet', parentId: 'cat-miehet', name: { fi: 'Neuleet', en: 'Knitwear' }, slug: 'miehet-neuleet', order: 2, visible: true },
  { id: 'cat-miehet-paidat', parentId: 'cat-miehet', name: { fi: 'Paidat & T-paidat', en: 'Shirts & T-shirts' }, slug: 'miehet-paidat', order: 3, visible: true },
  { id: 'cat-miehet-housut', parentId: 'cat-miehet', name: { fi: 'Housut', en: 'Trousers' }, slug: 'miehet-housut', order: 4, visible: true },

  { id: 'cat-asusteet-pipot', parentId: 'cat-asusteet', name: { fi: 'Pipot & Hanskat', en: 'Beanies & Gloves' }, slug: 'asusteet-pipot', order: 1, visible: true },
  { id: 'cat-asusteet-huivit', parentId: 'cat-asusteet', name: { fi: 'Huivit', en: 'Scarves' }, slug: 'asusteet-huivit', order: 2, visible: true },
  { id: 'cat-asusteet-laukut', parentId: 'cat-asusteet', name: { fi: 'Laukut & Nahkatyöt', en: 'Bags & Leather' }, slug: 'asusteet-laukut', order: 3, visible: true },
];

// 3. Collections (5) & Drops (3)
export const SEED_COLLECTIONS: Collection[] = [
  {
    id: 'col-talvi-2026',
    name: { fi: 'Talvi 2026 · Kaamoksen Muodot', en: 'Winter 2026 · Polar Geometry' },
    slug: 'talvi-2026',
    type: 'season',
    status: 'live',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-01', 'prod-02', 'prod-03', 'prod-05', 'prod-06'],
  },
  {
    id: 'col-essentials',
    name: { fi: 'Arkiston Perusteokset', en: 'Archival Essentials' },
    slug: 'essentials',
    type: 'essentials',
    status: 'live',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-04', 'prod-07', 'prod-12', 'prod-14', 'prod-18'],
  },
  {
    id: 'col-kevat-2026',
    name: { fi: 'Kevät 2026 · Valon Paluu', en: 'Spring 2026 · Return of Light' },
    slug: 'kevat-2026',
    type: 'season',
    startAt: '2026-03-20T00:00:00Z',
    status: 'scheduled',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-15', 'prod-16', 'prod-17'],
  },
  {
    id: 'drop-01-kaamos',
    name: { fi: 'Drop 01 · Kaamos Villan Yö', en: 'Drop 01 · Polar Wool Night' },
    slug: 'drop-kaamos',
    type: 'drop',
    editionSize: 30,
    status: 'completed',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-01', 'prod-08'],
  },
  {
    id: 'drop-02-monoliitti',
    name: { fi: 'Drop 02 · Musta Monoliitti', en: 'Drop 02 · Black Monolith' },
    slug: 'drop-monoliitti',
    type: 'drop',
    editionSize: 50,
    startAt: '2026-02-01T12:00:00Z',
    status: 'live',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-02', 'prod-09', 'prod-11'],
  },
  {
    id: 'drop-03-sulavalumi',
    name: { fi: 'Drop 03 · Sulavan Lumen Silkki', en: 'Drop 03 · Thawing Snow Silk' },
    slug: 'drop-sulavalumi',
    type: 'drop',
    editionSize: 25,
    startAt: '2026-11-15T10:00:00Z',
    status: 'scheduled',
    cover: PLACEHOLDER_IMG,
    productIds: ['prod-10', 'prod-13'],
  },
];

// 4. Fake Orders (40) with real Finnish & Nordic distribution
const FIRST_NAMES = ['Aino', 'Eero', 'Helmi', 'Matias', 'Kerttu', 'Onni', 'Sofia', 'Veikko', 'Linnea', 'Aleksi', 'Astrid', 'Lukas', 'Emma', 'Juho', 'Sirkka'];
const LAST_NAMES = ['Korhonen', 'Virtanen', 'Mäkinen', 'Nieminen', 'Koskinen', 'Lindholm', 'Salminen', 'Hakala', 'Heikkinen', 'Rantanen', 'Bergman'];
const CITIES = ['Helsinki', 'Espoo', 'Tampere', 'Turku', 'Oulu', 'Jyväskylä', 'Lahti', 'Kuopio', 'Porvoo', 'Vaasa', 'Stockholm', 'Copenhagen'];

export const SEED_ORDERS: Order[] = Array.from({ length: 40 }, (_, i) => {
  const orderNum = `ZE-2026-${(40 - i).toString().padStart(4, '0')}`;
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const ln = LAST_NAMES[i % LAST_NAMES.length];
  const city = CITIES[i % CITIES.length];
  const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${i % 3 === 0 ? 'gmail.com' : i % 2 === 0 ? 'kapsi.fi' : 'aalto.fi'}`;

  // Products in order
  const p1 = SEED_PRODUCTS[i % SEED_PRODUCTS.length];
  const p2 = SEED_PRODUCTS[(i + 5) % SEED_PRODUCTS.length];
  const itemCount = i % 4 === 0 ? 2 : 1;

  const items = [
    {
      productId: p1.id,
      productNr: p1.nr || p1.plateNumber || 'Nº 001',
      productName: p1.name.fi,
      size: p1.variants?.[0]?.size || p1.sizes?.[0] || 'M',
      quantity: 1,
      price: p1.price,
      image: p1.images?.[0]?.url || PLACEHOLDER_IMG,
    },
  ];

  if (itemCount === 2) {
    items.push({
      productId: p2.id,
      productNr: p2.nr || p2.plateNumber || 'Nº 002',
      productName: p2.name.fi,
      size: p2.variants?.[1]?.size || p2.sizes?.[1] || 'L',
      quantity: 1,
      price: p2.price,
      image: p2.images?.[0]?.url || PLACEHOLDER_IMG,
    });
  }

  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const shipping = subtotal >= 100 ? 0 : 6.9;
  const vat = Math.round((subtotal * 0.24) * 100) / 100;
  const discount = i % 7 === 0 ? 20 : 0;
  const total = subtotal + shipping - discount;

  // Realistic status distribution
  let status: Order['status'] = 'delivered';
  if (i === 0 || i === 1) status = 'new';
  else if (i === 2 || i === 3) status = 'paid';
  else if (i === 4 || i === 5) status = 'packed';
  else if (i === 6 || i === 7 || i === 8) status = 'shipped';
  else if (i === 38) status = 'cancelled';
  else if (i === 39) status = 'refunded';

  const orderTime = new Date(Date.now() - i * 18 * 3600000).toISOString();

  return {
    id: `ord-${40 - i}`,
    number: orderNum,
    customer: {
      id: `cust-${(i % 15) + 1}`,
      email,
      name: `${fn} ${ln}`,
      phone: `+358 40 ${(1000000 + i * 84213) % 9000000}`,
      address: {
        street: `Bulevardi ${(i % 30) + 1}`,
        postalCode: `00${100 + (i % 80)}`,
        city,
        country: city === 'Stockholm' ? 'Ruotsi' : city === 'Copenhagen' ? 'Tanska' : 'Suomi',
      },
    },
    items,
    totals: {
      subtotal,
      shipping,
      vat,
      discount,
      total,
    },
    status,
    shippingMethod: i % 2 === 0 ? 'Posti Noutopistepaketti' : 'Posti Kotipaketti',
    tracking: status === 'shipped' || status === 'delivered' ? `JJFI${689400000000 + i * 1337}` : undefined,
    notes: i % 5 === 0 ? 'Toimitus mieluiten talon rappuun / soita ovikelloa.' : undefined,
    timeline: [
      { at: orderTime, status: 'new', note: 'Tilaus vastaanotettu järjestelmässä' },
      ...(status !== 'new' ? [{ at: orderTime, status: 'paid', note: 'Maksu vahvistettu (Stripe / Paytrail)' }] : []),
      ...(status === 'packed' || status === 'shipped' || status === 'delivered'
        ? [{ at: orderTime, status: 'packed', note: 'Pakattu silkkipaperiin ja numeroitu arkistolaatikko' }]
        : []),
      ...(status === 'shipped' || status === 'delivered'
        ? [{ at: orderTime, status: 'shipped', note: 'Luovutettu kuljettajalle' }]
        : []),
      ...(status === 'delivered' ? [{ at: orderTime, status: 'delivered', note: 'Kuitattu vastaanotetuksi' }] : []),
    ],
    createdAt: orderTime,
    updatedAt: orderTime,
  };
});

// 5. Customers
export const SEED_CUSTOMERS: Customer[] = Array.from({ length: 18 }, (_, i) => {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const ln = LAST_NAMES[i % LAST_NAMES.length];
  const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${i % 2 === 0 ? 'gmail.com' : 'kolumbus.fi'}`;
  const ordersCount = 1 + (i % 4);
  const spend = ordersCount * 320;

  return {
    id: `cust-${i + 1}`,
    email,
    name: `${fn} ${ln}`,
    marketingConsent: i % 3 !== 0,
    wishlist: [SEED_PRODUCTS[i % SEED_PRODUCTS.length].id, SEED_PRODUCTS[(i + 3) % SEED_PRODUCTS.length].id],
    totals: {
      orders: ordersCount,
      spend,
    },
    firstSeen: new Date(Date.now() - (60 + i * 5) * 86400000).toISOString(),
    lastSeen: new Date(Date.now() - (i % 7) * 86400000).toISOString(),
  };
});

// 6. Waitlist
export const SEED_WAITLIST: WaitlistEntry[] = [
  { id: 'wl-1', email: 'aleksi.valtakari@gmail.com', source: 'drop-monoliitti', dropId: 'drop-02-monoliitti', createdAt: '2026-02-02T10:15:00Z', invited: true },
  { id: 'wl-2', email: 'milla.j@aalto.fi', source: 'drop-monoliitti', dropId: 'drop-02-monoliitti', createdAt: '2026-02-03T14:22:00Z', invited: true },
  { id: 'wl-3', email: 'laura.lindqvist@kapsi.fi', source: 'drop-sulavalumi', dropId: 'drop-03-sulavalumi', createdAt: '2026-02-10T08:11:00Z', invited: false },
  { id: 'wl-4', email: 'henrik.lind@nordic.se', source: 'drop-sulavalumi', dropId: 'drop-03-sulavalumi', createdAt: '2026-02-12T19:40:00Z', invited: false },
  { id: 'wl-5', email: 'katariina.r@saunalahti.fi', source: 'drop-sulavalumi', dropId: 'drop-03-sulavalumi', createdAt: '2026-02-14T11:05:00Z', invited: false },
];

// 7. Discounts
export const SEED_DISCOUNTS: Discount[] = [
  {
    id: 'disc-archive10',
    code: 'ARCHIVE10',
    type: 'percent',
    value: 10,
    minSpend: 150,
    usageLimit: 100,
    used: 24,
    active: true,
  },
  {
    id: 'disc-nordic20',
    code: 'NORDIC20',
    type: 'percent',
    value: 20,
    minSpend: 300,
    usageLimit: 50,
    used: 12,
    active: true,
  },
  {
    id: 'disc-freeship',
    code: 'FREESHIP',
    type: 'freeShipping',
    value: 0,
    minSpend: 80,
    usageLimit: 200,
    used: 89,
    active: true,
  },
  {
    id: 'disc-vipplate',
    code: 'VIPPLATE',
    type: 'fixed',
    value: 50,
    minSpend: 250,
    usageLimit: 30,
    used: 18,
    active: true,
  },
];

// 8. Store Content
export const SEED_CONTENT: StoreContent = {
  id: 'storefront-main',
  sectionOrder: ['announcement', 'hero', 'brandManifesto', 'archiveListing', 'dropBanner', 'journal', 'footer'],
  heroMedia: {
    desktopSrc: PLACEHOLDER_VIDEO,
    desktopPoster: PLACEHOLDER_IMG,
    mobileSrc: PLACEHOLDER_VIDEO,
    mobilePoster: PLACEHOLDER_IMG,
  },
  heroSlides: HERO_SLIDES,
  announcementBar: {
    fi: 'ILMAINEN TOIMITUS YLI 100 € TILAUKSIIN · 14 PÄIVÄN PALAUTUSOIKEUS · TOIMITUS NOUTUPISTEISIIN',
    en: 'COMPLIMENTARY SHIPPING OVER 100 € · 14-DAY ARCHIVAL RETURN WINDOW · NORDIC DISPATCH',
    sv: 'FRI FRAKT ÖVER 100 € · 14 DAGARS RETURRÄTT · NORDISK LEVERANS',
  },
  journalPosts: JOURNAL_ARTICLES,
  translations: {},
};

// 9. Store Settings
export const SEED_SETTINGS: StoreSettings = {
  id: 'global-settings',
  storeInfo: {
    name: 'Zejesh Studio Archival Store',
    email: 'studio@zejesh.fi',
    address: 'Bulevardi 12, 00120 Helsinki, Finland',
    currency: 'EUR',
  },
  shippingRates: [
    {
      id: 'ship-posti-nouto',
      method: 'posti_pickup',
      name: { fi: 'Posti Noutopistepaketti (1–2 arkipäivää)', en: 'Posti Pickup Locker (1–2 business days)' },
      price: 5.9,
      eta: '1–2 päivää',
      freeOver: 100,
    },
    {
      id: 'ship-posti-koti',
      method: 'posti_home',
      name: { fi: 'Posti Kotipaketti kotiovelle (1–2 arkipäivää)', en: 'Posti Home Delivery (1–2 business days)' },
      price: 9.9,
      eta: '1–2 päivää',
      freeOver: 200,
    },
    {
      id: 'ship-dhl-express',
      method: 'dhl_express',
      name: { fi: 'DHL Express Ilmakuljetus (Nordic & Global)', en: 'DHL Express Courier (Nordic & Global)' },
      price: 18.0,
      eta: 'Seuraava päivä',
    },
  ],
  freeShippingThreshold: 100,
  vatRate: 24,
  consentText: {
    fi: 'Käytämme anonyymeja evästeitä parantamaan galleriakokemusta ja ymmärtämään kävijämääriä. Emme jaa henkilötietoja kolmansille osapuolille.',
    en: 'We utilize anonymous telemetry strictly to refine the archival gallery cadence and evaluate attention metrics. Zero personal data is syndicated.',
  },
  lowStockThreshold: 3,
};

// 10. Default Admin Users (Only owner - clean slate)
export const SEED_ADMINS: AdminUser[] = [
  {
    id: 'admin-owner',
    uid: 'owner-huxaifa',
    email: 'huxaifa0fficial@gmail.com',
    name: 'Zejesh Studio Owner',
    role: 'owner',
  },
];

// 11. 30 Days of Daily Stats for Analytics & AI Advisor
export const SEED_DAILY_STATS: DailyStat[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000);
  const dateStr = d.toISOString().split('T')[0];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  // Realistic seasonal variance
  const baseVisitors = isWeekend ? 650 : 420;
  const visitors = baseVisitors + ((i * 19) % 180) - 40;
  const sessions = Math.floor(visitors * 1.35);
  const conversionRate = 0.024 + ((i % 5) * 0.003);
  const orders = Math.floor(visitors * conversionRate);
  const aov = 280 + ((i * 13) % 90);
  const revenue = orders * aov;
  const pageViews = visitors * 4.6;
  const addToBags = Math.floor(visitors * 0.082);

  return {
    id: `stat-${dateStr}`,
    date: dateStr,
    visitors,
    sessions,
    revenue,
    orders,
    pageViews,
    addToBags,
    conversionRate: Math.round(conversionRate * 1000) / 10,
    topProducts: [
      { id: 'prod-01', nr: 'Nº 001', name: 'Kaamos Merinovillatakki', views: 340 + i * 5, sales: 8 + (i % 3) },
      { id: 'prod-02', nr: 'Nº 002', name: 'Sarkavillainen Ryhtitakki', views: 290 + i * 4, sales: 6 + (i % 2) },
      { id: 'prod-04', nr: 'Nº 004', name: 'Helsinki Leveälahkeinen Housu', views: 210 + i * 3, sales: 5 + (i % 4) },
    ],
  };
});

// 12. Strategic AI Insights (Milestone 5 foundation)
export const SEED_INSIGHTS: AiInsight[] = [
  {
    id: 'ins-01',
    title: 'Nº 001 Merinovillatakin koko S loppumassa ennen viikonloppua',
    priority: 'high',
    category: 'inventory',
    evidence: 'Myyntitahti 3 kpl/pv, jäljellä 2 kpl. 14 käyttäjää katsellut kokoa S viimeisen 24h aikana.',
    recommendation: 'Siirrä 5 kpl lisäerä valmistuksesta tai aseta tuote ennakkovarattavaksi.',
    expectedImpact: '+1 450 € viikonloppumyyntiä',
    effort: 'Pieni (2 min)',
    suggestedAction: { type: 'open_product', targetId: 'prod-01' },
    status: 'new',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ins-02',
    title: 'Drop 02 Odotuslista kasvanut 120 % – Ennakkomyynti suositeltava',
    priority: 'high',
    category: 'drop_strategy',
    evidence: 'Odotuslistalla 84 henkilöä, eräkoko vain 50 kpl. Kiinnostus ylittää tarjonnan 168 %:lla.',
    recommendation: 'Lähetä 2h etukäteisostolinkki VIP-asiakkaille ennen julkista pudotusta.',
    expectedImpact: '100 % läpimyynti alle 45 minuutissa',
    effort: 'Keskisuuri',
    suggestedAction: { type: 'open_waitlist', targetId: 'drop-02-monoliitti' },
    status: 'new',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'ins-03',
    title: 'Mobiilikonversio laahaa 32 % työpöytäkäyttäjiä jäljessä kassavaiheessa',
    priority: 'medium',
    category: 'ux',
    evidence: 'Mobiilissa kassalle siirtymisen pudotus 44 % vs työpöydän 18 % Posti-noutopistevalinnassa.',
    recommendation: 'Yksinkertaista Posti-noutopistehaun kenttiä mobiilinäkymässä.',
    expectedImpact: '+8 % kokonaiskonversio',
    effort: 'Keskisuuri',
    suggestedAction: { type: 'open_settings' },
    status: 'new',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];
