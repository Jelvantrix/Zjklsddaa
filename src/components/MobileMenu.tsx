import React, { useState, useMemo } from 'react';
import { Language, Category } from '../types';
import { translations, SUB_CATEGORIES } from '../data/mockData';
import { BrandLogo } from './BrandLogo';
import { TranslationBar } from './TranslationBar';
import { X, ChevronRight, ArrowLeft, Shield } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigateHome: () => void;
  onNavigateLookbook: () => void;
  onNavigateSitemap: () => void;
  onNavigateAdmin?: () => void;
  onOpenJournal: () => void;
  categories?: Category[];
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
  onNavigateAdmin,
  onOpenJournal,
  categories = [],
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const t = translations[language];

  if (!isOpen) return null;

  const dynamicItems = useMemo(() => {
    if (categories && categories.length > 0) {
      const roots = categories
        .filter((c) => !c.parentId && c.visible)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const items: Array<{ key: string; label: string; subKey: string | null; categoryId: string }> = [
        { key: 'uutuudet', label: t.nav.new, subKey: null, categoryId: 'all' },
      ];

      roots.forEach((cat) => {
        items.push({
          key: cat.slug || cat.id,
          label: (cat.name.en || cat.name.fi || cat.slug).toUpperCase(),
          subKey: cat.id,
          categoryId: cat.slug || cat.id,
        });
      });

      items.push(
        { key: 'kokoelmat', label: t.nav.collections, subKey: 'kokoelmat', categoryId: 'kokoelmat' },
        { key: 'lookbook', label: t.nav.lookbook, subKey: null, categoryId: 'lookbook' },
        { key: 'journal', label: t.nav.journal, subKey: null, categoryId: 'journal' }
      );
      return items;
    }

    return [
      { key: 'uutuudet', label: t.nav.new, subKey: null, categoryId: 'all' },
      { key: 'naiset', label: t.nav.women, subKey: 'naiset', categoryId: 'naiset' },
      { key: 'miehet', label: t.nav.men, subKey: 'miehet', categoryId: 'miehet' },
      { key: 'asusteet', label: t.nav.accessories, subKey: 'asusteet', categoryId: 'asusteet' },
      { key: 'kokoelmat', label: t.nav.collections, subKey: 'kokoelmat', categoryId: 'kokoelmat' },
      { key: 'lookbook', label: t.nav.lookbook, subKey: null, categoryId: 'lookbook' },
      { key: 'journal', label: t.nav.journal, subKey: null, categoryId: 'journal' },
    ];
  }, [categories, t]);

  const activeSubcategories = useMemo(() => {
    if (!activeCategory) return [];
    if (categories && categories.length > 0) {
      const parent = categories.find((c) => c.id === activeCategory || c.slug === activeCategory);
      if (parent) {
        return categories
          .filter((c) => c.parentId === parent.id && c.visible)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((c) => ({
            name: c.name.en || c.name.fi,
            slug: c.slug,
          }));
      }
    }
    const mockSubs = SUB_CATEGORIES[activeCategory as keyof typeof SUB_CATEGORIES] || [];
    return mockSubs.map((s) => ({ name: s, slug: s.toLowerCase().replace(/\s+/g, '-') }));
  }, [activeCategory, categories]);

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
            <span>Back</span>
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
            {dynamicItems.map((item) => (
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
                      onSelectCategory(item.categoryId);
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

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onNavigateSitemap();
                  onClose();
                }}
                className="text-xs font-mono uppercase tracking-[0.2em] text-black underline underline-offset-4 cursor-pointer"
              >
                {t.sitemap}
              </button>

              {onNavigateAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateAdmin();
                    onClose();
                  }}
                  className="text-xs font-mono uppercase tracking-[0.2em] text-black border border-black/20 px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
                >
                  Console →
                </button>
              )}
            </div>
          </nav>
        ) : (
          <div className="flex flex-col space-y-4 animate-slideIn">
            <h3 className="font-editorial text-3xl mb-2 font-normal uppercase tracking-wide">
              {dynamicItems.find((c) => c.subKey === activeCategory)?.label}
            </h3>
            <button
              onClick={() => {
                onSelectCategory(activeCategory);
                onClose();
              }}
              className="text-left text-sm font-sans font-medium uppercase tracking-[0.14em] py-2 border-b border-black/10"
            >
              View All
            </button>
            {activeSubcategories.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => {
                  onSelectCategory(activeCategory, sub.name);
                  onClose();
                }}
                className="text-left text-base font-sans text-black/80 hover:text-black py-1.5 tracking-wide border-b border-black/5"
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Atelier Info */}
      <div className="px-8 py-5 border-t border-black/10 flex items-center justify-between bg-white text-xs font-mono">
        <span className="text-[10px] text-black/60 tracking-widest uppercase">
          ZEJESH CLOTHES
        </span>
        <span className="text-[10px] text-black/40 tracking-wider">
          HELSINKI · PORTO
        </span>
      </div>
    </div>
  );
};
