import React, { useEffect } from 'react';
import { Product, Language } from '../types';
import { ARCHIVE_PRODUCTS, translations, formatPrice } from '../data/mockData';
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
  const t = translations[language];

  // Keyboard navigation: Escape to close, ArrowLeft / ArrowRight to cycle plates
  useEffect(() => {
    if (!product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNextPlate();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPlate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product]);

  if (!product) return null;

  const currentIndex = ARCHIVE_PRODUCTS.findIndex((p) => p.id === product.id);

  const goToNextPlate = () => {
    const nextIndex = (currentIndex + 1) % ARCHIVE_PRODUCTS.length;
    onSelectProduct(ARCHIVE_PRODUCTS[nextIndex]);
  };

  const goToPrevPlate = () => {
    const prevIndex = (currentIndex - 1 + ARCHIVE_PRODUCTS.length) % ARCHIVE_PRODUCTS.length;
    onSelectProduct(ARCHIVE_PRODUCTS[prevIndex]);
  };

  return (
    <div className="fixed inset-0 z-[85] bg-white flex flex-col justify-between overflow-y-auto animate-fadeIn select-none">
      {/* Top Header */}
      <div className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-6 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-black/50">
            {product.plateNumber}
          </span>
          <span className="text-black/20 font-mono">/</span>
          <span className="font-mono text-xs text-black/50">
            {currentIndex + 1} OF {ARCHIVE_PRODUCTS.length}
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
            title="Edellinen levy (←)"
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
              alt={product.name[language]}
              position={product.cropVariation.onModel.position}
              scale={product.cropVariation.onModel.scale}
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
              {product.name[language]}
            </h2>
            <p className="font-mono text-lg sm:text-xl text-black">
              {formatPrice(product.price)}
            </p>
            <p className="font-mono text-xs text-black/50">
              {product.material[language]} · {product.origin[language]}
            </p>
            <p className="text-xs sm:text-sm font-sans text-black/70 leading-relaxed pt-1 sm:pt-2">
              {product.description[language]}
            </p>
          </div>

          {/* Quick size selection and actions */}
          <div>
            <span className="text-[9.5px] sm:text-[10px] font-mono tracking-wider uppercase text-black/50 block mb-2">
              {language === 'fi' ? 'VALITSE KOKO PIKALISÄYKSELLÄ:' : 'SELECT SIZE FOR QUICK ADD:'}
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
              <span>{language === 'fi' ? 'Avaa tuotesivu' : 'Open Product Page'}</span>
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
            title="Seuraava levy (→)"
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
          <span>{language === 'fi' ? 'Edellinen' : 'Prev'}</span>
        </button>

        <span className="hidden sm:inline text-black/40">Käytä nuolinäppäimiä (← / →) tai ESC sulkeaksesi</span>

        <button
          type="button"
          onClick={goToNextPlate}
          className="flex items-center gap-1 text-black/80 hover:text-black cursor-pointer font-medium ml-auto"
        >
          <span>{language === 'fi' ? 'Seuraava arkistolevy' : 'Next Plate'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
