import React, { useState, useEffect, useMemo } from 'react';
import {
  Webhook,
  Plus,
  Play,
  RotateCw,
  Trash2,
  Edit2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  X,
  Code,
  Layers,
  Sparkles,
  Search,
  Filter,
  Activity,
  Key,
  Globe,
  Radio,
  FileText,
  ListTodo,
  Calendar,
  MessageSquare
} from 'lucide-react';
import {
  AppWebhook,
  WebhookDeliveryLog,
  WebhookEventType,
  WebhooksOverviewStats
} from '../types.js';

interface WebhookSettingsManagerProps {
  onNotification?: (msg: string) => void;
}

const SERVICE_META: Record<AppWebhook['targetService'], { label: string; color: string; badge: string; icon: string; defaultUrlPlaceholder: string }> = {
  Jira: {
    label: 'Atlassian Jira',
    color: 'text-blue-400',
    badge: 'bg-blue-950/70 border-blue-800 text-blue-300',
    icon: '🔷',
    defaultUrlPlaceholder: 'https://api.atlassian.com/ex/jira/webhook/...'
  },
  Slack: {
    label: 'Slack',
    color: 'text-emerald-400',
    badge: 'bg-emerald-950/70 border-emerald-800 text-emerald-300',
    icon: '💬',
    defaultUrlPlaceholder: 'https://hooks.slack.com/services/...'
  },
  Linear: {
    label: 'Linear',
    color: 'text-indigo-400',
    badge: 'bg-indigo-950/70 border-indigo-800 text-indigo-300',
    icon: '⚡',
    defaultUrlPlaceholder: 'https://api.linear.app/webhooks/...'
  },
  GitHub: {
    label: 'GitHub Actions',
    color: 'text-slate-300',
    badge: 'bg-slate-900 border-slate-700 text-slate-200',
    icon: '🐙',
    defaultUrlPlaceholder: 'https://api.github.com/repos/:owner/:repo/dispatches'
  },
  Discord: {
    label: 'Discord',
    color: 'text-purple-400',
    badge: 'bg-purple-950/70 border-purple-800 text-purple-300',
    icon: '🎮',
    defaultUrlPlaceholder: 'https://discord.com/api/webhooks/...'
  },
  Custom: {
    label: 'Custom Endpoint',
    color: 'text-amber-400',
    badge: 'bg-amber-950/70 border-amber-800 text-amber-300',
    icon: '🌐',
    defaultUrlPlaceholder: 'https://api.yourdomain.com/v1/webhooks/pm-events'
  }
};

const EVENT_INFO: Record<WebhookEventType, { label: string; group: 'PRD' | 'User Stories' | 'Sprint'; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  'prd.generated': {
    label: 'PRD Generated',
    group: 'PRD',
    description: 'Triggered when an initial PRD specification is synthesized or generated via Gemini API',
    icon: FileText
  },
  'prd.updated': {
    label: 'PRD Updated / Approved',
    group: 'PRD',
    description: 'Triggered when a PRD is revised, human-approved to Official Spec, or comments are resolved',
    icon: FileText
  },
  'user_stories.generated': {
    label: 'User Stories Generated',
    group: 'User Stories',
    description: 'Triggered when a new suite of vertical user stories with Gherkin BDD criteria is created',
    icon: ListTodo
  },
  'user_stories.updated': {
    label: 'User Stories Mutated',
    group: 'User Stories',
    description: 'Triggered when story RICE parameters, acceptance criteria, or status change',
    icon: ListTodo
  },
  'sprint.planned': {
    label: 'Sprint Backlog Committed',
    group: 'Sprint',
    description: 'Triggered when stories are committed into an active 2-week sprint backlog',
    icon: Calendar
  },
  'sprint.updated': {
    label: 'Sprint Story Advanced',
    group: 'Sprint',
    description: 'Triggered when a sprint story moves to IN_PROGRESS, REVIEW, or DONE',
    icon: Calendar
  }
};

