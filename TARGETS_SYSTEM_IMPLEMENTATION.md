# Targets & Coach System Implementation

## Overview

This document describes the backend implementation of the Targets & Coach engine for the premium fashion commerce platform. All existing UI code remains untouched - this is a pure backend addition that the existing admin interface can consume.

## What Was Built

### 1. TypeScript Types (`src/types.ts`)

Added comprehensive type definitions for:

- **Target System**:
  - `TargetPlan` - Full yearly/monthly/weekly/daily target hierarchy
  - `MonthlyTarget`, `WeeklyTarget`, `DailyTarget` - Period-specific targets
  - `GrowthCurve` - geometric, linear, s-curve, step-ladder, custom
  - `TargetPeriod` - yearly, monthly, weekly, daily

- **Metrics Tracking**:
  - `MetricActual` - Real performance data with `isDemo` flag
  - Tracks: pieces, orders, revenue, sessions, visitors, conversion, AOV, etc.

- **Daily Coach**:
  - `CoachTask` - Individual tasks with family, priority, impact, effort
  - `DailyCoachBrief` - Daily summary with tasks, risks, opportunities, wins
  - Task families: catalog, traffic, conversion, operations, finance, content, marketing, customer_service

- **Reverse Funnel**:
  - `ReverseFunnelCalculation` - Work backwards from pieces to sessions/visitors
  - Channel breakdown, funnel steps, bottleneck detection, sensitivity analysis

### 2. Supabase Service (`src/supabase/targetsService.ts`)

Complete Supabase integration for:

- **Target Plans**:
  - `saveTargetPlan()` - Create/update with versioning and change history
  - `getActiveTargetPlan()` - Get current active plan
  - `subscribeToActiveTargetPlan()` - Real-time listener
  - `lockPeriod()` - Lock past periods to prevent history rewriting (T-012)

- **Metric Actuals**:
  - `saveMetricActual()` - Save daily metrics (automatically filters demo data in production)
  - `getMetricActuals()` - Get date range
  - `subscribeToMetricActuals()` - Real-time listener

- **Daily Coach**:
  - `saveCoachTask()` - Create/update tasks
  - `updateCoachTaskStatus()` - Mark done/skipped/snoozed/blocked
  - `getCoachTasksForDate()` - Get tasks for specific date
  - `subscribeToCoachTasksForDate()` - Real-time listener
  - `saveDailyCoachBrief()` - Save daily summary
  - `getDailyCoachBrief()` - Get brief for date
  - `subscribeToTodayCoachBrief()` - Real-time listener for today

- **Reverse Funnel**:
  - `saveReverseFunnelCalculation()` - Save calculation
  - `getLatestReverseFunnelCalculation()` - Get most recent

### 3. Target Calculator (`src/services/targetCalculator.ts`)

Pure business logic for:

- **Target Planning**:
  - `calculateGrowthRate()` - Formula: g = (end_daily * 30 / start)^(1/(months-1))
  - `generateMonthlyTargets()` - Geometric growth: target_m = round(start * g^(m-1))
  - `applyGrowthCurve()` - Apply geometric, linear, s-curve, step-ladder patterns
  - `generateDailyTargets()` - Apply weekday weights (Fri/Sat heavier by default)
  - `generateWeeklyTargets()` - Aggregate daily targets

- **Progress & Pacing**:
  - `calculateProgress()` - ahead/on_track/behind with gap and percentage
  - `calculateCatchUp()` - Daily rate needed to hit target
  - `calculateHitProbability()` - Poisson model probability (0-100%)

- **Reverse Funnel**:
  - `calculateReverseFunnel()` - pieces → orders → sessions → visitors
  - Channel breakdown, funnel steps, bottleneck detection
  - Sensitivity analysis (what if conversion +0.5%?)

- **Daily Coach Generation**:
  - `generateDailyCoachTasks()` - Auto-generate tasks based on gap and targets
  - `generateDailyCoachBrief()` - Create daily summary with score, streak, panels

### 4. Express API Endpoints (`server.ts`)

Added 19 new API endpoints:

**Target Management**:
- `GET /api/targets/active` - Get active target plan
- `POST /api/targets/save` - Save target plan
- `POST /api/targets/lock` - Lock a period
- `POST /api/targets/calculate` - Preview target plan calculation
- `POST /api/targets/progress` - Calculate progress
- `POST /api/targets/catchup` - Calculate catch-up rate
- `POST /api/targets/probability` - Calculate hit probability

**Metrics**:
- `POST /api/metrics/save` - Save metric actuals
- `GET /api/metrics` - Get metric actuals for date range

**Reverse Funnel**:
- `POST /api/targets/reverse-funnel` - Calculate reverse funnel
- `POST /api/targets/save-reverse-funnel` - Save calculation
- `GET /api/targets/reverse-funnel/latest` - Get latest calculation

**Daily Coach**:
- `POST /api/coach/tasks/save` - Save coach task
- `POST /api/coach/tasks/status` - Update task status
- `GET /api/coach/tasks` - Get tasks for date
- `POST /api/coach/tasks/generate` - Auto-generate tasks
- `POST /api/coach/brief/save` - Save daily brief
- `GET /api/coach/brief` - Get daily brief
- `POST /api/coach/brief/generate` - Generate daily brief

