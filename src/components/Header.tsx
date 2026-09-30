import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations, SUB_CATEGORIES } from '../data/mockData';
import { BrandLogo } from './BrandLogo';
import { FashionImage } from './FashionImage';
import { TranslationBar } from './TranslationBar';
import { Search, Heart, User, ShoppingBag, Menu } from 'lucide-react';

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
  isHeroVisible: boolean;
  currentCategory?: string;
  currentRouteType?: string;
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
  isHeroVisible,
  currentCategory,
  currentRouteType,
}) => {
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  const t = translations[language];

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

  const navItems = [
    { key: 'uutuudet', label: t.nav.new, subKey: null },
    { key: 'naiset', label: t.nav.women, subKey: 'naiset' as const },
    { key: 'miehet', label: t.nav.men, subKey: 'miehet' as const },
    { key: 'asusteet', label: t.nav.accessories, subKey: 'asusteet' as const },
    { key: 'kokoelmat', label: t.nav.collections, subKey: 'kokoelmat' as const },
    { key: 'lookbook', label: t.nav.lookbook, subKey: null },
  ];

  const isOverHeroAtTop = isHeroVisible && !isScrolled;

  return (
    <>
      <header
        onMouseLeave={() => setHoveredNav(null)}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          isOverHeroAtTop
            ? 'bg-transparent text-black border-transparent shadow-none'
            : 'bg-white/95 backdrop-blur-md text-black border-b border-black/[0.06] shadow-[0_1px_20px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* ROW 1: BRAND LOGO (ABSOLUTELY CENTERED) & UTILITY ACTIONS (BALANCED) */}
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 h-16 sm:h-20 flex items-center justify-between relative">
          {/* LEFT: Menu & Search */}
          <div className="flex items-center justify-start gap-3 sm:gap-4 md:gap-6 z-20">
            {/* Mobile / Tablet Menu */}
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden py-2 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0"
              aria-label="Valikko"
            >
              <Menu className="w-4 h-4 stroke-[1.5]" />
              <span className="text-[11px] uppercase tracking-[0.20em] font-sans font-medium hidden xs:inline">
                {language === 'fi' ? 'Valikko' : language === 'sv' ? 'Meny' : 'Menu'}
              </span>
            </button>

            {/* Search: Available on Phone, Tablet and Desktop */}
            <button
              type="button"
              onClick={onOpenSearch}
              className="py-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0 group/search"
              aria-label={t.nav.search}
            >
              <Search className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline text-[11px] md:text-[11.5px] uppercase tracking-[0.20em] font-sans font-medium">
                {t.nav.search}
              </span>
            </button>
          </div>

          {/* CENTER: Exact Brand Logo (ABSOLUTELY GEOMETRICALLY CENTERED ON PHONE, TABLET & DESKTOP) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-10 flex items-center justify-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="cursor-pointer group focus-visible:outline-none inline-flex items-center justify-center py-1"
              aria-label="Palaa etusivulle"
            >
              <BrandLogo size="md" invert={false} />
            </button>
          </div>

          {/* RIGHT: Pure Typographic Actions & Translation */}
          <div className="flex items-center justify-end gap-3 sm:gap-4 md:gap-6 z-20">
            {/* Wishlist Trigger */}
            <button
              type="button"
              onClick={onOpenWishlist}
              className="py-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0"
              aria-label={t.nav.wishlist}
            >
              <Heart className={`w-3.5 h-3.5 stroke-[1.5] ${wishlistCount > 0 ? 'fill-current' : ''}`} />
              <span className="hidden md:inline text-[11px] uppercase tracking-[0.18em] font-sans font-medium">
                {t.nav.wishlist}
              </span>
              {wishlistCount > 0 && (
                <span className="text-[10px] font-mono leading-none">
                  ({wishlistCount})
                </span>
              )}
            </button>

            {/* Account (Tablet & Desktop) */}
            <button
              type="button"
              onClick={onOpenAccount}
              className="py-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer hidden sm:flex items-center gap-1.5 shrink-0"
              aria-label={t.nav.account}
            >
              <User className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden xl:inline text-[11px] uppercase tracking-[0.18em] font-sans font-medium">
                {t.nav.account}
              </span>
            </button>

            {/* Shopping Bag */}
            <button
              type="button"
              onClick={onOpenCart}
              className="py-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer flex items-center gap-1.5 shrink-0"
              aria-label={t.nav.bag}
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[1.5]" />
              <span className="hidden md:inline text-[11px] uppercase tracking-[0.18em] font-sans font-medium">
                {t.nav.bag}
              </span>
              <span className="text-[11px] font-mono leading-none font-medium">
                ({cartCount})
              </span>
            </button>

            {/* 1-Click Translation Switcher (Tablet & Desktop; available in menu on small phones) */}
            <div className="pl-1 shrink-0 hidden sm:block">
              <TranslationBar
                language={language}
                onSetLanguage={onSetLanguage}
                className={isOverHeroAtTop ? 'text-black/90' : 'text-black'}
              />
            </div>
          </div>
        </div>

        {/* ROW 2: DESKTOP CATEGORY NAVIGATION STRIP (NO BORDER BETWEEN LOGO AND CATEGORIES) */}
        <div
          className={`hidden lg:block transition-colors duration-300 ${
            isOverHeroAtTop
              ? 'bg-transparent'
              : 'bg-white/95 backdrop-blur-md'
          }`}
        >
          <div className="max-w-[1720px] mx-auto px-6 md:px-10 h-11 flex items-center justify-center">
            <nav
              className="flex items-center justify-center gap-8 xl:gap-12 2xl:gap-16"
              aria-label="Päävalikko"
            >
              {navItems.map((item) => {
                const isActive =
                  (item.key === 'lookbook' && currentRouteType === 'lookbook') ||
                  (currentRouteType === 'archive' &&
                    (currentCategory === item.key || (item.key === 'uutuudet' && currentCategory === 'all')));

                return (
                  <button
                    type="button"
                    key={item.key}
                    onMouseEnter={() => setHoveredNav(item.subKey)}
                    onClick={() => {
                      setHoveredNav(null);
                      if (item.key === 'lookbook') {
                        onNavigateLookbook();
                      } else {
                        onSelectCategory(item.key === 'uutuudet' ? 'all' : item.key);
                      }
                    }}
                    className={`relative py-2.5 px-3 text-[12px] xl:text-[12.5px] uppercase tracking-[0.22em] xl:tracking-[0.24em] font-sans font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap group/link ${
                      isActive ? 'text-black' : 'text-black/75 hover:text-black'
                    }`}
                  >
                    <span>{item.label}</span>
                    {/* Animated Hairline Underline on Hover & Active State */}
                    <span
                      className={`absolute bottom-0.5 left-3 right-3 h-[1px] bg-black transition-all duration-300 origin-center ${
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
                  {language === 'fi' ? 'ALIKATEGORIAT' : 'SUB-SELECTIONS'}
                </span>
                <button
                  onClick={() => {
                    onSelectCategory(hoveredNav);
                    setHoveredNav(null);
                  }}
                  className="text-left font-editorial text-2xl font-normal hover:translate-x-1.5 transition-transform"
                >
                  {language === 'fi' ? 'Kaikki vaatteet' : 'All Pieces'}
                </button>
                {SUB_CATEGORIES[hoveredNav as keyof typeof SUB_CATEGORIES]?.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      onSelectCategory(hoveredNav, sub);
                      setHoveredNav(null);
                    }}
                    className="text-left text-sm font-sans text-black/70 hover:text-black transition-colors"
                  >
                    {sub}
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
                  src="/src/assets/images/wool_coat_model_1790736253323.jpg"
                  alt="Kokoelma kampanja 1"
                  position="center 20%"
                  scale={1.05}
                  aspectRatio="4/5"
                  className="border border-black/5"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] font-sans font-medium group-hover:underline underline-offset-4">
                    {language === 'fi' ? 'Talvikampanja 2026' : 'Winter Campaign 2026'}
                  </span>
                  <span className="text-[11px] font-mono text-black/40">
                    {language === 'fi' ? 'Katso' : 'Explore'} →
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
                  src="/src/assets/images/mens_trench_model_1790736267744.jpg"
                  alt="Kokoelma kampanja 2"
                  position="center 65%"
                  scale={1.2}
                  flipped={true}
                  aspectRatio="4/5"
                  className="border border-black/5"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] font-sans font-medium group-hover:underline underline-offset-4">
                    {language === 'fi' ? 'Arkistolevyjen sarja' : 'Archive Plate Series'}
                  </span>
                  <span className="text-[11px] font-mono text-black/40">
                    {language === 'fi' ? 'Katso' : 'Explore'} →
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
