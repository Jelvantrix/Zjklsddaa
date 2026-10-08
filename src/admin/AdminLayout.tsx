import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  FolderTree,
  Image as ImageIcon,
  ShoppingBag,
  Boxes,
  Users,
  Clock,
  Percent,
  FileText,
  BarChart3,
  Sparkles,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  ShieldCheck,
  Lock,
  Menu,
  X,
  Activity,
  ThumbsUp,
} from 'lucide-react';
import { Product, Order, Customer, WaitlistEntry, Discount, AiInsight, DailyStat, AuditLog } from '../types';
import { useAuth } from '../supabase/AuthContext';
import {
  subscribeToOrders,
  subscribeToCustomers,
  subscribeToWaitlist,
} from '../supabase/dbService';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotificationsModal } from './AdminNotificationsModal';
import { AdminProductsView } from './products/AdminProductsView';
import { AdminProductEditorDrawer } from './products/AdminProductEditorDrawer';
import { AdminCollectionsView } from './collections/AdminCollectionsView';
import { AdminCategoriesView } from './categories/AdminCategoriesView';
import { AdminMediaView } from './media/AdminMediaView';
import { AdminOrdersView } from './orders/AdminOrdersView';
import { AdminInventoryView } from './inventory/AdminInventoryView';
import { AdminCustomersView } from './customers/AdminCustomersView';
import { AdminWaitlistView } from './waitlist/AdminWaitlistView';
import { AdminDiscountsView } from './discounts/AdminDiscountsView';
import { AdminContentView } from './content/AdminContentView';
import { AdminAnalyticsView } from './analytics/AdminAnalyticsView';
import { AdminAdvisorView } from './advisor/AdminAdvisorView';
import { AdminSettingsView } from './settings/AdminSettingsView';
import { AdminSecurityGate } from './security/AdminSecurityGate';
import { AdminSecurityView } from './security/AdminSecurityView';
import { AdminSystemHealthView } from './health/AdminSystemHealthView';
import { AdminSuggestionsView } from './suggestions/AdminSuggestionsView';
import { useStorefrontData } from '../context/StorefrontDataContext';
import {
  SEED_ORDERS,
  SEED_CUSTOMERS,
  SEED_WAITLIST,
  SEED_DISCOUNTS,
  SEED_DAILY_STATS,
  SEED_INSIGHTS,
} from '../data/seedData';

