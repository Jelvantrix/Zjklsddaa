/**
 * Lightweight privacy-first behavior tracking module
 * Respects GDPR / ePrivacy: Runs ONLY after user consent.
 * Respects Do Not Track (DNT).
 * Uses anonymous random visitorId and sessionId (no IP stored, no fingerprinting).
 */

import { supabase } from '../supabase/config';

export type TrackingEventType =
  | 'page_view'
  | 'scroll_depth'
  | 'click'
  | 'hover_dwell'
  | 'product_view'
  | 'product_dwell'
  | 'image_interaction'
  | 'hero_video'
  | 'search'
  | 'filter_use'
  | 'density_toggle'
  | 'look_product_toggle'
  | 'quicklook_open'
  | 'size_select'
  | 'add_to_bag'
  | 'remove_from_bag'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'cart_open'
  | 'checkout_step'
  | 'purchase'
  | 'waitlist_signup'
  | 'language_switch'
  | 'outbound_click'
  | 'error';

export interface TrackingEvent {
  id: string;
  type: TrackingEventType;
  timestamp: number;
  sessionId: string;
  visitorId: string;
  page: string;
  deviceClass: 'mobile' | 'tablet' | 'desktop';
  viewport: { width: number; height: number };
  language: string;
  referrer: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  details?: Record<string, any>;
}

class BehaviorTracker {
  private visitorId: string = '';
  private sessionId: string = '';
  private isConsented: boolean = false;
  private eventBuffer: TrackingEvent[] = [];
  private flushTimer: any = null;

  constructor() {
    if (typeof window === 'undefined') return;

    // Check Do Not Track
    if (navigator.doNotTrack === '1' || (window as any).doNotTrack === '1') {
      return;
    }

    // Check saved consent
    const consent = localStorage.getItem('zejesh_cookie_consent');
    if (consent === 'all') {
      this.initSession();
    }

    // Listen for storage events (e.g. cookie banner accepted)
    window.addEventListener('storage', (e) => {
      if (e.key === 'zejesh_cookie_consent' && e.newValue === 'all') {
        this.initSession();
      }
    });

    // Flush on pagehide / unload
    window.addEventListener('pagehide', () => this.flush(true));
  }

  public setConsent(hasConsent: boolean) {
    this.isConsented = hasConsent;
    if (hasConsent) {
      this.initSession();
    } else {
      this.visitorId = '';
      this.sessionId = '';
      this.eventBuffer = [];
      sessionStorage.removeItem('zejesh_session_id');
      localStorage.removeItem('zejesh_visitor_id');
    }
  }

  private initSession() {
    this.isConsented = true;

    // Anonymous random visitorId
    let vId = localStorage.getItem('zejesh_visitor_id');
    if (!vId) {
      vId = `vis_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      localStorage.setItem('zejesh_visitor_id', vId);
    }
    this.visitorId = vId;

    // SessionId (refreshes per tab/session)
    let sId = sessionStorage.getItem('zejesh_session_id');
    if (!sId) {
      sId = `ses_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
      sessionStorage.setItem('zejesh_session_id', sId);
    }
    this.sessionId = sId;

    // Start flush interval (every 4 seconds)
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => this.flush(false), 4000);
    }
  }

  public track(type: TrackingEventType, details?: Record<string, any>) {
    if (!this.isConsented || !this.sessionId) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceClass = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

    const event: TrackingEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      page: window.location.pathname + window.location.hash,
      deviceClass,
      viewport: { width, height },
      language: document.documentElement.lang || 'fi',
      referrer: document.referrer || '',
      details,
    };

    this.eventBuffer.push(event);

    if (this.eventBuffer.length >= 10) {
      this.flush(false);
    }
  }

  public async flush(isExiting: boolean = false) {
    if (this.eventBuffer.length === 0) return;

    const toFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Write each event to the Supabase `events` table.
      // Fire-and-forget so tracking never interrupts the user experience.
      for (const evt of toFlush) {
        supabase.from('events').insert(evt).then(
          () => undefined,
          () => undefined
        );
      }
    } catch {
      // Fail silently to never interrupt user experience
    }
  }
}

export const tracker = new BehaviorTracker();
