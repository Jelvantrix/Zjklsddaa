import React, { useState, useMemo } from 'react';
import { Language, Product, translations, formatPrice, NEUTRAL_PLACEHOLDER_IMG } from '../types';
import { FashionImage } from './FashionImage';
import { Check, ArrowRight } from 'lucide-react';
import { joinWaitlist } from '../supabase/dbService';

interface HomeSectionsProps {
  language: Language;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string, sub?: string) => void;
  onOpenQuickLook: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: string[];
  onOpenJournalArticle?: (articleId: string) => void;
  products?: Product[];
}

export const HomeSections: React.FC<HomeSectionsProps> = ({
  language,
  onSelectProduct,
  onSelectCategory,
  onOpenQuickLook,
  onQuickAdd,
  onToggleWishlist,
  wishlistIds,
  products = [],
}) => {
  const liveProducts = useMemo(() => {
    return Array.isArray(products) ? products.filter((p) => p && p.status === 'live') : [];
  }, [products]);

  const womenHighlight = useMemo(() => {
    return liveProducts.find((p) => p.category === 'naiset');
  }, [liveProducts]);

  const menHighlight = useMemo(() => {
    return liveProducts.find((p) => p.category === 'miehet');
  }, [liveProducts]);

  // Hover state for seamless packshot -> on-model crossfade
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Quick-add feedback
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Private Client Newsletter
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleQuickAdd = (product: Product, size: string) => {
    onQuickAdd(product, size);
    setAddedFeedback(`${product.id}-${size}`);
    setTimeout(() => setAddedFeedback(null), 1600);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      joinWaitlist(email, 'client_newsletter', 'homepage_footer').catch(() => {});
      setIsSubscribed(true);
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000] selection:bg-black selection:text-white">
      {/* 1. QUIET LUXURY ATELIER MARQUEE */}
      <div className="w-full border-y border-black/[0.08] py-2 overflow-hidden bg-white select-none">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="text-[10px] font-mono tracking-[0.3em] uppercase text-black/60 px-8 flex items-center gap-8 shrink-0"
            >
              <span>HELSINKI ATELIER</span>
              <span className="text-black/30">/</span>
              <span>PORTO KNITWEAR</span>
              <span className="text-black/30">/</span>
              <span>CERTIFIED VIRGIN WOOL</span>
              <span className="text-black/30">/</span>
              <span>NUMBERED EDITIONS 01–50</span>
              <span className="text-black/30">/</span>
              <span>COMPLIMENTARY GLOBAL COURIER</span>
              <span className="text-black/30">/</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. THE SEASONAL EDIT (Rendered only when real category products exist) */}
      {(womenHighlight || menHighlight) && (
        <section className="w-full border-b border-black/[0.08]">
          <div className="max-w-[1880px] mx-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.08]">
            {/* Left Column: Women's Highlight */}
            {womenHighlight && (
              <div
                onClick={() => onSelectCategory('naiset')}
                className="group cursor-pointer relative overflow-hidden bg-neutral-50/30 flex flex-col justify-between"
              >
                <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
                  <FashionImage
                    product={womenHighlight}
                    src={womenHighlight.image}
                    alt="Women's Collection"
                    aspectRatio="auto"
                    placement="archive"
                    className="w-full h-full"
                    imageClassName="group-hover:scale-[1.04] transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                  <div className="absolute top-6 left-6 font-mono text-[9px] tracking-[0.25em] uppercase text-black/70 bg-white/90 backdrop-blur-md px-3 py-1 border border-black/[0.08]">
                    COLLECTION I · WOMEN
                  </div>
                </div>

                <div className="p-6 sm:p-10 lg:p-12 flex items-baseline justify-between border-t border-black/[0.08] bg-white">
                  <div>
                    <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-black tracking-tight group-hover:underline underline-offset-4">
                      Women’s Collection
                    </h2>
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 block mt-1">
                      {womenHighlight.name?.en || womenHighlight.name?.fi || 'Archival Pieces'}
                    </span>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-black/70 group-hover:translate-x-2 transition-transform">
                    Shop Women →
                  </span>
                </div>
              </div>
            )}

            {/* Right Column: Men's Highlight */}
            {menHighlight && (
              <div
                onClick={() => onSelectCategory('miehet')}
                className="group cursor-pointer relative overflow-hidden bg-neutral-50/30 flex flex-col justify-between"
              >
                <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
                  <FashionImage
                    product={menHighlight}
                    src={menHighlight.image}
                    alt="Men's Collection"
                    aspectRatio="auto"
                    placement="archive"
                    className="w-full h-full"
                    imageClassName="group-hover:scale-[1.04] transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                  />
                  <div className="absolute top-6 left-6 font-mono text-[9px] tracking-[0.25em] uppercase text-black/70 bg-white/90 backdrop-blur-md px-3 py-1 border border-black/[0.08]">
                    COLLECTION II · MEN
                  </div>
                </div>

                <div className="p-6 sm:p-10 lg:p-12 flex items-baseline justify-between border-t border-black/[0.08] bg-white">
                  <div>
                    <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-black tracking-tight group-hover:underline underline-offset-4">
                      Men’s Collection
                    </h2>
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 block mt-1">
                      {menHighlight.name?.en || menHighlight.name?.fi || 'Archival Pieces'}
                    </span>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-black/70 group-hover:translate-x-2 transition-transform">
                    Shop Men →
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. STORE SHOWCASE: REAL PRODUCTS ONLY */}
      <section className="w-full max-w-[1880px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 border-b border-black/[0.08]">
        {/* Section Header */}
        <div className="flex items-baseline justify-between pb-6 sm:pb-8 border-b border-black/[0.08] mb-8 sm:mb-12">
          <div>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-black/50 block mb-1">
              LIVE ARCHIVE
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-black tracking-tight">
              Current Archival Collection
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-xs font-mono uppercase tracking-[0.22em] text-black hover:opacity-60 underline underline-offset-4 cursor-pointer transition-opacity"
          >
            View Complete Catalogue →
          </button>
        </div>

        {/* Real Product Grid or Honest Empty State */}
        {liveProducts.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-black/15 bg-neutral-50/50">
            <p className="text-xs font-mono uppercase tracking-[0.25em] text-black/50 mb-2">
              No Archival Garments Live Yet
            </p>
            <p className="text-sm font-sans text-black/60 max-w-sm mx-auto">
              Garments will appear here once published from the atelier administrative console.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-12 sm:gap-y-16">
            {liveProducts.slice(0, 8).map((product, slotIndex) => {
              const isHovered = hoveredCardId === product.id;
              const slotPlate = product.plateNumber || product.nr || `Nº 00${slotIndex + 1}`;
              const productName = product.name?.en || product.name?.fi || 'Archival Garment';
              const productMaterial = product.material?.en || product.material?.fi || 'Natural Fibers';
              const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL'];

              return (
                <div
                  key={product.id}
                  onMouseEnter={() => setHoveredCardId(product.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  className="group flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-black/45 pb-2">
                      <span>{slotPlate}</span>
                      <span className="uppercase text-black/50">
                        {product.category || 'Atelier'}
                      </span>
                    </div>

                    {/* Image Stage */}
                    <div
                      onClick={() => onSelectProduct(product)}
                      className="relative aspect-[3/4] bg-neutral-100 overflow-hidden cursor-pointer"
                    >
                      <FashionImage
                        product={product}
                        src={product.image}
                        alt={productName}
                        placement="card"
                        aspectRatio="3/4"
                        className="w-full h-full"
                        imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />

                      {/* Quick Look overlay button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQuickLook(product);
                        }}
                        className="absolute bottom-3 right-3 px-2.5 py-1 text-[10px] uppercase font-mono tracking-wider bg-white/90 backdrop-blur-xs border border-black/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Quick Look
                      </button>
                    </div>

                    {/* Metadata & Pricing */}
                    <div className="pt-4 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <h3
                          onClick={() => onSelectProduct(product)}
                          className="font-editorial text-lg text-black hover:underline underline-offset-4 cursor-pointer"
                        >
                          {productName}
                        </h3>
                        <span className="font-mono text-xs text-black">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <p className="text-[11px] font-sans text-black/50 line-clamp-1">
                        {productMaterial}
                      </p>
                    </div>
                  </div>

                  {/* Size buttons */}
                  <div className="pt-3 flex flex-wrap gap-1.5">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleQuickAdd(product, s)}
                        className={`px-2 py-1 text-[10px] font-mono uppercase border cursor-pointer transition-colors ${
                          addedFeedback === `${product.id}-${s}`
                            ? 'bg-black text-white border-black'
                            : 'border-black/10 hover:border-black text-black/70'
                        }`}
                      >
                        {addedFeedback === `${product.id}-${s}` ? 'Added' : s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. PRIVATE CLIENT NEWSLETTER */}
      <section className="w-full max-w-[1880px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-black/40 block">
            ATELIER DISPATCH
          </span>
          <h2 className="font-editorial text-2xl sm:text-4xl text-black">
            Join the Client Circle
          </h2>
          <p className="text-xs sm:text-sm font-sans text-black/60 leading-relaxed font-light">
            Receive notification of silent archive releases, limited production runs, and textile studies.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="pt-4 flex max-w-md mx-auto gap-2">
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-black text-white text-xs font-mono uppercase tracking-widest hover:bg-neutral-800 cursor-pointer"
            >
              {isSubscribed ? 'Subscribed' : 'Join'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
