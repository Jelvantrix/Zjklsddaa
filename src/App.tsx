import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Language, PageRoute } from './types';
import { ARCHIVE_PRODUCTS, JOURNAL_ARTICLES } from './data/mockData';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { HomeSections } from './components/HomeSections';
import { ProductListing } from './components/ProductListing';
import { ProductDetail } from './components/ProductDetail';
import { QuickLookModal } from './components/QuickLookModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { AccountModal } from './components/AccountModal';
import { MobileMenu } from './components/MobileMenu';
import { JournalModal } from './components/JournalModal';
import { CookieBanner } from './components/CookieBanner';
import { StaticPages } from './components/StaticPages';
import { Footer } from './components/Footer';
import { CustomCursor } from './components/CustomCursor';
import { Preloader } from './components/Preloader';
import { AuthProvider } from './firebase/AuthContext';
import { StorefrontDataProvider, useStorefrontData } from './context/StorefrontDataContext';
import { AdminLayout } from './admin/AdminLayout';

export const ADMIN_SECRET_PATH = '/atelier-security-vault-huxaifa-official-jm942jd-enterprise-management-terminal-8492048102-restricted-console';
export const ADMIN_SECRET_HASH = '#atelier-security-vault-huxaifa-official-jm942jd-enterprise-management-terminal-8492048102-restricted-console';

function isSecretAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const hash = window.location.hash;

  // Reject basic /admin access attempts as requested by user
  if (path === '/admin' || path === '/admin/' || hash === '#admin') {
    return false;
  }

  return (
    path === ADMIN_SECRET_PATH ||
    path === `${ADMIN_SECRET_PATH}/` ||
    hash === ADMIN_SECRET_HASH ||
    hash === `#${ADMIN_SECRET_PATH}` ||
    path.startsWith(ADMIN_SECRET_PATH)
  );
}

