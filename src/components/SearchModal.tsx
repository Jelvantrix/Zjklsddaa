import React, { useState, useMemo } from 'react';
import { Product, Language, translations, formatPrice } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
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
  const { products } = useStorefrontData();
  const [query, setQuery] = useState('');
  const t = translations[language];

  const suggestedQueries = [
    'Wool',
    'Overcoat',
    'Cashmere',
    'Linen',
    'Leather',
    'Tailored Trousers',
    'Winter',
  ];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return (products || []).filter(
      (p) =>
        ((p.name?.en || p.name?.fi || '').toLowerCase().includes(q)) ||
        ((p.plateNumber || p.nr || '').toLowerCase().includes(q)) ||
        ((p.material?.en || p.material?.fi || '').toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
    );
  }, [query, products]);

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
          onClick={onClose}
          className="p-1.5 sm:p-2 text-black/60 hover:text-black transition-colors cursor-pointer"
          aria-label={t.nav.close}
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Results / Suggestions Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {query.trim() === '' ? (
          <div>
            <p className="text-[10.5px] sm:text-[11px] tracking-[0.18em] uppercase text-black/40 mb-3 sm:mb-4 font-mono">
              SUGGESTED INQUIRIES
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

            {products.length > 0 && (
              <>
                <p className="text-[10.5px] sm:text-[11px] tracking-[0.18em] uppercase text-black/40 mb-4 sm:mb-6 font-mono">
                  ARCHIVE HIGHLIGHTS
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  {products.slice(0, 4).map((product) => (
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
                        aspectRatio="3/4"
                        placement="card"
                        className="mb-2 sm:mb-3 border border-black/5"
                      />
                      <span className="text-[9.5px] sm:text-[10px] font-mono text-black/40 block">
                        {product.plateNumber || product.nr}
                      </span>
                      <h4 className="text-xs font-sans font-medium text-black group-hover:underline underline-offset-4 truncate">
                        {product.name.en || product.name.fi}
                      </h4>
                      <span className="text-[11px] font-mono text-black/60 block mt-0.5">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-black/50 mb-2">
              No matching archive pieces found
            </p>
            <p className="text-xs font-sans text-black/40">
              Try a broader term, material, or category inquiry.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-mono tracking-wider text-black/50 uppercase mb-6">
              Found {results.length} piece{results.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                    alt={product.name.en || product.name.fi}
                    aspectRatio="3/4"
                    placement="card"
                    className="mb-3 border border-black/5"
                  />
                  <span className="text-[10px] font-mono text-black/40 block">
                    {product.plateNumber || product.nr}
                  </span>
                  <h4 className="text-xs font-sans font-medium text-black group-hover:underline underline-offset-4 truncate">
                    {product.name.en || product.name.fi}
                  </h4>
                  <span className="text-xs font-mono text-black/60 block mt-0.5">
                    {formatPrice(product.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
