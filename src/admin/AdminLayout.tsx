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
  Radio,
} from 'lucide-react';
import { Product, Order, AiInsight } from '../types';
import { useAuth } from '../firebase/AuthContext';
import { AdminCommandPalette } from './AdminCommandPalette';
import { AdminNotificationsModal } from './AdminNotificationsModal';
import { AdminProductsView } from './products/AdminProductsView';
import { AdminProductEditorDrawer } from './products/AdminProductEditorDrawer';
import { AdminCollectionsView } from './collections/AdminCollectionsView';
import { AdminCategoriesView } from './categories/AdminCategoriesView';
import { AdminMediaView } from './media/AdminMediaView';
import { useStorefrontData } from '../context/StorefrontDataContext';

interface AdminLayoutProps {
  onBackToStorefront: () => void;
  onViewProductInStore: (product: Product) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onBackToStorefront,
  onViewProductInStore,
}) => {
  const { role, switchRole, adminProfile, isOwner } = useAuth();
  const { products, collections, categories, resetDemoData } = useStorefrontData();

  // Active Admin Subview
  const [currentView, setCurrentView] = useState<string>('products');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    { id: 'products', label: 'Tuotteet & Arkisto', icon: Package, badge: products.length },
    { id: 'collections', label: 'Kokoelmat & Dropit', icon: Layers, badge: collections.length },
    { id: 'categories', label: 'Kategoriapuu', icon: FolderTree },
    { id: 'media', label: 'Mediakirjasto', icon: ImageIcon },
    { id: 'orders', label: 'Tilaukset', icon: ShoppingBag, badge: '40' },
    { id: 'inventory', label: 'Varastonhallinta', icon: Boxes },
    { id: 'customers', label: 'Asiakkaat', icon: Users },
    { id: 'waitlist', label: 'Odotuslistat', icon: Clock, badge: 'VIP' },
    { id: 'discounts', label: 'Alennuskoodit', icon: Percent },
    { id: 'content', label: 'Kaupan Sisältö', icon: FileText },
    { id: 'analytics', label: 'Analytiikka', icon: BarChart3 },
    { id: 'advisor', label: 'Tekoälyneuvonantaja', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Asetukset', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#000000] flex flex-col font-sans selection:bg-black selection:text-white">
      {/* TOP BAR */}
      <header className="h-14 border-b border-black/15 bg-white px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-black/5 border border-black/10 cursor-pointer hidden sm:block"
            title={isSidebarCollapsed ? 'Laajenna sivupalkki' : 'Pienennä sivupalkki'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-editorial text-lg tracking-wider font-semibold">ZEJESH</span>
            <span className="font-mono text-[10px] tracking-widest uppercase bg-black text-white px-1.5 py-0.5">
              STUDIO ADMIN
            </span>
          </div>

          {/* Visitors Now Pulsing Counter */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-black/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-black/60">Kävijöitä nyt:</span>
            <span className="font-bold text-black">{liveVisitors}</span>
          </div>
        </div>

        {/* Global Search (Cmd+K trigger) & Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 border border-black/15 hover:border-black bg-black/[0.02] text-xs font-mono text-black/50 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-black/60" />
            <span>Pikahaku...</span>
            <kbd className="text-[10px] bg-black/10 px-1 py-0.5 rounded text-black font-semibold">⌘K</kbd>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 border border-black/15 hover:border-black relative cursor-pointer"
            title="Ilmoitukset"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full" />
          </button>

          {/* Role indicator & switcher badge */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-black/10">
            <span className="text-[11px] font-mono text-black/50">Rooli:</span>
            <select
              value={role || 'owner'}
              onChange={(e) => switchRole(e.target.value as any)}
              className="px-2 py-1 text-[11px] font-mono border border-black/20 focus:border-black bg-white cursor-pointer font-semibold uppercase"
            >
              <option value="owner">Owner (Pääkäyttäjä)</option>
              <option value="editor">Editor (Muokkaaja)</option>
              <option value="viewer">Viewer (Lukuoikeus)</option>
            </select>
          </div>

          {/* Back to storefront button */}
          <button
            onClick={onBackToStorefront}
            className="px-3 py-1.5 bg-white border border-black hover:bg-black hover:text-white text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Kauppaan</span>
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
          } border-r border-black/15 bg-white transition-all duration-300 flex flex-col justify-between shrink-0 select-none overflow-y-auto no-scrollbar`}
        >
          <div className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-mono transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-black text-white font-semibold'
                      : item.highlight
                      ? 'text-black bg-black/[0.04] hover:bg-black/10'
                      : 'text-black/70 hover:text-black hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive ? 'bg-white text-black' : 'bg-black/10 text-black'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom user badge */}
          {!isSidebarCollapsed && (
            <div className="p-3 border-t border-black/10 bg-black/[0.02] text-xs font-mono">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-black/60" />
                <span className="font-semibold text-black uppercase tracking-wider">{adminProfile?.role || role}</span>
              </div>
              <div className="text-[11px] text-black/50 truncate">{adminProfile?.email || 'owner@zejesh.fi'}</div>
            </div>
          )}
        </aside>

        {/* Main Stage */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
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

          {/* Placeholders for M3/M4/M5 views that route cleanly */}
          {['dashboard', 'orders', 'inventory', 'customers', 'waitlist', 'discounts', 'content', 'analytics', 'advisor', 'settings'].includes(
            currentView
          ) && (
            <div className="p-8 border border-black/15 bg-white text-center space-y-3 font-mono text-xs max-w-xl mx-auto my-12">
              <span className="font-semibold uppercase tracking-wider text-sm block">
                Näkymä: {currentView.toUpperCase()}
              </span>
              <p className="text-black/60">
                Tämä osio kytkeytyy seuraavissa virstanpylväissä (M3/M4/M5).
              </p>
              <button
                onClick={() => setCurrentView('products')}
                className="mt-3 px-4 py-2 bg-black text-white hover:bg-black/80 uppercase tracking-wider cursor-pointer"
              >
                Palaa tuotehallintaan
              </button>
            </div>
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
        orders={[]}
        insights={[]}
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
