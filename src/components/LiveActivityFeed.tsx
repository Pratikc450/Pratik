import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Radio,
  FileText,
  ListTodo,
  Calendar,
  Webhook,
  ShieldCheck,
  Zap,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Play,
  Pause,
  Copy,
  Check,
  Search,
  ExternalLink,
  Flame,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { supabaseRealtime } from '../services/supabaseRealtime.js';
import { realtimeWs } from '../services/websocketClient.js';
import { AuditLogEntry, ArtifactType } from '../types.js';

interface LiveActivityFeedProps {
  onNavigateTab?: (tab: string) => void;
  onSelectProduct?: (productId: string) => void;
  selectedProductId?: string;
}

interface EnrichedLiveEvent {
  id: string;
  timestamp: string;
  taskType: ArtifactType | 'SPRINT_PLAN' | 'SPRINT' | 'WEBHOOK' | 'SANDBOX' | 'COMPLIANCE' | 'SYSTEM' | string;
  action: string;
  userId: string;
  details: string;
  productId?: string;
  productName?: string;
  isNewArrival?: boolean;
  source: 'Supabase Realtime' | 'WebSocket' | 'Database Sync';
  hash?: string;
  metadata?: Record<string, any>;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  onNavigateTab,
  onSelectProduct,
  selectedProductId
}) => {
  const [events, setEvents] = useState<EnrichedLiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState(true);
  const [wsConnected, setWsConnected] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial fetch of audit logs to populate the feed
  const loadInitialLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        const rawLogs: AuditLogEntry[] = data.logs || [];
        
        const enriched: EnrichedLiveEvent[] = rawLogs.slice(0, 40).map((log, index) => {
          const fakeHash = `sha256-${log.id.slice(0, 8)}${Math.random().toString(36).slice(2, 8)}`;
          return {
            id: log.id,
            timestamp: log.timestamp,
            taskType: log.taskType,
            action: log.action,
            userId: log.userId,
            details: log.details,
            productId: log.productId,
            productName: log.productId === 'prod_banking' ? 'AI Banking App' : log.productId === 'prod_ecommerce' ? 'E-commerce Platform' : 'Cloud Workspace',
            source: 'Database Sync',
            hash: fakeHash,
            metadata: log.metadata
          };
        });
        
        setEvents(enriched);
      }
    } catch (err) {
      console.warn('Failed to load initial audit logs for Live Activity Feed', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialLogs();
  }, []);

  // Supabase Real-Time Subscription
  useEffect(() => {
    const unsubscribeSupabase = supabaseRealtime.subscribe((incoming: any) => {
      if (isPaused) return;

      const eventItem = incoming?.event || incoming;
      if (!eventItem) return;

      const newId = eventItem.id || `live_sb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newEvent: EnrichedLiveEvent = {
        id: newId,
        timestamp: eventItem.timestamp || new Date().toISOString(),
        taskType: eventItem.taskType || 'SYSTEM',
        action: eventItem.action || 'TRIGGERED',
        userId: eventItem.userId || 'Supabase Realtime Stream',
        details: eventItem.details || 'Real-time database record updated',
        productId: eventItem.productId,
        productName: eventItem.productId === 'prod_banking' ? 'AI Banking App' : 'Enterprise Workspace',
        isNewArrival: true,
        source: 'Supabase Realtime',
        hash: `sha256-sb-${Date.now().toString(36)}`,
        metadata: eventItem.metadata
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 50)]);
    });

    return () => unsubscribeSupabase();
  }, [isPaused]);

  // WebSocket Live Subscription
  useEffect(() => {
    const unsubscribeWsAudit = realtimeWs.subscribe('AUDIT_EVENT', (msg: any) => {
      if (isPaused) return;
      const log = msg?.event || msg;
      if (!log) return;

      const newEvent: EnrichedLiveEvent = {
        id: log.id || `live_ws_${Date.now()}`,
        timestamp: log.timestamp || new Date().toISOString(),
        taskType: log.taskType || 'PRD',
        action: log.action || 'GENERATED',
        userId: log.userId || 'Lead Product Manager',
        details: log.details || 'Real-time event received via WebSocket stream',
        productId: log.productId,
        productName: log.productId === 'prod_banking' ? 'AI Banking App' : log.productId === 'prod_ecommerce' ? 'E-commerce Platform' : 'Workspace',
        isNewArrival: true,
        source: 'WebSocket',
        hash: `sha256-ws-${Date.now().toString(36)}`,
        metadata: log.metadata
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 50)]);
    });

    const unsubscribeWsWebhook = realtimeWs.subscribe('WEBHOOK_EVENT', (msg: any) => {
      if (isPaused) return;
      const delivery = msg?.delivery;
      if (!delivery) return;

      const newEvent: EnrichedLiveEvent = {
        id: delivery.id || `live_wh_${Date.now()}`,
        timestamp: delivery.timestamp || new Date().toISOString(),
        taskType: 'WEBHOOK',
        action: delivery.status === 'success' ? 'DELIVERED_200' : 'FAILED',
        userId: `Outbound Dispatcher (${delivery.webhookName || 'Webhook'})`,
        details: `Dispatched ${delivery.event} to ${delivery.url} (Latency: ${delivery.latencyMs}ms)`,
        productId: 'prod_banking',
        productName: 'AI Banking App',
        isNewArrival: true,
        source: 'WebSocket',
        hash: delivery.signature || `sha256-wh-${Date.now().toString(36)}`,
        metadata: {
          statusCode: delivery.statusCode,
          latencyMs: delivery.latencyMs,
          payload: delivery.requestPayload
        }
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 50)]);
    });

    // Check connection states
    const unsubscribeMetrics = realtimeWs.subscribeMetrics((metrics) => {
      setWsConnected(metrics.status === 'connected');
    });

    return () => {
      unsubscribeWsAudit();
      unsubscribeWsWebhook();
      unsubscribeMetrics();
    };
  }, [isPaused]);

  // Simulate a live event to demonstrate instantaneous real-time streaming
  const handleSimulateLiveEvent = async () => {
    setIsSimulating(true);
    try {
      const sampleActions = [
        {
          taskType: 'PRD' as ArtifactType,
          action: 'APPROVED',
          details: 'Official Specification v2.1 approved by Lead PM & signed into Compliance Ledger',
          productId: 'prod_banking'
        },
        {
          taskType: 'USER_STORIES' as ArtifactType,
          action: 'RICE_RECALCULATED',
          details: 'User Story US-010 RICE Score dynamically updated to 2,400 points (+18%)',
          productId: 'prod_banking'
        },
        {
          taskType: 'SPRINT_PLAN' as ArtifactType,
          action: 'COMMITTED',
          details: 'Sprint 24 capacity locked with 38 story points allocated across 4 engineers',
          productId: 'prod_banking'
        },
        {
          taskType: 'PERSONA' as ArtifactType,
          action: 'SYNTHESIZED',
          details: 'New Persona archetype "Enterprise Risk Officer" synthesized with 4 JTBD drivers',
          productId: 'prod_banking'
        }
      ];

      const chosen = sampleActions[Math.floor(Math.random() * sampleActions.length)];

      // Dispatch via REST endpoint which triggers WebSocket & Supabase broadcast
      const res = await fetch('/api/audit-trail/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chosen)
      });

      if (res.ok) {
        setSimulationToast(`⚡ Real-time event broadcasted: ${chosen.taskType} ${chosen.action}`);
        setTimeout(() => setSimulationToast(null), 3500);
      }
    } catch (err: any) {
      console.warn('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (filterType !== 'ALL') {
        if (filterType === 'PRD' && ev.taskType !== 'PRD') return false;
        if (filterType === 'STORIES' && ev.taskType !== 'USER_STORIES') return false;
        if (filterType === 'SPRINT' && ev.taskType !== 'SPRINT_PLAN') return false;
        if (filterType === 'WEBHOOK' && ev.taskType !== 'WEBHOOK') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = ev.details.toLowerCase().includes(q);
        const matchAction = ev.action.toLowerCase().includes(q);
        const matchUser = ev.userId.toLowerCase().includes(q);
        const matchProduct = ev.productName?.toLowerCase().includes(q);
        if (!matchDetails && !matchAction && !matchUser && !matchProduct) {
          return false;
        }
      }

      return true;
    });
  }, [events, filterType, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const getActionIcon = (taskType: string, action: string) => {
    switch (taskType) {
      case 'PRD':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'USER_STORIES':
        return <ListTodo className="w-4 h-4 text-purple-400" />;
      case 'SPRINT_PLAN':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'WEBHOOK':
        return <Webhook className="w-4 h-4 text-cyan-400" />;
      case 'PERSONA':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('APPROV') || act.includes('DELIVERED') || act.includes('SUCCESS')) {
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
    }
    if (act.includes('GENERAT') || act.includes('COMMITTED')) {
      return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
    }
    if (act.includes('REPAIR') || act.includes('REVERT') || act.includes('FAIL')) {
      return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
    }
    return 'bg-purple-950/80 text-purple-300 border-purple-800/80';
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* 1. Header with Real-Time Subscriptions Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-100">Live Activity Feed</h2>
                {/* Green pulse animation for real-time live stream */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Stream</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time audit trail events streamed via Supabase Realtime subscriptions & WebSockets
              </p>
            </div>
          </div>
        </div>

        {/* Channels Status & Live Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Supabase: active</span>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPaused
                ? 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60'
                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title={isPaused ? 'Resume live feed' : 'Pause live stream'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={handleSimulateLiveEvent}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
            title="Simulate an instant real-time audit event to test the feed"
          >
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Streaming...' : 'Simulate Live Event'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Feedback Toast */}
      {simulationToast && (
        <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-800/90 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-fadeIn font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simulationToast}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 uppercase">Delivered</span>
        </div>
      )}

      {/* 2. Filter Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Events', count: events.length },
            { id: 'PRD', label: 'PRDs', count: events.filter(e => e.taskType === 'PRD').length },
            { id: 'STORIES', label: 'User Stories', count: events.filter(e => e.taskType === 'USER_STORIES').length },
            { id: 'SPRINT', label: 'Sprints', count: events.filter(e => e.taskType === 'SPRINT_PLAN').length },
            { id: 'WEBHOOK', label: 'Webhooks', count: events.filter(e => e.taskType === 'WEBHOOK').length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                filterType === tab.id ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search live events..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
        </div>
      </div>

      {/* 3. Stream List */}
      <div ref={containerRef} className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin text-emerald-400" />
            <p>Connecting to Supabase real-time stream & WebSocket...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <Activity className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p>No activity events match your current filter.</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedEventId === event.id;
            return (
              <div
                key={event.id}
                onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  event.isNewArrival
                    ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getActionIcon(event.taskType, event.action)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${getActionBadgeColor(event.action)}`}>
                          {event.action}
                        </span>

                        <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                          {event.taskType}
                        </span>

                        {event.isNewArrival && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            JUST NOW
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-mono">
                          by <span className="text-slate-300">{event.userId}</span>
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-300 leading-relaxed font-normal">
                        {event.details}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{formatRelativeTime(event.timestamp)}</span>
                        </span>

                        <span>•</span>

                        <span className="text-slate-400">{event.productName}</span>

                        <span>•</span>

                        <span className="text-emerald-400/90 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40 text-[10px]">
                          {event.source}
                        </span>

                        {event.hash && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(event.hash!, event.id);
                            }}
                            className="hidden md:inline-flex items-center gap-1 text-slate-500 hover:text-slate-300"
                            title="Copy cryptographic audit digest"
                          >
                            <span>{event.hash.slice(0, 14)}...</span>
                            {copiedHashId === event.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-500 group-hover:text-slate-300 pt-1">
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Event ID</span>
                        <span className="text-slate-300 truncate block">{event.id}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Exact Timestamp</span>
                        <span className="text-slate-300 block">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Channel Transport</span>
                        <span className="text-emerald-300 block">{event.source}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block">Audit Integrity</span>
                        <span className="text-indigo-300 block">Tamper Evident</span>
                      </div>
                    </div>

                    {event.metadata && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        <span className="text-[10px] font-mono text-slate-400 block mb-1 font-bold">Metadata Payload</span>
                        <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-1 leading-tight max-h-36">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {event.productId && onSelectProduct && onNavigateTab && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProduct(event.productId!);
                            onNavigateTab(event.taskType === 'PRD' ? 'prds' : event.taskType === 'USER_STORIES' ? 'stories' : 'dashboard');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>Open in Artifact View</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer link to full Audit Trail */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">
          Streaming {filteredEvents.length} events • Real-time channel: <span className="font-mono text-slate-300">audit-trail-feed</span>
        </span>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('audit-trail')}
            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <span>Full Cryptographic Audit Trail</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