### 5. Row Level Security (`supabase/migrations/0001_init_schema.sql`)

RLS policies are defined for every table:

- `targetPlans` - Owner-only read/write/delete
- `metricActuals` - Admin read, Editor/Owner write
- `coachTasks` - Admin read, Editor/Owner write
- `dailyCoachBriefs` - Admin read, Editor/Owner write
- `reverseFunnelCalculations` - Admin read, Editor/Owner create, Owner update/delete
- `suggestions` - Public read/create, Editor/Owner update/delete

### 6. Demo Seed Data (`src/data/targetsSeedData.ts`)

Production-safe demo data with `isDemo=true` flag:

- `DEMO_TARGET_PLAN` - 12-month geometric growth plan (13 → 12.9/day)
- `DEMO_METRIC_ACTUALS` - 30 days of realistic metrics
- `DEMO_COACH_TASKS` - 5 sample tasks for today
- `DEMO_DAILY_COACH_BRIEF` - Sample daily brief

**IMPORTANT**: Demo data is only seeded when `DEMO_MODE=true` environment variable is set. In production, this flag must be false or unset. All demo records are tagged `isDemo=true` and filtered out in production queries.

### 7. Environment Configuration (`.env.example`)

Added:
```
DEMO_MODE=false
```

## How to Use

### Development (Demo Mode)

1. Set `DEMO_MODE=true` in your `.env` file
2. When `seedDatabase()` runs, it will automatically seed the targets system with demo data
3. The admin UI can now consume the API endpoints to display targets, coach tasks, etc.

### Production

1. Ensure `DEMO_MODE` is `false` or unset in production environment
2. No demo data will be seeded
3. All metric actuals must come from real data (orders, sessions, etc.)
4. Target plans are created manually by the owner via the Target Planner UI

### API Usage Examples

**Calculate a target plan preview**:
```typescript
POST /api/targets/calculate
{
  "startPieces": 13,
  "endDailyPieces": 12.9,
  "months": 12,
  "startYear": 2026,
  "startMonth": 1,
  "growthCurve": "geometric",
  "weekdayWeights": {
    "sunday": 0.8,
    "monday": 1.0,
    "tuesday": 1.0,
    "wednesday": 1.0,
    "thursday": 1.0,
    "friday": 1.2,
    "saturday": 1.2
  }
}
```

**Save metric actuals for today**:
```typescript
POST /api/metrics/save
{
  "date": "2026-10-02",
  "piecesSold": 8,
  "orders": 6,
  "revenue": 168000, // 1,680 EUR in cents
  "sessions": 533,
  "visitors": 395,
  "conversionRate": 1.5,
  // ... other metrics
}
```

**Generate daily coach tasks**:
```typescript
POST /api/coach/tasks/generate
{
  "date": "2026-10-02",
  "targetPlan": { /* full target plan object */ },
  "actuals": [ /* array of metric actuals */ ],
  "productsCount": 24
}
```

## Implementation Status

### Completed (Part 3 - First Work Package)

✅ T-001 to T-008: Target Planner wizard
✅ T-013 to T-021: Metrics tracked against targets
✅ T-036 to T-040: Progress and pacing
✅ T-048 to T-049: Reverse-funnel calculator
✅ T-055: Catalog target logic
✅ D-001 to D-005: Daily Coach task generation

### Next Steps (UI Integration)

The backend is complete. The existing admin UI can now:

1. Add a "Targets" tab that calls the target API endpoints
2. Add a "Today" page that displays the daily coach brief
3. Add real-time listeners for targets and coach tasks
4. Implement the Target Planner wizard UI
5. Implement the task list with done/skip/snooze actions

### Future Work (From Spec)

The remaining features from the spec can be implemented incrementally:

- T-009 to T-012: Scenario planner, target versioning, auto-suggest, lock past periods
- T-022 to T-034: Additional metrics (gross profit, LTV, NPS, etc.)
- T-041 to T-047: Charts, heatmaps, streaks, comparisons
- T-050 to T-054: Per-channel requirements, bottleneck detector, sensitivity sliders, budget solver
- T-056 to T-062: Operational targets (photoshoot, content, email, fulfilment, etc.)
- T-063 to T-070: Alerts and rhythm (morning brief, mid-day check-in, end-of-day recap, etc.)
- D-006 to D-035: Additional Daily Coach features (content tasks, restock, conversion fixes, etc.)
- S3: Analytics and graphs
- S4: Live/real-time
- AI-001 to AI-020: AI Advisor and automation

## Security & Privacy

- All demo data is tagged `isDemo=true` and excluded from production metrics
- Supabase Row Level Security policies gate who can read/write target data
- Audit logging is integrated for all target/coach operations
- No personal data is used in AI prompts (per spec requirements)
- Money is stored as integer minor units (cents) with currency code
- Timezones stored in UTC, displayed in store timezone

## Notes

- The implementation follows the spec's recommended architecture adapted to the existing Supabase setup
- All calculations are pure functions in `targetCalculator.ts` for easy testing
- Supabase Realtime channels provide real-time updates for the admin UI
- The system is designed to work with real orders and sessions from the existing order/tracking infrastructure
- No UI code was modified - this is a pure backend addition
