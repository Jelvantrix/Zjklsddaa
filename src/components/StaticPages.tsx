import React, { useState } from 'react';
import { Language, Product, translations, formatPrice } from '../types';
import { useStorefrontData } from '../context/StorefrontDataContext';
import { supabase } from '../supabase/config';
import { FashionImage } from './FashionImage';
import { Check } from 'lucide-react';

interface StaticPageProps {
  slug: string;
  pageType: 'about' | 'service' | 'legal' | 'lookbook' | 'gift-cards' | 'sitemap';
  language: Language;
  onNavigate: (route: any) => void;
  onSelectProduct: (p: Product) => void;
}

export const StaticPages: React.FC<StaticPageProps> = ({
  slug,
  pageType,
  language,
  onNavigate,
  onSelectProduct,
}) => {
  const { products, content } = useStorefrontData();
  const t = translations[language] || translations.en;

  // Tracking form state — resolved against real order rows only
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Gift card state
  const [giftAmount, setGiftAmount] = useState(150);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftSubmitted, setGiftSubmitted] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = trackingCode.trim();
    if (!code) return;

    setIsTracking(true);
    setTrackingResult(null);
    try {
      // Escape LIKE wildcards so the reference is matched literally.
      const pattern = code.replace(/([\\%_])/g, '\\$1');
      const { data, error } = await supabase
        .from('orders')
        .select('number, status, tracking, createdAt, updatedAt')
        .ilike('tracking', pattern)
        .limit(1)
        .maybeSingle();

      if (error) {
        setTrackingResult('Could not load tracking data right now. Please try again later.');
      } else if (!data) {
        setTrackingResult(
          `No tracking record found for ${code.toUpperCase()}. Check the reference from your dispatch notification, or contact the studio.`
        );
      } else {
        const updated = data.updatedAt || data.createdAt;
        setTrackingResult(
          `Shipment ${code.toUpperCase()} — order ${data.number}, current status: ${data.status}` +
            `${updated ? `, last updated ${new Date(updated).toLocaleString('en-US')}` : ''}.`
        );
      }
    } catch {
      setTrackingResult('Could not load tracking data right now. Please try again later.');
    } finally {
      setIsTracking(false);
    }
  };

  // Render SITEMAP (directory of the pages that actually exist)
  if (pageType === 'sitemap') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <div className="max-w-4xl mx-auto">
          <div className="pb-6 sm:pb-8 mb-8 sm:mb-12">
            <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
              ARCHIVE DIRECTORY
            </span>
            <h1 className="font-serif text-display sm:text-display font-normal">
              Site Directory
            </h1>
            <p className="text-small sm:text-small text-black/60 mt-2 sm:mt-3 leading-relaxed">
              Our digital archive houses {products.length} product dossier pages, category hubs, seasonal archives,
              essays, and house charters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 text-small">
            {/* Products */}
            <div>
              <h3 className="font-serif text-title font-normal mb-3 sm:mb-4 pb-2">
                01. Product Dossiers ({products.length} Plates)
              </h3>
              <ul className="space-y-2">
                {products.length === 0 ? (
                  <li className="text-black/40 italic">No published plates yet</li>
                ) : (
                  products.map((prod) => (
                    <li key={prod.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate({ type: 'product', productId: prod.id })}
                        className="hover:underline text-black/70 hover:text-black flex items-center justify-between w-full text-left cursor-pointer"
                      >
                        <span className="truncate pr-2">{prod.plateNumber || prod.nr} · {prod.name.en || prod.name[language]}</span>
                        <span className="text-black/40 shrink-0">{formatPrice(prod.price)}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Categories & Collections (16+ pages) */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="font-serif text-title font-normal mb-3 sm:mb-4 pb-2">
                  02. Categories & Collections
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'naiset' })} className="hover:underline cursor-pointer">
                      /category/women (Complete Women's Archive)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'miehet' })} className="hover:underline cursor-pointer">
                      /category/men (Complete Men's Archive)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'asusteet' })} className="hover:underline cursor-pointer">
                      /category/accessories (Beanies, Scarves, Belts, Bags)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat' })} className="hover:underline cursor-pointer">
                      /category/collections (All Curations)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat', subcategory: 'Winter 2026' })} className="hover:underline cursor-pointer">
                      /collections/winter-2026 (Winter Solstice Archive)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat', subcategory: 'Perusvaatteet' })} className="hover:underline cursor-pointer">
                      /collections/essentials (Permanent Wardrobe)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'lookbook' })} className="hover:underline cursor-pointer">
                      /lookbook (Seasonal Lookbook)
                    </button>
                  </li>
                </ul>
              </div>

              {/* Journal & Stories (4 pages) */}
              <div>
                <h3 className="font-serif text-title font-normal mb-3 sm:mb-4 pb-2">
                  03. Journal & Monographs
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'journal' })} className="hover:underline cursor-pointer">
                      /journal (Main Journal Index)
                    </button>
                  </li>
                  {(content.journalPosts || []).map((art) => (
                    <li key={art.slug}>
                      <button type="button" onClick={() => onNavigate({ type: 'journal', articleSlug: art.slug })} className="hover:underline cursor-pointer truncate max-w-full block">
                        /journal/{art.slug} ({art.title.en || art.title[language]})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* About, Service & Legal (11 pages) */}
              <div>
                <h3 className="font-serif text-title font-normal mb-3 sm:mb-4 pb-2">
                  04. Atelier, Customer Service & Legal
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'philosophy' })} className="hover:underline cursor-pointer">/about/philosophy (Philosophy & Sisu)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'materials' })} className="hover:underline cursor-pointer">/about/materials (Raw Materials & Weaves)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'sustainability' })} className="hover:underline cursor-pointer">/about/sustainability (Circularity & Lifetime Repair)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'workshops' })} className="hover:underline cursor-pointer">/about/workshops (Ateliers: Helsinki & Porto)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'contact' })} className="hover:underline cursor-pointer">/service/contact (Customer Service)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'shipping-returns' })} className="hover:underline cursor-pointer">/service/shipping-returns (Shipping & Returns)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'tracking' })} className="hover:underline cursor-pointer">/service/tracking (Order Tracking)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'size-guide' })} className="hover:underline cursor-pointer">/service/size-guide (Size Guide)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'terms' })} className="hover:underline cursor-pointer">/legal/terms (Terms of Service)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'privacy' })} className="hover:underline cursor-pointer">/legal/privacy (GDPR Privacy Policy)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'cookies' })} className="hover:underline cursor-pointer">/legal/cookies (Cookie Preferences)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'gift-cards' })} className="hover:underline cursor-pointer">/gift-cards (Archive Gift Cards)</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render LOOKBOOK PAGE
  if (pageType === 'lookbook') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-16">
          <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
            WINTER CAMPAIGN 2026
          </span>
          <h1 className="font-serif text-display sm:text-display md:text-display font-normal mb-3 sm:mb-4">
            Winter Light and Silence
          </h1>
          <p className="text-small sm:text-small text-black/60 max-w-lg mx-auto leading-relaxed">
            Pure studio campaign on white backdrop. Sculptural silhouettes and the authentic weight of unblended virgin wool.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
          {products.length === 0 ? (
            <div className="col-span-2 py-16 text-center">
              <p className="text-small uppercase tracking-widest text-black/40">No campaign garments live yet</p>
            </div>
          ) : (
            products.slice(0, 8).map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="group cursor-pointer"
              >
                <div className="aspect-[3/4] overflow-hidden bg-white mb-3 sm:mb-4">
                  <FashionImage
                    product={product}
                    src={product.hoverImage || product.image}
                    alt={product.name.en || product.name[language]}
                    placement="archive"
                    aspectRatio="auto"
                    className="w-full h-full"
                    imageClassName="group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="flex items-baseline justify-between text-small">
                  <div>
                    <span className="text-black/40 mr-2">{product.plateNumber || product.nr}</span>
                    <span className="font-medium text-black group-hover:underline">{product.name.en || product.name[language]}</span>
                  </div>
                  <span>{formatPrice(product.price)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Render GIFT CARDS PAGE
  if (pageType === 'gift-cards') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <div className="max-w-xl mx-auto p-6 sm:p-12">
          <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
            ARCHIVE GIFT CARD
          </span>
          <h1 className="font-serif text-display sm:text-display font-normal mb-3 sm:mb-4">
            Digital Gift Card
          </h1>
          <p className="text-small text-black/70 mb-6 sm:mb-8 leading-relaxed">
            Gift enduring Nordic craftsmanship. Delivered digitally with an exclusive accession gift certificate code.
          </p>

          {!giftSubmitted ? (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-small uppercase tracking-wider text-black/60 mb-2">
                  Select Amount:
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-small">
                  {[100, 150, 250, 500].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setGiftAmount(amt)}
                      className={`py-1 cursor-pointer transition-colors ${ giftAmount === amt ?'text-black font-semibold'
                          : 'text-black/50 hover:text-black'
                      }`}
                    >
                      {amt} €
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-small uppercase tracking-wider text-black/60 mb-1">
                  Recipient Email:
                </label>
                <input
                  type="email"
                  required
                  value={giftRecipient}
                  onChange={(e) => setGiftRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 text-small"
                />
              </div>

              <button
                type="button"
                onClick={() => giftRecipient && setGiftSubmitted(true)}
                className="w-full py-3.5 sm:py-4 btn-primary text-small uppercase tracking-[0.2em] font-medium cursor-pointer"
              >
                Order Gift Card (€{giftAmount}.00)
              </button>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <Check className="w-8 h-8 mx-auto" />
              <p className="text-small">
                Gift card (€{giftAmount}.00) dispatched to {giftRecipient}.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render TRACKING PAGE
  if (slug === 'tracking') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-20">
        <div className="max-w-xl mx-auto p-6 sm:p-12">
          <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
            SHIPMENT TRACKING
          </span>
          <h1 className="font-serif text-display sm:text-display font-normal mb-3 sm:mb-4">
            Track Your Shipment
          </h1>
          <p className="text-small text-black/70 mb-6 sm:mb-8 leading-relaxed">
            Enter your parcel tracking reference provided in your dispatch notification.
          </p>

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="TRACKING REFERENCE..."
                className="w-full px-4 py-3 text-small uppercase"
              />
            </div>
            <button type="submit" disabled={isTracking} className="w-full py-3.5 btn-primary text-small uppercase tracking-[0.18em] cursor-pointer disabled:opacity-60">
              {isTracking ? 'Searching...' : 'Search Status'}
            </button>
          </form>

          {trackingResult && (
            <div className="mt-6 sm:mt-8 p-4 text-small leading-relaxed">
              {trackingResult}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render PHILOSOPHY & ABOUT
  if (slug === 'philosophy') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          HOUSE PHILOSOPHY
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
          Philosophy and Sisu
        </h1>
        <div className="space-y-4 sm:space-y-6 text-small sm:text-body text-black/80 leading-relaxed">
          <p>
            Zejesh was established in opposition to seasonal surplus and synthetic elasticity. We believe genuine luxury derives not from excessive decoration, but from disciplined proportions, the innate stance of natural weaves, and uncompromised comfort without petrochemical shortcuts.
          </p>
          <div className="p-4 sm:p-6 my-4 sm:my-6">
            <p className="font-serif text-title sm:text-title italic text-black">
              "Quietude, space, and honesty of material. Every cut has a deliberate purpose for being."
            </p>
          </div>
          <p>
            When entering the world of Zejesh, the experience is quiet, exclusive, and meaningful. We do not chase fleeting fashion weeks; we create garments designed to feel equally pristine twenty years from now.
          </p>
        </div>
      </div>
    );
  }

  // Render MATERIALS
  if (slug === 'materials') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          CRAFT & INTEGRITY
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
          Honesty of Material
        </h1>
        <div className="space-y-4 sm:space-y-6 text-small sm:text-body text-black/80 leading-relaxed">
          <p>
            We employ strictly 100% mono-materials: certified northern merino, dense Italian virgin wool, heavy Portuguese organic cotton, and heritage European flax. We never compromise wool with polyester or polyamide.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-4 sm:my-6 text-small">
            <div className="p-4">
              <span className="font-medium block mb-1">Virgin Wool</span>
              <span className="text-black/60">Biella & Yorkshire · 680–750g/m²</span>
            </div>
            <div className="p-4">
              <span className="font-medium block mb-1">Merino Wool 19.5µm</span>
              <span className="text-black/60">Spun in Finland · Non-itch</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render SUSTAINABILITY
  if (slug === 'sustainability') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          CIRCULAR CHARTER
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
          Circularity & Lifetime Repair
        </h1>
        <div className="space-y-4 sm:space-y-6 text-small sm:text-body text-black/80 leading-relaxed">
          <p>
            We operate strictly in limited batch releases with zero surplus. Furthermore, all Zejesh archive coats and knitwear include complimentary restorative lifetime stitching in our Helsinki atelier.
          </p>
        </div>
      </div>
    );
  }

  // Render WORKSHOPS
  if (slug === 'workshops') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          PRODUCTION
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
          Ateliers: Helsinki & Porto
        </h1>
        <p className="text-small sm:text-body text-black/80 leading-relaxed">
          Pattern drafting and artisanal finishing take place in our Punavuori studio in Helsinki. Tailored overcoats and heavy jerseys are executed with our heritage family workshop in Porto, Portugal.
        </p>
      </div>
    );
  }

  // Render CONTACT & CUSTOMER SERVICE
  if (slug === 'contact') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          CLIENT CONCIERGE
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-4 sm:mb-6">
          Contact House
        </h1>
        <div className="p-5 sm:p-6 space-y-3 text-small">
          <p><strong>Email:</strong> concierge@zejesh.com</p>
          <p><strong>Direct Line:</strong> +358 (0)9 4245 8920</p>
          <p><strong>Hours:</strong> Mon–Fri 10:00 – 18:00 (EET)</p>
          <p><strong>Studio:</strong> Pursimiehenkatu 12, 00150 Helsinki, Finland</p>
        </div>
      </div>
    );
  }

  // Render SHIPPING & RETURNS
  if (slug === 'shipping-returns') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
        <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
          DELIVERY CHARTER
        </span>
        <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
          Shipping and Returns
        </h1>
        <div className="space-y-4 sm:space-y-6 text-small sm:text-small text-black/80 leading-relaxed">
          <div className="p-4">
            <h4 className="font-medium mb-1 uppercase">Complimentary Shipping Over €100</h4>
            <p className="text-black/70">Tracked expedited delivery dispatched within 1–3 business days.</p>
          </div>
          <div className="p-4">
            <h4 className="font-medium mb-1 uppercase">14-Day Complimentary Returns</h4>
            <p className="text-black/70">All pieces may be returned within 14 days of receipt in original condition. Pre-printed prepaid returns documentation included.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render TERMS, PRIVACY, COOKIES
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-28 sm:pt-36 lg:pt-44">
      <span className="text-small tracking-[0.24em] uppercase text-black/40 block mb-2">
        LEGAL & GOVERNANCE
      </span>
      <h1 className="font-serif text-display sm:text-display font-normal mb-6 sm:mb-8">
        {slug === 'terms' ? 'Terms & Conditions of Sale' : slug === 'privacy' ? 'Privacy Policy (GDPR)' : 'Cookie Preferences'}
      </h1>
      <div className="space-y-4 text-small sm:text-small text-black/80 leading-relaxed">
        <p>Zejesh Clothes Oy · Business ID: FI32918239 · Helsinki, Finland</p>
        <p>All prices include standard VAT (24%). European consumers retain statutory 14-day cancellation and return rights.</p>
        <p>We process personal data solely for fulfillment of your order and secure account authentication. We never sell or transfer personal records to third-party marketing entities.</p>
      </div>
    </div>
  );
};
