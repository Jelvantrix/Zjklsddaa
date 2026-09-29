import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only activate on desktop devices with hover & fine pointer (mouse/trackpad), not tablets or touch screens
    const isDesktopMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isDesktopMouse || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Don't show if coordinates are 0,0 or invalid
      if (e.clientX === 0 && e.clientY === 0) return;
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleTouchStart = () => {
      // Immediate hide on touch
      setIsVisible(false);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, input, select, textarea, [role="button"], img, .cursor-pointer, .interactive-hover'
      );
      setIsHoveringInteractive(!!interactive);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[9999] top-0 left-0 -translate-x-1/2 -translate-y-1/2 transition-[width,height,transform,opacity] duration-200 ease-out hidden lg:block"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <div
        className={`rounded-full border border-black transition-all duration-300 ease-out ${
          isHoveringInteractive
            ? 'w-10 h-10 bg-black/10 backdrop-blur-[1px] scale-110'
            : 'w-2 h-2 bg-black scale-100'
        }`}
      />
    </div>
  );
};