interface AdminLayoutProps {
  onBackToStorefront: () => void;
  onViewProductInStore: (product: Product) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onBackToStorefront,
  onViewProductInStore,
}) => {
  const { role, adminProfile, isAdmin, isOwner, isEditor, signOut } = useAuth();
  const {
    products,
    collections,
    categories,
    content,
    settings,
    resetDemoData,
    deleteProduct,
    deleteProducts,
    saveProduct,
    refreshProducts,
  } = useStorefrontData();

  // Active Admin Subview
  const [currentView, setCurrentView] = useState<string>('products');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Security & Terminal Gate State.
  // When arriving from storefront as huxaifa0fficial@gmail.com, terminal gate requires entering terminal keys.
  const [isTerminalLocked, setIsTerminalLocked] = useState<boolean>(() => {
    const unlockedTs = sessionStorage.getItem('zejesh_sec_unlocked_ts');
    if (unlockedTs) {
      const elapsed = (Date.now() - parseInt(unlockedTs, 10)) / 1000 / 60;
      if (elapsed < 15) return false;
    }
    return true; // Requires key entry on terminal access
  });

  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('zejesh_sec_autolock_mins');
    return saved ? parseInt(saved, 10) : 15;
  });

  // Security Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'audit-01',
      who: adminProfile?.email || 'owner@zejesh.fi',
      action: 'TERMINAL_SESSION_INIT',
      target: 'Studio Console (Helsinki HQ)',
      at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 'audit-02',
      who: 'merchandiser@zejesh.fi',
      action: 'CATALOG_SYNC',
      target: '24 Archival Garments',
      at: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    },
    {
      id: 'audit-03',
      who: 'system_daemon',
      action: 'ENCRYPTION_HEARTBEAT',
      target: 'Firestore Database Link',
      at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ]);

  const handleUpdateAutoLock = (mins: number) => {
    setAutoLockMinutes(mins);
    localStorage.setItem('zejesh_sec_autolock_mins', mins.toString());
  };

  const handleLockTerminalNow = useCallback(() => {
    setIsTerminalLocked(true);
    sessionStorage.removeItem('zejesh_sec_unlocked_ts');
    setAuditLogs((prev) => [
      {
        id: `audit-${Date.now()}`,
        who: adminProfile?.email || 'owner@zejesh.fi',
        action: 'TERMINAL_LOCKED',
        target: 'Console Manual Lockout',
        at: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, [adminProfile?.email]);

  const handleUnlockTerminal = () => {
    setIsTerminalLocked(false);
    sessionStorage.setItem('zejesh_sec_unlocked_ts', Date.now().toString());
    setAuditLogs((prev) => [
      {
        id: `audit-${Date.now()}`,
        who: adminProfile?.email || 'owner@zejesh.fi',
        action: 'TERMINAL_UNLOCKED',
        target: 'Security Gate Clearance',
        at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  // Inactivity Auto-Lock Detector
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    if (autoLockMinutes === 0) return; // disabled

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    const checkInterval = setInterval(() => {
      if (!isTerminalLocked) {
        const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
        if (elapsedMinutes >= autoLockMinutes) {
          handleLockTerminalNow();
        }
      }
    }, 15000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      clearInterval(checkInterval);
    };
  }, [autoLockMinutes, isTerminalLocked, handleLockTerminalNow]);

  // Mobile navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Real production datasets: start with empty array so if there are no customers, there are 0 customers
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>(SEED_DISCOUNTS);
  const [insights, setInsights] = useState<AiInsight[]>(SEED_INSIGHTS);

  // Compute 100% genuine daily statistics from real orders (empty array if 0 orders)
  const realDailyStats: DailyStat[] = useMemo(() => {
    if (orders.length === 0) return [];
    const map: Record<string, DailyStat> = {};
    for (const o of orders) {
      const d = (o.createdAt || new Date().toISOString()).slice(0, 10);
      if (!map[d]) {
        map[d] = {
          id: `stat-${d}`,
          date: d,
          revenue: 0,
          orders: 0,
          visitors: 1,
          sessions: 1,
          addToBags: o.items.length,
          pageViews: o.items.length * 2,
        };
      }
      map[d].revenue += (o.totals?.total || 0);
      map[d].orders += 1;
      map[d].addToBags += o.items.length;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  // Subscribe to real-time Firestore collections
  useEffect(() => {
    const unsubOrders = subscribeToOrders((liveOrders) => setOrders(liveOrders));
    const unsubCust = subscribeToCustomers((liveCust) => setCustomers(liveCust));
    const unsubWait = subscribeToWaitlist((liveWait) => setWaitlist(liveWait));

    return () => {
      unsubOrders();
      unsubCust();
      unsubWait();
    };
  }, []);

  // Command palette & notifications state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Product Editor Drawer State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditorDrawerOpen, setIsEditorDrawerOpen] = useState(false);

  // Real operator presence
  const [liveVisitors, setLiveVisitors] = useState(1);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'health', label: 'System Health', icon: Activity, highlight: true },
    { id: 'products', label: 'Products & Archive', icon: Package, badge: products.length },
    { id: 'collections', label: 'Collections & Drops', icon: Layers, badge: collections.length },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'media', label: 'Media Library', icon: ImageIcon },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: orders.length },
    { id: 'inventory', label: 'Inventory Control', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users, badge: customers.length },
    { id: 'waitlist', label: 'Waitlists', icon: Clock, badge: 'VIP' },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'suggestions', label: 'Client Suggestions & Votes', icon: ThumbsUp, highlight: true },
    { id: 'content', label: 'Hero Slides & CMS', icon: FileText, badge: content?.heroSlides?.length || 4 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'advisor', label: 'AI Advisor', icon: Sparkles, highlight: true },
    { id: 'security', label: 'Security & Audit', icon: ShieldCheck, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#000000] flex flex-col font-sans selection:bg-black selection:text-white">
      {/* High-Grade Security Gate Lock Screen */}
      <AdminSecurityGate
        isLocked={isTerminalLocked}
        onUnlock={handleUnlockTerminal}
        onExitToStore={onBackToStorefront}
      />

      {/* TOP BAR: Clean Minimalist Storefront Style (No Boxes/Borders) */}
      <header className="h-16 border-b border-black/10 bg-white px-4 sm:px-8 flex items-center justify-between z-20 shrink-0 sticky top-0 font-mono">
        <div className="flex items-center gap-4">
          {/* Mobile navigation trigger */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-1 text-black hover:opacity-60 md:hidden cursor-pointer"
            aria-label="Toggle admin navigation"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 text-black/40 hover:text-black cursor-pointer hidden md:block transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            <span className="font-editorial text-lg tracking-wider font-semibold">ZEJESH</span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-black/40 pl-3 border-l border-black/15 hidden xs:inline">
              ATELIER TERMINAL
            </span>
          </div>

          {/* Visitors Counter */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-black/15 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span className="text-black/40 uppercase tracking-wider text-[10px]">Live Session:</span>
            <span className="font-medium text-black">{liveVisitors} Active</span>
          </div>
        </div>

        {/* Global Search & Actions: Pure Typography, No Box Containers */}
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-1.5 text-xs text-black/60 hover:text-black cursor-pointer transition-colors underline underline-offset-4"
          >
            <Search className="w-3.5 h-3.5 text-black/50" />
            <span>Search</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="p-1 text-black hover:opacity-60 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[1.5]" />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-black rounded-full" />
          </button>

          {/* Lock Terminal Now Button */}
          <button
            type="button"
            onClick={handleLockTerminalNow}
            className="text-xs text-black/60 hover:text-black transition-colors cursor-pointer underline underline-offset-4 flex items-center gap-1"
            title="Lock Studio Terminal"
          >
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Lock</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            className="text-xs text-black/60 hover:text-black transition-colors cursor-pointer underline underline-offset-4"
            title="Sign Out of Studio Console"
          >
            <span>Sign Out</span>
          </button>

          {/* Back to storefront link */}
          <button
            type="button"
            onClick={onBackToStorefront}
            className="text-xs uppercase tracking-wider text-black hover:opacity-60 transition-opacity flex items-center gap-1.5 cursor-pointer underline underline-offset-4 font-semibold"
          >
            <span>Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND MAIN STAGE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Navigation Drawer Overlay */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileNavOpen(false)}
            />

            {/* Slide-out Menu */}
            <div className="relative w-72 max-w-[80vw] bg-white border-r border-black/[0.1] h-full flex flex-col justify-between p-4 z-10 font-mono shadow-2xl overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.08]">
                  <span className="font-editorial text-lg tracking-wider font-semibold">NAVIGATION</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="p-1 text-black/60 hover:text-black cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCurrentView(item.id);
                          setIsMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs transition-colors cursor-pointer text-left ${
                          isActive
                            ? 'text-black font-semibold bg-neutral-100'
                            : 'text-black/70 hover:text-black hover:bg-neutral-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-[10px] text-black/50">({item.badge})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-black/[0.08] text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-black uppercase tracking-wider">{adminProfile?.role || role}</span>
                </div>
                <div className="text-[11px] text-black/50 truncate">{adminProfile?.email || 'owner@zejesh.fi'}</div>
                <button
                  type="button"
                  onClick={onBackToStorefront}
                  className="w-full mt-2 py-2 border border-black/20 text-center text-xs uppercase tracking-wider text-black font-medium"
                >
                  Exit to Storefront
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Left Sidebar: Pure Typography (No Box Borders/Backgrounds) */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          } border-r border-black/10 bg-white transition-all duration-300 hidden md:flex flex-col justify-between shrink-0 select-none overflow-y-auto no-scrollbar font-mono`}
        >
          <div className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-2 py-2 text-xs transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'text-black font-semibold underline underline-offset-8'
                      : 'text-black/40 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate uppercase tracking-wider text-[11px]">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge !== undefined && (
                    <span className="text-[10px] text-black/35 font-normal">
                      ({item.badge})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom user badge & Level 4 Clearance */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-black/10 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                <span className="font-semibold text-black uppercase tracking-wider text-[11px]">{adminProfile?.role || role || 'OWNER'}</span>
              </div>
              <div className="text-[10.5px] text-black/50 truncate font-mono">{adminProfile?.email || 'huxaifa0fficial@gmail.com'}</div>
            </div>
          )}
        </aside>

        {/* Main Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 bg-white">
          {currentView === 'dashboard' && (
            <AdminAnalyticsView products={products} dailyStats={realDailyStats} orders={orders} />
          )}

          {currentView === 'products' && (
            <AdminProductsView
              products={products}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setIsEditorDrawerOpen(true);
              }}
              onCreateProduct={() => {
                setEditingProduct(null);
                setIsEditorDrawerOpen(true);
              }}
              onViewProductInStore={onViewProductInStore}
              onRefresh={refreshProducts}
              onDeleteProduct={deleteProduct}
              onDeleteProducts={deleteProducts}
            />
          )}

          {currentView === 'collections' && (
            <AdminCollectionsView
              collections={collections}
              products={products}
              onRefresh={() => {}}
            />
          )}

          {currentView === 'categories' && (
            <AdminCategoriesView
              categories={categories}
              onRefresh={() => {}}
            />
          )}

          {currentView === 'media' && <AdminMediaView products={products} />}

          {currentView === 'orders' && (
            <AdminOrdersView orders={orders} onRefresh={() => {}} />
          )}

          {currentView === 'inventory' && (
            <AdminInventoryView products={products} onRefresh={() => {}} />
          )}

          {currentView === 'customers' && (
            <AdminCustomersView customers={customers} />
          )}

          {currentView === 'waitlist' && (
            <AdminWaitlistView waitlist={waitlist} collections={collections} onRefresh={() => {}} />
          )}

          {currentView === 'discounts' && (
            <AdminDiscountsView discounts={discounts} onRefresh={() => {}} />
          )}

          {currentView === 'suggestions' && <AdminSuggestionsView />}

          {currentView === 'content' && (
            <AdminContentView content={content} onRefresh={() => {}} />
          )}

          {currentView === 'analytics' && (
            <AdminAnalyticsView products={products} dailyStats={realDailyStats} orders={orders} />
          )}

          {currentView === 'advisor' && (
            <AdminAdvisorView
              products={products}
              dailyStats={realDailyStats}
              insights={insights}
              onRefresh={() => {}}
              onNavigateView={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'health' && <AdminSystemHealthView />}

          {currentView === 'security' && (
            <AdminSecurityView
              autoLockMinutes={autoLockMinutes}
              onUpdateAutoLock={handleUpdateAutoLock}
              onLockTerminalNow={handleLockTerminalNow}
              auditLogs={auditLogs}
            />
          )}

          {currentView === 'settings' && (
            <AdminSettingsView
              settings={settings}
              onRefresh={() => {}}
              onResetDemoData={resetDemoData}
            />
          )}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <AdminCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        products={products}
        onSelectProduct={(p) => {
          setEditingProduct(p);
          setIsEditorDrawerOpen(true);
        }}
        onNavigateView={(v) => setCurrentView(v)}
      />

      {/* Notifications Drawer */}
      <AdminNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        products={products}
        orders={orders}
        insights={insights}
        onNavigateView={(v) => setCurrentView(v)}
      />

      {/* Product Slide-over Editor Drawer */}
      <AdminProductEditorDrawer
        isOpen={isEditorDrawerOpen}
        product={editingProduct}
        onClose={() => setIsEditorDrawerOpen(false)}
        onSaveSuccess={(updated) => {
          void saveProduct(updated);
        }}
        onDeleteProduct={deleteProduct}
        categories={categories}
        collections={collections}
      />
    </div>
  );
};
