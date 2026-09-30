import React, { useState } from 'react';
import { PLACEHOLDER_IMG } from '../data/mockData';
import { Product } from '../types';

interface FashionImageProps {
  src?: string;
  product?: Product;
  isHover?: boolean;
  alt: string;
  aspectRatio?: '3/4' | '4/5' | '1/1' | '16/9' | 'auto';
  position?: string;
  scale?: number;
  flipped?: boolean;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  enableMultiply?: boolean;
  onHoverZoom?: boolean;
  onClick?: () => void;
}

export const FashionImage: React.FC<FashionImageProps> = ({
  src,
  product,
  isHover = false,
  alt,
  aspectRatio = '3/4',
  position = 'center 30%',
  scale = 1,
  flipped = false,
  className = '',
  imageClassName = '',
  priority = false,
  enableMultiply = true,
  onHoverZoom = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const resolvedSrc =
    src ||
    (isHover ? product?.hoverImage || product?.image : product?.image) ||
    product?.images?.[0]?.url ||
    PLACEHOLDER_IMG;

  const aspectClasses = {
    '3/4': 'aspect-[3/4]',
    '4/5': 'aspect-[4/5]',
    '1/1': 'aspect-square',
    '16/9': 'aspect-[16/9]',
    'auto': '',
  };

  // High-fashion minimalist vector fallback if external asset fails to load
  const fallbackSVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1066" viewBox="0 0 800 1066" fill="%23FFFFFF"><rect width="800" height="1066" fill="%23FFFFFF"/><path d="M400,200 C370,200 350,225 350,260 C350,295 370,320 400,320 C430,320 450,295 450,260 C450,225 430,200 400,200 Z M330,340 L470,340 L530,520 L480,535 L450,420 L460,880 L420,880 L410,640 L390,640 L380,880 L340,880 L350,420 L320,535 L270,520 Z" fill="%23000000" opacity="0.88"/><text x="400" y="960" font-family="sans-serif" font-size="12" letter-spacing="0.3em" fill="%23000000" opacity="0.4" text-anchor="middle">ZEJESH ARCHIVE</text></svg>`;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-[#FFFFFF] ${aspectClasses[aspectRatio]} ${className}`}
    >
      <img
        src={hasError ? fallbackSVG : resolvedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          objectPosition: position,
          transform: `${flipped ? 'scaleX(-1)' : ''} scale(${scale})`,
        }}
        className={`w-full h-full object-cover transition-transform duration-700 ease-out ${
          enableMultiply ? 'mix-blend-multiply' : ''
        } ${onHoverZoom ? 'group-hover:scale-[1.05]' : ''} ${
          isLoaded ? 'opacity-100' : 'opacity-80'
        } ${imageClassName}`}
      />
    </div>
  );
};
