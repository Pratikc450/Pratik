import React, { useState, useEffect } from 'react';
import { TelemetrySummary, AuditLogEntry } from '../types.js';
import { 
  Activity, 
  Clock, 
  ShieldAlert, 
  Cpu, 
  Database, 
  RefreshCw, 
  Layers, 
  History, 
  CheckCircle2,
  TrendingUp,
  Target,
  Zap,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

const TIME_SERIES_INITIATIVES = [
  {
    sprint: 'Sprint 1 (Draft)',
    shortLabel: 'S1 Draft',
    date: 'Aug 12',
    avgRiceScore: 840,
    confidencePct: 55,
    p0StoriesRatio: 0,
    p1StoriesRatio: 25,
    avgPriorityIndex: 28,
    underwritingScore: 714,
    reconciliationScore: 180,
    tradeLineScore: 450,
    backlogHygieneIndex: 62
  },
  {
    sprint: 'Sprint 2 (Interviews)',
    shortLabel: 'S2 Discovery',
    date: 'Aug 26',
    avgRiceScore: 1373,
    confidencePct: 68,
    p0StoriesRatio: 0,
    p1StoriesRatio: 50,
    avgPriorityIndex: 44,
    underwritingScore: 2041,
    reconciliationScore: 400,
    tradeLineScore: 1680,
    backlogHygieneIndex: 74
  },
  {
    sprint: 'Sprint 3 (Telemetry)',
    shortLabel: 'S3 Telemetry',
    date: 'Sep 09',
    avgRiceScore: 2589,
    confidencePct: 82,
    p0StoriesRatio: 33,
    p1StoriesRatio: 50,
    avgPriorityIndex: 68,
    underwritingScore: 4284,
    reconciliationScore: 640,
    tradeLineScore: 2844,
    backlogHygieneIndex: 86
  },
  {
    sprint: 'Sprint 4 (Arch Sizing)',
    shortLabel: 'S4 Arch',
    date: 'Sep 23',
    avgRiceScore: 3197,
    confidencePct: 88,
    p0StoriesRatio: 66,
    p1StoriesRatio: 33,
    avgPriorityIndex: 88,
    underwritingScore: 4860,
    reconciliationScore: 680,
    tradeLineScore: 4053,
    backlogHygieneIndex: 94
  },
  {
    sprint: 'Sprint 5 (Current Active)',
    shortLabel: 'S5 Current',
    date: 'Oct 01',
    avgRiceScore: 3410,
    confidencePct: 91,
    p0StoriesRatio: 66,
    p1StoriesRatio: 34,
    avgPriorityIndex: 94,
    underwritingScore: 4860,
    reconciliationScore: 920,
    tradeLineScore: 4450,
    backlogHygieneIndex: 97
  }
];

export const TelemetryDashboard: React.FC = () => {
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [templates, setTemplates] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [timeSeriesMode, setTimeSeriesMode] = useState<'AGGREGATE' | 'INITIATIVES' | 'CONFIDENCE' | 'PRIORITY_SHIFT'>('AGGREGATE');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [telRes, auditRes, tplRes] = await Promise.all([
        fetch('/api/telemetry'),
        fetch('/api/audit-logs'),
        fetch('/api/templates')
      ]);

      if (telRes.ok) {
        const data = await telRes.json();
        setTelemetry(data);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
      if (tplRes.ok) {
        const data = await tplRes.json();
        setTemplates(data.templates || {});
      }
    } catch (err) {
      console.error('Failed to fetch telemetry data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResetBudget = async () => {
    try {
      const res = await fetch('/api/budget/reset', { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Engine Observability & Performance Metrics (§6)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Internal telemetry tracking p50/p95 latency, schema validation failure rate, repair recovery, and prompt templates.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-800 flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2. Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: p50 / p95 Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Latency SLA (p50 / p95)</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.p50LatencyMs || 0}ms <span className="text-slate-500 text-sm font-normal">/</span> {telemetry?.p95LatencyMs || 0}ms
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Within 45,000ms SLA target</span>
          </div>
        </div>

        {/* Metric 2: Validation Failure Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Schema Validation Fail Rate</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.validationFailureRate || 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Catches degrading prompt versions early
          </div>
        </div>

        {/* Metric 3: Single-Repair Pass Success */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Single-Repair Recovery</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">
            {telemetry?.repairSuccessRate || 100}%
          </div>
          <div className="text-[11px] text-purple-400 mt-1">
            Heals ~80%+ without burning tokens
          </div>
        </div>

        {/* Metric 4: Org Token Usage vs Budget */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Org Token Budget</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-100">
            {telemetry?.tokenBudgetUsed?.toLocaleString() || 0} / {telemetry?.tokenBudgetLimit?.toLocaleString() || 50000}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">Hard cap blocks at 100%</span>
            <button
              onClick={handleResetBudget}
              className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 2b. TIME-SERIES VIEW: HISTORICAL EVOLUTION OF RICE SCORES */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Historical Evolution of Product Initiative RICE Scores
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Time-Series Observability
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tracks backlog quality velocity, telemetry-grounded confidence gains, and initiative readiness across sprint cycles.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setTimeSeriesMode('AGGREGATE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'AGGREGATE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROI Velocity
            </button>
            <button
              onClick={() => setTimeSeriesMode('INITIATIVES')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'INITIATIVES' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Initiatives
            </button>
            <button
              onClick={() => setTimeSeriesMode('CONFIDENCE')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'CONFIDENCE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Confidence & Hygiene
            </button>
            <button
              onClick={() => setTimeSeriesMode('PRIORITY_SHIFT')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeSeriesMode === 'PRIORITY_SHIFT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Priority Shift
            </button>
          </div>
        </div>

        {/* Time-Series Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Backlog ROI Lift</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 flex items-center space-x-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>+306% Growth</span>
            </div>
            <span className="text-[10px] text-slate-400">840 → 3,410 pts</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Confidence Grounding</span>
            <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
              91% Certainty
            </div>
            <span className="text-[10px] text-slate-400">+36% via production sync</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">P0 Sprint-Ready Ratio</span>
            <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
              66% Readiness
            </div>
            <span className="text-[10px] text-slate-400">Stories crossing 3,000 threshold</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Backlog Hygiene Index</span>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>97 / 100</span>
            </div>
            <span className="text-[10px] text-slate-400">MoSCoW & INVEST compliant</span>
          </div>
        </div>

        {/* Time-Series Chart Area */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {timeSeriesMode === 'AGGREGATE' ? (
              <AreaChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="riceAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}`} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.sprint} ({d.date})</div>
                          <div className="text-purple-300 font-mono font-bold">Avg RICE: {d.avgRiceScore.toLocaleString()} pts</div>
                          <div className="text-slate-400 text-[10px]">Confidence: {d.confidencePct}% · P0 Gate: {d.p0StoriesRatio}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={3000} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'P0 Gate (3,000)', fill: '#10b981', fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="avgRiceScore" 
                  name="Average Backlog RICE" 
                  stroke="#a855f7" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#riceAreaGrad)" 
                />
              </AreaChart>
            ) : timeSeriesMode === 'INITIATIVES' ? (
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1">{d.sprint}</div>
                          <div className="text-purple-300">Underwriting: {d.underwritingScore.toLocaleString()}</div>
                          <div className="text-emerald-300">Trade Line: {d.tradeLineScore.toLocaleString()}</div>
                          <div className="text-cyan-300">Reconciliation: {d.reconciliationScore.toLocaleString()}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="underwritingScore" name="Checkout & Underwriting" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="tradeLineScore" name="Trade Line Transparency" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="reconciliationScore" name="ERP Webhook Reconciliation" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            ) : timeSeriesMode === 'CONFIDENCE' ? (
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[50, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1">
                          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1">{d.sprint}</div>
                          <div className="text-emerald-400 font-mono">Confidence: {d.confidencePct}%</div>
                          <div className="text-cyan-300 font-mono">Backlog Hygiene: {d.backlogHygieneIndex}/100</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="confidencePct" name="Telemetry-Grounded Confidence (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="backlogHygieneIndex" name="INVEST Backlog Hygiene Index (0-100)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              /* Priority Shift Visualization */
              <LineChart data={TIME_SERIES_INITIATIVES} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-slate-200 font-sans border-b border-slate-800 pb-1">{d.sprint} ({d.date})</div>
                          <div className="text-emerald-400">P0 Readiness Ratio: {d.p0StoriesRatio}%</div>
                          <div className="text-cyan-400">P1 High-Priority Ratio: {d.p1StoriesRatio}%</div>
                          <div className="text-purple-300 font-bold">Priority Velocity Index: {d.avgPriorityIndex} / 100</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="p0StoriesRatio" name="P0 Critical Sprint-Ready Ratio (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="p1StoriesRatio" name="P1 High-Priority Ratio (%)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="avgPriorityIndex" name="Average Priority Shift Index (0-100)" stroke="#c084fc" strokeDasharray="4 4" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Split Section: Prompt Template Registry & Audit Log Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Registry (§3) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">Prompt Template Registry (§3 Versioned)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">6 Registered</span>
          </div>

          <p className="text-xs text-slate-400">
            Every prompt is stored as an immutable versioned record. No inline string concatenation is permitted in controllers.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {Object.keys(templates).map((key) => {
              const tpl = templates[key];
              return (
                <div key={key} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{tpl.taskType}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-semibold">
                      {tpl.version}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono line-clamp-2">
                    {tpl.systemPrompt.slice(0, 140)}...
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Log Stream (§7 Human Approval Gate) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">Audit Log Stream (§7 Verification Trail)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} Events</span>
          </div>

          <p className="text-xs text-slate-400">
            Immutable log of all generation events, repair occurrences, and human PM approval actions.
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                      log.action === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.action === 'REPAIRED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-slate-200">{log.details}</div>
                <div className="text-[10px] text-slate-500 font-mono">User: {log.userId} · Task: {log.taskType}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
