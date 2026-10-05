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
  const slides = externalSlides && externalSlides.length > 0 ? externalSlides : HERO_SLIDES;
  const [currentIndex, setCurrentIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Real-time drag physics state
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalScrollRef = useRef(false);
  const wheelLockRef = useRef(false);

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

  // Safe slide index boundaries if slides are removed or added dynamically
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

  // Wheel / Trackpad horizontal scroll listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      const delta = e.shiftKey ? e.deltaY : e.deltaX;

      if (isHorizontal && Math.abs(delta) > 18) {
        // Prevent default browser history swipe
        e.preventDefault();

        if (wheelLockRef.current) return;
        wheelLockRef.current = true;

        if (delta > 0) {
          nextSlide();
        } else {
          prevSlide();
        }

        setTimeout(() => {
          wheelLockRef.current = false;
        }, 500);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [nextSlide, prevSlide]);

  // Touch handlers for direct physical touch dragging
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    isHorizontalScrollRef.current = false;
    setIsDragging(true);
    setDragDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startXRef.current;
    const diffY = touch.clientY - startYRef.current;

    // Detect if this is horizontal intent
    if (!isHorizontalScrollRef.current) {
      if (Math.abs(diffX) > 8 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalScrollRef.current = true;
      }
    }

    if (isHorizontalScrollRef.current) {
      if (e.cancelable) e.preventDefault();
      // Apply rubber-band effect if dragging past ends
      let delta = diffX;
      if (currentIndex === 0 && delta > 0) {
        delta = delta * 0.35;
      } else if (currentIndex === slides.length - 1 && delta < 0) {
        delta = delta * 0.35;
      }
      setDragDeltaX(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalScrollRef.current) {
      // Threshold to trigger slide transition
      if (dragDeltaX < -45) {
        nextSlide();
      } else if (dragDeltaX > 45) {
        prevSlide();
      }
    }

    setDragDeltaX(0);
    isHorizontalScrollRef.current = false;
  };

  // Mouse drag handlers for desktop click-and-drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only primary mouse button
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    setIsDragging(true);
    setDragDeltaX(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPointerDownRef.current) return;
    const diffX = e.clientX - startXRef.current;
    let delta = diffX;
    if (currentIndex === 0 && delta > 0) {
      delta = delta * 0.35;
    } else if (currentIndex === slides.length - 1 && delta < 0) {
      delta = delta * 0.35;
    }
    setDragDeltaX(delta);
  };

  const handleMouseUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    if (dragDeltaX < -50) {
      nextSlide();
    } else if (dragDeltaX > 50) {
      prevSlide();
    }

    setDragDeltaX(0);
  };

  const handleMouseLeave = () => {
    if (isPointerDownRef.current) {
      handleMouseUp();
    }
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-[100svh] overflow-hidden bg-[#FFFFFF] select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      aria-label="Karuselli"
    >
      {/* 
        TRUE PHYSICAL HORIZONTAL SLIDER TRACK
        When user scrolls left/right, drags left/right, or clicks arrows,
        the track physically translates X in real time!
      */}
      <div
        className="flex flex-row h-full w-full"
        style={{
          transform: `translateX(calc(-${currentIndex * 100}% + ${dragDeltaX}px))`,
          transition: isDragging ? 'none' : 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {slides.map((slide, idx) => {
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
                  className="w-full h-full object-cover object-[center_18%] pointer-events-none"
                  style={{ mixBlendMode: 'multiply' }}
                />
              ) : (
                <img
                  src={slide.src}
                  alt={slide.caption?.[language] || 'Zejesh Studio Fashion Archive'}
                  className="w-full h-full object-cover object-[center_18%] pointer-events-none"
                  draggable={false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Slide Navigation Dots (Moved lower & at side, dots instead of lines) */}
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
              className="group p-1 cursor-pointer flex items-center justify-center transition-all focus:outline-none"
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

      {/* Side Slide Dots (Clean vertical indicator at the right side) */}
      <div className="hidden lg:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 flex-col items-center gap-3 pointer-events-auto">
        {slides.map((slide, i) => {
          const isActive = i === currentIndex;
          return (
            <button
              key={`side-${slide.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(i);
              }}
              className="group p-1 cursor-pointer flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
              aria-label={`Slide ${i + 1}`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-2 h-2 bg-black ring-2 ring-black/25 ring-offset-2 ring-offset-white'
                    : 'w-1 h-1 bg-black/25 group-hover:bg-black/60'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Manual Slide Navigation Arrows: Pure text/icon affordances, zero boxes or borders */}
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

      {/* Bottom Controls: Removed slide counter and studio text per user request */}

      {/* Subtle swipe gesture hint on mobile/tablet */}
      <div className="md:hidden absolute bottom-6 right-4 z-20 font-mono text-[9.5px] uppercase tracking-widest text-black/40 pointer-events-none">
        ← Swipe →
      </div>

      {/* Tiny 1px animated vertical scroll cue at bottom centre - NO WORDS */}
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
