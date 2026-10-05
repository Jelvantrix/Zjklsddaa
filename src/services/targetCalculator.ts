import {
  TargetPlan,
  MonthlyTarget,
  WeeklyTarget,
  DailyTarget,
  GrowthCurve,
  MetricActual,
  ReverseFunnelCalculation,
  CoachTask,
  DailyCoachBrief,
} from '../types';

// ==================== TARGET PLANNER CALCULATIONS ====================

/**
 * Calculate growth rate based on start, end, and months
 * Formula: g = (end_daily * 30 / start)^(1/(months-1))
 */
export function calculateGrowthRate(
  startPieces: number,
  endDailyPieces: number,
  months: number
): number {
  if (months <= 1) return 1;
  const totalEnd = endDailyPieces * 30;
  return Math.pow(totalEnd / startPieces, 1 / (months - 1));
}

/**
 * Generate monthly targets using geometric growth
 * Formula: target_m = round(start * g^(m-1))
 */
export function generateMonthlyTargets(
  startPieces: number,
  growthRate: number,
  months: number,
  startYear: number,
  startMonth: number
): MonthlyTarget[] {
  const targets: MonthlyTarget[] = [];

  for (let m = 0; m < months; m++) {
    const targetPieces = Math.round(startPieces * Math.pow(growthRate, m));

    // Calculate month/year
    const monthNum = ((startMonth - 1 + m) % 12) + 1;
    const yearNum = startYear + Math.floor((startMonth - 1 + m) / 12);

    targets.push({
      month: monthNum,
      year: yearNum,
      piecesTarget: targetPieces,
      ordersTarget: Math.round(targetPieces / 1.3), // Assume 1.3 units/order
      revenueTarget: Math.round(targetPieces * 280 * 100), // Assume 280 EUR average, convert to cents
      sessionsTarget: Math.round(targetPieces / 0.015), // Assume 1.5% conversion
      visitorsTarget: Math.round(targetPieces / 0.015 / 1.35), // Assume 1.35 sessions/visitor
      conversionRateTarget: 0.015,
      aovTarget: 280 * 100,
      newCustomersTarget: Math.round(targetPieces * 0.7), // Assume 70% new customers
      emailSubscribersTarget: Math.round(targetPieces * 0.5),
      productsListedTarget: Math.round(50 + m * 5), // Gradual catalog growth
      contentPostsTarget: Math.round(4 + m * 0.5),
      adSpendTarget: Math.round(targetPieces * 280 * 0.2 * 100), // 20% of revenue
      roasTarget: 3.0,
      // Actuals start at 0
      piecesActual: 0,
      ordersActual: 0,
      revenueActual: 0,
      sessionsActual: 0,
      visitorsActual: 0,
      conversionRateActual: 0,
      aovActual: 0,
      newCustomersActual: 0,
      emailSubscribersActual: 0,
      productsListedActual: 0,
      contentPostsActual: 0,
      adSpendActual: 0,
      roasActual: 0,
      pace: 'on_track',
      gap: targetPieces,
      dailyAverageNeeded: Math.round(targetPieces / 30),
      isLocked: false,
    });
  }

  return targets;
}

/**
 * Apply growth curve type to monthly targets
 */
export function applyGrowthCurve(
  baseTargets: MonthlyTarget[],
  curveType: GrowthCurve
): MonthlyTarget[] {
  if (curveType === 'geometric') return baseTargets;

  const targets = [...baseTargets];
  const totalPieces = baseTargets.reduce((sum, t) => sum + t.piecesTarget, 0);
  const avgPieces = totalPieces / baseTargets.length;

  switch (curveType) {
    case 'linear':
      // Linear progression from start to end
      const start = baseTargets[0].piecesTarget;
      const end = baseTargets[baseTargets.length - 1].piecesTarget;
      const step = (end - start) / (baseTargets.length - 1);
      targets.forEach((t, i) => {
        t.piecesTarget = Math.round(start + step * i);
      });
      break;

    case 's_curve':
      // S-curve: slow start, fast middle, slow end
      const mid = Math.floor(baseTargets.length / 2);
      targets.forEach((t, i) => {
        const progress = i / (baseTargets.length - 1);
        const sCurve = 1 / (1 + Math.exp(-10 * (progress - 0.5)));
        t.piecesTarget = Math.round(avgPieces * (0.5 + sCurve));
      });
      break;

    case 'step_ladder':
      // Step growth: same for 3 months, then jump
      targets.forEach((t, i) => {
        const step = Math.floor(i / 3);
        t.piecesTarget = Math.round(start * Math.pow(1.5, step));
      });
      break;

    case 'custom':
      // Custom curves are set manually by user
      break;
  }

  return targets;
}

