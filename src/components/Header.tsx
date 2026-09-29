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

      if (currentScrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > 150 && currentScrollY > lastScrollY && !hoveredNav) {
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

  // When hero is visible and page is at top, header is transparent with difference mode
  const isOverHeroAtTop = isHeroVisible && !isScrolled;

  return (
    <>
      <header
        onMouseLeave={() => setHoveredNav(null)}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          isOverHeroAtTop
            ? 'bg-transparent text-black'
            : 'bg-white/80 backdrop-blur-md text-black border-b border-black/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* ROW 1: BRAND LOGO (CENTER), MENU (LEFT), TRANSLATION (RIGHT) */}
        <div className="relative max-w-[1720px] mx-auto px-3 sm:px-6 md:px-10 h-14 sm:h-16 md:h-20 flex items-center justify-between">
          {/* LEFT: Category Navigation (Desktop) & Hamburger (Mobile / Tablet) */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 z-20">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 -ml-2 text-inherit hover:opacity-70 transition-opacity cursor-pointer shrink-0 flex items-center gap-1.5"
              aria-label="Valikko"
            >
              <Menu className="w-5 h-5 stroke-[1.5]" />
              <span className="hidden sm:inline text-[11px] uppercase tracking-[0.16em] font-sans font-medium">
                {language === 'fi' ? 'Valikko' : language === 'sv' ? 'Meny' : 'Menu'}
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-[11.5px] xl:text-[12px] uppercase tracking-[0.14em] font-sans font-medium">
              {navItems.map((item) => (
                <button
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
                  className="relative py-2 hover:opacity-60 transition-opacity whitespace-nowrap cursor-pointer"
                >
                  <span>{item.label}</span>
                  {hoveredNav === item.subKey && (
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-current" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* CENTER: Exact Brand Logo (ABSOLUTELY CENTERED - ZERO OVERLAPPING) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto flex items-center justify-center">
            <button
              onClick={onNavigateHome}
              className="cursor-pointer group focus-visible:outline-none inline-flex items-center justify-center"
              aria-label="Palaa etusivulle"
            >
              <BrandLogo size="md" invert={false} />
            </button>
          </div>

          {/* RIGHT: Desktop Actions & 1-Click Translation */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-3 md:gap-4 z-20">
            {/* Desktop-only Action items (Search, Wishlist, Account, Cart) */}
            <button
              onClick={onOpenSearch}
              className="hidden lg:flex p-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer items-center gap-1.5 shrink-0"
              aria-label={t.nav.search}
            >
              <Search className="w-4 h-4 stroke-[1.5]" />
              <span className="hidden 2xl:inline text-[11px] uppercase tracking-[0.14em]">
                {t.nav.search}
              </span>
            </button>

            <button
              onClick={onOpenWishlist}
              className="relative p-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer hidden lg:flex items-center gap-1.5 shrink-0"
              aria-label={t.nav.wishlist}
            >
              <Heart className="w-4 h-4 stroke-[1.5]" />
              {wishlistCount > 0 && (
                <span className="text-[10px] font-mono leading-none">
                  ({wishlistCount})
                </span>
              )}
            </button>

            <button
              onClick={onOpenAccount}
              className="p-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer hidden lg:flex items-center gap-1.5 shrink-0"
              aria-label={t.nav.account}
            >
              <User className="w-4 h-4 stroke-[1.5]" />
            </button>

            <button
              onClick={onOpenCart}
              className="relative p-1.5 text-inherit hover:opacity-60 transition-opacity cursor-pointer hidden lg:flex items-center gap-1 shrink-0"
              aria-label={t.nav.bag}
            >
              <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
              <span className="text-[11px] font-mono leading-none font-medium">
                ({cartCount})
              </span>
            </button>

            {/* 1-CLICK INSTANT GLOBAL TRANSLATION SWITCHER (fi / eng / sv) */}
            <div className="pl-1 shrink-0">
              <TranslationBar
                language={language}
                onSetLanguage={onSetLanguage}
                className={isOverHeroAtTop ? 'text-black/90' : 'text-black'}
              />
            </div>
          </div>
        </div>

        {/* ROW 2: LOWER OF NAVBAR (Mobile & Tablet dedicated utility strip) */}
        {/* Gives Search, Liked/Favorites, and Shopping Bag their own perfect, spacious row */}
        <div
          className={`lg:hidden transition-colors duration-300 border-t ${
            isOverHeroAtTop
              ? 'border-black/10 bg-transparent'
              : 'border-black/[0.06] bg-black/[0.01]'
          } px-3 sm:px-6 md:px-10 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4`}
        >
          {/* 1. SEARCH TRIGGER BUTTON */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex-1 max-w-[190px] sm:max-w-xs flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12] border border-black/10 transition-colors text-left group cursor-pointer"
            aria-label={t.nav.search}
          >
            <Search className="w-3.5 h-3.5 stroke-[1.5] text-black/60 group-hover:text-black shrink-0" />
            <span className="text-[10.5px] sm:text-[11.5px] uppercase tracking-wider font-sans text-black/70 group-hover:text-black truncate">
              {t.nav.search}...
            </span>
          </button>

          {/* 2. FAV / LIKED BUTTON WITH COUNTER */}
          <button
            type="button"
            onClick={onOpenWishlist}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 hover:bg-black/[0.05] active:bg-black/[0.1] border border-transparent hover:border-black/10 transition-colors cursor-pointer shrink-0 text-black"
            aria-label={t.nav.wishlist}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.5] ${
                wishlistCount > 0 ? 'fill-black' : ''
              }`}
            />
            <span className="text-[10.5px] sm:text-[11.5px] uppercase tracking-wider font-sans font-medium">
              {language === 'fi' ? 'Suosikit' : language === 'sv' ? 'Favoriter' : 'Liked'}
            </span>
            {wishlistCount > 0 && (
              <span className="font-mono text-[9.5px] sm:text-[10.5px] font-semibold text-black/75">
                ({wishlistCount})
              </span>
            )}
          </button>

          {/* 3. SHOPPING BAG BUTTON */}
          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 transition-colors cursor-pointer shrink-0"
            aria-label={t.nav.bag}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[1.5]" />
            <span className="text-[10.5px] sm:text-[11.5px] uppercase tracking-wider font-sans font-medium">
              {language === 'fi' ? 'Kori' : language === 'sv' ? 'Korg' : 'Bag'}
            </span>
            <span className="font-mono text-[9.5px] sm:text-[10.5px] font-bold">
              ({cartCount})
            </span>
          </button>
        </div>

        {/* MEGA MENU: Desktop Hover Drawer */}
        {hoveredNav && (
          <div
            onMouseEnter={() => setHoveredNav(hoveredNav)}
            onMouseLeave={() => setHoveredNav(null)}
            className="absolute top-full left-0 w-full bg-white text-black border-b border-black/10 shadow-xl transition-all duration-300 animate-fadeIn hidden lg:block"
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
