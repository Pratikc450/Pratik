import React, { useState, useEffect, useMemo } from 'react';
import {
  Webhook,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code,
  ShieldCheck,
  Send,
  Eye,
  RefreshCw,
  X,
  Radio,
  FileText,
  ListTodo,
  Calendar,
  Layers,
  ArrowUpRight,
  Trash2,
  Download
} from 'lucide-react';
import { WebhookDeliveryLog, WebhookEventType, AppWebhook } from '../types.js';
import { realtimeWs } from '../services/websocketClient.js';

interface WebhookEventHistoryProps {
  onNotification?: (msg: string) => void;
  selectedWebhookId?: string;
}

export const WebhookEventHistory: React.FC<WebhookEventHistoryProps> = ({
  onNotification,
  selectedWebhookId
}) => {
  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [webhooks, setWebhooks] = useState<AppWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'success' | 'failed'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [inspectModalLog, setInspectModalLog] = useState<WebhookDeliveryLog | null>(null);
  const [activeTabInspection, setActiveTabInspection] = useState<'payload' | 'response' | 'headers'>('payload');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (onNotification) onNotification(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/settings/webhooks/deliveries/all');
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (e) {
      console.warn('Failed to load webhook delivery history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/settings/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (e) {
      console.warn('Failed to fetch webhooks list:', e);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchWebhooks();
  }, []);

  // Real-time WebSocket subscription for instant webhook event history updates
  useEffect(() => {
    const unsubscribeWs = realtimeWs.subscribe('WEBHOOK_EVENT', (msg: any) => {
      const delivery = msg?.delivery;
      if (!delivery) return;

      setDeliveries(prev => [delivery, ...prev.filter(d => d.id !== delivery.id)]);
      showToast(`⚡ Webhook event triggered: ${delivery.event} (${delivery.statusCode} ${delivery.status})`);
    });

    return () => unsubscribeWs();
  }, []);

  const handleRetry = async (deliveryId: string) => {
    setIsRetryingId(deliveryId);
    try {
      const res = await fetch(`/api/settings/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.delivery) {
        setDeliveries(prev => [data.delivery, ...prev]);
        showToast(`✅ Retried delivery successfully (HTTP ${data.delivery.statusCode} in ${data.delivery.latencyMs}ms)`);
      } else {
        showToast(`❌ Retry error: ${data.error || 'Failed to retry webhook'}`);
      }
    } catch (err: any) {
      showToast(`❌ Retry error: ${err.message}`);
    } finally {
      setIsRetryingId(null);
    }
  };

  const handleQuickTest = async (webhookId: string) => {
    setIsTestingWebhook(true);
    try {
      const res = await fetch(`/api/settings/webhooks/${webhookId}/test`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.delivery) {
        setDeliveries(prev => [data.delivery, ...prev]);
        showToast(`✅ Test dispatched to ${data.delivery.webhookName} (HTTP ${data.delivery.statusCode})`);
      }
    } catch (err: any) {
      showToast(`Test dispatch failed: ${err.message}`);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string, type: 'payload' | 'response', id: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'payload') {
      setCopiedPayloadId(id);
      setTimeout(() => setCopiedPayloadId(null), 2000);
    } else {
      setCopiedResponseId(id);
      setTimeout(() => setCopiedResponseId(null), 2000);
    }
  };

  // Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      if (selectedWebhookId && d.webhookId !== selectedWebhookId) return false;

      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;

      if (eventFilter !== 'ALL' && d.event !== eventFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.webhookName?.toLowerCase().includes(q);
        const matchUrl = d.url?.toLowerCase().includes(q);
        const matchEvent = d.event?.toLowerCase().includes(q);
        const matchId = d.id?.toLowerCase().includes(q);
        const matchPayload = JSON.stringify(d.requestPayload || {}).toLowerCase().includes(q);
        const matchResp = (d.responseBody || '').toLowerCase().includes(q);
        if (!matchName && !matchUrl && !matchEvent && !matchId && !matchPayload && !matchResp) {
          return false;
        }
      }

      return true;
    });
  }, [deliveries, selectedWebhookId, statusFilter, eventFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = deliveries.length;
    const success = deliveries.filter(d => d.status === 'success').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 100;
    const avgLatency = total > 0 
      ? Math.round(deliveries.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0) / total) 
      : 0;
    return { total, success, failed, successRate, avgLatency };
  }, [deliveries]);

  const exportLogsAsJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(deliveries, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `webhook-event-history-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported webhook history JSON');
  };

  const getStatusBadge = (statusCode: number, status: 'success' | 'failed') => {
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{statusCode} OK</span>
        </span>
      );
    }
    if (statusCode === 204) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
          <span>204 NO CONTENT</span>
        </span>
      );
    }
    if (statusCode === 504 || statusCode === 502) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>{statusCode} TIMEOUT</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
        <AlertTriangle className="w-3 h-3 text-rose-400" />
        <span>{statusCode} FAILED</span>
      </span>
    );
  };

  return (
    <div id="webhook-event-history-component" className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* 1. Header with Status & Summary Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Webhook className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Webhook Event History</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>Real-Time Stream</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Status codes, payloads, headers, and response logs for all dispatched integration webhooks
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {webhooks.length > 0 && (
            <button
              onClick={() => handleQuickTest(webhooks[0].id)}
              disabled={isTestingWebhook}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Test fire active webhook"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isTestingWebhook ? 'Testing...' : 'Test Fire Webhook'}</span>
            </button>
          )}

          <button
            onClick={exportLogsAsJson}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download logs as JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          <button
            onClick={() => fetchDeliveries()}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-800/90 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn font-mono">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Dispatched</span>
          <div className="mt-1 text-xl font-bold font-mono text-slate-100">{stats.total}</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Success Rate</span>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-400">{stats.successRate}%</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Failed Dispatches</span>
          <div className={`mt-1 text-xl font-bold font-mono ${stats.failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {stats.failed}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Avg Latency</span>
          <div className="mt-1 text-xl font-bold font-mono text-cyan-400">{stats.avgLatency} ms</div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-cyan-600 text-white font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Logs ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'success'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Successful ({stats.success})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              statusFilter === 'failed'
                ? 'bg-rose-600 text-white font-semibold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Failed ({stats.failed})
          </button>

          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Event Triggers</option>
            <option value="prd.generated">prd.generated</option>
            <option value="prd.updated">prd.updated</option>
            <option value="user_stories.generated">user_stories.generated</option>
            <option value="user_stories.updated">user_stories.updated</option>
            <option value="sprint.planned">sprint.planned</option>
            <option value="sprint.updated">sprint.updated</option>
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payload, URL, status..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* 4. Event Logs List */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <RotateCw className="w-5 h-5 mx-auto animate-spin text-cyan-400" />
            <p>Loading webhook delivery logs...</p>
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <Webhook className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p>No webhook dispatch logs matching your filter criteria.</p>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => {
            const isExpanded = expandedLogId === delivery.id;
            return (
              <div
                key={delivery.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-950/80 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(delivery.statusCode, delivery.status)}

                      <span className="text-xs font-bold text-slate-200">
                        {delivery.webhookName}
                      </span>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                        {delivery.event}
                      </span>

                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{delivery.latencyMs} ms</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                      <span className="truncate max-w-[280px] sm:max-w-md text-slate-300">{delivery.url}</span>
                      <span>•</span>
                      <span className="text-slate-500">{new Date(delivery.timestamp).toLocaleTimeString()}</span>
                      {delivery.signature && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400/90 text-[10px]">HMAC-SHA256 Signed</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setInspectModalLog(delivery)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Inspect payload & response"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Inspect</span>
                    </button>

                    <button
                      onClick={() => handleRetry(delivery.id)}
                      disabled={isRetryingId === delivery.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Retry webhook dispatch"
                    >
                      <RotateCw className={`w-3.5 h-3.5 text-slate-400 ${isRetryingId === delivery.id ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>

                    <button
                      onClick={() => setExpandedLogId(isExpanded ? null : delivery.id)}
                      className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Quick inline accordion preview */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Request Payload */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                            <Code className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Dispatched Payload</span>
                          </span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(delivery.requestPayload, null, 2), 'payload', delivery.id)}
                            className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"
                          >
                            {copiedPayloadId === delivery.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPayloadId === delivery.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40 leading-snug">
                          {JSON.stringify(delivery.requestPayload, null, 2)}
                        </pre>
                      </div>

                      {/* Response Body Log */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                          <span className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                            <Activity className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Response Log ({delivery.statusCode})</span>
                          </span>
                          {delivery.responseBody && (
                            <button
                              onClick={() => copyToClipboard(delivery.responseBody || '', 'response', delivery.id)}
                              className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"
                            >
                              {copiedResponseId === delivery.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedResponseId === delivery.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                        <pre className="font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40 leading-snug">
                          {delivery.responseBody || '(Empty response body from target server)'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Inspection Modal Drawer for Deep Debugging */}
      {inspectModalLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>Webhook Inspection Diagnostic</span>
                    {getStatusBadge(inspectModalLog.statusCode, inspectModalLog.status)}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {inspectModalLog.id} • Latency: {inspectModalLog.latencyMs}ms
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectModalLog(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target URL and Event Bar */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Service & Hook:</span>
                <span className="text-slate-200 font-bold">{inspectModalLog.webhookName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Event Trigger:</span>
                <span className="text-cyan-300 font-bold">{inspectModalLog.event}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination URL:</span>
                <span className="text-slate-300 truncate max-w-lg">{inspectModalLog.url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Signature:</span>
                <span className="text-emerald-400 truncate max-w-lg">{inspectModalLog.signature || 'None configured'}</span>
              </div>
            </div>

            {/* Tabs for Payload, Response, Headers */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTabInspection('payload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTabInspection === 'payload'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Payload JSON
              </button>
              <button
                onClick={() => setActiveTabInspection('response')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTabInspection === 'response'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Response Log ({inspectModalLog.statusCode})
              </button>
              <button
                onClick={() => setActiveTabInspection('headers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeTabInspection === 'headers'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Request Headers
              </button>
            </div>

            {/* Tab Contents */}
            {activeTabInspection === 'payload' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono text-slate-400">Content-Type: application/json</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(inspectModalLog.requestPayload, null, 2), 'payload', 'modal')}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {copiedPayloadId === 'modal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPayloadId === 'modal' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="font-mono text-xs text-slate-200 overflow-x-auto max-h-72 p-2 bg-slate-900 rounded-lg">
                  {JSON.stringify(inspectModalLog.requestPayload, null, 2)}
                </pre>
              </div>
            )}

            {activeTabInspection === 'response' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-mono text-slate-400">HTTP Status: {inspectModalLog.statusCode} ({inspectModalLog.status})</span>
                  {inspectModalLog.responseBody && (
                    <button
                      onClick={() => copyToClipboard(inspectModalLog.responseBody || '', 'response', 'modal')}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {copiedResponseId === 'modal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedResponseId === 'modal' ? 'Copied' : 'Copy Log'}</span>
                    </button>
                  )}
                </div>
                <pre className="font-mono text-xs text-slate-200 overflow-x-auto max-h-72 p-2 bg-slate-900 rounded-lg">
                  {inspectModalLog.responseBody || '(No response body was returned by target)'}
                </pre>
              </div>
            )}

            {activeTabInspection === 'headers' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">Content-Type</span>
                  <span className="text-slate-300">application/json</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">User-Agent</span>
                  <span className="text-slate-300">Navigator-Webhooks/2.0</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">X-Navigator-Event</span>
                  <span className="text-cyan-300">{inspectModalLog.event}</span>
                </div>
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">X-Navigator-Delivery</span>
                  <span className="text-slate-300">{inspectModalLog.id}</span>
                </div>
                {inspectModalLog.signature && (
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">X-Navigator-Signature</span>
                    <span className="text-emerald-300 truncate max-w-sm">{inspectModalLog.signature}</span>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">
                Timestamp: {new Date(inspectModalLog.timestamp).toISOString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRetry(inspectModalLog.id)}
                  disabled={isRetryingId === inspectModalLog.id}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRetryingId === inspectModalLog.id ? 'animate-spin' : ''}`} />
                  <span>Retry Webhook Dispatch</span>
                </button>

                <button
                  onClick={() => setInspectModalLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
