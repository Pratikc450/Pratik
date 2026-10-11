import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  ShieldCheck,
  Sparkles,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Download,
  RefreshCw,
  Plus,
  User,
  Bot,
  Layers,
  ChevronRight,
  ExternalLink,
  Tag,
  Eye,
  X,
  FileText,
  Calendar,
  Share2,
  FileSpreadsheet,
  Check,
  Radio
} from 'lucide-react';
import { Product, AuditCategory, AuditTrailItem } from '../types.js';
import { WebSocketEventMonitor } from './WebSocketEventMonitor.js';

interface AuditTrailProps {
  selectedProductId: string;
  products?: Product[];
  onSelectProduct?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const CATEGORY_META: Record<AuditCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; border: string; bg: string }> = {
  ARTIFACT_MODIFICATION: {
    label: 'Artifact Modifications',
    icon: Edit3,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10'
  },
  APPROVAL_GATE: {
    label: 'Approval Events',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10'
  },
  AI_GENERATION: {
    label: 'AI-Generated Updates',
    icon: Sparkles,
    color: 'text-indigo-400',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/10'
  },
  WORKSPACE_ACTION: {
    label: 'Workspace Actions',
    icon: History,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10'
  }
};

export const AuditTrail: React.FC<AuditTrailProps> = ({
  selectedProductId,
  products = [],
  onSelectProduct,
  onNavigateTab
}) => {
  const [events, setEvents] = useState<AuditTrailItem[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    artifactModificationsCount: 0,
    approvalEventsCount: 0,
    aiGenerationsCount: 0,
    workspaceActionsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [inspectEvent, setInspectEvent] = useState<AuditTrailItem | null>(null);
  const [showWsMonitor, setShowWsMonitor] = useState(true);

  // Manual compliance event modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualCategory, setManualCategory] = useState<AuditCategory>('ARTIFACT_MODIFICATION');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAuditTrail = async () => {
    try {
      const res = await fetch(`/api/workspace/${selectedProductId}/audit-trail`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch audit trail', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAuditTrail();
  }, [selectedProductId]);

  // Auto-refresh interval
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchAuditTrail();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, selectedProductId]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Filtering
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      // Category filter
      if (selectedCategory !== 'ALL' && ev.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title?.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        const matchesAuthor = ev.author?.name?.toLowerCase().includes(q);
        const matchesArt = ev.artifactTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAuthor && !matchesArt) {
          return false;
        }
      }

      // Time filter
      if (timeFilter !== 'ALL') {
        const evTime = new Date(ev.timestamp).getTime();
        const now = Date.now();
        if (timeFilter === '24H' && now - evTime > 24 * 3600 * 1000) return false;
        if (timeFilter === '7D' && now - evTime > 7 * 24 * 3600 * 1000) return false;
        if (timeFilter === '30D' && now - evTime > 30 * 24 * 3600 * 1000) return false;
      }

      return true;
    });
  }, [events, selectedCategory, searchQuery, timeFilter]);

  // Handle Manual Log Submit
  const handleLogManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    setIsSubmittingLog(true);
    try {
      const res = await fetch(`/api/workspace/${selectedProductId}/audit-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          description: manualDescription.trim(),
          category: manualCategory,
          action: manualCategory === 'APPROVAL_GATE' ? 'APPROVED' : 'MODIFIED',
          authorName: 'Lead Product Manager',
          authorRole: 'Product Lead'
        })
      });

      if (res.ok) {
        setToastMessage('Compliance audit record committed to workspace log!');
        setTimeout(() => setToastMessage(null), 4000);
        setManualTitle('');
        setManualDescription('');
        setIsLogModalOpen(false);
        fetchAuditTrail();
      }
    } catch (err) {
      console.error('Failed to log audit event', err);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Category', 'Title', 'Description', 'Author', 'TaskType', 'Version', 'Action'];
    const rows = filteredEvents.map(e => [
      `"${e.timestamp}"`,
      `"${e.category}"`,
      `"${e.title?.replace(/"/g, '""') || ''}"`,
      `"${e.description?.replace(/"/g, '""') || ''}"`,
      `"${e.author?.name || 'System'}"`,
      `"${e.taskType || ''}"`,
      `"${e.version || ''}"`,
      `"${e.action || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_trail_${selectedProductId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_trail_${selectedProductId}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Workspace Audit Trail</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Chronological compliance record of artifact modifications, official approval gates, and AI-generated revisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {products.length > 0 && onSelectProduct && (
            <select
              value={selectedProductId}
              onChange={(e) => onSelectProduct(e.target.value)}
              className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowWsMonitor(!showWsMonitor)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showWsMonitor
                ? 'bg-indigo-600/90 hover:bg-indigo-500 text-white border-indigo-500/80 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="Toggle Centralized WebSocket Event Monitor"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>WebSocket Monitor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Log Compliance Note</span>
          </button>

          <button
            type="button"
            onClick={fetchAuditTrail}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Centralized WebSocket Event Monitor for Observability & Audit Trail Logging */}
      {showWsMonitor && (
        <div className="animate-in fade-in duration-300">
          <WebSocketEventMonitor
            selectedProductId={selectedProductId}
            onNavigateTab={onNavigateTab}
          />
        </div>
      )}

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Events</span>
          </span>
          <div className="text-2xl font-black text-slate-100">{stats.totalEvents}</div>
          <p className="text-[10px] text-slate-500">Immutable ledger history</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Artifact Changes</span>
          </span>
          <div className="text-2xl font-black text-cyan-400">{stats.artifactModificationsCount}</div>
          <p className="text-[10px] text-slate-500">Revisions & schema mutations</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approval Gates</span>
          </span>
          <div className="text-2xl font-black text-emerald-400">{stats.approvalEventsCount}</div>
          <p className="text-[10px] text-slate-500">Human PM promotions</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Generations</span>
          </span>
          <div className="text-2xl font-black text-purple-400">{stats.aiGenerationsCount}</div>
          <p className="text-[10px] text-slate-500">Gemini model syntheses</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-100 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              All Events ({events.length})
            </button>

            {(['ARTIFACT_MODIFICATION', 'APPROVAL_GATE', 'AI_GENERATION', 'WORKSPACE_ACTION'] as AuditCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const count = cat === 'ARTIFACT_MODIFICATION'
                ? stats.artifactModificationsCount
                : cat === 'APPROVAL_GATE'
                  ? stats.approvalEventsCount
                  : cat === 'AI_GENERATION'
                    ? stats.aiGenerationsCount
                    : stats.workspaceActionsCount;

              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? `${meta.bg} ${meta.color} ${meta.border} font-bold shadow-sm ring-1`
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Time & Auto-refresh */}
          <div className="flex items-center gap-2">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-slate-950 text-xs font-semibold text-slate-300 border border-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>

            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                isAutoRefresh
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
              title="Toggle 10s auto-refresh"
            >
              <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[11px]">Live</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={handleExportCsv}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Export CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={handleExportJson}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                title="Export JSON"
              >
                <Download className="w-4 h-4 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by event title, author, description, or artifact ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chronological Event Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs">Streaming chronological workspace audit logs...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2 rounded-2xl bg-slate-900/40 border border-slate-800">
            <History className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">No audit events found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your category filter or search query.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const cat = CATEGORY_META[event.category] || CATEGORY_META.WORKSPACE_ACTION;
            const Icon = cat.icon;
            const isApproved = event.action === 'APPROVED' || event.category === 'APPROVAL_GATE';
            const isAi = event.category === 'AI_GENERATION' || event.author?.name?.includes('Gemini');

            return (
              <div
                key={event.id}
                onClick={() => setInspectEvent(event)}
                className={`p-4 rounded-2xl bg-slate-900/80 border transition-all cursor-pointer hover:bg-slate-900 group ${
                  isApproved
                    ? 'border-emerald-500/40 hover:border-emerald-500/60'
                    : isAi
                      ? 'border-indigo-500/30 hover:border-indigo-500/60'
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Category Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cat.bg} ${cat.border} ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-200 transition-colors">
                          {event.title}
                        </span>

                        {event.taskType && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                            {event.taskType}
                          </span>
                        )}

                        {event.version && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                            v{event.version}
                          </span>
                        )}

                        {isApproved && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                            OFFICIALLY APPROVED
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Author & Context row */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${event.author?.avatarBg || 'bg-slate-700'}`}>
                            {isAi ? <Bot className="w-2.5 h-2.5" /> : (event.author?.name?.charAt(0) || 'U')}
                          </div>
                          <span className="font-medium text-slate-300">{event.author?.name || 'System User'}</span>
                          {event.author?.role && (
                            <span className="text-slate-500">· {event.author.role}</span>
                          )}
                        </div>

                        {event.artifactId && (
                          <span className="font-mono text-[10px] text-slate-500">
                            ID: {event.artifactId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp & Inspect Arrow */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 text-right">
                    <span className="text-xs font-mono font-semibold text-slate-300" title={event.timestamp}>
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inspect Event Modal / Drawer */}
      {inspectEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Audit Record Inspector</h3>
              </div>
              <button
                onClick={() => setInspectEvent(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500">Event Title</span>
                <h4 className="text-base font-bold text-slate-100">{inspectEvent.title}</h4>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="font-semibold text-slate-200">{inspectEvent.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Author / Entity</span>
                  <span className="font-semibold text-slate-200">{inspectEvent.author?.name} ({inspectEvent.author?.role})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Timestamp</span>
                  <span className="font-mono text-slate-300">{inspectEvent.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Version Reference</span>
                  <span className="font-mono text-slate-300">{inspectEvent.version ? `v${inspectEvent.version}` : 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Detailed Description</span>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                  {inspectEvent.description}
                </p>
              </div>

              {inspectEvent.metadata && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Metadata Snapshot</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(inspectEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Compliance Event Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Log Manual Compliance Record</h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogManualEvent} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Event Title</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g., Executive Stakeholder Sign-Off / Security SLA Audit"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Event Category</label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as AuditCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="APPROVAL_GATE">Approval Gate (Gate Sign-off / Promotion)</option>
                  <option value="ARTIFACT_MODIFICATION">Artifact Modification (Manual Schema Edit)</option>
                  <option value="WORKSPACE_ACTION">Workspace Action (Policy / Stakeholder Note)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-200">Details / Verification Notes</label>
                <textarea
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Provide context, meeting references, or specific compliance verifications..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmittingLog ? 'Recording...' : 'Commit to Audit Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