/**
 * Apply weekday weights to daily targets
 */
export function generateDailyTargets(
  monthlyTargets: MonthlyTarget[],
  weekdayWeights: {
    sunday: number;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
  }
): DailyTarget[] {
  const dailyTargets: DailyTarget[] = [];

  monthlyTargets.forEach((month) => {
    const daysInMonth = new Date(month.year, month.month, 0).getDate();
    const weightSum = Object.values(weekdayWeights).reduce((a, b) => a + b, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.year, month.month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      const weightMap = [
        weekdayWeights.sunday,
        weekdayWeights.monday,
        weekdayWeights.tuesday,
        weekdayWeights.wednesday,
        weekdayWeights.thursday,
        weekdayWeights.friday,
        weekdayWeights.saturday,
      ];

      const weight = weightMap[dayOfWeek];
      const baseDaily = month.piecesTarget / weightSum;
      const targetPieces = Math.round(baseDaily * weight);

      dailyTargets.push({
        date: dateStr,
        piecesTarget: targetPieces,
        piecesActual: 0,
        sessionsTarget: Math.round(targetPieces / 0.015),
        sessionsActual: 0,
        ordersTarget: Math.round(targetPieces / 1.3),
        ordersActual: 0,
        revenueTarget: Math.round(targetPieces * 280 * 100),
        revenueActual: 0,
        weekdayWeight: weight,
        isHoliday: false,
        isDropDay: false,
        pace: 'on_track',
      });
    }
  });

  return dailyTargets;
}

/**
 * Generate weekly targets from daily targets
 */
