import React from 'react';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { ArrowLeft, ArrowRight, Compass, Feather, ShieldCheck } from 'lucide-react';

interface StoryPageProps {
  onBackToHome: () => void;
  onExploreArchive: () => void;
}

export const StoryPage: React.FC<StoryPageProps> = ({ onBackToHome, onExploreArchive }) => {
  const { content } = useStorefrontData();
  const plate1 = content?.translations?.storyPlate1;
  const plate2 = content?.translations?.storyPlate2;
  const heroImage = content?.translations?.storyHeroImage || content?.heroMedia?.desktopSrc || content?.heroSlides?.[0]?.src || '/placeholder.svg';
  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000] min-h-screen select-none pt-20 sm:pt-28 lg:pt-32">
      {/* Top Breadcrumb Navigation */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 flex items-center justify-between text-xs font-mono">
        <button
          type="button"
          onClick={onBackToHome}
          className="group flex items-center gap-2 text-black/60 hover:text-black transition-colors cursor-pointer uppercase tracking-[0.2em]"
          aria-label="Return to storefront"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span className="underline underline-offset-4">Return Home</span>
        </button>
        <span className="text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-black/40">
          HOUSE CHARTER · EST. 2026
        </span>
      </div>

      {/* Main Editorial Hero: Clean White Studio Architecture */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          <span className="font-mono text-[10.5px] sm:text-xs tracking-[0.3em] uppercase text-black/45 block">
            HOUSE CHARTER & GENESIS
          </span>
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-normal tracking-tight text-black leading-[1.02]">
            The Architecture of Silence
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-sans text-black/75 max-w-2xl mx-auto leading-relaxed font-light pt-2">
            Zejesh was founded in opposition to seasonal fashion obsolescence. We construct permanent garments carved from natural virgin fibers, tailored with the restraint of Finnish stone and Portuguese loom mastery.
          </p>

          {/* Pure Typographic Hero Actions - NO borders, NO boxes */}
          <div className="pt-6 sm:pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 font-mono text-xs uppercase tracking-[0.22em]">
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

      {/* Large Featured Editorial Image */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 mb-20 sm:mb-32">
        <div className="aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-neutral-100 relative">
          <img
            src={heroImage}
            alt="Zejesh Campaign Still"
            className="w-full h-full object-cover object-[center_28%]"
          />
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-white/90 backdrop-blur-xs px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-black">
            Plate No. 00 · The Greatcoat in Obsidian Wool
          </div>
        </div>
      </div>

      {/* Chapter 01: The Northern Axis */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-28 border-t border-black/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-16 lg:gap-24 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/50">
              <Compass className="w-3.5 h-3.5" />
              <span>Chapter I · Geography</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal text-black leading-tight">
              Between Helsinki and Porto
            </h2>
            <div className="space-y-4 text-xs sm:text-sm md:text-base font-sans text-black/75 leading-relaxed font-light">
              <p>
                Our aesthetic geometry is conceived in Helsinki. The cold, low winter light of the Finnish archipelago demands high-contrast silhouettes: sharp monolithic hemlines, exaggerated storm collars, and total chromatic discipline.
              </p>
              <p>
                Our tailoring occurs in Porto, Portugal—the spiritual heart of European shuttle-loom weaving. In small multi-generational family ateliers, our heavy 620 to 820 gsm virgin wools are woven slowly on low-tension mechanical looms, yielding a drape that refuses to collapse over decades of wear.
              </p>
            </div>
            <div className="pt-2 font-mono text-xs flex items-center gap-6 text-black/50">
              <span>60° 10&apos; N, 24° 56&apos; E</span>
              <span>·</span>
              <span>41° 09&apos; N, 08° 37&apos; W</span>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {plate1 ? (
                <div className="aspect-[3/4] overflow-hidden bg-neutral-100 group relative">
                  <img
                    src={plate1}
                    alt="Atelier Silhouette"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-widest text-black">
                    Plate I · Monolithic Stance
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] border border-dashed border-black/15 bg-neutral-50/50 flex flex-col items-center justify-center p-6 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">Plate I · Studio Ingress</span>
                </div>
              )}
              {plate2 ? (
                <div className="aspect-[3/4] overflow-hidden bg-neutral-100 sm:translate-y-8 group relative">
                  <img
                    src={plate2}
                    alt="Loom Tailoring"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-widest text-black">
                    Plate II · Loom Architecture
                  </div>
                </div>
              ) : (
                <div className="aspect-[3/4] border border-dashed border-black/15 bg-neutral-50/50 sm:translate-y-8 flex flex-col items-center justify-center p-6 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">Plate II · Textile Loom</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 02: The Material Standard */}
      <section className="bg-neutral-50/60 py-20 sm:py-32 border-y border-black/[0.06]">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="max-w-3xl mb-12 sm:mb-20 space-y-4">
            <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.22em] text-black/50">
              <Feather className="w-3.5 h-3.5" />
              <span>Chapter II · Fabrication Standards</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal text-black leading-tight">
              Zero Synthetic Compromise
            </h2>
            <p className="text-xs sm:text-sm md:text-base font-sans text-black/70 leading-relaxed font-light">
              We operate under an absolute textile charter: every fiber selected must decompose naturally back into the soil from which it grew. No polyester blends, no nylon linings, no plastic buttons.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 font-mono">
            <div className="p-6 sm:p-8 bg-white border border-black/[0.05] space-y-3.5">
              <span className="text-[10px] text-black/40 uppercase tracking-widest block">STANDARD 01</span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-black">Unblended Virgin Wool</h3>
              <p className="text-xs sm:text-[13px] font-sans text-black/65 leading-relaxed font-light">
                High-micron pure fleece woven with intact lanolin. Naturally water-repellent, climate-regulating, and immune to artificial chemical pilling.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-white border border-black/[0.05] space-y-3.5">
              <span className="text-[10px] text-black/40 uppercase tracking-widest block">STANDARD 02</span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-black">Natural Corozo Fasteners</h3>
              <p className="text-xs sm:text-[13px] font-sans text-black/65 leading-relaxed font-light">
                Individually carved from the dense seed of the Tagua palm. Each button possesses distinct organic wood-grain striations that patinate with wear.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-white border border-black/[0.05] space-y-3.5">
              <span className="text-[10px] text-black/40 uppercase tracking-widest block">STANDARD 03</span>
              <h3 className="font-editorial text-2xl sm:text-3xl font-normal text-black">Permanent Architecture</h3>
              <p className="text-xs sm:text-[13px] font-sans text-black/65 leading-relaxed font-light">
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
          <h2 className="font-editorial text-3xl sm:text-5xl md:text-7xl font-normal text-black tracking-tight leading-[1.05]">
            The Numbered Archive
          </h2>
          <p className="text-xs sm:text-sm md:text-base font-sans text-black/70 max-w-2xl mx-auto leading-relaxed font-light">
            Every garment released by the house bears an immutable Accession Number (e.g. Nº 001, Nº 014). We do not produce disposable trend collections; we register permanent plates into an ongoing open library.
          </p>

          {/* Pure Typographic Buttons - NO borders, NO boxes */}
          <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 font-mono text-xs uppercase tracking-[0.22em]">
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
