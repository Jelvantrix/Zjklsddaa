import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  uploadMediaAsset,
  isDataUrl,
  findMediaUsage,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from '../../src/supabase/mediaService';

/**
 * Task 2: upload validation. Storage/network must never be touched for an
 * invalid file, and the failure must be an honest, human-readable message
 * (the upload UI surfaces it and offers a retry).
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isDataUrl', () => {
  it('flags inline base64 payloads that must never reach the database', () => {
    expect(isDataUrl('data:image/webp;base64,UklGRg==')).toBe(true);
    expect(isDataUrl('  DATA:video/mp4;base64,AAAA')).toBe(true);
  });

  it('accepts real Storage / https URLs', () => {
    expect(isDataUrl('https://project.supabase.co/storage/v1/object/public/media/a.webp')).toBe(false);
    expect(isDataUrl('/placeholder.svg')).toBe(false);
    expect(isDataUrl(undefined)).toBe(false);
  });
});

describe('uploadMediaAsset validation', () => {
  it('rejects a disallowed file type with a clear message', async () => {
    const file = new File(['%PDF-1.4'], 'notes.pdf', { type: 'application/pdf' });
    await expect(uploadMediaAsset(file)).rejects.toThrow(/Unsupported file type/);
  });

  it('rejects a file larger than the 15 MB bucket limit', async () => {
    const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const file = new File([oversized], 'huge.jpg', { type: 'image/jpeg' });
    await expect(uploadMediaAsset(file)).rejects.toThrow(/maximum size of 15 MB/);
  });

  it('only advertises the mime types allowed by the media bucket', () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm',
    ]);
  });
});

describe('findMediaUsage', () => {
  it('short-circuits for data URLs without querying the database', async () => {
    const usage = await findMediaUsage('data:image/webp;base64,AAAA');
    expect(usage).toEqual({
      productIds: [],
      productTitles: [],
      heroUsage: false,
      contentSections: [],
      totalUses: 0,
    });
  });

  it('returns an honest zero result for an empty value', async () => {
    const usage = await findMediaUsage('');
    expect(usage.totalUses).toBe(0);
  });
});
