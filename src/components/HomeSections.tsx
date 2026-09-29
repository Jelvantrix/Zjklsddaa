import React, { useRef, useState } from 'react';
import { Language, Product } from '../types';
import {
  translations,
  ARCHIVE_PRODUCTS,
  JOURNAL_ARTICLES,
  formatPrice,
  PLACEHOLDER_IMG,
} from '../data/mockData';
import { FashionImage } from './FashionImage';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { joinWaitlist } from '../firebase/dbService';

interface HomeSectionsProps {
  language: Language;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string, sub?: string) => void;
  onOpenQuickLook: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: string[];
  onOpenJournalArticle: (articleId: string) => void;
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
  onOpenJournalArticle,
  products,
}) => {
  const t = translations[language];
  const featuredRailRef = useRef<HTMLDivElement | null>(null);

  const liveProducts = products && products.length > 0 ? products : ARCHIVE_PRODUCTS;

  // Waitlist form state
  const [email, setEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      joinWaitlist(email, 'drop-02-monoliitti', 'homepage_waitlist').catch(() => {});
      setWaitlistSubmitted(true);
    }
  };

  const scrollRail = (direction: 'left' | 'right') => {
    if (featuredRailRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      featuredRailRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000]">
      {/* 2. SLIM ANNOUNCEMENT LINE UNDER HERO */}
      <div className="w-full border-y border-black/10 py-2.5 sm:py-3 px-4 sm:px-6 text-center select-none bg-white">
        <p className="text-[9.5px] sm:text-[11px] md:text-[11.5px] font-mono tracking-[0.16em] sm:tracking-[0.22em] uppercase text-black/80">
          {t.announcement}
        </p>
      </div>

      {/* 3. "UUSIN PUDOTUS" (LATEST DROP) */}
      <section className="w-full border-b border-black/10">
        <div className="max-w-[1720px] mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[60vh] lg:min-h-[75vh]">
          {/* Huge Image Split */}
          <div
            onClick={() => onSelectProduct(liveProducts[0])}
            className="lg:col-span-7 relative group cursor-pointer overflow-hidden border-b lg:border-b-0 lg:border-r border-black/10 aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto"
          >
            <FashionImage
              alt={t.latestDrop.title}
              position="center 18%"
              scale={1.05}
              aspectRatio="auto"
              className="w-full h-full min-h-[40vh] sm:min-h-[50vh] lg:min-h-[75vh]"
              imageClassName="group-hover:scale-[1.03] transition-transform duration-700"
            />
            <div className="absolute top-4 sm:top-6 left-4 sm:left-6 font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase px-2 py-1 bg-white/90 backdrop-blur-sm border border-black/15">
              {t.latestDrop.edition}
            </div>
          </div>

          {/* Editorial Content Split */}
          <div className="lg:col-span-5 p-6 sm:p-10 md:p-14 lg:p-20 flex flex-col justify-between bg-white">
            <div className="space-y-4 sm:space-y-6">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-black/40 block">
                {t.latestDrop.tag}
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.08] tracking-tight text-balance">
                {t.latestDrop.title}
              </h2>
              <p className="text-xs sm:text-sm md:text-base font-sans text-black/70 leading-relaxed max-w-md">
                {t.latestDrop.description}
              </p>
            </div>

            <div className="pt-8 sm:pt-10">
              <div className="flex items-baseline justify-between border-t border-black/10 pt-4 mb-5 sm:mb-6">
                <span className="font-mono text-xs text-black/50">Nº 001 · 680g/m² Villa</span>
                <span className="font-mono text-sm sm:text-base font-medium">{formatPrice(490)}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectProduct(ARCHIVE_PRODUCTS[0])}
                className="w-full py-3.5 sm:py-4 text-xs font-sans tracking-[0.18em] uppercase btn-primary font-medium cursor-pointer"
              >
                {t.latestDrop.link}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORY MOSAIC (Asymmetric grid with slow zoom on hover) */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-14 sm:py-20 md:py-28 border-b border-black/10">
        <div className="mb-8 sm:mb-12 flex items-baseline justify-between">
          <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-black/40">
            {language === 'fi' ? 'KOKONAISUUDET' : 'CHAPTERS'}
          </span>
          <span className="text-[10.5px] sm:text-[11px] font-mono tracking-wider text-black/40">
            04 OSION MOSAIIKKI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Naiset - 7 cols on desktop, 1 col on tablet, full width on mobile */}
          <div
            onClick={() => onSelectCategory('naiset')}
            className="sm:col-span-1 lg:col-span-7 group cursor-pointer"
          >
            <div className="overflow-hidden border border-black/5 bg-white aspect-[4/3] sm:aspect-[16/11]">
              <FashionImage
                alt={t.categoriesMosaic.women}
                position="center 20%"
                scale={1.08}
                aspectRatio="auto"
                className="w-full h-full"
                imageClassName="group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal group-hover:underline underline-offset-4">
                  {t.categoriesMosaic.women}
                </h3>
                <p className="text-xs font-sans text-black/50 mt-0.5 sm:mt-1">
                  {t.categoriesMosaic.subWomen}
                </p>
              </div>
              <span className="text-xs font-mono text-black/40">01 →</span>
            </div>
          </div>

          {/* Miehet - 5 cols on desktop, 1 col on tablet */}
          <div
            onClick={() => onSelectCategory('miehet')}
            className="sm:col-span-1 lg:col-span-5 group cursor-pointer lg:mt-10"
          >
            <div className="overflow-hidden border border-black/5 bg-white aspect-[4/3] sm:aspect-[4/5] lg:aspect-[4/5]">
              <FashionImage
                alt={t.categoriesMosaic.men}
                position="center 22%"
                scale={1.12}
                flipped={true}
                aspectRatio="auto"
                className="w-full h-full"
                imageClassName="group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal group-hover:underline underline-offset-4">
                  {t.categoriesMosaic.men}
                </h3>
                <p className="text-xs font-sans text-black/50 mt-0.5 sm:mt-1">
                  {t.categoriesMosaic.subMen}
                </p>
              </div>
              <span className="text-xs font-mono text-black/40">02 →</span>
            </div>
          </div>

          {/* Asusteet - 5 cols on desktop, 1 col on tablet */}
          <div
            onClick={() => onSelectCategory('asusteet')}
            className="sm:col-span-1 lg:col-span-5 group cursor-pointer"
          >
            <div className="overflow-hidden border border-black/5 bg-white aspect-[4/3] sm:aspect-[4/5] lg:aspect-[4/5]">
              <FashionImage
                alt={t.categoriesMosaic.accessories}
                position="center 60%"
                scale={1.3}
                aspectRatio="auto"
                className="w-full h-full"
                imageClassName="group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal group-hover:underline underline-offset-4">
                  {t.categoriesMosaic.accessories}
                </h3>
                <p className="text-xs font-sans text-black/50 mt-0.5 sm:mt-1">
                  {t.categoriesMosaic.subAcc}
                </p>
              </div>
              <span className="text-xs font-mono text-black/40">03 →</span>
            </div>
          </div>

          {/* Kokoelmat - 7 cols on desktop, 1 col on tablet */}
          <div
            onClick={() => onSelectCategory('kokoelmat')}
            className="sm:col-span-1 lg:col-span-7 group cursor-pointer lg:-mt-10"
          >
            <div className="overflow-hidden border border-black/5 bg-white aspect-[4/3] sm:aspect-[16/11]">
              <FashionImage
                alt={t.categoriesMosaic.collections}
                position="center 30%"
                scale={1.12}
                aspectRatio="auto"
                className="w-full h-full"
                imageClassName="group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal group-hover:underline underline-offset-4">
                  {t.categoriesMosaic.collections}
                </h3>
                <p className="text-xs font-sans text-black/50 mt-0.5 sm:mt-1">
                  {t.categoriesMosaic.subCol}
                </p>
              </div>
              <span className="text-xs font-mono text-black/40">04 →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. "VALITUT" (FEATURED HORIZONTAL SCROLL RAIL) */}
      <section className="w-full py-14 sm:py-20 md:py-28 border-b border-black/10">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 mb-6 sm:mb-8 flex items-end justify-between">
          <div>
            <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-black/40 block mb-1 sm:mb-2">
              {t.featured.tag}
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-normal">
              {t.featured.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollRail('left')}
              className="w-9 h-9 sm:w-10 sm:h-10 border border-black/20 flex items-center justify-center hover:border-black transition-colors cursor-pointer"
              aria-label="Vieritä vasemmalle"
            >
              <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => scrollRail('right')}
              className="w-9 h-9 sm:w-10 sm:h-10 border border-black/20 flex items-center justify-center hover:border-black transition-colors cursor-pointer"
              aria-label="Vieritä oikealle"
            >
              <ChevronRight className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>

        {/* Scrollable container with snap */}
        <div
          ref={featuredRailRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar px-4 sm:px-6 md:px-10 snap-x snap-mandatory"
        >
          {liveProducts.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="w-[240px] sm:w-[300px] md:w-[340px] flex-shrink-0 snap-start group relative flex flex-col justify-between"
            >
              <div className="relative">
                {/* Plate number */}
                <div className="flex items-center justify-between pb-1.5 sm:pb-2">
                  <span className="font-mono text-[10px] tracking-wider text-black/40">
                    {product.plateNumber}
                  </span>
                  {product.isLimited && (
                    <span className="font-mono text-[9px] tracking-wider uppercase text-black/60">
                      {language === 'fi' ? 'Rajoitettu erä' : 'Limited'}
                    </span>
                  )}
                </div>

                {/* Image container */}
                <div
                  onClick={() => onSelectProduct(product)}
                  className="cursor-pointer overflow-hidden border border-black/5 bg-white relative aspect-[3/4]"
                >
                  <FashionImage
                    alt={product.name[language]}
                    position={product.cropVariation.packshot.position}
                    scale={product.cropVariation.packshot.scale}
                    aspectRatio="auto"
                    className="w-full h-full"
                    imageClassName="group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* Quick-add size strip sliding up on desktop hover */}
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
                        className="px-2 py-1 text-[10px] font-mono border border-black/20 hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Info Beneath */}
              <div className="pt-2 sm:pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4
                    onClick={() => onSelectProduct(product)}
                    className="font-sans text-xs font-medium text-black group-hover:underline underline-offset-4 cursor-pointer truncate"
                  >
                    {product.name[language]}
                  </h4>
                  <span className="font-mono text-xs text-black/90 whitespace-nowrap">
                    {formatPrice(product.price)}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-black/40 mt-0.5 truncate">
                  {product.material[language]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. FULL-BLEED LOOKBOOK BAND */}
      <section className="relative w-full h-[60vh] sm:h-[75vh] md:h-[90vh] overflow-hidden select-none bg-black">
        <img
          src={PLACEHOLDER_IMG}
          alt="Campaign Lookbook"
          className="w-full h-full object-cover object-[center_18%]"
        />
        <div className="absolute bottom-6 sm:bottom-8 right-4 sm:right-8 z-10">
          <button
            type="button"
            onClick={() => onSelectCategory('kokoelmat')}
            className="px-3.5 sm:px-4 py-2 bg-white/90 backdrop-blur-sm border border-black/20 text-xs font-mono uppercase tracking-[0.16em] hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            {t.lookbook.link}
          </button>
        </div>
      </section>

      {/* 7. "MATERIAALI JA TYÖ" (3 tall images with one short sentence each) */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-32 border-b border-black/10">
        <div className="mb-10 sm:mb-14 text-center max-w-xl mx-auto">
          <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-black/40 block mb-2 sm:mb-3">
            {t.craft.tag}
          </span>
          <h2 className="font-editorial text-2xl sm:text-4xl md:text-5xl font-normal leading-tight">
            {t.craft.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
          {/* Villa */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] sm:aspect-[3/5] overflow-hidden border border-black/5 bg-white mb-4 sm:mb-6">
              <FashionImage
                alt={t.craft.woolTitle}
                position="center 18%"
                scale={1.3}
                aspectRatio="auto"
                className="w-full h-full"
              />
            </div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-black/40 mb-1">
              01 · VILLA
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-1.5 sm:mb-2">
              {t.craft.woolTitle}
            </h3>
            <p className="text-xs font-sans text-black/60 leading-relaxed">
              {t.craft.woolDesc}
            </p>
          </div>

          {/* Puuvilla */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] sm:aspect-[3/5] overflow-hidden border border-black/5 bg-white mb-4 sm:mb-6">
              <FashionImage
                alt={t.craft.cottonTitle}
                position="center 45%"
                scale={1.5}
                aspectRatio="auto"
                className="w-full h-full"
              />
            </div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-black/40 mb-1">
              02 · PUUVILLA
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-1.5 sm:mb-2">
              {t.craft.cottonTitle}
            </h3>
            <p className="text-xs font-sans text-black/60 leading-relaxed">
              {t.craft.cottonDesc}
            </p>
          </div>

          {/* Käsityö */}
          <div className="flex flex-col">
            <div className="aspect-[3/4] sm:aspect-[3/5] overflow-hidden border border-black/5 bg-white mb-4 sm:mb-6">
              <FashionImage
                alt={t.craft.craftTitle}
                position="center 70%"
                scale={1.4}
                aspectRatio="auto"
                className="w-full h-full"
              />
            </div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-black/40 mb-1">
              03 · KÄSITYÖ
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-1.5 sm:mb-2">
              {t.craft.craftTitle}
            </h3>
            <p className="text-xs font-sans text-black/60 leading-relaxed">
              {t.craft.craftDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 8. JOURNAL TEASER (3 image cards) */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-20 md:py-28 border-b border-black/10">
        <div className="mb-8 sm:mb-12 flex items-baseline justify-between">
          <div>
            <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.22em] uppercase text-black/40 block mb-1 sm:mb-2">
              {t.journal.tag}
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-normal">
              {t.journal.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenJournalArticle(JOURNAL_ARTICLES[0].id)}
            className="text-xs font-mono uppercase tracking-[0.14em] text-black/60 hover:text-black underline underline-offset-4 cursor-pointer"
          >
            {language === 'fi' ? 'Kaikki merkinnät' : 'All Entries'} →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {JOURNAL_ARTICLES.map((article) => (
            <article
              key={article.id}
              onClick={() => onOpenJournalArticle(article.id)}
              className="group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/10] overflow-hidden border border-black/5 bg-white mb-3 sm:mb-4">
                  <FashionImage
                    alt={article.title[language]}
                    position={article.cropPosition}
                    scale={1.2}
                    aspectRatio="auto"
                    className="w-full h-full"
                    imageClassName="group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-mono text-black/40 mb-1.5 sm:mb-2">
                  <span>{article.date}</span>
                  <span>·</span>
                  <span>{article.readTime}</span>
                </div>
                <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-1.5 sm:mb-2 leading-snug group-hover:underline underline-offset-4">
                  {article.title[language]}
                </h3>
                <p className="text-xs font-sans text-black/60 leading-relaxed">
                  {article.subtitle[language]}
                </p>
              </div>

              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-black/5">
                <span className="text-[11px] font-mono tracking-wider text-black/80 group-hover:text-black">
                  {t.journal.readArticle} →
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 9. SUSTAINABILITY STRIP */}
      <section className="w-full bg-[#000000] text-[#FFFFFF] py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-10">
        <div className="max-w-[1720px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-14">
          <div className="border-t border-white/20 pt-4 sm:pt-6">
            <span className="font-mono text-[10px] tracking-[0.22em] text-white/50 block mb-1.5 sm:mb-2 uppercase">
              01 · KIERRÄTYS
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-2 sm:mb-3 text-white">
              {t.sustainability.pledge1Title}
            </h3>
            <p className="text-xs font-sans text-white/70 leading-relaxed">
              {t.sustainability.pledge1Desc}
            </p>
          </div>

          <div className="border-t border-white/20 pt-4 sm:pt-6">
            <span className="font-mono text-[10px] tracking-[0.22em] text-white/50 block mb-1.5 sm:mb-2 uppercase">
              02 · PUHTAUS
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-2 sm:mb-3 text-white">
              {t.sustainability.pledge2Title}
            </h3>
            <p className="text-xs font-sans text-white/70 leading-relaxed">
              {t.sustainability.pledge2Desc}
            </p>
          </div>

          <div className="border-t border-white/20 pt-4 sm:pt-6">
            <span className="font-mono text-[10px] tracking-[0.22em] text-white/50 block mb-1.5 sm:mb-2 uppercase">
              03 · VASTUU
            </span>
            <h3 className="font-editorial text-xl sm:text-2xl font-normal mb-2 sm:mb-3 text-white">
              {t.sustainability.pledge3Title}
            </h3>
            <p className="text-xs font-sans text-white/70 leading-relaxed">
              {t.sustainability.pledge3Desc}
            </p>
          </div>
        </div>
      </section>

      {/* 10. WAITLIST / INVITATION */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 md:py-32 border-b border-black/10">
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-[10.5px] sm:text-[11px] font-mono tracking-[0.24em] uppercase text-black/40 block mb-2 sm:mb-3">
            {t.waitlist.tag}
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal mb-3 sm:mb-4">
            {t.waitlist.title}
          </h2>
          <p className="text-xs sm:text-sm font-sans text-black/60 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-2">
            {t.waitlist.subtitle}
          </p>

          {!waitlistSubmitted ? (
            <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.waitlist.placeholder}
                className="flex-1 px-4 py-3 border border-black/20 text-xs font-sans placeholder:text-black/35 focus:outline-none focus:border-black transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-3 text-xs uppercase tracking-[0.18em] btn-primary font-medium cursor-pointer"
              >
                {t.waitlist.button}
              </button>
            </form>
          ) : (
            <div className="p-4 border border-black flex items-center justify-center gap-2 max-w-md mx-auto">
              <Check className="w-4 h-4" />
              <span className="text-xs font-sans tracking-wide">
                {t.waitlist.success}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
