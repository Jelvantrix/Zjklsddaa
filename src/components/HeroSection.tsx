import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeroSlide, HERO_SLIDES } from '../data/mockData';
import { Language } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onScrollCueClick: () => void;
  language: Language;
  slides?: HeroSlide[];
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollCueClick, language, slides: externalSlides }) => {
  // Exactly 4 slides and 4 dots
  const slides = (externalSlides && externalSlides.length > 0 ? externalSlides : HERO_SLIDES).slice(0, 4);
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Navigation callbacks (moves left or right)
  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Safe slide index boundaries
  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentIndex]);

  // Video autoplay/pause synchronization
  useEffect(() => {
    slides.forEach((s, idx) => {
      if (s.type === 'video') {
        const vid = videoRefs.current[s.id];
        if (vid) {
          if (idx === currentIndex) {
            vid.currentTime = 0;
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        }
      }
    });
  }, [currentIndex, slides]);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[100svh] overflow-hidden bg-[#FFFFFF] select-none touch-pan-y"
      style={{ touchAction: 'pan-y' }}
      aria-label="Hero Carousel"
    >
      {/* 
        Slide Track: Horizontal translation with smooth animation
        (Touch swipe is strictly disabled on mobile and tablet to preserve natural vertical page scrolling)
      */}
      <div
        className="flex flex-row h-full w-full pointer-events-none"
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y',
        }}
      >
        {slides.map((slide) => {
          return (
            <div
              key={slide.id}
              className="w-full h-full shrink-0 flex-none relative overflow-hidden bg-white"
            >
              {slide.type === 'video' ? (
                <video
                  ref={(el) => {
                    videoRefs.current[slide.id] = el;
                  }}
                  src={slide.src}
                  poster={slide.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                  style={{
                    objectPosition: slide.positionDesktop || 'center 18%',
                    transform: `scale(${slide.scale || 1}) rotate(${slide.rotation || 0}deg)`,
                    mixBlendMode: 'multiply',
                  }}
                />
              ) : (
                <img
                  src={slide.src}
                  alt={slide.caption?.[language] || 'Zejesh Studio Fashion Archive'}
                  className="w-full h-full object-cover pointer-events-none transition-transform duration-700 ease-out"
                  style={{
                    objectPosition: slide.positionDesktop || 'center 18%',
                    transform: `scale(${slide.scale || 1}) rotate(${slide.rotation || 0}deg)`,
                  }}
                  draggable={false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Dots: 4 dots at bottom-right */}
      <div className="absolute bottom-6 sm:bottom-8 right-4 sm:right-8 md:right-10 z-20 flex items-center gap-2 pointer-events-auto">
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
              className="group p-1.5 cursor-pointer flex items-center justify-center transition-all focus:outline-none"
              aria-label={`Go to slide ${i + 1}`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-2.5 h-2.5 bg-black ring-2 ring-black/20 ring-offset-2 ring-offset-white'
                    : 'w-1.5 h-1.5 bg-black/25 group-hover:bg-black/60 group-hover:scale-125'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Manual Slide Navigation Arrows */}
      <div className="absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-3 sm:px-6 md:px-10 pointer-events-none">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="pointer-events-auto p-2 text-black/50 hover:text-black transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95"
          aria-label="Previous slide"
          title="Previous slide"
        >
          <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.2]" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="pointer-events-auto p-2 text-black/50 hover:text-black transition-all duration-300 cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95"
          aria-label="Next slide"
          title="Next slide"
        >
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.2]" />
        </button>
      </div>

      {/* 1px animated vertical scroll cue at bottom centre */}
      <div
        onClick={onScrollCueClick}
        role="button"
        tabIndex={0}
        aria-label="Scroll to explore"
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group z-20"
      >
        <div className="w-[1px] h-9 sm:h-12 bg-black/25 overflow-hidden relative">
          <div className="w-full h-1/2 bg-black absolute top-0 left-0 animate-scrollCue" />
        </div>
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
