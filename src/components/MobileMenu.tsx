import React, { useState } from 'react';
import { Language } from '../types';
import { translations, SUB_CATEGORIES } from '../data/mockData';
import { BrandLogo } from './BrandLogo';
import { TranslationBar } from './TranslationBar';
import { X, ChevronRight, ArrowLeft } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigateHome: () => void;
  onNavigateLookbook: () => void;
  onNavigateSitemap: () => void;
  onOpenJournal: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  language,
  onSetLanguage,
  onSelectCategory,
  onNavigateHome,
  onNavigateLookbook,
  onNavigateSitemap,
  onOpenJournal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const t = translations[language];

  if (!isOpen) return null;

  const categories = [
    { key: 'uutuudet', label: t.nav.new, subKey: null },
    { key: 'naiset', label: t.nav.women, subKey: 'naiset' as const },
    { key: 'miehet', label: t.nav.men, subKey: 'miehet' as const },
    { key: 'asusteet', label: t.nav.accessories, subKey: 'asusteet' as const },
    { key: 'kokoelmat', label: t.nav.collections, subKey: 'kokoelmat' as const },
    { key: 'lookbook', label: t.nav.lookbook, subKey: null },
    { key: 'journal', label: t.nav.journal, subKey: null },
  ];

  return (
    <div className="fixed inset-0 z-[95] bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto animate-fadeIn">
      {/* Top Header inside Mobile Menu */}
      <div className="px-6 py-6 border-b border-black/10 flex items-center justify-between">
        {activeCategory ? (
          <button
            onClick={() => setActiveCategory(null)}
            className="flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase text-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'fi' ? 'Takaisin' : 'Back'}</span>
          </button>
        ) : (
          <div onClick={onNavigateHome} className="cursor-pointer">
            <BrandLogo size="sm" />
          </div>
        )}

        <button
          onClick={onClose}
          className="p-2 -mr-2 text-black"
          aria-label={t.nav.close}
        >
          <X className="w-6 h-6 stroke-[1.5]" />
        </button>
      </div>

      {/* Main Links Container */}
      <div className="flex-1 px-8 py-8 flex flex-col justify-center">
        {!activeCategory ? (
          <nav className="flex flex-col space-y-5">
            {categories.map((item) => (
              <div key={item.key} className="flex items-center justify-between border-b border-black/10 pb-3">
                <button
                  onClick={() => {
                    if (item.subKey) {
                      setActiveCategory(item.subKey);
                    } else if (item.key === 'journal') {
                      onOpenJournal();
                      onClose();
                    } else if (item.key === 'lookbook') {
                      onNavigateLookbook();
                      onClose();
                    } else {
                      onSelectCategory('all');
                      onClose();
                    }
                  }}
                  className="font-editorial text-3xl sm:text-4xl text-left tracking-wide font-normal hover:translate-x-2 transition-transform duration-300"
                >
                  {item.label}
                </button>
                {item.subKey && (
                  <button
                    onClick={() => setActiveCategory(item.subKey)}
                    className="p-2 text-black/40 hover:text-black"
                  >
                    <ChevronRight className="w-5 h-5 stroke-[1.5]" />
                  </button>
                )}
              </div>
            ))}

            <div className="pt-4">
              <button
                onClick={() => {
                  onNavigateSitemap();
                  onClose();
                }}
                className="text-xs font-mono uppercase tracking-[0.2em] text-black underline underline-offset-4"
              >
                {t.sitemap}
              </button>
            </div>
          </nav>
        ) : (
          <div className="flex flex-col space-y-4 animate-slideIn">
            <h3 className="font-editorial text-3xl mb-2 font-normal uppercase tracking-wide">
              {categories.find((c) => c.subKey === activeCategory)?.label}
            </h3>
            <button
              onClick={() => {
                onSelectCategory(activeCategory);
                onClose();
              }}
              className="text-left text-sm font-sans font-medium uppercase tracking-[0.14em] py-2 border-b border-black/10"
            >
              {language === 'fi' ? 'Näytä kaikki' : 'View All'}
            </button>
            {SUB_CATEGORIES[activeCategory as keyof typeof SUB_CATEGORIES]?.map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  onSelectCategory(activeCategory, sub);
                  onClose();
                }}
                className="text-left text-base font-sans text-black/80 hover:text-black py-1.5 tracking-wide border-b border-black/5"
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom 1-Click Translation & Info */}
      <div className="px-8 py-5 border-t border-black/10 flex items-center justify-between bg-white text-xs font-mono">
        <TranslationBar language={language} onSetLanguage={onSetLanguage} />
        <span className="text-[10px] text-black/50 tracking-wider">
          HELSINKI
        </span>
      </div>
    </div>
  );
};
