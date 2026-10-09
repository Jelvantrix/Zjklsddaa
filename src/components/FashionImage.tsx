import React, { useState } from 'react';
import { Product, ImageFramingParams, NEUTRAL_PLACEHOLDER_IMG } from '../types';

export interface FashionImageProps {
  src?: string;
  product?: Product;
  framing?: ImageFramingParams;
  placement?: 'card' | 'archive' | 'productPage' | 'heroDesktop' | 'heroMobile' | 'og';
  isHover?: boolean;
  alt: string;
  aspectRatio?: '3/4' | '4/5' | '1/1' | '16/9' | '9/16' | 'auto';
  position?: string;
  scale?: number;
  rotation?: number;
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
  framing,
  placement = 'card',
  isHover = false,
  alt,
  aspectRatio = '3/4',
  position,
  scale,
  rotation,
  flipped,
  className = '',
  imageClassName = '',
  priority = false,
  enableMultiply = true,
  onHoverZoom = false,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Resolve source image URL
  const resolvedSrc =
    src ||
    (isHover ? product?.hoverImage || product?.image : product?.image) ||
    product?.images?.[0]?.url ||
    NEUTRAL_PLACEHOLDER_IMG;

  // 2. Resolve framing parameters (with per-placement override support)
  const productFraming = (product as any)?.framing as ImageFramingParams | undefined;
  const activeFraming = framing || productFraming;
  const placementOverride = activeFraming?.overrides?.[placement];

  const focalX = placementOverride?.focalX ?? activeFraming?.focalX ?? (isHover ? undefined : (product as any)?.focalX);
  const focalY = placementOverride?.focalY ?? activeFraming?.focalY ?? (isHover ? undefined : (product as any)?.focalY);
  const zoom = placementOverride?.zoom ?? activeFraming?.zoom ?? scale ?? ((product as any)?.imageScale || 1.0);
  const rot = placementOverride?.rotation ?? activeFraming?.rotation ?? rotation ?? ((isHover ? (product as any)?.hoverImageRotation : (product as any)?.imageRotation) || 0);
  const flipH = placementOverride?.flipH ?? activeFraming?.flipH ?? flipped ?? false;
  const flipV = placementOverride?.flipV ?? activeFraming?.flipV ?? false;

  const resolvedPosition =
    position ||
    (focalX !== undefined && focalY !== undefined ? `${focalX}% ${focalY}%` : undefined) ||
    (isHover ? product?.hoverImagePosition : product?.imagePosition) ||
    product?.cropVariation?.onModel?.position ||
    '50% 50%';

  const aspectClasses: Record<string, string> = {
    '3/4': 'aspect-[3/4]',
    '4/5': 'aspect-[4/5]',
    '1/1': 'aspect-square',
    '16/9': 'aspect-[16/9]',
    '9/16': 'aspect-[9/16]',
    'auto': '',
  };

  const transformStyle = [
    flipH ? 'scaleX(-1)' : '',
    flipV ? 'scaleY(-1)' : '',
    `scale(${zoom})`,
    rot ? `rotate(${rot}deg)` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-neutral-100 ${aspectClasses[aspectRatio] || ''} ${className}`}
    >
      <img
        src={hasError ? NEUTRAL_PLACEHOLDER_IMG : resolvedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        style={{
          objectPosition: resolvedPosition,
          transform: transformStyle || undefined,
        }}
        className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
          enableMultiply ? 'mix-blend-multiply' : ''
        } ${onHoverZoom ? 'group-hover:scale-[1.03]' : ''} ${
          isLoaded ? 'opacity-100' : 'opacity-80'
        } ${imageClassName}`}
      />
    </div>
  );
};
