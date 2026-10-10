import { describe, it, expect } from 'vitest';
import { imageFramingStyle, normalizeAspect } from '../../src/components/FashionImage';
import type { ImageFramingParams } from '../../src/types';

/**
 * Task 3: the ImageEditor stores non-destructive parameters and the storefront
 * must apply them with CSS on desktop AND mobile placements.
 */
describe('normalizeAspect', () => {
  it('accepts colon and slash notation', () => {
    expect(normalizeAspect('3:4')).toBe('3/4');
    expect(normalizeAspect('3/4')).toBe('3/4');
    expect(normalizeAspect('16:9')).toBe('16/9');
    expect(normalizeAspect('9:16')).toBe('9/16');
  });

  it('rejects unknown values instead of inventing one', () => {
    expect(normalizeAspect('2:3')).toBeUndefined();
    expect(normalizeAspect(undefined)).toBeUndefined();
    expect(normalizeAspect('')).toBeUndefined();
  });
});

describe('imageFramingStyle', () => {
  const base: ImageFramingParams = {
    focalX: 30,
    focalY: 70,
    zoom: 1.4,
    rotation: -12,
    flipH: true,
    flipV: false,
    aspectRatio: '4:5',
  };

  it('applies focal point, zoom, rotation and flip as CSS', () => {
    const style = imageFramingStyle(base, 'card');
    expect(style.objectPosition).toBe('30% 70%');
    expect(style.transform).toContain('scaleX(-1)');
    expect(style.transform).toContain('scale(1.4)');
    expect(style.transform).toContain('rotate(-12deg)');
    expect(style.transformOrigin).toBe('30% 70%');
  });

  it('uses the per-placement override for the hero desktop crop', () => {
    const withOverride: ImageFramingParams = {
      ...base,
      overrides: { heroDesktop: { focalX: 10, focalY: 10, zoom: 2 } },
    };
    const style = imageFramingStyle(withOverride, 'heroDesktop');
    expect(style.objectPosition).toBe('10% 10%');
    expect(style.transform).toContain('scale(2)');
  });

  it('uses a DIFFERENT override for the hero mobile crop (per-viewport framing)', () => {
    const withOverride: ImageFramingParams = {
      ...base,
      overrides: {
        heroDesktop: { focalX: 10, focalY: 10, zoom: 2 },
        heroMobile: { focalX: 80, focalY: 90, zoom: 1, rotation: 0, flipH: false },
      },
    };

    const desktop = imageFramingStyle(withOverride, 'heroDesktop');
    const mobile = imageFramingStyle(withOverride, 'heroMobile');

    expect(desktop.objectPosition).toBe('10% 10%');
    expect(mobile.objectPosition).toBe('80% 90%');
    expect(mobile.transform).not.toBe(desktop.transform);
  });

  it('falls back to the base crop for placements without an override', () => {
    const withOverride: ImageFramingParams = {
      ...base,
      overrides: { og: { focalX: 5, focalY: 95 } },
    };
    expect(imageFramingStyle(withOverride, 'archive').objectPosition).toBe('30% 70%');
    expect(imageFramingStyle(withOverride, 'productPage').objectPosition).toBe('30% 70%');
    expect(imageFramingStyle(withOverride, 'og').objectPosition).toBe('5% 95%');
  });

  it('keeps legacy position/scale when no framing was authored', () => {
    const style = imageFramingStyle(undefined, 'card', 'center 20%', { scale: 1.05 });
    expect(style.objectPosition).toBe('center 20%');
    expect(style.transform).toContain('scale(1.05)');
  });

  it('never invents framing when nothing was authored', () => {
    const style = imageFramingStyle(undefined, 'card');
    expect(style.objectPosition).toBe('50% 50%');
    expect(style.transform).toBe('scale(1)');
  });
});
