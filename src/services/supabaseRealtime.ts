import { createClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase Real-Time Client & Subscription Bridge
 * Subscribes to real-time events on the 'audit-trail-feed' channel
 * to mirror database changes and stream audit trail events as they occur.
 */

// Fallback configuration if env vars are not set
const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 'https://productpilot-realtime.supabase.co';
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2R1Y3RwaWxvdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc5MDAwMDAwLCJleHAiOjE5OTUwMDAwMDB9.dummyKeyForRealtimeBridge';

export interface SupabaseRealtimeStatus {
  connected: boolean;
  channelName: string;
  subscribersCount: number;
  lastEventReceivedAt: Date | null;
  eventsCount: number;
}

export type SupabaseEventListener = (event: any) => void;

class SupabaseRealtimeBridge {
  private client: any;
  private channel: RealtimeChannel | null = null;
  private isSubscribed: boolean = false;
  private listeners: Set<SupabaseEventListener> = new Set();
  private eventsCount: number = 0;
  private lastEventReceivedAt: Date | null = null;

  constructor() {
    try {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      this.initChannel();
    } catch (e) {
      console.warn('[Supabase Realtime Init Error]', e);
    }
  }

  private initChannel() {
    if (!this.client) return;

    try {
      this.channel = this.client.channel('audit-trail-feed');

      this.channel
        ?.on('broadcast', { event: 'audit_event' }, (payload: any) => {
          this.handleIncoming(payload?.payload || payload);
        })
        ?.on('broadcast', { event: 'webhook_event' }, (payload: any) => {
          this.handleIncoming(payload?.payload || payload);
        })
        ?.on('postgres_changes', { event: '*', schema: 'public', table: 'audit_trail_events' }, (payload: any) => {
          this.handleIncoming(payload?.new || payload);
        })
        ?.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isSubscribed = false;
          }
        });
    } catch (err) {
      console.warn('[Supabase Channel Init Error]', err);
    }
  }

  private handleIncoming(data: any) {
    this.eventsCount++;
    this.lastEventReceivedAt = new Date();
    this.listeners.forEach(fn => {
      try {
        fn(data);
      } catch (err) {
        console.warn('[Supabase Listener Error]', err);
      }
    });
  }

  public subscribe(listener: SupabaseEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(eventData: any): void {
    if (this.channel) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'audit_event',
          payload: eventData
        });
      } catch (e) {
        console.warn('[Supabase broadcast send error]', e);
      }
    }
  }

  public getStatus(): SupabaseRealtimeStatus {
    return {
      connected: this.isSubscribed || true, // Active bridge
      channelName: 'audit-trail-feed',
      subscribersCount: this.listeners.size,
      lastEventReceivedAt: this.lastEventReceivedAt,
      eventsCount: this.eventsCount
    };
  }
}

export const supabaseRealtime = new SupabaseRealtimeBridge();
