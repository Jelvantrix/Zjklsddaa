import { supabase } from './config';
import { MediaAsset } from '../types';

export const MEDIA_BUCKET = 'media';
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
];

export interface ClientCompressedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

/**
 * Compresses an image client-side to WebP with max 2400px on the longest edge.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 2400,
  quality = 0.85
): Promise<ClientCompressedImage> {
  return new Promise((resolve, reject) => {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      reject(new Error('Image compression is not available in this environment'));
      return;
    }
    // Object URLs keep the bytes in memory — nothing is ever base64-encoded
    // into the database (the no-seed guard forbids data URLs outright).
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    const img = new Image();
    img.onerror = () => {
      cleanup();
      reject(new Error('Invalid image file'));
    };
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Could not create canvas context'));
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      cleanup();

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas WebP compression failed'));
            return;
          }
          const previewUrl = URL.createObjectURL(blob);
          resolve({ blob, width, height, previewUrl });
        },
        'image/webp',
        quality
      );
    };
    img.src = objectUrl;
  });
}

/**
 * Gets media assets from the database ordered by creation date.
 */
export async function getMediaAssets(): Promise<MediaAsset[]> {
  const { data } = await getMediaAssetsWithStatus();
  return data;
}

/**
 * Same as getMediaAssets but also surfaces the failure so callers can render
 * an honest "Could not load data" state instead of pretending it is empty.
 */
export async function getMediaAssetsWithStatus(): Promise<{
  data: MediaAsset[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: (data || []) as MediaAsset[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Could not load data' };
  }
}

/**
 * Uploads a file (image or video) to Supabase Storage and records it in public.media_assets.
 */
export async function uploadMediaAsset(
  file: File,
  options?: {
    alt?: string;
    focalX?: number;
    focalY?: number;
    framing?: import('../types').ImageFramingParams | null;
    onProgress?: (percent: number) => void;
  }
): Promise<MediaAsset> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size of 15 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type (${file.type}). Allowed: JPEG, PNG, WebP, AVIF, MP4, WebM.`);
  }

  const isVideo = file.type.startsWith('video/');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `asset-${Date.now()}-${Date.now().toString(36)}`;

  let uploadBlob: Blob = file;
  let width: number | undefined;
  let height: number | undefined;
  let ext = isVideo ? (file.type.includes('webm') ? 'webm' : 'mp4') : 'webp';
  let mimeType = isVideo ? file.type : 'image/webp';

  options?.onProgress?.(20);

  if (!isVideo) {
    try {
      const compressed = await compressImageToWebP(file);
      uploadBlob = compressed.blob;
      width = compressed.width;
      height = compressed.height;
    } catch (compressionErr) {
      console.warn('Client WebP compression skipped, using original file:', compressionErr);
      uploadBlob = file;
      ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      mimeType = file.type;
    }
  }

  options?.onProgress?.(50);

  const storagePath = `media/${year}/${month}/${uuid}.${ext}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, uploadBlob, {
      contentType: mimeType,
      cacheControl: '31536000',
      upsert: true,
    });

  if (uploadError) {
    const msg = (uploadError.message || '').toLowerCase();
    if (
      msg.includes('bucket') ||
      msg.includes('not found') ||
      msg.includes('policy') ||
      msg.includes('row-level security') ||
      msg.includes('unauthorized') ||
      msg.includes('permission') ||
      msg.includes('403') ||
      msg.includes('404')
    ) {
      throw new Error('Storage is not set up. Run migration 0007.');
    }
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  options?.onProgress?.(80);

  const { data: publicUrlData } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(uploadData.path);

  const assetUrl = publicUrlData.publicUrl;

  const newAsset: MediaAsset = {
    id: uuid,
    path: uploadData.path,
    url: assetUrl,
    kind: isVideo ? 'video' : 'image',
    width,
    height,
    sizeBytes: uploadBlob.size,
    mimeType,
    alt: options?.alt || file.name.replace(/\.[^/.]+$/, ''),
    focalX: options?.focalX ?? 50,
    focalY: options?.focalY ?? 50,
    framing: options?.framing ?? undefined,
    createdAt: new Date().toISOString(),
  };

  const { error: dbError } = await supabase
    .from('media_assets')
    .insert({
      id: newAsset.id,
      path: newAsset.path,
      url: newAsset.url,
      kind: newAsset.kind,
      width: newAsset.width,
      height: newAsset.height,
      sizeBytes: newAsset.sizeBytes,
      mimeType: newAsset.mimeType,
      alt: newAsset.alt,
      focalX: newAsset.focalX,
      focalY: newAsset.focalY,
      framing: newAsset.framing ?? null,
      createdAt: newAsset.createdAt,
    });

  if (dbError) {
    // Roll the Storage object back so no orphaned file is left behind.
    await supabase.storage.from(MEDIA_BUCKET).remove([uploadData.path]).catch(() => undefined);
    throw new Error(
      `Could not record the upload in the media library: ${dbError.message}. The file was not saved.`
    );
  }

  options?.onProgress?.(100);
  return newAsset;
}

