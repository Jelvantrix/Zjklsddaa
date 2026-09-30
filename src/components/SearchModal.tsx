import React, { useState, useMemo } from 'react';
import { Product, Language } from '../types';
import { ARCHIVE_PRODUCTS, translations, formatPrice } from '../data/mockData';
import { FashionImage } from './FashionImage';
import { X, Search } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');
  const t = translations[language];

  const suggestedQueries = [
    'Wool',
    'Overcoat',
    'Cashmere',
    'Linen',
    'Leather',
    'Tailored Trousers',
    'Winter 2026',
  ];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return ARCHIVE_PRODUCTS.filter(
      (p) =>
        (p.name.en || p.name.fi).toLowerCase().includes(q) ||
        p.plateNumber.toLowerCase().includes(q) ||
        (p.material.en || p.material.fi).toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col overflow-y-auto animate-fadeIn select-none">
      {/* Top Search Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 border-b border-black/10 flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 flex items-center gap-2.5 sm:gap-3">
          <Search className="w-5 h-5 text-black/50 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pieces, materials, plate numbers..."
            className="w-full text-lg sm:text-2xl font-editorial font-light tracking-wide outline-none placeholder:text-black/30 bg-transparent"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-black/60 hover:text-black transition-colors cursor-pointer"
          aria-label={t.nav.close}
        >
          <X className="w-6 h-6 stroke-[1.5]" />
        </button>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1">
        {!query.trim() ? (
          <div>
            <p className="text-[10.5px] sm:text-[11px] tracking-[0.18em] uppercase text-black/40 mb-3 sm:mb-4 font-mono">
              SUGGESTED SEARCHES
            </p>
            <div className="flex flex-wrap gap-4 sm:gap-6 mb-8 sm:mb-12">
              {suggestedQueries.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setQuery(item)}
                  className="text-xs font-mono uppercase tracking-wider text-black/60 hover:text-black hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="text-[10.5px] sm:text-[11px] tracking-[0.18em] uppercase text-black/40 mb-4 sm:mb-6 font-mono">
              ARCHIVE HIGHLIGHTS
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {ARCHIVE_PRODUCTS.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="group cursor-pointer"
                >
                  <FashionImage
                    product={product}
                    src={product.image}
                    alt={product.name.en || product.name.fi}
                    position={product.cropVariation.packshot.position}
                    scale={product.cropVariation.packshot.scale}
                    aspectRatio="3/4"
                    className="mb-2 sm:mb-3 border border-black/5"
                  />
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-black/40 block">
                    {product.plateNumber}
                  </span>
                  <h4 className="text-xs font-sans font-medium text-black group-hover:underline underline-offset-4 truncate">
                    {product.name.en || product.name.fi}
                  </h4>
                  <p className="text-xs font-mono text-black/60">
                    {formatPrice(product.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6 sm:mb-8 pb-3 border-b border-black/10">
              <span className="text-xs font-mono text-black/60">
                {results.length} results for "{query}"
              </span>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs underline text-black/50 hover:text-black cursor-pointer"
              >
                Clear search
              </button>
            </div>

            {results.length === 0 ? (
              <div className="py-16 sm:py-20 text-center">
                <p className="text-lg font-serif text-black/70 mb-2">
                  No results found
                </p>
                <p className="text-xs text-black/40">
                  Try another keyword or explore the entire archive.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                {results.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="group cursor-pointer"
                  >
                    <FashionImage
                      product={product}
                      src={product.image}
                      alt={product.name[language]}
                      position={product.cropVariation.packshot.position}
                      scale={product.cropVariation.packshot.scale}
                      aspectRatio="3/4"
                      className="mb-2 sm:mb-3 border border-black/5"
                    />
                    <span className="text-[9.5px] sm:text-[10px] font-mono text-black/40 block">
                      {product.plateNumber}
                    </span>
                    <h4 className="text-xs font-sans font-medium text-black group-hover:underline underline-offset-4 truncate">
                      {product.name[language]}
                    </h4>
                    <p className="text-xs font-mono text-black/60">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
