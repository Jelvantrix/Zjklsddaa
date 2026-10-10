import React from 'react';
import { Product, Language, translations, formatPrice } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { FashionImage } from './FashionImage';
import { X, Heart, Trash2 } from 'lucide-react';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  onRemoveWishlist: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  language: Language;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  onRemoveWishlist,
  onSelectProduct,
  onQuickAdd,
  language,
}) => {
  const { products } = useStorefrontData();
  const t = translations[language];

  if (!isOpen) return null;

  const wishlistedProducts = (products || []).filter((p) =>
    wishlistIds.includes(p.id)
  );

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between border-l border-black overflow-hidden animate-slideIn">
        <div className="p-6 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 stroke-[1.5]" />
            <h3 className="font-editorial text-2xl font-normal">
              {t.nav.wishlist}
            </h3>
            <span className="font-mono text-xs text-black/50">
              ({wishlistedProducts.length})
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-black/60 hover:text-black transition-colors"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 divide-y divide-black/10">
          {wishlistedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Heart className="w-10 h-10 stroke-[1] text-black/20 mb-3" />
              <p className="font-editorial text-2xl mb-1">
                No saved pieces
              </p>
              <p className="text-xs font-sans text-black/50 max-w-xs">
                Click the heart icon on any plate to curate your private wishlist.
              </p>
            </div>
          ) : (
            wishlistedProducts.map((product) => (
              <div key={product.id} className="py-5 flex gap-4 items-start">
                <div
                  onClick={() => {
                    onClose();
                    onSelectProduct(product);
                  }}
                  className="w-20 aspect-[3/4] border border-black/10 overflow-hidden flex-shrink-0 bg-white cursor-pointer"
                >
                  <FashionImage
                    product={product}
                    src={product.image}
                    alt={product.name[language]}
                    position={product.cropVariation.packshot.position}
                    scale={product.cropVariation.packshot.scale}
                    aspectRatio="auto"
                    className="w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[10px] text-black/40">
                      {product.plateNumber}
                    </span>
                    <button
                      onClick={() => onRemoveWishlist(product.id)}
                      className="text-black/40 hover:text-black"
                      title="Poista suosikeista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h5
                    onClick={() => {
                      onClose();
                      onSelectProduct(product);
                    }}
                    className="font-sans text-xs font-medium truncate mt-0.5 cursor-pointer hover:underline"
                  >
                    {product.name[language]}
                  </h5>

                  <p className="font-mono text-xs text-black/90 mt-1">
                    {formatPrice(product.price)}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {product.sizes.map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => onQuickAdd(product, sz)}
                        className="text-[10.5px] font-mono text-black/60 hover:text-black hover:underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        +{sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {wishlistedProducts.length > 0 && (
          <div className="p-6 border-t border-black/10 bg-white">
            <button
              onClick={onClose}
              className="w-full py-4 btn-secondary text-xs uppercase tracking-[0.18em]"
            >
              Continue Browsing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
