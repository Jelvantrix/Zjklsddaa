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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { id: 'products', label: 'Tuotteet & Arkisto (Products)', icon: Package },
    { id: 'collections', label: 'Kokoelmat & Pudotukset (Collections & Drops)', icon: Layers },
    { id: 'categories', label: 'Kategoriapuu (Categories)', icon: FolderTree },
    { id: 'media', label: 'Mediakirjasto (Media Library)', icon: Image },
    { id: 'orders', label: 'Tilaukset (Orders)', icon: ShoppingBag },
    { id: 'advisor', label: 'Tekoälyneuvonantaja (AI Advisor)', icon: Sparkles },
    { id: 'settings', label: 'Asetukset (Store Settings)', icon: Settings },
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
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl bg-white border border-black shadow-2xl z-10 overflow-hidden animate-fadeIn">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/15 bg-white">
          <Search className="w-4 h-4 text-black/40 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hae tuotteita, pudotuksia tai toimintoja... (Cmd+K)"
            className="w-full text-xs font-mono bg-transparent focus:outline-none placeholder:text-black/30"
          />
          <button onClick={onClose} className="p-1 text-black/40 hover:text-black cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-black/5">
          {/* Matched Products */}
          {filteredProducts.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black/40">
                Tuotteet ({filteredProducts.length})
              </div>
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-black/5 flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] font-semibold">{p.nr || p.plateNumber}</span>
                    <span className="text-xs">{p.name.fi}</span>
                    <span className="text-[10px] text-black/40">({p.name.en})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium">{p.price} €</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation Shortcuts */}
          <div className="py-2">
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-black/40">
              Pikasiirtymät
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
                  className="w-full px-3 py-2 text-left hover:bg-black/5 flex items-center justify-between group transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-black/50" />
                    <span className="text-xs font-mono">{n.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-black/20 group-hover:text-black" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-black/10 bg-black/[0.02] flex items-center justify-between text-[10px] font-mono text-black/40">
          <span>Selaa nuolinäppäimillä</span>
          <span>Sulje ESC</span>
        </div>
      </div>
    </div>
  );
};
