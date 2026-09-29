import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Product, Order, Customer, WaitlistEntry, Discount, AiInsight, DailyStat } from '../types';
import { useAuth } from '../firebase/AuthContext';
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
import { useStorefrontData } from '../context/StorefrontDataContext';
import {
  SEED_ORDERS,
  SEED_CUSTOMERS,
  SEED_WAITLIST,
  SEED_DISCOUNTS,
  SEED_DAILY_STATS,
  SEED_INSIGHTS,
} from '../firebase/seedData';

interface AdminLayoutProps {
  onBackToStorefront: () => void;
  onViewProductInStore: (product: Product) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onBackToStorefront,
  onViewProductInStore,
}) => {
  const { role, switchRole, adminProfile, isOwner } = useAuth();
  const { products, collections, categories, content, settings, resetDemoData } = useStorefrontData();

  // Active Admin Subview
  const [currentView, setCurrentView] = useState<string>('products');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Local state for datasets
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(SEED_WAITLIST);
  const [discounts, setDiscounts] = useState<Discount[]>(SEED_DISCOUNTS);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>(SEED_DAILY_STATS);
  const [insights, setInsights] = useState<AiInsight[]>(SEED_INSIGHTS);

  // Command palette & notifications state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Product Editor Drawer State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditorDrawerOpen, setIsEditorDrawerOpen] = useState(false);

  // Live "Visitors now" pulse simulation (e.g. 11 - 18)
  const [liveVisitors, setLiveVisitors] = useState(14);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveVisitors(12 + Math.floor(Math.random() * 7));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Archive', icon: Package, badge: products.length },
    { id: 'collections', label: 'Collections & Drops', icon: Layers, badge: collections.length },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'media', label: 'Media Library', icon: ImageIcon },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, badge: orders.length },
    { id: 'inventory', label: 'Inventory Control', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users, badge: customers.length },
    { id: 'waitlist', label: 'Waitlists', icon: Clock, badge: 'VIP' },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'content', label: 'Store Content', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'advisor', label: 'AI Advisor', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#000000] flex flex-col font-sans selection:bg-black selection:text-white">
      {/* TOP BAR */}
      <header className="h-14 border-b border-black/[0.08] bg-white px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:opacity-60 cursor-pointer hidden sm:block text-black"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-editorial text-lg tracking-wider font-semibold">ZEJESH</span>
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/50 pl-2 border-l border-black/20">
              STUDIO ADMIN
            </span>
          </div>

          {/* Visitors Now Pulsing Counter */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-black/10 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            <span className="text-black/50">Live Visitors:</span>
            <span className="font-medium text-black">{liveVisitors}</span>
          </div>
        </div>

        {/* Global Search (Cmd+K trigger) & Quick Actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 py-1 px-1 text-xs font-mono text-black/60 hover:text-black cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-black/60" />
            <span>Search</span>
            <kbd className="text-[10px] font-mono text-black/40">⌘K</kbd>
          </button>

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="p-1.5 text-black hover:opacity-60 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 stroke-[1.5]" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-black rounded-full" />
          </button>

          {/* Role indicator & switcher */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-black/10">
            <span className="text-[11px] font-mono text-black/50">Role:</span>
            <select
              value={role || 'owner'}
              onChange={(e) => switchRole(e.target.value as any)}
              className="py-0.5 text-[11px] font-mono bg-transparent cursor-pointer font-medium uppercase focus:outline-none"
            >
              <option value="owner">Owner (Full Admin)</option>
              <option value="editor">Editor (Write Access)</option>
              <option value="viewer">Viewer (Read Only)</option>
            </select>
          </div>

          {/* Back to storefront button: pure text */}
          <button
            type="button"
            onClick={onBackToStorefront}
            className="py-1 px-1 text-xs font-mono uppercase tracking-wider text-black hover:opacity-60 transition-opacity flex items-center gap-1.5 cursor-pointer underline underline-offset-4"
          >
            <span>Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* BODY WITH SIDEBAR AND MAIN STAGE */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-16' : 'w-60'
          } border-r border-black/[0.08] bg-white transition-all duration-300 flex flex-col justify-between shrink-0 select-none overflow-y-auto no-scrollbar`}
        >
          <div className="p-3 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  className={`w-full relative flex items-center gap-3 px-3 py-2 text-xs font-mono transition-colors cursor-pointer ${
                    isActive
                      ? 'text-black font-semibold'
                      : 'text-black/60 hover:text-black'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-black" />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge && (
                    <span className="text-[10px] font-mono text-black/50">
                      ({item.badge})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom user badge */}
          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-black/[0.08] text-xs font-mono">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-black/60" />
                <span className="font-semibold text-black uppercase tracking-wider">{adminProfile?.role || role}</span>
              </div>
              <div className="text-[11px] text-black/50 truncate">{adminProfile?.email || 'owner@zejesh.fi'}</div>
            </div>
          )}
        </aside>

        {/* Main Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white">
          {currentView === 'dashboard' && (
            <AdminAnalyticsView products={products} dailyStats={dailyStats} />
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
              onRefresh={() => {}}
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
            <AdminCustomersView customers={customers} orders={orders} />
          )}

          {currentView === 'waitlist' && (
            <AdminWaitlistView waitlist={waitlist} onRefresh={() => {}} />
          )}

          {currentView === 'discounts' && (
            <AdminDiscountsView discounts={discounts} onRefresh={() => {}} />
          )}

          {currentView === 'content' && (
            <AdminContentView content={content} onRefresh={() => {}} />
          )}

          {currentView === 'analytics' && (
            <AdminAnalyticsView products={products} dailyStats={dailyStats} />
          )}

          {currentView === 'advisor' && (
            <AdminAdvisorView
              products={products}
              dailyStats={dailyStats}
              insights={insights}
              onRefresh={() => {}}
              onNavigateView={(v) => setCurrentView(v)}
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
        onSaveSuccess={(updated) => {}}
      />
    </div>
  );
};
