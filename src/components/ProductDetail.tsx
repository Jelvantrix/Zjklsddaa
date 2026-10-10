import React, { useState } from 'react';
import { Product, Language, translations, formatPrice } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { FashionImage } from './FashionImage';
import { SizeGuideModal } from './SizeGuideModal';
import {
  ChevronDown,
  Heart,
  Maximize2,
  X,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface ProductDetailProps {
  product: Product;
  language: Language;
  onBackToArchive: () => void;
  onAddToCart: (product: Product, size: string) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  isWishlisted: boolean;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  language,
  onBackToArchive,
  onAddToCart,
  onSelectProduct,
  onToggleWishlist,
  isWishlisted,
}) => {
  const { products } = useStorefrontData();
  const t = translations[language];

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [activeMobileImageIdx, setActiveMobileImageIdx] = useState(0);
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);
  const [waitlistRegistered, setWaitlistRegistered] = useState(false);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    desc: true,
    care: false,
    shipping: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAdd = () => {
    onAddToCart(product, selectedSize);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2000);
  };

  // Diverse crops of the studio model photo on pure white background
  const legacyGalleryCrops = [
    { pos: product?.cropVariation?.packshot?.position || 'center 20%', scale: product?.cropVariation?.packshot?.scale || 1, label: '01 · Full Silhouette' },
    { pos: product?.cropVariation?.onModel?.position || 'center 20%', scale: product?.cropVariation?.onModel?.scale || 1.05, flipped: true, label: '02 · Atelier Model' },
    { pos: product?.cropVariation?.detail1?.position || 'center 15%', scale: product?.cropVariation?.detail1?.scale || 1.4, label: '03 · Collar & Fastening' },
    { pos: product?.cropVariation?.detail2?.position || 'center 35%', scale: product?.cropVariation?.detail2?.scale || 1.6, label: '04 · Weave Texture' },
    { pos: product?.cropVariation?.detail3?.position || 'center 50%', scale: product?.cropVariation?.detail3?.scale || 1.3, label: '05 · Profile & Pockets' },
    { pos: product?.cropVariation?.detail4?.position || 'center 60%', scale: product?.cropVariation?.detail4?.scale || 1.5, label: '06 · Hand-Finished Seams' },
  ];

  // Real uploaded gallery images (with their own non-destructive framing) win
  // over the legacy studio crops. Empty gallery -> honest placeholder only.
  const galleryEntries = (() => {
    const images = (product.images || [])
      .filter((img) => img && img.url)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (images.length === 0) {
      return legacyGalleryCrops.map((c) => ({
        src: undefined as string | undefined,
        pos: c.pos,
        scale: c.scale,
        flipped: c.flipped,
        framing: product.framing,
        alt: undefined as string | undefined,
        label: c.label,
      }));
    }

    return images.map((img, idx) => ({
      src: img.url as string | undefined,
      pos: img.position,
      scale: img.scale,
      flipped: undefined as boolean | undefined,
      framing: img.framing || product.framing,
      alt: img.alt?.[language] || img.alt?.en || undefined,
      label: `${String(idx + 1).padStart(2, '0')} · ${
        img.alt?.[language] || img.alt?.en || product.name[language]
      }`,
    }));
  })();

  const galleryCrops = galleryEntries;

  // Recommendations from real products
  const completeTheLook = (products || []).filter(
    (p) => p.id !== product.id && p.category !== product.category
  ).slice(0, 3);

  const othersViewed = (products || []).filter(
    (p) => p.id !== product.id && p.category === product.category
  ).slice(0, 4);

  const mobileGalleryTouchStartX = React.useRef<number | null>(null);
  const handleMobileGalleryTouchStart = (e: React.TouchEvent) => {
    mobileGalleryTouchStartX.current = e.touches[0].clientX;
  };
  const handleMobileGalleryTouchEnd = (e: React.TouchEvent) => {
    if (mobileGalleryTouchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - mobileGalleryTouchStartX.current;
    if (delta < -35) {
      // swipe left -> next image
      setActiveMobileImageIdx((prev) => (prev + 1) % galleryCrops.length);
    } else if (delta > 35) {
      // swipe right -> prev image
      setActiveMobileImageIdx((prev) => (prev - 1 + galleryCrops.length) % galleryCrops.length);
    }
    mobileGalleryTouchStartX.current = null;
  };

  return (
    <article className="w-full bg-white text-black min-h-screen pt-24 sm:pt-32 lg:pt-36 pb-28 md:pb-20">
      {/* Top Breadcrumb & Return line */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-3.5 sm:py-5 border-b border-black/10 flex items-center justify-between text-xs font-mono">
        <button
          type="button"
          onClick={onBackToArchive}
          className="flex items-center gap-1.5 sm:gap-2 text-black/60 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Archive</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-black/40 truncate text-[11px] sm:text-xs">
          <span>{product.plateNumber}</span>
          <span>·</span>
          <span className="uppercase truncate">{product.category}</span>
        </div>
      </div>

      {/* Main PDP Grid */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16">
        {/* LEFT COLUMN: SCROLLING IMAGE STACK (Desktop & Tablet) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6 sm:space-y-8">
          {galleryCrops.map((crop, idx) => (
            <div
              key={idx}
              onClick={() => setZoomedImageIndex(idx)}
              className="relative group cursor-zoom-in border border-black/5 overflow-hidden aspect-[3/4] bg-white"
            >
              <FashionImage
                product={product}
                src={crop.src ?? (idx % 2 === 1 ? (product.hoverImage || product.image) : product.image)}
                alt={crop.alt || `${product.name[language]} - Kuva ${idx + 1}`}
                framing={crop.framing}
                placement="productPage"
                position={crop.pos}
                scale={crop.scale}
                flipped={crop.flipped}
                aspectRatio="auto"
                className="w-full h-full"
                imageClassName="group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 font-mono text-[10px] text-black/40 tracking-wider">
                {crop.label}
              </div>
              <div className="absolute bottom-4 right-4 p-1 text-black/60 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Maximize2 className="w-4 h-4 stroke-[1.5]" />
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE & TABLET GALLERY (< 1024px) WITH TOUCH SWIPE */}
        <div
          onTouchStart={handleMobileGalleryTouchStart}
          onTouchEnd={handleMobileGalleryTouchEnd}
          className="lg:hidden relative select-none"
        >
          <div className="aspect-[3/4] border border-black/5 overflow-hidden bg-white max-w-lg mx-auto relative group">
            <FashionImage
              product={product}
              src={
                galleryCrops[activeMobileImageIdx].src ??
                (activeMobileImageIdx % 2 === 1 ? (product.hoverImage || product.image) : product.image)
              }
              alt={galleryCrops[activeMobileImageIdx].alt || product.name[language]}
              framing={galleryCrops[activeMobileImageIdx].framing}
              placement="productPage"
              position={galleryCrops[activeMobileImageIdx].pos}
              scale={galleryCrops[activeMobileImageIdx].scale}
              flipped={galleryCrops[activeMobileImageIdx].flipped}
              aspectRatio="auto"
              className="w-full h-full"
            />
            {/* Mobile swipe indicator */}
            <div className="absolute top-3 left-3 text-[10px] font-mono text-black/60 tracking-wider">
              0{activeMobileImageIdx + 1} / 0{galleryCrops.length} · {galleryCrops[activeMobileImageIdx].label}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
            {galleryCrops.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setActiveMobileImageIdx(i)}
                className={`h-0.5 transition-all cursor-pointer ${
                  activeMobileImageIdx === i ? 'bg-black w-6' : 'bg-black/20 w-3 hover:bg-black/40'
                }`}
                aria-label={`Siirry kuvaan ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY PURCHASE MODULE */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 space-y-6 sm:space-y-8">
            {/* Title & Price Header */}
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="font-mono text-xs tracking-[0.24em] text-black/40 uppercase">
                  {t.pdp.plate} {product.plateNumber}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className="p-2 text-black/60 hover:text-black cursor-pointer transition-colors flex items-center justify-center"
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Saved' : 'Add to Wishlist'}
                >
                  <Heart
                    className={`w-4 h-4 stroke-[1.5] ${
                      isWishlisted ? 'fill-black text-black' : ''
                    }`}
                  />
                </button>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal leading-[1.08] mb-2 sm:mb-3">
                {product.name[language]}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xl sm:text-2xl text-black">
                  {formatPrice(product.price)}
                </span>
                <span className="font-mono text-xs text-black/50">
                  {t.pdp.vatIncluded}
                </span>
              </div>

              <p className="font-mono text-xs text-black/50 mt-1.5">
                {product.material[language]} · {product.origin[language]}
              </p>
            </div>

            {/* Limited Stock Note */}
            {product.isLimited && (
              <div className="py-2 border-b border-black/10 flex items-center justify-between text-xs font-mono">
                <span className="uppercase tracking-wider text-black/60">{t.archive.limited}</span>
                <span className="text-black/80">{t.archive.stockLeft.replace('{count}', product.stock.toString())}</span>
              </div>
            )}

            {/* Size Selector: Pure typography without box enclosures */}
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="font-mono text-xs uppercase tracking-wider text-black/60">
                  {t.pdp.selectSize}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="font-mono text-xs text-black underline underline-offset-4 hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {t.pdp.sizeGuide}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                {product.sizes.map((sz) => (
                  <button
                    type="button"
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-1 text-sm font-mono tracking-wider transition-colors cursor-pointer ${
                      selectedSize === sz
                        ? 'text-black font-semibold border-b-2 border-black'
                        : 'text-black/40 hover:text-black'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Buy CTA or Coming Soon Waitlist */}
            <div>
              {product.isComingSoon || product.status === 'coming_soon' ? (
                <div className="space-y-3 pt-2 font-mono">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-black font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    <span>Coming Soon · Priority Accession</span>
                  </div>
                  {product.comingSoonNotice && (
                    <p className="text-xs text-black/70 font-sans">
                      {product.comingSoonNotice}
                    </p>
                  )}
                  {waitlistRegistered ? (
                    <p className="text-xs font-mono text-black flex items-center gap-1.5 py-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>Registered for Private Drop Accession Notice</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWaitlistRegistered(true)}
                      className="w-full py-3.5 sm:py-4 text-xs font-mono uppercase tracking-[0.22em] btn-primary font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Join Priority Waitlist</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAdd}
                  className="w-full py-3.5 sm:py-4 text-xs font-mono uppercase tracking-[0.22em] btn-primary font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAddedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t.pdp.addedToCart}</span>
                    </>
                  ) : (
                    <span>{t.pdp.addToCart}</span>
                  )}
                </button>
              )}
            </div>

            {/* ACCORDION MODULES */}
            <div className="border-t border-black/10 pt-2 sm:pt-4 divide-y divide-black/10">
              {/* 1. Kuvaus */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('desc')}
                  className="w-full py-3.5 sm:py-4 flex items-center justify-between text-left text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  <span>{t.pdp.descTitle}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openAccordions.desc ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.desc && (
                  <div className="pb-4 sm:pb-5 text-xs font-sans text-black/70 leading-relaxed space-y-2">
                    <p>{product.description[language]}</p>
                    <p className="font-mono text-[11px] text-black/50 pt-1">
                      Model is 178 cm / 5&apos;10&quot; wearing size S.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Materiaali ja hoito */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('care')}
                  className="w-full py-3.5 sm:py-4 flex items-center justify-between text-left text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  <span>{t.pdp.careTitle}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openAccordions.care ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.care && (
                  <div className="pb-4 sm:pb-5 text-xs font-sans text-black/70 leading-relaxed space-y-2">
                    <p><strong>Fabrication:</strong> {product.material[language]}</p>
                    <p><strong>Provenance:</strong> {product.origin[language]}</p>
                    <p><strong>Care Guidance:</strong> {product.care[language]}</p>
                  </div>
                )}
              </div>

              {/* 3. Toimitus ja palautus */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('shipping')}
                  className="w-full py-3.5 sm:py-4 flex items-center justify-between text-left text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  <span>{t.pdp.shippingTitle}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openAccordions.shipping ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.shipping && (
                  <div className="pb-4 sm:pb-5 text-xs font-sans text-black/70 leading-relaxed space-y-2">
                    <p>{t.pdp.shippingInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY ADD-TO-BAG BAR (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-black/10 py-3 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs block font-medium">{formatPrice(product.price)}</span>
          <span className="font-mono text-[9.5px] text-black/50">Koko: {selectedSize}</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="py-1.5 px-3 text-xs font-mono uppercase tracking-[0.2em] font-medium text-black border-b border-black cursor-pointer active:opacity-60 transition-opacity"
        >
          {isAddedFeedback ? t.pdp.addedToCart : t.pdp.addToCart}
        </button>
      </div>

      {/* RECOMMENDATIONS */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 border-t border-black/10">
        <div className="mb-6 sm:mb-8">
          <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.24em] uppercase text-black/40 block mb-1">
            {t.pdp.completeLook}
          </span>
          <h3 className="font-editorial text-2xl sm:text-3xl font-normal">
            Harmonious Synthesis
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {completeTheLook.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className="group cursor-pointer"
            >
              <div className="aspect-[3/4] overflow-hidden border border-black/5 bg-white mb-3">
                <FashionImage
                  product={p}
                  src={p.image}
                  alt={p.name[language]}
                  placement="card"
                  position={p.cropVariation.packshot.position}
                  scale={p.cropVariation.packshot.scale}
                  aspectRatio="auto"
                  className="w-full h-full"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <span className="font-mono text-[10px] text-black/40 block">
                {p.plateNumber}
              </span>
              <h4 className="font-sans text-xs font-medium group-hover:underline underline-offset-4 truncate">
                {p.name[language]}
              </h4>
              <p className="font-mono text-xs text-black/70 mt-0.5">
                {formatPrice(p.price)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* IMAGE ZOOM LIGHTROOM MODAL */}
      {zoomedImageIndex !== null && (
        <div
          onClick={() => setZoomedImageIndex(null)}
          className="fixed inset-0 z-[99] bg-white/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            type="button"
            onClick={() => setZoomedImageIndex(null)}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 text-black hover:opacity-70 cursor-pointer"
          >
            <X className="w-6 h-6 stroke-[1.5]" />
          </button>
          <div className="max-w-2xl md:max-w-4xl max-h-[85vh] aspect-[3/4] overflow-hidden border border-black/20">
            <FashionImage
              product={product}
              src={
                galleryCrops[zoomedImageIndex].src ??
                (zoomedImageIndex % 2 === 1 ? (product.hoverImage || product.image) : product.image)
              }
              alt={galleryCrops[zoomedImageIndex].alt || `${product.name[language]} — enlarged view`}
              framing={galleryCrops[zoomedImageIndex].framing}
              placement="productPage"
              position={galleryCrops[zoomedImageIndex].pos}
              scale={(galleryCrops[zoomedImageIndex].scale || 1) * 1.3}
              flipped={galleryCrops[zoomedImageIndex].flipped}
              aspectRatio="auto"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* SIZE GUIDE MODAL */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        language={language}
      />
    </article>
  );
};
