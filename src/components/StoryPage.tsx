import React, { useState } from 'react';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { ImageFramingParams, NEUTRAL_PLACEHOLDER_IMG } from '../types';
import { imageFramingStyle } from './FashionImage';
import type { ImagePlacement } from './FashionImage';
import { ArrowLeft, ArrowRight, Compass, Feather, ShieldCheck } from 'lucide-react';

interface StoryPageProps {
  onBackToHome: () => void;
  onExploreArchive: () => void;
}

interface StoryImageProps {
  /** Configured storage URL. When empty the slot renders nothing at all. */
  src?: string;
  framing?: ImageFramingParams;
  placement: ImagePlacement;
  alt: string;
  legacyPosition?: string;
  className?: string;
}

/**
 * Story page imagery: framing-aware, renders nothing for an empty slot and
 * only falls back to the neutral placeholder when a configured URL fails.
 */
const StoryImage: React.FC<StoryImageProps> = ({
  src,
  framing,
  placement,
  alt,
  legacyPosition,
  className,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  let style: React.CSSProperties | undefined;
  if (!failed) {
    if (framing) style = imageFramingStyle(framing, placement, legacyPosition);
    else if (legacyPosition) style = { objectPosition: legacyPosition };
  }

  return (
    <img
      src={failed ? NEUTRAL_PLACEHOLDER_IMG : src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

export const StoryPage: React.FC<StoryPageProps> = ({ onBackToHome, onExploreArchive }) => {
  const { content } = useStorefrontData();
  const storyContent = content?.translations || {};
  const heroImage: string | undefined = storyContent.storyHeroImage;
  const heroFraming: ImageFramingParams | undefined = storyContent.storyHeroFraming;
  const plate1: string | undefined = storyContent.storyPlate1;
  const plate1Framing: ImageFramingParams | undefined = storyContent.storyPlate1Framing;
  const plate2: string | undefined = storyContent.storyPlate2;
  const plate2Framing: ImageFramingParams | undefined = storyContent.storyPlate2Framing;
  return (
    <div className="w-full text-[#000000] min-h-screen select-none pt-20 sm:pt-28 lg:pt-32">
      {/* Top Breadcrumb Navigation */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between text-small">
        <button
          type="button"
          onClick={onBackToHome}
          className="group flex items-center gap-2 text-black/60 hover:text-black transition-colors cursor-pointer uppercase tracking-[0.2em]"
          aria-label="Return to storefront"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="underline underline-offset-4">Return Home</span>
        </button>
        <span className="text-small sm:text-small tracking-[0.28em] uppercase text-black/40">
          HOUSE CHARTER · EST. 2026
        </span>
      </div>

      {/* Main Editorial Hero: Clean White Studio Architecture */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          <span className="text-small sm:text-small tracking-[0.3em] uppercase text-black/45 block">
            HOUSE CHARTER & GENESIS
          </span>
          <h1 className="font-serif text-display sm:text-display md:text-display lg:text-8xl xl:text-9xl font-normal tracking-tight text-black leading-[1.02]">
            The Architecture of Silence
          </h1>
          <p className="text-small sm:text-body md:text-title text-black/75 max-w-2xl mx-auto leading-relaxed font-light pt-2">
            Zejesh was founded in opposition to seasonal fashion obsolescence. We construct permanent garments carved from natural virgin fibers, tailored with the restraint of Finnish stone and Portuguese loom mastery.
          </p>

          {/* Pure Typographic Hero Actions - NO borders, NO boxes */}
          <div className="pt-6 sm:pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-small uppercase tracking-[0.22em]">
            <button
              type="button"
              onClick={onExploreArchive}
              className="group inline-flex items-center gap-2 text-black hover:opacity-60 transition-opacity cursor-pointer underline underline-offset-8"
            >
              <span>Explore Permanent Archive</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="text-black/60 hover:text-black transition-colors cursor-pointer"
            >
              <span>Storefront Overview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Large Featured Editorial Image — empty slot renders nothing */}
      {heroImage && (
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 mb-20 sm:mb-32">
          <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden relative">
            <StoryImage
              src={heroImage}
              framing={heroFraming}
              placement="heroDesktop"
              legacyPosition="center 28%"
              alt="Zejesh Campaign Still"
              className="w-full h-full object-cover object-[center_28%]"
            />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 backdrop-blur-xs px-3 py-1.5 text-small uppercase tracking-widest text-black">
              Plate No. 00 · The Greatcoat in Obsidian Wool
            </div>
          </div>
        </div>
      )}

      {/* Chapter 01: The Northern Axis */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-16 lg:gap-24 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 text-small uppercase tracking-[0.22em] text-black/50">
              <Compass className="w-3.5 h-3.5" />
              <span>Chapter I · Geography</span>
            </div>
            <h2 className="font-serif text-display sm:text-display md:text-display font-normal text-black leading-tight">
              Between Helsinki and Porto
            </h2>
            <div className="space-y-4 text-small sm:text-small md:text-body text-black/75 leading-relaxed font-light">
              <p>
                Our aesthetic geometry is conceived in Helsinki. The cold, low winter light of the Finnish archipelago demands high-contrast silhouettes: sharp monolithic hemlines, exaggerated storm collars, and total chromatic discipline.
              </p>
              <p>
                Our tailoring occurs in Porto, Portugal—the spiritual heart of European shuttle-loom weaving. In small multi-generational family ateliers, our heavy 620 to 820 gsm virgin wools are woven slowly on low-tension mechanical looms, yielding a drape that refuses to collapse over decades of wear.
              </p>
            </div>
            <div className="pt-2 text-small flex items-center gap-6 text-black/50">
              <span>60° 10&apos; N, 24° 56&apos; E</span>
              <span>·</span>
              <span>41° 09&apos; N, 08° 37&apos; W</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            {(plate1 || plate2) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {plate1 && (
                  <div className="aspect-[3/4] overflow-hidden group relative">
                    <StoryImage
                      src={plate1}
                      framing={plate1Framing}
                      placement="archive"
                      alt="Atelier Silhouette"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 left-3 backdrop-blur-xs px-2.5 py-1 text-small uppercase tracking-widest text-black">
                      Plate I · Monolithic Stance
                    </div>
                  </div>
                )}
                {plate2 && (
                  <div className="aspect-[3/4] overflow-hidden sm:translate-y-8 group relative">
                    <StoryImage
                      src={plate2}
                      framing={plate2Framing}
                      placement="archive"
                      alt="Loom Tailoring"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute bottom-3 left-3 backdrop-blur-xs px-2.5 py-1 text-small uppercase tracking-widest text-black">
                      Plate II · Loom Architecture
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chapter 02: The Material Standard */}
      <section className="py-20 sm:py-32">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="max-w-3xl mb-12 sm:mb-20 space-y-4">
            <div className="flex items-center gap-2 text-small uppercase tracking-[0.22em] text-black/50">
              <Feather className="w-3.5 h-3.5" />
              <span>Chapter II · Fabrication Standards</span>
            </div>
            <h2 className="font-serif text-display sm:text-display md:text-display font-normal text-black leading-tight">
              Zero Synthetic Compromise
            </h2>
            <p className="text-small sm:text-small md:text-body text-black/70 leading-relaxed font-light">
              We operate under an absolute textile charter: every fiber selected must decompose naturally back into the soil from which it grew. No polyester blends, no nylon linings, no plastic buttons.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 sm:p-8 bg-white space-y-3.5">
              <span className="text-small text-black/40 uppercase tracking-widest block">STANDARD 01</span>
              <h3 className="font-serif text-title sm:text-display font-normal text-black">Unblended Virgin Wool</h3>
              <p className="text-small sm:text-small text-black/65 leading-relaxed font-light">
                High-micron pure fleece woven with intact lanolin. Naturally water-repellent, climate-regulating, and immune to artificial chemical pilling.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-white space-y-3.5">
              <span className="text-small text-black/40 uppercase tracking-widest block">STANDARD 02</span>
              <h3 className="font-serif text-title sm:text-display font-normal text-black">Natural Corozo Fasteners</h3>
              <p className="text-small sm:text-small text-black/65 leading-relaxed font-light">
                Individually carved from the dense seed of the Tagua palm. Each button possesses distinct organic wood-grain striations that patinate with wear.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-white space-y-3.5">
              <span className="text-small text-black/40 uppercase tracking-widest block">STANDARD 03</span>
              <h3 className="font-serif text-title sm:text-display font-normal text-black">Permanent Architecture</h3>
              <p className="text-small sm:text-small text-black/65 leading-relaxed font-light">
                Traditional horsehair-and-linen floating chest canvases that mold precisely to the wearer’s frame over time rather than fused synthetic interlinings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 03: The Accession Plate */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-20 sm:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
          <ShieldCheck className="w-8 h-8 mx-auto stroke-[1.2] text-black/40" />
          <h2 className="font-serif text-display sm:text-display md:text-display font-normal text-black tracking-tight leading-[1.05]">
            The Numbered Archive
          </h2>
          <p className="text-small sm:text-small md:text-body text-black/70 max-w-2xl mx-auto leading-relaxed font-light">
            Every garment released by the house bears an immutable Accession Number (e.g. Nº 001, Nº 014). We do not produce disposable trend collections; we register permanent plates into an ongoing open library.
          </p>

          {/* Pure Typographic Buttons - NO borders, NO boxes */}
          <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-small uppercase tracking-[0.22em]">
            <button
              type="button"
              onClick={onExploreArchive}
              className="group inline-flex items-center gap-2 text-black hover:opacity-60 transition-opacity cursor-pointer underline underline-offset-8"
            >
              <span>Explore Complete Archive</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="text-black/60 hover:text-black transition-colors cursor-pointer"
            >
              <span>Return to Storefront</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
