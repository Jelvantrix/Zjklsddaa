import React, { useState, useEffect, useMemo } from 'react';
import { Language, Category, translations, SUB_CATEGORIES } from '../types';
import { BrandLogo } from './BrandLogo';
import { FashionImage } from './FashionImage';
import { TranslationBar } from './TranslationBar';
import { Search, Heart, User, ShoppingBag, Menu } from 'lucide-react';
import { useAuth } from '../supabase/AuthContext';
import { useStorefrontData } from '../context/StorefrontDataContext';

interface HeaderProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenSearch: () => void;
  onOpenAccount: () => void;
  onOpenMobileMenu: () => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigateHome: () => void;
  onNavigateLookbook: () => void;
  onNavigateSitemap: () => void;
  onNavigateStory: () => void;
  onNavigateVote: () => void;
  isHeroVisible: boolean;
  currentCategory?: string;
  currentRouteType?: string;
  categories?: Category[];
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onSetLanguage,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onOpenSearch,
  onOpenAccount,
  onOpenMobileMenu,
  onSelectCategory,
  onNavigateHome,
  onNavigateLookbook,
  onNavigateSitemap,
  onNavigateStory,
  onNavigateVote,
  isHeroVisible,
  currentCategory,
  currentRouteType,
  categories = [],
}) => {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { user, isAdmin } = useAuth();
  const { products: storeProducts, content: storeContent } = useStorefrontData();
  const t = translations[language];

  const tileImage1 = storeProducts?.[0]?.images?.[0]?.url || storeProducts?.[0]?.image || storeContent?.heroSlides?.[0]?.src || '/placeholder.svg';
  const tileImage2 = storeProducts?.[1]?.images?.[0]?.url || storeProducts?.[1]?.image || storeContent?.heroSlides?.[1]?.src || '/placeholder.svg';

  // Scroll detection: hide on scroll-down, show on scroll-up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > 140 && currentScrollY > lastScrollY && !hoveredNav) {
        setIsHidden(true); // scrolling down
      } else {
        setIsHidden(false); // scrolling up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hoveredNav]);

  const resolveCategoryTitle = (cat: Category | undefined): string => {
    if (!cat) return '';
    if (typeof cat.name === 'string') return cat.name;
    if (cat.name && typeof cat.name === 'object') {
      const localized = language === 'fi' ? cat.name.fi : cat.name.en;
      return localized || cat.name.en || cat.name.fi || cat.slug || '';
    }
    return cat.slug || '';
  };

  const dynamicNavItems = useMemo(() => {
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const roots = categories
        .filter((c) => Boolean(c && !c.parentId && c.visible))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const items: Array<{ key: string; label: string; subKey: string | null; categoryId: string }> = [
        { key: 'uutuudet', label: t.nav.new, subKey: null, categoryId: 'all' },
      ];

      roots.forEach((cat) => {
        if (!cat) return;
        const catKey = cat.slug || cat.id || '';
        // Avoid duplicate collections entry if cat-kokoelmat exists in categories
        if (catKey === 'kokoelmat' || cat.id === 'cat-kokoelmat') {
          return;
        }
        const resolved = resolveCategoryTitle(cat);
        items.push({
          key: catKey,
          label: (resolved || catKey).toUpperCase(),
          subKey: cat.id || catKey,
          categoryId: cat.slug || cat.id || catKey,
        });
      });

      // Exactly ONE collections button, followed by lookbook, story, vote
      items.push(
        { key: 'kokoelmat', label: t.nav.collections, subKey: 'kokoelmat', categoryId: 'kokoelmat' },
        { key: 'lookbook', label: t.nav.lookbook, subKey: null, categoryId: 'lookbook' },
        { key: 'story', label: 'STORY', subKey: null, categoryId: 'story' },
        { key: 'vote', label: 'SUGGEST', subKey: null, categoryId: 'vote' }
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
      { key: 'story', label: 'STORY', subKey: null, categoryId: 'story' },
      { key: 'vote', label: 'SUGGEST', subKey: null, categoryId: 'vote' },
    ];
  }, [categories, t, language]);

  const activeSubcategories = useMemo(() => {
    if (!hoveredNav) return [];
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const parent = categories.find((c) => Boolean(c && (c.id === hoveredNav || c.slug === hoveredNav)));
      if (parent) {
        return categories
          .filter((c) => Boolean(c && c.parentId === parent.id && c.visible))
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((c) => ({
            name: resolveCategoryTitle(c),
            slug: c.slug || c.id || '',
          }))
          .filter((s) => Boolean(s.name));
      }
    }
    const mockSubs = SUB_CATEGORIES[hoveredNav as keyof typeof SUB_CATEGORIES] || [];
    return mockSubs.map((s: any) =>
      typeof s === 'string'
        ? { name: s, slug: s.toLowerCase().replace(/\s+/g, '-') }
        : { name: typeof s.name === 'string' ? s.name : (s.name[language] || s.name.en || ''), slug: s.slug }
    );
  }, [hoveredNav, categories, language]);

  const isOverHeroAtTop = Boolean(isHeroVisible);

  return (
    <>
      <header
        onMouseLeave={() => setHoveredNav(null)}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          isOverHeroAtTop
            ? 'bg-transparent text-black border-transparent shadow-none'
            : 'bg-white/70 backdrop-blur-md text-black border-b border-black/[0.06] shadow-[0_1px_20px_rgba(0,0,0,0.03)]'
        }`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* ROW 1: BRAND LOGO (ABSOLUTELY CENTERED) & UTILITY ACTIONS (BALANCED) */}
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 h-16 sm:h-20 flex items-center justify-between relative">
          {/* LEFT: Menu & Search */}
          <div className="flex items-center justify-start gap-2 sm:gap-4 md:gap-6 z-20">
            {/* Mobile / Tablet Menu */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 px-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Menu"
            >
              <Menu className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Search: Available on Phone, Tablet and Desktop */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="min-h-[44px] min-w-[44px] px-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center justify-center shrink-0 group/search"
              aria-label={t.nav.search}
              title={t.nav.search}
            >
              <Search className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* CENTER: Exact Brand Logo (ABSOLUTELY GEOMETRICALLY CENTERED ON PHONE, TABLET & DESKTOP) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10 flex items-center justify-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="cursor-pointer min-h-[44px] min-w-[44px] px-2 group focus-visible:outline-none inline-flex items-center justify-center py-1"
              aria-label="Back to home"
            >
              <BrandLogo size="md" invert={false} />
            </button>
          </div>

          {/* RIGHT: Pure Icons Only (Wishlist, Account, Bag) without accompanying text */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3 z-20">
            {/* Wishlist Trigger: Pure Icon */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="min-h-[44px] min-w-[44px] px-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer relative flex items-center justify-center shrink-0"
              aria-label={t.nav.wishlist}
              title={t.nav.wishlist}
            >
              <Heart className={`w-4 h-4 stroke-[1.5] ${wishlistCount > 0 ? 'fill-current' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1 w-3.5 h-3.5 rounded-full bg-black text-white text-[8px] font-mono font-medium flex items-center justify-center leading-none">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Account (Tablet & Desktop): Pure Icon */}
            <button
              type="button"
              onClick={onOpenAccount}
              className="min-h-[44px] min-w-[44px] px-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer relative flex items-center justify-center shrink-0"
              aria-label={t.nav.account}
              title={user ? (isAdmin ? 'Admin' : 'Account') : t.nav.account}
            >
              <User className="w-4 h-4 stroke-[1.5]" />
              {user && (
                <span className={`absolute bottom-2 right-1.5 w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-black border border-white animate-pulse' : 'bg-emerald-600'}`} />
              )}
            </button>

            {/* Shopping Bag: Pure Icon */}
            <button
              type="button"
              onClick={onOpenCart}
              className="min-h-[44px] min-w-[44px] -mr-2 px-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer relative flex items-center justify-center shrink-0"
              aria-label={t.nav.bag}
              title={t.nav.bag}
            >
              <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1 w-3.5 h-3.5 rounded-full bg-black text-white text-[8px] font-mono font-medium flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ROW 2: DESKTOP CATEGORY NAVIGATION STRIP (NO BORDER BETWEEN LOGO AND CATEGORIES) */}
        <div
          className={`hidden lg:block transition-colors duration-300 ${
            isOverHeroAtTop
              ? 'bg-transparent'
              : 'bg-white/70 backdrop-blur-md'
          }`}
        >
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 h-11 flex items-center justify-center">
            <nav
              className="flex items-center justify-center gap-3.5 xl:gap-8 2xl:gap-12"
              aria-label="Main navigation"
            >
              {dynamicNavItems.map((item) => {
                const isActive =
                  (item.key === 'lookbook' && currentRouteType === 'lookbook') ||
                  (item.key === 'story' && currentRouteType === 'story') ||
                  (item.key === 'vote' && currentRouteType === 'vote') ||
                  (currentRouteType === 'archive' &&
                    (currentCategory === item.categoryId || (item.key === 'uutuudet' && currentCategory === 'all')));

                return (
                  <button
                    type="button"
                    key={item.key}
                    onMouseEnter={() => setHoveredNav(item.subKey)}
                    onClick={() => {
                      setHoveredNav(null);
                      if (item.key === 'lookbook') {
                        onNavigateLookbook();
                      } else if (item.key === 'story') {
                        onNavigateStory();
                      } else if (item.key === 'vote') {
                        onNavigateVote();
                      } else {
                        onSelectCategory(item.categoryId);
                      }
                    }}
                    className={`relative py-2.5 px-2 xl:px-3 text-[11px] xl:text-[12.5px] uppercase tracking-[0.16em] xl:tracking-[0.24em] font-sans font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap group/link ${
                      isActive ? 'text-black' : 'text-black/75 hover:text-black'
                    }`}
                  >
                    <span>{item.label}</span>
                    {/* Animated Hairline Underline on Hover & Active State */}
                    <span
                      className={`absolute bottom-0.5 left-2 xl:left-3 right-2 xl:right-3 h-[1px] bg-black transition-all duration-300 origin-center ${
                        isActive
                          ? 'scale-x-100 opacity-100'
                          : 'scale-x-0 opacity-0 group-hover/link:scale-x-100 group-hover/link:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* MEGA MENU: Desktop Hover Drawer */}
        {hoveredNav && (
          <div
            onMouseEnter={() => setHoveredNav(hoveredNav)}
            onMouseLeave={() => setHoveredNav(null)}
            className="absolute top-full left-0 w-full bg-white text-black border-b border-black/[0.06] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.14)] transition-all duration-400 animate-fadeIn hidden lg:block"
          >
            <div className="max-w-[1720px] mx-auto px-10 py-10 grid grid-cols-12 gap-10">
              {/* Subcategories list */}
              <div className="col-span-4 flex flex-col space-y-3">
                <span className="text-[11px] tracking-[0.2em] uppercase font-mono text-black/40 mb-2">
                  SUB-SELECTIONS
                </span>
                <button
                  onClick={() => {
                    onSelectCategory(hoveredNav);
                    setHoveredNav(null);
                  }}
                  className="text-left font-editorial text-2xl font-normal hover:translate-x-1.5 transition-transform"
                >
                  All Pieces
                </button>
                {activeSubcategories.map((sub) => (
                  <button
                    key={sub.slug}
                    onClick={() => {
                      onSelectCategory(hoveredNav, sub.name);
                      setHoveredNav(null);
                    }}
                    className="text-left text-sm font-sans text-black/70 hover:text-black transition-colors"
                  >
                    {sub.name}
                  </button>
                ))}
              </div>

              {/* Large Image Tile 1 */}
              <div
                onClick={() => {
                  onSelectCategory(hoveredNav);
                  setHoveredNav(null);
                }}
                className="col-span-4 group cursor-pointer"
              >
                <FashionImage
                  src={tileImage1}
                  alt="Winter Campaign 1"
                  position="center 20%"
                  scale={1.05}
                  aspectRatio="4/5"
                  className="border border-black/5"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] font-sans font-medium group-hover:underline underline-offset-4">
                    Winter Campaign 2026
                  </span>
                  <span className="text-[11px] font-mono text-black/40">
                    Explore →
                  </span>
                </div>
              </div>

              {/* Large Image Tile 2 */}
              <div
                onClick={() => {
                  onSelectCategory(hoveredNav);
                  setHoveredNav(null);
                }}
                className="col-span-4 group cursor-pointer"
              >
                <FashionImage
                  src={tileImage2}
                  alt="Archive Series"
                  position="center 65%"
                  scale={1.2}
                  flipped={true}
                  aspectRatio="4/5"
                  className="border border-black/5"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] font-sans font-medium group-hover:underline underline-offset-4">
                    Archive Plate Series
                  </span>
                  <span className="text-[11px] font-mono text-black/40">
                    Explore →
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
