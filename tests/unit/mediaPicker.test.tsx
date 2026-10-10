import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import React from 'react';

/**
 * Task 2 tests: upload from device, upload failure + retry, honest empty
 * library state, and https-only URL pasting.
 *
 * The media service is mocked so these run without a backend; the component
 * under test is the real picker used across the admin panel.
 */
const uploadMediaAsset = vi.fn();
const getMediaAssets = vi.fn();

vi.mock('../../src/supabase/mediaService', () => ({
  MEDIA_BUCKET: 'media',
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'],
  uploadMediaAsset: (...args: unknown[]) => uploadMediaAsset(...args),
  getMediaAssets: (...args: unknown[]) => getMediaAssets(...args),
  getMediaAssetsWithStatus: () => getMediaAssets().then((data: unknown[]) => ({ data, error: null })),
  isDataUrl: (v?: string) => typeof v === 'string' && /^\s*data:/i.test(v),
}));

import { UniversalMediaPickerModal } from '../../src/admin/components/UniversalMediaPickerModal';

const jpegFile = (name = 'coat.webp') =>
  new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], name, { type: 'image/webp' });

function renderPicker(props: any = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <UniversalMediaPickerModal
      isOpen={true}
      title="Select Media"
      {...props}
      onSelect={props.onSelect || onSelect}
      onClose={props.onClose || onClose}
    />
  );
  return { ...utils, onSelect, onClose };
}

beforeEach(() => {
  cleanup();
  uploadMediaAsset.mockReset();
  getMediaAssets.mockReset();
  getMediaAssets.mockResolvedValue([]);
});

describe('upload from device', () => {
  it('uploads the chosen file and hands the Storage URL back', async () => {
    uploadMediaAsset.mockResolvedValue({
      id: 'a1',
      path: 'media/2026/10/a1.webp',
      url: 'https://cdn.example/media/2026/10/a1.webp',
      kind: 'image',
      createdAt: '2026-10-10T00:00:00.000Z',
    });

    const { onSelect, onClose, container } = renderPicker();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [jpegFile()] } });

    await waitFor(() => expect(uploadMediaAsset).toHaveBeenCalledTimes(1));
    expect(uploadMediaAsset.mock.calls[0][0]).toBeInstanceOf(File);
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith('https://cdn.example/media/2026/10/a1.webp', expect.anything())
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('rejects a file that is not an allowed type without calling Storage', async () => {
    const { container } = renderPicker();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'doc.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText(/Unsupported file format/i)).toBeTruthy();
    expect(uploadMediaAsset).not.toHaveBeenCalled();
  });

  it('rejects a file over 15 MB before touching the network', async () => {
    const { container } = renderPicker();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'big.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [big] } });

    expect(await screen.findByText(/too large/i)).toBeTruthy();
    expect(uploadMediaAsset).not.toHaveBeenCalled();
  });
});

describe('upload failure and retry', () => {
  it('shows the failure, offers Retry, and succeeds on the second attempt', async () => {
    uploadMediaAsset
      .mockRejectedValueOnce(new Error('Storage upload failed: internal error'))
      .mockResolvedValueOnce({
        id: 'a2',
        path: 'media/2026/10/a2.webp',
        url: 'https://cdn.example/media/2026/10/a2.webp',
        kind: 'image',
        createdAt: '2026-10-10T00:00:00.000Z',
      });

    const { onSelect, container } = renderPicker();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [jpegFile()] } });

    expect(await screen.findByText(/Storage upload failed: internal error/i)).toBeTruthy();

    const retry = await screen.findByRole('button', { name: /retry/i });
    fireEvent.click(retry);

    await waitFor(() => expect(uploadMediaAsset).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith('https://cdn.example/media/2026/10/a2.webp', expect.anything())
    );
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });
});

describe('choose from library', () => {
  it('shows an honest empty state when the library has zero assets', async () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /library \(0\)/i }));

    expect(await screen.findByText(/No media assets found/i)).toBeTruthy();
    expect(screen.queryByText(/SEED|demo/i)).toBeNull();
  });

  it('selects an existing asset from the grid', async () => {
    getMediaAssets.mockResolvedValue([
      {
        id: 'm1',
        path: 'media/2026/10/m1.webp',
        url: 'https://cdn.example/media/2026/10/m1.webp',
        kind: 'image',
        alt: 'Wool coat',
        createdAt: '2026-10-10T00:00:00.000Z',
      },
    ]);

    const { onSelect, onClose } = renderPicker();
    // Library starts at 0; mock fetch updates the count. Wait for the count to become 1.
    await waitFor(() => expect(screen.getByRole('button', { name: /library \(1\)/i })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /library \(1\)/i }));

    fireEvent.click(await screen.findByText('Wool coat'));
    await waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith('https://cdn.example/media/2026/10/m1.webp', expect.anything())
    );
    expect(onClose).toHaveBeenCalled();
  });
});

describe('paste image URL', () => {
  it('accepts https URLs only', async () => {
    const { onSelect, onClose } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /paste url/i }));

    const input = screen.getByPlaceholderText('https://your-domain.com/path/image.webp');

    fireEvent.change(input, { target: { value: 'http://insecure.example/a.webp' } });
    fireEvent.click(screen.getByRole('button', { name: /use url/i }));
    expect(await screen.findByText(/secure protocol/i)).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'data:image/webp;base64,AAAA' } });
    fireEvent.click(screen.getByRole('button', { name: /use url/i }));
    expect(await screen.findByText(/secure protocol/i)).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'https://cdn.example/media/a.webp' } });
    fireEvent.click(screen.getByRole('button', { name: /use url/i }));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('https://cdn.example/media/a.webp'));
    expect(onClose).toHaveBeenCalled();
  });
});
