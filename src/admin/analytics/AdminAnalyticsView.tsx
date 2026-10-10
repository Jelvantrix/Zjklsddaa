import React, { useState, useMemo } from 'react';
import { Product, DailyStat, Order } from '../../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
} from 'recharts';
import { Download, Search } from 'lucide-react';

interface AdminAnalyticsViewProps {
  products: Product[];
  dailyStats: DailyStat[];
  orders?: Order[];
}

// Total stock for a product, derived only from catalog rows.
const stockOf = (p: Product): number =>
  p.variants ? p.variants.reduce((acc, v) => acc + v.stock, 0) : p.stock || 0;

// Honest placeholder for a trajectory whose source data is not recorded.
interface NoDataTrajectoryProps {
  n: number;
  title: string;
  reason: string;
  wide?: boolean;
}

const NoDataTrajectory: React.FC<NoDataTrajectoryProps> = ({ n, title, reason, wide = false }) => (
  <div className={`space-y-3 pb-6 border-b border-black/10 ${wide ? 'col-span-1 lg:col-span-2' : ''}`}>
    <div className="flex justify-between items-baseline">
      <div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">
          Trajectory {String(n).padStart(2, '0')}
        </span>
        <h3 className="font-editorial text-2xl font-normal text-black">{title}</h3>
      </div>
      <span className="text-[11px] font-mono text-black/60">No data yet</span>
    </div>
    <div className="h-64 w-full pt-2 flex flex-col items-center justify-center gap-2 border border-black/10">
      <span className="text-[11px] uppercase tracking-[0.2em] text-black/40">No data yet</span>
      <span className="text-[10px] font-mono text-black/40 text-center max-w-sm">{reason}</span>
    </div>
  </div>
);

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  products,
  dailyStats = [],
  orders = [],
}) => {
  const [activeSuite, setActiveSuite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '40d'>('40d');

  // ==========================================
  // REAL CATALOG & TRANSACTION CORE METRICS
  // ==========================================
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
  }, [orders]);

  const totalOrders = orders.length;
  const totalAddToBags = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + (it.quantity || 0), 0),
    0
  );
  const effectiveProducts = useMemo(() => {
    return products || [];
  }, [products]);

  const totalCatalogStock = useMemo(() => {
    return effectiveProducts.reduce((acc, p) => acc + stockOf(p), 0);
  }, [effectiveProducts]);

  const totalCatalogValue = useMemo(() => {
    return effectiveProducts.reduce((acc, p) => acc + stockOf(p) * p.price, 0);
  }, [effectiveProducts]);

  // Real product sales map
  const productSalesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ord of orders) {
      for (const it of ord.items) {
        map[it.productId] = (map[it.productId] || 0) + (it.quantity || 0);
      }
    }
    return map;
  }, [orders]);

  // ==========================================
  // DAILY SERIES — ONLY REAL DB FIELDS
  // ==========================================
  const fortyPoints = useMemo(() => {
    if (dailyStats && dailyStats.length > 0) {
      return dailyStats.map((stat, idx) => {
        const rev = stat.revenue || 0;
        const ords = stat.orders || 0;
        const sessions = stat.visitors || 0;
        return {
          index: idx + 1,
          day: stat.date ? stat.date.slice(5) : `D${idx + 1}`,
          date: stat.date || '',
          revenue: rev,
          orders: ords,
          sessions,
          aov: ords > 0 ? Math.round(rev / ords) : 0,
        };
      });
    }

    if (orders && orders.length > 0) {
      const dateMap: Record<string, { revenue: number; orders: number }> = {};
      orders.forEach((o) => {
        const d = (o.createdAt || '').slice(0, 10) || 'Recent';
        if (!dateMap[d]) dateMap[d] = { revenue: 0, orders: 0 };
        dateMap[d].revenue += o.totals?.total || 0;
        dateMap[d].orders += 1;
      });
      const entries = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));
      return entries.map(([date, d], idx) => ({
        index: idx + 1,
        day: date.slice(5) || date,
        date,
        revenue: d.revenue,
        orders: d.orders,
        // No visitor/session source exists outside dailyStats — reported as 0.
        sessions: 0,
        aov: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
      }));
    }

    return [];
  }, [dailyStats, orders]);

  // Date range actually slices the recorded series (no synthetic data).
  const displayPoints = useMemo(() => {
    const sorted = [...fortyPoints].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const limit = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 40;
    return sorted.slice(-limit).map((p, i) => ({ ...p, index: i + 1 }));
  }, [fortyPoints, dateRange]);

  const rangeRevenue = useMemo(
    () => displayPoints.reduce((s, p) => s + p.revenue, 0),
    [displayPoints]
  );
  const rangeOrders = useMemo(
    () => displayPoints.reduce((s, p) => s + p.orders, 0),
    [displayPoints]
  );
  const rangeAov = rangeOrders > 0 ? Math.round(rangeRevenue / rangeOrders) : 0;
  const avgDailyRevenue =
    displayPoints.length > 0 ? Math.round(rangeRevenue / displayPoints.length) : 0;

  // Visitor/session counts exist only in dailyStats rows.
  const hasSessionData = useMemo(
    () => dailyStats.some((d) => (d.visitors || 0) > 0),
    [dailyStats]
  );

  // Revenue per recorded visitor — only meaningful when sessions are recorded.
  const rpvSeries = useMemo(
    () =>
      displayPoints.map((p) => ({
        ...p,
        rpv: p.sessions > 0 ? +(p.revenue / p.sessions).toFixed(2) : 0,
      })),
    [displayPoints]
  );

  // Cumulative run-rate computed from recorded daily revenue.
  const cumulativeSeries = useMemo(() => {
    let acc = 0;
    return displayPoints.map((p) => {
      acc += p.revenue;
      return { day: p.day, cumulative: acc };
    });
  }, [displayPoints]);

  // Category quantitative data (stock, units sold and value from catalog + orders)
  const categoryQuant = useMemo(() => {
    const cats: Record<string, { count: number; stock: number; sold: number; value: number }> = {
      naiset: { count: 0, stock: 0, sold: 0, value: 0 },
      miehet: { count: 0, stock: 0, sold: 0, value: 0 },
      asusteet: { count: 0, stock: 0, sold: 0, value: 0 },
    };
    effectiveProducts.forEach((p) => {
      const c = p.category || 'naiset';
      if (!cats[c]) cats[c] = { count: 0, stock: 0, sold: 0, value: 0 };
      cats[c].count += 1;
      const st = stockOf(p);
      cats[c].stock += st;
      const s = productSalesMap[p.id] || 0;
      cats[c].sold += s;
      cats[c].value += st * p.price;
    });

    return Object.entries(cats).map(([key, data]) => ({
      key,
      name: key === 'naiset' ? 'Women (Naiset)' : key === 'miehet' ? 'Men (Miehet)' : 'Accessories (Asusteet)',
      stock: data.stock,
      count: data.count,
      sold: data.sold,
      capitalEur: data.value,
      turnoverRatio: data.stock > 0 ? +(data.sold / data.stock).toFixed(2) : 0,
    }));
  }, [effectiveProducts, productSalesMap]);

  // Size distribution: stock from variants, demand from recorded order line items
  const sizeQuant = useMemo(() => {
    const sizes: Record<string, { size: string; stock: number; sold: number }> = {
      XS: { size: 'XS', stock: 0, sold: 0 },
      S: { size: 'S', stock: 0, sold: 0 },
      M: { size: 'M', stock: 0, sold: 0 },
      L: { size: 'L', stock: 0, sold: 0 },
      XL: { size: 'XL', stock: 0, sold: 0 },
    };
    effectiveProducts.forEach((p) => {
      (p.variants || []).forEach((v) => {
        const s = (v.size || '').toUpperCase();
        if (sizes[s]) {
          sizes[s].stock += v.stock;
        }
      });
    });
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const s = (it.size || '').toUpperCase();
        if (sizes[s]) sizes[s].sold += it.quantity || 0;
      });
    });
    return Object.values(sizes);
  }, [effectiveProducts, orders]);

  // Product scatter: units sold vs stock on hand (price as bubble size)
  const productScatterData = useMemo(() => {
    return effectiveProducts.slice(0, 40).map((p, idx) => ({
      name: p.nr || p.name?.en?.slice(0, 16) || `SKU-${idx + 1}`,
      x: productSalesMap[p.id] || 0,
      y: stockOf(p),
      z: p.price,
    }));
  }, [effectiveProducts, productSalesMap]);

  // Lifetime value tiers grouped by the customer email recorded on each order
  const ltvTiers = useMemo(() => {
    const byCustomer: Record<string, number> = {};
    orders.forEach((o) => {
      const key = (o.customer?.email || '').toLowerCase().trim();
      if (!key) return;
      byCustomer[key] = (byCustomer[key] || 0) + (o.totals?.total || 0);
    });
    const tiers = [
      { tier: 'Tier 1 (<500€)', patrons: 0 },
      { tier: 'Tier 2 (500-1500€)', patrons: 0 },
      { tier: 'Tier 3 (1500-3000€)', patrons: 0 },
      { tier: 'Tier 4 (3000-5000€)', patrons: 0 },
      { tier: 'Tier 5 (5000€+)', patrons: 0 },
    ];
    Object.values(byCustomer).forEach((value) => {
      if (value < 500) tiers[0].patrons += 1;
      else if (value < 1500) tiers[1].patrons += 1;
      else if (value < 3000) tiers[2].patrons += 1;
      else if (value < 5000) tiers[3].patrons += 1;
      else tiers[4].patrons += 1;
    });
    return tiers;
  }, [orders]);

  // Full-price vs discounted gross volume, from recorded order totals
  const discountSplit = useMemo(() => {
    const gross = orders.reduce((s, o) => s + (o.totals?.total || 0), 0);
    if (gross <= 0) return null;
    const discounted = orders.reduce(
      (s, o) => s + ((o.totals?.discount || 0) > 0 ? o.totals.total || 0 : 0),
      0
    );
    const fullShare = Math.round(((gross - discounted) / gross) * 100);
    return [
      { channel: 'Full price orders', share: fullShare },
      { channel: 'Orders with a discount', share: 100 - fullShare },
    ];
  }, [orders]);

  // Orders placed per weekday, from recorded createdAt timestamps
  const weekdayOrders = useMemo(() => {
    if (orders.length === 0) return null;
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    orders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (Number.isNaN(d.getTime())) return;
      counts[(d.getDay() + 6) % 7] += 1;
    });
    return labels.map((day, i) => ({ day, placed: counts[i] }));
  }, [orders]);

  // Tooltip custom style
  const tooltipStyle = {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderRadius: 0,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#000000',
    boxShadow: 'none',
  };

  const suites = [
    { id: 'all', label: 'All 40 Trajectories (Complete Matrix)' },
    { id: 'financial', label: 'I. Financial & Capital (1–5)' },
    { id: 'inventory', label: 'II. Inventory & Stock Velocity (6–10)' },
    { id: 'patrons', label: 'III. Patrons & Conversion (11–15)' },
    { id: 'telemetry', label: 'IV. Telemetry & Dwell (16–20)' },
    { id: 'elasticity', label: 'V. Elasticity & Margins (21–25)' },
    { id: 'logistics', label: 'VI. Logistics & Fulfillment (26–30)' },
    { id: 'predictive', label: 'VII. Predictive Atelier (31–35)' },
    { id: 'risk', label: 'VIII. Risk & Return Volatility (36–40)' },
  ];

  const handleExportFullCSV = () => {
    const headers = ['Trajectory', 'Day', 'Revenue_EUR', 'Orders', 'AOV_EUR'];
    const rows = displayPoints.map((p) => [p.index, p.day, p.revenue, p.orders, p.aov]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zejesh_recorded_store_data_${dateRange}.csv`);
    link.click();
  };

  const isVisible = (trajNum: number) => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return String(trajNum).includes(q) || `trajectory ${trajNum}`.includes(q);
    }
    if (activeSuite === 'all') return true;
    if (activeSuite === 'financial') return trajNum >= 1 && trajNum <= 5;
    if (activeSuite === 'inventory') return trajNum >= 6 && trajNum <= 10;
    if (activeSuite === 'patrons') return trajNum >= 11 && trajNum <= 15;
    if (activeSuite === 'telemetry') return trajNum >= 16 && trajNum <= 20;
    if (activeSuite === 'elasticity') return trajNum >= 21 && trajNum <= 25;
    if (activeSuite === 'logistics') return trajNum >= 26 && trajNum <= 30;
    if (activeSuite === 'predictive') return trajNum >= 31 && trajNum <= 35;
    if (activeSuite === 'risk') return trajNum >= 36 && trajNum <= 40;
    return true;
  };

  const noProducts = effectiveProducts.length === 0;
  const noSeries = displayPoints.length === 0;

  return (
    <div className="space-y-12 font-mono text-xs text-black bg-white select-text">
      {/* HEADER SECTION: Pure Institutional & Editorial Typography */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-black/10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-black/50 block">
              Atelier Intelligence // Matrix 40.0
            </span>
            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-black text-white font-mono">
              Computed From Live Store Data
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-black tracking-tight">
            Atelier Analytics: 40 Trajectories
          </h1>
          <p className="text-xs text-black/60 font-sans font-light max-w-2xl">
            Every figure below is computed from live store records: {effectiveProducts.length} styles holding{' '}
            {totalCatalogStock} units ({totalCatalogValue.toLocaleString()} € at list price),{' '}
            {totalRevenue.toLocaleString()} € across {totalOrders} recorded orders, and {fortyPoints.length} recorded
            reporting days. Charts without a recorded source show "No data yet".
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Quick Date Range */}
          <div className="flex items-center gap-3">
            {(['7d', '30d', '40d'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                  dateRange === r
                    ? 'font-bold text-black underline underline-offset-8'
                    : 'text-black/40 hover:text-black'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '40-Day Horizon'}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportFullCSV}
            className="text-xs uppercase text-black hover:opacity-60 underline underline-offset-4 cursor-pointer flex items-center gap-1.5 font-medium ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Recorded Data (CSV)</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE KPI MATRIX (REAL DB-DERIVED METRICS ONLY) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 pb-8 border-b border-black/10">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Gross Revenue (Range)</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {rangeRevenue.toLocaleString()} €
          </div>
          <span className="text-[10px] text-black/60 font-mono">{rangeOrders} orders recorded</span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Ticket Size AOV</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {rangeAov} €
          </div>
          <span className="text-[10px] text-black/60 font-mono">Average of recorded orders</span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Catalog Stock Depth</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {totalCatalogStock} pcs
          </div>
          <span className="text-[10px] text-black/60 font-mono">{effectiveProducts.length} registered styles</span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Units Sold</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {totalAddToBags} units
          </div>
          <span className="text-[10px] text-black/60 font-mono">From recorded order line items</span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Average Daily Revenue</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {avgDailyRevenue.toLocaleString()} €
          </div>
          <span className="text-[10px] text-black/60 font-mono">
            Across {displayPoints.length} recorded days
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.2em] text-black/40 block">Inventory Value at Retail</span>
          <div className="font-editorial text-2xl sm:text-3xl font-normal text-black">
            {totalCatalogValue.toLocaleString()} €
          </div>
          <span className="text-[10px] text-black/60 font-mono">Stock × list price</span>
        </div>
      </div>

      {/* SUITE NAVIGATION TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b border-black/10">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {suites.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveSuite(s.id);
                setSearchQuery('');
              }}
              className={`text-[11px] uppercase tracking-wider px-3 py-1 cursor-pointer transition-colors whitespace-nowrap ${
                activeSuite === s.id && !searchQuery
                  ? 'bg-black text-white font-medium'
                  : 'text-black/50 hover:text-black hover:bg-black/5'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search / Filter Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trajectory (1-40, revenue, stock)..."
            className="w-full pl-8 pr-3 py-1 text-xs font-mono bg-white border-b border-black/20 focus:border-black outline-none placeholder:text-black/30"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 40 ANALYTICAL TRAJECTORIES (REAL DATA OR HONEST EMPTY)   */}
      {/* ======================================================== */}
      <div className="space-y-16">

        {/* ---------------------------------------------------- */}
        {/* SUITE I: FINANCIAL & CAPITAL LIQUIDITY (GRAPHS 1–5) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite I: Financial & Capital Liquidity (Trajectories 01–05)
            </h2>
            <span className="text-[10px] font-mono text-black/50">Source: orders & daily stats</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 01 */}
            {isVisible(1) &&
              (noSeries ? (
                <NoDataTrajectory
                  n={1}
                  title="Daily Gross Revenue & Order Count"
                  reason="No revenue has been recorded for this store yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 01</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Daily Gross Revenue & Order Count</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Recorded € vs Orders</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="revenue" stroke="#000000" strokeWidth={2} fill="url(#gRev)" name="Gross Revenue (€)" />
                        <Line type="monotone" dataKey="orders" stroke="#666666" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Orders" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 02 */}
            {isVisible(2) &&
              (noSeries ? (
                <NoDataTrajectory
                  n={2}
                  title="Cumulative Gross Revenue Run-Rate"
                  reason="No revenue has been recorded for this store yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 02</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Cumulative Gross Revenue Run-Rate</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Running total of recorded revenue (€)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumulativeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="cumulative" stroke="#000000" strokeWidth={2} dot={false} name="Cumulative Revenue (€)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 03 */}
            {isVisible(3) && (
              <NoDataTrajectory
                n={3}
                title="24-Hour Studio Traffic & Peak Buying Ingress"
                reason="Only daily totals are recorded — no hourly traffic breakdown exists."
              />
            )}

            {/* TRAJECTORY 04 */}
            {isVisible(4) &&
              (noProducts ? (
                <NoDataTrajectory
                  n={4}
                  title="Category Capital Allocation vs Units Sold"
                  reason="No products in the catalog yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 04</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Category Capital Allocation vs Units Sold</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Capital (€) & Stock Turnover</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={categoryQuant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="stock" fill="#000000" name="Stock Count" />
                        <Line type="monotone" dataKey="sold" stroke="#555555" strokeWidth={2} name="Units Sold" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 05 */}
            {isVisible(5) &&
              (noSeries ? (
                <NoDataTrajectory
                  n={5}
                  title="Ticket Size & Average Order Value (AOV)"
                  reason="No orders have been recorded for this store yet."
                  wide
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10 col-span-1 lg:col-span-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 05</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Ticket Size & Average Order Value (AOV)</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Recorded AOV (€) per reporting day</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="aov" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.06} name="AOV Ticket (€)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE II: INVENTORY & STOCK VELOCITY (GRAPHS 6–10) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite II: Inventory Health & Stock Velocity (Trajectories 06–10)
            </h2>
            <span className="text-[10px] font-mono text-black/50">Variant SKU Resolution</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 06 */}
            {isVisible(6) &&
              (noProducts ? (
                <NoDataTrajectory
                  n={6}
                  title="Garment Size Stock Depth vs Units Sold"
                  reason="No products in the catalog yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 06</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Garment Size Stock Depth vs Units Sold</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">XS through XL in stock vs sold</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sizeQuant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="size" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="stock" fill="#000000" name="Atelier In-Stock" />
                        <Bar dataKey="sold" fill="#888888" name="Units Sold" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 07 */}
            {isVisible(7) &&
              (noProducts ? (
                <NoDataTrajectory
                  n={7}
                  title="Units Sold vs Stock on Hand (Quadrant)"
                  reason="No products in the catalog yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 07</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Units Sold vs Stock on Hand (Quadrant)</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Sold units vs remaining stock (bubble = price)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <XAxis type="number" dataKey="x" stroke="#000000" tick={{ fontSize: 9 }} name="Units Sold" />
                        <YAxis type="number" dataKey="y" stroke="#000000" tick={{ fontSize: 9 }} name="Stock" />
                        <ZAxis range={[60, 60]} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Garments" data={productScatterData} fill="#000000" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 08 */}
            {isVisible(8) &&
              (noProducts ? (
                <NoDataTrajectory
                  n={8}
                  title="SKU Turnover Ratio"
                  reason="No products in the catalog yet."
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 08</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">SKU Turnover Ratio</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Units sold ÷ units in stock</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryQuant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="key" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="turnoverRatio" fill="#000000" name="Turnover Ratio" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}

            {/* TRAJECTORY 09 */}
            {isVisible(9) && (
              <NoDataTrajectory
                n={9}
                title="Stockout Risk Curve & Safety Stock Buffer"
                reason="Stockout risk and safety-stock thresholds are not recorded."
              />
            )}

            {/* TRAJECTORY 10 */}
            {isVisible(10) &&
              (noProducts ? (
                <NoDataTrajectory
                  n={10}
                  title="Inventory Capital Concentration Spread"
                  reason="No products in the catalog yet."
                  wide
                />
              ) : (
                <div className="space-y-3 pb-6 border-b border-black/10 col-span-1 lg:col-span-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 10</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Inventory Capital Concentration Spread</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Stock × list price by category (€)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryQuant} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="capitalEur" fill="#000000" name="Capital Tied (€)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE III: PATRONS & CONVERSION (GRAPHS 11–15) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite III: Patron Acquisition & Conversion Flow (Trajectories 11–15)
            </h2>
            <span className="text-[10px] font-mono text-black/50">Recorded sessions & orders</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 11 */}
            {isVisible(11) &&
              (hasSessionData && !noSeries ? (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 11</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Recorded Sessions vs Orders Settled</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Sessions & orders per reporting day</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="sessions" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.15} name="Total Sessions" />
                        <Line type="monotone" dataKey="orders" stroke="#555555" strokeWidth={1.5} dot={false} name="Orders Settled" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={11}
                  title="Recorded Sessions vs Orders Settled"
                  reason="No visitor or session counts have been recorded yet."
                />
              ))}

            {/* TRAJECTORY 12 */}
            {isVisible(12) &&
              (hasSessionData && !noSeries ? (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 12</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Revenue Per Visitor (RPV)</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Recorded revenue ÷ recorded visitors (€)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rpvSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="rpv" stroke="#000000" strokeWidth={2} dot={{ r: 2 }} name="RPV (€)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={12}
                  title="Revenue Per Visitor (RPV)"
                  reason="No visitor counts have been recorded, so RPV cannot be computed."
                />
              ))}

            {/* TRAJECTORY 13 */}
            {isVisible(13) && (
              <NoDataTrajectory
                n={13}
                title="Cart Abandonment Recovery Propensity"
                reason="Cart abandonment and recovery are not tracked."
              />
            )}

            {/* TRAJECTORY 14 */}
            {isVisible(14) && (
              <NoDataTrajectory
                n={14}
                title="Nordic Domestic vs Global Cross-Border Allocation"
                reason="Customer regions are not recorded on orders."
              />
            )}

            {/* TRAJECTORY 15 */}
            {isVisible(15) &&
              (orders.length > 0 ? (
                <div className="space-y-3 pb-6 border-b border-black/10 col-span-1 lg:col-span-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 15</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Customer Lifetime Value (LTV) Cohorts</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Customers grouped by total recorded spend</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ltvTiers} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="tier" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="patrons" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.12} name="Customers" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={15}
                  title="Customer Lifetime Value (LTV) Cohorts"
                  reason="No orders have been recorded yet."
                  wide
                />
              ))}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE IV: TELEMETRY & ATTENTION DWELL (GRAPHS 16–20) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite IV: Behavioral Telemetry & Attention Dwell (Trajectories 16–20)
            </h2>
            <span className="text-[10px] font-mono text-black/50">No telemetry source recorded</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 16 */}
            {isVisible(16) && (
              <NoDataTrajectory
                n={16}
                title="Server Latency Percentiles (p50, p90, p99 ms)"
                reason="Server latency is not measured or stored by this application."
              />
            )}

            {/* TRAJECTORY 17 */}
            {isVisible(17) && (
              <NoDataTrajectory
                n={17}
                title="Archival Plate Image Hover Dwell vs Clickthrough"
                reason="Per-product views and dwell time are not recorded."
              />
            )}

            {/* TRAJECTORY 18 */}
            {isVisible(18) && (
              <NoDataTrajectory
                n={18}
                title="Wishlist-to-Cart Transition Half-Life"
                reason="Wishlist activity is not recorded."
              />
            )}

            {/* TRAJECTORY 19 */}
            {isVisible(19) && (
              <NoDataTrajectory
                n={19}
                title="Search Intent Density & Query Zero-Hit Friction"
                reason="Search queries are not recorded."
              />
            )}

            {/* TRAJECTORY 20 */}
            {isVisible(20) &&
              (hasSessionData && !noSeries ? (
                <div className="space-y-3 pb-6 border-b border-black/10 col-span-1 lg:col-span-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 20</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Recorded Sessions per Day</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Sessions recorded in daily stats</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area type="monotone" dataKey="sessions" stroke="#000000" strokeWidth={2} fill="#000000" fillOpacity={0.08} name="Sessions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={20}
                  title="Recorded Sessions per Day"
                  reason="No visitor or session counts have been recorded yet."
                  wide
                />
              ))}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE V: PRICING ELASTICITY & MARGINS (GRAPHS 21–25) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite V: Pricing Elasticity & Margin Ratios (Trajectories 21–25)
            </h2>
            <span className="text-[10px] font-mono text-black/50">Order totals only</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 21 */}
            {isVisible(21) && (
              <NoDataTrajectory
                n={21}
                title="Price Elasticity of Demand"
                reason="Demand at alternative price points is not measured."
              />
            )}

            {/* TRAJECTORY 22 */}
            {isVisible(22) && (
              <NoDataTrajectory
                n={22}
                title="Net Margin Spread after Production & Packaging"
                reason="Product costs are not recorded, so margin cannot be computed."
              />
            )}

            {/* TRAJECTORY 23 */}
            {isVisible(23) &&
              (discountSplit ? (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 23</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Full-Price vs Discounted Gross Volume</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Share of recorded gross volume (%)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={discountSplit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="channel" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="share" fill="#000000" name="Share of Gross Volume (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={23}
                  title="Full-Price vs Discounted Gross Volume"
                  reason="No orders have been recorded yet."
                />
              ))}

            {/* TRAJECTORY 24 */}
            {isVisible(24) && (
              <NoDataTrajectory
                n={24}
                title="Revenue Optimization Ridge (Price × Demand)"
                reason="Demand at alternative price points is not measured."
              />
            )}

            {/* TRAJECTORY 25 */}
            {isVisible(25) && (
              <NoDataTrajectory
                n={25}
                title="Contribution Margin Progression by Garment Tier"
                reason="Product costs are not recorded, so contribution margin cannot be computed."
                wide
              />
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE VI: LOGISTICS & FULFILLMENT (GRAPHS 26–30) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite VI: Logistics & Atelier Fulfillment (Trajectories 26–30)
            </h2>
            <span className="text-[10px] font-mono text-black/50">Order records only</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 26 */}
            {isVisible(26) && (
              <NoDataTrajectory
                n={26}
                title="Order Fulfillment Cycle Time (Hours)"
                reason="Fulfillment timing is not recorded on orders."
              />
            )}

            {/* TRAJECTORY 27 */}
            {isVisible(27) && (
              <NoDataTrajectory
                n={27}
                title="Courier Carrier Allocation & On-Time Arrival"
                reason="Carrier and on-time data are not recorded."
              />
            )}

            {/* TRAJECTORY 28 */}
            {isVisible(28) && (
              <NoDataTrajectory
                n={28}
                title="Packaging Weight & Volumetric Density"
                reason="Packaging data is not recorded."
              />
            )}

            {/* TRAJECTORY 29 */}
            {isVisible(29) &&
              (weekdayOrders ? (
                <div className="space-y-3 pb-6 border-b border-black/10">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-black/40 block">Trajectory 29</span>
                      <h3 className="font-editorial text-2xl font-normal text-black">Orders Placed by Weekday</h3>
                    </div>
                    <span className="text-[11px] font-mono text-black/60">Count of recorded orders (Mon–Sun)</span>
                  </div>
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayOrders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="day" stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} />
                        <YAxis stroke="#000000" tick={{ fontSize: 9 }} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="placed" fill="#000000" name="Orders Placed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <NoDataTrajectory
                  n={29}
                  title="Orders Placed by Weekday"
                  reason="No orders have been recorded yet."
                />
              ))}

            {/* TRAJECTORY 30 */}
            {isVisible(30) && (
              <NoDataTrajectory
                n={30}
                title="Inventory Reorder Point Proximity (Safety Stock Band)"
                reason="Reorder thresholds are not configured or recorded."
                wide
              />
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE VII: PREDICTIVE ATELIER FORECAST (GRAPHS 31–35) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite VII: Predictive Atelier Forecasting (Trajectories 31–35)
            </h2>
            <span className="text-[10px] font-mono text-black/50">No forecast source recorded</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 31 */}
            {isVisible(31) && (
              <NoDataTrajectory
                n={31}
                title="Forward Forecast with Confidence Band"
                reason="No forecast model output is stored for this store."
              />
            )}

            {/* TRAJECTORY 32 */}
            {isVisible(32) && (
              <NoDataTrajectory
                n={32}
                title="Seasonal Fabric Demand Weighting"
                reason="Fabric and material demand are not recorded."
              />
            )}

            {/* TRAJECTORY 33 */}
            {isVisible(33) && (
              <NoDataTrajectory
                n={33}
                title="Next-Drop Waitlist Surge Density"
                reason="Waitlist signups are not reported into analytics."
              />
            )}

            {/* TRAJECTORY 34 */}
            {isVisible(34) && (
              <NoDataTrajectory
                n={34}
                title="Atelier Capacity Utilization Rate (%)"
                reason="Atelier capacity is not tracked."
              />
            )}

            {/* TRAJECTORY 35 */}
            {isVisible(35) && (
              <NoDataTrajectory
                n={35}
                title="Zero-Waste Pattern Cutting Yield Efficiency (%)"
                reason="Material yield is not tracked."
                wide
              />
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* SUITE VIII: RISK, RETURNS & VOLATILITY (GRAPHS 36–40) */}
        {/* ---------------------------------------------------- */}
        <div className="space-y-8">
          <div className="flex items-baseline justify-between border-b border-black/20 pb-2">
            <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-black">
              Suite VIII: Archival Risk, Returns & Volatility (Trajectories 36–40)
            </h2>
            <span className="text-[10px] font-mono text-black/50">No risk source recorded</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* TRAJECTORY 36 */}
            {isVisible(36) && (
              <NoDataTrajectory
                n={36}
                title="Archival Return Rate (%) by Category"
                reason="Returns are not recorded."
              />
            )}

            {/* TRAJECTORY 37 */}
            {isVisible(37) && (
              <NoDataTrajectory
                n={37}
                title="Payment Gateway Authorization Success Rate"
                reason="Payment authorisation results are not recorded."
              />
            )}

            {/* TRAJECTORY 38 */}
            {isVisible(38) && (
              <NoDataTrajectory
                n={38}
                title="Chargeback Risk & Fraud Prevention Friction"
                reason="Chargeback data is not recorded."
              />
            )}

            {/* TRAJECTORY 39 */}
            {isVisible(39) && (
              <NoDataTrajectory
                n={39}
                title="Private Concierge Inquiries per 100 Orders"
                reason="Concierge inquiries are not recorded."
              />
            )}

            {/* TRAJECTORY 40 */}
            {isVisible(40) && (
              <NoDataTrajectory
                n={40}
                title="Atelier Sovereign Health Index (Composite Radar)"
                reason="No verified source data exists to build this composite index."
                wide
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
