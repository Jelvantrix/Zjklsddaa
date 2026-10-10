import React from 'react';
import { Language, StoreSettings } from '../types';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onSelectCategory: (cat: string, sub?: string) => void;
  onNavigatePage: (route: any) => void;
  settings?: StoreSettings;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onNavigatePage,
}) => {
  return (
    <footer className="w-full bg-white text-black py-20 px-6 select-none">
      <div className="max-w-[1720px] mx-auto space-y-16">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <BrandLogo size="lg" />
          <span className="text-small text-black/40">
            Helsinki · Porto
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-left">
          <div className="space-y-3">
            <span className="text-small text-black/40 block">
              Service
            </span>
            <ul className="space-y-2 text-body">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'service', slug: 'contact' })}
                  className="hover:underline cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'auth' })}
                  className="hover:underline cursor-pointer"
                >
                  Account
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-small text-black/40 block">
              Orders
            </span>
            <ul className="space-y-2 text-body">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'service', slug: 'shipping-returns' })}
                  className="hover:underline cursor-pointer"
                >
                  Shipping
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'service', slug: 'tracking' })}
                  className="hover:underline cursor-pointer"
                >
                  Tracking
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-small text-black/40 block">
              Collections
            </span>
            <ul className="space-y-2 text-body">
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('naiset')}
                  className="hover:underline cursor-pointer"
                >
                  Women
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onSelectCategory('miehet')}
                  className="hover:underline cursor-pointer"
                >
                  Men
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-small text-black/40 block">
              Legal
            </span>
            <ul className="space-y-2 text-body">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'legal', slug: 'terms' })}
                  className="hover:underline cursor-pointer"
                >
                  Terms
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigatePage({ type: 'legal', slug: 'privacy' })}
                  className="hover:underline cursor-pointer"
                >
                  Privacy
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-8">
          <span className="text-small text-black/30">
            © {new Date().getFullYear()} ZEJESH. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};
