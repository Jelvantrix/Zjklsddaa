import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeroSlide, HERO_SLIDES } from '../data/mockData';
import { Language } from '../types';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface HeroSectionProps {
  onScrollCueClick: () => void;
  language: Language;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onScrollCueClick, language }) => {
  const [slides, setSlides] = useState<HeroSlide[]>(HERO_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New slide form state
  const [newSlideType, setNewSlideType] = useState<'image' | 'video'>('image');
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideCaption, setNewSlideCaption] = useState('');

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

  // Keyboard navigation for desktop (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAddModalOpen) return;
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, nextSlide, prevSlide]);

  // Wheel / Trackpad horizontal scroll listener:
  // "when scroll left that should be go left when right that should be go right"
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (isAddModalOpen) return;

      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      const delta = e.shiftKey ? e.deltaY : e.deltaX;

      if (isHorizontal && Math.abs(delta) > 18) {
        // Prevent default browser history swipe
        e.preventDefault();

        if (wheelLockRef.current) return;
        wheelLockRef.current = true;

        if (delta > 0) {
          // Scroll left gesture / wheel right -> moves to next slide
          nextSlide();
        } else {
          // Scroll right gesture / wheel left -> moves to prev slide
          prevSlide();
        }

        setTimeout(() => {
          wheelLockRef.current = false;
        }, 500);
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isAddModalOpen, nextSlide, prevSlide]);

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

  const handleAddSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideUrl.trim()) return;

    const newSlide: HeroSlide = {
      id: `custom-slide-${Date.now()}`,
      type: newSlideType,
      src: newSlideUrl.trim(),
      poster: newSlideType === 'video' ? slides[1]?.src : undefined,
      positionDesktop: 'center 18%',
      positionMobile: 'center 18%',
      caption: {
        fi: newSlideCaption.trim() || 'Uusi kampanjamedia',
        en: newSlideCaption.trim() || 'Custom Added Media',
        sv: newSlideCaption.trim() || 'Nytt kampanjmedia',
      },
    };

    setSlides((prev) => [...prev, newSlide]);
    setCurrentIndex(slides.length);
    setIsAddModalOpen(false);
    setNewSlideUrl('');
    setNewSlideCaption('');
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

      {/* WhatsApp Status Style Top Progress Bars (Clickable hairline segments) */}
      <div className="absolute top-[102px] sm:top-[112px] lg:top-24 left-0 right-0 z-20 px-6 sm:px-10 max-w-md mx-auto flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goToSlide(i);
            }}
            className="flex-1 h-[1.5px] sm:h-[2px] bg-black/10 hover:bg-black/30 overflow-hidden cursor-pointer transition-colors"
            aria-label={`Siirry diaan ${i + 1}`}
          >
            <div
              className={`h-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-black w-full'
                  : i < currentIndex
                  ? 'bg-black/30 w-full'
                  : 'w-0'
              }`}
            />
          </button>
        ))}
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
          aria-label="Edellinen kuva tai video (Vieritä oikealle)"
          title="Edellinen (←)"
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
          aria-label="Seuraava kuva tai video (Vieritä vasemmalle)"
          title="Seuraava (→)"
        >
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.2]" />
        </button>
      </div>

      {/* Bottom Controls: Slide Counter & Add Media (Pure typography, no boxes or borders) */}
      <div className="absolute bottom-6 sm:bottom-8 left-4 sm:left-8 md:left-10 z-20 flex items-center gap-3 sm:gap-4 text-black text-[11px] sm:text-xs font-mono">
        <div className="flex items-center gap-2 py-1">
          <span className="font-semibold text-black">0{currentIndex + 1}</span>
          <span className="text-black/30">/</span>
          <span className="text-black/50">0{slides.length}</span>
          <span className="hidden sm:inline text-black/30">·</span>
          <span className="hidden sm:inline uppercase text-[10px] tracking-[0.2em] text-black/60">
            {currentSlide.type === 'video' ? 'VIDEO' : 'STUDIO FOTO'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 py-1 text-black/50 hover:text-black hover:underline underline-offset-4 transition-colors cursor-pointer text-[10.5px] uppercase tracking-wider"
          title="Lisää uusi kuva tai video hero-karuselliin"
          aria-label="Lisää uusi kuva tai video"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
          <span className="hidden sm:inline">Lisää</span>
        </button>
      </div>

      {/* Subtle swipe gesture hint on mobile/tablet */}
      <div className="md:hidden absolute bottom-6 right-4 z-20 font-mono text-[9.5px] uppercase tracking-widest text-black/40 pointer-events-none">
        ← Pyyhkäise →
      </div>

      {/* Tiny 1px animated vertical scroll cue at bottom centre - NO WORDS */}
      <div
        onClick={onScrollCueClick}
        role="button"
        tabIndex={0}
        aria-label="Vieritä alas"
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group z-20"
      >
        <div className="w-[1px] h-9 sm:h-12 bg-black/25 overflow-hidden relative">
          <div className="w-full h-1/2 bg-black absolute top-0 left-0 animate-scrollCue" />
        </div>
      </div>

      {/* Modal to Add Pictures/Videos to Hero Slider */}
      {isAddModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white text-black p-5 sm:p-8 border border-black shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/10 mb-4 sm:mb-6">
              <h3 className="font-editorial text-xl sm:text-2xl font-normal">
                {language === 'fi' ? 'Lisää Hero-media' : 'Add Hero Media Slide'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-black/60 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleAddSlide} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-black/60 mb-2">
                  Mediatyyppi:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="radio"
                      name="mediaType"
                      checked={newSlideType === 'image'}
                      onChange={() => setNewSlideType('image')}
                      className="accent-black"
                    />
                    <span>Kuva (Studio Photo)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="radio"
                      name="mediaType"
                      checked={newSlideType === 'video'}
                      onChange={() => setNewSlideType('video')}
                      className="accent-black"
                    />
                    <span>Video (MP4 / WebM)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-black/60 mb-1">
                  Kuvan / Videon URL:
                </label>
                <input
                  type="text"
                  required
                  value={newSlideUrl}
                  onChange={(e) => setNewSlideUrl(e.target.value)}
                  placeholder="https://... tai /src/assets/..."
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-black/60 mb-1">
                  Otsikko tai kuvaus:
                </label>
                <input
                  type="text"
                  value={newSlideCaption}
                  onChange={(e) => setNewSlideCaption(e.target.value)}
                  placeholder="Esim. Talvikampanja 2026"
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              <div className="pt-3 sm:pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 btn-secondary text-xs uppercase tracking-wider cursor-pointer"
                >
                  Peruuta
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 btn-primary text-xs uppercase tracking-wider font-medium cursor-pointer"
                >
                  Lisää dia karuselliin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