export const WebhookSettingsManager: React.FC<WebhookSettingsManagerProps> = ({ onNotification }) => {
  const [webhooks, setWebhooks] = useState<AppWebhook[]>([]);
  const [stats, setStats] = useState<WebhooksOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<'ALL' | 'PRD' | 'Stories' | 'Sprint'>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<AppWebhook | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    targetService: 'Custom' as AppWebhook['targetService'],
    events: ['prd.generated', 'user_stories.generated', 'sprint.planned'] as WebhookEventType[],
    enabled: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deliveries Drawer State
  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
  const [selectedWebhookForDeliveries, setSelectedWebhookForDeliveries] = useState<AppWebhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [selectedDeliveryInspect, setSelectedDeliveryInspect] = useState<WebhookDeliveryLog | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);

  // Test Ping State
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Documentation Accordion
  const [showDocumentation, setShowDocumentation] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (onNotification) onNotification(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/settings/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to load webhooks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingWebhook(null);
    setFormData({
      name: '',
      url: '',
      secret: `whsec_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`,
      targetService: 'Custom',
      events: ['prd.generated', 'prd.updated', 'user_stories.generated', 'user_stories.updated', 'sprint.planned'],
      enabled: true
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (webhook: AppWebhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: webhook.secret || '',
      targetService: webhook.targetService,
      events: [...webhook.events],
      enabled: webhook.enabled
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      setFormError('Webhook Name and Target URL are required');
      return;
    }
    if (formData.events.length === 0) {
      setFormError('Select at least one event subscription');
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      setFormError('Please enter a valid HTTP/HTTPS URL (e.g., https://api.yourdomain.com/webhook)');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingWebhook) {
        const res = await fetch(`/api/settings/webhooks/${editingWebhook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          showToast(`✅ Webhook "${formData.name}" updated successfully.`);
          setIsFormModalOpen(false);
          fetchWebhooks();
        } else {
          const err = await res.json();
          setFormError(err.error || 'Failed to update webhook');
        }
      } else {
        const res = await fetch('/api/settings/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          showToast(`🚀 Webhook "${formData.name}" created and activated.`);
          setIsFormModalOpen(false);
          fetchWebhooks();
        } else {
          const err = await res.json();
          setFormError(err.error || 'Failed to create webhook');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Network request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEnabled = async (webhook: AppWebhook) => {
    const nextState = !webhook.enabled;
    // Optimistic UI update
    setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, enabled: nextState } : w));
    try {
      const res = await fetch(`/api/settings/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        showToast(`Webhook ${webhook.name} ${nextState ? 'enabled' : 'paused'}.`);
        fetchWebhooks();
      } else {
        fetchWebhooks(); // Revert
      }
    } catch {
      fetchWebhooks(); // Revert
    }
  };

  const handleDeleteWebhook = async (webhook: AppWebhook) => {
    if (!window.confirm(`Are you sure you want to delete webhook "${webhook.name}"? External tools will stop receiving events.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/settings/webhooks/${webhook.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`🗑️ Webhook "${webhook.name}" deleted.`);
        fetchWebhooks();
      }
    } catch (e) {
      showToast('Failed to delete webhook');
    }
  };

  const handleSendTestPing = async (webhook: AppWebhook, event: WebhookEventType = 'prd.generated') => {
    setTestingWebhookId(webhook.id);
    try {
      const res = await fetch(`/api/settings/webhooks/${webhook.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleEvent: event })
      });
      const data = await res.json();
      if (res.ok && data.delivery) {
        showToast(`⚡ Test Ping Sent to ${webhook.targetService}: HTTP ${data.delivery.statusCode} (${data.delivery.latencyMs}ms)`);
        fetchWebhooks();
      } else {
        showToast(`⚠️ Test Ping Failed: ${data.error || 'Endpoint did not return 2xx'}`);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setTestingWebhookId(null);
    }
  };

  const handleOpenDeliveriesModal = async (webhook?: AppWebhook) => {
    setSelectedWebhookForDeliveries(webhook || null);
    setIsDeliveriesModalOpen(true);
    setDeliveriesLoading(true);
    setSelectedDeliveryInspect(null);

    try {
      const url = webhook ? `/api/settings/webhooks/${webhook.id}/deliveries` : '/api/settings/webhooks/deliveries/all';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        if (data.deliveries && data.deliveries.length > 0) {
          setSelectedDeliveryInspect(data.deliveries[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load deliveries', e);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    setRetryingDeliveryId(deliveryId);
    try {
      const res = await fetch(`/api/settings/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`🔄 Delivery retried: HTTP ${data.delivery.statusCode} in ${data.delivery.latencyMs}ms`);
        // Refresh deliveries list
        handleOpenDeliveriesModal(selectedWebhookForDeliveries || undefined);
        fetchWebhooks();
      } else {
        showToast('Failed to retry delivery');
      }
    } catch (e) {
      showToast('Retry request failed');
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleEventSelection = (event: WebhookEventType) => {
    setFormData(prev => {
      const exists = prev.events.includes(event);
      return {
        ...prev,
        events: exists ? prev.events.filter(e => e !== event) : [...prev.events, event]
      };
    });
  };

  // Filtered Webhooks
  const filteredWebhooks = useMemo(() => {
    return webhooks.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.targetService.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterGroup === 'PRD') {
        return w.events.some(e => e.startsWith('prd.'));
      }
      if (filterGroup === 'Stories') {
        return w.events.some(e => e.startsWith('user_stories.'));
      }
      if (filterGroup === 'Sprint') {
        return w.events.some(e => e.startsWith('sprint.'));
      }
      return true;
    });
  }, [webhooks, searchQuery, filterGroup]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500/80 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Container Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-sm">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    Real-Time Outbound Webhook Subscriptions
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                    v2.0 Event Bus
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Notify external systems (Jira, Slack, Linear, GitHub Actions) when <strong>PRDs</strong>, <strong>User Stories</strong>, or <strong>Sprint Plans</strong> are generated or updated.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenDeliveriesModal()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Delivery Logs</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Webhook</span>
            </button>
          </div>
        </div>

        {/* Real-Time Metrics Overview Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Active Subscriptions</div>
              <div className="text-xl font-bold font-mono text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{stats.activeWebhooks}</span>
                <span className="text-xs text-slate-500 font-normal">/ {stats.totalWebhooks}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Total Deliveries</div>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {stats.totalDeliveries.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Delivery Success Rate</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {stats.successRate}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Cryptographic Security</div>
              <div className="text-xs font-semibold text-indigo-300 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>HMAC-SHA256 Signed</span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Event Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hook name, target service, or URL..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'PRD', label: 'PRD Specs' },
              { id: 'Stories', label: 'User Stories' },
              { id: 'Sprint', label: 'Sprint Plans' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterGroup(f.id as any)}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  filterGroup === f.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Webhooks Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading registered webhooks...</span>
            </div>
          ) : filteredWebhooks.length > 0 ? (
            filteredWebhooks.map((webhook) => {
              const meta = SERVICE_META[webhook.targetService] || SERVICE_META.Custom;
              const isTesting = testingWebhookId === webhook.id;

              return (
                <div
                  key={webhook.id}
                  className={`p-4 rounded-xl border transition-all ${
                    webhook.enabled
                      ? 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-70'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info & Events */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base select-none">{meta.icon}</span>
                        <h3 className="text-sm font-bold text-slate-100 truncate">
                          {webhook.name}
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${meta.badge}`}>
                          {meta.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(webhook)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer font-bold ${
                            webhook.enabled
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}
                        >
                          {webhook.enabled ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </div>

                      {/* URL with Copy */}
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 group">
                        <span className="truncate max-w-md bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300">
                          {webhook.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(webhook.url, `url_${webhook.id}`)}
                          className="text-slate-500 hover:text-slate-300 p-1"
                          title="Copy Webhook URL"
                        >
                          {copiedId === `url_${webhook.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Subscribed Event Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                          Events ({webhook.events.length}):
                        </span>
                        {webhook.events.map(ev => {
                          const evMeta = EVENT_INFO[ev];
                          const Icon = evMeta ? evMeta.icon : Radio;
                          return (
                            <span
                              key={ev}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1"
                            >
                              <Icon className="w-2.5 h-2.5 text-cyan-400" />
                              <span>{evMeta ? evMeta.label : ev}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Last Dispatch Status & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-900">
                      {/* Health telemetry badge */}
                      <div className="text-right sm:text-left text-[11px] space-y-0.5">
                        <div className="flex items-center sm:justify-end gap-1.5">
                          {webhook.lastStatus === 'success' ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>HTTP {webhook.lastStatusCode || 200}</span>
                            </span>
                          ) : webhook.lastStatus === 'failed' ? (
                            <span className="flex items-center gap-1 text-rose-400 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>HTTP {webhook.lastStatusCode || 500}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">No delivery yet</span>
                          )}
                          {webhook.lastLatencyMs && (
                            <span className="font-mono text-slate-400">({webhook.lastLatencyMs}ms)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {webhook.lastDispatchedAt ? (
                            <span>Last: {new Date(webhook.lastDispatchedAt).toLocaleTimeString()}</span>
                          ) : (
                            <span>{webhook.deliveriesCount} total sent</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Send Test Ping Button */}
                        <button
                          type="button"
                          onClick={() => handleSendTestPing(webhook)}
                          disabled={isTesting}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="Dispatch Instant Test Notification"
                        >
                          <Send className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          <span>{isTesting ? 'Pinging...' : 'Test Ping'}</span>
                        </button>

                        {/* View Logs Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeliveriesModal(webhook)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Delivery History Logs"
                        >
                          <Activity className="w-3 h-3 text-slate-400" />
                          <span>Logs</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(webhook)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                          title="Edit Webhook"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteWebhook(webhook)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition-colors cursor-pointer"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-950/50 border border-dashed border-slate-800 space-y-3">
              <Webhook className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs text-slate-400 font-medium">
                No outbound webhooks matching "{searchQuery}"
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Webhook Subscription</span>
              </button>
            </div>
          )}
        </div>

        {/* Integration Documentation Accordion */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowDocumentation(!showDocumentation)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 cursor-pointer font-medium p-2 rounded-lg hover:bg-slate-950"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>External Tools Integration Guide & Payload Schema Documentation</span>
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              {showDocumentation ? 'Hide Documentation' : 'View Payload Spec'}
            </span>
          </button>

          {showDocumentation && (
            <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Cryptographic Verification Header</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Every webhook contains an <code className="text-indigo-300 font-mono">X-Navigator-Signature</code> header generated via HMAC-SHA256 using your secret token. Verify payload integrity in Node.js:
                  </p>
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
{`const crypto = require('crypto');
const signature = req.headers['x-navigator-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');

if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
  // Signature authentic! Process PRD/Story/Sprint payload
}`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Real-Time Event Payloads</span>
                  </h4>
                  <div className="space-y-1.5 text-[11px] text-slate-400">
                    <div>
                      <strong className="text-slate-300 font-mono">prd.generated / prd.updated:</strong>
                      <span className="block text-slate-500">Includes productId, version, objective, functional requirements, and Zod schema validation status.</span>
                    </div>
                    <div>
                      <strong className="text-slate-300 font-mono">user_stories.generated / updated:</strong>
                      <span className="block text-slate-500">Includes story statements (As a / I want / so that), Gherkin criteria, story points, and RICE scores.</span>
                    </div>
                    <div>
                      <strong className="text-slate-300 font-mono">sprint.planned / updated:</strong>
                      <span className="block text-slate-500">Includes sprint name, target velocity, total points committed, assignees, and active stories.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create or Edit Webhook */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {editingWebhook ? 'Edit Webhook Subscription' : 'Create Outbound Webhook Subscription'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure endpoint destination and subscribed artifact triggers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWebhook} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Webhook Name */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Webhook Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Jira Agile Backlog Sync or Slack #product-releases"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              {/* Target Service Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Target External Tool</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(SERVICE_META) as Array<AppWebhook['targetService']>).map(srv => {
                    const meta = SERVICE_META[srv];
                    const isSelected = formData.targetService === srv;
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            targetService: srv,
                            url: prev.url ? prev.url : meta.defaultUrlPlaceholder
                          }));
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-bold shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-base select-none">{meta.icon}</div>
                        <div className="text-[10px] truncate mt-0.5">{srv}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint Target URL */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Destination HTTP POST URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://api.atlassian.com/ex/jira/webhook/story-sync"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              {/* Secret Token */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>HMAC SHA-256 Secret (Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      secret: `whsec_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`
                    })}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Regenerate Secret
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.secret}
                  onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                  placeholder="whsec_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                />
              </div>

              {/* Subscribed Events Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Subscribed Event Triggers</label>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formData.events.length} Selected
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(Object.keys(EVENT_INFO) as WebhookEventType[]).map(ev => {
                    const info = EVENT_INFO[ev];
                    const isChecked = formData.events.includes(ev);
                    const Icon = info.icon;

                    return (
                      <div
                        key={ev}
                        onClick={() => toggleEventSelection(ev)}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-800 text-slate-100'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-950'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEventSelection(ev)}
                          className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{info.label}</span>
                            <span className="text-[10px] font-mono text-slate-500">({ev})</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {info.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enabled Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300">Active Status</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200 font-medium">
                    {formData.enabled ? 'Enabled (Receives notifications)' : 'Paused'}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingWebhook ? 'Update Subscription' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Deliveries History & Inspector */}
      {isDeliveriesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Webhook Delivery Audit Logs
                    {selectedWebhookForDeliveries && ` · ${selectedWebhookForDeliveries.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Inspecting real-time outbound delivery dispatches and HTTP response headers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveriesModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Left list, Right inspector */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[360px]">
              {/* Deliveries List */}
              <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-3 space-y-2">
                {deliveriesLoading ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading deliveries...</span>
                  </div>
                ) : deliveries.length > 0 ? (
                  deliveries.map((deliv) => {
                    const isSelected = selectedDeliveryInspect?.id === deliv.id;
                    return (
                      <div
                        key={deliv.id}
                        onClick={() => setSelectedDeliveryInspect(deliv)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-600 text-slate-100 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-950 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            deliv.status === 'success'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            HTTP {deliv.statusCode}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(deliv.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="font-bold text-slate-200 mt-1 truncate">
                          {deliv.event}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {deliv.webhookName} ({deliv.latencyMs}ms)
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No webhook deliveries recorded yet.
                  </div>
                )}
              </div>

              {/* Delivery Inspector Details */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                {selectedDeliveryInspect ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <span>Delivery: {selectedDeliveryInspect.event}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            selectedDeliveryInspect.status === 'success'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            HTTP {selectedDeliveryInspect.statusCode} · {selectedDeliveryInspect.latencyMs}ms
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {selectedDeliveryInspect.id} · Timestamp: {selectedDeliveryInspect.timestamp}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRetryDelivery(selectedDeliveryInspect.id)}
                        disabled={retryingDeliveryId === selectedDeliveryInspect.id}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${retryingDeliveryId === selectedDeliveryInspect.id ? 'animate-spin' : ''}`} />
                        <span>Redeliver</span>
                      </button>
                    </div>

                    {/* Destination URL */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 break-all">
                      <span className="text-slate-500 font-bold block mb-1">Target Endpoint:</span>
                      {selectedDeliveryInspect.url}
                    </div>

                    {/* Cryptographic Signature */}
                    {selectedDeliveryInspect.signature && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 break-all">
                        <span className="text-slate-500 font-bold block mb-1">Header: X-Navigator-Signature</span>
                        {selectedDeliveryInspect.signature}
                      </div>
                    )}

                    {/* Request Payload */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                        <span>Request Body (JSON)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(JSON.stringify(selectedDeliveryInspect.requestPayload, null, 2), 'copy_payload')}
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Payload</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-56">
                        {JSON.stringify(selectedDeliveryInspect.requestPayload, null, 2)}
                      </pre>
                    </div>

                    {/* Response Body */}
                    {selectedDeliveryInspect.responseBody && (
                      <div className="space-y-1">
                        <span className="text-slate-400 font-semibold text-[11px]">Downstream Response</span>
                        <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                          {selectedDeliveryInspect.responseBody}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-500">
                    Select a delivery from the left to inspect HTTP headers and payload data.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
