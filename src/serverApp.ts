import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
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
} from './supabase/targetsService';
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
} from './services/targetCalculator';
import { supabase, isServiceClient } from './supabase/config';

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
function parseJson(req: express.Request, res: express.Response, next: express.NextFunction) {
  const limit = req.path === '/api/generate-video' ? '15mb' : '512kb';
  express.json({ limit, strict: false })(req, res, next);
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const GENERAL_RATE_MAX = 120;
const UPLOAD_RATE_MAX = 10;
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
    console.error(
      '[auth] Refusing /api access: SUPABASE_SERVICE_ROLE_KEY is not configured on the server.'
    );
    return res.status(503).json({
      error: 'Backend authentication service unavailable.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty bearer token.' });
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const email = userData.user.email.toLowerCase().trim();

    const { data: adminRow, error: adminError } = await supabase
      .from('admins')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle();

    if (adminError || !adminRow) {
      return res.status(403).json({
        error: 'Forbidden: authenticated user is not an administrator.',
      });
    }

    (req as AuthedRequest).admin = adminRow;
    return next();
  } catch (err) {
    console.error('[auth] Verification failed unexpectedly:', err);
    return res.status(500).json({ error: 'Failed to verify authentication.' });
  }
}

// ---------------------------------------------------------------------------
// Application Setup
// ---------------------------------------------------------------------------
export function createExpressApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  }

  app.use(parseJson);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.use('/api', rateLimit(GENERAL_RATE_MAX, 'api'));
  app.use('/api', requireAdmin);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const operationsCache = new Map<
    string,
    {
      status: 'pending' | 'completed' | 'failed';
      videoUrl?: string;
      error?: string;
      aspectRatio?: string;
    }
  >();

  // POST /api/generate-video
  app.post(
    '/api/generate-video',
    rateLimit(UPLOAD_RATE_MAX, 'video-gen'),
    async (req, res) => {
      try {
        const { imageBase64, prompt, aspectRatio = '16:9' } = req.body;

        if (!imageBase64) {
          return res.status(400).json({ error: 'Image data is required' });
        }

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageMimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

        const enhancedPrompt = `${prompt || 'Cinematic haute couture fashion movement'}. Slow fluid motion, photorealistic fabric physics, high resolution, minimalist Scandinavian architectural studio background, dramatic studio lighting, 24fps.`;

        let operation: GenerateVideosOperation;

        try {
          operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-001',
            prompt: enhancedPrompt,
            image: {
              imageBytes: cleanBase64,
              mimeType: imageMimeType,
            },
            config: {
              aspectRatio: aspectRatio as '16:9' | '9:16',
              numberOfVideos: 1,
            },
          });
        } catch (apiErr: any) {
          console.warn('Veo 3.1 video generation request failed:', apiErr);
          return res.status(502).json({
            error: apiErr?.message || 'Video generation service unavailable.',
          });
        }

        if (!operation.name) {
          return res.status(500).json({ error: 'Failed to initialize video generation' });
        }

        operationsCache.set(operation.name, {
          status: 'pending',
          aspectRatio,
        });

        res.json({
          operationName: operation.name,
          status: 'pending',
          message: 'Video generation initiated with Veo 3.1 Fast',
        });
      } catch (err: any) {
        console.error('Error starting video generation:', err);
        res.status(500).json({ error: err?.message || 'Video generation failed' });
      }
    }
  );

  // POST /api/video-status
  app.post('/api/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;

      if (!operationName) {
        return res.status(400).json({ error: 'Operation name is required' });
      }

      let operation = new GenerateVideosOperation();
      operation.name = operationName;

      try {
        operation = await ai.operations.getVideosOperation({
          operation,
        });
      } catch (pollErr: any) {
        console.warn('Failed to poll video operation:', pollErr);
        return res.status(502).json({ error: 'Failed to poll video generation status' });
      }

      if (operation.done) {
        if (operation.error) {
          operationsCache.set(operationName, {
            status: 'failed',
            error: String(operation.error.message || 'Video generation failed'),
          });

          return res.json({
            done: true,
            status: 'failed',
            error: operation.error.message,
          });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (videoUri) {
          operationsCache.set(operationName, {
            status: 'completed',
            videoUrl: videoUri,
          });

          return res.json({
            done: true,
            status: 'completed',
            videoUrl: videoUri,
          });
        }
      }

      res.json({
        done: false,
        status: 'pending',
      });
    } catch (err: any) {
      console.error('Error checking video status:', err);
      res.status(500).json({ error: err?.message || 'Failed to check status' });
    }
  });

  // POST /api/video-download
  app.post('/api/video-download', async (req, res) => {
    try {
      const { videoUri } = req.body;

      if (!videoUri) {
        return res.status(400).json({ error: 'Video URI is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server misconfigured: missing GEMINI_API_KEY' });
      }

      let parsed: URL;
      try {
        parsed = new URL(videoUri);
      } catch {
        return res.status(400).json({ error: 'Invalid video URI' });
      }

      const allowedHosts = ['generativelanguage.googleapis.com'];
      if (!allowedHosts.includes(parsed.hostname)) {
        return res.status(400).json({ error: 'Invalid video host' });
      }

      const separator = videoUri.includes('?') ? '&' : '?';
      const authenticatedUri = `${videoUri}${separator}key=${process.env.GEMINI_API_KEY}`;

      const response = await fetch(authenticatedUri);

      if (!response.ok) {
        throw new Error(`Failed to fetch video from upstream (${response.status})`);
      }

      const buffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="zejesh-couture-motion.mp4"');
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error('Error proxying video download:', err);
      res.status(500).json({ error: err?.message || 'Download failed' });
    }
  });

  // TARGETS SYSTEM API ROUTES
  app.get('/api/targets/active', async (req, res) => {
    try {
      const plan = await getActiveTargetPlan();
      res.json({ success: true, plan });
    } catch (err: any) {
      console.error('[Targets API] Error getting active plan:', err);
      res.status(500).json({ error: err?.message || 'Failed to get active plan' });
    }
  });

  app.post('/api/targets/save', async (req, res) => {
    try {
      const { plan } = req.body;
      if (!plan) return res.status(400).json({ error: 'Plan data required' });

      const planId = await saveTargetPlan(plan);
      res.json({ success: true, planId });
    } catch (err: any) {
      console.error('[Targets API] Error saving plan:', err);
      res.status(500).json({ error: err?.message || 'Failed to save plan' });
    }
  });

  app.post('/api/targets/lock', async (req, res) => {
    try {
      const { planId, periodType, periodKey } = req.body;
      if (!planId || !periodType || !periodKey) {
        return res.status(400).json({ error: 'Missing lock parameters' });
      }

      await lockPeriod(planId, periodType, periodKey);
      res.json({ success: true, message: `Period ${periodKey} locked` });
    } catch (err: any) {
      console.error('[Targets API] Error locking period:', err);
      res.status(500).json({ error: err?.message || 'Failed to lock period' });
    }
  });

  app.post('/api/targets/calculate', async (req, res) => {
    try {
      const { annualTarget, baselineRevenue, months = 12, startYear, startMonth } = req.body;

      if (!annualTarget || !baselineRevenue) {
        return res.status(400).json({ error: 'Annual target and baseline revenue required' });
      }

      const growthRate = calculateGrowthRate(baselineRevenue, annualTarget, months);
      const monthlyTargets = generateMonthlyTargets(
        annualTarget,
        growthRate,
        months,
        startYear || new Date().getFullYear(),
        startMonth || 1
      );

      res.json({
        success: true,
        calculation: {
          growthRate,
          monthlyTargets,
        },
      });
    } catch (err: any) {
      console.error('[Targets API] Error calculating targets:', err);
      res.status(500).json({ error: err?.message || 'Calculation failed' });
    }
  });

  app.post('/api/metrics/save', async (req, res) => {
    try {
      const { actual } = req.body;
      if (!actual) return res.status(400).json({ error: 'Actual metric data required' });

      await saveMetricActual(actual);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Targets API] Error saving metric:', err);
      res.status(500).json({ error: err?.message || 'Failed to save metric' });
    }
  });

  app.get('/api/metrics', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end date required' });
      }

      const actuals = await getMetricActuals(String(startDate), String(endDate));
      res.json({ success: true, actuals });
    } catch (err: any) {
      console.error('[Targets API] Error getting metrics:', err);
      res.status(500).json({ error: err?.message || 'Failed to get metrics' });
    }
  });

  app.post('/api/targets/progress', async (req, res) => {
    try {
      const { target, actual, periodStart, periodEnd, today } = req.body;
      const now = new Date().toISOString().split('T')[0];
      const progress = calculateProgress(
        target || 0,
        actual || 0,
        periodStart || now,
        periodEnd || now,
        today || now
      );
      res.json({ success: true, progress });
    } catch (err: any) {
      console.error('[Targets API] Error calculating progress:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate progress' });
    }
  });

  app.post('/api/targets/catchup', async (req, res) => {
    try {
      const { target, actual, remainingDays = 30 } = req.body;
      const catchUp = calculateCatchUp(target || 0, actual || 0, remainingDays);
      res.json({ success: true, catchUp });
    } catch (err: any) {
      console.error('[Targets API] Error calculating catch-up:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate catch-up' });
    }
  });

  app.post('/api/targets/probability', async (req, res) => {
    try {
      const { actual = 0, target = 1, daysElapsed = 1, daysRemaining = 30 } = req.body;
      const probability = calculateHitProbability(actual, target, daysElapsed, daysRemaining);
      res.json({ success: true, probability });
    } catch (err: any) {
      console.error('[Targets API] Error calculating probability:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate probability' });
    }
  });

  app.post('/api/targets/reverse-funnel', async (req, res) => {
    try {
      const { targetPieces = 100, conversionRate = 0.015, unitsPerOrder = 1.3, channelShares = [] } = req.body;
      const calculation = calculateReverseFunnel(targetPieces, conversionRate, unitsPerOrder, channelShares);
      res.json({ success: true, calculation });
    } catch (err: any) {
      console.error('[Targets API] Error calculating reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to calculate reverse funnel' });
    }
  });

  app.post('/api/targets/save-reverse-funnel', async (req, res) => {
    try {
      const { calculation } = req.body;
      if (!calculation) return res.status(400).json({ error: 'Calculation data required' });

      await saveReverseFunnelCalculation(calculation);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Targets API] Error saving reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to save reverse funnel' });
    }
  });

  app.get('/api/targets/reverse-funnel/latest', async (req, res) => {
    try {
      const calculation = await getLatestReverseFunnelCalculation();
      res.json({ success: true, calculation });
    } catch (err: any) {
      console.error('[Targets API] Error getting latest reverse funnel:', err);
      res.status(500).json({ error: err?.message || 'Failed to get reverse funnel' });
    }
  });

  app.post('/api/coach/tasks/save', async (req, res) => {
    try {
      const { task } = req.body;
      if (!task) return res.status(400).json({ error: 'Task data required' });

      await saveCoachTask(task);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Coach] Error saving task:', err);
      res.status(500).json({ error: err?.message || 'Failed to save task' });
    }
  });

  app.post('/api/coach/tasks/status', async (req, res) => {
    try {
      const { taskId, status } = req.body;
      if (!taskId || !status) return res.status(400).json({ error: 'Task ID and status required' });

      await updateCoachTaskStatus(taskId, status);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Coach] Error updating task status:', err);
      res.status(500).json({ error: err?.message || 'Failed to update task status' });
    }
  });

  app.get('/api/coach/tasks', async (req, res) => {
    try {
      const { date } = req.query;
      const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];

      const tasks = await getCoachTasksForDate(targetDate);
      res.json({ success: true, tasks });
    } catch (err: any) {
      console.error('[Coach] Error getting tasks:', err);
      res.status(500).json({ error: err?.message || 'Failed to get tasks' });
    }
  });

  app.post('/api/coach/tasks/generate', async (req, res) => {
    try {
      const { date, gap, criticalMetrics, focusArea } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];

      const tasks = generateDailyCoachTasks(targetDate, gap || 0, criticalMetrics || [], focusArea);

      for (const task of tasks) {
        await saveCoachTask(task);
      }

      res.json({ success: true, tasks });
    } catch (err: any) {
      console.error('[Coach] Error generating tasks:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate tasks' });
    }
  });

  app.post('/api/coach/brief/save', async (req, res) => {
    try {
      const { brief } = req.body;
      if (!brief) return res.status(400).json({ error: 'Brief data required' });

      await saveDailyCoachBrief(brief);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Coach] Error saving brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to save brief' });
    }
  });

  app.get('/api/coach/brief', async (req, res) => {
    try {
      const { date } = req.query;
      const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];

      const brief = await getDailyCoachBrief(targetDate);
      res.json({ success: true, brief });
    } catch (err: any) {
      console.error('[Coach] Error getting brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to get brief' });
    }
  });

  app.post('/api/coach/brief/generate', async (req, res) => {
    try {
      const { date, targetPlan, actuals, tasks } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];

      const brief = generateDailyCoachBrief(
        targetDate,
        targetPlan || null,
        actuals || [],
        tasks || []
      );

      await saveDailyCoachBrief(brief);

      res.json({ success: true, brief });
    } catch (err: any) {
      console.error('[Coach] Error generating brief:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate daily coach brief' });
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  const isProd = process.env.NODE_ENV !== 'development';

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

  return app;
}

export const app = createExpressApp();
export default app;
