import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Language, Category } from '../types';
import { translations, SUB_CATEGORIES } from '../data/mockData';
import { BrandLogo } from './BrandLogo';
import { X, ChevronRight, ArrowLeft } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigateHome: () => void;
  onNavigateLookbook: () => void;
  onNavigateSitemap: () => void;
  onNavigateStory: () => void;
  onNavigateVote: () => void;
  onNavigateJournal: () => void;
  onNavigateAccount?: () => void;
  categories?: Category[];
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  language,
  onSelectCategory,
  onNavigateHome,
  onNavigateLookbook,
  onNavigateSitemap,
  onNavigateStory,
  onNavigateVote,
  onNavigateJournal,
  onNavigateAccount,
  categories = [],
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Safe translations lookup with guaranteed fallback to English
  const t = translations[language] || translations.en;

  // Body scroll locking: lock on open, always unlock on unmount/close
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Reset sub-level view whenever newly opened
      setActiveCategory(null);
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCategory) {
          setActiveCategory(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCategory, onClose]);

  // Robust category title resolution that never throws even if data shape varies
  const resolveCategoryTitle = (cat: Category | undefined): string => {
    if (!cat) return '';
    if (typeof cat.name === 'string') return cat.name;
    if (cat.name && typeof cat.name === 'object') {
      const localized = language === 'fi' ? cat.name.fi : cat.name.en;
      return localized || cat.name.en || cat.name.fi || cat.slug || '';
    }
    return cat.slug || '';
  };

  const dynamicItems = useMemo(() => {
    const navText = t?.nav || translations.en.nav;

    if (categories && Array.isArray(categories) && categories.length > 0) {
      const roots = categories
        .filter((c) => Boolean(c && !c.parentId && c.visible))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const items: Array<{ key: string; label: string; subKey: string | null; categoryId: string }> = [
        { key: 'uutuudet', label: navText.new || 'New Arrivals', subKey: null, categoryId: 'all' },
      ];

      roots.forEach((cat) => {
        if (!cat) return;
        const catKey = cat.slug || cat.id || '';
        // Deduplicate collections
        if (catKey === 'kokoelmat' || cat.id === 'cat-kokoelmat') {
          return;
        }
        const resolved = resolveCategoryTitle(cat);
        items.push({
          key: catKey,
          label: resolved ? resolved.toUpperCase() : catKey.toUpperCase(),
          subKey: cat.id || catKey,
          categoryId: cat.slug || cat.id || catKey,
        });
      });

      // Collections, Lookbook, Story, Suggest, Journal
      items.push(
        { key: 'kokoelmat', label: (navText.collections || 'Collections').toUpperCase(), subKey: 'kokoelmat', categoryId: 'kokoelmat' },
        { key: 'lookbook', label: (navText.lookbook || 'Lookbook').toUpperCase(), subKey: null, categoryId: 'lookbook' },
        { key: 'story', label: 'HOUSE STORY', subKey: null, categoryId: 'story' },
        { key: 'vote', label: 'SUGGEST & VOTE', subKey: null, categoryId: 'vote' },
        { key: 'journal', label: (navText.journal || 'Journal').toUpperCase(), subKey: null, categoryId: 'journal' }
      );
      return items;
    }

    return [
      { key: 'uutuudet', label: (navText.new || 'New Arrivals').toUpperCase(), subKey: null, categoryId: 'all' },
      { key: 'naiset', label: (navText.women || 'Women').toUpperCase(), subKey: 'naiset', categoryId: 'naiset' },
      { key: 'miehet', label: (navText.men || 'Men').toUpperCase(), subKey: 'miehet', categoryId: 'miehet' },
      { key: 'asusteet', label: (navText.accessories || 'Accessories').toUpperCase(), subKey: 'asusteet', categoryId: 'asusteet' },
      { key: 'kokoelmat', label: (navText.collections || 'Collections').toUpperCase(), subKey: 'kokoelmat', categoryId: 'kokoelmat' },
      { key: 'lookbook', label: (navText.lookbook || 'Lookbook').toUpperCase(), subKey: null, categoryId: 'lookbook' },
      { key: 'story', label: 'HOUSE STORY', subKey: null, categoryId: 'story' },
      { key: 'vote', label: 'SUGGEST & VOTE', subKey: null, categoryId: 'vote' },
      { key: 'journal', label: (navText.journal || 'Journal').toUpperCase(), subKey: null, categoryId: 'journal' },
    ];
  }, [categories, t, language]);

  const activeSubcategories = useMemo(() => {
    if (!activeCategory) return [];

    if (categories && Array.isArray(categories) && categories.length > 0) {
      const parent = categories.find((c) => Boolean(c && (c.id === activeCategory || c.slug === activeCategory)));
      if (parent) {
        const subs = categories
          .filter((c) => Boolean(c && c.parentId === parent.id && c.visible))
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((c) => ({
            name: resolveCategoryTitle(c),
            slug: c.slug || c.id || '',
          }))
          .filter((s) => Boolean(s.name));

        if (subs.length > 0) return subs;
      }
    }

    const mockKey = (activeCategory || '').toLowerCase();
    const mockSubs = SUB_CATEGORIES[mockKey as keyof typeof SUB_CATEGORIES] || [];
    return mockSubs.map((s) => ({ name: s, slug: s.toLowerCase().replace(/\s+/g, '-') }));
  }, [activeCategory, categories, language]);

  const activeParentItem = useMemo(() => {
    if (!activeCategory) return null;
    return dynamicItems.find((c) => c.subKey === activeCategory || c.key === activeCategory) || null;
  }, [activeCategory, dynamicItems]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-[95] bg-[#FFFFFF] text-[#000000] flex flex-col justify-between overflow-y-auto animate-fadeIn select-none"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(1.5rem + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      }}
    >
      {/* Top Header inside Mobile Menu */}
      <div className="w-full pb-5 border-b border-black/10 flex items-center justify-between shrink-0">
        {activeCategory ? (
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="min-h-[44px] min-w-[44px] -ml-2 px-2 flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-black hover:opacity-60 transition-opacity cursor-pointer"
            aria-label="Back to main categories"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNavigateHome();
              onClose();
            }}
            className="cursor-pointer min-h-[44px] flex items-center -ml-1 text-left"
            aria-label="Return home"
          >
            <BrandLogo size="sm" />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] -mr-2 p-2 flex items-center justify-center text-black hover:opacity-60 transition-opacity cursor-pointer"
          aria-label={t.nav?.close || 'Close navigation'}
        >
          <X className="w-6 h-6 stroke-[1.5]" />
        </button>
      </div>

      {/* Main Links Container */}
      <div className="flex-1 py-8 overflow-y-auto flex flex-col justify-start">
        {!activeCategory ? (
          <nav className="flex flex-col space-y-2 sm:space-y-3" aria-label="Mobile main navigation">
            {dynamicItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between border-b border-black/[0.08] py-2 sm:py-3 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (item.subKey && activeSubcategories.length > 0) {
                      setActiveCategory(item.subKey);
                    } else if (item.key === 'journal') {
                      onNavigateJournal();
                      onClose();
                    } else if (item.key === 'lookbook') {
                      onNavigateLookbook();
                      onClose();
                    } else if (item.key === 'story') {
                      onNavigateStory();
                      onClose();
                    } else if (item.key === 'vote') {
                      onNavigateVote();
                      onClose();
                    } else {
                      onSelectCategory(item.categoryId);
                      onClose();
                    }
                  }}
                  className="font-editorial text-2xl xs:text-3xl sm:text-4xl text-left tracking-wide font-normal hover:translate-x-1.5 transition-transform duration-200 cursor-pointer flex-1 min-h-[44px] flex items-center pr-3"
                >
                  {item.label}
                </button>
                {item.subKey && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory(item.subKey)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-black/40 hover:text-black cursor-pointer"
                    aria-label={`View subcategories for ${item.label}`}
                  >
                    <ChevronRight className="w-5 h-5 stroke-[1.5]" />
                  </button>
                )}
              </div>
            ))}

            <div className="pt-6 border-t border-black/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateAccount) onNavigateAccount();
                  onClose();
                }}
                className="min-h-[44px] flex items-center justify-between text-xs font-mono uppercase tracking-[0.22em] text-black hover:opacity-60 transition-opacity cursor-pointer"
              >
                <span>Patron Account & Portal</span>
                <ChevronRight className="w-4 h-4 text-black/40" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigateSitemap();
                  onClose();
                }}
                className="min-h-[44px] flex items-center text-xs font-mono uppercase tracking-[0.22em] text-black/60 underline underline-offset-4 cursor-pointer hover:opacity-60 transition-opacity"
              >
                {t.sitemap || 'Site Directory (50+ Pages)'}
              </button>
            </div>
          </nav>
        ) : (
          <div className="flex flex-col space-y-3 animate-slideIn">
            <div className="pb-2 border-b border-black/10 mb-2">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-black/40 block mb-1">
                DEPARTMENT
              </span>
              <h3 className="font-editorial text-3xl font-normal uppercase tracking-wide">
                {activeParentItem?.label || activeCategory.toUpperCase()}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                onSelectCategory(activeCategory);
                onClose();
              }}
              className="text-left text-xs font-mono uppercase tracking-[0.2em] min-h-[48px] flex items-center py-2.5 border-b border-black/10 hover:opacity-60 cursor-pointer font-medium"
            >
              View All {activeParentItem?.label || ''} →
            </button>

            {activeSubcategories.map((sub) => (
              <button
                type="button"
                key={sub.slug}
                onClick={() => {
                  onSelectCategory(activeCategory, sub.name);
                  onClose();
                }}
                className="text-left text-sm font-sans text-black/80 hover:text-black min-h-[48px] flex items-center py-2 tracking-wide border-b border-black/[0.05] cursor-pointer hover:translate-x-1 transition-transform"
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Atelier Info */}
      <div className="pt-4 border-t border-black/10 flex items-center justify-between bg-white text-xs font-mono shrink-0">
        <span className="text-[10px] text-black/60 tracking-widest uppercase">
          ZEJESH ATELIER
        </span>
        <span className="text-[10px] text-black/40 tracking-wider">
          HELSINKI · PORTO
        </span>
      </div>
    </div>
  );
};
