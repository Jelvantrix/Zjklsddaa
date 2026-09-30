import React, { useState } from 'react';
import { Language, Product } from '../types';
import { ARCHIVE_PRODUCTS, JOURNAL_ARTICLES, translations, formatPrice } from '../data/mockData';
import { FashionImage } from './FashionImage';
import { ArrowLeft, Check, Search, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

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
  const t = translations[language];

  // Tracking form state
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState<string | null>(null);

  // Gift card state
  const [giftAmount, setGiftAmount] = useState(150);
  const [giftRecipient, setGiftRecipient] = useState('');
  const [giftSubmitted, setGiftSubmitted] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      setTrackingResult(
        language === 'fi'
          ? `Lähetys ${trackingCode.toUpperCase()}: Lajiteltu Vantaan logistiikkakeskuksessa. Arvioitu nouto huomenna klo 16 mennessä.`
          : `Shipment ${trackingCode.toUpperCase()}: Processed at logistics hub. Estimated delivery tomorrow before 16:00.`
      );
    }
  };

  // Render SITEMAP (Directory of 50+ pages)
  if (pageType === 'sitemap') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="pb-6 sm:pb-8 border-b border-black/10 mb-8 sm:mb-12">
            <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
              ARKISTON RAKENNE
            </span>
            <h1 className="font-editorial text-3xl sm:text-5xl font-normal">
              {language === 'fi' ? 'Sivukartta & Kaikki 50+ Sivua' : 'Site Directory & All 50+ Pages'}
            </h1>
            <p className="text-xs sm:text-sm font-sans text-black/60 mt-2 sm:mt-3 leading-relaxed">
              {language === 'fi'
                ? 'Kokoelmamme sisältää 24 numeroitua teossivua, kategoriasivut, kausistudiot, esseet, vastuullisuusraportit ja asiakaspalvelun.'
                : 'Our digital archive houses 24 dedicated product dossier pages, category hubs, seasonal archives, essays, and house charters.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 font-mono text-xs">
            {/* Products (24 pages) */}
            <div>
              <h3 className="font-editorial text-xl font-normal mb-3 sm:mb-4 border-b border-black/20 pb-2">
                01. Tuotesivut (24 teosta)
              </h3>
              <ul className="space-y-2">
                {ARCHIVE_PRODUCTS.map((prod) => (
                  <li key={prod.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate({ type: 'product', productId: prod.id })}
                      className="hover:underline text-black/70 hover:text-black flex items-center justify-between w-full text-left cursor-pointer"
                    >
                      <span className="truncate pr-2">{prod.plateNumber} · {prod.name[language]}</span>
                      <span className="text-black/40 shrink-0">{formatPrice(prod.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories & Collections (16+ pages) */}
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h3 className="font-editorial text-xl font-normal mb-3 sm:mb-4 border-b border-black/20 pb-2">
                  02. Kategoriat & Kokoelmat
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'naiset' })} className="hover:underline cursor-pointer">
                      /category/naiset (Kaikki naisten vaatteet)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'miehet' })} className="hover:underline cursor-pointer">
                      /category/miehet (Kaikki miesten vaatteet)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'asusteet' })} className="hover:underline cursor-pointer">
                      /category/asusteet (Pipot, Huivit, Vyöt, Laukut)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat' })} className="hover:underline cursor-pointer">
                      /category/kokoelmat (Kaikki kokoelmat)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat', subcategory: 'Talvi 2026' })} className="hover:underline cursor-pointer">
                      /collections/talvi-2026 (Talviarkisto)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'archive', category: 'kokoelmat', subcategory: 'Perusvaatteet' })} className="hover:underline cursor-pointer">
                      /collections/perusvaatteet (Essentials)
                    </button>
                  </li>
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'lookbook' })} className="hover:underline cursor-pointer">
                      /lookbook (Kausittainen Lookbook)
                    </button>
                  </li>
                </ul>
              </div>

              {/* Journal & Stories (4 pages) */}
              <div>
                <h3 className="font-editorial text-xl font-normal mb-3 sm:mb-4 border-b border-black/20 pb-2">
                  03. Journal & Esseet
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li>
                    <button type="button" onClick={() => onNavigate({ type: 'journal' })} className="hover:underline cursor-pointer">
                      /journal (Pääjournal)
                    </button>
                  </li>
                  {JOURNAL_ARTICLES.map((art) => (
                    <li key={art.slug}>
                      <button type="button" onClick={() => onNavigate({ type: 'journal', articleSlug: art.slug })} className="hover:underline cursor-pointer truncate max-w-full block">
                        /journal/{art.slug} ({art.title[language]})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* About, Service & Legal (11 pages) */}
              <div>
                <h3 className="font-editorial text-xl font-normal mb-3 sm:mb-4 border-b border-black/20 pb-2">
                  04. Yritys, Asiakaspalvelu & Lakitiedot
                </h3>
                <ul className="space-y-2 text-black/70">
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'philosophy' })} className="hover:underline cursor-pointer">/about/philosophy (Filosofia ja sisu)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'materials' })} className="hover:underline cursor-pointer">/about/materials (Materiaalit)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'sustainability' })} className="hover:underline cursor-pointer">/about/sustainability (Vastuullisuus)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'about', slug: 'workshops' })} className="hover:underline cursor-pointer">/about/workshops (Työhuoneet)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'contact' })} className="hover:underline cursor-pointer">/service/contact (Asiakaspalvelu)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'shipping-returns' })} className="hover:underline cursor-pointer">/service/shipping-returns (Toimitusehdot)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'tracking' })} className="hover:underline cursor-pointer">/service/tracking (Tilausseuranta)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'service', slug: 'size-guide' })} className="hover:underline cursor-pointer">/service/size-guide (Koko-opas)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'terms' })} className="hover:underline cursor-pointer">/legal/terms (Tilaus- ja toimitusehdot)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'privacy' })} className="hover:underline cursor-pointer">/legal/privacy (GDPR Tietosuoja)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'legal', slug: 'cookies' })} className="hover:underline cursor-pointer">/legal/cookies (Evästeasetukset)</button></li>
                  <li><button type="button" onClick={() => onNavigate({ type: 'gift-cards' })} className="hover:underline cursor-pointer">/gift-cards (Lahjakortit)</button></li>
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
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-20">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-16">
          <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
            TALVIKAMPANJA 2026
          </span>
          <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal mb-3 sm:mb-4">
            {language === 'fi' ? 'Talven Valo ja Hiljaisuus' : 'Winter Light and Silence'}
          </h1>
          <p className="text-xs sm:text-sm font-sans text-black/60 max-w-lg mx-auto leading-relaxed">
            {language === 'fi'
              ? 'Puhdas studiokampanja valkoisella taustalla. Veistokselliset siluetit ja kankaan aito paino.'
              : 'Pure studio campaign on white backdrop. Sculptural silhouettes and the authentic weight of unblended virgin wool.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
          {ARCHIVE_PRODUCTS.slice(0, 8).map((product) => (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="group cursor-pointer"
            >
              <div className="aspect-[3/4] border border-black/10 overflow-hidden bg-white mb-3 sm:mb-4">
                <FashionImage
                  product={product}
                  src={product.hoverImage || product.image}
                  alt={product.name[language]}
                  position={product.cropVariation.onModel.position}
                  scale={product.cropVariation.onModel.scale}
                  aspectRatio="auto"
                  className="w-full h-full"
                  imageClassName="group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="flex items-baseline justify-between font-mono text-xs">
                <div>
                  <span className="text-black/40 mr-2">{product.plateNumber}</span>
                  <span className="font-medium text-black group-hover:underline">{product.name[language]}</span>
                </div>
                <span>{formatPrice(product.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render GIFT CARDS PAGE
  if (pageType === 'gift-cards') {
    return (
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-24 min-h-screen pt-20">
        <div className="max-w-xl mx-auto border border-black p-6 sm:p-12">
          <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
            ARKISTOLAHJAKORTTI
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal mb-3 sm:mb-4">
            {language === 'fi' ? 'Digitaalinen Lahjakortti' : 'Digital Gift Card'}
          </h1>
          <p className="text-xs font-sans text-black/70 mb-6 sm:mb-8 leading-relaxed">
            {language === 'fi'
              ? 'Anna lahjaksi aikaa kestävää pohjoismaista laatua. Lahjakortti toimitetaan sähköpostitse tyylikkäänä koodina.'
              : 'Gift enduring Nordic craftsmanship. Delivered digitally with an exclusive accession gift certificate code.'}
          </p>

          {!giftSubmitted ? (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-black/60 mb-2">
                  Valitse summa:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  {[100, 150, 250, 500].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setGiftAmount(amt)}
                      className={`py-2.5 sm:py-3 border cursor-pointer ${
                        giftAmount === amt
                          ? 'border-black bg-black text-white font-medium'
                          : 'border-black/20 hover:border-black'
                      }`}
                    >
                      {amt} €
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-black/60 mb-1">
                  Vastaanottajan sähköposti:
                </label>
                <input
                  type="email"
                  required
                  value={giftRecipient}
                  onChange={(e) => setGiftRecipient(e.target.value)}
                  placeholder="vastaanottaja@osoite.fi"
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => giftRecipient && setGiftSubmitted(true)}
                className="w-full py-3.5 sm:py-4 btn-primary text-xs uppercase tracking-[0.2em] font-medium cursor-pointer"
              >
                {language === 'fi' ? `Tilaa lahjakortti (${giftAmount},00 €)` : `Order Gift Card (€${giftAmount}.00)`}
              </button>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <Check className="w-8 h-8 mx-auto" />
              <p className="text-xs font-mono">
                {language === 'fi' ? `Lahjakortti ${giftAmount} € lähetetty osoitteeseen ${giftRecipient}.` : `Gift card (€${giftAmount}) dispatched to ${giftRecipient}.`}
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
        <div className="max-w-xl mx-auto border border-black p-6 sm:p-12">
          <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
            LÄHETYKSEN SEURANTA
          </span>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal mb-3 sm:mb-4">
            {language === 'fi' ? 'Seuraa Tilaustasi' : 'Track Your Shipment'}
          </h1>
          <p className="text-xs font-sans text-black/70 mb-6 sm:mb-8 leading-relaxed">
            {language === 'fi'
              ? 'Syötä tilausvahvistuksessa saamasi Postin tai Matkahuollon seurantatunnus (esim. JJFI6123456789).'
              : 'Enter your parcel tracking reference provided in your dispatch notification.'}
          </p>

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="JJFI..."
                className="w-full px-4 py-3 text-xs font-mono border border-black/20 focus:border-black focus:outline-none uppercase"
              />
            </div>
            <button type="submit" className="w-full py-3.5 btn-primary text-xs uppercase tracking-[0.18em] cursor-pointer">
              {language === 'fi' ? 'Hae tiedot' : 'Search Status'}
            </button>
          </form>

          {trackingResult && (
            <div className="mt-6 sm:mt-8 p-4 border-l-2 border-black bg-black/5 font-mono text-xs leading-relaxed">
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
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          YRITYKSEN FILOSOFIA
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-normal mb-6 sm:mb-8">
          {language === 'fi' ? 'Filosofia ja Sisu' : 'Philosophy and Sisu'}
        </h1>
        <div className="space-y-4 sm:space-y-6 text-xs sm:text-base font-sans text-black/80 leading-relaxed">
          <p>
            {language === 'fi'
              ? 'Zejesh syntyi vastareaktiona pikamuodin ylituotannolle ja keinotekoisille elastisille kankaille. Uskomme, että todellinen luksus ei synny koristeista tai brändilogoista, vaan vaatteiden mittasuhteista, kankaan omasta ryhdistä ja poikkeuksellisesta mukavuudesta ilman muovia.'
              : 'Zejesh was established in opposition to seasonal surplus and synthetic elasticity. We believe genuine luxury derives not from excessive decoration, but from disciplined proportions, the innate stance of natural weaves, and uncompromised comfort without petrochemical shortcuts.'}
          </p>
          <div className="p-4 sm:p-6 border-l-2 border-black bg-black/5 my-4 sm:my-6">
            <p className="font-editorial text-lg sm:text-xl italic text-black">
              "Hiljaisuus, tila ja materiaalin rehellisyys. Jokaisella leikkauksella on syy olla olemassa."
            </p>
          </div>
          <p>
            {language === 'fi'
              ? 'Kun Finn astuu Zejesh-maailmaan, kokemuksen tulee tuntua hiljaiselta, eksklusiiviselta ja merkitykselliseltä. Emme jahtaa trendejä, vaan valmistamme vaatteita jotka näyttävät yhtä raikkailta 20 vuoden kuluttua.'
              : 'When a Finn lands here it must feel quiet, exclusive, and meaningful. We do not chase fashion weeks; we execute enduring works that remain pristine decades ahead.'}
          </p>
        </div>
      </div>
    );
  }

  // Render MATERIALS
  if (slug === 'materials') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          KÄSITYÖ JA LAATU
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-normal mb-6 sm:mb-8">
          {language === 'fi' ? 'Materiaalien Rehellisyys' : 'Honesty of Material'}
        </h1>
        <div className="space-y-4 sm:space-y-6 text-xs sm:text-base font-sans text-black/80 leading-relaxed">
          <p>
            {language === 'fi'
              ? 'Käytämme ainoastaan 100% monomateriaaleja: sertifioitua pohjoista merinovillaa, italialaista neitseellistä villaa, portugalilaista raskasta luomupuuvillaa ja perinteistä pellavaa. Emme koskaan sekoita villaan polyesteriä tai polyamidia.'
              : 'We employ strictly 100% mono-materials: certified northern merino, dense Italian virgin wool, heavy Portuguese organic cotton, and heritage European flax. We never compromise wool with polyester or polyamide.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-4 sm:my-6 font-mono text-xs">
            <div className="p-4 border border-black/10">
              <span className="font-medium block mb-1">Neitseellinen villa</span>
              <span className="text-black/60">Biella & Yorkshire · 680–750g/m²</span>
            </div>
            <div className="p-4 border border-black/10">
              <span className="font-medium block mb-1">Merinovilla 19.5µm</span>
              <span className="text-black/60">Kehrätty Suomessa · Kutiamaton</span>
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
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          KIERTOTALOUS
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-normal mb-6 sm:mb-8">
          {language === 'fi' ? 'Vastuullisuus ja Korjaustakuu' : 'Circularity & Lifetime Repair'}
        </h1>
        <div className="space-y-4 sm:space-y-6 text-xs sm:text-base font-sans text-black/80 leading-relaxed">
          <p>
            {language === 'fi'
              ? 'Valmistamme vaatteita rajoitetuissa erissä ilman ylituotantoa. Lisäksi tarjoamme kaikille Zejesh-päällystakeille ja neuleille maksuttoman elinikäisen korjausompelun työhuoneellamme Helsingissä.'
              : 'We operate strictly in limited batch releases with zero surplus. Furthermore, all Zejesh archive coats and knitwear include complimentary restorative lifetime stitching in our Helsinki atelier.'}
          </p>
        </div>
      </div>
    );
  }

  // Render WORKSHOPS
  if (slug === 'workshops') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          TUOTANTO
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-normal mb-6 sm:mb-8">
          {language === 'fi' ? 'Työhuoneet: Helsinki & Porto' : 'Ateliers: Helsinki & Porto'}
        </h1>
        <p className="text-xs sm:text-base font-sans text-black/80 leading-relaxed">
          {language === 'fi'
            ? 'Kaavoitus ja viimeistely tapahtuvat työhuoneellamme Helsingin Punavuoressa. Raskaan räätälöinnin ja neulonnan teemme perinteikkäässä perheyrityksessä Portossa, Portugalissa.'
            : 'Pattern drafting and artisanal finishing take place in our Punavuori studio in Helsinki. Tailored overcoats and heavy jerseys are executed with our heritage family workshop in Porto, Portugal.'}
        </p>
      </div>
    );
  }

  // Render CONTACT & CUSTOMER SERVICE
  if (slug === 'contact') {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          ASIAKASPALVELU
        </span>
        <h1 className="font-editorial text-3xl sm:text-5xl font-normal mb-4 sm:mb-6">
          {language === 'fi' ? 'Ota Yhteyttä' : 'Contact House'}
        </h1>
        <div className="border border-black p-5 sm:p-6 space-y-3 font-mono text-xs">
          <p><strong>Sähköposti:</strong> asiakaspalvelu@zejesh.fi</p>
          <p><strong>Puhelin:</strong> +358 (0)9 4245 8920</p>
          <p><strong>Aukioloaika:</strong> Ma–Pe 10:00 – 18:00 (EET)</p>
          <p><strong>Työhuone:</strong> Pursimiehenkatu 12, 00150 Helsinki</p>
        </div>
      </div>
    );
  }

  // Render SHIPPING & RETURNS
  if (slug === 'shipping-returns') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
        <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
          TOIMITUSEHDOT
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-normal mb-6 sm:mb-8">
          {language === 'fi' ? 'Toimitus ja Palautukset' : 'Shipping and Returns'}
        </h1>
        <div className="space-y-4 sm:space-y-6 text-xs sm:text-sm font-sans text-black/80 leading-relaxed">
          <div className="p-4 border border-black/10">
            <h4 className="font-mono font-medium mb-1 uppercase">Ilmainen toimitus yli 100 €</h4>
            <p className="text-black/70">Toimitamme tilaukset Postin ja Matkahuollon noutopisteisiin 1–3 arkipäivässä.</p>
          </div>
          <div className="p-4 border border-black/10">
            <h4 className="font-mono font-medium mb-1 uppercase">14 Päivän Maksuton Palautus</h4>
            <p className="text-black/70">Kaikilla tuotteilla on täysi 14 vuorokauden palautusoikeus. Mukana toimitetaan valmis palautusrahtikirja.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render TERMS, PRIVACY, COOKIES
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 min-h-screen pt-20">
      <span className="font-mono text-xs tracking-[0.24em] uppercase text-black/40 block mb-2">
        LAKITIEDOT & EHDOT
      </span>
      <h1 className="font-editorial text-3xl sm:text-5xl font-normal mb-6 sm:mb-8">
        {slug === 'terms' ? 'Tilaus- ja Toimitusehdot' : slug === 'privacy' ? 'Tietosuojaseloste (GDPR)' : 'Evästekäytäntö'}
      </h1>
      <div className="space-y-4 text-xs sm:text-sm font-sans text-black/80 leading-relaxed font-mono">
        <p>Zejesh Clothes Oy · Y-tunnus: 3291823-9 · Helsinki, Suomi</p>
        <p>Kaikki hinnat sisältävät Suomen arvonlisäveron (ALV 24 %). Kuluttajalla on Suomen kuluttajansuojalain mukainen 14 päivän palautusoikeus.</p>
        <p>Käsittelemme henkilötietoja ainoastaan tilausten toimittamista varten emmekä koskaan luovuta tietoja kolmansille osapuolille markkinointitarkoituksiin.</p>
      </div>
    </div>
  );
};