function StorefrontApp() {
  const { products, categories, collections, content, loading: productsLoading, isLiveFromFirestore } = useStorefrontData();
  const [preloaderDone, setPreloaderDone] = useState(false);

  // Pure English language (all other languages removed)
  const [language, setLanguage] = useState<Language>('en');

  // Multi-Page Route State (Supporting 50+ distinct page routes & long secret admin console)
  const [route, setRoute] = useState<PageRoute>(() => {
    if (isSecretAdminUrl()) {
      return { type: 'admin' };
    }
    return { type: 'home' };
  });

  // Overlays and Modals State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [quickLookProduct, setQuickLookProduct] = useState<Product | null>(null);
  const [journalArticleId, setJournalArticleId] = useState<string | null>(null);

  // Cart & Wishlist State
  const [cartItems, setCartItems] = useState<CartItem[]>(() => [
    {
      product: products[0] || ARCHIVE_PRODUCTS[0],
      size: 'M',
      quantity: 1,
    },
  ]);
  const [wishlistIds, setWishlistIds] = useState<string[]>(['ze-002', 'ze-004']);

  // Hero visibility tracking for header transparency and blend mode
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const homeSectionRef = useRef<HTMLDivElement | null>(null);

  // Browser History & Hash integration
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.route) {
        setRoute(e.state.route);
      } else if (isSecretAdminUrl()) {
        setRoute({ type: 'admin' });
      } else {
        setRoute({ type: 'home' });
      }
    };

    const handleHashChange = () => {
      if (isSecretAdminUrl()) {
        setRoute({ type: 'admin' });
      }
    };

    const checkDirectAdminAttempt = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      if (p === '/admin' || p === '/admin/' || h === '#admin') {
        window.history.replaceState(null, '', '/');
      }
    };
    checkDirectAdminAttempt();

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigateTo = (newRoute: PageRoute, addToHistory = true) => {
    setRoute(newRoute);
    if (addToHistory) {
      window.history.pushState({ route: newRoute }, '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (route.type !== 'home') {
        setIsHeroVisible(false);
        return;
      }
      const scrollPos = window.scrollY;
      const heroHeight = window.innerHeight;
      setIsHeroVisible(scrollPos < heroHeight - 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [route.type]);

  // Navigation Handlers
  const handleNavigateHome = () => {
    navigateTo({ type: 'home' });
  };

  const handleSelectCategory = (category: string, subcategory?: string) => {
    navigateTo({ type: 'archive', category, subcategory });
  };

  const handleSelectProduct = (product: Product) => {
    navigateTo({ type: 'product', productId: product.id });
  };

  const handleScrollCue = () => {
    if (homeSectionRef.current) {
      homeSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  };

  // Cart Operations
  const handleAddToCart = (product: Product, size: string) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.size === size
      );
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, size, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleQuickAdd = (product: Product, size: string) => {
    handleAddToCart(product, size);
  };

  const handleUpdateQuantity = (productId: string, size: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.size === size) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string, size: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.size === size)
      )
    );
  };

  // Wishlist Operations
  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Resolve current active product if route is 'product' from live products
  const activeProduct =
    route.type === 'product'
      ? products.find((p) => p.id === route.productId) ||
        ARCHIVE_PRODUCTS.find((p) => p.id === route.productId) ||
        products[0] ||
        ARCHIVE_PRODUCTS[0]
      : null;

  // Render Admin Layout if route is admin
  if (route.type === 'admin') {
    return (
      <AdminLayout
        onBackToStorefront={() => {
          if (window.location.hash === ADMIN_SECRET_HASH || window.location.pathname.startsWith(ADMIN_SECRET_PATH)) {
            window.history.pushState(null, '', '/');
          }
          navigateTo({ type: 'home' });
        }}
        onViewProductInStore={(p) => navigateTo({ type: 'product', productId: p.id })}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] text-[#000000] selection:bg-[#000000] selection:text-[#FFFFFF]">
      {/* 1. PRELOADER */}
      <Preloader onComplete={() => setPreloaderDone(true)} />

      {/* 2. MINIMAL DESKTOP CUSTOM CURSOR */}
      <CustomCursor />

      {/* 3. FIXED HEADER with 1-Click Translation & Difference Blending */}
      <Header
        language={language}
        onSetLanguage={(lang) => setLanguage(lang)}
        cartCount={totalCartCount}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAccount={() => setIsAccountOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={handleNavigateHome}
        onNavigateLookbook={() => navigateTo({ type: 'lookbook' })}
        onNavigateSitemap={() => navigateTo({ type: 'sitemap' })}
        isHeroVisible={route.type === 'home' && isHeroVisible}
        currentCategory={route.type === 'archive' ? (route.category || 'all') : undefined}
        currentRouteType={route.type}
        categories={categories}
      />

      {/* 4. MULTI-PAGE VIEW ROUTER (50+ Pages) */}
      <main>
        {/* PAGE: HOME */}
        {route.type === 'home' && (
          <>
            {/* Multi-Slide Hero: Video + Studio Photo on pure white background */}
            <HeroSection
              onScrollCueClick={handleScrollCue}
              language={language}
              slides={content?.heroSlides && content.heroSlides.length > 0 ? content.heroSlides : undefined}
            />

            {/* Sections 2 through 10 in exact requested order */}
            <div ref={homeSectionRef}>
              <HomeSections
                language={language}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onOpenQuickLook={(prod) => setQuickLookProduct(prod)}
                onQuickAdd={handleQuickAdd}
                onToggleWishlist={handleToggleWishlist}
                wishlistIds={wishlistIds}
                products={products}
                onOpenJournalArticle={(id) => {
                  const art = JOURNAL_ARTICLES.find((a) => a.id === id);
                  if (art) {
                    navigateTo({ type: 'journal', articleSlug: art.slug });
                  } else {
                    navigateTo({ type: 'journal' });
                  }
                }}
              />
            </div>
          </>
        )}

        {/* PAGE: THE ARCHIVE & CATEGORIES (All Category & Subcategory Pages) */}
        {route.type === 'archive' && (
          <ProductListing
            language={language}
            selectedCategory={route.category || 'all'}
            selectedSubcategory={route.subcategory}
            onSelectCategory={handleSelectCategory}
            onSelectProduct={handleSelectProduct}
            onOpenQuickLook={(prod) => setQuickLookProduct(prod)}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
            wishlistIds={wishlistIds}
            products={products}
            categories={categories}
            loading={productsLoading}
            isLiveFromFirestore={isLiveFromFirestore}
          />
        )}

        {/* PAGE: DEDICATED INDIVIDUAL PRODUCT PAGE (24 distinct pages) */}
        {route.type === 'product' && activeProduct && (
          <ProductDetail
            product={activeProduct}
            language={language}
            onBackToArchive={() => navigateTo({ type: 'archive', category: activeProduct.category })}
            onAddToCart={handleAddToCart}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            isWishlisted={wishlistIds.includes(activeProduct.id)}
          />
        )}

        {/* PAGES: DEDICATED STATIC & EDITORIAL PAGES (Lookbook, Gift Cards, Sitemap, About, Service, Legal) */}
        {(route.type === 'lookbook' ||
          route.type === 'gift-cards' ||
          route.type === 'sitemap' ||
          route.type === 'about' ||
          route.type === 'service' ||
          route.type === 'legal') && (
          <StaticPages
            slug={
              route.type === 'about'
                ? route.slug
                : route.type === 'service'
                ? route.slug
                : route.type === 'legal'
                ? route.slug
                : route.type
            }
            pageType={route.type}
            language={language}
            onNavigate={(r) => navigateTo(r)}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {/* PAGE: JOURNAL & ESSAYS */}
        {route.type === 'journal' && (
          <div className="max-w-[1720px] mx-auto px-6 md:px-10 py-24 min-h-screen">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-black/40 block mb-2">
                ATELIER MONOGRAPHS
              </span>
              <h1 className="font-editorial text-4xl sm:text-6xl font-normal mb-3 text-black">
                Textile Studies & Archival Notes
              </h1>
              <p className="text-xs sm:text-sm font-sans text-black/60 max-w-lg mx-auto font-light leading-relaxed">
                Documenting raw northern materials, heritage shuttle weaving, and permanent garment architecture.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">
              {JOURNAL_ARTICLES.map((article) => (
                <article
                  key={article.id}
                  onClick={() => setJournalArticleId(article.id)}
                  className="p-8 sm:p-10 border border-black/[0.08] hover:border-black transition-colors cursor-pointer group bg-white"
                >
                  <div className="flex items-center gap-3 text-[10.5px] font-mono text-black/40 mb-3 uppercase tracking-wider">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>ARCHIVE DOSSIER</span>
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-4xl font-normal mb-3 text-black group-hover:underline underline-offset-4">
                    {article.title.en || article.title.fi}
                  </h2>
                  <p className="text-xs sm:text-sm font-sans text-black/60 mb-6 leading-relaxed font-light max-w-2xl">
                    {article.subtitle.en || article.subtitle.fi}
                  </p>
                  <span className="text-xs font-mono tracking-[0.2em] uppercase text-black underline underline-offset-4">
                    Inspect Dossier →
                  </span>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 5. LARGE FOOTER with 1-Click Translation & 50+ Page Directory */}
      <Footer
        language={language}
        onSetLanguage={(lang) => setLanguage(lang)}
        onSelectCategory={handleSelectCategory}
        onNavigatePage={(r) => navigateTo(r)}
      />

      {/* 6. MODALS & DRAWERS */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        language={language}
        onSelectProduct={handleSelectProduct}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        language={language}
        onSetLanguage={(lang) => setLanguage(lang)}
        onSelectCategory={handleSelectCategory}
        onNavigateHome={handleNavigateHome}
        onNavigateLookbook={() => navigateTo({ type: 'lookbook' })}
        onNavigateSitemap={() => navigateTo({ type: 'sitemap' })}
        onOpenJournal={() => navigateTo({ type: 'journal' })}
        categories={categories}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onExploreArchive={() => navigateTo({ type: 'archive' })}
        language={language}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        onOrderSuccess={() => setCartItems([])}
        language={language}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistIds={wishlistIds}
        onRemoveWishlist={handleToggleWishlist}
        onSelectProduct={handleSelectProduct}
        onQuickAdd={handleQuickAdd}
        language={language}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        language={language}
      />

      <QuickLookModal
        product={quickLookProduct}
        onClose={() => setQuickLookProduct(null)}
        onSelectProduct={(p) => {
          setQuickLookProduct(null);
          handleSelectProduct(p);
        }}
        onQuickAdd={handleQuickAdd}
        language={language}
      />

      <JournalModal
        articleId={journalArticleId}
        onClose={() => setJournalArticleId(null)}
        language={language}
      />

      <CookieBanner language={language} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontDataProvider>
        <StorefrontApp />
      </StorefrontDataProvider>
    </AuthProvider>
  );
}

