import React, { useState, useEffect } from 'react';
import { translations } from '../data/mockData';
import { Language } from '../types';

interface CookieBannerProps {
  language: Language;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({ language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[language].cookie;

  useEffect(() => {
    const accepted = localStorage.getItem('zejesh_cookies_accepted');
    if (!accepted) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('zejesh_cookies_accepted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Evästeasetukset"
      className="fixed bottom-0 sm:bottom-4 left-0 sm:left-4 right-0 sm:right-auto z-50 max-w-sm bg-white/95 backdrop-blur-md border-t sm:border border-black/15 p-4 sm:p-5 shadow-xl transition-all duration-500 ease-out"
    >
      <div className="flex flex-col gap-3">
        <p className="text-[11.5px] leading-relaxed text-black/80 font-sans">
          {t.text}
        </p>
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            className="text-[11px] tracking-[0.2em] uppercase text-black font-semibold border-b border-black pb-0.5 hover:opacity-60 transition-opacity cursor-pointer"
          >
            {t.accept}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[11px] tracking-[0.2em] uppercase text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            {t.settings}
          </button>
        </div>
      </div>
    </div>
  );
};
