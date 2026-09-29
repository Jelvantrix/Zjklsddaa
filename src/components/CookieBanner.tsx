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
      className="fixed bottom-4 left-3 sm:left-4 right-3 sm:right-auto z-50 max-w-sm bg-white border border-black p-4 sm:p-5 shadow-2xl transition-all duration-500 ease-out"
    >
      <div className="flex flex-col gap-3">
        <p className="text-[12px] leading-relaxed text-black/90 font-sans">
          {t.text}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 text-[11px] tracking-[0.14em] uppercase bg-black text-white border border-black hover:bg-white hover:text-black transition-colors"
          >
            {t.accept}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[11px] tracking-[0.14em] uppercase text-black/60 hover:text-black underline underline-offset-4 transition-colors"
          >
            {t.settings}
          </button>
        </div>
      </div>
    </div>
  );
};
