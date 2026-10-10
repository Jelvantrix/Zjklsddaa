import React, { useEffect } from 'react';
import { Product, Language, translations, formatPrice } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { FashionImage } from './FashionImage';
import { X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface QuickLookModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  language: Language;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({
  product,
  onClose,
  onSelectProduct,
  onQuickAdd,
  language,
}) => {
  const { products } = useStorefrontData();
  const t = translations[language];

  if (!product) return null;

  const currentIndex = products.findIndex((p) => p.id === product.id);

  const goToNextPlate = () => {
    if (products.length === 0) return;
    const nextIndex = (currentIndex + 1) % products.length;
    onSelectProduct(products[nextIndex]);
  };

  const goToPrevPlate = () => {
    if (products.length === 0) return;
    const prevIndex = (currentIndex - 1 + products.length) % products.length;
    onSelectProduct(products[prevIndex]);
  };

  return (
    <div className="fixed inset-0 z-[85] bg-white flex flex-col justify-between overflow-y-auto animate-fadeIn select-none">
      {/* Top Header */}
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-6 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-black/50">
            {product.plateNumber || product.nr}
          </span>
          <span className="text-black/20 font-mono">/</span>
          <span className="font-mono text-xs text-black/50">
            {currentIndex >= 0 ? currentIndex + 1 : 1} OF {Math.max(1, products.length)}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 sm:p-2 text-black/60 hover:text-black transition-colors cursor-pointer"
          aria-label={t.nav.close}
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
        </button>
      </div>

      {/* Main Editorial Presentation (Mobile stacked, Tablet & Desktop split) */}
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center">
        {/* Left: Previous Plate Affordance (Desktop) */}
        <div className="hidden lg:flex lg:col-span-1 justify-start">
          <button
            type="button"
            onClick={goToPrevPlate}
            className="p-2 text-black/50 hover:text-black hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Previous plate"
          >
            <ChevronLeft className="w-8 h-8 stroke-[1.2]" />
          </button>
        </div>

        {/* Center: Large High-Fashion Image Viewport */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg aspect-[3/4] border border-black/10 overflow-hidden relative bg-white">
            <FashionImage
              product={product}
              src={product.hoverImage || product.image}
              alt={product.name.en || product.name.fi}
              position={product?.cropVariation?.onModel?.position || 'center 20%'}
              scale={product?.cropVariation?.onModel?.scale || 1.05}
              aspectRatio="auto"
              className="w-full h-full"
            />
            {product.isLimited && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 font-mono text-[9.5px] sm:text-[10px] tracking-wider uppercase text-black/70">
                {t.archive.limited}
              </div>
            )}
          </div>
        </div>

        {/* Right: Plate Dossier */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <span className="font-mono text-[10.5px] sm:text-[11px] tracking-[0.24em] uppercase text-black/40 block">
              {product.category.toUpperCase()} · {product.subcategory}
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-normal leading-tight">
              {product.name.en || product.name.fi}
            </h2>
            <p className="font-mono text-lg sm:text-xl text-black">
              {formatPrice(product.price)}
            </p>
            <p className="font-mono text-xs text-black/50">
              {product.material.en || product.material.fi} · {product.origin.en || product.origin.fi}
            </p>
            <p className="text-xs sm:text-sm font-sans text-black/70 leading-relaxed pt-1 sm:pt-2">
              {product.description.en || product.description.fi}
            </p>
          </div>

          {/* Quick size selection and actions */}
          <div>
            <span className="text-[9.5px] sm:text-[10px] font-mono tracking-wider uppercase text-black/50 block mb-2">
              SELECT SIZE FOR DIRECT ACQUISITION:
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-3 mb-4 sm:mb-6">
              {product.sizes.map((sz) => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => onQuickAdd(product, sz)}
                  className="py-1 px-2 text-xs font-mono text-black/60 hover:text-black hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  +{sz}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectProduct(product);
              }}
              className="w-full py-3.5 sm:py-4 text-xs font-mono uppercase tracking-[0.2em] btn-primary flex items-center justify-between cursor-pointer font-medium"
            >
              <span>Open Product Page</span>
              <ArrowRight className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Right: Next Plate Affordance (Desktop) */}
        <div className="hidden lg:flex lg:col-span-1 justify-end">
          <button
            type="button"
            onClick={goToNextPlate}
            className="p-2 text-black/50 hover:text-black hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Next plate"
          >
            <ChevronRight className="w-8 h-8 stroke-[1.2]" />
          </button>
        </div>
      </div>

      {/* Bottom Footer bar with Next / Prev Plate affordances (Mobile & Desktop) */}
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 md:px-10 py-3.5 sm:py-4 border-t border-black/10 flex items-center justify-between text-xs font-mono text-black/60">
        <button
          type="button"
          onClick={goToPrevPlate}
          className="lg:hidden flex items-center gap-1 hover:text-black cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <span className="hidden sm:inline text-black/40 font-mono text-[10px] tracking-wider uppercase">
          Archival Plate Dossier · Est. 2026
        </span>

        <button
          type="button"
          onClick={goToNextPlate}
          className="flex items-center gap-1 text-black/80 hover:text-black cursor-pointer font-medium ml-auto"
        >
          <span>Next Plate</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
