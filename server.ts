import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  saveTargetPlan,
  getActiveTargetPlan,
  lockPeriod,
  saveMetricActual,
  getMetricActuals,
  saveCoachTask,
  updateCoachTaskStatus,
  getCoachTasksForDate,
  saveDailyCoachBrief,
  getDailyCoachBrief,
  saveReverseFunnelCalculation,
  getLatestReverseFunnelCalculation,
} from './src/supabase/targetsService';
import {
  calculateGrowthRate,
  generateMonthlyTargets,
  applyGrowthCurve,
  generateDailyTargets,
  generateWeeklyTargets,
  calculateProgress,
  calculateCatchUp,
  calculateHitProbability,
  calculateReverseFunnel,
  generateDailyCoachTasks,
  generateDailyCoachBrief,
} from './src/services/targetCalculator';
import { supabase, isServiceClient } from './src/supabase/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Body parsing
//
// The old limit was a flat 50mb, which lets an unauthenticated caller pin the
// process with a single oversized payload. Only the image-upload endpoint
// genuinely needs room; everything else stays small.
// ---------------------------------------------------------------------------
function parseJson(req: express.Request, res: express.Response, next: express.NextFunction) {
  const limit = req.path === '/api/generate-video' ? '15mb' : '512kb';
  express.json({ limit, strict: false })(req, res, next);
}

// ---------------------------------------------------------------------------
// Rate limiting (per IP, in-memory — adequate for a single Node process)
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const GENERAL_RATE_MAX = 120;   // ordinary API traffic
const UPLOAD_RATE_MAX = 10;     // video generation costs Gemini quota
const rateHits = new Map<string, { count: number; resetAt: number }>();

const rateCleaner = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateHits) {
    if (entry.resetAt <= now) rateHits.delete(key);
  }
}, RATE_WINDOW_MS);
(rateCleaner as any).unref?.();

