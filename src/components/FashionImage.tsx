import React, { useState } from 'react';
import { Product, ImageFramingParams, ImagePlacementCrop, NEUTRAL_PLACEHOLDER_IMG } from '../types';

export type ImagePlacement = 'card' | 'archive' | 'productPage' | 'heroDesktop' | 'heroMobile' | 'og';

const ASPECT_TOKENS = ['3/4', '4/5', '1/1', '16/9', '9/16', 'auto'] as const;

/** Normalises '3:4' / '3/4' style ratios to the token FashionImage understands. */
export function normalizeAspect(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(':', '/');
  return (ASPECT_TOKENS as readonly string[]).includes(v) ? v : undefined;
}

/**
 * Computes the CSS that applies non-destructive ImageEditor parameters to a
 * plain <img> / <video>. Used by FashionImage and by raw storefront imagery.
 */
export function imageFramingStyle(
  framing: Partial<ImageFramingParams> | undefined,
  placement: ImagePlacement = 'card',
  legacyPosition?: string,
  legacy?: { scale?: number; rotation?: number; flipped?: boolean }
): React.CSSProperties {
  const override: Partial<ImagePlacementCrop> | undefined = framing?.overrides?.[placement];

  const focalX = override?.focalX ?? framing?.focalX;
  const focalY = override?.focalY ?? framing?.focalY;
  const hasFraming = Boolean(framing);

  const zoom =
    override?.zoom ?? framing?.zoom ?? (hasFraming ? undefined : legacy?.scale) ?? 1.0;
  const rot =
    override?.rotation ??
    framing?.rotation ??
    (hasFraming ? undefined : legacy?.rotation) ??
    0;
  const flipH = override?.flipH ?? framing?.flipH ?? (hasFraming ? undefined : legacy?.flipped) ?? false;
  const flipV = override?.flipV ?? framing?.flipV ?? false;

  const objectPosition =
    (focalX !== undefined && focalY !== undefined ? `${focalX}% ${focalY}%` : undefined) ||
    legacyPosition ||
    '50% 50%';

  const transform = [
    flipH ? 'scaleX(-1)' : '',
    flipV ? 'scaleY(-1)' : '',
    `scale(${zoom})`,
    rot ? `rotate(${rot}deg)` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return { objectPosition, transform, transformOrigin: objectPosition };
}

/**
 * Per-image framing saved by the ImageEditor on `Product.images[]`. Returns
 * undefined when the image carries no authored parameters so legacy crop
 * behaviour is preserved for untouched catalogues.
 */
function legacyFramingFor(
  product: Product | undefined,
  src?: string
): Partial<ImageFramingParams> | undefined {
  if (!product) return undefined;
  const images = product.images || [];
  const entry = (src && images.find((img) => img?.url === src)) || images[0];
  if (!entry) return undefined;

  const hasFocal = entry.focalX !== undefined && entry.focalY !== undefined;
  const hasZoom = entry.scale !== undefined && entry.scale !== 1;
  const hasRotation = entry.rotation !== undefined && entry.rotation !== 0;
  if (!hasFocal && !hasZoom && !hasRotation && !entry.aspectRatio) return undefined;

  const out: Partial<ImageFramingParams> = {};
  if (hasFocal) {
    out.focalX = entry.focalX;
    out.focalY = entry.focalY;
  }
  if (hasZoom) out.zoom = entry.scale;
  if (hasRotation) out.rotation = entry.rotation;
  if (entry.aspectRatio) out.aspectRatio = entry.aspectRatio;
  if (entry.framing) return entry.framing;
  return out;
}

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

  // 1. Resolve source image URL. An empty/missing source keeps the single
  //    neutral grey "no image" placeholder — never invented imagery.
  const resolvedSrc =
    src ||
    (isHover ? product?.hoverImage || product?.image : product?.image) ||
    product?.images?.[0]?.url ||
    NEUTRAL_PLACEHOLDER_IMG;

  // 2. Resolve framing parameters (with per-placement override support).
  //    Precedence: placement override > explicit framing > per-image framing >
  //    legacy props/fields. The ImageEditor never mutates the source file.
  const productFraming = product?.framing;
  const activeFraming: Partial<ImageFramingParams> | undefined =
    framing || productFraming || legacyFramingFor(product, resolvedSrc);

  const legacyPosition =
    position ||
    (isHover ? product?.hoverImagePosition : product?.imagePosition) ||
    product?.cropVariation?.onModel?.position;

  const computed = imageFramingStyle(activeFraming, placement, legacyPosition, {
    scale: scale ?? product?.imageScale,
    rotation:
      rotation ??
      (isHover ? product?.hoverImageRotation : product?.imageRotation),
    flipped,
  });

  const resolvedPosition = computed.objectPosition;
  const transformStyle = computed.transform === 'scale(1)' ? '' : computed.transform;

  const placementOverride = activeFraming?.overrides?.[placement];

  // Aspect ratio: placement override > framing > component prop.
  const resolvedAspect =
    normalizeAspect(placementOverride?.aspectRatio) ||
    normalizeAspect(activeFraming?.aspectRatio) ||
    aspectRatio;

/** Tailwind aspect utilities keyed by the editor's ratio presets. */
const aspectClasses: Record<string, string> = {
    '3/4': 'aspect-[3/4]',
    '4/5': 'aspect-[4/5]',
    '1/1': 'aspect-square',
    '16/9': 'aspect-[16/9]',
    '9/16': 'aspect-[9/16]',
    'auto': '',
  };

  const isVideo = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(resolvedSrc);

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden ${aspectClasses[resolvedAspect] ||''} ${className}`}
    >
      {isVideo ? (
        <video
          src={resolvedSrc}
          autoPlay
          loop
          muted
          playsInline
          style={{
            objectPosition: resolvedPosition,
            transform: transformStyle || undefined,
            transformOrigin: resolvedPosition,
          }}
          className={`w-full h-full object-cover ${imageClassName}`}
        />
      ) : (
        <img
          src={hasError ? NEUTRAL_PLACEHOLDER_IMG : resolvedSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' } : {})}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          style={{
            objectPosition: resolvedPosition,
            transform: transformStyle || undefined,
            transformOrigin: resolvedPosition,
          }}
          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${ enableMultiply ?'mix-blend-multiply' : ''
          } ${onHoverZoom ? 'group-hover:scale-[1.03]' : ''} ${
            isLoaded ? 'opacity-100' : 'opacity-80'
          } ${imageClassName}`}
        />
      )}
    </div>
  );
};