export function generateWeeklyTargets(dailyTargets: DailyTarget[]): WeeklyTarget[] {
  const weeklyMap = new Map<string, WeeklyTarget>();

  dailyTargets.forEach((day) => {
    const date = new Date(day.date);
    const week = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-w${week}`;

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        week,
        year: date.getFullYear(),
        startDate: day.date,
        endDate: day.date,
        piecesTarget: 0,
        piecesActual: 0,
        pace: 'on_track',
        gap: 0,
      });
    }

    const weekTarget = weeklyMap.get(weekKey)!;
    weekTarget.piecesTarget += day.piecesTarget;
    weekTarget.piecesActual += day.piecesActual;
    weekTarget.endDate = day.date;
  });

  return Array.from(weeklyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ==================== PROGRESS & PACING ====================

/**
 * Calculate progress and pace for a period
 */
export function calculateProgress(
  target: number,
  actual: number,
  periodStart: string,
  periodEnd: string,
  today: string
): {
  pace: 'ahead' | 'on_track' | 'behind';
  gap: number;
  percentage: number;
  expectedByNow: number;
} {
  const totalDays = getDaysBetween(periodStart, periodEnd);
  const daysElapsed = getDaysBetween(periodStart, today);
  const daysRemaining = totalDays - daysElapsed;

  const expectedByNow = Math.round((target * daysElapsed) / totalDays);
  const gap = actual - expectedByNow;
  const percentage = Math.round((actual / target) * 100);

  let pace: 'ahead' | 'on_track' | 'behind';
  if (gap >= target * 0.05) {
    pace = 'ahead';
  } else if (gap <= -target * 0.05) {
    pace = 'behind';
  } else {
    pace = 'on_track';
  }

  return { pace, gap, percentage, expectedByNow };
}

/**
 * Calculate catch-up: what daily rate is needed to hit target
 */
export function calculateCatchUp(
  target: number,
  actual: number,
  daysRemaining: number
): { dailyNeeded: number; isAchievable: boolean } {
  if (daysRemaining <= 0) {
    return { dailyNeeded: target - actual, isAchievable: false };
  }

  const dailyNeeded = Math.ceil((target - actual) / daysRemaining);
  const isAchievable = dailyNeeded <= target * 0.5; // Reasonable threshold

  return { dailyNeeded, isAchievable };
}

/**
 * Calculate probability of hitting target using Poisson model
 */
export function calculateHitProbability(
  actual: number,
  target: number,
  daysElapsed: number,
  daysRemaining: number
): number {
  if (daysRemaining <= 0) {
    return actual >= target ? 100 : 0;
  }

  const dailyRate = actual / Math.max(1, daysElapsed);
  const expectedRemaining = dailyRate * daysRemaining;
  const projectedTotal = actual + expectedRemaining;

  // Simple probability based on projection
  const probability = Math.min(100, Math.max(0, (projectedTotal / target) * 100));

  return Math.round(probability);
}

/**
 * Get days between two date strings (YYYY-MM-DD)
 */
function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ==================== REVERSE FUNNEL CALCULATOR ====================

/**
 * Calculate reverse funnel from pieces target
 */
export function calculateReverseFunnel(
  targetPieces: number,
  conversionRate: number,
  unitsPerOrder: number,
  channelShares: Array<{ channel: string; share: number }>
): ReverseFunnelCalculation {
  const targetOrders = Math.ceil(targetPieces / unitsPerOrder);
  const targetSessions = Math.ceil(targetOrders / conversionRate);
  const visitorsPerSession = 1.35;
  const targetVisitors = Math.ceil(targetSessions / visitorsPerSession);

  const channelBreakdown = channelShares.map((ch) => ({
    channel: ch.channel,
    share: ch.share,
    requiredSessions: Math.ceil(targetSessions * (ch.share / 100)),
    requiredVisitors: Math.ceil(targetVisitors * (ch.share / 100)),
  }));

  const funnelSteps: ReverseFunnelCalculation['funnelSteps'] = [
    {
      stepName: 'Visitors',
      rate: visitorsPerSession,
      benchmark: 1.35,
      actual: 1.35,
      gap: 0,
    },
    {
      stepName: 'Sessions',
      rate: 1.0,
      benchmark: 1.0,
      actual: 1.0,
      gap: 0,
    },
    {
      stepName: 'Product View',
      rate: 0.65,
      benchmark: 0.65,
      actual: 0.65,
      gap: 0,
    },
    {
      stepName: 'Add to Bag',
      rate: 0.08,
      benchmark: 0.08,
      actual: 0.08,
      gap: 0,
    },
    {
      stepName: 'Checkout Start',
      rate: 0.7,
      benchmark: 0.7,
      actual: 0.7,
      gap: 0,
    },
    {
      stepName: 'Purchase',
      rate: conversionRate,
      benchmark: 0.015,
      actual: conversionRate,
      gap: conversionRate - 0.015,
    },
  ];

  // Find bottleneck (step with largest negative gap)
  const bottleneck = funnelSteps.reduce((worst, step) => {
    if (step.gap < worst.gap) {
      return {
        stepName: step.stepName,
        gap: step.gap,
        impact: Math.round(Math.abs(step.gap) * targetPieces),
      };
    }
    return worst;
  }, { stepName: 'None', gap: 0, impact: 0 });

  const sensitivityAnalysis = [
    {
      metric: 'Conversion Rate',
      currentValue: conversionRate,
      improvedValue: conversionRate + 0.005,
      sessionsSaved: Math.ceil(targetOrders / (conversionRate + 0.005)) - targetSessions,
    },
    {
      metric: 'Units per Order',
      currentValue: unitsPerOrder,
      improvedValue: unitsPerOrder + 0.1,
      sessionsSaved: Math.ceil(targetPieces / (unitsPerOrder + 0.1) / conversionRate) - targetSessions,
    },
  ];

  return {
    targetPieces,
    unitsPerOrder,
    targetOrders,
    conversionRate,
    targetSessions,
    visitorsPerSession,
    targetVisitors,
    channelBreakdown,
    funnelSteps,
    bottleneck,
    sensitivityAnalysis,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== DAILY COACH TASK GENERATION ====================

/**
 * Generate daily coach tasks based on targets and actuals
 */
export function generateDailyCoachTasks(
  date: string,
  targetPlan: TargetPlan | null,
  actuals: MetricActual[],
  productsCount: number
): CoachTask[] {
  const tasks: CoachTask[] = [];
  const todayTarget = targetPlan?.dailyTargets.find((d) => d.date === date);
  const todayActual = actuals.find((a) => a.date === date);

  if (!todayTarget) return tasks;

  const piecesGap = todayTarget.piecesTarget - (todayActual?.piecesSold || 0);
  // targetPlan may be null, so the optional chain can yield undefined —
  // coerce before subtracting (the old form would have produced NaN).
  const productsGap = (targetPlan?.catalogTarget.targetCount ?? 0) - productsCount || 0;

  // D-004: Auto-generated "List N products today" task
  if (productsGap > 0) {
    tasks.push({
      id: '',
      date,
      title: `List ${Math.min(3, productsGap)} new products today`,
      family: 'catalog',
      status: 'pending',
      priority: 'high',
      reason: `Catalog target: ${productsGap} products remaining to reach ${targetPlan?.catalogTarget.targetCount} by ${targetPlan?.catalogTarget.totalProductsByDate}`,
      expectedImpact: {
        pieces: Math.round(3 * 0.5), // Assume 0.5 sales per new product
        description: '+1-2 pieces from new product visibility',
      },
      effortMinutes: 45,
      deepLink: { type: 'product', targetId: 'new' },
      autoGenerated: true,
      position: tasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // D-005: Auto-generated shipping tasks
  const pendingOrders = todayActual?.orders || 0;
  if (pendingOrders > 0) {
    tasks.push({
      id: '',
      date,
      title: `Ship ${pendingOrders} orders before 14:00`,
      family: 'operations',
      status: 'pending',
      priority: 'high',
      reason: `${pendingOrders} orders ready for fulfilment`,
      expectedImpact: {
        description: 'Maintain shipping SLA and customer satisfaction',
      },
      effortMinutes: pendingOrders * 10,
      deepLink: { type: 'order', targetId: 'pending' },
      autoGenerated: true,
      position: tasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Behind pace task
  if (piecesGap > 0 && todayActual) {
    const progress = calculateProgress(
      todayTarget.piecesTarget,
      todayActual.piecesSold,
      date,
      date,
      date
    );

    if (progress.pace === 'behind') {
      tasks.push({
        id: '',
        date,
        title: `Catch up: ${piecesGap} pieces behind target`,
        family: 'traffic',
        status: 'pending',
        priority: 'high',
        reason: `Daily target: ${todayTarget.piecesTarget} pieces, sold: ${todayActual.piecesSold}`,
        expectedImpact: {
          pieces: piecesGap,
          description: `Close ${piecesGap} piece gap`,
        },
        effortMinutes: 60,
        deepLink: { type: 'analytics', targetId: 'traffic' },
        autoGenerated: true,
        position: tasks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Content task
  const contentGap = (targetPlan?.monthlyTargets.find((m) => m.month === new Date(date).getMonth() + 1)?.contentPostsTarget || 4) - (todayActual?.contentPostsPublished || 0);
  if (contentGap > 0) {
    tasks.push({
      id: '',
      date,
      title: `Publish ${Math.min(1, contentGap)} social media post`,
      family: 'content',
      status: 'pending',
      priority: 'medium',
      reason: `Content target: ${contentGap} posts remaining this month`,
      expectedImpact: {
        description: '+5-10% traffic from social channels',
      },
      effortMinutes: 30,
      deepLink: { type: 'campaign', targetId: 'social' },
      autoGenerated: true,
      position: tasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return tasks;
}

/**
 * Generate daily coach brief
 */
export function generateDailyCoachBrief(
  date: string,
  targetPlan: TargetPlan | null,
  actuals: MetricActual[],
  tasks: CoachTask[]
): DailyCoachBrief {
  const todayTarget = targetPlan?.dailyTargets.find((d) => d.date === date);
  const todayActual = actuals.find((a) => a.date === date);

  const target = {
    pieces: todayTarget?.piecesTarget || 0,
    orders: todayTarget?.ordersTarget || 0,
    revenue: todayTarget?.revenueTarget || 0,
  };

  const actual = {
    pieces: todayActual?.piecesSold || 0,
    orders: todayActual?.orders || 0,
    revenue: todayActual?.revenue || 0,
  };

  const progress = calculateProgress(
    target.pieces,
    actual.pieces,
    date,
    date,
    date
  );

  const hitProbability = calculateHitProbability(
    actual.pieces,
    target.pieces,
    1,
    0
  );

  const totalEffortMinutes = tasks.reduce((sum, t) => sum + t.effortMinutes, 0);
  const topPriorities = tasks.filter((t) => t.priority === 'high').slice(0, 3).map((t) => t.id);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const dailyScore = Math.round((doneTasks.length / Math.max(1, tasks.length)) * 100);

  return {
    date,
    target,
    actual,
    pace: progress.pace,
    gap: progress.gap,
    probabilityOfHitting: hitProbability,
    tasks,
    totalEffortMinutes,
    topPriorities,
    riskPanel: [],
    opportunityPanel: [],
    winsPanel: [],
    dailyScore,
    streak: 0, // TODO: calculate from historical data
    carryOverCount: pendingTasks.length,
    generatedAt: new Date().toISOString(),
  };
}
