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
    <div className="space-y-12 max-w-5xl bg-white text-black">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
        <div>
          <span className="text-small text-black/40 block mb-1">
            {dbStatus === 'connected'
              ? 'Database connected'
              : dbStatus === 'checking'
              ? 'Checking database'
              : 'Database unreachable'}
          </span>
          <h1 className="text-title">System Health</h1>
        </div>

        <button
          type="button"
          onClick={handleSendTestEventAndVerify}
          disabled={isSendingTest}
          className="text-small text-black hover:underline cursor-pointer disabled:opacity-40"
        >
          {isSendingTest ? 'Verifying...' : 'Send Test Event →'}
        </button>
      </div>

      {/* TEST EVENT VERIFICATION BANNER */}
      {testResult.status !== 'idle' && (
        <div className="space-y-1">
          <span className="text-small text-black/60 block">
            {testResult.status === 'success' ? 'Verification Passed' : 'Verification Failed'}
          </span>
          <p className="text-body">
            {testResult.message}
          </p>
          {testResult.latencyMs && (
            <span className="text-small text-black/40 block">
              Latency: {testResult.latencyMs}ms
            </span>
          )}
        </div>
      )}

      {/* KPI METRICS: Pure typography separated by whitespace */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="space-y-1">
          <span className="text-small text-black/40 block">Ingestion</span>
          <div className="text-title font-normal">
            {dbStatus === 'checking' ? '...' : dbStatus === 'connected' ? totalEventsCount : 'N/A'}
          </div>
          <span className="text-small text-black/50 block">
            {eventsPerMinute} / min
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-small text-black/40 block">Last Event</span>
          <div className="text-title font-normal truncate">
            {timeAgo || 'None'}
          </div>
          <span className="text-small text-black/50 block">
            {lastEventTime || 'Listening'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-small text-black/40 block">Operations</span>
          <div className="text-title font-normal">
            {readsToday + writesToday}
          </div>
          <span className="text-small text-black/50 block">
            {readsToday} r / {writesToday} w
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-small text-black/40 block">Telemetry</span>
          <div className="text-title font-normal">
            {consentStats.total > 0 ? `${consentStats.rate}%` : 'No data'}
          </div>
          <span className="text-small text-black/50 block">
            {consentStats.total === 0 ? 'No record' : consentStats.rate === 100 ? 'Accepted' : 'Declined'}
          </span>
        </div>
      </div>

      {/* CORE SUBSYSTEM DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <span className="text-small text-black/40 block">Database Core</span>
          <div className="space-y-2 text-body">
            <div className="flex justify-between">
              <span className="text-black/50">Endpoint:</span>
              <span className="text-black truncate pl-2">{databaseEndpoint}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/50">Status:</span>
              <span className="text-black">{dbStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/50">Reads:</span>
              <span className="text-black">{readsToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/50">Writes:</span>
              <span className="text-black">{writesToday}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-small text-black/40 block">Authentication & Session</span>
          <div className="space-y-2 text-body">
            <div className="flex justify-between">
              <span className="text-black/50">Operator:</span>
              <span className="text-black truncate pl-2">{adminProfile?.email || user?.email || 'Not signed in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/50">Role:</span>
              <span className="text-black">{adminProfile?.role || role || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/50">Privilege:</span>
              <span className="text-black">{isOwner ? 'Owner' : 'Staff'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TRACKER ERROR LOG */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-small text-black/40">Error Log</span>
          <span className="text-small text-black/40">{trackerErrors.length} logged</span>
        </div>

        {trackerErrors.length === 0 ? (
          <p className="text-body text-black/40">No errors recorded</p>
        ) : (
          <div className="space-y-2">
            {trackerErrors.map((err) => (
              <div key={err.id} className="flex items-baseline justify-between text-small">
                <span className="text-black">{err.msg}</span>
                <span className="text-black/40">{err.at}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
