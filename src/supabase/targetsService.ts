import { supabase } from './config';
import {
  TargetPlan,
  MetricActual,
  CoachTask,
  DailyCoachBrief,
  ReverseFunnelCalculation,
} from '../types';
import { logAuditEvent } from './dbService';

/** Mirrors the old Firebase `Unsubscribe` signature. */
export type Unsubscribe = () => void;

// ==================== TARGET PLANNER ====================

/**
 * Create or update a Target Plan
 */
export async function saveTargetPlan(
  plan: Omit<TargetPlan, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const planId = plan.id || `target-plan-${Date.now()}`;

    const { data: existingRow, error: readError } = await supabase
      .from('targetPlans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (readError) throw readError;

    let version = 1;
    let changeHistory: TargetPlan['changeHistory'] = [];

    if (existingRow) {
      const existing = existingRow as TargetPlan;
      version = (existing.version || 1) + 1;
      changeHistory = existing.changeHistory || [];

      // Record this change
      changeHistory.push({
        version,
        changedAt: new Date().toISOString(),
        changedBy: 'system', // TODO: replace with actual user ID
        reason: 'Target plan updated',
        changes: {
          previous: {
            startPieces: existing.yearlyTarget.pieces,
            endDailyPieces: existing.dailyTargets[0]?.piecesTarget || 0,
          },
          new: {
            startPieces: plan.yearlyTarget.pieces,
            endDailyPieces: plan.dailyTargets[0]?.piecesTarget || 0,
          },
        },
      } as any);
    }

    const fullPlan: TargetPlan = {
      ...plan,
      id: planId,
      version,
      changeHistory,
      createdAt: existingRow ? (existingRow as TargetPlan).createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from('targetPlans').upsert(fullPlan);
    if (upsertError) throw upsertError;

    await logAuditEvent('admin', 'target_plan_saved', planId, {
      version,
      totalPieces: plan.yearlyTarget.pieces,
    });

    return { success: true, id: planId };
  } catch (err: any) {
    console.error('Failed to save target plan:', err);
    return { success: false, error: err?.message || 'Failed to save target plan' };
  }
}

/**
 * Get the active target plan
 */
export async function getActiveTargetPlan(): Promise<TargetPlan | null> {
  try {
    const { data, error } = await supabase
      .from('targetPlans')
      .select('*')
      .eq('isActive', true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return { ...(data as TargetPlan), id: (data as any).id } as TargetPlan;
  } catch (err) {
    console.error('Failed to get active target plan:', err);
    return null;
  }
}

/**
 * Subscribe to the active target plan
 */
export function subscribeToActiveTargetPlan(
  onPlan: (plan: TargetPlan | null) => void
): Unsubscribe {
  let active = true;

  const load = async () => {
    if (!active) return;
    const plan = await getActiveTargetPlan();
    if (active) onPlan(plan);
  };

  try {
    const channel = supabase
      .channel('active-target-plan-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'targetPlans' },
        () => {
          load();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && active) onPlan(null);
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  } catch {
    onPlan(null);
    return () => {
      active = false;
    };
  }
}

/**
 * Lock a past period to prevent history rewriting (T-012)
 */
export async function lockPeriod(
  planId: string,
  periodType: 'monthly' | 'weekly' | 'daily',
  periodKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: planSnap, error: readError } = await supabase
      .from('targetPlans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (readError) throw readError;
    if (!planSnap) {
      return { success: false, error: 'Target plan not found' };
    }

    const plan = planSnap as TargetPlan;

    if (periodType === 'monthly') {
      const monthTarget = plan.monthlyTargets.find((m) => `${m.year}-${m.month}` === periodKey);
      if (monthTarget) {
        monthTarget.isLocked = true;
      }
    } else if (periodType === 'weekly') {
      const weekTarget = plan.weeklyTargets.find((w) => `${w.year}-w${w.week}` === periodKey);
      if (weekTarget) {
        // Weekly targets don't have isLocked in current schema, add if needed
      }
    } else if (periodType === 'daily') {
      const dayTarget = plan.dailyTargets.find((d) => d.date === periodKey);
      if (dayTarget) {
        // Daily targets don't have isLocked in current schema, add if needed
      }
    }

    const { error: updateError } = await supabase
      .from('targetPlans')
      .update({
        [`${periodType}Targets`]: periodType === 'monthly' ? plan.monthlyTargets : plan.weeklyTargets,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', planId);
    if (updateError) throw updateError;

    await logAuditEvent('admin', 'period_locked', planId, {
      periodType,
      periodKey,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to lock period:', err);
    return { success: false, error: err?.message || 'Failed to lock period' };
  }
}

// ==================== METRICS ACTUALS ====================

/**
 * Save metric actuals for a day
 */
export async function saveMetricActual(
  actual: Omit<MetricActual, 'isDemo'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const date = actual.date;
    const id = `metric-${date}`;
    const fullActual: MetricActual & { id: string } = {
      ...actual,
      id,
      isDemo: false, // Production rows are never flagged
    };

    const { error } = await supabase.from('metricActuals').upsert(fullActual);
    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save metric actual:', err);
    return { success: false, error: err?.message || 'Failed to save metric actual' };
  }
}

/**
 * Get metric actuals for a date range
 */
export async function getMetricActuals(
  startDate: string,
  endDate: string
): Promise<MetricActual[]> {
  try {
    const { data, error } = await supabase
      .from('metricActuals')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    const items: MetricActual[] = [];
    (data || []).forEach((row: any) => {
      // Filter out non-production rows
      if (!row.isDemo) {
        items.push({ ...row, id: row.id });
      }
    });

    return items;
  } catch (err) {
    console.error('Failed to get metric actuals:', err);
    return [];
  }
}

/**
 * Subscribe to metric actuals for a date range
 */
export function subscribeToMetricActuals(
  startDate: string,
  endDate: string,
  onActuals: (actuals: MetricActual[]) => void
): Unsubscribe {
  let active = true;

  const load = async () => {
    if (!active) return;
    const items = await getMetricActuals(startDate, endDate);
    if (active) onActuals(items);
  };

  try {
    const channel = supabase
      .channel('metric-actuals-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metricActuals' },
        () => {
          load();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && active) onActuals([]);
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  } catch {
    onActuals([]);
    return () => {
      active = false;
    };
  }
}

// ==================== DAILY COACH ====================

/**
 * Save a coach task
 */
export async function saveCoachTask(
  task: Omit<CoachTask, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const taskId = task.id || `task-${Date.now()}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const fullTask: CoachTask = {
      ...task,
      id: taskId,
      createdAt: (task as { createdAt?: string }).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('coachTasks').upsert(fullTask);
    if (error) throw error;

    await logAuditEvent('admin', 'coach_task_saved', taskId, {
      title: task.title,
      family: task.family,
    });

    return { success: true, id: taskId };
  } catch (err: any) {
    console.error('Failed to save coach task:', err);
    return { success: false, error: err?.message || 'Failed to save coach task' };
  }
}

/**
 * Update coach task status
 */
export async function updateCoachTaskStatus(
  taskId: string,
  status: CoachTask['status'],
  skippedReason?: string,
  snoozedUntil?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: Partial<CoachTask> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'done') {
      updates.completedAt = new Date().toISOString();
    }

    if (status === 'skipped' && skippedReason) {
      updates.skippedReason = skippedReason;
    }

    if (status === 'snoozed' && snoozedUntil) {
      updates.snoozedUntil = snoozedUntil;
    }

    const { error } = await supabase
      .from('coachTasks')
      .update(updates)
      .eq('id', taskId);
    if (error) throw error;

    await logAuditEvent('admin', 'coach_task_status_updated', taskId, {
      status,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update coach task status:', err);
    return { success: false, error: err?.message || 'Failed to update task status' };
  }
}

/**
 * Get coach tasks for a date
 */
export async function getCoachTasksForDate(date: string): Promise<CoachTask[]> {
  try {
    const { data, error } = await supabase
      .from('coachTasks')
      .select('*')
      .eq('date', date)
      .order('position', { ascending: true });

    if (error) throw error;

    const items: CoachTask[] = [];
    (data || []).forEach((row: any) => {
      items.push({ ...row, id: row.id } as CoachTask);
    });

    return items;
  } catch (err) {
    console.error('Failed to get coach tasks:', err);
    return [];
  }
}

/**
 * Subscribe to coach tasks for a date
 */
export function subscribeToCoachTasksForDate(
  date: string,
  onTasks: (tasks: CoachTask[]) => void
): Unsubscribe {
  let active = true;

  const load = async () => {
    if (!active) return;
    const items = await getCoachTasksForDate(date);
    if (active) onTasks(items);
  };

  try {
    const channel = supabase
      .channel('coach-tasks-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coachTasks' },
        () => {
          load();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && active) onTasks([]);
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  } catch {
    onTasks([]);
    return () => {
      active = false;
    };
  }
}

/**
 * Save daily coach brief
 */
export async function saveDailyCoachBrief(
  brief: Omit<DailyCoachBrief, 'generatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const date = brief.date;
    const id = `brief-${date}`;
    const fullBrief: DailyCoachBrief & { id: string } = {
      ...brief,
      id,
      generatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('dailyCoachBriefs').upsert(fullBrief);
    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save daily coach brief:', err);
    return { success: false, error: err?.message || 'Failed to save brief' };
  }
}

/**
 * Get daily coach brief for a date
 */
export async function getDailyCoachBrief(date: string): Promise<DailyCoachBrief | null> {
  try {
    const { data, error } = await supabase
      .from('dailyCoachBriefs')
      .select('*')
      .eq('id', `brief-${date}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return { ...(data as DailyCoachBrief), id: (data as any).id } as DailyCoachBrief;
  } catch (err) {
    console.error('Failed to get daily coach brief:', err);
    return null;
  }
}

/**
 * Subscribe to daily coach brief for today
 */
export function subscribeToTodayCoachBrief(
  onBrief: (brief: DailyCoachBrief | null) => void
): Unsubscribe {
  const today = new Date().toISOString().split('T')[0];
  let active = true;

  const load = async () => {
    if (!active) return;
    const brief = await getDailyCoachBrief(today);
    if (active) onBrief(brief);
  };

  try {
    const channel = supabase
      .channel('daily-coach-brief-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dailyCoachBriefs' },
        () => {
          load();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && active) onBrief(null);
      });

    load();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  } catch {
    onBrief(null);
    return () => {
      active = false;
    };
  }
}

// ==================== REVERSE FUNNEL ====================

/**
 * Save reverse funnel calculation
 */
export async function saveReverseFunnelCalculation(
  calculation: Omit<ReverseFunnelCalculation, 'generatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = `funnel-${Date.now()}`;
    const fullCalc: ReverseFunnelCalculation & { id: string } = {
      ...calculation,
      id,
      generatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('reverseFunnelCalculations').upsert(fullCalc);
    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save reverse funnel calculation:', err);
    return { success: false, error: err?.message || 'Failed to save calculation' };
  }
}

/**
 * Get latest reverse funnel calculation
 */
export async function getLatestReverseFunnelCalculation(): Promise<ReverseFunnelCalculation | null> {
  try {
    const { data, error } = await supabase
      .from('reverseFunnelCalculations')
      .select('*')
      .order('generatedAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return { ...(data as ReverseFunnelCalculation), id: (data as any).id } as ReverseFunnelCalculation;
  } catch (err) {
    console.error('Failed to get latest reverse funnel calculation:', err);
    return null;
  }
}
