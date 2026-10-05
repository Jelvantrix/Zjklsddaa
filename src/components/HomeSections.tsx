import React, { useState } from 'react';
import { Language, Product } from '../types';
import {
  translations,
  ARCHIVE_PRODUCTS,
  formatPrice,
  PLACEHOLDER_IMG,
} from '../data/mockData';
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
  products,
}) => {
  const liveProducts = products && products.length > 0 ? products : ARCHIVE_PRODUCTS;

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

  const womenHighlight = liveProducts.find((p) => p.category === 'naiset') || liveProducts[0];
  const menHighlight = liveProducts.find((p) => p.category === 'miehet') || liveProducts[1];

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

      {/* 2. THE SEASONAL EDIT: MONUMENTAL 2-COLUMN FASHION DIPTYCH */}
      <section className="w-full border-b border-black/[0.08]">
        <div className="max-w-[1880px] mx-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.08]">
          {/* Left Column: Women's Winter Tailoring */}
          <div
            onClick={() => onSelectCategory('naiset')}
            className="group cursor-pointer relative overflow-hidden bg-neutral-50/30 flex flex-col justify-between"
          >
            <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
              <FashionImage
                product={womenHighlight}
                src={womenHighlight.image}
                alt="Women's Collection"
                position={womenHighlight.cropVariation.onModel.position}
                scale={womenHighlight.cropVariation.onModel.scale}
                aspectRatio="auto"
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
                  Women’s Winter Collection
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 block mt-1">
                  Overcoats · Structured Tailoring · Pure Cashmere
                </span>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-black/70 group-hover:translate-x-2 transition-transform">
                Shop Women →
              </span>
            </div>
          </div>

          {/* Right Column: Men's Monolithic Greatcoats */}
          <div
            onClick={() => onSelectCategory('miehet')}
            className="group cursor-pointer relative overflow-hidden bg-neutral-50/30 flex flex-col justify-between"
          >
            <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] overflow-hidden">
              <FashionImage
                product={menHighlight}
                src={menHighlight.image}
                alt="Men's Collection"
                position={menHighlight.cropVariation.onModel.position}
                scale={menHighlight.cropVariation.onModel.scale}
                flipped={true}
                aspectRatio="auto"
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
                  Men’s Winter Collection
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/50 block mt-1">
                  Greatcoats · Heavy Knitwear · Fluid Trousers
                </span>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-black/70 group-hover:translate-x-2 transition-transform">
                Shop Men →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE BRAND STORE SHOWCASE: PURE HIGH-FASHION PRODUCT GRID */}
      <section className="w-full max-w-[1880px] mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 border-b border-black/[0.08]">
        {/* Section Header */}
        <div className="flex items-baseline justify-between pb-6 sm:pb-8 border-b border-black/[0.08] mb-8 sm:mb-12">
          <div>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-black/50 block mb-1">
              CURRENT PRESENTATION
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal text-black tracking-tight">
              Current Archival Rotation
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-xs font-mono uppercase tracking-[0.22em] text-black hover:opacity-60 underline underline-offset-4 cursor-pointer transition-opacity"
          >
            View All 24 Pieces →
          </button>
        </div>

        {/* 4-Column High-Fashion Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-12 sm:gap-y-16">
          {liveProducts.slice(0, 8).map((product) => {
            const isHovered = hoveredCardId === product.id;
            return (
              <div
                key={product.id}
                onMouseEnter={() => setHoveredCardId(product.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                className="group flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Plate number & season */}
                  <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-black/45 pb-2">
                    <span>{product.plateNumber}</span>
                    <span className="uppercase text-black/50">
                      {product.collectionSeason === 'talvi' ? 'Winter 2026' : 'Essentials'}
                    </span>
                  </div>

                  {/* Image with seamless crossfade on hover */}
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="relative aspect-[3/4] overflow-hidden bg-neutral-50/40 border border-black/[0.06] cursor-pointer"
                  >
                    {/* Primary packshot */}
                    <div
                      className={`w-full h-full transition-opacity duration-700 ${
                        isHovered ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <FashionImage
                        product={product}
                        src={product.image}
                        alt={product.name[language]}
                        position={product.cropVariation.packshot.position}
                        scale={product.cropVariation.packshot.scale}
                        aspectRatio="auto"
                        className="w-full h-full"
                        imageClassName="group-hover:scale-105 transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                      />
                    </div>

                    {/* Secondary runway image */}
                    <div
                      className={`absolute inset-0 transition-opacity duration-700 ${
                        isHovered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <FashionImage
                        product={product}
                        src={product.hoverImage || product.image}
                        isHover={true}
                        alt={`${product.name[language]} on model`}
                        position={product.cropVariation.onModel.position}
                        scale={product.cropVariation.onModel.scale}
                        flipped={product.cropVariation.onModel.flipped}
                        aspectRatio="auto"
                        className="w-full h-full"
                        imageClassName="scale-105"
                      />
                    </div>

                    {/* Size Selector Strip on Hover */}
                    <div className="hidden sm:flex absolute bottom-0 left-0 right-0 p-2.5 bg-white/95 backdrop-blur-md border-t border-black/[0.08] items-center justify-between z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-black/50">
                        Size:
                      </span>
                      <div className="flex gap-1.5">
                        {product.sizes.map((sz) => {
                          const isAdded = addedFeedback === `${product.id}-${sz}`;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdd(product, sz);
                              }}
                              className={`px-1.5 py-0.5 text-[10.5px] font-mono cursor-pointer transition-colors ${
                                isAdded
                                  ? 'text-black font-bold underline underline-offset-4'
                                  : 'text-black/60 hover:text-black hover:underline underline-offset-2'
                              }`}
                            >
                              {isAdded ? '✓' : sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title & Price */}
                <div className="pt-3.5 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      onClick={() => onSelectProduct(product)}
                      className="font-editorial text-lg sm:text-xl font-normal text-black cursor-pointer hover:underline underline-offset-4 truncate"
                    >
                      {product.name[language]}
                    </h3>
                    <span className="font-mono text-xs sm:text-sm text-black font-medium shrink-0">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  <p className="font-mono text-[10.5px] text-black/50 truncate">
                    {product.material[language]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. THE COAT EDIT & KNITWEAR ARCHIVE (CAMPAIGN SPREAD) */}
      <section className="w-full border-b border-black/[0.08]">
        <div className="max-w-[1880px] mx-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.08]">
          <div
            onClick={() => onSelectCategory('kokoelmat')}
            className="group cursor-pointer relative overflow-hidden bg-black aspect-[4/5] sm:aspect-[16/10] md:aspect-[4/5]"
          >
            <img
              src="/src/assets/images/wool_coat_model_1790736253323.jpg"
              alt="The Coat Edit"
              className="w-full h-full object-cover object-[center_18%] group-hover:scale-105 transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-white">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/60 block mb-1">
                  CURATED FOCUS
                </span>
                <h3 className="font-editorial text-2xl sm:text-4xl font-normal text-white">
                  The Overcoat Archive
                </h3>
              </div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/80 group-hover:translate-x-2 transition-transform">
                Explore →
              </span>
            </div>
          </div>

          <div
            onClick={() => onSelectCategory('asusteet')}
            className="group cursor-pointer relative overflow-hidden bg-black aspect-[4/5] sm:aspect-[16/10] md:aspect-[4/5]"
          >
            <img
              src="/src/assets/images/leather_bag_tote_1790736295648.jpg"
              alt="Leather Objects & Accessories"
              className="w-full h-full object-cover object-[center_50%] group-hover:scale-105 transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between text-white">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/60 block mb-1">
                  SCULPTURAL PIECES
                </span>
                <h3 className="font-editorial text-2xl sm:text-4xl font-normal text-white">
                  Leather Objects & Accents
                </h3>
              </div>
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/80 group-hover:translate-x-2 transition-transform">
                Explore →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FULL-BLEED LOOKBOOK BANNER */}
      <section className="relative w-full h-[65vh] sm:h-[80vh] md:h-[90vh] overflow-hidden select-none bg-neutral-950 group">
        <img
          src="/src/assets/images/mens_trench_model_1790736267744.jpg"
          alt="Campaign Lookbook"
          className="w-full h-full object-cover object-[center_18%] transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        <div className="absolute top-8 left-6 sm:left-12 z-10 text-white font-mono">
          <span className="text-[10px] tracking-[0.28em] uppercase text-white/60 block">
            LOOKBOOK EDITION 03
          </span>
          <span className="font-editorial text-2xl sm:text-4xl font-normal text-white mt-1 block">
            Winter 2026 · The Silence of Northern Wool
          </span>
        </div>

        <div className="absolute bottom-8 right-6 sm:right-12 z-10">
          <button
            type="button"
            onClick={() => onSelectCategory('kokoelmat')}
            className="text-white hover:opacity-75 transition-opacity text-xs font-mono uppercase tracking-[0.24em] cursor-pointer inline-flex items-center gap-2 underline underline-offset-8"
          >
            <span>View Complete Lookbook</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* 6. NEWSLETTER & PRIVATE CLIENT ACCESS */}
      <section className="w-full py-20 sm:py-28 px-4 sm:px-8 bg-white border-t border-black/[0.08]">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-black/50 block">
            STUDIO NEWSLETTER
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-black">
            Receive Private Edition Announcements
          </h2>
          <p className="text-xs sm:text-sm font-sans text-black/60 font-light max-w-sm mx-auto">
            Privileged 24-hour advance access to each newly numbered release before public unveiling.
          </p>

          {!isSubscribed ? (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-center gap-4 pt-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="w-full sm:flex-1 py-2 px-1 border-b border-black/25 text-xs font-mono placeholder:text-black/35 focus:outline-none focus:border-black bg-transparent"
              />
              <button
                type="submit"
                className="py-2 text-xs font-mono uppercase tracking-[0.20em] text-black hover:opacity-60 underline underline-offset-8 transition-opacity cursor-pointer shrink-0"
              >
                Subscribe →
              </button>
            </form>
          ) : (
            <div className="py-3 border border-black/[0.1] bg-neutral-50 flex items-center justify-center gap-2 font-mono text-xs text-black">
              <Check className="w-4 h-4 stroke-[2]" />
              <span>
                Thank you. You are on the private register.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
