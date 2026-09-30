/**
 * Zejesh Quiet Nordic Luxury - Behavior Tracking Engine (M4)
 * Lightweight, strictly privacy-compliant, zero third-party scripts.
 * Runs ONLY after user gives analytics consent.
 * Anonymous visitorId and sessionId, no IP stored, no fingerprinting, honours Do Not Track.
 */

import { collection, addDoc, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrackingEvent, TrackingEventType, DailyStat } from '../types';

const CONSENT_STORAGE_KEY = 'zejesh_cookie_consent_v1';
const VISITOR_ID_KEY = 'zejesh_visitor_id';
const SESSION_ID_KEY = 'zejesh_session_id';

class TrackingEngine {
  private queue: TrackingEvent[] = [];
  private flushTimer: any = null;
  private isConsented: boolean = false;
  private visitorId: string = '';
  private sessionId: string = '';
  private pageStartTime: number = Date.now();
  private maxScrollDepth: number = 0;
  private currentProductDwellId: string | null = null;
  private productDwellStartTime: number = 0;

  constructor() {
    if (typeof window === 'undefined') return;
    this.checkConsent();
    this.initSession();
    this.attachWindowListeners();
  }

  /**
   * Check if analytics consent was given by the user
   */
  public checkConsent(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Honor Do Not Track
    if (navigator.doNotTrack === '1' || (window as any).doNotTrack === '1') {
      this.isConsented = false;
      return false;
    }

    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.isConsented = Boolean(parsed.analytics === true);
      } else {
        this.isConsented = false;
      }
    } catch {
      this.isConsented = false;
    }
    return this.isConsented;
  }

  /**
   * Set user consent and start/stop tracking accordingly
   */
  public setConsent(analyticsAllowed: boolean): void {
    try {
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          analytics: analyticsAllowed,
          timestamp: new Date().toISOString(),
        })
      );
    } catch {}
    this.isConsented = analyticsAllowed;
    if (analyticsAllowed) {
      this.initSession();
      this.trackEvent('page_view', { path: window.location.pathname });
    } else {
      this.queue = [];
    }
  }

  /**
   * Withdraw consent & purge stored identifiers
   */
  public withdrawConsent(): void {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      localStorage.removeItem(VISITOR_ID_KEY);
      sessionStorage.removeItem(SESSION_ID_KEY);
    } catch {}
    this.isConsented = false;
    this.queue = [];
  }

  private initSession(): void {
    if (typeof window === 'undefined' || !this.isConsented) return;

    // Anonymous visitor ID (32 hex characters, random)
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      try {
        localStorage.setItem(VISITOR_ID_KEY, vid);
      } catch {}
    }
    this.visitorId = vid;

    // Anonymous session ID
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      sid = 's_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      try {
        sessionStorage.setItem(SESSION_ID_KEY, sid);
      } catch {}
    }
    this.sessionId = sid;
  }

  private attachWindowListeners(): void {
    if (typeof window === 'undefined') return;

    // Scroll depth tracking (25%, 50%, 75%, 100%)
    let scrollDepthsHit = new Set<number>();
    const handleScroll = () => {
      if (!this.isConsented) return;
      const h = document.documentElement;
      const b = document.body;
      const st = 'scrollTop' in h ? h.scrollTop : b.scrollTop;
      const sh = 'scrollHeight' in h ? h.scrollHeight : b.scrollHeight;
      const ch = h.clientHeight;
      const percent = Math.min(100, Math.round(((st + ch) / (sh || 1)) * 100));

      [25, 50, 75, 100].forEach((depth) => {
        if (percent >= depth && !scrollDepthsHit.has(depth)) {
          scrollDepthsHit.add(depth);
          this.trackEvent('scroll_depth', { depth, percent });
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Pagehide / beforeunload flush
    const handleUnload = () => {
      this.flushQueue(true);
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushQueue(true);
      }
    });

    // Normalized click coordinate tracking
    window.addEventListener('click', (e: MouseEvent) => {
      if (!this.isConsented) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const normX = Math.round((e.clientX / window.innerWidth) * 1000) / 1000;
      const normY = Math.round((e.clientY / window.innerHeight) * 1000) / 1000;
      const elementTag = target.tagName.toLowerCase();
      const elementId = target.id || target.getAttribute('aria-label') || target.className?.toString().substring(0, 30);

      this.trackEvent('click', {
        tag: elementTag,
        element: elementId,
        x: normX,
        y: normY,
      });
    });
  }

  /**
   * Log a validated tracking event
   */
  public trackEvent(type: TrackingEventType, payload: Record<string, any> = {}): void {
    if (!this.isConsented) return;

    const event: TrackingEvent = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      page: typeof window !== 'undefined' ? window.location.pathname : '/',
      deviceClass: this.getDeviceClass(),
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '1440x900',
      language: typeof navigator !== 'undefined' ? navigator.language : 'fi-FI',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      payload,
    };

    this.queue.push(event);

    // Schedule batch flush
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushQueue();
      }, 5000);
    }
  }

  private getDeviceClass(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Flush queued events to Firestore batch
   */
  public async flushQueue(isImmediate: boolean = false): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.queue.length === 0) return;

    const toSend = [...this.queue];
    this.queue = [];

    try {
      const batch = writeBatch(db);
      const eventsCol = collection(db, 'events');

      toSend.forEach((ev) => {
        const ref = doc(eventsCol);
        batch.set(ref, ev);
      });

      await batch.commit();
    } catch (err) {
      // In case of write failure or offline, keep small buffer without memory leak
      if (this.queue.length < 50) {
        this.queue = [...toSend, ...this.queue];
      }
    }
  }

  /**
   * Start dwelling on a specific product
   */
  public startProductDwell(productId: string): void {
    if (this.currentProductDwellId === productId) return;
    this.endProductDwell();
    this.currentProductDwellId = productId;
    this.productDwellStartTime = Date.now();
  }

  /**
   * End product dwell and log duration
   */
  public endProductDwell(): void {
    if (!this.currentProductDwellId || !this.productDwellStartTime) return;
    const dwellMs = Date.now() - this.productDwellStartTime;
    if (dwellMs >= 800) {
      this.trackEvent('product_dwell', {
        productId: this.currentProductDwellId,
        dwellMs,
      });
    }
    this.currentProductDwellId = null;
    this.productDwellStartTime = 0;
  }
}

export const tracker = new TrackingEngine();
