import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Send,
  Database,
  ShieldCheck,
  HardDrive,
  Users,
  RefreshCw,
  Clock,
  DollarSign,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../supabase/AuthContext';

export const AdminSystemHealthView: React.FC = () => {
  const { user, adminProfile, role, isOwner } = useAuth();

  // Live Stats
  const [totalEventsCount, setTotalEventsCount] = useState<number>(0);
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);
  const [lastEventRawTs, setLastEventRawTs] = useState<number | null>(null);
  const [eventsPerMinute, setEventsPerMinute] = useState<number>(0);
  const [lastAggregation, setLastAggregation] = useState<{ date: string; time: string; status: string } | null>(null);

  // Database reachability — measured, never assumed.
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'unreachable'>('checking');

  // Endpoint host read from the live client configuration (not a hardcoded ID).
  const databaseEndpoint = (() => {
    try {
      return new URL(String((supabase as any).supabaseUrl)).host;
    } catch {
      return 'Unknown';
    }
  })();

  // Database read/write estimates recorded by this device
  const [readsToday, setReadsToday] = useState<number>(() => {
    const saved = localStorage.getItem('zejesh_metrics_reads_today');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [writesToday, setWritesToday] = useState<number>(() => {
    const saved = localStorage.getItem('zejesh_metrics_writes_today');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Consent Metrics — 0/0 (and reported as "No data yet") until a choice is stored
  const [consentStats, setConsentStats] = useState<{ accepted: number; total: number; rate: number }>({
    accepted: 0,
    total: 0,
    rate: 0,
  });

  // Tracker Errors
  const [trackerErrors, setTrackerErrors] = useState<Array<{ id: string; msg: string; at: string }>>([]);

  // Test Event Verification state
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'failed';
    latencyMs?: number;
    eventId?: string;
    message?: string;
    verifiedAt?: string;
  }>({ status: 'idle' });

  // 1. Subscribe to recent events to measure real-time ingestion
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      const processEventRows = (rows: Array<{ timestamp?: number }>) => {
        setTotalEventsCount((prev) => Math.max(prev, rows.length));
        if (rows.length > 0) {
          const newest = rows[0];
          if (newest.timestamp) {
            setLastEventRawTs(newest.timestamp);
            setLastEventTime(new Date(newest.timestamp).toLocaleTimeString());
          }

          // Calculate events in the last 60 seconds
          const oneMinAgo = Date.now() - 60000;
          const recentCount = rows.filter((d) => (d.timestamp || 0) >= oneMinAgo).length;
          setEventsPerMinute(recentCount);
        }
      };

      const channel = supabase
        .channel('admin-health-events-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          async () => {
            try {
              const { data: rows } = await supabase
                .from('events')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);
              processEventRows(rows || []);
            } catch (e) {
              console.warn('Events listener note:', e);
            }
          }
        )
        .subscribe();

      // Initial fetch (run async so the unsubscribe callback stays synchronous)
      (async () => {
        try {
          const { data: rows, error } = await supabase
            .from('events')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50);
          setDbStatus(error ? 'unreachable' : 'connected');
          processEventRows(rows || []);
        } catch (e) {
          setDbStatus('unreachable');
          console.warn('Events listener note:', e);
        }
      })();

      unsubscribe = () => supabase.removeChannel(channel);
    } catch (e) {
      console.warn('Events listener error:', e);
    }

    // 2. Fetch last aggregation status from dailyStats
    const fetchLastAggregation = async () => {
      try {
        const { data: rows } = await supabase
          .from('dailyStats')
          .select('*')
          .order('date', { ascending: false })
          .limit(1);
        if (rows && rows.length > 0) {
          const docData = rows[0];
          setLastAggregation({
            date: docData.date || 'N/A',
            time: docData.calculatedAt ? new Date(docData.calculatedAt).toLocaleTimeString() : 'Not recorded',
            status: `Recorded for ${docData.date || 'unknown date'}`,
          });
        } else {
          setLastAggregation({
            date: 'None yet',
            time: 'Not recorded',
            status: 'No aggregation recorded yet',
          });
        }
      } catch (err) {
        console.warn('Stats aggregation check:', err);
      }
    };
    fetchLastAggregation();

    // 3. Load consent stats from storage — no default is assumed
    const consent = localStorage.getItem('zejesh_analytics_consent');
    if (consent === 'accepted') {
      setConsentStats({ accepted: 1, total: 1, rate: 100 });
    } else if (consent === 'declined') {
      setConsentStats({ accepted: 0, total: 1, rate: 0 });
    } else {
      setConsentStats({ accepted: 0, total: 0, rate: 0 });
    }

    return () => unsubscribe();
  }, []);

  // Update relative time display
  const [timeAgo, setTimeAgo] = useState<string>('Listening...');
  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastEventRawTs) {
        setTimeAgo('No events ingested yet');
        return;
      }
      const diffSec = Math.floor((Date.now() - lastEventRawTs) / 1000);
      if (diffSec < 5) setTimeAgo('Just now (< 5s ago)');
      else if (diffSec < 60) setTimeAgo(`${diffSec} seconds ago`);
      else setTimeAgo(`${Math.floor(diffSec / 60)}m ago`);
    }, 2000);
    return () => clearInterval(timer);
  }, [lastEventRawTs]);

  // "SEND TEST EVENT AND VERIFY IT ARRIVED"
  const handleSendTestEventAndVerify = async () => {
    setIsSendingTest(true);
    setTestResult({ status: 'idle' });

    const startTime = performance.now();
    const testId = `test-health-${Date.now()}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const payload = {
      id: testId,
      type: 'system_health_verification',
      timestamp: Date.now(),
      sessionId: `session-health-${Date.now()}`,
      page: '/admin/system-health',
      deviceClass: 'desktop',
      verifiedBy: adminProfile?.email || user?.email || 'unknown-admin',
      metadata: {
        agent: 'Zejesh Production Health Guard',
        action: 'Round-Trip Verification',
      },
    };

    try {
      // 1. Write the document to Supabase
      await supabase.from('events').upsert({ ...payload, id: testId });

      // Increment write counter
      setWritesToday((prev) => {
        const next = prev + 1;
        localStorage.setItem('zejesh_metrics_writes_today', next.toString());
        return next;
      });

      // 2. Read back the exact document to prove the write succeeded
      const { data: checkData } = await supabase.from('events').select('*').eq('id', testId).maybeSingle();

      // Increment read counter
      setReadsToday((prev) => {
        const next = prev + 1;
        localStorage.setItem('zejesh_metrics_reads_today', next.toString());
        return next;
      });

      const latency = Math.round(performance.now() - startTime);

      if (checkData) {
        const readData = checkData;
        setTestResult({
          status: 'success',
          latencyMs: latency,
          eventId: testId,
          verifiedAt: new Date().toLocaleTimeString(),
          message: `Round-trip write and read-back verified in ${latency}ms. The document was stored and returned by the database.`,
        });
        setLastEventRawTs(Date.now());
        setTotalEventsCount((c) => c + 1);
      } else {
        setTestResult({
          status: 'failed',
          message: 'Document was written but could not be read back immediately.',
        });
      }
    } catch (err: any) {
      console.error('Test event verification error:', err);
      setTestResult({
        status: 'failed',
        message: err.message || 'The write/read test failed.',
      });
      setTrackerErrors((prev) => [
        {
          id: `err-${Date.now()}`,
          msg: err.message || 'Health test failed',
          at: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Note: read/write counters are local to this device — no cost figure is invented from them.

  return (
    <div className="space-y-8 max-w-6xl font-mono text-xs text-black">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-black/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                dbStatus === 'connected'
                  ? 'bg-emerald-500'
                  : dbStatus === 'checking'
                  ? 'bg-black/30'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[10px] uppercase tracking-[0.25em] text-black/50">
              {dbStatus === 'connected'
                ? 'Production Infrastructure · Database reachable'
                : dbStatus === 'checking'
                ? 'Production Infrastructure · Checking database…'
                : 'Production Infrastructure · Database unreachable'}
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal tracking-tight">System Health & Live Ingestion</h1>
          <p className="text-xs font-mono text-black/50 mt-1">
            Measured database connectivity, recent event ingestion, the consent record held on this device,
            and captured telemetry errors. Anything not measured is shown as "No data yet".
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendTestEventAndVerify}
            disabled={isSendingTest}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-neutral-800 transition-colors text-xs uppercase tracking-[0.16em] font-medium cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isSendingTest ? 'Verifying...' : 'Send Test Event & Verify'}</span>
          </button>
        </div>
      </div>

      {/* TEST EVENT VERIFICATION BANNER */}
      {testResult.status !== 'idle' && (
        <div
          className={`p-4 border font-mono text-xs transition-all ${
            testResult.status === 'success'
              ? 'bg-black text-white border-black'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-2">
              {testResult.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Database Round-Trip: Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Database Round-Trip Failed</span>
                </>
              )}
            </span>
            {testResult.latencyMs && (
              <span className="text-[11px] opacity-80 font-mono">Round-trip latency: {testResult.latencyMs}ms</span>
            )}
          </div>
          <p className="text-[11.5px] opacity-90">{testResult.message}</p>
          {testResult.eventId && (
            <div className="mt-2 text-[10px] opacity-60 font-mono">
              Document ID: <code>/events/{testResult.eventId}</code> · Timestamp: {testResult.verifiedAt}
            </div>
          )}
        </div>
      )}

      {/* KPI METRIC CARDS (REAL DATA ONLY) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Event Ingestion */}
        <div className="p-4 border border-black/[0.08] bg-white space-y-2">
          <div className="flex items-center justify-between text-black/50 text-[10px] uppercase tracking-wider">
            <span>Event Ingestion</span>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-editorial font-normal text-black">
            {dbStatus === 'checking' ? 'Checking…' : dbStatus === 'connected' ? totalEventsCount : 'Could not load data'}
          </div>
          <div className="text-[11px] text-black/60 flex items-center justify-between pt-1 border-t border-black/[0.06]">
            <span>Current Pace:</span>
            <span className="font-semibold text-black">{eventsPerMinute} events/min</span>
          </div>
        </div>

        {/* Card 2: Last Event Time */}
        <div className="p-4 border border-black/[0.08] bg-white space-y-2">
          <div className="flex items-center justify-between text-black/50 text-[10px] uppercase tracking-wider">
            <span>Last Event Timestamp</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-editorial font-normal text-black truncate">{timeAgo}</div>
          <div className="text-[11px] text-black/60 flex items-center justify-between pt-1 border-t border-black/[0.06]">
            <span>Recorded Time:</span>
            <span className="font-mono text-black">{lastEventTime || 'Listening...'}</span>
          </div>
        </div>

        {/* Card 3: Operations recorded by this browser */}
        <div className="p-4 border border-black/[0.08] bg-white space-y-2">
          <div className="flex items-center justify-between text-black/50 text-[10px] uppercase tracking-wider">
            <span>Ops Recorded (This Device)</span>
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-editorial font-normal text-black">
            {readsToday + writesToday} <span className="text-xs font-mono text-black/50 font-normal">ops</span>
          </div>
          <div className="text-[11px] text-black/60 flex items-center justify-between pt-1 border-t border-black/[0.06]">
            <span>Reads / Writes:</span>
            <span className="font-semibold text-black">{readsToday} / {writesToday}</span>
          </div>
        </div>

        {/* Card 4: Consent Record */}
        <div className="p-4 border border-black/[0.08] bg-white space-y-2">
          <div className="flex items-center justify-between text-black/50 text-[10px] uppercase tracking-wider">
            <span>Telemetry Consent</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-editorial font-normal text-black">
            {consentStats.total > 0 ? `${consentStats.rate}%` : 'No data yet'}
          </div>
          <div className="text-[11px] text-black/60 flex items-center justify-between pt-1 border-t border-black/[0.06]">
            <span>Stored on this device:</span>
            <span className="font-semibold text-black">
              {consentStats.total === 0
                ? 'No record'
                : consentStats.rate === 100
                ? 'Accepted'
                : 'Declined'}
            </span>
          </div>
        </div>
      </div>

      {/* CORE SUBSYSTEM DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subsystem 1: Database reachability audit */}
        <div className="border border-black/[0.08] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-black" />
              <h3 className="font-semibold uppercase tracking-wider text-xs">Supabase Database Core</h3>
            </div>
            <span
              className={`px-2 py-0.5 border text-[10px] font-semibold ${
                dbStatus === 'connected'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : dbStatus === 'checking'
                  ? 'border-black/30 text-black/50 bg-white'
                  : 'border-rose-500 text-rose-700 bg-rose-50'
              }`}
            >
              {dbStatus === 'connected' ? 'CONNECTED' : dbStatus === 'checking' ? 'CHECKING…' : 'UNREACHABLE'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Database Endpoint:</span>
              <span className="font-mono text-black font-medium truncate pl-3">{databaseEndpoint}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Security Rules:</span>
              <span className="font-mono text-black">Not verifiable from this client</span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Reads (This Device):</span>
              <span className="font-mono text-black font-semibold">{readsToday} reads</span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Writes (This Device):</span>
              <span className="font-mono text-black font-semibold">{writesToday} writes</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-black/50">Last Recorded Aggregation:</span>
              <span className="font-mono text-black">
                {lastAggregation?.status ||
                  (dbStatus === 'connected' ? 'Checking…' : 'Could not load data')}
              </span>
            </div>
          </div>
        </div>

        {/* Subsystem 2: Auth & Role Governance */}
        <div className="border border-black/[0.08] bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-black" />
              <h3 className="font-semibold uppercase tracking-wider text-xs">Supabase Authentication & Identity</h3>
            </div>
            <span
              className={`px-2 py-0.5 border text-[10px] font-semibold ${
                user || adminProfile
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                  : 'border-rose-500 text-rose-700 bg-rose-50'
              }`}
            >
              {user || adminProfile ? 'SESSION ACTIVE' : 'NO SESSION'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Authenticated Operator:</span>
              <span className="font-mono text-black font-semibold truncate pl-3">
                {adminProfile?.email || user?.email || 'Not signed in'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Active Role:</span>
              <span className="font-mono uppercase font-bold text-black">
                {adminProfile?.role || role || 'No role assigned'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Page Connection:</span>
              <span className="font-mono text-black">
                {typeof window !== 'undefined' && window.location.protocol === 'https:'
                  ? 'HTTPS (browser TLS)'
                  : 'Not HTTPS'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-black/[0.04]">
              <span className="text-black/50">Privilege Level:</span>
              <span className="font-mono text-black">{isOwner ? 'Owner (full access)' : 'Staff (limited access)'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-black/50">Server Functions:</span>
              <span className="font-mono text-black">Unknown — not verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRACKER ERROR LOG */}
      <div className="border border-black/[0.08] bg-white p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-black/[0.08] pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-black/60" />
            <h3 className="font-semibold uppercase tracking-wider text-xs">Tracker Error & Exception Audit Log</h3>
          </div>
          <span className="text-[10px] text-black/50 font-mono">
            {trackerErrors.length} errors logged
          </span>
        </div>

        {trackerErrors.length === 0 ? (
          <div className="py-6 text-center text-black/40 text-xs">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
            <span>No telemetry errors captured in this session.</span>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.06]">
            {trackerErrors.map((err) => (
              <div key={err.id} className="py-2 flex items-center justify-between text-[11px]">
                <span className="text-red-700">{err.msg}</span>
                <span className="text-black/40">{err.at}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
