import React, { useState, useMemo } from 'react';
import { Language, Product, formatPrice } from '../types';
import { FashionImage } from './FashionImage';
import { joinWaitlist } from '../supabase/dbService';

interface HomeSectionsProps {
  language: Language;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string, sub?: string) => void;
  onOpenQuickLook: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  onToggleWishlist: (productId: string) => void;
  wishlistIds: string[];
  onOpenJournalArticle?: (articleId: string) => void;
  products?: Product[];
}

export const HomeSections: React.FC<HomeSectionsProps> = ({
  language,
  onSelectProduct,
  onSelectCategory,
  onOpenQuickLook,
  onQuickAdd,
  onToggleWishlist,
  wishlistIds,
  products = [],
}) => {
  const liveProducts = useMemo(() => {
    return Array.isArray(products) ? products.filter((p) => p && p.status === 'live') : [];
  }, [products]);

  const womenHighlight = useMemo(() => {
    return liveProducts.find((p) => p.category === 'naiset');
  }, [liveProducts]);

  const menHighlight = useMemo(() => {
    return liveProducts.find((p) => p.category === 'miehet');
  }, [liveProducts]);

  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleQuickAdd = (product: Product, size: string) => {
    onQuickAdd(product, size);
    setAddedFeedback(`${product.id}-${size}`);
    setTimeout(() => setAddedFeedback(null), 1600);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      joinWaitlist(email, 'newsletter', 'homepage').catch(() => {});
      setIsSubscribed(true);
    }
  };

  return (
    <div className="w-full bg-white text-black">
      {/* 1. THE SEASONAL EDIT (Real category products only) */}
      {(womenHighlight || menHighlight) && (
        <section className="w-full py-16">
          <div className="max-w-[1880px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            {womenHighlight && (
              <div
                onClick={() => onSelectCategory('naiset')}
                className="cursor-pointer space-y-4"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <FashionImage
                    product={womenHighlight}
                    src={womenHighlight.image}
                    alt="Women"
                    aspectRatio="auto"
                    placement="archive"
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-title hover:underline">
                    Women
                  </h2>
                  <span className="text-small text-black/70 hover:underline">
                    Explore →
                  </span>
                </div>
              </div>
            )}

            {menHighlight && (
              <div
                onClick={() => onSelectCategory('miehet')}
                className="cursor-pointer space-y-4"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <FashionImage
                    product={menHighlight}
                    src={menHighlight.image}
                    alt="Men"
                    aspectRatio="auto"
                    placement="archive"
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-title hover:underline">
                    Men
                  </h2>
                  <span className="text-small text-black/70 hover:underline">
                    Explore →
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. COLLECTION SHOWCASE */}
      <section className="w-full max-w-[1880px] mx-auto px-6 py-16">
        <div className="flex items-baseline justify-between mb-12">
          <h2 className="text-title">
            Collection
          </h2>
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-small text-black/70 hover:underline cursor-pointer"
          >
            All Products →
          </button>
        </div>

        {liveProducts.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-body text-black/50">
              No products yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {liveProducts.slice(0, 8).map((product) => {
              const productName = product.name?.en || product.name?.fi || 'Product';
              const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['XS', 'S', 'M', 'L', 'XL'];

              return (
                <div key={product.id} className="space-y-4">
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="aspect-[3/4] overflow-hidden cursor-pointer"
                  >
                    <FashionImage
                      product={product}
                      src={product.image}
                      alt={productName}
                      placement="card"
                      aspectRatio="3/4"
                      className="w-full h-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="text-body hover:underline cursor-pointer"
                      >
                        {productName}
                      </h3>
                      <span className="text-small">
                        {formatPrice(product.price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleQuickAdd(product, s)}
                          className="text-small text-black/60 hover:text-black hover:underline cursor-pointer"
                        >
                          {addedFeedback === `${product.id}-${s}` ? 'Added' : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. NEWSLETTER */}
      <section className="w-full max-w-[1880px] mx-auto px-6 py-24 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-title">
            Newsletter
          </h2>
          <p className="text-body text-black/60">
            Sign up for updates on new releases.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="pt-4 flex items-center justify-center gap-6">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-body text-center"
            />
            <button
              type="submit"
              className="text-small text-black hover:underline cursor-pointer"
            >
              {isSubscribed ? 'Subscribed' : 'Submit →'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
