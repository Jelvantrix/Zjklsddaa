/**
 * Veo Video Generation Client Service
 * Calls server-side proxy endpoints for veo-3.1-fast-generate-preview
 */

import { supabase } from '../supabase/config';

export interface VideoGenerationParams {
  imageBase64: string;
  mimeType?: string;
  prompt?: string;
  aspectRatio: '16:9' | '9:16';
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
}

/**
 * The API rejects anonymous callers, so every request carries the current
 * Supabase access token. The server validates it and checks `public.admins`.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // No session — the server will respond 401 and the caller surfaces it.
  }
  return headers;
}

export async function generateVeoVideo(
  params: VideoGenerationParams,
  onStatusUpdate?: (statusText: string, progressPercent: number) => void
): Promise<VideoGenerationResult> {
  try {
    onStatusUpdate?.('Initializing Veo 3.1 Fast video synthesis...', 15);

    // 1. Request generation start
    const startRes = await fetch('/api/generate-video', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(params),
    });

    if (!startRes.ok) {
      const errData = await startRes.json().catch(() => ({}));
      if (startRes.status === 401 || startRes.status === 403) {
        throw new Error('Studio sign-in required before generating video.');
      }
      if (startRes.status === 429) {
        throw new Error(errData.error || 'Too many requests — please wait a moment and retry.');
      }
      throw new Error(errData.error || `HTTP ${startRes.status} starting generation`);
    }

    const { operationName } = await startRes.json();
    if (!operationName) {
      throw new Error('No operation ID returned by server.');
    }

    onStatusUpdate?.('Rendering temporal motion frames with Veo...', 35);

    // 2. Poll for completion
    let attempts = 0;
    const maxAttempts = 40; // ~80 seconds max
    let videoUrl = '';
    let failureReason = '';

    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((r) => setTimeout(r, 2500));

      const progress = Math.min(92, 35 + attempts * 3);
      const statusLabels = [
        'Calculating fabric movement & drape...',
        'Synthesizing Nordic atmospheric light...',
        'Interpolating 24 FPS motion vectors...',
        'Polishing high-definition 720p output...',
      ];
      onStatusUpdate?.(statusLabels[attempts % statusLabels.length], progress);

      const statusRes = await fetch('/api/video-status', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ operationName }),
      });

      // Auth/rate-limit failures will not recover by polling again.
      if (statusRes.status === 401 || statusRes.status === 403 || statusRes.status === 429) {
        failureReason =
          statusRes.status === 429
            ? 'Rate limited while checking generation status — please wait a moment and retry.'
            : 'Studio sign-in required before generating video.';
        break;
      }
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      if (statusData.done) {
        videoUrl = statusData.videoUrl || `/api/video-download`;
        break;
      }
    }

    if (!videoUrl) {
      // No video was produced — report a real failure instead of a sample clip.
      throw new Error(
        failureReason || 'Video generation did not complete in time. No video was produced — please retry.'
      );
    }

    onStatusUpdate?.('Video generation complete. Loading stream...', 100);
    return { success: true, videoUrl };
  } catch (err: any) {
    console.error('Veo video generation error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate video',
    };
  }
}
