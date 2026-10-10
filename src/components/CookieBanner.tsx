import React, { useState, useEffect } from 'react';
import { translations, Language } from '../types';

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
      aria-label="Privacy and Cookie Preferences"
      className="fixed bottom-0 sm:bottom-4 left-0 sm:left-4 right-0 sm:right-auto z-50 max-w-sm backdrop-blur-md p-4 sm:p-5 transition-all duration-500 ease-out"
    >
      <div className="flex flex-col gap-3">
        <p className="text-small leading-relaxed text-black/80">
          {t.text}
        </p>
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            className="text-small tracking-[0.2em] uppercase text-black font-semibold pb-0.5 hover:opacity-60 transition-opacity cursor-pointer"
          >
            {t.accept}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-small tracking-[0.2em] uppercase text-black/50 hover:text-black transition-colors cursor-pointer"
          >
            {t.settings}
          </button>
        </div>
      </div>
    </div>
  );
};
