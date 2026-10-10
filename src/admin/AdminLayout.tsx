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
import { supabase } from '../supabase/config';
import {
  subscribeToOrders,
  subscribeToCustomers,
  subscribeToWaitlist,
  logAuditEvent,
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

  // Security Audit Logs — loaded from the real auditLog table (empty until real activity exists)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refreshAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('auditLog')
        .select('*')
        .order('at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setAuditLogs(data as AuditLog[]);
      }
    } catch (err) {
      console.warn('Audit log load failed:', err);
    }
  }, []);

  useEffect(() => {
    refreshAuditLogs();
    try {
      const channel = supabase
        .channel('admin-audit-logs-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auditLog' }, () => {
          refreshAuditLogs();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Audit log subscription failed:', err);
      return () => {};
    }
  }, [refreshAuditLogs]);

  const handleUpdateAutoLock = (mins: number) => {
    setAutoLockMinutes(mins);
    localStorage.setItem('zejesh_sec_autolock_mins', mins.toString());
  };

  const handleLockTerminalNow = useCallback(() => {
    setIsTerminalLocked(true);
    sessionStorage.removeItem('zejesh_sec_unlocked_ts');
    void logAuditEvent(adminProfile?.email || 'admin', 'TERMINAL_LOCKED', 'Console Manual Lockout').finally(() =>
      refreshAuditLogs()
    );
  }, [adminProfile?.email, refreshAuditLogs]);

  const handleUnlockTerminal = () => {
    setIsTerminalLocked(false);
    sessionStorage.setItem('zejesh_sec_unlocked_ts', Date.now().toString());
    void logAuditEvent(adminProfile?.email || 'admin', 'TERMINAL_UNLOCKED', 'Security Gate Clearance').finally(() =>
      refreshAuditLogs()
    );
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
  const [discounts, setDiscounts] = useState<Discount[]>(() => {
    try {
      const saved = localStorage.getItem('zejesh_discounts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [insights, setInsights] = useState<AiInsight[]>([]);

  // Daily statistics computed from real orders only. Visitor/session/page-view
  // counts have no source here, so they are reported as 0 rather than invented.
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
          visitors: 0,
          sessions: 0,
          addToBags: 0,
          pageViews: 0,
        };
      }
      map[d].revenue += (o.totals?.total || 0);
      map[d].orders += 1;
      map[d].addToBags += (o.items || []).reduce((s, it) => s + (it.quantity || 0), 0);
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

  // Live operator presence — counted from real events recorded in the last 5 minutes.
  // Stays at 0 (and the badge is hidden) when nothing is recorded.
  const [liveVisitors, setLiveVisitors] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadLiveVisitors = async () => {
      try {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const { count, error } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .gte('timestamp', fiveMinutesAgo);
        if (!cancelled) {
          setLiveVisitors(!error && typeof count === 'number' ? count : 0);
        }
      } catch (err) {
        console.warn('Live visitor count failed:', err);
        if (!cancelled) setLiveVisitors(0);
      }
    };

    loadLiveVisitors();
    const timer = window.setInterval(loadLiveVisitors, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

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
    { id: 'content', label: 'Hero Slides & CMS', icon: FileText, badge: content?.heroSlides?.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'advisor', label: 'AI Advisor', icon: Sparkles, highlight: true },
    { id: 'security', label: 'Security & Audit', icon: ShieldCheck, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen text-[#000000] flex flex-col selection:text-white">
      {/* High-Grade Security Gate Lock Screen */}
      <AdminSecurityGate
        isLocked={isTerminalLocked}
        onUnlock={handleUnlockTerminal}
        onExitToStore={onBackToStorefront}
      />

      {/* TOP BAR: Clean Minimalist Style (No Boxes/Borders) */}
      <header className="h-16 bg-white px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
        <div className="flex items-center gap-6">
          {/* Mobile navigation trigger */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="text-black hover:opacity-60 md:hidden cursor-pointer"
            aria-label="Toggle admin navigation"
          >
            {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-black/40 hover:text-black cursor-pointer hidden md:block transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-title font-normal">ZEJESH</span>
            <span className="text-small text-black/40 hidden xs:inline">
              Admin
            </span>
          </div>

          {liveVisitors > 0 && (
            <div className="hidden lg:flex items-center gap-2 text-small text-black/50">
              <span>{liveVisitors} Active</span>
            </div>
          )}
        </div>

        {/* Global Search & Actions: Pure Typography, No Box Containers */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-1.5 text-small text-black/60 hover:text-black cursor-pointer hover:underline"
          >
            <Search className="w-3.5 h-3.5 text-black/50" />
            <span>Search</span>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="text-black hover:opacity-60 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[1.5]" />
          </button>

          {/* Lock Terminal Now Button */}
          <button
            type="button"
            onClick={handleLockTerminalNow}
            className="text-small text-black/60 hover:text-black cursor-pointer hover:underline flex items-center gap-1"
            title="Lock Terminal"
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
            className="text-small text-black/60 hover:text-black cursor-pointer hover:underline"
            title="Sign Out"
          >
            <span>Sign Out</span>
          </button>

          {/* Back to storefront link */}
          <button
            type="button"
            onClick={onBackToStorefront}
            className="text-small text-black hover:underline cursor-pointer flex items-center gap-1.5"
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
              className="fixed inset-0"
              onClick={() => setIsMobileNavOpen(false)}
            />

            {/* Slide-out Menu */}
            <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col justify-between p-6 z-10 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4">
                  <span className="text-title">Menu</span>
                  <button
                    type="button"
                    onClick={() => setIsMobileNavOpen(false)}
                    className="text-black/60 hover:text-black cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
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
                        className={`w-full flex items-center gap-3 py-1.5 text-small cursor-pointer text-left ${ isActive ?'text-black underline font-bold'
                            : 'text-black/70 hover:text-black'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-small text-black/40">({item.badge})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-6 text-small space-y-2">
                <div className="text-black font-medium">{adminProfile?.role || role}</div>
                <div className="text-black/50 truncate">{adminProfile?.email || 'Not signed in'}</div>
                <button
                  type="button"
                  onClick={onBackToStorefront}
                  className="w-full text-left pt-2 text-small text-black hover:underline cursor-pointer"
                >
                  Exit to Storefront →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Left Sidebar: Pure Typography */}
        <aside
          className={`${ isSidebarCollapsed ?'w-16' : 'w-56'
          } bg-white transition-all hidden md:flex flex-col justify-between shrink-0 select-none overflow-y-auto no-scrollbar py-6 px-4`}
        >
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 text-small transition-colors cursor-pointer text-left ${ isActive ?'text-black font-bold underline'
                      : 'text-black/50 hover:text-black'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge !== undefined && (
                    <span className="text-small text-black/30">
                      ({item.badge})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom user badge */}
          {!isSidebarCollapsed && (
            <div className="px-2 pt-6 text-small space-y-1">
              <div className="text-black/70 font-medium">{adminProfile?.role || role}</div>
              <div className="text-black/40 truncate">{adminProfile?.email || ''}</div>
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
