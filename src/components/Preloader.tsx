import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [isWipingUp, setIsWipingUp] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // 1. Fade in the logo on white
    const t1 = setTimeout(() => {
      setLogoOpacity(1);
    }, 150);

    // 2. Start upward wipe reveal
    const t2 = setTimeout(() => {
      setIsWipingUp(true);
    }, 1400);

    // 3. Complete and unmount preloader
    const t3 = setTimeout(() => {
      setIsDone(true);
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (isDone) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] ${ isWipingUp ?'-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div
        className="transition-opacity duration-700 ease-out"
        style={{ opacity: logoOpacity }}
      >
        <BrandLogo size="hero" />
      </div>
    </div>
  );
};
