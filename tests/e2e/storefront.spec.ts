import { test, expect } from '@playwright/test';
import { mockSupabase, blockRealtime } from './helpers/mockSupabase';

/**
 * Task 3 + Task 1: the storefront must (a) render NOTHING but honest empty
 * states when the database is completely empty, and (b) apply the saved
 * ImageEditor parameters with CSS on desktop and on mobile viewports.
 */

const IMAGE_URL =
  'https://your-project.supabase.co/storage/v1/object/public/media/2026/10/coat.webp';

const baseProduct = (over: Record<string, unknown> = {}) => ({
  id: 'p-1',
  nr: 'Nº 001',
  plateNumber: 'Nº 001',
  name: { en: 'Monolithic Wool Coat', fi: 'Monoliittinen villatakki', sv: 'Monolitiskt jacka' },
  description: { en: 'Permanent coat.', fi: '', sv: '' },
  material: { en: 'Virgin wool', fi: '', sv: '' },
  origin: { en: 'Portugal', fi: '', sv: '' },
  care: { en: 'Dry clean.', fi: '', sv: '' },
  price: 780,
  category: 'naiset',
  subcategory: 'takit',
  sizes: ['XS', 'S', 'M'],
  stock: 4,
  isLimited: false,
  images: [{ url: IMAGE_URL, order: 0 }],
  image: IMAGE_URL,
  colorName: { en: 'Obsidian', fi: '', sv: '' },
  colorHex: '#000000',
  cropVariation: {
    packshot: { position: 'center 20%', scale: 1, aspectRatio: '3/4' },
    onModel: { position: 'center 20%', scale: 1.05, aspectRatio: '3/4' },
    detail1: { position: 'center 15%', scale: 1.4 },
    detail2: { position: 'center 35%', scale: 1.6 },
    detail3: { position: 'center 50%', scale: 1.3 },
    detail4: { position: 'center 60%', scale: 1.5 },
  },
  ...over,
});

test.describe('zero seeded data', () => {
  test('renders an honest empty storefront when every table is empty', async ({ page }) => {
    await mockSupabase(page, { tables: {} });
    await blockRealtime(page);
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    // Nothing invented may appear: no product plates, no prices in the grid.
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(bodyText).not.toMatch(/Nº 001|Monolithic Wool Coat|780,00 €/);
    expect(bodyText).not.toMatch(/\blorem\b/i);

    // Every image either loads or is the single neutral placeholder — never a
    // broken-image icon.
    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src)
        .filter((src) => !src.endsWith('/placeholder.svg'))
    );
    expect(broken).toEqual([]);
  });

  test('shows the catalogue empty state copy', async ({ page }) => {
    await mockSupabase(page);
    await blockRealtime(page);
    await page.goto('/');

    await expect(
      page.getByText(/No Archival Garments Live Yet|No products in this view|No pieces match your criteria|Nothing has been published/i).first()
    ).toBeVisible();
  });
});

test.describe('image editor parameters applied', () => {
  const heroFraming = {
    focalX: 12,
    focalY: 18,
    zoom: 1.6,
    rotation: -8,
    flipH: true,
    flipV: false,
    aspectRatio: '16:9',
    overrides: {
      heroDesktop: { focalX: 15, focalY: 25, zoom: 1.5, rotation: -6 },
      heroMobile: { focalX: 88, focalY: 72, zoom: 2, rotation: 4, flipH: false },
      card: { focalX: 33, focalY: 44, zoom: 1.25 },
    },
  };

  const contentRow = {
    id: 'default',
    sectionOrder: ['hero', 'featured', 'categories', 'story', 'journal'],
    heroMedia: { desktopSrc: '', desktopPoster: '', mobileSrc: '', mobilePoster: '' },
    heroSlides: [
      {
        id: 'slide-1',
        type: 'image',
        src: IMAGE_URL,
        positionDesktop: '50% 50%',
        positionMobile: '50% 50%',
        enabled: true,
        desktopMedia: { url: IMAGE_URL, kind: 'image', framing: heroFraming },
        mobileMedia: { url: IMAGE_URL, kind: 'image', framing: heroFraming },
        framing: heroFraming,
      },
    ],
    announcementBar: { en: '', fi: '', sv: '' },
    journalPosts: [],
    translations: {},
    updatedAt: '2026-10-10T00:00:00.000Z',
  };

  test('desktop viewport uses the heroDesktop override', async ({ page }) => {
    await mockSupabase(page, {
      tables: {
        products: [baseProduct({ framing: heroFraming })],
        content: [contentRow],
      },
    });
    await blockRealtime(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const heroImg = page.locator('img[src="' + IMAGE_URL + '"]').first();
    await expect(heroImg).toBeVisible();

    const style = await heroImg.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { objectPosition: s.objectPosition, transform: s.transform };
    });

    expect(style.objectPosition).toBe('15% 25%');
    expect(style.transform).not.toBe('none');
  });

  test('mobile viewport switches to the heroMobile override', async ({ page }) => {
    await mockSupabase(page, {
      tables: { products: [baseProduct({ framing: heroFraming })], content: [contentRow] },
    });
    await blockRealtime(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const heroImg = page.locator('img[src="' + IMAGE_URL + '"]').first();
    await expect(heroImg).toBeVisible();

    const objectPosition = await heroImg.evaluate(
      (el) => window.getComputedStyle(el).objectPosition
    );
    expect(objectPosition).toBe('88% 72%');
  });

  test('product card applies the saved focal point and zoom', async ({ page }) => {
    await mockSupabase(page, {
      tables: {
        // status:'live' is required for the homepage featured grid to render the product.
        products: [baseProduct({ status: 'live', framing: heroFraming, image: IMAGE_URL })],
        content: [contentRow],
      },
    });
    await blockRealtime(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // The featured-grid card renders with placement="card"; the product's
    // framing carries overrides.card = {focalX:33, focalY:44, zoom:1.25}.
    const cardImg = page.locator('img[src="' + IMAGE_URL + '"]').last();
    await expect(cardImg).toBeVisible();

    const applied = await cardImg.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { objectPosition: s.objectPosition, transform: s.transform };
    });

    expect(applied.objectPosition).toBe('33% 44%');
    expect(applied.transform).toContain('matrix');
  });

  test('no framing is applied when none was authored (legacy behaviour intact)', async ({
    page,
  }) => {
    await mockSupabase(page, {
      tables: {
        // status:'live' is required for the featured grid to render the product.
        products: [baseProduct({ status: 'live' })],
        content: [{ ...contentRow, heroMedia: { desktopSrc: "", desktopPoster: "", mobileSrc: "", mobilePoster: "" }, heroSlides: [] }],
      },
    });
    await blockRealtime(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const legacy = await page.evaluate((url) => {
      const img = Array.from(document.images).find((i) => i.getAttribute('src') === url);
      return img ? window.getComputedStyle(img).objectPosition : null;
    }, IMAGE_URL);

    // Legacy cropVariation position ('center 20%', normalised to '50% 20%')
    expect(legacy).toBe('50% 20%');
  });
});