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
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
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
          reject(new Error('Could not create canvas context'));
          return;
        }

        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

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
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Gets media assets from the database ordered by creation date.
 */
export async function getMediaAssets(): Promise<MediaAsset[]> {
  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn('Could not fetch media_assets:', error.message);
      return [];
    }
    return (data || []) as MediaAsset[];
  } catch (err) {
    console.warn('Media assets query failed:', err);
    return [];
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
      createdAt: newAsset.createdAt,
    });

  if (dbError) {
    console.warn('Could not record in media_assets table, returning storage asset:', dbError.message);
  }

  options?.onProgress?.(100);
  return newAsset;
}

/**
 * Searches where an image URL or path is used across products, collections, categories, and content.
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

  if (!url) return result;

  try {
    // 1. Check products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, image, hoverImage, images');

    if (products) {
      for (const p of products) {
        let isUsed = p.image === url || p.hoverImage === url;
        if (!isUsed && Array.isArray(p.images)) {
          isUsed = p.images.some((img: any) => img?.url === url);
        }
        if (isUsed) {
          result.productIds.push(p.id);
          const title = (p.name && (p.name.en || p.name.fi)) || p.id;
          result.productTitles.push(title);
        }
      }
    }

    // 2. Check content
    const { data: contentData } = await supabase
      .from('content')
      .select('heroMedia, heroSlides, journalPosts')
      .limit(1)
      .maybeSingle();

    if (contentData) {
      if (
        contentData.heroMedia?.desktopSrc === url ||
        contentData.heroMedia?.mobileSrc === url
      ) {
        result.heroUsage = true;
        result.contentSections.push('Hero Section');
      }

      if (Array.isArray(contentData.heroSlides)) {
        const inSlides = contentData.heroSlides.some(
          (s: any) =>
            s.src === url ||
            s.desktopMedia?.url === url ||
            s.mobileMedia?.url === url
        );
        if (inSlides) {
          result.heroUsage = true;
          result.contentSections.push('Hero Slides');
        }
      }

      if (Array.isArray(contentData.journalPosts)) {
        const inJournal = contentData.journalPosts.some((j: any) => j.coverImage === url);
        if (inJournal) {
          result.contentSections.push('Journal Posts');
        }
      }
    }

    result.totalUses = result.productIds.length + (result.heroUsage ? 1 : 0) + result.contentSections.length;
  } catch (err) {
    console.warn('Error checking media usage:', err);
  }

  return result;
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
