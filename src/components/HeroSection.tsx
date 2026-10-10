import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeroSlide, Language, NEUTRAL_PLACEHOLDER_IMG } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onScrollCueClick: () => void;
  language: Language;
  slides?: HeroSlide[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollCueClick,
  language,
  slides: externalSlides,
}) => {
  const { content } = useStorefrontData();

  // Active enabled slides from database content or props
  const rawSlides = externalSlides || content?.heroSlides || [];
  const slides = rawSlides.filter((s) => s && s.enabled !== false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  useEffect(() => {
    if (currentIndex >= slides.length && slides.length > 0) {
      setCurrentIndex(0);
    }
  }, [slides.length, currentIndex]);

  // Synchronize video play/pause
  useEffect(() => {
    slides.forEach((s, idx) => {
      const vid = videoRefs.current[s.id];
      if (vid) {
        if (idx === currentIndex) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      }
    });
  }, [currentIndex, slides]);

  // Empty state when zero slides are uploaded
  if (slides.length === 0) {
    return (
      <section
        ref={containerRef}
        className="relative w-full h-[100svh] overflow-hidden bg-white select-none flex flex-col items-center justify-center p-6 text-center"
        aria-label="Atelier Hero"
      >
        <div className="max-w-xl space-y-4">
          <span className="text-small text-black/40 block">
            ZEJESH
          </span>
          <h1 className="text-display text-black">
            The Collection
          </h1>
        </div>

        <div
          onClick={onScrollCueClick}
          role="button"
          tabIndex={0}
          aria-label="Scroll to explore"
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-20 text-small text-black/60 hover:text-black"
        >
          Scroll ↓
        </div>
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100svh] overflow-hidden select-none touch-pan-y"
      style={{ touchAction: 'pan-y' }}
      aria-label="Hero Carousel"
    >
      {/* Slide Track */}
      <div
        className="flex flex-row h-full w-full pointer-events-none"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y',
        }}
      >
        {slides.map((slide) => {
          // Resolve media for current viewport (desktop vs mobile)
          const activeMedia = isMobileViewport
            ? slide.mobileMedia || slide.desktopMedia
            : slide.desktopMedia || slide.mobileMedia;

          const mediaUrl =
            activeMedia?.url ||
            (slide as any).src ||
            NEUTRAL_PLACEHOLDER_IMG;

          const videoUrlLike = /\.(mp4|webm)(\?.*)?$/i.test(mediaUrl);

          // Per-device media carries the authoritative kind (with the legacy
          // slide type as fallback), so a desktop video is never rendered as a
          // broken <img> on mobile and vice versa.
          const isVideo =
            videoUrlLike ||
            (activeMedia?.kind ? activeMedia.kind === 'video' : slide.type === 'video');

          const posterUrl = activeMedia?.poster || (slide as any).poster;

          const framing = activeMedia?.framing || slide.framing;
          const placementOverride = framing?.overrides?.[isMobileViewport ? 'heroMobile' : 'heroDesktop'];

          const focalX = placementOverride?.focalX ?? framing?.focalX ?? slide.focalX ?? 50;
          const focalY = placementOverride?.focalY ?? framing?.focalY ?? slide.focalY ?? 20;
          const zoom = placementOverride?.zoom ?? framing?.zoom ?? slide.scale ?? 1.0;
          const rotation = placementOverride?.rotation ?? framing?.rotation ?? slide.rotation ?? 0;
          const flipH = placementOverride?.flipH ?? framing?.flipH ?? false;
          const flipV = placementOverride?.flipV ?? framing?.flipV ?? false;

          const transformStyle = [
            flipH ? 'scaleX(-1)' : '',
            flipV ? 'scaleY(-1)' : '',
            `scale(${zoom})`,
            rotation ? `rotate(${rotation}deg)` : '',
          ]
            .filter(Boolean)
            .join(' ');

          const slideContent = (
            <div className="w-full h-full relative overflow-hidden bg-white">
              {isVideo ? (
                <video
                  ref={(el) => {
                    videoRefs.current[slide.id] = el;
                  }}
                  src={mediaUrl}
                  poster={posterUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                  style={{
                    objectPosition: `${focalX}% ${focalY}%`,
                    transform: transformStyle || undefined,
                    mixBlendMode: 'multiply',
                  }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={activeMedia?.alt || 'Zejesh Hero Presentation'}
                  className="w-full h-full object-cover pointer-events-none transition-transform duration-700 ease-out"
                  style={{
                    objectPosition: `${focalX}% ${focalY}%`,
                    transform: transformStyle || undefined,
                  }}
                  draggable={false}
                  onError={(e) => {
                    // A configured URL that fails resolves to the neutral
                    // placeholder — never a broken-image icon.
                    const el = e.currentTarget;
                    if (el.dataset.fallback !== '1') {
                      el.dataset.fallback = '1';
                      el.src = NEUTRAL_PLACEHOLDER_IMG;
                    }
                  }}
                />
              )}
            </div>
          );

          return (
            <div
              key={slide.id}
              className="w-full h-full shrink-0 flex-none relative overflow-hidden bg-white"
            >
              {slide.linkUrl ? (
                <a
                  href={slide.linkUrl}
                  className="block w-full h-full pointer-events-auto"
                >
                  {slideContent}
                </a>
              ) : (
                slideContent
              )}
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Numbers (Only if multiple slides) */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 right-6 md:right-10 z-20 flex items-center gap-3 pointer-events-auto">
          {slides.map((slide, i) => {
            const isActive = i === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(i);
                }}
                className={`text-small cursor-pointer transition-opacity ${ isActive ?'text-black underline font-bold' : 'text-black/40 hover:text-black'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              >
                0{i + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Manual Slide Navigation Arrows (Only if multiple slides) */}
      {slides.length > 1 && (
        <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-8 pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="pointer-events-auto text-black/50 hover:text-black cursor-pointer text-small"
            aria-label="Previous slide"
            title="Previous slide"
          >
            ←
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="pointer-events-auto text-black/50 hover:text-black cursor-pointer text-small"
            aria-label="Next slide"
            title="Next slide"
          >
            →
          </button>
        </div>
      )}

      {/* Text scroll cue at bottom centre */}
      <div
        onClick={onScrollCueClick}
        role="button"
        tabIndex={0}
        aria-label="Scroll to explore"
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-20 text-small text-black/60 hover:text-black"
      >
        Scroll ↓
      </div>

      <style>{`
        @keyframes scrollCue {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          40% {
            opacity: 1;
          }
          80% {
            transform: translateY(200%);
            opacity: 0;
          }
          100% {
            transform: translateY(200%);
            opacity: 0;
          }
        }
        .animate-scrollCue {
          animation: scrollCue 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
      `}</style>
    </section>
  );
};
