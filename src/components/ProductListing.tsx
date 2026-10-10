import React, { useState, useMemo } from 'react';
import { Product, Language, Category, translations, formatPrice } from '../types';
import { FashionImage } from './FashionImage';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { Heart, X } from 'lucide-react';

interface ProductListingProps {
  language: Language;
  selectedCategory: string;
  selectedSubcategory?: string;
  onSelectCategory: (cat: string, sub?: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenQuickLook: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: string[];
  products?: Product[];
  categories?: Category[];
  loading?: boolean;
  isLiveFromFirestore?: boolean;
}

export const ProductListing: React.FC<ProductListingProps> = ({
  language,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
  wishlistIds,
  products,
  categories = [],
  loading = false,
}) => {
  const t = translations[language];

  const sourceProducts = useMemo(() => {
    return Array.isArray(products) ? products : [];
  }, [products]);

  const [columnsDensity, setColumnsDensity] = useState<1 | 2 | 4>(4);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string | null>(null);
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string | null>(null);
  const [onlyInStockFilter, setOnlyInStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');
  const [visibleCount, setVisibleCount] = useState(12);

  const filteredProducts = useMemo(() => {
    return sourceProducts.filter((product) => {
      if (product.status && product.status !== 'live') {
        if (product.status === 'scheduled' && product.publishAt) {
          const pubTime = typeof product.publishAt === 'number' ? product.publishAt : new Date(product.publishAt).getTime();
          if (pubTime > Date.now()) return false;
        } else {
          return false;
        }
      }

      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      if (
        selectedSubcategory &&
        !selectedSubcategory.startsWith('All') &&
        product.subcategory !== selectedSubcategory
      ) {
        return false;
      }

      if (selectedSizeFilter && !product.sizes.includes(selectedSizeFilter)) {
        return false;
      }

      if (selectedColorFilter) {
        const prodColor = (
          product.colorName?.[language] ||
          product.colorName?.fi ||
          product.colorName?.en ||
          ''
        ).toLowerCase();
        if (prodColor !== selectedColorFilter.toLowerCase()) return false;
      }

      if (selectedMaterialFilter) {
        const mat = (product.material[language] || product.material.fi || '').toLowerCase();
        if (!mat.includes(selectedMaterialFilter.toLowerCase())) return false;
      }

      if (onlyInStockFilter && product.stock <= 0) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      return 0;
    });
  }, [
    sourceProducts,
    selectedCategory,
    selectedSubcategory,
    selectedSizeFilter,
    selectedColorFilter,
    selectedMaterialFilter,
    onlyInStockFilter,
    sortBy,
    language,
  ]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    sourceProducts.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set);
  }, [sourceProducts]);

  const allMaterials = useMemo(() => {
    const set = new Set<string>();
    sourceProducts.forEach((p) => {
      const mat = p.material[language] || p.material.fi;
      if (mat) set.add(mat);
    });
    return Array.from(set).slice(0, 8);
  }, [sourceProducts, language]);

  const activeFiltersCount =
    (selectedSizeFilter ? 1 : 0) +
    (selectedColorFilter ? 1 : 0) +
    (selectedMaterialFilter ? 1 : 0) +
    (onlyInStockFilter ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedSizeFilter(null);
    setSelectedColorFilter(null);
    setSelectedMaterialFilter(null);
    setOnlyInStockFilter(false);
  };