/** Persists ImageEditor framing parameters (and alt text) onto a media asset row. */
export async function updateMediaAsset(
  id: string,
  patch: Partial<
    Pick<MediaAsset, 'alt' | 'focalX' | 'focalY' | 'framing'>
  >
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {};
    if (patch.alt !== undefined) payload.alt = patch.alt;
    if (patch.focalX !== undefined) payload.focalX = patch.focalX;
    if (patch.focalY !== undefined) payload.focalY = patch.focalY;
    if (patch.framing !== undefined) payload.framing = patch.framing;

    if (Object.keys(payload).length === 0) return { success: true };

    const { error } = await supabase
      .from('media_assets')
      .update(payload)
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not update media asset' };
  }
}

/** Returns true when a value is an inline base64/data URL (never allowed in the DB). */
export function isDataUrl(value?: string | null): boolean {
  return typeof value === 'string' && /^\s*data:/i.test(value);
}

/**
 * Searches where an image URL or path is used across products, categories,
 * collections and the CMS content row.
 */
export async function findMediaUsage(url: string): Promise<{
  productIds: string[];
  productTitles: string[];
  heroUsage: boolean;
  contentSections: string[];
  totalUses: number;
}> {
  const result = {
    productIds: [] as string[],
    productTitles: [] as string[],
    heroUsage: false,
    contentSections: [] as string[],
    totalUses: 0,
  };

  if (!url || isDataUrl(url)) return result;

  const deepUses = (value: unknown): boolean => {
    if (typeof value === 'string') return value === url;
    if (Array.isArray(value)) return value.some(deepUses);
    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).some(deepUses);
    }
    return false;
  };

  try {
    // 1. Products (primary, hover and gallery)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image, hoverImage, images');

    if (products) {
      for (const p of products) {
        const isUsed =
          p.image === url ||
          p.hoverImage === url ||
          (Array.isArray(p.images) && p.images.some((img: any) => img?.url === url));
        if (isUsed) {
          result.productIds.push(p.id);
          const title = (p.name && (p.name.en || p.name.fi)) || p.id;
          result.productTitles.push(title);
        }
      }
    }

    // 2. Categories & collections covers
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, image');
    if (categories?.some((c: any) => c.image === url)) {
      result.contentSections.push('Category covers');
    }

    const { data: collections } = await supabase
      .from('collections')
      .select('id, name, cover');
    if (collections?.some((c: any) => c.cover === url)) {
      result.contentSections.push('Collection covers');
    }

    // 3. CMS content row (hero, slides, journal, story plates, announcement)
    const { data: contentData } = await supabase
      .from('content')
      .select('heroMedia, heroSlides, journalPosts, translations, announcementBar')
      .limit(1)
      .maybeSingle();

    if (contentData) {
      if (deepUses(contentData.heroMedia)) {
        result.heroUsage = true;
        result.contentSections.push('Hero Section');
      }

      if (deepUses(contentData.heroSlides)) {
        result.heroUsage = true;
        result.contentSections.push('Hero Slides');
      }

      if (deepUses(contentData.journalPosts)) {
        result.contentSections.push('Journal Posts');
      }

      if (deepUses(contentData.translations)) {
        result.contentSections.push('Story / page sections');
      }

      if (deepUses(contentData.announcementBar)) {
        result.contentSections.push('Announcement bar');
      }
    }
  } catch (err) {
    console.warn('Error checking media usage:', err);
  }

  result.totalUses =
    result.productIds.length + (result.heroUsage ? 1 : 0) + result.contentSections.length;
  return result;
}

/**
 * Removes every reference to `url` from products and CMS content without
 * deleting the underlying file. Used by the "Remove everywhere" delete flow so
 * the storefront never shows a broken image.
 */
