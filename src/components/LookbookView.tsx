import React, { useState } from 'react';
import { Product, Language } from '../types';
import { FashionImage } from './FashionImage';
import { formatPrice } from '../data/mockData';
import {
  ArrowLeft,
  Grid,
  Columns,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShoppingBag,
} from 'lucide-react';

interface LookbookViewProps {
  products: Product[];
  language: Language;
  onBackToHome: () => void;
  onSelectProduct: (p: Product) => void;
}

export const LookbookView: React.FC<LookbookViewProps> = ({
  products,
  language,
  onBackToHome,
  onSelectProduct,
}) => {
  const [layoutMode, setLayoutMode] = useState<'spread' | 'grid'>('spread');

  // Curate dedicated looks from live products (up to 16)
  const looks = (products && products.length > 0 ? products : []).slice(0, 16);

  return (
    <div className="w-full bg-[#FFFFFF] text-[#000000] min-h-screen pt-20 sm:pt-24 select-none font-mono">
      {/* Top Bar with Navigation & Layout Switcher - Fully Responsive */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-4 sm:py-5 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center gap-2 text-black/60 hover:text-black transition-colors cursor-pointer uppercase tracking-wider shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>

        {/* Layout Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-[10px] text-black/40 uppercase tracking-widest hidden md:inline">
            Viewing Mode:
          </span>
          <div className="flex items-center border border-black/15">
            <button
              type="button"
              onClick={() => setLayoutMode('spread')}
              className={`px-3 py-1.5 text-[10.5px] sm:text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
                layoutMode === 'spread'
                  ? 'bg-black text-white font-semibold'
                  : 'text-black/60 hover:text-black bg-white'
              }`}
            >
              Editorial Spread
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('grid')}
              className={`px-3 py-1.5 text-[10.5px] sm:text-[11px] uppercase tracking-wider cursor-pointer transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-black text-white font-semibold'
                  : 'text-black/60 hover:text-black bg-white'
              }`}
            >
              Look Grid
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16 md:py-20 text-center">
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase text-black/40 block mb-2 sm:mb-3">
          WINTER SOLSTICE 2026
        </span>
        <h1 className="font-editorial text-3xl sm:text-5xl md:text-7xl font-normal text-black tracking-tight mb-3 sm:mb-4">
          Winter Light and Silence
        </h1>
        <p className="text-xs sm:text-sm font-sans text-black/60 max-w-xl mx-auto leading-relaxed font-light px-2">
          Sculptural monolithic silhouettes photographed against a pure white studio horizon. Restraint, unblended wool, and permanence.
        </p>
      </div>

      {/* EMPTY STATE IF NO PRODUCTS AVAILABLE */}
      {looks.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-20 px-4">
          <p className="text-xs uppercase tracking-widest text-black/50 mb-4">
            Lookbook Issue in Curation
          </p>
          <p className="text-sm font-sans text-black/70 mb-6">
            The atelier is preparing the latest lookbook series. Explore our permanent catalogue in the meantime.
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-mono cursor-pointer hover:bg-neutral-800"
          >
            Explore Storefront
          </button>
        </div>
      ) : layoutMode === 'spread' ? (
        /* SPREAD VIEW: High-fashion paired responsive layout */
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 pb-20 sm:pb-32 space-y-16 sm:space-y-28">
          {looks.map((product, idx) => {
            const isEven = idx % 2 === 0;
            const lookNumber = (idx + 1).toString().padStart(2, '0');

            return (
              <div
                key={product.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 md:gap-16 items-center border-t border-black/[0.08] pt-10 sm:pt-16"
              >
                {/* Image Column */}
                <div
                  className={`w-full ${
                    isEven ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7 lg:order-2'
                  }`}
                >
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="w-full aspect-[3/4] sm:aspect-[4/5] max-h-[75vh] border border-black/10 overflow-hidden bg-neutral-100 relative group cursor-pointer"
                  >
                    <FashionImage
                      product={product}
                      src={product.hoverImage || product.image}
                      alt={product.name?.en || product.name?.fi || 'Look'}
                      position={product.imagePosition || product.cropVariation?.onModel?.position || 'center 20%'}
                      scale={product.imageScale || product.cropVariation?.onModel?.scale || 1.05}
                      aspectRatio="auto"
                      className="w-full h-full"
                      imageClassName="group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Corner Tag */}
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[9.5px] sm:text-[10px] font-mono border border-black/10">
                      LOOK {lookNumber} · {product.plateNumber || product.nr || `№ ${lookNumber}`}
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
                      <span className="bg-white text-black px-4 py-2 text-xs uppercase tracking-widest font-mono shadow-md">
                        Inspect Look →
                      </span>
                    </div>
                  </div>
                </div>

                {/* Editorial Narrative Column */}
                <div
                  className={`w-full space-y-4 sm:space-y-6 ${
                    isEven ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5 lg:order-1'
                  }`}
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2 text-[10px] sm:text-[10.5px] uppercase tracking-wider text-black/40">
                      <span>Look {lookNumber}</span>
                      <span>·</span>
                      <span>Accession {product.plateNumber || product.nr || `№ ${lookNumber}`}</span>
                    </div>
                    <h2 className="font-editorial text-2xl sm:text-4xl md:text-5xl font-normal text-black leading-tight">
                      {product.name?.en || product.name?.fi}
                    </h2>
                    <div className="text-xs sm:text-sm font-mono text-black font-semibold pt-1">
                      {formatPrice(product.price)}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-sans text-black/70 leading-relaxed font-light max-w-md">
                    {product.description?.en || product.description?.fi}
                  </p>

                  <div className="pt-2 border-t border-black/10 space-y-2 text-xs text-black/60 font-mono">
                    <div className="flex justify-between py-1 border-b border-black/[0.04]">
                      <span className="text-black/40 uppercase">Fabrication</span>
                      <span className="text-black font-medium text-right truncate max-w-[200px]">
                        {product.material?.en || product.material?.fi || '100% Pure Virgin Wool'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-black/[0.04]">
                      <span className="text-black/40 uppercase">Provenance</span>
                      <span className="text-black text-right truncate max-w-[200px]">
                        {product.origin?.en || product.origin?.fi || 'Woven in Finland'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-black/40 uppercase">Model Specification</span>
                      <span>178 cm · Wearing Size S</span>
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="w-full sm:w-auto px-6 py-3 border border-black text-black hover:bg-black hover:text-white transition-colors text-xs uppercase tracking-[0.2em] font-mono cursor-pointer text-center"
                    >
                      View Piece Dossier
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GRID VIEW: Responsive 1, 2, 3 column look catalog */
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 pb-20 sm:pb-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {looks.map((product, idx) => {
              const lookNumber = (idx + 1).toString().padStart(2, '0');
              return (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="group cursor-pointer space-y-3"
                >
                  <div className="w-full aspect-[3/4] border border-black/10 overflow-hidden bg-neutral-100 relative">
                    <FashionImage
                      product={product}
                      src={product.hoverImage || product.image}
                      alt={product.name?.en || product.name?.fi || 'Look'}
                      position={product.imagePosition || product.cropVariation?.onModel?.position || 'center 20%'}
                      scale={product.imageScale || product.cropVariation?.onModel?.scale || 1.05}
                      aspectRatio="auto"
                      className="w-full h-full"
                      imageClassName="group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-white/95 px-2 py-0.5 text-[9.5px] font-mono border border-black/10">
                      LOOK {lookNumber}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between text-xs gap-2">
                    <div className="truncate">
                      <span className="text-black/40 mr-1.5">{product.plateNumber || product.nr || `№ ${lookNumber}`}</span>
                      <span className="font-medium text-black group-hover:underline">
                        {product.name?.en || product.name?.fi}
                      </span>
                    </div>
                    <span className="font-semibold text-black shrink-0">{formatPrice(product.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
