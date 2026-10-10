import React, { useState, useEffect } from 'react';
import { Search, X, Package, Layers, FolderTree, Image, ShoppingBag, Settings, Sparkles, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  onNavigateView: (view: string) => void;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onNavigateView,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickNav = [
    { id: 'products', label: 'Products & Archive', icon: Package },
    { id: 'collections', label: 'Collections & Drops', icon: Layers },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'media', label: 'Media Library', icon: Image },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Customers', icon: Package },
    { id: 'discounts', label: 'Discounts', icon: Package },
    { id: 'analytics', label: 'Analytics', icon: Package },
    { id: 'advisor', label: 'AI Advisor', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const filteredNav = quickNav.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = query.trim()
    ? products
        .filter(
          (p) =>
            p.nr?.toLowerCase().includes(query.toLowerCase()) ||
            p.name.fi.toLowerCase().includes(query.toLowerCase()) ||
            p.name.en.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
      <div onClick={onClose} className="fixed inset-0 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-white z-10 overflow-hidden animate-fadeIn">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 bg-white">
          <Search className="w-4 h-4 text-black/40 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, drops or actions..."
            className="w-full text-small bg-transparent placeholder:text-black/30"
          />
          <button onClick={onClose} className="p-1 text-black/40 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Matched Products */}
          {filteredProducts.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-small uppercase tracking-wider text-black/40">
                Products ({filteredProducts.length})
              </div>
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-small font-semibold">{p.nr || p.plateNumber}</span>
                    <span className="text-small">{p.name.en || p.name.fi}</span>
                    <span className="text-small text-black/40">({p.name.fi})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-small font-medium">{p.price} €</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Shortcuts */}
          <div className="py-2">
            <div className="px-3 py-1 text-small uppercase tracking-wider text-black/40">
              Quick Navigation
            </div>
            {filteredNav.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    onNavigateView(n.id);
                    onClose();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-black/50" />
                    <span className="text-small">{n.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-2 bg-white flex items-center justify-between text-small text-black/40">
          <span>Click to select action or navigate</span>
          <button onClick={onClose} className="hover:text-black cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