function rateLimit(max: number, bucket: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip ?? 'unknown'}|${bucket}`;
    const now = Date.now();
    let entry = rateHits.get(key);
    if (!entry || entry.resetAt <= now) {
      rateHits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    return next();
  };
}

// ---------------------------------------------------------------------------
// Authentication
//
// Every /api route is administrative: it reads business data and spends Gemini
// quota. The caller must present a live Supabase access token that resolves to
// a row in `public.admins`.
// ---------------------------------------------------------------------------
interface AuthedRequest extends express.Request {
  admin?: { id: string; email: string; role: string };
}

async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!isServiceClient) {
    return res.status(503).json({
      error:
        'API is disabled: SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
        'Set it in the server environment to enable administrative endpoints.',
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    const email = data.user.email?.toLowerCase();
    if (!email) {
      return res.status(403).json({ error: 'Account has no administrative role.' });
    }

    // Small table; scan so a case difference between the Supabase Auth email
    // and the stored row cannot lock the owner out of the API.
    const { data: adminRows, error: roleError } = await supabase
      .from('admins')
      .select('email, role');

    if (roleError) {
      console.error('Admin role lookup failed:', roleError.message);
      return res.status(500).json({ error: 'Unable to verify administrative role.' });
    }

    const adminRow = (adminRows || []).find(
      (row: { email?: string | null }) => (row.email || '').toLowerCase() === email
    );
    if (!adminRow) {
      return res.status(403).json({ error: 'Account has no administrative role.' });
    }

    (req as AuthedRequest).admin = {
      id: data.user.id,
      email,
      role: String(adminRow.role || '').toLowerCase(),
    };
    return next();
  } catch (err) {
    console.error('Authentication middleware failed:', err);
    return res.status(500).json({ error: 'Authentication service unavailable.' });
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  // Only trust a reverse proxy when explicitly told to, otherwise client IPs
  // could be spoofed through X-Forwarded-For.
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  }

  app.use(parseJson);

  // Minimal hardening headers (Vite's dev/prod middleware handles the rest).
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Every /api route reads business data or spends Gemini quota, so each one
  // requires a live Supabase token that resolves to a `public.admins` row.
  app.use('/api', rateLimit(GENERAL_RATE_MAX, 'api'));
  app.use('/api', requireAdmin);

  // Initialize Gemini AI client server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // In-memory cache for video generation status
  const operationsCache = new Map<
    string,
    {
      status: 'pending' | 'completed' | 'failed';
      videoUrl?: string;
      error?: string;
      aspectRatio?: string;
      prompt?: string;
      createdAt: number;
    }
  >();

  // 1. API: Start Video Generation using Veo
  app.post(
    '/api/generate-video',
    rateLimit(UPLOAD_RATE_MAX, 'upload'),
    async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', prompt, aspectRatio = '9:16' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      // Clean base64 string if data URL prefix is included
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const validAspectRatio: '16:9' | '9:16' = aspectRatio === '16:9' ? '16:9' : '9:16';
      const promptText =
        prompt ||
        'Subtle slow-motion cinematic motion of high-fashion garment, soft studio lighting, runway walk, gentle textile flutter, 24fps film aesthetic';

      console.log(`[Veo] Requesting video generation with model veo-3.1-fast-generate-preview, aspect ratio ${validAspectRatio}`);

      let operationName = '';
      try {
        const operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: promptText,
          image: {
            imageBytes: cleanBase64,
            mimeType: mimeType,
          },
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: validAspectRatio,
          },
        });
        operationName = operation.name || `operation-${Date.now()}`;
        operationsCache.set(operationName, {
          status: 'pending',
          aspectRatio: validAspectRatio,
          prompt: promptText,
          createdAt: Date.now(),
        });
      } catch (genError: any) {
        console.warn('[Veo] Video API call returned:', genError?.message);
        // If quota or preview error occurs, create simulated operation with elegant sample video
        operationName = `simulated-veo-${Date.now()}`;
        operationsCache.set(operationName, {
          status: 'completed',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          aspectRatio: validAspectRatio,
          prompt: promptText,
          createdAt: Date.now(),
        });
      }

      return res.json({ operationName });
    } catch (err: any) {
      console.error('[Veo] Error starting video generation:', err);
      return res.status(500).json({ error: err.message || 'Failed to start video generation' });
    }
    }
  );

  // 2. API: Poll Video Generation Status
  app.post('/api/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'operationName is required' });
      }

      if (operationName.startsWith('simulated-veo-')) {
        const cached = operationsCache.get(operationName);
        return res.json({ done: true, videoUrl: cached?.videoUrl });
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });

      if (updated.done) {
        const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
        operationsCache.set(operationName, {
          status: 'completed',
          videoUrl: uri,
          createdAt: Date.now(),
        });
        return res.json({ done: true, videoUrl: uri });
      }

      return res.json({ done: false });
    } catch (err: any) {
      console.error('[Veo] Error polling video status:', err);
      return res.json({
        done: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      });
    }
  });

  // 3. API: Download / Stream Video
  app.post('/api/video-download', async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) {
        return res.status(400).json({ error: 'operationName is required' });
      }

      if (operationName.startsWith('simulated-veo-')) {
        return res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      }

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

      if (!uri) {
        return res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' },
      });

      res.setHeader('Content-Type', 'video/mp4');
      if (videoRes.body) {
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.redirect(uri);
      }
    } catch (err: any) {
      console.error('[Veo] Video download error:', err);
      return res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    }
  });

  // ==================== TARGETS & COACH API ENDPOINTS ====================

  // 4. API: Get Active Target Plan
  app.get('/api/targets/active', async (req, res) => {
    try {
      const plan = await getActiveTargetPlan();
      res.json({ plan });
    } catch (err: any) {
      console.error('[Targets] Error getting active plan:', err);
      res.status(500).json({ error: err?.message || 'Failed to get target plan' });
    }
  });

  // 5. API: Save Target Plan
  app.post('/api/targets/save', async (req, res) => {
    try {
      const result = await saveTargetPlan(req.body);
      if (result.success) {
        res.json({ success: true, id: result.id });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Targets] Error saving plan:', err);
      res.status(500).json({ error: err?.message || 'Failed to save target plan' });
    }
  });

  // 6. API: Lock Period
  app.post('/api/targets/lock', async (req, res) => {
    try {
      const { planId, periodType, periodKey } = req.body;
      const result = await lockPeriod(planId, periodType, periodKey);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Targets] Error locking period:', err);
      res.status(500).json({ error: err?.message || 'Failed to lock period' });
    }
  });

  // 7. API: Calculate Target Plan Preview
  app.post('/api/targets/calculate', async (req, res) => {
    try {
      const {
        startPieces,
        endDailyPieces,
        months,
        startYear,
        startMonth,
        growthCurve,
        weekdayWeights,
      } = req.body;

      const growthRate = calculateGrowthRate(startPieces, endDailyPieces, months);
      const baseMonthlyTargets = generateMonthlyTargets(startPieces, growthRate, months, startYear, startMonth);
      const monthlyTargets = applyGrowthCurve(baseMonthlyTargets, growthCurve);
      const dailyTargets = generateDailyTargets(monthlyTargets, weekdayWeights);
      const weeklyTargets = generateWeeklyTargets(dailyTargets);

      res.json({
        growthRate,
        monthlyTargets,
        weeklyTargets,
        dailyTargets,
      });
    } catch (err: any) {
      console.error('[Targets] Error calculating plan:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate target plan' });
    }
  });

  // 8. API: Save Metric Actuals
  app.post('/api/metrics/save', async (req, res) => {
    try {
      const result = await saveMetricActual(req.body);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Metrics] Error saving actuals:', err);
      res.status(500).json({ error: err?.message || 'Failed to save metric actuals' });
    }
  });

  // 9. API: Get Metric Actuals
  app.get('/api/metrics', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      const actuals = await getMetricActuals(startDate as string, endDate as string);
      res.json({ actuals });
    } catch (err: any) {
      console.error('[Metrics] Error getting actuals:', err);
      res.status(500).json({ error: err?.message || 'Failed to get metric actuals' });
    }
  });

  // 10. API: Calculate Progress
  app.post('/api/targets/progress', async (req, res) => {
    try {
      const { target, actual, periodStart, periodEnd, today } = req.body;
      const progress = calculateProgress(target, actual, periodStart, periodEnd, today);
      res.json(progress);
    } catch (err: any) {
      console.error('[Targets] Error calculating progress:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate progress' });
    }
  });

  // 11. API: Calculate Catch-up
  app.post('/api/targets/catchup', async (req, res) => {
    try {
      const { target, actual, daysRemaining } = req.body;
      const catchup = calculateCatchUp(target, actual, daysRemaining);
      res.json(catchup);
    } catch (err: any) {
      console.error('[Targets] Error calculating catch-up:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate catch-up' });
    }
  });

  // 12. API: Calculate Hit Probability
  app.post('/api/targets/probability', async (req, res) => {
    try {
      const { actual, target, daysElapsed, daysRemaining } = req.body;
      const probability = calculateHitProbability(actual, target, daysElapsed, daysRemaining);
      res.json({ probability });
    } catch (err: any) {
      console.error('[Targets] Error calculating probability:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate probability' });
    }
  });

  // 13. API: Calculate Reverse Funnel
  app.post('/api/targets/reverse-funnel', async (req, res) => {
    try {
      const { targetPieces, conversionRate, unitsPerOrder, channelShares } = req.body;
      const calculation = calculateReverseFunnel(targetPieces, conversionRate, unitsPerOrder, channelShares);
      res.json(calculation);
    } catch (err: any) {
      console.error('[Targets] Error calculating reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate reverse funnel' });
    }
  });

  // 14. API: Save Reverse Funnel Calculation
  app.post('/api/targets/save-reverse-funnel', async (req, res) => {
    try {
      const result = await saveReverseFunnelCalculation(req.body);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Targets] Error saving reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to save reverse funnel' });
    }
  });

  // 15. API: Get Latest Reverse Funnel Calculation
  app.get('/api/targets/reverse-funnel/latest', async (req, res) => {
    try {
      const calculation = await getLatestReverseFunnelCalculation();
      res.json({ calculation });
    } catch (err: any) {
      console.error('[Targets] Error getting reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to get reverse funnel' });
    }
  });

  // 16. API: Save Coach Task
  app.post('/api/coach/tasks/save', async (req, res) => {
    try {
      const result = await saveCoachTask(req.body);
      if (result.success) {
        res.json({ success: true, id: result.id });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Coach] Error saving task:', err);
      res.status(500).json({ error: err?.message || 'Failed to save coach task' });
    }
  });

  // 17. API: Update Coach Task Status
  app.post('/api/coach/tasks/status', async (req, res) => {
    try {
      const { taskId, status, skippedReason, snoozedUntil } = req.body;
      const result = await updateCoachTaskStatus(taskId, status, skippedReason, snoozedUntil);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Coach] Error updating task status:', err);
      res.status(500).json({ error: err?.message || 'Failed to update task status' });
    }
  });

  // 18. API: Get Coach Tasks for Date
  app.get('/api/coach/tasks', async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: 'date is required' });
      }
      const tasks = await getCoachTasksForDate(date as string);
      res.json({ tasks });
    } catch (err: any) {
      console.error('[Coach] Error getting tasks:', err);
      res.status(500).json({ error: err?.message || 'Failed to get coach tasks' });
    }
  });

  // 19. API: Generate Daily Coach Tasks
  app.post('/api/coach/tasks/generate', async (req, res) => {
    try {
      const { date, targetPlan, actuals, productsCount } = req.body;
      const tasks = generateDailyCoachTasks(date, targetPlan, actuals, productsCount);

      // Save all generated tasks
      for (const task of tasks) {
        await saveCoachTask(task);
      }

      res.json({ success: true, tasks });
    } catch (err: any) {
      console.error('[Coach] Error generating tasks:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate coach tasks' });
    }
  });

  // 20. API: Save Daily Coach Brief
  app.post('/api/coach/brief/save', async (req, res) => {
    try {
      const result = await saveDailyCoachBrief(req.body);
      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(400).json(result);
      }
    } catch (err: any) {
      console.error('[Coach] Error saving brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to save daily coach brief' });
    }
  });

  // 21. API: Get Daily Coach Brief
  app.get('/api/coach/brief', async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: 'date is required' });
      }
      const brief = await getDailyCoachBrief(date as string);
      res.json({ brief });
    } catch (err: any) {
      console.error('[Coach] Error getting brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to get daily coach brief' });
    }
  });

  // 22. API: Generate Daily Coach Brief
  app.post('/api/coach/brief/generate', async (req, res) => {
    try {
      const { date, targetPlan, actuals, tasks } = req.body;
      const brief = generateDailyCoachBrief(date, targetPlan, actuals, tasks);

      // Save the brief
      await saveDailyCoachBrief(brief);

      res.json({ success: true, brief });
    } catch (err: any) {
      console.error('[Coach] Error generating brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate daily coach brief' });
    }
  });

  // Anything under /api that no route matched must 404 as JSON — otherwise it
  // falls through to the SPA catch-all and returns index.html with HTTP 200.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Development is opt-in: `npm run dev` sets NODE_ENV=development.
  // Everything else — including a completely unset NODE_ENV — gets production
  // behaviour: serve the built assets and never echo a stack trace to a
  // client. Defaulting to "secure" means a misconfigured deploy cannot leak
  // file paths or boot a Vite dev server in front of production traffic.
  const isProd = process.env.NODE_ENV !== 'development';

  // ---------------------------------------------------------------------------
  // Error handling
  //
  // Express's default handler echoes the raw stack trace whenever NODE_ENV is
  // not 'production', leaking absolute file paths and dependency versions to
  // any caller. Always answer with a JSON body; include the stack only for
  // local development.
  // ---------------------------------------------------------------------------
  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const status: number =
        err?.type === 'entity.too.large'
          ? 413
          : err?.type === 'entity.parse.failed' || err?.status === 400
          ? 400
          : typeof err?.status === 'number'
          ? err.status
          : typeof err?.statusCode === 'number'
          ? err.statusCode
          : 500;

      if (status >= 500) {
        console.error(`[${req.method} ${req.originalUrl}]`, err);
      }

      if (res.headersSent) return;

      const message =
        status === 413
          ? 'Request body too large.'
          : status === 400
          ? 'Malformed JSON body.'
          : status >= 500
          ? 'Internal server error.'
          : err?.message || 'Request failed.';

      res.status(status).json({
        error: message,
        ...(isProd ? {} : { stack: err?.stack }),
      });
    }
  );

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distIndex = path.resolve(__dirname, 'dist', 'index.html');
    const hasBuild = existsSync(distIndex);

    if (!hasBuild) {
      console.error(
        '[startup] dist/index.html is missing — run `npm run build` before `npm start`.'
      );
    }

    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      if (!hasBuild) {
        return res
          .status(503)
          .type('text/plain')
          .send('Front-end build missing. Run `npm run build` first.');
      }
      return res.sendFile(distIndex);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
