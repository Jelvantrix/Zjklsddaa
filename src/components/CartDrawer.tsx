import React, { useState } from 'react';
import { CartItem, Language, translations, formatPrice } from '../types';
import { FashionImage } from './FashionImage';
import { X, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, size: string, delta: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onProceedToCheckout: () => void;
  onExploreArchive: () => void;
  language: Language;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onExploreArchive,
  language,
}) => {
  const t = translations[language].cart;
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
    } else {
      unlockBodyScroll();
    }
    return () => unlockBodyScroll();
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const freeShippingThreshold = 100; // 100 EUR
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const emptySubtitle =
    language === 'fi'
      ? 'Valitse arkistokappaleita tutustumalla valikoimaan.'
      : language === 'sv'
      ? 'Välj arkivplagg genom att utforska kollektionen.'
      : 'Select archival pieces by exploring the collection.';

  const sizeLabel = language === 'fi' ? 'Koko' : language === 'sv' ? 'Storlek' : 'Size';
  const promoPlaceholder = language === 'fi' ? 'Kampanjakoodi' : language === 'sv' ? 'Kampanjkod' : 'Promo code';
  const applyLabel = language === 'fi' ? 'Käytä' : language === 'sv' ? 'Tillämpa' : 'Apply';
  const vatNote = language === 'fi' ? 'Sis. ALV 24%' : language === 'sv' ? 'Inkl. 24% moms' : 'Incl. 24% VAT';

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white h-full z-10 flex flex-col justify-between overflow-hidden animate-slideIn">
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
            <h3 className="font-serif text-title font-normal">
              {t.title}
            </h3>
            <span className="text-small text-black/50">
              ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-black/60 hover:text-black transition-colors cursor-pointer"
            aria-label="Sulje ostoskori"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        {/* Free Shipping Progress Line */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between text-small sm:text-small mb-1.5">
            {remainingForFreeShipping === 0 ? (
              <span className="text-black font-medium">{t.freeShippingEligible}</span>
            ) : (
              <span className="text-black/70">
                {t.freeShippingRemaining(remainingForFreeShipping)}
              </span>
            )}
            <span className="text-black/40">100,00 €</span>
          </div>
          <div className="w-full h-1 overflow-hidden">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Items List / Empty State */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ShoppingBag className="w-10 h-10 stroke-[1] text-black/20 mb-4" />
              <h4 className="font-serif text-title mb-1">{t.empty}</h4>
              <p className="text-small text-black/50 max-w-xs mb-6">
                {emptySubtitle}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreArchive();
                }}
                className="px-6 py-3 btn-primary text-small uppercase tracking-[0.16em] cursor-pointer"
              >
                {t.continueShopping}
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}`}
                className="py-4 sm:py-5 flex gap-3 sm:gap-4 items-start"
              >
                {/* Thumbnail */}
                <div className="w-16 sm:w-20 aspect-[3/4] overflow-hidden flex-shrink-0 bg-white">
                  <FashionImage
                    product={item.product}
                    src={item.product.image}
                    alt={item.product.name[language]}
                    position={item.product.cropVariation.packshot.position}
                    scale={item.product.cropVariation.packshot.scale}
                    aspectRatio="auto"
                    className="w-full h-full"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-small sm:text-small text-black/40">
                      {item.product.plateNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.product.id, item.size)}
                      className="text-small sm:text-small text-black/40 hover:text-black underline cursor-pointer"
                    >
                      {t.remove}
                    </button>
                  </div>

                  <h5 className="text-small font-medium truncate mt-0.5">
                    {item.product.name[language]}
                  </h5>

                  <p className="text-small sm:text-small text-black/60 mt-0.5">
                    {sizeLabel}: {item.size}
                  </p>

                  <div className="mt-2.5 sm:mt-3 flex items-center justify-between">
                    {/* Quantity Stepper: pure text affordances, no boxes */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.size, -1)}
                        className="p-1 text-black/40 hover:text-black transition-colors cursor-pointer"
                        aria-label="Vähennä"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-small text-black font-medium min-w-[14px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, item.size, 1)}
                        className="p-1 text-black/40 hover:text-black transition-colors cursor-pointer"
                        aria-label="Lisää"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-small font-medium">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Checkout Summary */}
        {items.length > 0 && (
          <div className="p-4 sm:p-6 bg-white space-y-3 sm:space-y-4">
            {/* Promo code: clean border-b input and text apply */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={promoPlaceholder}
                className="flex-1 py-1.5 px-1 text-small uppercase bg-transparent"
              />
              <button
                type="button"
                onClick={() => setPromoApplied(true)}
                className="py-1.5 px-2 text-small uppercase tracking-wider text-black hover:opacity-60 transition-opacity cursor-pointer shrink-0"
              >
                {applyLabel}
              </button>
            </div>
            {promoApplied && (
              <p className="text-small text-black/60">
                Koodi hyväksytty: -0 € (Etu huomioidaan kassalla)
              </p>
            )}

            {/* Subtotal & VAT */}
            <div className="pt-2 space-y-1">
              <div className="flex items-baseline justify-between text-small">
                <span>{t.subtotal}</span>
                <span className="text-small sm:text-body font-medium">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-small sm:text-small text-black/50 text-right">
                {vatNote}
              </p>
            </div>

            {/* Proceed Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 sm:py-4 text-small uppercase tracking-[0.2em] btn-primary flex items-center justify-center gap-2 font-medium cursor-pointer"
            >
              <span>{t.checkout}</span>
              <ArrowRight className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
