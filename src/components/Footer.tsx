import React, { useState } from 'react';
import { Language, StoreSettings, translations } from '../types';
import { BrandLogo } from './BrandLogo';
import { PaymentIcons } from './PaymentIcons';
import { ArrowRight, Check } from 'lucide-react';
import { joinWaitlist } from '../supabase/dbService';

interface FooterProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigatePage: (route: any) => void;
  settings?: StoreSettings;
}

export const Footer: React.FC<FooterProps> = ({
  language,
  onSetLanguage,
  onSelectCategory,
  onNavigatePage,
  settings,
}) => {
  const t = (translations[language] as any)?.footer || (translations.en as any)?.footer || {};
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail && newsletterEmail.includes('@')) {
      joinWaitlist(newsletterEmail, 'client_register', 'global_footer').catch(() => {});
      setSubscribed(true);
    }
  };

  return (
    <footer className="w-full bg-[#FFFFFF] text-[#000000] border-t border-black/[0.06] select-none pb-8 lg:pb-0 relative">
      {/* Top Section: Large Exact Brand Logo */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-20 border-b border-black/[0.06] flex flex-col items-center justify-center text-center relative">
        {/* Subtle radial glow behind logo for depth */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,black,transparent_50%)]" />
        <BrandLogo size="lg" />
        <span className="mt-3 sm:mt-4 font-mono text-[9.5px] sm:text-[10.5px] tracking-[0.25em] sm:tracking-[0.3em] uppercase text-black/40 relative">
          HELSINKI · PORTO · EST. 2026
        </span>
      </div>

      {/* Middle Section: Links Grid (1 col on mobile, 2 on sm, 3 on md, 6 on lg) */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-12 sm:py-16 md:py-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 sm:gap-10">
        {/* Col 1: Asiakaspalvelu */}
        <div className="space-y-3 sm:space-y-4">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.service}
          </h4>
          <p className="text-xs font-sans text-black/70 whitespace-pre-line leading-relaxed">
            {t.serviceDesc}
          </p>
          <div className="pt-1 sm:pt-2 flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={() => onNavigatePage({ type: 'auth' })}
              className="text-xs font-mono uppercase tracking-wider text-black underline underline-offset-4 hover:opacity-70 cursor-pointer"
            >
              Patron Account & Portal →
            </button>
            <button
              type="button"
              onClick={() => onNavigatePage({ type: 'service', slug: 'contact' })}
              className="text-xs font-mono text-black/70 underline underline-offset-4 hover:opacity-100 cursor-pointer"
            >
              Contact House
            </button>
          </div>
        </div>

        {/* Col 2: Toimitus ja palautukset */}
        <div className="space-y-2.5 sm:space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.shippingAndReturns}
          </h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs font-sans text-black/70">
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'service', slug: 'shipping-returns' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.shipping1}
              </button>
            </li>
            <li>{t.shipping2}</li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'service', slug: 'shipping-returns' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.shipping3}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'service', slug: 'tracking' })}
                className="hover:underline underline-offset-4 font-medium cursor-pointer text-left"
              >
                {t.shipping4}
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Kokoelmat */}
        <div className="space-y-2.5 sm:space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.collections}
          </h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs font-sans text-black/70">
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory('kokoelmat', 'Talvi 2026')}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.colWinter}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory('kokoelmat', 'Kevät')}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.colSpring}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onSelectCategory('kokoelmat', 'Perusvaatteet')}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.colEssentials}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'gift-cards' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.colGiftCards}
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Yritys */}
        <div className="space-y-2.5 sm:space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.company}
          </h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs font-sans text-black/70">
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'about', slug: 'philosophy' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.aboutUs}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'about', slug: 'materials' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.materials}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'about', slug: 'sustainability' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.sustainability}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'about', slug: 'workshops' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.workshops}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'story' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left font-medium text-black"
              >
                The Zejesh Story
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'vote' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left font-medium text-black"
              >
                Community Vote & Design
              </button>
            </li>
          </ul>
        </div>

        {/* Col 5: Lakitiedot & Sivukartta */}
        <div className="space-y-2.5 sm:space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.legal}
          </h4>
          <ul className="space-y-1.5 sm:space-y-2 text-xs font-sans text-black/70">
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'legal', slug: 'terms' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.terms}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'legal', slug: 'privacy' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.privacy}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'legal', slug: 'cookies' })}
                className="hover:underline underline-offset-4 cursor-pointer text-left"
              >
                {t.cookies}
              </button>
            </li>
            <li className="pt-2">
              <button
                type="button"
                onClick={() => onNavigatePage({ type: 'sitemap' })}
                className="font-mono text-xs text-black underline underline-offset-4 font-medium cursor-pointer text-left"
              >
                {translations[language].sitemap}
              </button>
            </li>
          </ul>
        </div>

        {/* Col 6: Uutiskirje & Sosiaalinen media */}
        <div className="space-y-3 sm:space-y-4">
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-black/40">
            {t.newsletter}
          </h4>
          <p className="text-xs font-sans text-black/70 leading-relaxed">
            {t.newsletterDesc}
          </p>

          {!subscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 text-xs font-mono border border-black/20 focus:border-black focus:outline-none placeholder:text-black/30"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-black hover:opacity-60 cursor-pointer"
                  aria-label={t.subscribe}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-black">
              <Check className="w-4 h-4" />
              <span>Subscribed. You are on the private register.</span>
            </div>
          )}

          {/* Social Links & Platforms */}
          <div className="pt-2 sm:pt-4 border-t border-black/10">
            <span className="text-[10px] font-mono tracking-wider uppercase text-black/40 block mb-1.5 sm:mb-2">
              CONNECTED PLATFORMS
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
              {settings?.storeInfo?.platforms && settings.storeInfo.platforms.filter((p) => p.enabled !== false).length > 0 ? (
                settings.storeInfo.platforms
                  .filter((p) => p.enabled !== false)
                  .map((plat, pIdx, arr) => (
                    <React.Fragment key={plat.id || plat.name}>
                      <a
                        href={plat.url || '#'}
                        target={plat.url && plat.url.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="hover:underline underline-offset-4 uppercase font-medium"
                        onClick={(e) => {
                          if (!plat.url || plat.url === '#') e.preventDefault();
                        }}
                      >
                        {plat.handle ? `${plat.name} (${plat.handle})` : plat.name}
                      </a>
                      {pIdx < arr.length - 1 && <span className="text-black/20">/</span>}
                    </React.Fragment>
                  ))
              ) : (
                <>
                  <a href="#instagram" className="hover:underline underline-offset-4" onClick={(e) => e.preventDefault()}>IG</a>
                  <span className="text-black/20">/</span>
                  <a href="#pinterest" className="hover:underline underline-offset-4" onClick={(e) => e.preventDefault()}>PIN</a>
                  <span className="text-black/20">/</span>
                  <a href="#tiktok" className="hover:underline underline-offset-4" onClick={(e) => e.preventDefault()}>TT</a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Payment Icons, Location, Copyright */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 border-t border-black/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
        {/* Payment Icons */}
        <div className="flex items-center w-full md:w-auto justify-center md:justify-start">
          <PaymentIcons />
        </div>

        {/* Origin Badge */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-black/60">
          <span>WORLDWIDE · EUR (€)</span>
          <span>·</span>
          <span>HELSINKI & PORTO ATELIERS</span>
        </div>

        {/* Copyright */}
        <div className="text-[11px] sm:text-xs font-mono text-black/50 text-center md:text-right flex items-center justify-center md:justify-end">
          <span>© 2026 ZEJESH. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
