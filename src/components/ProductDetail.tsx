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
      label: `${String(idx + 1).padStart(2,'0')} · ${
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
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-3.5 sm:py-5 flex items-center justify-between text-small">
        <button
          type="button"
          onClick={onBackToArchive}
          className="flex items-center gap-1.5 sm:gap-2 text-black/60 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Archive</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-black/40 truncate text-small sm:text-small">
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
              className="relative group cursor-zoom-in overflow-hidden aspect-[3/4] bg-white"
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
              <div className="absolute top-4 left-4 text-small text-black/40 tracking-wider">
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
          <div className="aspect-[3/4] overflow-hidden bg-white max-w-lg mx-auto relative group">
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
            {/* Mobile indicator */}
            <div className="absolute top-3 left-3 text-small text-black/60">
              {activeMobileImageIdx + 1} / {galleryCrops.length}
            </div>
          </div>

          {/* Text Choice Selector */}
          <div className="flex items-center justify-center gap-4 mt-3">
            {galleryCrops.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setActiveMobileImageIdx(i)}
                className={`text-small cursor-pointer ${ activeMobileImageIdx === i ?'text-black underline' : 'text-black/30'
                }`}
              >
                0{i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY PURCHASE MODULE */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 space-y-8">
            {/* Title & Price Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-small text-black/50">
                  {product.category || 'Garment'}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className="text-black/60 hover:text-black cursor-pointer transition-colors"
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Saved' : 'Add to Wishlist'}
                >
                  <Heart
                    className={`w-4 h-4 stroke-[1.5] ${ isWishlisted ?'fill-black text-black' : ''
                    }`}
                  />
                </button>
              </div>

              <h1 className="text-display mb-3">
                {product.name[language]}
              </h1>

              <div className="flex items-baseline gap-3">
                <span className="text-title text-black">
                  {formatPrice(product.price)}
                </span>
                <span className="text-small text-black/50">
                  VAT incl.
                </span>
              </div>

              <p className="text-body text-black/50 mt-2">
                {product.material[language]} · {product.origin[language]}
              </p>
            </div>

            {/* Size Selector: Pure typography */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-small text-black/60">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-small text-black hover:underline cursor-pointer"
                >
                  Size Guide
                </button>
              </div>

              <div className="flex items-center gap-6 pt-1">
                {product.sizes.map((sz) => (
                  <button
                    type="button"
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`text-body transition-colors cursor-pointer ${ selectedSize === sz ?'text-black font-bold underline'
                        : 'text-black/40 hover:text-black'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Buy CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAdd}
                className="text-body text-black hover:underline cursor-pointer flex items-center gap-2"
              >
                {isAddedFeedback ? (
                  <span>Added to bag</span>
                ) : (
                  <span>Add to bag →</span>
                )}
              </button>
            </div>

            {/* ACCORDION MODULES (Separated by whitespace only) */}
            <div className="pt-6 space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('desc')}
                  className="w-full py-2 flex items-center justify-between text-left text-small cursor-pointer"
                >
                  <span>Description</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${ openAccordions.desc ?'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.desc && (
                  <div className="py-2 text-body text-black/70 leading-relaxed">
                    <p>{product.description[language]}</p>
                  </div>
                )}
              </div>

              {/* 2. Materiaali ja hoito */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('care')}
                  className="w-full py-2 flex items-center justify-between text-left text-small cursor-pointer"
                >
                  <span>{t.pdp.careTitle}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${ openAccordions.care ?'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.care && (
                  <div className="py-2 text-body text-black/70 leading-relaxed space-y-2">
                    <p>Fabrication: {product.material[language]}</p>
                    <p>Provenance: {product.origin[language]}</p>
                    <p>Care: {product.care[language]}</p>
                  </div>
                )}
              </div>

              {/* 3. Shipping */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('shipping')}
                  className="w-full py-2 flex items-center justify-between text-left text-small cursor-pointer"
                >
                  <span>Shipping</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${ openAccordions.shipping ?'rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordions.shipping && (
                  <div className="py-2 text-body text-black/70 leading-relaxed">
                    <p>{t.pdp.shippingInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY ADD-TO-BAG BAR (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white py-3 px-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-body block">{formatPrice(product.price)}</span>
          <span className="text-small text-black/50">Size {selectedSize}</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="text-small text-black underline cursor-pointer"
        >
          {isAddedFeedback ? 'Added' : 'Add to bag →'}
        </button>
      </div>

      {/* RECOMMENDATIONS */}
      <section className="max-w-[1720px] mx-auto px-6 py-16">
        <div className="mb-8">
          <h3 className="text-title">
            Related
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {completeTheLook.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className="cursor-pointer space-y-3"
            >
              <div className="aspect-[3/4] overflow-hidden bg-white">
                <FashionImage
                  product={p}
                  src={p.image}
                  alt={p.name[language]}
                  placement="card"
                  position={p.cropVariation.packshot.position}
                  scale={p.cropVariation.packshot.scale}
                  aspectRatio="auto"
                  className="w-full h-full"
                />
              </div>
              <h4 className="text-body hover:underline truncate">
                {p.name[language]}
              </h4>
              <p className="text-small text-black/70">
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
          className="fixed inset-0 z-[99] bg-white flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            type="button"
            onClick={() => setZoomedImageIndex(null)}
            className="absolute top-6 right-6 text-black hover:opacity-70 cursor-pointer text-small"
          >
            Close
          </button>
          <div className="max-w-2xl md:max-w-4xl max-h-[85vh] aspect-[3/4] overflow-hidden">
            <FashionImage
              product={product}
              src={
                galleryCrops[zoomedImageIndex].src ??
                (zoomedImageIndex % 2 === 1 ? (product.hoverImage || product.image) : product.image)
              }
              alt={galleryCrops[zoomedImageIndex].alt || `${product.name[language]}`}
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