  return (
    <section id="archive" className="w-full bg-white text-black min-h-screen pt-28">
      {/* Archive Header */}
      <div className="max-w-[1720px] mx-auto px-6 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-small text-black/40 block mb-2">
              {selectedCategory === 'all' ? 'Catalogue' : selectedCategory}
            </span>
            <h1 className="text-title">
              {selectedCategory === 'all' ? 'All Pieces' : selectedCategory}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-small text-black/50">
              {filteredProducts.length} pieces
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROLS: Pure text controls */}
      <div className="bg-white py-4 px-6">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="text-small text-black hover:underline cursor-pointer"
            >
              Filter {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-small text-black cursor-pointer bg-transparent"
            >
              <option value="newest">Newest</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
            </select>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-small text-black/50 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Density controls: text options */}
          <div className="hidden md:flex items-center gap-4 text-small">
            <button
              type="button"
              onClick={() => setColumnsDensity(1)}
              className={`cursor-pointer ${columnsDensity === 1 ?'underline font-bold' : 'text-black/40'}`}
            >
              1 Col
            </button>
            <button
              type="button"
              onClick={() => setColumnsDensity(2)}
              className={`cursor-pointer ${columnsDensity === 2 ?'underline font-bold' : 'text-black/40'}`}
            >
              2 Col
            </button>
            <button
              type="button"
              onClick={() => setColumnsDensity(4)}
              className={`cursor-pointer ${columnsDensity === 4 ?'underline font-bold' : 'text-black/40'}`}
            >
              4 Col
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="max-w-[1720px] mx-auto px-6 py-8">
        {loading ? (
          <div
            className={`grid gap-x-8 gap-y-16 ${ columnsDensity === 1 ?'grid-cols-1 max-w-xl mx-auto'
                : columnsDensity === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {Array.from({ length: 8 }).map((_, sIdx) => (
              <ProductCardSkeleton key={`skel-${sIdx}`} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-body text-black/60 mb-4">
              No products yet
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-small underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-x-8 gap-y-16 ${ columnsDensity === 1 ?'grid-cols-1 max-w-xl mx-auto'
                : columnsDensity === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {displayedProducts.map((product) => {
              const isWishlisted = wishlistIds.includes(product.id);

              return (
                <div key={product.id} className="space-y-4">
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-[3/4] overflow-hidden bg-white cursor-pointer"
                  >
                    <FashionImage
                      product={product}
                      src={product.image}
                      alt={product.name[language]}
                      placement="archive"
                      aspectRatio="3/4"
                      className="w-full h-full"
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      className="absolute top-3 right-3 text-black cursor-pointer"
                      aria-label="Wishlist"
                    >
                      <Heart
                        className={`w-4 h-4 stroke-[1.5] ${ isWishlisted ?'fill-black text-black' : 'text-black'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="text-body hover:underline cursor-pointer truncate"
                      >
                        {product.name[language]}
                      </h3>
                      <span className="text-small text-black">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      {product.sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onQuickAdd(product, sz)}
                          className="text-small text-black/50 hover:text-black hover:underline cursor-pointer"
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {visibleCount < filteredProducts.length && (
          <div className="mt-16 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 8)}
              className="text-small text-black hover:underline cursor-pointer"
            >
              Load more →
            </button>
          </div>
        )}
      </div>

      {/* FILTER DRAWER: Pure white surface, text only */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0"
            onClick={() => setIsFilterOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md bg-white h-full p-8 overflow-y-auto space-y-8 z-10"
          >
            <div className="flex items-center justify-between">
              <span className="text-title">
                Filters
              </span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-small cursor-pointer hover:underline"
              >
                Close
              </button>
            </div>

            {/* Department */}
            {categories && categories.length > 0 && (
              <div className="space-y-3">
                <span className="text-small text-black/40 block">
                  Department
                </span>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => onSelectCategory('all')}
                    className={`text-body cursor-pointer ${ selectedCategory ==='all' ? 'underline font-bold' : 'text-black/60'
                    }`}
                  >
                    All
                  </button>
                  {categories
                    .filter((c) => !c.parentId && c.visible)
                    .map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => onSelectCategory(cat.slug || cat.id)}
                        className={`text-body cursor-pointer ${ selectedCategory === (cat.slug || cat.id) ?'underline font-bold'
                            : 'text-black/60'
                        }`}
                      >
                        {cat.name.en || cat.name.fi}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Size */}
            <div className="space-y-3">
              <span className="text-small text-black/40 block">
                Size
              </span>
              <div className="flex flex-wrap gap-4">
                {allSizes.map((sz) => (
                  <button
                    type="button"
                    key={sz}
                    onClick={() =>
                      setSelectedSizeFilter(selectedSizeFilter === sz ? null : sz)
                    }
                    className={`text-body cursor-pointer ${ selectedSizeFilter === sz ?'underline font-bold' : 'text-black/60'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability: Text choice On / Off */}
            <div className="space-y-3">
              <span className="text-small text-black/40 block">
                In Stock Only
              </span>
              <div className="flex items-center gap-6 text-body">
                <button
                  type="button"
                  onClick={() => setOnlyInStockFilter(true)}
                  className={`cursor-pointer ${onlyInStockFilter ?'underline font-bold' : 'text-black/60'}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyInStockFilter(false)}
                  className={`cursor-pointer ${!onlyInStockFilter ?'underline font-bold' : 'text-black/60'}`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="pt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="text-body underline cursor-pointer"
              >
                Apply
              </button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-small text-black/50 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