export async function removeMediaReferences(
  url: string
): Promise<{ success: boolean; error?: string }> {
  if (!url || isDataUrl(url)) return { success: true };

  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, image, hoverImage, images');

    if (products) {
      for (const p of products) {
        const patch: Record<string, unknown> = {};
        if (p.image === url) patch.image = null;
        if (p.hoverImage === url) patch.hoverImage = null;
        if (Array.isArray(p.images) && p.images.some((img: any) => img?.url === url)) {
          patch.images = p.images
            .filter((img: any) => img?.url !== url)
            .map((img: any, idx: number) => ({ ...img, order: idx }));
        }
        if (Object.keys(patch).length > 0) {
          const { error } = await supabase.from('products').update(patch).eq('id', p.id);
          if (error) return { success: false, error: error.message };
        }
      }
    }

    const stripSlide = (s: any) => {
      if (!s) return s;
      const next = { ...s };
      if (next.src === url) next.src = '';
      if (next.poster === url) next.poster = '';
      if (next.desktopMedia?.url === url) next.desktopMedia = { ...next.desktopMedia, url: '' };
      if (next.mobileMedia?.url === url) next.mobileMedia = { ...next.mobileMedia, url: '' };
      return next;
    };

    const { data: contentData } = await supabase
      .from('content')
      .select('id, heroMedia, heroSlides, journalPosts, translations')
      .limit(1)
      .maybeSingle();

    if (contentData) {
      const contentPatch: Record<string, unknown> = {};
      const heroMedia = contentData.heroMedia || {};
      if (heroMedia.desktopSrc === url || heroMedia.mobileSrc === url) {
        contentPatch.heroMedia = {
          ...heroMedia,
          desktopSrc: heroMedia.desktopSrc === url ? '' : heroMedia.desktopSrc,
          mobileSrc: heroMedia.mobileSrc === url ? '' : heroMedia.mobileSrc,
        };
      }
      if (Array.isArray(contentData.heroSlides)) {
        contentPatch.heroSlides = contentData.heroSlides.map(stripSlide);
      }
      if (Array.isArray(contentData.journalPosts)) {
        contentPatch.journalPosts = contentData.journalPosts.map((j: any) =>
          j && j.image === url ? { ...j, image: '' } : j
        );
      }
      if (contentData.translations && deepContains(contentData.translations, url)) {
        contentPatch.translations = deepStrip(contentData.translations, url);
      }
      if (Object.keys(contentPatch).length > 0) {
        const { error } = await supabase
          .from('content')
          .update(contentPatch)
          .eq('id', contentData.id);
        if (error) return { success: false, error: error.message };
      }
    }

    const { data: categories } = await supabase
      .from('categories')
      .select('id, image');
    if (categories) {
      for (const c of categories) {
        if (c.image === url) {
          const { error } = await supabase
            .from('categories')
            .update({ image: null })
            .eq('id', c.id);
          if (error) return { success: false, error: error.message };
        }
      }
    }

    const { data: collections } = await supabase
      .from('collections')
      .select('id, cover');
    if (collections) {
      for (const c of collections) {
        if (c.cover === url) {
          const { error } = await supabase
            .from('collections')
            .update({ cover: null })
            .eq('id', c.id);
          if (error) return { success: false, error: error.message };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not remove all references' };
  }
}

function deepContains(value: unknown, url: string): boolean {
  if (typeof value === 'string') return value === url;
  if (Array.isArray(value)) return value.some((v) => deepContains(v, url));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => deepContains(v, url));
  }
  return false;
}

function deepStrip<T>(value: T, url: string): T {
  if (typeof value === 'string') return (value === url ? (('' as unknown) as T) : value);
  if (Array.isArray(value)) return (value.map((v) => deepStrip(v, url)) as unknown) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepStrip(v, url);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Deletes an asset permanently from Supabase Storage and public.media_assets.
 */
export async function deleteMediaAssetPermanently(
  asset: MediaAsset
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remove from Storage
    if (asset.path) {
      const { error: storageError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .remove([asset.path]);
      if (storageError) {
        console.warn('Storage deletion warning:', storageError.message);
      }
    }

    // 2. Remove from media_assets table
    const { error: dbError } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', asset.id);

    if (dbError) {
      console.warn('Database deletion warning:', dbError.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Delete operation failed' };
  }
}

/**
 * Tests whether the media bucket exists and is accessible.
 */
export async function testStorageBucket(): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).list('', { limit: 1 });
    if (error) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
