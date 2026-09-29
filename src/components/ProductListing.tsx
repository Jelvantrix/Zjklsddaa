import React, { useState, useMemo } from 'react';
import { Product, Language } from '../types';
import { ARCHIVE_PRODUCTS, translations, formatPrice } from '../data/mockData';
import { FashionImage } from './FashionImage';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import {
  SlidersHorizontal,
  Heart,
  Grid,
  Square,
  Columns,
  X,
  ChevronDown,
  Radio,
} from 'lucide-react';

interface ProductListingProps {
  language: Language;
  selectedCategory: string; // 'all' or category
  selectedSubcategory?: string;
  onSelectCategory: (cat: string, sub?: string) => void;
  onSelectProduct: (product: Product) => void;
  onOpenQuickLook: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: string[];
  products?: Product[];
  loading?: boolean;
  isLiveFromFirestore?: boolean;
}

export const ProductListing: React.FC<ProductListingProps> = ({
  language,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectProduct,
  onOpenQuickLook,
  onQuickAdd,
  onToggleWishlist,
  wishlistIds,
  products,
  loading = false,
  isLiveFromFirestore = false,
}) => {
  const t = translations[language];

  // Resolve source products: real-time Firestore list or fallback
  const sourceProducts = useMemo(() => {
    return products && products.length > 0 ? products : ARCHIVE_PRODUCTS;
  }, [products]);

  // Density switch: 1, 2, or 4 columns
  const [columnsDensity, setColumnsDensity] = useState<1 | 2 | 4>(4);

  // Look vs Product mode:
  // "Look" shows on-model crops, "Product" shows clean packshots
  const [viewMode, setViewMode] = useState<'look' | 'product'>('product');

  // Hovered product card for cross-fade
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string | null>(null);
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [selectedMaterialFilter, setSelectedMaterialFilter] = useState<string | null>(null);
  const [onlyInStockFilter, setOnlyInStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'priceAsc' | 'priceDesc'>('newest');

  // Pagination / Load more
  const [visibleCount, setVisibleCount] = useState(12);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return sourceProducts.filter((product) => {
      // Status check: only show live or scheduled products past publishAt
      if (product.status && product.status !== 'live') {
        if (product.status === 'scheduled' && product.publishAt) {
          const pubTime = typeof product.publishAt === 'number' ? product.publishAt : new Date(product.publishAt).getTime();
          if (pubTime > Date.now()) return false;
        } else {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }
      // Subcategory filter
      if (
        selectedSubcategory &&
        !selectedSubcategory.startsWith('Kaikki') &&
        !selectedSubcategory.startsWith('All') &&
        product.subcategory !== selectedSubcategory
      ) {
        return false;
      }
      // Size filter
      if (selectedSizeFilter) {
        const productSizes = product.variants?.map((v) => v.size) || product.sizes || [];
        if (!productSizes.includes(selectedSizeFilter)) {
          return false;
        }
      }
      // Color filter
      if (selectedColorFilter && product.colorHex !== selectedColorFilter) {
        return false;
      }
      // Material filter
      const materialText = typeof product.material === 'object' && product.material ? (product.material as any)[language] : '';
      if (selectedMaterialFilter && materialText && !materialText.toLowerCase().includes(selectedMaterialFilter.toLowerCase())) {
        return false;
      }
      // In stock filter
      if (onlyInStockFilter) {
        const inStock = product.variants ? product.variants.some((v) => v.stock > 0) : (product.stock || 0) > 0;
        if (!inStock) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'priceDesc') return b.price - a.price;
      return 0; // default newest
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

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  // Available filter options extracted dynamically
  const allSizes = ['XS', 'S', 'M', 'L', 'XL', '34', '36', '38', '40', '42', '44', '46', '48', '50', '52'];
  const allMaterials = ['Villa', 'Puuvilla', 'Kashmir', 'Pellava', 'Silkki', 'Nahka'];

  const clearAllFilters = () => {
    setSelectedSizeFilter(null);
    setSelectedColorFilter(null);
    setSelectedMaterialFilter(null);
    setOnlyInStockFilter(false);
  };

  const activeFiltersCount = [
    selectedSizeFilter,
    selectedColorFilter,
    selectedMaterialFilter,
    onlyInStockFilter ? 'stock' : null,
  ].filter(Boolean).length;

  return (
    <section id="archive" className="w-full bg-white text-black min-h-screen pt-16 sm:pt-20">
      {/* Editorial Archive Header */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 pt-10 sm:pt-16 pb-6 sm:pb-10 border-b border-black/10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.24em] uppercase text-black/40">
                {t.archive.tag}
              </span>
              <span className="text-black/20 font-mono">/</span>
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-black/60 truncate">
                {selectedCategory === 'all'
                  ? (language === 'fi' ? 'KAIKKI KOKOELMAT' : 'COMPLETE CATALOGUE')
                  : selectedCategory.toUpperCase()}
              </span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight">
              {selectedSubcategory && !selectedSubcategory.startsWith('Kaikki')
                ? selectedSubcategory
                : selectedCategory === 'all'
                ? t.archive.title
                : t.nav[selectedCategory as keyof typeof t.nav] || selectedCategory}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-black/50">
              {filteredProducts.length} {language === 'fi' ? 'numeroitua teosta' : 'numbered plates'}
            </span>
          </div>
        </div>
      </div>

      {/* STICKY FILTER & CONTROLS BAR WITH HAIRLINE BORDER */}
      <div className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-black/10 py-2.5 sm:py-3.5 px-4 sm:px-6 md:px-10">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          {/* LEFT: Filter button & active filters indicator */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 border border-black text-xs font-mono uppercase tracking-[0.14em] hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>{t.archive.filters}</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 bg-black text-white hover:bg-white hover:text-black w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-mono">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown (Visible on all devices) */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-transparent pr-6 sm:pr-7 pl-2 sm:pl-3 py-1 sm:py-1.5 border border-black/20 text-[10.5px] sm:text-xs font-mono uppercase tracking-[0.10em] sm:tracking-[0.12em] focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="newest">{t.archive.sortNewest}</option>
                <option value="priceAsc">{t.archive.sortPriceAsc}</option>
                <option value="priceDesc">{t.archive.sortPriceDesc}</option>
              </select>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute right-1.5 sm:right-2 pointer-events-none text-black/60" />
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="hidden md:inline-block text-xs font-mono text-black/50 hover:text-black underline underline-offset-4 cursor-pointer"
              >
                {t.archive.clearFilters}
              </button>
            )}
          </div>

          {/* RIGHT: Look/Product Toggle & Column Density Switch */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* "Look / Product" Toggle */}
            <div className="flex items-center border border-black/20 p-0.5 text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider">
              <button
                onClick={() => setViewMode('product')}
                className={`px-2.5 sm:px-3 py-1 transition-colors cursor-pointer ${
                  viewMode === 'product'
                    ? 'bg-black text-white font-medium'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                {t.archive.viewProduct}
              </button>
              <button
                onClick={() => setViewMode('look')}
                className={`px-2.5 sm:px-3 py-1 transition-colors cursor-pointer ${
                  viewMode === 'look'
                    ? 'bg-black text-white font-medium'
                    : 'text-black/60 hover:text-black'
                }`}
              >
                {t.archive.viewLook}
              </button>
            </div>

            {/* Live Firestore Sync Status Indicator */}
            {isLiveFromFirestore && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest border border-black/15 bg-white text-black/80">
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                <span>Live Firestore</span>
              </div>
            )}

            {/* Density Switch: 1 / 2 / 4 columns (Desktop & Tablet) */}
            <div className="hidden md:flex items-center gap-1 border border-black/20 p-1">
              <button
                onClick={() => setColumnsDensity(1)}
                className={`p-1.5 transition-colors cursor-pointer ${
                  columnsDensity === 1 ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
                title="1 palsta"
                aria-label="1 palsta"
              >
                <Square className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
              <button
                onClick={() => setColumnsDensity(2)}
                className={`p-1.5 transition-colors cursor-pointer ${
                  columnsDensity === 2 ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
                title="2 palstaa"
                aria-label="2 palstaa"
              >
                <Columns className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
              <button
                onClick={() => setColumnsDensity(4)}
                className={`p-1.5 transition-colors cursor-pointer ${
                  columnsDensity === 4 ? 'bg-black text-white' : 'text-black/40 hover:text-black'
                }`}
                title="4 palstaa"
                aria-label="4 palstaa"
              >
                <Grid className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID WITH RESPONSIVE BREAKPOINTS (Mobile 2-col, Tablet 2-3 col, Desktop 4-col) */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12">
        {loading ? (
          <div
            className={`grid gap-x-3.5 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 gap-y-8 sm:gap-y-12 md:gap-y-16 transition-all duration-300 ${
              columnsDensity === 1
                ? 'grid-cols-1 max-w-xl mx-auto'
                : columnsDensity === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {Array.from({ length: 8 }).map((_, sIdx) => (
              <ProductCardSkeleton
                key={`skel-${sIdx}`}
                density={columnsDensity === 4 ? 'comfortable' : 'dense'}
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 sm:py-28 text-center border border-black/10 p-6">
            <p className="font-editorial text-xl sm:text-2xl mb-3 text-black/80">
              {t.archive.empty}
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-2 px-6 py-2.5 btn-primary text-xs uppercase tracking-[0.16em] cursor-pointer"
            >
              {t.archive.clearFilters}
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-x-3.5 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 gap-y-8 sm:gap-y-12 md:gap-y-16 transition-all duration-300 ${
              columnsDensity === 1
                ? 'grid-cols-1 max-w-xl mx-auto'
                : columnsDensity === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {displayedProducts.map((product, idx) => {
              const isWishlisted = wishlistIds.includes(product.id);
              const isHovered = hoveredCardId === product.id;

              // Intentional Asymmetry: every 6th item is a wide 2-column feature tile on desktop 4-column layout
              const isFeatureTile =
                columnsDensity === 4 && (idx + 1) % 6 === 0 && idx !== 0;

              // Image Crop configuration based on viewMode and hover state
              const activeCrop =
                isHovered || viewMode === 'look'
                  ? product.cropVariation.onModel
                  : product.cropVariation.packshot;

              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredCardId(product.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className={`group relative flex flex-col justify-between ${
                    isFeatureTile ? 'lg:col-span-2' : ''
                  }`}
                >
                  <div>
                    {/* Top Whisper Plate Number and Limited Badge */}
                    <div className="flex items-center justify-between pb-1 sm:pb-2">
                      <span className="font-mono text-[9.5px] sm:text-[10.5px] tracking-wider text-black/40">
                        {product.plateNumber}
                      </span>
                      {product.isLimited && (
                        <span className="font-mono text-[8.5px] sm:text-[9px] tracking-widest uppercase text-black/60 truncate">
                          {t.archive.limited}
                        </span>
                      )}
                    </div>

                    {/* Image Box */}
                    <div
                      onClick={() => onOpenQuickLook(product)}
                      className={`cursor-pointer overflow-hidden border border-black/5 bg-white relative ${
                        isFeatureTile ? 'aspect-[16/10]' : 'aspect-[3/4]'
                      }`}
                    >
                      <FashionImage
                        alt={product.name[language]}
                        position={activeCrop.position}
                        scale={activeCrop.scale}
                        flipped={activeCrop.flipped}
                        aspectRatio="auto"
                        className="w-full h-full"
                        imageClassName="transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Wishlist Heart Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(product.id);
                        }}
                        className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-white/80 backdrop-blur-sm border border-black/10 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 hover:bg-white z-20 cursor-pointer"
                        aria-label="Tallenna suosikkeihin"
                      >
                        <Heart
                          className={`w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[1.5] ${
                            isWishlisted ? 'fill-black text-black' : 'text-black'
                          }`}
                        />
                      </button>

                      {/* Thin Quick-Add Size Strip sliding up on desktop hover */}
                      <div className="hidden sm:flex absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-black/15 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-2 items-center justify-center gap-1.5 z-10">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-black/50 mr-1">
                          {language === 'fi' ? 'Koko:' : 'Size:'}
                        </span>
                        {product.sizes.map((sz) => (
                          <button
                            type="button"
                            key={sz}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAdd(product, sz);
                            }}
                            className="px-2 py-0.5 text-[10px] font-mono border border-black/20 hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Tap-to-add size strip */}
                  <div className="sm:hidden flex flex-wrap gap-1 mt-1.5">
                    {product.sizes.slice(0, 3).map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => onQuickAdd(product, sz)}
                        className="px-1.5 py-0.5 text-[8.5px] font-mono border border-black/20 text-black/70 cursor-pointer"
                      >
                        +{sz}
                      </button>
                    ))}
                  </div>

                  {/* Whisper-Thin Plate Metadata Beneath */}
                  <div className="pt-2 sm:pt-3">
                    {/* Line 1: Name and Price */}
                    <div className="flex items-baseline justify-between gap-1.5">
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="font-sans text-[11.5px] sm:text-xs md:text-sm font-medium text-black group-hover:underline underline-offset-4 cursor-pointer truncate"
                      >
                        {product.name[language]}
                      </h3>
                      <span className="font-mono text-[11px] sm:text-xs md:text-sm text-black/90 whitespace-nowrap">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    {/* Line 2: Material and Origin */}
                    <p className="font-mono text-[9.5px] sm:text-[10.5px] text-black/45 mt-0.5 truncate">
                      {product.material[language]}
                    </p>

                    {/* Line 3: Stock status if limited */}
                    {product.isLimited && product.stock <= 8 && (
                      <p className="font-mono text-[8.5px] sm:text-[9.5px] text-black/70 mt-0.5 tracking-wide">
                        {t.archive.stockLeft.replace('{count}', product.stock.toString())}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PROGRESS AND "LOAD MORE" THIN-LINE BUTTON */}
        {visibleCount < filteredProducts.length && (
          <div className="mt-14 sm:mt-20 pt-8 sm:pt-10 border-t border-black/10 flex flex-col items-center justify-center">
            <span className="font-mono text-xs text-black/50 mb-3 sm:mb-4 tracking-wider">
              {t.archive.showingProgress
                .replace('{current}', Math.min(visibleCount, filteredProducts.length).toString())
                .replace('{total}', filteredProducts.length.toString())}
            </span>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 8)}
              className="px-8 sm:px-10 py-2.5 sm:py-3 border border-black text-xs font-mono uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {t.archive.loadMore}
            </button>
          </div>
        )}
      </div>

      {/* FILTER DRAWER (Right-side slide over with live count) */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div
            onClick={() => setIsFilterOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
          />

          <div className="relative w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between border-l border-black overflow-y-auto animate-slideIn">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-black/10 mb-6 sm:mb-8">
                <div>
                  <h3 className="font-editorial text-2xl font-normal">
                    {t.archive.filters}
                  </h3>
                  <span className="font-mono text-xs text-black/50">
                    {t.archive.resultsCount.replace('{count}', filteredProducts.length.toString())}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 text-black/50 hover:text-black cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>

              {/* 1. Size Filter */}
              <div className="mb-6 sm:mb-8">
                <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.18em] uppercase text-black/50 block mb-2 sm:mb-3">
                  {t.archive.filterSize}
                </span>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {allSizes.map((sz) => (
                    <button
                      type="button"
                      key={sz}
                      onClick={() =>
                        setSelectedSizeFilter(selectedSizeFilter === sz ? null : sz)
                      }
                      className={`py-1.5 sm:py-2 text-xs font-mono border transition-colors cursor-pointer ${
                        selectedSizeFilter === sz
                          ? 'bg-black text-white border-black'
                          : 'border-black/20 hover:border-black text-black'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Color Filter */}
              <div className="mb-6 sm:mb-8">
                <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.18em] uppercase text-black/50 block mb-2 sm:mb-3">
                  {language === 'fi' ? 'Väri' : 'Colour'}
                </span>
                <div className="flex items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedColorFilter(
                        selectedColorFilter === '#000000' ? null : '#000000'
                      )
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-mono uppercase cursor-pointer ${
                      selectedColorFilter === '#000000'
                        ? 'border-black bg-black text-white'
                        : 'border-black/30 hover:border-black text-black'
                    }`}
                  >
                    <span className="w-3 h-3 bg-black border border-white" />
                    <span>{language === 'fi' ? 'Musta' : 'Black'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedColorFilter(
                        selectedColorFilter === '#FFFFFF' ? null : '#FFFFFF'
                      )
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-mono uppercase cursor-pointer ${
                      selectedColorFilter === '#FFFFFF'
                        ? 'border-black bg-black text-white'
                        : 'border-black/30 hover:border-black text-black'
                    }`}
                  >
                    <span className="w-3 h-3 bg-white border border-black" />
                    <span>{language === 'fi' ? 'Valkoinen' : 'White'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Material Filter */}
              <div className="mb-6 sm:mb-8">
                <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.18em] uppercase text-black/50 block mb-2 sm:mb-3">
                  {t.archive.filterMaterial}
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {allMaterials.map((mat) => (
                    <button
                      type="button"
                      key={mat}
                      onClick={() =>
                        setSelectedMaterialFilter(
                          selectedMaterialFilter === mat ? null : mat
                        )
                      }
                      className={`px-3 py-1.5 text-xs font-sans border transition-colors cursor-pointer ${
                        selectedMaterialFilter === mat
                          ? 'bg-black text-white border-black'
                          : 'border-black/20 hover:border-black'
                      }`}
                    >
                      {mat}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Availability */}
              <div className="mb-6 sm:mb-8">
                <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.18em] uppercase text-black/50 block mb-2 sm:mb-3">
                  {t.archive.filterAvailability}
                </span>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyInStockFilter}
                    onChange={(e) => setOnlyInStockFilter(e.target.checked)}
                    className="w-4 h-4 accent-black rounded-none cursor-pointer"
                  />
                  <span className="text-xs font-sans text-black/80">
                    {t.archive.onlyInStock}
                  </span>
                </label>
              </div>
            </div>

            {/* Footer with Apply button */}
            <div className="p-6 sm:p-8 border-t border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-full py-3.5 sm:py-4 btn-primary text-xs uppercase tracking-[0.18em] font-medium cursor-pointer"
              >
                {t.archive.applyFilters} ({filteredProducts.length})
              </button>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="w-full mt-2 sm:mt-3 text-center text-xs font-mono text-black/50 hover:text-black underline cursor-pointer"
                >
                  {t.archive.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
